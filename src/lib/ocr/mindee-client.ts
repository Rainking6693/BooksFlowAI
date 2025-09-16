/**
 * Production-grade Mindee OCR Client for Solo Accountant AI
 * COMPREHENSIVE ERROR HANDLING - PERFORMANCE MONITORING - RECEIPT PROCESSING
 */

import { logger, withTiming, performanceMonitor } from '../logger'
import { ExternalServiceError, ValidationError, withRetry, CircuitBreaker } from '../errors'
import { env, APP_CONFIG } from '../config'

// Circuit breaker for Mindee API resilience
const mindeeCircuitBreaker = new CircuitBreaker(3, 120000, 'Mindee-OCR-API')

// Mindee API configuration
const MINDEE_CONFIG = {
  API_URL: 'https://api.mindee.net/v1',
  RECEIPT_ENDPOINT: '/products/mindee/expense_receipts/v5/predict',
  TIMEOUT: 30000, // 30 seconds for OCR processing
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000
}

// OCR result types
export interface ReceiptOCRRequest {
  fileBuffer: Buffer
  fileName: string
  mimeType: string
  clientId: string
  uploadedBy: string
}

export interface ReceiptOCRResponse {
  vendor: string | null
  amount: number | null
  date: string | null
  currency: string | null
  category: string | null
  confidence: 'high' | 'medium' | 'low'
  confidenceScore: number // 0-1
  rawData: any
  processingTime: number
}

export interface ReceiptMatchingRequest {
  ocrResult: ReceiptOCRResponse
  accountantId: string
  dateRange: {
    start: string
    end: string
  }
}

export interface ReceiptMatchingResponse {
  matches: Array<{
    transactionId: string
    matchScore: number
    matchReason: string
    transaction: {
      description: string
      amount: number
      date: string
      vendor: string | null
    }
  }>
  bestMatch: {
    transactionId: string | null
    confidence: 'high' | 'medium' | 'low' | 'none'
    matchScore: number
  }
}

/**
 * Process receipt using Mindee OCR API
 */
