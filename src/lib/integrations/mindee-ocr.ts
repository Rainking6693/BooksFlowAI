/**
 * Mindee OCR API Integration
 * Handles receipt processing and data extraction
 */

import { logger } from '../logger'
import { ExternalServiceError, withRetry, CircuitBreaker } from '../errors'
import { APP_CONFIG } from '../config'

// Mindee API Configuration
const MINDEE_CONFIG = {
  API_URL: 'https://api.mindee.net/v1',
  API_KEY: process.env.MINDEE_API_KEY!,
  TIMEOUT: 30000, // 30 seconds
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
}

// Circuit breaker for Mindee API resilience
const mindeeCircuitBreaker = new CircuitBreaker(5, 60000, 'Mindee-OCR')

// OCR Result Types
export interface OCRReceiptData {
  vendor: {
    name: string
    confidence: number
  }
  amount: {
    value: number
    currency: string
    confidence: number
  }
  date: {
    value: string // ISO date string
    confidence: number
  }
  category: {
    predicted: string
    confidence: number
  }
  lineItems: Array<{
    description: string
    amount: number
    quantity?: number
  }>
  taxAmount?: {
    value: number
    confidence: number
  }
  tipAmount?: {
    value: number
    confidence: number
  }
  paymentMethod?: {
    type: string
    confidence: number
  }
}

export interface OCRProcessingResult {
  success: boolean
  confidence: 'high' | 'medium' | 'low'
  data: OCRReceiptData
  rawResponse: any
  processingTime: number
  errors?: string[]
}

export interface ReceiptMatchingCandidate {
  transactionId: string
  matchScore: number
  matchReasons: string[]
  transaction: {
    description: string
    amount: number
    date: string
    vendor?: string
  }
}

/**
 * Process receipt image/PDF using Mindee OCR
 */
