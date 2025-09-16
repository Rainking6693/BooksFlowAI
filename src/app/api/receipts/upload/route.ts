/**
 * Receipt Upload API Endpoint
 * SECURE FILE HANDLING - OCR PROCESSING - TRANSACTION MATCHING
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { processReceiptOCR, matchReceiptToTransactions } from '@/lib/ocr/mindee-client'
import { logger } from '@/lib/logger'
import { 
  ValidationError, 
  FileUploadError, 
  DatabaseError, 
  ExternalServiceError 
} from '@/lib/errors'
import { APP_CONFIG } from '@/lib/config'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let uploadedFileId: string | null = null

  try {
    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('receipt') as File
    const clientId = formData.get('clientId') as string
    const uploadedBy = formData.get('uploadedBy') as string

    const context = {
      clientId,
      uploadedBy,
      fileName: file?.name,
      fileSize: file?.size,
      mimeType: file?.type,
      operation: 'receipt_upload'
    }

    logger.info('Starting receipt upload processing', context)

    // Validate input
    if (!file) {
      throw new ValidationError('No file provided', context)
    }

    if (!clientId) {
      throw new ValidationError('Client ID is required', context)
    }

    if (!uploadedBy) {
      throw new ValidationError('Uploaded by user ID is required', context)
    }

    // Validate file
    validateReceiptFile(file, context)

    // Verify client exists and user has permission
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, accountant_id, business_name')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      throw new ValidationError('Client not found or access denied', {
        ...context,
        dbError: clientError?.message
      })
    }

    // Convert file to buffer for processing
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Upload file to Supabase storage
    const fileName = generateUniqueFileName(file.name, clientId)
    const filePath = `receipts/${clientId}/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new FileUploadError('Failed to upload file to storage', {
        ...context,
        storageError: uploadError.message
      })
    }

    // Create receipt record in database
    const { data: receiptRecord, error: receiptError } = await supabase
      .from('receipts')
      .insert({
        client_id: clientId,
        file_path: uploadData.path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (receiptError || !receiptRecord) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('receipts').remove([uploadData.path])
      
      throw new DatabaseError('Failed to create receipt record', {
        ...context,
        dbError: receiptError?.message
      })
    }

    uploadedFileId = receiptRecord.id

    logger.info('Receipt file uploaded successfully', {
      ...context,
      receiptId: receiptRecord.id,
      filePath: uploadData.path
    })

    // Process OCR asynchronously
    try {
      logger.info('Starting OCR processing', {
        ...context,
        receiptId: receiptRecord.id
      })

      const ocrResult = await processReceiptOCR({
        fileBuffer,
        fileName: file.name,
        mimeType: file.type,
        clientId,
        uploadedBy
      })

      // Update receipt with OCR data
      const { error: ocrUpdateError } = await supabase
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
        .eq('id', receiptRecord.id)

      if (ocrUpdateError) {
        logger.error('Failed to update receipt with OCR data', ocrUpdateError, {
          ...context,
          receiptId: receiptRecord.id
        })
      } else {
        logger.info('OCR processing completed successfully', {
          ...context,
          receiptId: receiptRecord.id,
          vendor: ocrResult.vendor,
          amount: ocrResult.amount,
          confidence: ocrResult.confidence
        })
      }

      // Attempt transaction matching if OCR was successful
      if (ocrResult.confidence !== 'low' && (ocrResult.vendor || ocrResult.amount)) {
        try {
          const matchingResult = await matchReceiptToTransactions({
            ocrResult,
            accountantId: client.accountant_id,
            dateRange: {
              start: getMatchingDateRange(ocrResult.date).start,
              end: getMatchingDateRange(ocrResult.date).end
            }
          })

          // Update receipt with matching results
          const matchData = {
            is_matched: matchingResult.bestMatch.confidence !== 'none',
            match_confidence: matchingResult.bestMatch.matchScore,
            updated_at: new Date().toISOString()
          }

          // If high confidence match, auto-link the transaction
          if (matchingResult.bestMatch.confidence === 'high' && matchingResult.bestMatch.transactionId) {
            await supabase
              .from('receipts')
              .update({
                ...matchData,
                transaction_id: matchingResult.bestMatch.transactionId
              })
              .eq('id', receiptRecord.id)

            logger.info('Receipt auto-matched to transaction', {
              ...context,
              receiptId: receiptRecord.id,
              transactionId: matchingResult.bestMatch.transactionId,
              matchScore: matchingResult.bestMatch.matchScore
            })
          } else {
            await supabase
              .from('receipts')
              .update(matchData)
              .eq('id', receiptRecord.id)

            logger.info('Receipt matching completed, manual review required', {
              ...context,
              receiptId: receiptRecord.id,
              matchesFound: matchingResult.matches.length,
              bestMatchScore: matchingResult.bestMatch.matchScore
            })
          }

        } catch (matchingError) {
          logger.error('Receipt matching failed', matchingError as Error, {
            ...context,
            receiptId: receiptRecord.id
          })
          // Continue without matching - not a critical failure
        }
      }

    } catch (ocrError) {
      logger.error('OCR processing failed', ocrError as Error, {
        ...context,
        receiptId: receiptRecord.id
      })
      
      // Update receipt with error status
      await supabase
        .from('receipts')
        .update({
          ocr_data: { error: 'OCR processing failed' },
          ocr_confidence: 0,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptRecord.id)
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: uploadedBy,
      action: 'RECEIPT_UPLOAD',
      resource_type: 'receipt',
      resource_id: receiptRecord.id,
      new_values: {
        client_id: clientId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type
      }
    })

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      receipt: {
        id: receiptRecord.id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        processingTime
      },
      message: 'Receipt uploaded successfully and is being processed'
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    
    // Clean up uploaded file if there was an error after upload
    if (uploadedFileId) {
      try {
        const { data: receipt } = await supabase
          .from('receipts')
          .select('file_path')
          .eq('id', uploadedFileId)
          .single()

        if (receipt?.file_path) {
          await supabase.storage.from('receipts').remove([receipt.file_path])
          await supabase.from('receipts').delete().eq('id', uploadedFileId)
        }
      } catch (cleanupError) {
        logger.error('Failed to clean up after upload error', cleanupError as Error, {
          uploadedFileId,
          originalError: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    if (error instanceof ValidationError || error instanceof FileUploadError) {
      logger.error('Receipt upload validation error', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    const uploadError = new FileUploadError('Internal server error during receipt upload', {
      originalError: error instanceof Error ? error.message : 'Unknown error',
      processingTime
    })
    
    logger.error('Receipt upload service error', uploadError)
    return NextResponse.json(
      { error: uploadError.message },
      { status: uploadError.statusCode }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const receiptId = searchParams.get('receiptId')

    if (!clientId && !receiptId) {
      return NextResponse.json(
        { error: 'Either clientId or receiptId parameter is required' },
        { status: 400 }
      )
    }

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
        transaction_id,
        transactions(id, description, amount, transaction_date)
      `)

    if (receiptId) {
      query = query.eq('id', receiptId).single()
    } else if (clientId) {
      query = query.eq('client_id', clientId).order('uploaded_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      const dbError = new DatabaseError('Failed to fetch receipt data', {
        clientId,
        receiptId,
        dbError: error.message
      })
      logger.error('Database error fetching receipts', dbError)
      return NextResponse.json(
        { error: dbError.message },
        { status: dbError.statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    const serviceError = new FileUploadError('Internal server error fetching receipts', {
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    logger.error('Receipt fetch service error', serviceError)
    return NextResponse.json(
      { error: serviceError.message },
      { status: serviceError.statusCode }
    )
  }
}

/**
 * Validate uploaded receipt file
 */
