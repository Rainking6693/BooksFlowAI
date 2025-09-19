import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { findMatchingTransactions } from '@/lib/integrations/mindee-ocr'
import { logger } from '@/lib/logger'
import { ValidationError, DatabaseError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { receiptId, accountantId, transactionId, action } = body

    // Validate required fields
    if (!receiptId || !accountantId || !action) {
      const error = new ValidationError('Missing required fields: receiptId, accountantId, action', {
        receiptId: !!receiptId,
        accountantId: !!accountantId,
        action: !!action
      })
      logger.error('Receipt matching validation failed', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    if (!['link', 'unlink', 'suggest'].includes(action)) {
      const error = new ValidationError('Action must be "link", "unlink", or "suggest"', {
        providedAction: action
      })
      logger.error('Invalid action provided', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    // Get receipt data
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select(`
        *,
        client:clients!inner(accountant_id)
      `)
      .eq('id', receiptId)
      .single()

    if (receiptError || !receipt) {
      const error = new DatabaseError('Failed to fetch receipt', {
        receiptId,
        dbError: receiptError?.message
      })
      logger.error('Receipt fetch failed', error)
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      )
    }

    // Verify accountant has access to this receipt
    if (receipt.client.accountant_id !== accountantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid accountant access' },
        { status: 403 }
      )
    }

    if (action === 'suggest') {
      return await handleSuggestMatches(receipt, accountantId)
    } else if (action === 'link') {
      return await handleLinkTransaction(receipt, transactionId, accountantId)
    } else if (action === 'unlink') {
      return await handleUnlinkTransaction(receipt, accountantId)
    }

  } catch (error) {
    logger.error('Receipt matching service error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error during receipt matching' },
      { status: 500 }
    )
  }
}

/**
 * Handle suggesting matching transactions for a receipt
 */
async function handleSuggestMatches(receipt: any, accountantId: string) {
  try {
    if (!receipt.ocr_data) {
      return NextResponse.json(
        { error: 'Receipt has not been processed with OCR yet' },
        { status: 400 }
      )
    }

    // Find matching transactions
    const matches = await findMatchingTransactions(receipt.ocr_data, accountantId)

    // Get additional transaction details
    const transactionIds = matches.map(m => m.transactionId)
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select(`
        id,
        description,
        amount,
        vendor_name,
        transaction_date,
        account_name,
        status,
        category:transaction_categories(name)
      `)
      .in('id', transactionIds)

    if (transactionError) {
      throw new Error(`Failed to fetch transaction details: ${transactionError.message}`)
    }

    // Enhance matches with full transaction data
    const enhancedMatches = matches.map(match => {
      const transaction = transactions?.find(t => t.id === match.transactionId)
      return {
        ...match,
        transaction: transaction ? {
          ...transaction,
          categoryName: transaction.category?.name
        } : match.transaction
      }
    })

    logger.info('Generated receipt matching suggestions', {
      receiptId: receipt.id,
      matchesFound: enhancedMatches.length,
      topMatchScore: enhancedMatches[0]?.matchScore || 0
    })

    return NextResponse.json({
      success: true,
      receipt: {
        id: receipt.id,
        fileName: receipt.file_name,
        ocr: {
          vendor: receipt.vendor_extracted,
          amount: receipt.amount_extracted,
          date: receipt.date_extracted,
          confidence: receipt.ocr_confidence
        }
      },
      matches: enhancedMatches,
      summary: {
        totalMatches: enhancedMatches.length,
        highConfidenceMatches: enhancedMatches.filter(m => m.matchScore > 0.8).length,
        mediumConfidenceMatches: enhancedMatches.filter(m => m.matchScore > 0.5 && m.matchScore <= 0.8).length,
        lowConfidenceMatches: enhancedMatches.filter(m => m.matchScore <= 0.5).length
      }
    })

  } catch (error) {
    logger.error('Error suggesting matches', error as Error, {
      receiptId: receipt.id,
      accountantId
    })
    throw error
  }
}

