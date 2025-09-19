import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { ValidationError, DatabaseError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      const error = new ValidationError('Missing clientId parameter')
      logger.error('Client portal dashboard validation failed', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    // Get client information with accountant details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        email,
        accountant:accountants!inner(
          id,
          name,
          email,
          phone
        )
      `)
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      const error = new DatabaseError('Client not found', {
        clientId,
        dbError: clientError?.message
      })
      logger.error('Client lookup failed', error)
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Get recent reports
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('id, title, period_start, period_end, generated_at, status, file_url')
      .eq('client_id', clientId)
      .order('generated_at', { ascending: false })
      .limit(10)

    if (reportsError) {
      logger.error('Error fetching reports', reportsError)
    }

    // Get pending receipts (transactions without receipts)
    const { data: pendingReceipts, error: pendingError } = await supabase
      .from('transactions')
      .select('id, description, amount, transaction_date')
      .eq('accountant_id', client.accountant.id)
      .is('receipt_id', null)
      .gte('transaction_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 90 days
      .order('transaction_date', { ascending: false })
      .limit(20)

    if (pendingError) {
      logger.error('Error fetching pending receipts', pendingError)
    }

    // Get recent activity
    const { data: activity, error: activityError } = await supabase
      .from('activity_logs')
      .select('id, action, resource_type, created_at, new_values')
      .eq('user_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (activityError) {
      logger.error('Error fetching activity', activityError)
    }

    // Get receipt statistics
    const { data: receiptStats, error: statsError } = await supabase
      .from('receipts')
      .select('id, uploaded_at, processed_at')
      .eq('client_id', clientId)
      .gte('uploaded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

    if (statsError) {
      logger.error('Error fetching receipt stats', statsError)
    }

    // Calculate statistics
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    const receiptsThisMonth = receiptStats?.filter(receipt => {
      const uploadDate = new Date(receipt.uploaded_at)
      return uploadDate.getMonth() === currentMonth && uploadDate.getFullYear() === currentYear
    }).length || 0

    const receiptsProcessed = receiptStats?.filter(receipt => receipt.processed_at).length || 0
    const pendingReceiptsCount = pendingReceipts?.length || 0
    
    const lastReport = reports?.[0]
    const lastReportDate = lastReport ? lastReport.generated_at : new Date().toISOString()

    // Format the response
    const dashboardData = {
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        accountant: {
          name: client.accountant.name,
          email: client.accountant.email,
          phone: client.accountant.phone
        }
      },
      recentReports: reports?.map(report => ({
        id: report.id,
        title: report.title,
        period: `${new Date(report.period_start).toLocaleDateString()} - ${new Date(report.period_end).toLocaleDateString()}`,
        generatedAt: report.generated_at,
        status: report.status,
        downloadUrl: report.file_url
      })) || [],
      pendingReceipts: pendingReceipts?.map(receipt => {
        const daysOverdue = Math.floor(
          (Date.now() - new Date(receipt.transaction_date).getTime()) / (1000 * 60 * 60 * 24)
        )
        return {
          id: receipt.id,
          description: receipt.description,
          amount: Math.abs(receipt.amount),
          date: receipt.transaction_date,
          daysOverdue
        }
      }) || [],
      recentActivity: activity?.map(act => {
        let description = ''
        let type = act.action.toLowerCase()
        
        switch (act.action) {
          case 'RECEIPT_UPLOAD':
            description = `Uploaded receipt: ${act.new_values?.fileName || 'Unknown file'}`
            type = 'receipt_uploaded'
            break
          case 'REPORT_GENERATED':
            description = 'Monthly report generated'
            type = 'report_generated'
            break
          case 'MESSAGE_SENT':
            description = 'Message sent to accountant'
            type = 'message_received'
            break
          case 'REMINDER_SENT':
            description = 'Receipt reminder sent'
            type = 'reminder_sent'
            break
          default:
            description = `${act.action.replace('_', ' ').toLowerCase()}`
        }
        
        return {
          id: act.id,
          type,
          description,
          timestamp: act.created_at
        }
      }) || [],
      stats: {
        receiptsThisMonth,
        receiptsProcessed,
        pendingReceipts: pendingReceiptsCount,
        lastReportDate
      }
    }

    logger.info('Client portal dashboard loaded', {
      clientId,
      receiptsThisMonth,
      receiptsProcessed,
      pendingReceipts: pendingReceiptsCount,
      reportsCount: reports?.length || 0
    })

    return NextResponse.json(dashboardData)

  } catch (error) {
    logger.error('Client portal dashboard service error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error loading dashboard' },
      { status: 500 }
    )
  }
}

// POST endpoint for client actions (messages, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, action, data } = body

    if (!clientId || !action) {
      const error = new ValidationError('Missing clientId or action')
      logger.error('Client portal action validation failed', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    // Verify client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, accountant_id')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'send_message':
        return await handleSendMessage(clientId, client.accountant_id, data)
      
      case 'request_report':
        return await handleRequestReport(clientId, client.accountant_id, data)
      
      case 'mark_notification_read':
        return await handleMarkNotificationRead(clientId, data)
      
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }

  } catch (error) {
    logger.error('Client portal action service error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error processing action' },
      { status: 500 }
    )
  }
}

// Handle sending a message to accountant
async function handleSendMessage(clientId: string, accountantId: string, data: any) {
  const { message } = data

  if (!message || !message.trim()) {
    return NextResponse.json(
      { error: 'Message content is required' },
      { status: 400 }
    )
  }

  // Create message record
  const { data: messageRecord, error: messageError } = await supabase
    .from('messages')
    .insert({
      from_client_id: clientId,
      to_accountant_id: accountantId,
      message: message.trim(),
      sent_at: new Date().toISOString(),
      read: false
    })
    .select()
    .single()

  if (messageError) {
    logger.error('Error creating message', messageError)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }

  // Log activity
  await supabase.from('activity_logs').insert({
    user_id: clientId,
    action: 'MESSAGE_SENT',
    resource_type: 'message',
    resource_id: messageRecord.id,
    new_values: {
      message: message.trim(),
      toAccountant: accountantId
    }
  })

  // TODO: Send email notification to accountant
  // await sendEmailNotification(accountantId, 'new_message', { clientId, message })

  logger.info('Message sent from client to accountant', {
    clientId,
    accountantId,
    messageId: messageRecord.id
  })

  return NextResponse.json({
    success: true,
    message: 'Message sent successfully',
    messageId: messageRecord.id
  })
}

// Handle requesting a report
async function handleRequestReport(clientId: string, accountantId: string, data: any) {
  const { reportType, period } = data

  // Create report request
  const { data: requestRecord, error: requestError } = await supabase
    .from('report_requests')
    .insert({
      client_id: clientId,
      accountant_id: accountantId,
      report_type: reportType || 'monthly',
      requested_period: period,
      requested_at: new Date().toISOString(),
      status: 'pending'
    })
    .select()
    .single()

  if (requestError) {
    logger.error('Error creating report request', requestError)
    return NextResponse.json(
      { error: 'Failed to request report' },
      { status: 500 }
    )
  }

  // Log activity
  await supabase.from('activity_logs').insert({
    user_id: clientId,
    action: 'REPORT_REQUESTED',
    resource_type: 'report_request',
    resource_id: requestRecord.id,
    new_values: {
      reportType,
      period
    }
  })

  logger.info('Report requested by client', {
    clientId,
    accountantId,
    requestId: requestRecord.id,
    reportType,
    period
  })

  return NextResponse.json({
    success: true,
    message: 'Report request submitted successfully',
    requestId: requestRecord.id
  })
}

// Handle marking notification as read
async function handleMarkNotificationRead(clientId: string, data: any) {
  const { notificationId } = data

  if (!notificationId) {
    return NextResponse.json(
      { error: 'Notification ID is required' },
      { status: 400 }
    )
  }

  const { error: updateError } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', clientId)

  if (updateError) {
    logger.error('Error marking notification as read', updateError)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Notification marked as read'
  })
}