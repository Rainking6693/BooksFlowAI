/**
 * Receipt-to-Transaction Matching API
 * INTELLIGENT MATCHING - CONFIDENCE SCORING - MANUAL REVIEW SUPPORT
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { matchReceiptToTransactions } from '@/lib/ocr/mindee-client'
import { logger } from '@/lib/logger'
import { 
  ValidationError, 
  DatabaseError, 
  ExternalServiceError 
} from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { receiptId, accountantId, forceRematch = false } = body

    const context = {
      receiptId,
      accountantId,
      forceRematch,
      operation: 'receipt_transaction_matching'
    }

    logger.info('Starting receipt-to-transaction matching', context)

    // Validate required fields
    if (!receiptId || !accountantId) {
      throw new ValidationError('Receipt ID and Accountant ID are required', context)
    }

    // Get receipt data with OCR results
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select(`
        id,
        client_id,
        vendor_extracted,
        amount_extracted,
        date_extracted,
        ocr_confidence,
        is_matched,
        transaction_id,
        clients!inner(accountant_id)
      `)
      .eq('id', receiptId)
      .single()

    if (receiptError || !receipt) {
      throw new DatabaseError('Receipt not found', {
        ...context,
        dbError: receiptError?.message
      })
    }

    // Verify accountant has access to this receipt
    if (receipt.clients.accountant_id !== accountantId) {
      throw new ValidationError('Access denied to this receipt', context)
    }

    // Check if already matched and not forcing rematch
    if (receipt.is_matched && receipt.transaction_id && !forceRematch) {
      logger.info('Receipt already matched, returning existing match', {
        ...context,
        existingTransactionId: receipt.transaction_id
      })

      const { data: existingTransaction } = await supabase
        .from('transactions')
        .select('id, description, amount, transaction_date, vendor_name')
        .eq('id', receipt.transaction_id)
        .single()

      return NextResponse.json({
        success: true,
        alreadyMatched: true,
        bestMatch: {
          transactionId: receipt.transaction_id,
          confidence: 'high',
          matchScore: 1.0,
          transaction: existingTransaction
        },
        matches: []
      })
    }

    // Prepare OCR result for matching
    const ocrResult = {
      vendor: receipt.vendor_extracted,
      amount: receipt.amount_extracted,
      date: receipt.date_extracted,
      currency: 'USD', // Default currency
      category: null,
      confidence: receipt.ocr_confidence >= 0.85 ? 'high' as const : 
                  receipt.ocr_confidence >= 0.65 ? 'medium' as const : 'low' as const,
      confidenceScore: receipt.ocr_confidence || 0,
      rawData: null,
      processingTime: 0
    }

    // Determine date range for matching
    const dateRange = getMatchingDateRange(receipt.date_extracted)

    // Perform matching
    const matchingResult = await matchReceiptToTransactions({
      ocrResult,
      accountantId,
      dateRange
    })

    // Update receipt with new matching results
    const updateData = {
      is_matched: matchingResult.bestMatch.confidence !== 'none',
      match_confidence: matchingResult.bestMatch.matchScore,
      updated_at: new Date().toISOString()
    }

    // Auto-link high confidence matches if not already matched
    if (matchingResult.bestMatch.confidence === 'high' && 
        matchingResult.bestMatch.transactionId && 
        !receipt.transaction_id) {
      
      await supabase
        .from('receipts')
        .update({
          ...updateData,
          transaction_id: matchingResult.bestMatch.transactionId
        })
        .eq('id', receiptId)

      logger.info('Receipt auto-matched to transaction', {
        ...context,
        transactionId: matchingResult.bestMatch.transactionId,
        matchScore: matchingResult.bestMatch.matchScore
      })
    } else {
      await supabase
        .from('receipts')
        .update(updateData)
        .eq('id', receiptId)
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: accountantId,
      action: 'RECEIPT_MATCH',
      resource_type: 'receipt',
      resource_id: receiptId,
      new_values: {
        matches_found: matchingResult.matches.length,
        best_match_score: matchingResult.bestMatch.matchScore,
        best_match_confidence: matchingResult.bestMatch.confidence,
        auto_matched: matchingResult.bestMatch.confidence === 'high'
      }
    })

    logger.info('Receipt matching completed successfully', {
      ...context,
      matchesFound: matchingResult.matches.length,
      bestMatchScore: matchingResult.bestMatch.matchScore,
      bestMatchConfidence: matchingResult.bestMatch.confidence
    })

    return NextResponse.json({
      success: true,
      alreadyMatched: false,
      bestMatch: matchingResult.bestMatch,
      matches: matchingResult.matches,
      summary: {
        totalMatches: matchingResult.matches.length,
        highConfidenceMatches: matchingResult.matches.filter(m => m.matchScore >= 0.8).length,
        autoMatched: matchingResult.bestMatch.confidence === 'high'
      }
    })

  } catch (error) {
    if (error instanceof ValidationError || error instanceof DatabaseError) {
      logger.error('Receipt matching validation error', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    const serviceError = new ExternalServiceError('ReceiptMatching', 'Internal server error during receipt matching', {
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    
    logger.error('Receipt matching service error', serviceError)
    return NextResponse.json(
      { error: serviceError.message },
      { status: serviceError.statusCode }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { receiptId, transactionId, accountantId, confirmed = true } = body

    const context = {
      receiptId,
      transactionId,
      accountantId,
      confirmed,
      operation: 'manual_receipt_matching'
    }

    logger.info('Processing manual receipt-to-transaction match', context)

    // Validate required fields
    if (!receiptId || !accountantId) {
      throw new ValidationError('Receipt ID and Accountant ID are required', context)
    }

    // Verify receipt exists and accountant has access
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select(`
        id,
        client_id,
        transaction_id,
        clients!inner(accountant_id)
      `)
      .eq('id', receiptId)
      .single()

    if (receiptError || !receipt) {
      throw new DatabaseError('Receipt not found', {
        ...context,
        dbError: receiptError?.message
      })
    }

    if (receipt.clients.accountant_id !== accountantId) {
      throw new ValidationError('Access denied to this receipt', context)
    }

    if (confirmed && transactionId) {
      // Verify transaction exists and belongs to accountant
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('id, description, amount, transaction_date')
        .eq('id', transactionId)
        .eq('accountant_id', accountantId)
        .single()

      if (transactionError || !transaction) {
        throw new ValidationError('Transaction not found or access denied', {
          ...context,
          dbError: transactionError?.message
        })
      }

      // Link receipt to transaction
      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          transaction_id: transactionId,
          is_matched: true,
          match_confidence: 1.0, // Manual match gets full confidence
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptId)

      if (updateError) {
        throw new DatabaseError('Failed to link receipt to transaction', {
          ...context,
          dbError: updateError.message
        })
      }

      logger.info('Receipt manually matched to transaction', {
        ...context,
        transactionDescription: transaction.description
      })

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: accountantId,
        action: 'RECEIPT_MANUAL_MATCH',
        resource_type: 'receipt',
        resource_id: receiptId,
        new_values: {
          transaction_id: transactionId,
          match_type: 'manual',
          match_confidence: 1.0
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Receipt successfully matched to transaction',
        match: {
          receiptId,
          transactionId,
          transaction
        }
      })

    } else {
      // Unlink receipt from transaction
      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          transaction_id: null,
          is_matched: false,
          match_confidence: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptId)

      if (updateError) {
        throw new DatabaseError('Failed to unlink receipt from transaction', {
          ...context,
          dbError: updateError.message
        })
      }

      logger.info('Receipt unlinked from transaction', context)

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: accountantId,
        action: 'RECEIPT_UNLINK',
        resource_type: 'receipt',
        resource_id: receiptId,
        new_values: {
          previous_transaction_id: receipt.transaction_id,
          match_type: 'unlinked'
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Receipt unlinked from transaction'
      })
    }

  } catch (error) {
    if (error instanceof ValidationError || error instanceof DatabaseError) {
      logger.error('Manual receipt matching validation error', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    const serviceError = new ExternalServiceError('ManualMatching', 'Internal server error during manual receipt matching', {
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    
    logger.error('Manual receipt matching service error', serviceError)
    return NextResponse.json(
      { error: serviceError.message },
      { status: serviceError.statusCode }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountantId = searchParams.get('accountantId')
    const status = searchParams.get('status') // 'matched', 'unmatched', 'pending'

    if (!accountantId) {
      return NextResponse.json(
        { error: 'Accountant ID parameter is required' },
        { status: 400 }
      )
    }

    // Build query based on status filter
    let query = supabase
      .from('receipts')
      .select(`
        id,
        file_name,
        vendor_extracted,
        amount_extracted,
        date_extracted,
        ocr_confidence,
        is_matched,
        match_confidence,
        uploaded_at,
        processed_at,
        transaction_id,
        transactions(id, description, amount, transaction_date, vendor_name),
        clients!inner(id, business_name, accountant_id)
      `)
      .eq('clients.accountant_id', accountantId)
      .order('uploaded_at', { ascending: false })

    // Apply status filter
    if (status === 'matched') {
      query = query.eq('is_matched', true).not('transaction_id', 'is', null)
    } else if (status === 'unmatched') {
      query = query.eq('is_matched', false)
    } else if (status === 'pending') {
      query = query.is('transaction_id', null).not('ocr_confidence', 'is', null)
    }

    const { data: receipts, error } = await query.limit(100)

    if (error) {
      const dbError = new DatabaseError('Failed to fetch receipt matching data', {
        accountantId,
        status,
        dbError: error.message
      })
      logger.error('Database error fetching receipt matches', dbError)
      return NextResponse.json(
        { error: dbError.message },
        { status: dbError.statusCode }
      )
    }

    // Calculate summary statistics
    const stats = {
      total: receipts?.length || 0,
      matched: receipts?.filter(r => r.is_matched && r.transaction_id).length || 0,
      unmatched: receipts?.filter(r => !r.is_matched).length || 0,
      pending: receipts?.filter(r => !r.transaction_id && r.ocr_confidence).length || 0,
      highConfidence: receipts?.filter(r => (r.ocr_confidence || 0) >= 0.85).length || 0,
      mediumConfidence: receipts?.filter(r => (r.ocr_confidence || 0) >= 0.65 && (r.ocr_confidence || 0) < 0.85).length || 0,
      lowConfidence: receipts?.filter(r => (r.ocr_confidence || 0) < 0.65).length || 0
    }

    return NextResponse.json({
      success: true,
      receipts: receipts || [],
      statistics: stats
    })

  } catch (error) {
    const serviceError = new ExternalServiceError('ReceiptMatching', 'Internal server error fetching receipt matching data', {
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    logger.error('Receipt matching fetch service error', serviceError)
    return NextResponse.json(
      { error: serviceError.message },
      { status: serviceError.statusCode }
    )
  }
}

/**
 * Get date range for transaction matching based on receipt date
 */
function getMatchingDateRange(receiptDate: string | null): { start: string; end: string } {
  const today = new Date()
  const endDate = today.toISOString().split('T')[0]
  
  if (receiptDate) {
    const receiptDateObj = new Date(receiptDate)
    const startDate = new Date(receiptDateObj)
    startDate.setDate(startDate.getDate() - 14) // 14 days before receipt date
    
    const endDateObj = new Date(receiptDateObj)
    endDateObj.setDate(endDateObj.getDate() + 7) // 7 days after receipt date
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: Math.min(endDateObj.getTime(), today.getTime()) === endDateObj.getTime() 
        ? endDateObj.toISOString().split('T')[0] 
        : endDate
    }
  }
  
  // Default to last 60 days if no receipt date
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 60)
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate
  }
}