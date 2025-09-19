/**
 * Batch Receipt Processing API
 * BULK OCR PROCESSING - QUEUE MANAGEMENT - PROGRESS TRACKING
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { processReceiptsBatch } from '@/lib/ocr/mindee-client'
import { logger } from '@/lib/logger'
import { 
  ValidationError, 
  FileUploadError, 
  DatabaseError, 
  ExternalServiceError 
} from '@/lib/errors'
import { APP_CONFIG } from '@/lib/config'

interface BatchProcessingJob {
  id: string
  accountantId: string
  clientId: string
  receiptIds: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  totalReceipts: number
  processedReceipts: number
  failedReceipts: number
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { receiptIds, accountantId, clientId } = body

    const context = {
      receiptIds,
      accountantId,
      clientId,
      batchSize: receiptIds?.length,
      operation: 'batch_receipt_processing'
    }

    logger.info('Starting batch receipt processing', context)

    // Validate required fields
    if (!receiptIds || !Array.isArray(receiptIds) || receiptIds.length === 0) {
      throw new ValidationError('Receipt IDs array is required and cannot be empty', context)
    }

    if (!accountantId) {
      throw new ValidationError('Accountant ID is required', context)
    }

    if (receiptIds.length > APP_CONFIG.AI.BATCH_SIZE * 2) { // Allow larger batches for receipts
      throw new ValidationError(`Maximum ${APP_CONFIG.AI.BATCH_SIZE * 2} receipts allowed per batch`, {
        ...context,
        maxBatchSize: APP_CONFIG.AI.BATCH_SIZE * 2
      })
    }

    // Verify receipts exist and belong to the accountant
    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select(`
        id,
        file_path,
        file_name,
        mime_type,
        file_size,
        processed_at,
        clients!inner(accountant_id)
      `)
      .in('id', receiptIds)
      .eq('clients.accountant_id', accountantId)

    if (receiptsError) {
      throw new DatabaseError('Failed to fetch receipts for batch processing', {
        ...context,
        dbError: receiptsError.message
      })
    }

    if (!receipts || receipts.length === 0) {
      throw new ValidationError('No valid receipts found for processing', context)
    }

    if (receipts.length !== receiptIds.length) {
      throw new ValidationError('Some receipts not found or access denied', {
        ...context,
        foundReceipts: receipts.length,
        requestedReceipts: receiptIds.length
      })
    }

    // Filter out already processed receipts
    const unprocessedReceipts = receipts.filter(r => !r.processed_at)
    
    if (unprocessedReceipts.length === 0) {
      logger.info('All receipts already processed', context)
      return NextResponse.json({
        success: true,
        message: 'All receipts have already been processed',
        alreadyProcessed: receipts.length,
        newlyProcessed: 0
      })
    }

    logger.info('Processing batch of unprocessed receipts', {
      ...context,
      unprocessedCount: unprocessedReceipts.length,
      alreadyProcessedCount: receipts.length - unprocessedReceipts.length
    })

    // Create batch processing job record
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const batchJob: Partial<BatchProcessingJob> = {
      id: jobId,
      accountantId,
      clientId,
      receiptIds: unprocessedReceipts.map(r => r.id),
      status: 'processing',
      progress: 0,
      totalReceipts: unprocessedReceipts.length,
      processedReceipts: 0,
      failedReceipts: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      errorMessage: null
    }

    // Process receipts in batch
    const results = []
    let processedCount = 0
    let failedCount = 0

    for (const receipt of unprocessedReceipts) {
      try {
        // Download file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('receipts')
          .download(receipt.file_path)

        if (downloadError || !fileData) {
          throw new FileUploadError('Failed to download receipt file', {
            receiptId: receipt.id,
            filePath: receipt.file_path,
            storageError: downloadError?.message
          })
        }

        // Convert to buffer for OCR processing
        const fileBuffer = Buffer.from(await fileData.arrayBuffer())

        // Process single receipt (using existing function)
        const { processReceiptOCR } = await import('@/lib/ocr/mindee-client')
        
        const ocrResult = await processReceiptOCR({
          fileBuffer,
          fileName: receipt.file_name,
          mimeType: receipt.mime_type,
          clientId: clientId || 'batch',
          uploadedBy: accountantId
        })

        // Update receipt with OCR results
        const { error: updateError } = await supabase
          .from('receipts')
          .update({
            ocr_data: ocrResult.rawData,
            ocr_confidence: ocrResult.confidenceScore,
            vendor_extracted: ocrResult.vendor,
            amount_extracted: ocrResult.amount,
            date_extracted: ocrResult.date,
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', receipt.id)

        if (updateError) {
          logger.error('Failed to update receipt with OCR data', updateError, {
            receiptId: receipt.id,
            fileName: receipt.file_name
          })
          failedCount++
        } else {
          processedCount++
          logger.info('Receipt processed successfully in batch', {
            receiptId: receipt.id,
            fileName: receipt.file_name,
            vendor: ocrResult.vendor,
            amount: ocrResult.amount,
            confidence: ocrResult.confidence
          })
        }

        results.push({
          receiptId: receipt.id,
          fileName: receipt.file_name,
          success: !updateError,
          ocrResult: updateError ? null : {
            vendor: ocrResult.vendor,
            amount: ocrResult.amount,
            date: ocrResult.date,
            confidence: ocrResult.confidence,
            confidenceScore: ocrResult.confidenceScore
          },
          error: updateError?.message || null
        })

        // Update progress
        const progress = Math.round(((processedCount + failedCount) / unprocessedReceipts.length) * 100)
        batchJob.progress = progress
        batchJob.processedReceipts = processedCount
        batchJob.failedReceipts = failedCount

      } catch (error) {
        failedCount++
        logger.error('Failed to process receipt in batch', error as Error, {
          receiptId: receipt.id,
          fileName: receipt.file_name
        })

        results.push({
          receiptId: receipt.id,
          fileName: receipt.file_name,
          success: false,
          ocrResult: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Add small delay between receipts to avoid overwhelming the OCR service
      if (processedCount + failedCount < unprocessedReceipts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Update final batch job status
    batchJob.status = failedCount === 0 ? 'completed' : 'completed'
    batchJob.progress = 100
    batchJob.completedAt = new Date().toISOString()
    batchJob.processedReceipts = processedCount
    batchJob.failedReceipts = failedCount

    // Log batch completion
    await supabase.from('activity_logs').insert({
      user_id: accountantId,
      action: 'BATCH_RECEIPT_PROCESSING',
      resource_type: 'receipt_batch',
      resource_id: jobId,
      new_values: {
        total_receipts: unprocessedReceipts.length,
        processed_receipts: processedCount,
        failed_receipts: failedCount,
        success_rate: processedCount / unprocessedReceipts.length,
        processing_time: Date.now() - new Date(batchJob.startedAt!).getTime()
      }
    })

    logger.info('Batch receipt processing completed', {
      ...context,
      jobId,
      processedCount,
      failedCount,
      successRate: processedCount / unprocessedReceipts.length
    })

    return NextResponse.json({
      success: true,
      jobId,
      summary: {
        totalReceipts: unprocessedReceipts.length,
        processedReceipts: processedCount,
        failedReceipts: failedCount,
        alreadyProcessed: receipts.length - unprocessedReceipts.length,
        successRate: Math.round((processedCount / unprocessedReceipts.length) * 100)
      },
      results,
      message: `Batch processing completed: ${processedCount} successful, ${failedCount} failed`
    })

  } catch (error) {
    if (error instanceof ValidationError || error instanceof FileUploadError || error instanceof DatabaseError) {
      logger.error('Batch receipt processing validation error', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    const serviceError = new ExternalServiceError('BatchProcessing', 'Internal server error during batch receipt processing', {
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    
    logger.error('Batch receipt processing service error', serviceError)
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
    const jobId = searchParams.get('jobId')

    if (!accountantId) {
      return NextResponse.json(
        { error: 'Accountant ID parameter is required' },
        { status: 400 }
      )
    }

    // Get batch processing statistics
    const { data: recentJobs, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', accountantId)
      .eq('action', 'BATCH_RECEIPT_PROCESSING')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      const dbError = new DatabaseError('Failed to fetch batch processing history', {
        accountantId,
        jobId,
        dbError: error.message
      })
      logger.error('Database error fetching batch history', dbError)
      return NextResponse.json(
        { error: dbError.message },
        { status: dbError.statusCode }
      )
    }

    // Calculate summary statistics
    const stats = {
      totalJobs: recentJobs?.length || 0,
      totalReceipts: recentJobs?.reduce((sum, job) => sum + (job.new_values?.total_receipts || 0), 0) || 0,
      totalProcessed: recentJobs?.reduce((sum, job) => sum + (job.new_values?.processed_receipts || 0), 0) || 0,
      totalFailed: recentJobs?.reduce((sum, job) => sum + (job.new_values?.failed_receipts || 0), 0) || 0,
      averageSuccessRate: recentJobs?.length ? 
        recentJobs.reduce((sum, job) => sum + (job.new_values?.success_rate || 0), 0) / recentJobs.length : 0
    }

    return NextResponse.json({
      success: true,
      statistics: stats,
      recentJobs: recentJobs?.map(job => ({
        jobId: job.resource_id,
        createdAt: job.created_at,
        totalReceipts: job.new_values?.total_receipts,
        processedReceipts: job.new_values?.processed_receipts,
        failedReceipts: job.new_values?.failed_receipts,
        successRate: job.new_values?.success_rate,
        processingTime: job.new_values?.processing_time
      })) || []
    })

  } catch (error) {
    const serviceError = new ExternalServiceError('BatchProcessing', 'Internal server error fetching batch processing data', {
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    logger.error('Batch processing fetch service error', serviceError)
    return NextResponse.json(
      { error: serviceError.message },
      { status: serviceError.statusCode }
    )
  }
}