/**
 * Handle linking a receipt to a specific transaction
 */
async function handleLinkTransaction(receipt: any, transactionId: string, accountantId: string) {
  try {
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required for linking' },
        { status: 400 }
      )
    }

    // Verify transaction belongs to accountant
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('id, description, amount, vendor_name, transaction_date')
      .eq('id', transactionId)
      .eq('accountant_id', accountantId)
      .single()

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found or unauthorized' },
        { status: 404 }
      )
    }

    // Check if transaction is already linked to another receipt
    const { data: existingLink, error: linkCheckError } = await supabase
      .from('receipts')
      .select('id, file_name')
      .eq('transaction_id', transactionId)
      .neq('id', receipt.id)
      .single()

    if (linkCheckError && linkCheckError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to check existing links: ${linkCheckError.message}`)
    }

    if (existingLink) {
      return NextResponse.json(
        { 
          error: `Transaction is already linked to receipt: ${existingLink.file_name}`,
          conflictingReceipt: {
            id: existingLink.id,
            fileName: existingLink.file_name
          }
        },
        { status: 409 }
      )
    }

    // Calculate match score for this specific pairing
    let matchScore = 0
    let matchReasons: string[] = []
    
    if (receipt.ocr_data) {
      const matchResult = calculateDetailedMatchScore(receipt.ocr_data, transaction)
      matchScore = matchResult.score
      matchReasons = matchResult.reasons
    }

    // Link receipt to transaction
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        transaction_id: transactionId,
        is_matched: true,
        match_confidence: matchScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', receipt.id)

    if (updateError) {
      throw new Error(`Failed to link receipt to transaction: ${updateError.message}`)
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: accountantId,
      action: 'RECEIPT_LINK',
      resource_type: 'receipt',
      resource_id: receipt.id,
      new_values: {
        transactionId,
        matchScore,
        matchReasons
      }
    })

    logger.info('Receipt linked to transaction', {
      receiptId: receipt.id,
      transactionId,
      matchScore,
      accountantId
    })

    return NextResponse.json({
      success: true,
      message: 'Receipt successfully linked to transaction',
      link: {
        receiptId: receipt.id,
        transactionId,
        matchScore,
        matchReasons,
        linkedAt: new Date().toISOString()
      },
      transaction: {
        id: transaction.id,
        description: transaction.description,
        amount: transaction.amount,
        vendor: transaction.vendor_name,
        date: transaction.transaction_date
      }
    })

  } catch (error) {
    logger.error('Error linking receipt to transaction', error as Error, {
      receiptId: receipt.id,
      transactionId,
      accountantId
    })
    throw error
  }
}

/**
 * Handle unlinking a receipt from its transaction
 */
async function handleUnlinkTransaction(receipt: any, accountantId: string) {
  try {
    if (!receipt.transaction_id) {
      return NextResponse.json(
        { error: 'Receipt is not currently linked to any transaction' },
        { status: 400 }
      )
    }

    const previousTransactionId = receipt.transaction_id

    // Unlink receipt from transaction
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        transaction_id: null,
        is_matched: false,
        match_confidence: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', receipt.id)

    if (updateError) {
      throw new Error(`Failed to unlink receipt from transaction: ${updateError.message}`)
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: accountantId,
      action: 'RECEIPT_UNLINK',
      resource_type: 'receipt',
      resource_id: receipt.id,
      old_values: {
        transactionId: previousTransactionId
      }
    })

    logger.info('Receipt unlinked from transaction', {
      receiptId: receipt.id,
      previousTransactionId,
      accountantId
    })

    return NextResponse.json({
      success: true,
      message: 'Receipt successfully unlinked from transaction',
      unlink: {
        receiptId: receipt.id,
        previousTransactionId,
        unlinkedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error('Error unlinking receipt from transaction', error as Error, {
      receiptId: receipt.id,
      accountantId
    })
    throw error
  }
}

/**
 * Calculate detailed match score with enhanced logic
 */
function calculateDetailedMatchScore(
  ocrData: any,
  transaction: any
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []
  const weights = {
    amount: 0.5,
    date: 0.3,
    vendor: 0.2
  }

  // Enhanced amount matching
  const ocrAmount = Math.abs(ocrData.amount.value)
  const transactionAmount = Math.abs(transaction.amount)
  const amountDiff = Math.abs(ocrAmount - transactionAmount)
  const amountThreshold = Math.max(1, transactionAmount * 0.05) // 5% tolerance

  if (amountDiff === 0) {
    score += weights.amount
    reasons.push(`Exact amount match: $${ocrAmount}`)
  } else if (amountDiff <= amountThreshold) {
    score += weights.amount * 0.9
    reasons.push(`Amount match within 5%: $${ocrAmount} ≈ $${transactionAmount}`)
  } else if (amountDiff <= amountThreshold * 2) {
    score += weights.amount * 0.7
    reasons.push(`Amount close within 10%: $${ocrAmount} ≈ $${transactionAmount}`)
  } else if (amountDiff <= amountThreshold * 4) {
    score += weights.amount * 0.3
    reasons.push(`Amount somewhat close: $${ocrAmount} vs $${transactionAmount}`)
  }

  // Enhanced date matching
  const ocrDate = new Date(ocrData.date.value)
  const transactionDate = new Date(transaction.transaction_date)
  const daysDiff = Math.abs((ocrDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysDiff === 0) {
    score += weights.date
    reasons.push('Same date')
  } else if (daysDiff <= 1) {
    score += weights.date * 0.9
    reasons.push('Within 1 day')
  } else if (daysDiff <= 3) {
    score += weights.date * 0.7
    reasons.push('Within 3 days')
  } else if (daysDiff <= 7) {
    score += weights.date * 0.4
    reasons.push('Within 1 week')
  } else if (daysDiff <= 14) {
    score += weights.date * 0.2
    reasons.push('Within 2 weeks')
  }

  // Enhanced vendor matching
  if (transaction.vendor_name && ocrData.vendor.name) {
    const ocrVendor = ocrData.vendor.name.toLowerCase().trim()
    const transactionVendor = transaction.vendor_name.toLowerCase().trim()
    
    if (ocrVendor === transactionVendor) {
      score += weights.vendor
      reasons.push('Exact vendor match')
    } else {
      // Check for partial matches
      const similarity = calculateAdvancedStringSimilarity(ocrVendor, transactionVendor)
      
      if (similarity > 0.9) {
        score += weights.vendor * 0.9
        reasons.push('Very similar vendor names')
      } else if (similarity > 0.7) {
        score += weights.vendor * 0.7
        reasons.push('Similar vendor names')
      } else if (similarity > 0.5) {
        score += weights.vendor * 0.4
        reasons.push('Somewhat similar vendor names')
      }
      
      // Check for common vendor abbreviations/variations
      if (checkVendorAliases(ocrVendor, transactionVendor)) {
        score += weights.vendor * 0.8
        reasons.push('Vendor name variation detected')
      }
    }
  }

  // Bonus points for high OCR confidence
  if (ocrData.vendor.confidence > 0.9 && ocrData.amount.confidence > 0.9) {
    score += 0.1
    reasons.push('High OCR confidence')
  }

  return { 
    score: Math.min(score, 1.0), 
    reasons: reasons.slice(0, 5) // Limit to top 5 reasons
  }
}

/**
 * Advanced string similarity with fuzzy matching
 */
function calculateAdvancedStringSimilarity(str1: string, str2: string): number {
  // Normalize strings
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const norm1 = normalize(str1)
  const norm2 = normalize(str2)
  
  if (norm1 === norm2) return 1.0
  if (norm1.length === 0 || norm2.length === 0) return 0.0
  
  // Check for substring matches
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const longer = norm1.length > norm2.length ? norm1 : norm2
    const shorter = norm1.length <= norm2.length ? norm1 : norm2
    return shorter.length / longer.length
  }
  
  // Levenshtein distance
  const matrix = []
  for (let i = 0; i <= norm1.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= norm2.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= norm1.length; i++) {
    for (let j = 1; j <= norm2.length; j++) {
      const cost = norm1[i - 1] === norm2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }
  
  const maxLen = Math.max(norm1.length, norm2.length)
  return (maxLen - matrix[norm1.length][norm2.length]) / maxLen
}

/**
 * Check for common vendor name aliases and variations
 */
function checkVendorAliases(vendor1: string, vendor2: string): boolean {
  const aliases = [
    ['starbucks', 'sbux', 'starbucks coffee'],
    ['mcdonalds', 'mcdonald\'s', 'mcd', 'golden arches'],
    ['walmart', 'wal-mart', 'wm'],
    ['target', 'tgt'],
    ['amazon', 'amzn', 'amazon.com'],
    ['microsoft', 'msft', 'ms'],
    ['apple', 'apple inc', 'apple store'],
    ['google', 'alphabet', 'google inc'],
    ['uber', 'uber technologies'],
    ['lyft', 'lyft inc']
  ]
  
  for (const aliasGroup of aliases) {
    const hasVendor1 = aliasGroup.some(alias => vendor1.includes(alias))
    const hasVendor2 = aliasGroup.some(alias => vendor2.includes(alias))
    if (hasVendor1 && hasVendor2) {
      return true
    }
  }
  
  return false
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountantId = searchParams.get('accountantId')
    const status = searchParams.get('status') // matched, unmatched, all
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!accountantId) {
      return NextResponse.json(
        { error: 'Missing accountantId parameter' },
        { status: 400 }
      )
    }

    // Build query for receipt matching statistics
    let query = supabase
      .from('receipts')
      .select(`
        id,
        file_name,
        vendor_extracted,
        amount_extracted,
        date_extracted,
        is_matched,
        match_confidence,
        transaction_id,
        processed_at,
        client:clients!inner(accountant_id),
        transaction:transactions(id, description, amount, transaction_date)
      `)
      .eq('client.accountant_id', accountantId)
      .not('processed_at', 'is', null)
      .order('processed_at', { ascending: false })
      .limit(limit)

    // Apply status filter
    if (status === 'matched') {
      query = query.eq('is_matched', true)
    } else if (status === 'unmatched') {
      query = query.eq('is_matched', false)
    }

    const { data: receipts, error } = await query

    if (error) {
      const dbError = new DatabaseError('Failed to fetch receipt matching data', {
        accountantId,
        dbError: error.message
      })
      logger.error('Database error fetching receipt matching data', dbError)
      return NextResponse.json(
        { error: dbError.message },
        { status: dbError.statusCode }
      )
    }

    // Calculate statistics
    const stats = {
      totalProcessed: receipts?.length || 0,
      matched: receipts?.filter(r => r.is_matched).length || 0,
      unmatched: receipts?.filter(r => !r.is_matched).length || 0,
      averageMatchConfidence: receipts?.length ? 
        receipts.reduce((sum, r) => sum + (r.match_confidence || 0), 0) / receipts.length : 0,
      highConfidenceMatches: receipts?.filter(r => (r.match_confidence || 0) > 0.8).length || 0,
      mediumConfidenceMatches: receipts?.filter(r => (r.match_confidence || 0) > 0.5 && (r.match_confidence || 0) <= 0.8).length || 0,
      lowConfidenceMatches: receipts?.filter(r => (r.match_confidence || 0) <= 0.5 && r.is_matched).length || 0
    }

    return NextResponse.json({
      success: true,
      statistics: stats,
      receipts: receipts?.map(receipt => ({
        id: receipt.id,
        fileName: receipt.file_name,
        vendor: receipt.vendor_extracted,
        amount: receipt.amount_extracted,
        date: receipt.date_extracted,
        isMatched: receipt.is_matched,
        matchConfidence: receipt.match_confidence,
        transaction: receipt.transaction
      })) || []
    })

  } catch (error) {
    logger.error('Receipt matching statistics service error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error fetching receipt matching data' },
      { status: 500 }
    )
  }
}