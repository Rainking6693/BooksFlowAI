/**
 * Receipt Status Management API
 * STATUS TRACKING - LIFECYCLE MANAGEMENT - PROGRESS MONITORING
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { 
  ValidationError, 
  DatabaseError, 
  ExternalServiceError 
} from '@/lib/errors'

interface ReceiptStatusUpdate {
  receiptId: string
  status: 'uploaded' | 'processing' | 'processed' | 'matched' | 'error'
  progress?: number
  errorMessage?: string
  metadata?: Record<string, any>
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { receiptId, status, accountantId, progress, errorMessage, metadata } = body

    const context = {
      receiptId,
      status,
      accountantId,
      progress,
      operation: 'receipt_status_update'
    }

    logger.info('Updating receipt status', context)

    // Validate required fields
    if (!receiptId || !status || !accountantId) {
      throw new ValidationError('Receipt ID, status, and accountant ID are required', context)
    }

    // Validate status value
    const validStatuses = ['uploaded', 'processing', 'processed', 'matched', 'error']
    if (!validStatuses.includes(status)) {
      throw new ValidationError('Invalid status value', {
        ...context,
        validStatuses
      })
    }

    // Verify receipt exists and accountant has access
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select(`
        id,
        client_id,
        processed_at,
        is_matched,
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

    // Prepare status update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Handle status-specific updates
    switch (status) {
      case 'processing':
        // Receipt is being processed
        if (progress !== undefined) {
          updateData.processing_progress = Math.max(0, Math.min(100, progress))
        }
        break

      case 'processed':
        // OCR processing completed
        updateData.processed_at = new Date().toISOString()
        updateData.processing_progress = 100
        break

      case 'matched':
        // Receipt matched to transaction
        updateData.is_matched = true
        updateData.match_confidence = metadata?.matchConfidence || 1.0
        if (metadata?.transactionId) {
          updateData.transaction_id = metadata.transactionId
        }
        break

      case 'error':
        // Processing failed
        updateData.processing_error = errorMessage || 'Processing failed'
        updateData.processing_progress = 0
        break
    }

    // Update receipt status
    const { error: updateError } = await supabase
      .from('receipts')
      .update(updateData)
      .eq('id', receiptId)

    if (updateError) {
      throw new DatabaseError('Failed to update receipt status', {
        ...context,
        dbError: updateError.message
      })
    }

    // Log status change activity
    await supabase.from('activity_logs').insert({
      user_id: accountantId,
      action: 'RECEIPT_STATUS_UPDATE',
      resource_type: 'receipt',
      resource_id: receiptId,
      new_values: {
        status,
        progress,
        error_message: errorMessage,
        metadata
      }
    })

    logger.info('Receipt status updated successfully', {
      ...context,
      updateData
    })

    return NextResponse.json({
      success: true,
      receiptId,
      status,
      progress,
      message: `Receipt status updated to ${status}`
    })

  } catch (error) {
    if (error instanceof ValidationError || error instanceof DatabaseError) {
      logger.error('Receipt status update validation error', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    const serviceError = new ExternalServiceError('ReceiptStatus', 'Internal server error during receipt status update', {
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    
    logger.error('Receipt status update service error', serviceError)
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
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const timeframe = searchParams.get('timeframe') || '30' // days

    if (!accountantId) {
      return NextResponse.json(
        { error: 'Accountant ID parameter is required' },
        { status: 400 }
      )
    }

    const context = {
      accountantId,
      clientId,
      status,
      timeframe,
      operation: 'receipt_status_query'
    }

    logger.debug('Fetching receipt status data', context)

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(timeframe))

    // Build query
    let query = supabase
      .from('receipts')
      .select(`
        id,
        file_name,
        file_size,
        mime_type,
        vendor_extracted,
        amount_extracted,
        date_extracted,
        ocr_confidence,
        is_matched,
        match_confidence,
        uploaded_at,
        processed_at,
        processing_progress,
        processing_error,
        transaction_id,
        clients!inner(id, business_name, accountant_id)
      `)
      .eq('clients.accountant_id', accountantId)
      .gte('uploaded_at', startDate.toISOString())
      .lte('uploaded_at', endDate.toISOString())
      .order('uploaded_at', { ascending: false })

    // Apply filters
    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    if (status) {
      switch (status) {
        case 'uploaded':
          query = query.is('processed_at', null).is('processing_error', null)
          break
        case 'processing':
          query = query.is('processed_at', null).is('processing_error', null).not('processing_progress', 'is', null)
          break
        case 'processed':
          query = query.not('processed_at', 'is', null).eq('is_matched', false)
          break
        case 'matched':
          query = query.eq('is_matched', true)
          break
        case 'error':
          query = query.not('processing_error', 'is', null)
          break
      }
    }

    const { data: receipts, error } = await query.limit(100)

    if (error) {
      const dbError = new DatabaseError('Failed to fetch receipt status data', {
        ...context,
        dbError: error.message
      })
      logger.error('Database error fetching receipt status', dbError)
      return NextResponse.json(
        { error: dbError.message },
        { status: dbError.statusCode }
      )
    }

    // Calculate status statistics
    const stats = {
      total: receipts?.length || 0,
      uploaded: receipts?.filter(r => !r.processed_at && !r.processing_error).length || 0,
      processing: receipts?.filter(r => !r.processed_at && !r.processing_error && r.processing_progress).length || 0,
      processed: receipts?.filter(r => r.processed_at && !r.is_matched).length || 0,
      matched: receipts?.filter(r => r.is_matched).length || 0,
      error: receipts?.filter(r => r.processing_error).length || 0,
      averageConfidence: receipts?.length ? 
        receipts.filter(r => r.ocr_confidence).reduce((sum, r) => sum + (r.ocr_confidence || 0), 0) / 
        receipts.filter(r => r.ocr_confidence).length : 0,
      matchRate: receipts?.length ? 
        (receipts.filter(r => r.is_matched).length / receipts.length) * 100 : 0
    }

    // Group by processing status for detailed breakdown
    const statusBreakdown = {
      byStatus: {
        uploaded: receipts?.filter(r => !r.processed_at && !r.processing_error) || [],
        processing: receipts?.filter(r => !r.processed_at && !r.processing_error && r.processing_progress) || [],
        processed: receipts?.filter(r => r.processed_at && !r.is_matched) || [],
        matched: receipts?.filter(r => r.is_matched) || [],
        error: receipts?.filter(r => r.processing_error) || []
      },
      byClient: receipts?.reduce((acc, receipt) => {
        const clientName = receipt.clients.business_name
        if (!acc[clientName]) {
          acc[clientName] = { total: 0, matched: 0, processed: 0, error: 0 }
        }
        acc[clientName].total++
        if (receipt.is_matched) acc[clientName].matched++
        else if (receipt.processed_at) acc[clientName].processed++
        else if (receipt.processing_error) acc[clientName].error++
        return acc
      }, {} as Record<string, any>) || {},
      byTimeframe: receipts?.reduce((acc, receipt) => {
        const date = new Date(receipt.uploaded_at).toISOString().split('T')[0]
        if (!acc[date]) {
          acc[date] = { uploaded: 0, processed: 0, matched: 0, error: 0 }
        }
        acc[date].uploaded++
        if (receipt.is_matched) acc[date].matched++
        else if (receipt.processed_at) acc[date].processed++
        else if (receipt.processing_error) acc[date].error++
        return acc
      }, {} as Record<string, any>) || {}
    }

    return NextResponse.json({
      success: true,
      receipts: receipts || [],
      statistics: stats,
      breakdown: statusBreakdown,
      timeframe: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: parseInt(timeframe)
      }
    })

  } catch (error) {
    const serviceError = new ExternalServiceError('ReceiptStatus', 'Internal server error fetching receipt status data', {
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    logger.error('Receipt status fetch service error', serviceError)
    return NextResponse.json(
      { error: serviceError.message },
      { status: serviceError.statusCode }
    )
  }
}