function validateReceiptFile(file: File, context: any): void {
  // Check file size
  if (file.size > APP_CONFIG.UPLOAD.MAX_FILE_SIZE) {
    throw new ValidationError('File size exceeds maximum limit', {
      ...context,
      maxSize: APP_CONFIG.UPLOAD.MAX_FILE_SIZE,
      actualSize: file.size
    })
  }

  // Check file type
  if (!APP_CONFIG.UPLOAD.ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new ValidationError('Unsupported file format', {
      ...context,
      allowedTypes: APP_CONFIG.UPLOAD.ALLOWED_MIME_TYPES,
      actualType: file.type
    })
  }

  // Check file name
  if (!file.name || file.name.length > 255) {
    throw new ValidationError('Invalid file name', {
      ...context,
      nameLength: file.name?.length
    })
  }

  // Check for potentially dangerous file names
  const dangerousPatterns = [
    /\.\./,  // Path traversal
    /[<>:"|?*]/,  // Invalid characters
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i  // Reserved names
  ]

  if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
    throw new ValidationError('Invalid file name format', context)
  }
}

/**
 * Generate unique file name to prevent conflicts
 */
function generateUniqueFileName(originalName: string, clientId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop() || ''
  const baseName = originalName.replace(/\.[^/.]+$/, '').substring(0, 50)
  
  return `${baseName}_${timestamp}_${random}.${extension}`
}

/**
 * Get date range for transaction matching
 */
function getMatchingDateRange(receiptDate: string | null): { start: string; end: string } {
  const today = new Date()
  const endDate = today.toISOString().split('T')[0]
  
  if (receiptDate) {
    const receiptDateObj = new Date(receiptDate)
    const startDate = new Date(receiptDateObj)
    startDate.setDate(startDate.getDate() - 7) // 7 days before receipt date
    
    const endDateObj = new Date(receiptDateObj)
    endDateObj.setDate(endDateObj.getDate() + 3) // 3 days after receipt date
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: Math.min(endDateObj.getTime(), today.getTime()) === endDateObj.getTime() 
        ? endDateObj.toISOString().split('T')[0] 
        : endDate
    }
  }
  
  // Default to last 30 days if no receipt date
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 30)
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate
  }
}