export async function processReceiptOCR(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<OCRProcessingResult> {
  const startTime = Date.now()
  
  try {
    // Validate file
    validateReceiptFile(fileBuffer, fileName, mimeType)
    
    // Process with Mindee API
    const ocrResult = await mindeeCircuitBreaker.execute(() =>
      withRetry(
        () => callMindeeAPI(fileBuffer, fileName, mimeType),
        MINDEE_CONFIG.RETRY_ATTEMPTS,
        MINDEE_CONFIG.RETRY_DELAY,
        { fileName, mimeType }
      )
    )
    
    // Parse and structure the response
    const structuredData = parseOCRResponse(ocrResult)
    const confidence = calculateOverallConfidence(structuredData)
    
    const processingTime = Date.now() - startTime
    
    logger.info('Receipt OCR processing completed', {
      fileName,
      confidence,
      processingTime,
      vendor: structuredData.vendor.name,
      amount: structuredData.amount.value
    })
    
    return {
      success: true,
      confidence,
      data: structuredData,
      rawResponse: ocrResult,
      processingTime
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime
    
    logger.error('Receipt OCR processing failed', error as Error, {
      fileName,
      mimeType,
      processingTime
    })
    
    throw new ExternalServiceError(
      'Mindee OCR',
      `Failed to process receipt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { fileName, mimeType, processingTime }
    )
  }
}

/**
 * Validate receipt file before processing
 */
function validateReceiptFile(buffer: Buffer, fileName: string, mimeType: string): void {
  // Check file size
  if (buffer.length > MINDEE_CONFIG.MAX_FILE_SIZE) {
    throw new Error(`File size ${buffer.length} exceeds maximum ${MINDEE_CONFIG.MAX_FILE_SIZE} bytes`)
  }
  
  // Check file format
  if (!MINDEE_CONFIG.SUPPORTED_FORMATS.includes(mimeType)) {
    throw new Error(`Unsupported file format: ${mimeType}. Supported formats: ${MINDEE_CONFIG.SUPPORTED_FORMATS.join(', ')}`)
  }
  
  // Check file name
  if (!fileName || fileName.length > 255) {
    throw new Error('Invalid file name')
  }
}

/**
 * Call Mindee API for receipt processing
 */
async function callMindeeAPI(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<any> {
  const formData = new FormData()
  
  // Create blob from buffer
  const blob = new Blob([fileBuffer], { type: mimeType })
  formData.append('document', blob, fileName)
  
  const response = await fetch(`${MINDEE_CONFIG.API_URL}/products/mindee/expense_receipts/v5/predict`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${MINDEE_CONFIG.API_KEY}`,
      // Don't set Content-Type - let browser set it with boundary for FormData
    },
    body: formData,
    signal: AbortSignal.timeout(MINDEE_CONFIG.TIMEOUT)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Mindee API error (${response.status}): ${errorText}`)
  }
  
  return response.json()
}

/**
 * Parse Mindee OCR response into structured data
 */
function parseOCRResponse(response: any): OCRReceiptData {
  const prediction = response.document?.inference?.prediction
  
  if (!prediction) {
    throw new Error('Invalid OCR response format')
  }
  
  // Extract vendor information
  const vendor = {
    name: prediction.supplier_name?.value || 'Unknown Vendor',
    confidence: prediction.supplier_name?.confidence || 0
  }
  
  // Extract amount information
  const totalAmount = prediction.total_amount
  const amount = {
    value: totalAmount?.value || 0,
    currency: totalAmount?.currency || 'USD',
    confidence: totalAmount?.confidence || 0
  }
  
  // Extract date information
  const receiptDate = prediction.date
  const date = {
    value: receiptDate?.value || new Date().toISOString().split('T')[0],
    confidence: receiptDate?.confidence || 0
  }
  
  // Predict category based on vendor and line items
  const category = predictReceiptCategory(vendor.name, prediction.line_items || [])
  
  // Extract line items
  const lineItems = (prediction.line_items || []).map((item: any) => ({
    description: item.description || '',
    amount: item.total_amount || 0,
    quantity: item.quantity || 1
  }))
  
  // Extract additional fields
  const taxAmount = prediction.taxes?.length > 0 ? {
    value: prediction.taxes[0].value || 0,
    confidence: prediction.taxes[0].confidence || 0
  } : undefined
  
  const tipAmount = prediction.tip ? {
    value: prediction.tip.value || 0,
    confidence: prediction.tip.confidence || 0
  } : undefined
  
  const paymentMethod = prediction.payment_method ? {
    type: prediction.payment_method.value || 'unknown',
    confidence: prediction.payment_method.confidence || 0
  } : undefined
  
  return {
    vendor,
    amount,
    date,
    category,
    lineItems,
    taxAmount,
    tipAmount,
    paymentMethod
  }
}

/**
 * Predict receipt category based on vendor and line items
 */
function predictReceiptCategory(vendorName: string, lineItems: any[]): { predicted: string; confidence: number } {
  const vendor = vendorName.toLowerCase()
  
  // Restaurant/Food patterns
  if (vendor.includes('restaurant') || vendor.includes('cafe') || vendor.includes('coffee') ||
      vendor.includes('starbucks') || vendor.includes('mcdonald') || vendor.includes('subway')) {
    return { predicted: 'Meals & Entertainment', confidence: 0.9 }
  }
  
  // Office supplies patterns
  if (vendor.includes('office') || vendor.includes('staples') || vendor.includes('depot') ||
      vendor.includes('supplies')) {
    return { predicted: 'Office Supplies', confidence: 0.85 }
  }
  
  // Travel patterns
  if (vendor.includes('uber') || vendor.includes('lyft') || vendor.includes('taxi') ||
      vendor.includes('hotel') || vendor.includes('airline') || vendor.includes('airport')) {
    return { predicted: 'Travel', confidence: 0.85 }
  }
  
  // Gas/Fuel patterns
  if (vendor.includes('shell') || vendor.includes('exxon') || vendor.includes('chevron') ||
      vendor.includes('gas') || vendor.includes('fuel')) {
    return { predicted: 'Vehicle Expenses', confidence: 0.8 }
  }
  
  // Technology patterns
  if (vendor.includes('apple') || vendor.includes('microsoft') || vendor.includes('amazon') ||
      vendor.includes('software') || vendor.includes('tech')) {
    return { predicted: 'Software/Technology', confidence: 0.75 }
  }
  
  // Default to general business expense
  return { predicted: 'General Business Expense', confidence: 0.3 }
}

/**
 * Calculate overall confidence based on individual field confidences
 */
function calculateOverallConfidence(data: OCRReceiptData): 'high' | 'medium' | 'low' {
  const confidences = [
    data.vendor.confidence,
    data.amount.confidence,
    data.date.confidence
  ]
  
  const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
  
  if (avgConfidence >= 0.8) return 'high'
  if (avgConfidence >= 0.6) return 'medium'
  return 'low'
}

/**
 * Find matching transactions for a processed receipt
 */
export async function findMatchingTransactions(
  ocrData: OCRReceiptData,
  accountantId: string,
  dateRange: { start: string; end: string } = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days future
  }
): Promise<ReceiptMatchingCandidate[]> {
  try {
    // Import supabase here to avoid circular dependencies
    const { supabase } = await import('../supabase')
    
    // Get transactions within date range
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('accountant_id', accountantId)
      .gte('transaction_date', dateRange.start)
      .lte('transaction_date', dateRange.end)
      .order('transaction_date', { ascending: false })
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }
    
    if (!transactions || transactions.length === 0) {
      return []
    }
    
    // Calculate match scores for each transaction
    const candidates: ReceiptMatchingCandidate[] = []
    
    for (const transaction of transactions) {
      const matchResult = calculateMatchScore(ocrData, transaction)
      
      if (matchResult.score > 0.3) { // Only include reasonable matches
        candidates.push({
          transactionId: transaction.id,
          matchScore: matchResult.score,
          matchReasons: matchResult.reasons,
          transaction: {
            description: transaction.description,
            amount: transaction.amount,
            date: transaction.transaction_date,
            vendor: transaction.vendor_name
          }
        })
      }
    }
    
    // Sort by match score (highest first)
    candidates.sort((a, b) => b.matchScore - a.matchScore)
    
    // Return top 5 matches
    return candidates.slice(0, 5)
    
  } catch (error) {
    logger.error('Error finding matching transactions', error as Error, {
      accountantId,
      ocrVendor: ocrData.vendor.name,
      ocrAmount: ocrData.amount.value
    })
    
    throw new Error(`Failed to find matching transactions: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Calculate match score between OCR data and transaction
 */
function calculateMatchScore(
  ocrData: OCRReceiptData,
  transaction: any
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []
  
  // Amount matching (most important factor)
  const amountDiff = Math.abs(ocrData.amount.value - Math.abs(transaction.amount))
  const amountThreshold = Math.max(1, Math.abs(transaction.amount) * 0.05) // 5% tolerance
  
  if (amountDiff <= amountThreshold) {
    score += 0.5
    reasons.push(`Amount match: $${ocrData.amount.value} ≈ $${Math.abs(transaction.amount)}`)
  } else if (amountDiff <= amountThreshold * 2) {
    score += 0.3
    reasons.push(`Amount close: $${ocrData.amount.value} ≈ $${Math.abs(transaction.amount)}`)
  }
  
  // Date matching
  const ocrDate = new Date(ocrData.date.value)
  const transactionDate = new Date(transaction.transaction_date)
  const daysDiff = Math.abs((ocrDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysDiff <= 1) {
    score += 0.3
    reasons.push('Date exact match')
  } else if (daysDiff <= 3) {
    score += 0.2
    reasons.push('Date within 3 days')
  } else if (daysDiff <= 7) {
    score += 0.1
    reasons.push('Date within 1 week')
  }
  
  // Vendor matching
  if (transaction.vendor_name && ocrData.vendor.name) {
    const vendorSimilarity = calculateStringSimilarity(
      ocrData.vendor.name.toLowerCase(),
      transaction.vendor_name.toLowerCase()
    )
    
    if (vendorSimilarity > 0.8) {
      score += 0.2
      reasons.push('Vendor name match')
    } else if (vendorSimilarity > 0.5) {
      score += 0.1
      reasons.push('Vendor name similar')
    }
  }
  
  return { score: Math.min(score, 1.0), reasons }
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const matrix = []
  const len1 = str1.length
  const len2 = str2.length
  
  if (len1 === 0) return len2 === 0 ? 1 : 0
  if (len2 === 0) return 0
  
  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }
  
  const maxLen = Math.max(len1, len2)
  return (maxLen - matrix[len1][len2]) / maxLen
}

/**
 * Get OCR processing statistics
 */
export async function getOCRStatistics(accountantId: string): Promise<{
  totalProcessed: number
  successRate: number
  averageConfidence: number
  topVendors: Array<{ name: string; count: number }>
  processingTimes: {
    average: number
    p95: number
  }
}> {
  try {
    const { supabase } = await import('../supabase')
    
    const { data: receipts, error } = await supabase
      .from('receipts')
      .select('ocr_data, ocr_confidence, processed_at, uploaded_at')
      .eq('client_id', accountantId) // Assuming client_id links to accountant
      .not('processed_at', 'is', null)
      .order('processed_at', { ascending: false })
      .limit(1000)
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }
    
    if (!receipts || receipts.length === 0) {
      return {
        totalProcessed: 0,
        successRate: 0,
        averageConfidence: 0,
        topVendors: [],
        processingTimes: { average: 0, p95: 0 }
      }
    }
    
    // Calculate statistics
    const totalProcessed = receipts.length
    const successfulProcessing = receipts.filter(r => r.ocr_confidence && r.ocr_confidence > 0.3)
    const successRate = (successfulProcessing.length / totalProcessed) * 100
    
    const avgConfidence = receipts.reduce((sum, r) => sum + (r.ocr_confidence || 0), 0) / totalProcessed
    
    // Extract vendor statistics
    const vendorCounts: Record<string, number> = {}
    receipts.forEach(receipt => {
      if (receipt.ocr_data?.vendor?.name) {
        const vendor = receipt.ocr_data.vendor.name
        vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1
      }
    })
    
    const topVendors = Object.entries(vendorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))
    
    // Calculate processing times
    const processingTimes = receipts
      .filter(r => r.uploaded_at && r.processed_at)
      .map(r => new Date(r.processed_at!).getTime() - new Date(r.uploaded_at).getTime())
      .sort((a, b) => a - b)
    
    const avgProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0
    
    const p95Index = Math.floor(processingTimes.length * 0.95)
    const p95ProcessingTime = processingTimes.length > 0 ? processingTimes[p95Index] || 0 : 0
    
    return {
      totalProcessed,
      successRate: Math.round(successRate * 100) / 100,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      topVendors,
      processingTimes: {
        average: Math.round(avgProcessingTime),
        p95: Math.round(p95ProcessingTime)
      }
    }
    
  } catch (error) {
    logger.error('Error calculating OCR statistics', error as Error, { accountantId })
    throw new Error(`Failed to calculate OCR statistics: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}