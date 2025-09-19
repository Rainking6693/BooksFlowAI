import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { processReceiptOCR, findMatchingTransactions } from '@/lib/integrations/mindee-ocr'
import { logger } from '@/lib/logger'
import { ValidationError, DatabaseError, FileUploadError } from '@/lib/errors'
import { APP_CONFIG } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('receipt') as File
    const clientId = formData.get('clientId') as string
    const accountantId = formData.get('accountantId') as string
    const description = formData.get('description') as string || ''

    // Validate required fields
    if (!file || !clientId || !accountantId) {
      const error = new ValidationError('Missing required fields: receipt file, clientId, accountantId', {
        hasFile: !!file,
        clientId: !!clientId,
        accountantId: !!accountantId
      })
      logger.error('Receipt upload validation failed', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    // Validate file
    if (file.size > APP_CONFIG.UPLOAD.MAX_FILE_SIZE) {
      const error = new FileUploadError(`File size ${file.size} exceeds maximum ${APP_CONFIG.UPLOAD.MAX_FILE_SIZE} bytes`)
      logger.error('File size validation failed', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    if (!APP_CONFIG.UPLOAD.ALLOWED_MIME_TYPES.includes(file.type)) {
      const error = new FileUploadError(`Unsupported file type: ${file.type}. Allowed types: ${APP_CONFIG.UPLOAD.ALLOWED_MIME_TYPES.join(', ')}`)
      logger.error('File type validation failed', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    // Verify client belongs to accountant
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, accountant_id')
      .eq('id', clientId)
      .eq('accountant_id', accountantId)
      .single()

    if (clientError || !client) {
      const error = new ValidationError('Invalid client or accountant relationship', {
        clientId,
        accountantId,
        dbError: clientError?.message
      })
      logger.error('Client validation failed', error)
      return NextResponse.json(
        { error: 'Unauthorized: Invalid client access' },
        { status: 403 }
      )
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name
    const mimeType = file.type

    // Generate unique file path
    const timestamp = Date.now()
    const fileExtension = fileName.split('.').pop() || 'unknown'
    const storagePath = `receipts/${accountantId}/${clientId}/${timestamp}_${fileName}`

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        metadata: {
          clientId,
          accountantId,
          originalName: fileName,
          uploadedAt: new Date().toISOString()
        }
      })

    if (uploadError) {
      const error = new FileUploadError('Failed to upload file to storage', {
        fileName,
        mimeType,
        storageError: uploadError.message
      })
      logger.error('File storage upload failed', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    // Create receipt record in database
    const { data: receiptRecord, error: receiptError } = await supabase
      .from('receipts')
      .insert({
        client_id: clientId,
        file_path: uploadData.path,
        file_name: fileName,
        file_size: file.size,
        mime_type: mimeType,
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single()

    if (receiptError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('receipts').remove([uploadData.path])
      
      const error = new DatabaseError('Failed to create receipt record', {
        fileName,
        storageError: receiptError.message
      })
      logger.error('Receipt database insert failed', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    // Process OCR asynchronously (don't wait for completion)
    processReceiptAsync(receiptRecord.id, fileBuffer, fileName, mimeType, accountantId)
      .catch(error => {
        logger.error('Async OCR processing failed', error, {
          receiptId: receiptRecord.id,
          fileName
        })
      })

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: clientId,
      action: 'RECEIPT_UPLOAD',
      resource_type: 'receipt',
      resource_id: receiptRecord.id,
      new_values: {
        fileName,
        fileSize: file.size,
        mimeType
      }
    })

    return NextResponse.json({
      success: true,
      receipt: {
        id: receiptRecord.id,
        fileName,
        fileSize: file.size,
        uploadedAt: receiptRecord.uploaded_at,
        status: 'uploaded',
        processingStatus: 'queued'
      },
      message: 'Receipt uploaded successfully. OCR processing started.'
    })

  } catch (error) {
    logger.error('Receipt upload service error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error during receipt upload' },
      { status: 500 }
    )
  }
}

/**
 * Process receipt OCR asynchronously
 */
async function processReceiptAsync(
  receiptId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  accountantId: string
): Promise<void> {
  try {
    logger.info('Starting async OCR processing', { receiptId, fileName })

    // Process OCR
    const ocrResult = await processReceiptOCR(fileBuffer, fileName, mimeType)

    // Find matching transactions
    const matchingTransactions = await findMatchingTransactions(
      ocrResult.data,
      accountantId
    )

    // Update receipt with OCR data and matches
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        ocr_data: ocrResult.data,
        ocr_confidence: ocrResult.confidence === 'high' ? 0.9 : 
                       ocrResult.confidence === 'medium' ? 0.7 : 0.5,
        vendor_extracted: ocrResult.data.vendor.name,
        amount_extracted: ocrResult.data.amount.value,
        date_extracted: ocrResult.data.date.value,
        processed_at: new Date().toISOString(),
        is_matched: matchingTransactions.length > 0,
        match_confidence: matchingTransactions.length > 0 ? matchingTransactions[0].matchScore : 0
      })
      .eq('id', receiptId)

    if (updateError) {
      throw new Error(`Failed to update receipt with OCR data: ${updateError.message}`)
    }

    // If we found a high-confidence match, link it automatically
    if (matchingTransactions.length > 0 && matchingTransactions[0].matchScore > 0.8) {
      const bestMatch = matchingTransactions[0]
      
      const { error: linkError } = await supabase
        .from('receipts')
        .update({
          transaction_id: bestMatch.transactionId
        })
        .eq('id', receiptId)

      if (linkError) {
        logger.error('Failed to auto-link receipt to transaction', linkError, {
          receiptId,
          transactionId: bestMatch.transactionId
        })
      } else {
        logger.info('Auto-linked receipt to transaction', {
          receiptId,
          transactionId: bestMatch.transactionId,
          matchScore: bestMatch.matchScore
        })
      }
    }

    logger.info('OCR processing completed successfully', {
      receiptId,
      confidence: ocrResult.confidence,
      vendor: ocrResult.data.vendor.name,
      amount: ocrResult.data.amount.value,
      matchesFound: matchingTransactions.length
    })

  } catch (error) {
    logger.error('OCR processing failed', error as Error, { receiptId, fileName })
    
    // Update receipt with error status
    await supabase
      .from('receipts')
      .update({
        processed_at: new Date().toISOString(),
        ocr_confidence: 0,
        vendor_extracted: 'Processing Failed',
        amount_extracted: 0
      })
      .eq('id', receiptId)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const accountantId = searchParams.get('accountantId')
    const status = searchParams.get('status') // uploaded, processed, matched
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!clientId || !accountantId) {
      return NextResponse.json(
        { error: 'Missing clientId or accountantId parameter' },
        { status: 400 }
      )
    }

    // Verify client belongs to accountant
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('accountant_id', accountantId)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid client access' },
        { status: 403 }
      )
    }

    // Build query
    let query = supabase
      .from('receipts')
      .select(`
        *,
        transaction:transactions(id, description, amount, transaction_date)
      `)
      .eq('client_id', clientId)
      .order('uploaded_at', { ascending: false })
      .limit(limit)

    // Apply status filter
    if (status === 'processed') {
      query = query.not('processed_at', 'is', null)
    } else if (status === 'matched') {
      query = query.not('transaction_id', 'is', null)
    } else if (status === 'uploaded') {
      query = query.is('processed_at', null)
    }

    const { data: receipts, error } = await query

    if (error) {
      const dbError = new DatabaseError('Failed to fetch receipts', {
        clientId,
        accountantId,
        dbError: error.message
      })
      logger.error('Database error fetching receipts', dbError)
      return NextResponse.json(
        { error: dbError.message },
        { status: dbError.statusCode }
      )
    }

    // Format response
    const formattedReceipts = receipts?.map(receipt => ({
      id: receipt.id,
      fileName: receipt.file_name,
      fileSize: receipt.file_size,
      mimeType: receipt.mime_type,
      uploadedAt: receipt.uploaded_at,
      processedAt: receipt.processed_at,
      status: receipt.processed_at ? 'processed' : 'uploaded',
      ocr: receipt.ocr_data ? {
        vendor: receipt.vendor_extracted,
        amount: receipt.amount_extracted,
        date: receipt.date_extracted,
        confidence: receipt.ocr_confidence
      } : null,
      matching: {
        isMatched: receipt.is_matched,
        confidence: receipt.match_confidence,
        transaction: receipt.transaction
      }
    })) || []

    return NextResponse.json({
      success: true,
      receipts: formattedReceipts,
      total: formattedReceipts.length
    })

  } catch (error) {
    logger.error('Receipt list service error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error fetching receipts' },
      { status: 500 }
    )
  }
}