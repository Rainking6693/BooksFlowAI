import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { 
  syncTransactions, 
  getQBConnection, 
  getCompanyInfo,
  getAccounts 
} from '@/lib/integrations/quickbooks'
import { logger } from '@/lib/logger'
import { ValidationError, QuickBooksError, DatabaseError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountantId, startDate, endDate, fullSync = false } = body

    // Validate required fields
    if (!accountantId) {
      return NextResponse.json(
        { error: 'Missing required field: accountantId' },
        { status: 400 }
      )
    }

    // Get accountant profile
    const { data: accountant, error: accountantError } = await supabase
      .from('accountants')
      .select('id, user_id, quickbooks_connected')
      .eq('id', accountantId)
      .single()

    if (accountantError || !accountant) {
      return NextResponse.json(
        { error: 'Accountant not found' },
        { status: 404 }
      )
    }

    if (!accountant.quickbooks_connected) {
      return NextResponse.json(
        { error: 'QuickBooks not connected. Please connect your QuickBooks account first.' },
        { status: 400 }
      )
    }

    // Check for existing QuickBooks connection
    let qbConnection
    try {
      qbConnection = await getQBConnection(accountantId)
    } catch (error) {
      return NextResponse.json(
        { error: 'QuickBooks connection not found or expired. Please reconnect.' },
        { status: 401 }
      )
    }

    // Determine sync date range
    let syncStartDate = startDate
    let syncEndDate = endDate

    if (!syncStartDate && !fullSync) {
      // Default to last 30 days if no date specified
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      syncStartDate = thirtyDaysAgo.toISOString().split('T')[0]
    }

    if (!syncEndDate) {
      syncEndDate = new Date().toISOString().split('T')[0]
    }

    // Start sync process
    logger.info('Starting QuickBooks sync', {
      accountantId,
      syncStartDate,
      syncEndDate,
      fullSync,
      operation: 'quickbooks_sync_start'
    })

    // Update sync status
    await supabase
      .from('quickbooks_connections')
      .update({ 
        sync_status: 'syncing',
        last_sync_at: new Date().toISOString()
      })
      .eq('accountant_id', accountantId)

    try {
      // Sync company info first
      const companyInfo = await getCompanyInfo(
        qbConnection.access_token_encrypted, // TODO: Decrypt in production
        qbConnection.company_id
      )

      // Sync chart of accounts if full sync or first time
      if (fullSync || !qbConnection.last_sync_at) {
        logger.info('Syncing chart of accounts', {
          accountantId,
          operation: 'sync_chart_of_accounts'
        })
        
        const accounts = await getAccounts(
          qbConnection.access_token_encrypted,
          qbConnection.company_id
        )

        // Update or insert account categories
        for (const account of accounts) {
          await supabase
            .from('transaction_categories')
            .upsert({
              accountant_id: accountantId,
              quickbooks_id: account.id,
              name: account.name,
              category_type: mapAccountTypeToCategory(account.accountType),
              is_active: account.active
            })
        }

        logger.info('Chart of accounts sync completed', {
          accountantId,
          accountsCount: accounts.length,
          operation: 'sync_chart_of_accounts_complete'
        })
      }

      // Sync transactions
      logger.info('Starting transaction sync', {
        accountantId,
        syncStartDate,
        syncEndDate,
        operation: 'sync_transactions_start'
      })
      const syncResult = await syncTransactions(
        accountantId,
        syncStartDate,
        syncEndDate
      )

      // Update connection status
      await supabase
        .from('quickbooks_connections')
        .update({ 
          sync_status: 'connected',
          last_sync_at: new Date().toISOString()
        })
        .eq('accountant_id', accountantId)

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: accountant.user_id,
        action: 'QUICKBOOKS_SYNC',
        resource_type: 'quickbooks_connection',
        resource_id: qbConnection.id,
        new_values: {
          transactions_synced: syncResult.synced,
          sync_errors: syncResult.errors.length,
          date_range: { start: syncStartDate, end: syncEndDate }
        }
      })

      return NextResponse.json({
        success: true,
        companyInfo: {
          name: companyInfo.name,
          currency: companyInfo.currency
        },
        syncResult: {
          transactionsSynced: syncResult.synced,
          errors: syncResult.errors,
          dateRange: {
            start: syncStartDate,
            end: syncEndDate
          }
        },
        message: `Successfully synced ${syncResult.synced} transactions from QuickBooks`
      })

    } catch (syncError) {
      const qbError = new QuickBooksError('QuickBooks sync failed', {
        accountantId,
        syncStartDate,
        syncEndDate,
        originalError: syncError instanceof Error ? syncError.message : 'Unknown error'
      })
      logger.error('QuickBooks sync error', qbError)
      
      // Update connection status to error
      await supabase
        .from('quickbooks_connections')
        .update({ 
          sync_status: 'error',
          last_sync_at: new Date().toISOString()
        })
        .eq('accountant_id', accountantId)

      return NextResponse.json(
        { 
          error: qbError.message,
          details: qbError.context?.originalError
        },
        { status: qbError.statusCode }
      )
    }

  } catch (error) {
    const serviceError = new QuickBooksError('Internal server error during QuickBooks sync', {
      accountantId,
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    logger.error('QuickBooks sync service error', serviceError)
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

    if (!accountantId) {
      return NextResponse.json(
        { error: 'Missing accountantId parameter' },
        { status: 400 }
      )
    }

    // Get sync status and history
    const { data: connection, error } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('accountant_id', accountantId)
      .single()

    if (error || !connection) {
      return NextResponse.json(
        { error: 'QuickBooks connection not found' },
        { status: 404 }
      )
    }

    // Get recent sync activity
    const { data: recentActivity } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('resource_type', 'quickbooks_connection')
      .eq('resource_id', connection.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get transaction counts
    const { data: transactionCounts } = await supabase
      .from('transactions')
      .select('status, ai_confidence')
      .eq('accountant_id', accountantId)

    const stats = {
      totalTransactions: transactionCounts?.length || 0,
      pendingReview: transactionCounts?.filter(t => t.status === 'pending').length || 0,
      approved: transactionCounts?.filter(t => t.status === 'approved').length || 0,
      highConfidence: transactionCounts?.filter(t => t.ai_confidence === 'high').length || 0
    }

    return NextResponse.json({
      success: true,
      connection: {
        companyName: connection.company_name,
        syncStatus: connection.sync_status,
        lastSyncAt: connection.last_sync_at,
        sandboxMode: connection.sandbox_mode
      },
      statistics: stats,
      recentActivity: recentActivity || []
    })

  } catch (error) {
    const serviceError = new QuickBooksError('Error fetching QuickBooks sync status', {
      accountantId,
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    logger.error('QuickBooks sync status service error', serviceError)
    return NextResponse.json(
      { error: serviceError.message },
      { status: serviceError.statusCode }
    )
  }
}

/**
 * Map QuickBooks account types to our category types
 */
function mapAccountTypeToCategory(accountType: string): string {
  const mapping: Record<string, string> = {
    'Income': 'Income',
    'Expense': 'Expense',
    'Bank': 'Asset',
    'Accounts Receivable': 'Asset',
    'Other Current Asset': 'Asset',
    'Fixed Asset': 'Asset',
    'Accounts Payable': 'Liability',
    'Credit Card': 'Liability',
    'Other Current Liability': 'Liability',
    'Long Term Liability': 'Liability',
    'Equity': 'Equity'
  }

  return mapping[accountType] || 'Expense'
}