import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { makeQBApiCall, getQBConnection } from '@/lib/integrations/quickbooks'
import { logger } from '@/lib/logger'
import { ValidationError, DatabaseError, QuickBooksError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transactionIds, accountantId, action } = body

    // Validate required fields
    if (!transactionIds || !accountantId || !action) {
      const error = new ValidationError('Missing required fields: transactionIds, accountantId, action', {
        transactionIds: !!transactionIds,
        accountantId: !!accountantId,
        action: !!action
      })
      logger.error('Transaction approval validation failed', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      const error = new ValidationError('Action must be either "approve" or "reject"', {
        providedAction: action
      })
      logger.error('Invalid action provided', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    // Get transactions to approve/reject
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .in('id', transactionIds)
      .eq('accountant_id', accountantId)
      .eq('status', 'pending')

    if (transactionsError) {
      const error = new DatabaseError('Failed to fetch transactions', {
        accountantId,
        transactionIds,
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
        { error: 'No pending transactions found' },
        { status: 404 }
      )
    }

    const results = []
    const errors = []

    // Process each transaction
    for (const transaction of transactions) {
      try {
        if (action === 'approve') {
          // Update transaction in QuickBooks if it has a QuickBooks ID
          if (transaction.quickbooks_id && transaction.ai_suggested_category_id) {
            await updateQuickBooksTransaction(
              accountantId,
              transaction.quickbooks_id,
              transaction.ai_suggested_category_id
            )
          }

          // Update transaction status in database
          const { error: updateError } = await supabase
            .from('transactions')
            .update({
              status: 'approved',
              category_id: transaction.ai_suggested_category_id,
              reviewed_by: accountantId,
              reviewed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', transaction.id)

          if (updateError) {
            throw new DatabaseError('Failed to update transaction status', {
              transactionId: transaction.id,
              dbError: updateError.message
            })
          }

          results.push({
            transactionId: transaction.id,
            status: 'approved',
            message: 'Transaction approved and synced to QuickBooks'
          })
        } else {
          // Reject transaction
          const { error: updateError } = await supabase
            .from('transactions')
            .update({
              status: 'rejected',
              reviewed_by: accountantId,
              reviewed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', transaction.id)

          if (updateError) {
            throw new DatabaseError('Failed to update transaction status', {
              transactionId: transaction.id,
              dbError: updateError.message
            })
          }

          results.push({
            transactionId: transaction.id,
            status: 'rejected',
            message: 'Transaction rejected'
          })
        }

        // Log activity
        await supabase.from('activity_logs').insert({
          user_id: accountantId,
          action: action.toUpperCase(),
          resource_type: 'transaction',
          resource_id: transaction.id,
          new_values: {
            status: action === 'approve' ? 'approved' : 'rejected',
            category_id: action === 'approve' ? transaction.ai_suggested_category_id : null
          }
        })

      } catch (error) {
        logger.error(`Failed to ${action} transaction ${transaction.id}`, error as Error)
        errors.push({
          transactionId: transaction.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        approved: results.filter(r => r.status === 'approved').length,
        rejected: results.filter(r => r.status === 'rejected').length,
        failed: errors.length
      }
    })

  } catch (error) {
    logger.error('Transaction approval service error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error during transaction approval' },
      { status: 500 }
    )
  }
}

/**
 * Update transaction category in QuickBooks
 */
async function updateQuickBooksTransaction(
  accountantId: string,
  quickbooksTransactionId: string,
  categoryId: string
): Promise<void> {
  try {
    // Get QuickBooks connection
    const connection = await getQBConnection(accountantId)
    
    // Get category details
    const { data: category, error: categoryError } = await supabase
      .from('transaction_categories')
      .select('quickbooks_id, name')
      .eq('id', categoryId)
      .single()

    if (categoryError || !category) {
      throw new DatabaseError('Failed to fetch category details', {
        categoryId,
        dbError: categoryError?.message
      })
    }

    if (!category.quickbooks_id) {
      logger.warn('Category does not have QuickBooks ID, skipping QB update', {
        categoryId,
        categoryName: category.name
      })
      return
    }

    // Update transaction in QuickBooks
    // Note: This is a simplified example - actual implementation depends on transaction type
    const updateData = {
      AccountRef: {
        value: category.quickbooks_id
      },
      sparse: true
    }

    await makeQBApiCall(
      `items/${quickbooksTransactionId}`,
      connection.access_token_encrypted, // TODO: Decrypt in production
      connection.company_id,
      'POST',
      updateData
    )

    logger.info('Successfully updated transaction in QuickBooks', {
      transactionId: quickbooksTransactionId,
      categoryId: category.quickbooks_id,
      categoryName: category.name
    })

  } catch (error) {
    throw new QuickBooksError('Failed to update transaction in QuickBooks', {
      transactionId: quickbooksTransactionId,
      categoryId,
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountantId = searchParams.get('accountantId')

    if (!accountantId) {
      return NextResponse.json(
        { error: 'Missing accountantId parameter' },
        { status: 400 }
      )
    }

    // Get approval statistics
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('status, reviewed_at, ai_confidence')
      .eq('accountant_id', accountantId)
      .not('status', 'eq', 'pending')
      .order('reviewed_at', { ascending: false })
      .limit(100)

    if (error) {
      const dbError = new DatabaseError('Failed to fetch approval statistics', {
        accountantId,
        dbError: error.message
      })
      logger.error('Database error fetching approval stats', dbError)
      return NextResponse.json(
        { error: dbError.message },
        { status: dbError.statusCode }
      )
    }

    const stats = {
      totalReviewed: transactions?.length || 0,
      approved: transactions?.filter(t => t.status === 'approved').length || 0,
      rejected: transactions?.filter(t => t.status === 'rejected').length || 0,
      approvalRate: transactions?.length ? 
        (transactions.filter(t => t.status === 'approved').length / transactions.length * 100).toFixed(1) : '0',
      confidenceBreakdown: {
        high: transactions?.filter(t => t.ai_confidence === 'high' && t.status === 'approved').length || 0,
        medium: transactions?.filter(t => t.ai_confidence === 'medium' && t.status === 'approved').length || 0,
        low: transactions?.filter(t => t.ai_confidence === 'low' && t.status === 'approved').length || 0
      },
      recentActivity: transactions?.slice(0, 10).map(t => ({
        status: t.status,
        reviewedAt: t.reviewed_at,
        confidence: t.ai_confidence
      })) || []
    }

    return NextResponse.json({
      success: true,
      statistics: stats
    })

  } catch (error) {
    logger.error('Approval statistics service error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error fetching approval statistics' },
      { status: 500 }
    )
  }
}