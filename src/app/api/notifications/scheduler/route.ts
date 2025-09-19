import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendMissingReceiptReminder, sendReportReadyNotification } from '@/lib/integrations/email-service'
import { logger } from '@/lib/logger'
import { DatabaseError } from '@/lib/errors'

// This endpoint handles automated notification scheduling
// In production, this would be called by a cron job or scheduled task

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, accountantId } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    let results: any = {}

    switch (action) {
      case 'send_missing_receipt_reminders':
        results = await processMissingReceiptReminders(accountantId)
        break
      
      case 'send_report_notifications':
        results = await processReportNotifications(accountantId)
        break
      
      case 'send_weekly_summary':
        results = await processWeeklySummary(accountantId)
        break
      
      case 'cleanup_old_notifications':
        results = await cleanupOldNotifications()
        break
      
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      results
    })

  } catch (error) {
    logger.error('Notification scheduler error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error in notification scheduler' },
      { status: 500 }
    )
  }
}

/**
 * Process missing receipt reminders
 */
async function processMissingReceiptReminders(accountantId?: string): Promise<{
  processed: number
  sent: number
  failed: number
  details: Array<{ clientId: string; status: 'sent' | 'failed'; error?: string }>
}> {
  try {
    logger.info('Processing missing receipt reminders', { accountantId })

    // Get clients with missing receipts
    let query = supabase
      .from('clients')
      .select(`
        id,
        name,
        email,
        accountant:accountants!inner(
          id,
          name,
          email
        )
      `)

    if (accountantId) {
      query = query.eq('accountant_id', accountantId)
    }

    const { data: clients, error: clientsError } = await query

    if (clientsError) {
      throw new DatabaseError('Failed to fetch clients', { dbError: clientsError.message })
    }

    if (!clients || clients.length === 0) {
      return { processed: 0, sent: 0, failed: 0, details: [] }
    }

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      details: [] as Array<{ clientId: string; status: 'sent' | 'failed'; error?: string }>
    }

    for (const client of clients) {
      try {
        results.processed++

        // Get missing receipts for this client
        const missingReceipts = await getMissingReceiptsForClient(client.id, client.accountant.id)

        if (missingReceipts.length === 0) {
          continue // No missing receipts, skip
        }

        // Check if we've sent a reminder recently (within last 3 days)
        const { data: recentReminder, error: reminderError } = await supabase
          .from('email_logs')
          .select('id')
          .eq('recipient_email', client.email)
          .eq('email_type', 'missing_receipt_reminder')
          .gte('sent_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1)

        if (reminderError) {
          logger.error('Error checking recent reminders', reminderError)
        }

        if (recentReminder && recentReminder.length > 0) {
          continue // Already sent reminder recently, skip
        }

        // Calculate total amount
        const totalAmount = missingReceipts.reduce((sum, receipt) => sum + receipt.amount, 0)

        // Send reminder email
        const emailResult = await sendMissingReceiptReminder({
          clientName: client.name,
          clientEmail: client.email,
          accountantName: client.accountant.name,
          missingReceipts,
          totalAmount,
          portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/client-portal`
        })

        if (emailResult.success) {
          results.sent++
          results.details.push({ clientId: client.id, status: 'sent' })

          // Log the email
          await supabase.from('email_logs').insert({
            recipient_email: client.email,
            recipient_name: client.name,
            email_type: 'missing_receipt_reminder',
            subject: `Missing Receipts Reminder - ${missingReceipts.length} receipts needed`,
            sent_at: new Date().toISOString(),
            message_id: emailResult.messageId,
            status: 'sent',
            metadata: {
              missingReceiptsCount: missingReceipts.length,
              totalAmount,
              accountantId: client.accountant.id
            }
          })

          // Create notification record
          await supabase.from('notifications').insert({
            user_id: client.id,
            type: 'missing_receipt_reminder',
            title: 'Missing Receipts Reminder Sent',
            message: `Reminder sent for ${missingReceipts.length} missing receipts`,
            read: false,
            created_at: new Date().toISOString(),
            metadata: {
              missingReceiptsCount: missingReceipts.length,
              totalAmount
            }
          })

        } else {
          results.failed++
          results.details.push({ 
            clientId: client.id, 
            status: 'failed', 
            error: emailResult.error 
          })

          // Log the failure
          await supabase.from('email_logs').insert({
            recipient_email: client.email,
            recipient_name: client.name,
            email_type: 'missing_receipt_reminder',
            subject: `Missing Receipts Reminder - ${missingReceipts.length} receipts needed`,
            sent_at: new Date().toISOString(),
            status: 'failed',
            error_message: emailResult.error,
            metadata: {
              missingReceiptsCount: missingReceipts.length,
              totalAmount,
              accountantId: client.accountant.id
            }
          })
        }

      } catch (error) {
        results.failed++
        results.details.push({ 
          clientId: client.id, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        logger.error('Error processing reminder for client', error as Error, {
          clientId: client.id,
          clientEmail: client.email
        })
      }
    }

    logger.info('Missing receipt reminders processing complete', results)
    return results

  } catch (error) {
    logger.error('Error processing missing receipt reminders', error as Error)
    throw error
  }
}

/**
 * Get missing receipts for a specific client
 */
async function getMissingReceiptsForClient(
  clientId: string, 
  accountantId: string
): Promise<Array<{
  id: string
  description: string
  amount: number
  date: string
  daysOverdue: number
}>> {
  // Get transactions without receipts for this client's accountant
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, description, amount, transaction_date')
    .eq('accountant_id', accountantId)
    .is('receipt_id', null)
    .gte('transaction_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 90 days
    .lt('transaction_date', new Date().toISOString().split('T')[0]) // Before today
    .order('transaction_date', { ascending: false })
    .limit(50)

  if (error) {
    logger.error('Error fetching missing receipts', error)
    return []
  }

  if (!transactions || transactions.length === 0) {
    return []
  }

  return transactions.map(transaction => {
    const daysOverdue = Math.floor(
      (Date.now() - new Date(transaction.transaction_date).getTime()) / (1000 * 60 * 60 * 24)
    )

    return {
      id: transaction.id,
      description: transaction.description,
      amount: Math.abs(transaction.amount),
      date: transaction.transaction_date,
      daysOverdue
    }
  })
}

/**
 * Process report ready notifications
 */
async function processReportNotifications(accountantId?: string): Promise<{
  processed: number
  sent: number
  failed: number
}> {
  try {
    logger.info('Processing report notifications', { accountantId })

    // Get reports that are ready but haven't been notified
    let query = supabase
      .from('reports')
      .select(`
        id,
        title,
        period_start,
        period_end,
        file_url,
        client:clients!inner(
          id,
          name,
          email,
          accountant:accountants!inner(
            id,
            name
          )
        )
      `)
      .eq('status', 'completed')
      .eq('notification_sent', false)
      .not('file_url', 'is', null)

    if (accountantId) {
      query = query.eq('client.accountant_id', accountantId)
    }

    const { data: reports, error: reportsError } = await query

    if (reportsError) {
      throw new DatabaseError('Failed to fetch reports', { dbError: reportsError.message })
    }

    if (!reports || reports.length === 0) {
      return { processed: 0, sent: 0, failed: 0 }
    }

    const results = { processed: 0, sent: 0, failed: 0 }

    for (const report of reports) {
      try {
        results.processed++

        const emailResult = await sendReportReadyNotification({
          clientName: report.client.name,
          clientEmail: report.client.email,
          reportTitle: report.title,
          reportPeriod: `${new Date(report.period_start).toLocaleDateString()} - ${new Date(report.period_end).toLocaleDateString()}`,
          downloadUrl: report.file_url,
          accountantName: report.client.accountant.name
        })

        if (emailResult.success) {
          results.sent++

          // Mark report as notified
          await supabase
            .from('reports')
            .update({ 
              notification_sent: true, 
              notification_sent_at: new Date().toISOString() 
            })
            .eq('id', report.id)

          // Log the email
          await supabase.from('email_logs').insert({
            recipient_email: report.client.email,
            recipient_name: report.client.name,
            email_type: 'report_ready',
            subject: `Your ${report.title} is Ready`,
            sent_at: new Date().toISOString(),
            message_id: emailResult.messageId,
            status: 'sent',
            metadata: {
              reportId: report.id,
              reportTitle: report.title
            }
          })

        } else {
          results.failed++
          logger.error('Failed to send report notification', new Error(emailResult.error), {
            reportId: report.id,
            clientEmail: report.client.email
          })
        }

      } catch (error) {
        results.failed++
        logger.error('Error processing report notification', error as Error, {
          reportId: report.id
        })
      }
    }

    logger.info('Report notifications processing complete', results)
    return results

  } catch (error) {
    logger.error('Error processing report notifications', error as Error)
    throw error
  }
}

/**
 * Process weekly summary emails
 */
async function processWeeklySummary(accountantId?: string): Promise<{
  processed: number
  sent: number
  failed: number
}> {
  // TODO: Implement weekly summary email processing
  logger.info('Weekly summary processing not yet implemented', { accountantId })
  return { processed: 0, sent: 0, failed: 0 }
}

/**
 * Clean up old notification records
 */
async function cleanupOldNotifications(): Promise<{
  deletedNotifications: number
  deletedEmailLogs: number
}> {
  try {
    logger.info('Cleaning up old notifications')

    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days ago

    // Delete old read notifications
    const { error: notificationError, count: deletedNotifications } = await supabase
      .from('notifications')
      .delete()
      .eq('read', true)
      .lt('created_at', cutoffDate)

    if (notificationError) {
      logger.error('Error deleting old notifications', notificationError)
    }

    // Delete old email logs (keep for audit purposes, but clean up very old ones)
    const oldCutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year ago
    
    const { error: emailLogError, count: deletedEmailLogs } = await supabase
      .from('email_logs')
      .delete()
      .lt('sent_at', oldCutoffDate)

    if (emailLogError) {
      logger.error('Error deleting old email logs', emailLogError)
    }

    const results = {
      deletedNotifications: deletedNotifications || 0,
      deletedEmailLogs: deletedEmailLogs || 0
    }

    logger.info('Cleanup complete', results)
    return results

  } catch (error) {
    logger.error('Error during cleanup', error as Error)
    throw error
  }
}

// GET endpoint for notification statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountantId = searchParams.get('accountantId')
    const days = parseInt(searchParams.get('days') || '7')

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Get email statistics
    let emailQuery = supabase
      .from('email_logs')
      .select('email_type, status, sent_at')
      .gte('sent_at', cutoffDate)

    if (accountantId) {
      emailQuery = emailQuery.eq('metadata->>accountantId', accountantId)
    }

    const { data: emailLogs, error: emailError } = await emailQuery

    if (emailError) {
      throw new DatabaseError('Failed to fetch email statistics', { dbError: emailError.message })
    }

    // Calculate statistics
    const stats = {
      totalEmails: emailLogs?.length || 0,
      sentEmails: emailLogs?.filter(log => log.status === 'sent').length || 0,
      failedEmails: emailLogs?.filter(log => log.status === 'failed').length || 0,
      emailTypes: {} as Record<string, number>,
      dailyStats: {} as Record<string, { sent: number; failed: number }>
    }

    // Group by email type
    emailLogs?.forEach(log => {
      stats.emailTypes[log.email_type] = (stats.emailTypes[log.email_type] || 0) + 1
      
      const day = new Date(log.sent_at).toISOString().split('T')[0]
      if (!stats.dailyStats[day]) {
        stats.dailyStats[day] = { sent: 0, failed: 0 }
      }
      
      if (log.status === 'sent') {
        stats.dailyStats[day].sent++
      } else {
        stats.dailyStats[day].failed++
      }
    })

    stats.successRate = stats.totalEmails > 0 
      ? Math.round((stats.sentEmails / stats.totalEmails) * 100) 
      : 0

    return NextResponse.json({
      success: true,
      period: `${days} days`,
      statistics: stats
    })

  } catch (error) {
    logger.error('Error fetching notification statistics', error as Error)
    return NextResponse.json(
      { error: 'Internal server error fetching statistics' },
      { status: 500 }
    )
  }
}