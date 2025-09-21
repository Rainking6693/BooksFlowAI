import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { categorizeTransaction, categorizeTransactionsBatch } from '@/lib/ai/openai-client'
import type { TransactionCategorizationRequest } from '@/lib/ai/openai-client'
import { logger } from '@/lib/logger'
import { ValidationError, DatabaseError, AIServiceError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  let accountantId: string | undefined
  let transactionIds: string[] | undefined
  let batchMode = false
  let ensuredAccountantId: string | undefined
  let ensuredTransactionIds: string[] | undefined

  try {
    // SECURITY: Validate authentication first
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.error('AI categorization: Missing or invalid authorization header')
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      logger.error('AI categorization: Invalid authentication token', authError)
      return NextResponse.json(
        { error: 'Unauthorized: Invalid authentication token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    transactionIds = body.transactionIds
    accountantId = body.accountantId
    batchMode = body.batchMode ?? false

    // Validate required fields
    if (!transactionIds || !accountantId) {
      const error = new ValidationError('Missing required fields: transactionIds, accountantId', {
        transactionIds: !!transactionIds,
        accountantId: !!accountantId
      })
      logger.error('AI categorization validation failed', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    // SECURITY: Verify user has access to this accountant's data
    if (user.id !== accountantId) {
      const { data: accountantAccess, error: accessError } = await supabase
        .from('accountants')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('user_id', accountantId)
        .single()

      if (accessError || !accountantAccess) {
        logger.error('AI categorization: User access denied', { userId: user.id, accountantId })
        return NextResponse.json(
          { error: 'Forbidden: Access denied to this accountant data' },
          { status: 403 }
        )
      }
    }

    ensuredAccountantId = accountantId as string
    ensuredTransactionIds = transactionIds as string[]

    // Get accountant's available categories
    const { data: categories, error: categoriesError } = await supabase
      .from('transaction_categories')
      .select('id, name')
      .eq('accountant_id', ensuredAccountantId)
      .eq('is_active', true)

    if (categoriesError) {
      const error = new DatabaseError('Failed to fetch transaction categories', {
        accountantId: ensuredAccountantId,
        dbError: categoriesError.message
      })
      logger.error('Database error fetching categories', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    const availableCategories = categories?.map(c => c.name) || []

    // Get transactions to categorize
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .in('id', ensuredTransactionIds)
      .eq('accountant_id', ensuredAccountantId)

    if (transactionsError) {
      const error = new DatabaseError('Failed to fetch transactions', {
        accountantId: ensuredAccountantId ?? null,
      transactionIds: ensuredTransactionIds ?? [],
        dbError: transactionsError.message
      })
      logger.error('Database error fetching transactions', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found' },
        { status: 404 }
      )
    }

    // Prepare AI categorization requests
    const categorizationRequests: TransactionCategorizationRequest[] = transactions.map(transaction => ({
      description: transaction.description,
      amount: transaction.amount,
      vendor: transaction.vendor_name,
      date: transaction.transaction_date,
      accountName: transaction.account_name,
      existingCategories: availableCategories
    }))

    // Process categorization (batch or individual)
    let categorizationResults
    if (batchMode && categorizationRequests.length > 1) {
      categorizationResults = await categorizeTransactionsBatch(categorizationRequests)
    } else {
      // Process individually for better error handling
      categorizationResults = await Promise.all(
        categorizationRequests.map(request => categorizeTransaction(request))
      )
    }

    // Update transactions with AI suggestions
    const updates = transactions.map((transaction, index) => {
      const result = categorizationResults[index]
      
      // Find category ID from name
      const suggestedCategory = categories?.find(c => c.name === result.suggestedCategory)
      
      return {
        id: transaction.id,
        ai_suggested_category_id: suggestedCategory?.id || null,
        ai_confidence: result.confidence,
        ai_reasoning: result.reasoning,
        status: 'pending' as const,
        updated_at: new Date().toISOString()
      }
    })

    // Batch update transactions
    const { error: updateError } = await supabase
      .from('transactions')
      .upsert(updates)

    if (updateError) {
      const error = new DatabaseError('Failed to update transactions with AI suggestions', {
        accountantId: ensuredAccountantId,
        transactionCount: transactions.length,
        dbError: updateError.message
      })
      logger.error('Database error updating transactions', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    // Log activity
    await Promise.all(
      transactions.map(transaction => 
        supabase.from('activity_logs').insert({
          user_id: ensuredAccountantId,
          action: 'AI_CATEGORIZE',
          resource_type: 'transaction',
          resource_id: transaction.id,
          new_values: {
            ai_suggested_category: categorizationResults[transactions.indexOf(transaction)]?.suggestedCategory,
            ai_confidence: categorizationResults[transactions.indexOf(transaction)]?.confidence
          }
        })
      )
    )

    // Return results
    const response = transactions.map((transaction, index) => ({
      transactionId: transaction.id,
      originalDescription: transaction.description,
      suggestedCategory: categorizationResults[index].suggestedCategory,
      confidence: categorizationResults[index].confidence,
      confidenceScore: categorizationResults[index].confidenceScore,
      reasoning: categorizationResults[index].reasoning,
      alternativeCategories: categorizationResults[index].alternativeCategories
    }))

    return NextResponse.json({
      success: true,
      processed: transactions.length,
      results: response,
      summary: {
        highConfidence: response.filter(r => r.confidence === 'high').length,
        mediumConfidence: response.filter(r => r.confidence === 'medium').length,
        lowConfidence: response.filter(r => r.confidence === 'low').length,
        averageConfidence: response.reduce((sum, r) => sum + r.confidenceScore, 0) / response.length
      }
    })

  } catch (error) {
    const aiError = new AIServiceError('Internal server error during AI categorization', {
      accountantId: ensuredAccountantId ?? null,
      transactionIds: ensuredTransactionIds ?? [],
      batchMode,
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    logger.error('AI categorization service error', aiError)
    return NextResponse.json(
      { error: aiError.message },
      { status: aiError.statusCode }
    )
  }
}

export async function GET(request: NextRequest) {
  let accountantId: string | null = null

  try {
    // SECURITY: Validate authentication first
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.error('AI categorization stats: Missing or invalid authorization header')
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      logger.error('AI categorization stats: Invalid authentication token', authError)
      return NextResponse.json(
        { error: 'Unauthorized: Invalid authentication token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    accountantId = searchParams.get('accountantId')

    if (!accountantId) {
      return NextResponse.json(
        { error: 'Missing accountantId parameter' },
        { status: 400 }
      )
    }

    // SECURITY: Verify user has access to this accountant's data
    if (user.id !== accountantId) {
      const { data: accountantAccess, error: accessError } = await supabase
        .from('accountants')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('user_id', accountantId)
        .single()

      if (accessError || !accountantAccess) {
        logger.error('AI categorization stats: User access denied', { userId: user.id, accountantId })
        return NextResponse.json(
          { error: 'Forbidden: Access denied to this accountant data' },
          { status: 403 }
        )
      }
    }

    const ensuredAccountantId = accountantId as string

    // Get categorization statistics
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('ai_confidence, status, created_at')
      .eq('accountant_id', ensuredAccountantId)
      .not('ai_confidence', 'is', null)

    if (error) {
      const dbError = new DatabaseError('Failed to fetch categorization statistics', {
        accountantId: ensuredAccountantId,
        dbError: error.message
      })
      logger.error('Database error fetching categorization stats', dbError)
      return NextResponse.json(
        { error: dbError.message },
        { status: dbError.statusCode }
      )
    }

    const stats = {
      totalCategorized: transactions?.length || 0,
      highConfidence: transactions?.filter(t => t.ai_confidence === 'high').length || 0,
      mediumConfidence: transactions?.filter(t => t.ai_confidence === 'medium').length || 0,
      lowConfidence: transactions?.filter(t => t.ai_confidence === 'low').length || 0,
      approved: transactions?.filter(t => t.status === 'approved').length || 0,
      rejected: transactions?.filter(t => t.status === 'rejected').length || 0,
      pending: transactions?.filter(t => t.status === 'pending').length || 0,
      recentActivity: transactions
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10) || []
    }

    return NextResponse.json({
      success: true,
      statistics: stats
    })

  } catch (error) {
    const serviceError = new AIServiceError('Internal server error fetching categorization statistics', {
      accountantId,
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    logger.error('AI categorization statistics service error', serviceError)
    return NextResponse.json(
      { error: serviceError.message },
      { status: serviceError.statusCode }
    )
  }
}