export async function processReceiptOCR(
  request: ReceiptOCRRequest
): Promise<ReceiptOCRResponse> {
  const context = {
    fileName: request.fileName,
    mimeType: request.mimeType,
    fileSize: request.fileBuffer.length,
    clientId: request.clientId,
    operation: 'receipt_ocr_processing'
  }

  return withTiming(
    () => withRetry(
      () => mindeeCircuitBreaker.execute(async () => {
        logger.info('Starting receipt OCR processing', context)
        
        // Validate input
        await validateReceiptInput(request)
        
        // Prepare Mindee API request
        const formData = new FormData()
        const blob = new Blob([request.fileBuffer], { type: request.mimeType })
        formData.append('document', blob, request.fileName)

        const response = await fetch(`${MINDEE_CONFIG.API_URL}${MINDEE_CONFIG.RECEIPT_ENDPOINT}`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${env.MINDEE_API_KEY}`,
            'User-Agent': 'SoloAccountantAI/1.0'
          },
          body: formData,
          signal: AbortSignal.timeout(MINDEE_CONFIG.TIMEOUT)
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new ExternalServiceError('Mindee', `OCR processing failed: ${response.status}`, {
            ...context,
            status: response.status,
            error: errorText
          })
        }

        const ocrData = await response.json()
        
        // Validate OCR response
        if (!ocrData.document?.inference) {
          throw new ExternalServiceError('Mindee', 'Invalid OCR response format', {
            ...context,
            response: ocrData
          })
        }

        // Extract and normalize receipt data
        const extractedData = extractReceiptData(ocrData)
        
        logger.info('Receipt OCR processing completed successfully', {
          ...context,
          vendor: extractedData.vendor,
          amount: extractedData.amount,
          confidence: extractedData.confidence,
          processingTime: extractedData.processingTime
        })

        // Record performance metrics
        performanceMonitor.recordMetric('ocr_processing_time', extractedData.processingTime)
        performanceMonitor.recordMetric('ocr_confidence_score', extractedData.confidenceScore)
        
        return extractedData
      }),
      MINDEE_CONFIG.RETRY_ATTEMPTS,
      MINDEE_CONFIG.RETRY_DELAY,
      context
    ),
    'receipt_ocr_processing',
    context
  ).catch(error => {
    logger.error('Receipt OCR processing failed', error, context)
    
    // Record failure metric
    performanceMonitor.recordMetric('ocr_processing_failures', 1)
    
    // Return fallback response for manual processing
    return {
      vendor: null,
      amount: null,
      date: null,
      currency: null,
      category: null,
      confidence: 'low' as const,
      confidenceScore: 0,
      rawData: null,
      processingTime: 0
    }
  })
}

/**
 * Match OCR results to existing transactions
 */
export async function matchReceiptToTransactions(
  request: ReceiptMatchingRequest
): Promise<ReceiptMatchingResponse> {
  const context = {
    accountantId: request.accountantId,
    ocrVendor: request.ocrResult.vendor,
    ocrAmount: request.ocrResult.amount,
    ocrDate: request.ocrResult.date,
    operation: 'receipt_transaction_matching'
  }

  return withTiming(
    async () => {
      logger.info('Starting receipt-to-transaction matching', context)
      
      // Import Supabase here to avoid circular dependencies
      const { supabase } = await import('../supabase')
      
      // Get potential matching transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id, description, amount, vendor_name, transaction_date, account_name')
        .eq('accountant_id', request.accountantId)
        .gte('transaction_date', request.dateRange.start)
        .lte('transaction_date', request.dateRange.end)
        .is('receipt_id', null) // Only unmatched transactions
        .order('transaction_date', { ascending: false })
        .limit(100)

      if (error) {
        throw new ExternalServiceError('Database', 'Failed to fetch transactions for matching', {
          ...context,
          dbError: error.message
        })
      }

      if (!transactions || transactions.length === 0) {
        logger.warn('No transactions found for receipt matching', context)
        return {
          matches: [],
          bestMatch: {
            transactionId: null,
            confidence: 'none',
            matchScore: 0
          }
        }
      }

      // Calculate match scores for each transaction
      const matches = transactions.map(transaction => {
        const matchScore = calculateMatchScore(request.ocrResult, transaction)
        const matchReason = generateMatchReason(request.ocrResult, transaction, matchScore)
        
        return {
          transactionId: transaction.id,
          matchScore,
          matchReason,
          transaction: {
            description: transaction.description,
            amount: transaction.amount,
            date: transaction.transaction_date,
            vendor: transaction.vendor_name
          }
        }
      })

      // Sort by match score (highest first)
      matches.sort((a, b) => b.matchScore - a.matchScore)

      // Determine best match with confidence level
      const bestMatch = matches.length > 0 ? {
        transactionId: matches[0].transactionId,
        confidence: getMatchConfidence(matches[0].matchScore),
        matchScore: matches[0].matchScore
      } : {
        transactionId: null,
        confidence: 'none' as const,
        matchScore: 0
      }

      logger.info('Receipt-to-transaction matching completed', {
        ...context,
        matchesFound: matches.length,
        bestMatchScore: bestMatch.matchScore,
        bestMatchConfidence: bestMatch.confidence
      })

      // Record matching metrics
      performanceMonitor.recordMetric('receipt_matching_score', bestMatch.matchScore)
      performanceMonitor.recordMetric('receipt_matches_found', matches.length)

      return {
        matches: matches.slice(0, 5), // Return top 5 matches
        bestMatch
      }
    },
    'receipt_transaction_matching',
    context
  )
}

/**
 * Validate receipt input before processing
 */
async function validateReceiptInput(request: ReceiptOCRRequest): Promise<void> {
  const context = {
    fileName: request.fileName,
    mimeType: request.mimeType,
    fileSize: request.fileBuffer.length
  }

  // Check file size
  if (request.fileBuffer.length > MINDEE_CONFIG.MAX_FILE_SIZE) {
    throw new ValidationError('File size exceeds maximum limit', {
      ...context,
      maxSize: MINDEE_CONFIG.MAX_FILE_SIZE
    })
  }

  // Check file format
  if (!MINDEE_CONFIG.SUPPORTED_FORMATS.includes(request.mimeType)) {
    throw new ValidationError('Unsupported file format', {
      ...context,
      supportedFormats: MINDEE_CONFIG.SUPPORTED_FORMATS
    })
  }

  // Check file name
  if (!request.fileName || request.fileName.length > 255) {
    throw new ValidationError('Invalid file name', context)
  }

  // Check client ID
  if (!request.clientId) {
    throw new ValidationError('Client ID is required', context)
  }

  // Basic file content validation
  if (request.fileBuffer.length < 100) {
    throw new ValidationError('File appears to be empty or corrupted', context)
  }
}

/**
 * Extract and normalize receipt data from Mindee response
 */
function extractReceiptData(ocrData: any): ReceiptOCRResponse {
  const startTime = Date.now()
  
  try {
    const prediction = ocrData.document.inference.prediction
    
    // Extract vendor information
    const vendor = prediction.supplier_name?.value || 
                  prediction.supplier?.value || 
                  null

    // Extract amount information
    const totalAmount = prediction.total_amount?.value || 
                       prediction.total_incl_taxes?.value ||
                       prediction.total_excl_taxes?.value ||
                       null

    // Extract date information
    const receiptDate = prediction.date?.value || 
                       prediction.invoice_date?.value ||
                       null

    // Extract currency
    const currency = prediction.locale?.currency || 
                    prediction.total_amount?.currency ||
                    'USD'

    // Extract category if available
    const category = prediction.category?.value || null

    // Calculate overall confidence
    const confidenceScore = calculateOverallConfidence(prediction)
    const confidence = normalizeConfidence(confidenceScore)

    const processingTime = Date.now() - startTime

    return {
      vendor: vendor ? cleanVendorName(vendor) : null,
      amount: totalAmount ? parseFloat(totalAmount.toString()) : null,
      date: receiptDate ? normalizeDate(receiptDate) : null,
      currency,
      category,
      confidence,
      confidenceScore,
      rawData: prediction,
      processingTime
    }
  } catch (error) {
    logger.error('Error extracting receipt data', error as Error, {
      ocrData: JSON.stringify(ocrData).substring(0, 500)
    })
    
    return {
      vendor: null,
      amount: null,
      date: null,
      currency: null,
      category: null,
      confidence: 'low',
      confidenceScore: 0,
      rawData: ocrData,
      processingTime: Date.now() - startTime
    }
  }
}

/**
 * Calculate match score between OCR result and transaction
 */
function calculateMatchScore(ocrResult: ReceiptOCRResponse, transaction: any): number {
  let score = 0
  let maxScore = 0

  // Amount matching (40% weight)
  if (ocrResult.amount && transaction.amount) {
    maxScore += 40
    const amountDiff = Math.abs(ocrResult.amount - Math.abs(transaction.amount))
    const amountTolerance = Math.max(0.01, Math.abs(transaction.amount) * 0.05) // 5% tolerance
    
    if (amountDiff <= amountTolerance) {
      score += 40
    } else if (amountDiff <= amountTolerance * 2) {
      score += 20
    }
  }

  // Vendor matching (30% weight)
  if (ocrResult.vendor && transaction.vendor_name) {
    maxScore += 30
    const vendorSimilarity = calculateStringSimilarity(
      ocrResult.vendor.toLowerCase(),
      transaction.vendor_name.toLowerCase()
    )
    score += vendorSimilarity * 30
  } else if (ocrResult.vendor && transaction.description) {
    maxScore += 30
    const descriptionSimilarity = calculateStringSimilarity(
      ocrResult.vendor.toLowerCase(),
      transaction.description.toLowerCase()
    )
    score += descriptionSimilarity * 15 // Lower weight for description matching
  }

  // Date matching (30% weight)
  if (ocrResult.date && transaction.transaction_date) {
    maxScore += 30
    const ocrDate = new Date(ocrResult.date)
    const transactionDate = new Date(transaction.transaction_date)
    const daysDiff = Math.abs((ocrDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff <= 1) {
      score += 30
    } else if (daysDiff <= 3) {
      score += 20
    } else if (daysDiff <= 7) {
      score += 10
    }
  }

  // Return normalized score (0-1)
  return maxScore > 0 ? score / maxScore : 0
}

/**
 * Generate human-readable match reason
 */
function generateMatchReason(ocrResult: ReceiptOCRResponse, transaction: any, score: number): string {
  const reasons: string[] = []

  if (ocrResult.amount && transaction.amount) {
    const amountDiff = Math.abs(ocrResult.amount - Math.abs(transaction.amount))
    if (amountDiff <= 0.01) {
      reasons.push('Exact amount match')
    } else if (amountDiff <= Math.abs(transaction.amount) * 0.05) {
      reasons.push('Close amount match')
    }
  }

  if (ocrResult.vendor && transaction.vendor_name) {
    const similarity = calculateStringSimilarity(
      ocrResult.vendor.toLowerCase(),
      transaction.vendor_name.toLowerCase()
    )
    if (similarity > 0.8) {
      reasons.push('Strong vendor match')
    } else if (similarity > 0.5) {
      reasons.push('Partial vendor match')
    }
  }

  if (ocrResult.date && transaction.transaction_date) {
    const daysDiff = Math.abs(
      (new Date(ocrResult.date).getTime() - new Date(transaction.transaction_date).getTime()) / 
      (1000 * 60 * 60 * 24)
    )
    if (daysDiff <= 1) {
      reasons.push('Same day transaction')
    } else if (daysDiff <= 3) {
      reasons.push('Recent transaction')
    }
  }

  return reasons.length > 0 ? reasons.join(', ') : 'Low confidence match'
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      )
    }
  }

  const maxLength = Math.max(str1.length, str2.length)
  return maxLength === 0 ? 1 : (maxLength - matrix[str2.length][str1.length]) / maxLength
}

/**
 * Calculate overall confidence from Mindee prediction
 */
function calculateOverallConfidence(prediction: any): number {
  const fields = [
    prediction.supplier_name,
    prediction.total_amount,
    prediction.date
  ]

  const confidences = fields
    .filter(field => field && field.confidence !== undefined)
    .map(field => field.confidence)

  if (confidences.length === 0) return 0

  return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
}

/**
 * Normalize confidence score to categorical confidence level
 */
function normalizeConfidence(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.85) return 'high'
  if (score >= 0.65) return 'medium'
  return 'low'
}

/**
 * Get match confidence level from score
 */
function getMatchConfidence(score: number): 'high' | 'medium' | 'low' | 'none' {
  if (score >= 0.8) return 'high'
  if (score >= 0.6) return 'medium'
  if (score >= 0.3) return 'low'
  return 'none'
}

/**
 * Clean and normalize vendor name
 */
function cleanVendorName(vendor: string): string {
  return vendor
    .trim()
    .replace(/[^\w\s&.-]/g, '') // Remove special characters except common business ones
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 100) // Limit length
}

/**
 * Normalize date format
 */
function normalizeDate(date: string): string {
  try {
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date')
    }
    return parsedDate.toISOString().split('T')[0] // Return YYYY-MM-DD format
  } catch {
    return date // Return original if parsing fails
  }
}

/**
 * Batch process multiple receipts
 */
export async function processReceiptsBatch(
  requests: ReceiptOCRRequest[]
): Promise<ReceiptOCRResponse[]> {
  const context = {
    batchSize: requests.length,
    operation: 'batch_receipt_processing'
  }

  logger.info('Starting batch receipt processing', context)

  if (requests.length === 0) {
    return []
  }

  const results: ReceiptOCRResponse[] = []
  const batchSize = 3 // Process 3 receipts concurrently to respect API limits
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize)
    const batchContext = {
      ...context,
      batchIndex: Math.floor(i / batchSize) + 1,
      totalBatches: Math.ceil(requests.length / batchSize),
      currentBatchSize: batch.length
    }

    logger.debug('Processing receipt batch', batchContext)
    
    const batchPromises = batch.map((request, index) => 
      processReceiptOCR(request).catch(error => {
        logger.error(`Failed to process receipt ${i + index}`, error, {
          ...batchContext,
          receiptIndex: i + index,
          fileName: request.fileName
        })
        
        // Return fallback for failed receipt
        return {
          vendor: null,
          amount: null,
          date: null,
          currency: null,
          category: null,
          confidence: 'low' as const,
          confidenceScore: 0,
          rawData: null,
          processingTime: 0
        }
      })
    )
    
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < requests.length) {
      const delay = 2000 // 2 second delay
      logger.debug('Waiting between receipt batches', { ...batchContext, delay })
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  const successCount = results.filter(r => r.confidence !== 'low' || r.vendor || r.amount).length
  const avgConfidence = results.reduce((sum, r) => sum + r.confidenceScore, 0) / results.length

  logger.info('Batch receipt processing completed', {
    ...context,
    successCount,
    failureCount: results.length - successCount,
    averageConfidence: avgConfidence
  })

  // Record batch metrics
  performanceMonitor.recordMetric('receipt_batch_success_rate', successCount / results.length)
  performanceMonitor.recordMetric('receipt_batch_avg_confidence', avgConfidence)
  
  return results
}