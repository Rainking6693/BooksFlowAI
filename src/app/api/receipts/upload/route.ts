import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const clientId = formData.get('clientId') as string
    const accountantId = formData.get('accountantId') as string

    if (!file || !clientId || !accountantId) {
      return NextResponse.json(
        { error: 'File, client ID, and accountant ID are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPEG, PNG, WebP, or PDF files.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Generate mock receipt processing result
    const receiptId = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const fileName = file.name
    const fileSize = file.size

    logger.info('Receipt uploaded and processing started', {
      receiptId,
      fileName,
      fileSize,
      clientId,
      accountantId,
      operation: 'receipt_upload'
    })

    // Mock OCR extraction results
    const mockOCRData = {
      vendor: getRandomVendor(),
      amount: parseFloat((Math.random() * 500 + 10).toFixed(2)),
      date: getRandomRecentDate(),
      items: getRandomItems(),
      tax: parseFloat((Math.random() * 25 + 2).toFixed(2)),
      confidence: Math.random() * 0.3 + 0.7 // 70-100% confidence
    }

    // Mock transaction matching
    const hasMatch = Math.random() > 0.4 // 60% chance of finding a match
    const matchData = hasMatch ? {
      transactionId: `txn_${Math.random().toString(36).substring(2, 9)}`,
      matchConfidence: Math.random() * 0.3 + 0.7,
      matchedAmount: mockOCRData.amount,
      matchedDate: mockOCRData.date,
      matchedVendor: mockOCRData.vendor
    } : null

    // TODO: Implement actual file upload to storage
    // TODO: Implement actual OCR processing with Mindee
    // TODO: Implement actual transaction matching logic
    
    const response = {
      success: true,
      message: 'Receipt uploaded and processed successfully',
      receipt: {
        id: receiptId,
        fileName,
        fileSize,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        clientId,
        accountantId,
        processingStatus: 'completed',
        filePath: `/uploads/receipts/${clientId}/${receiptId}`, // Mock path
        ocr: {
          ...mockOCRData,
          confidence: Math.round(mockOCRData.confidence * 100)
        },
        matching: hasMatch ? {
          found: true,
          ...matchData,
          matchConfidence: Math.round(matchData!.matchConfidence * 100)
        } : {
          found: false,
          message: 'No matching transaction found. Receipt will be flagged for manual review.'
        }
      }
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    logger.error('Receipt upload error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error during receipt processing' },
      { status: 500 }
    )
  }
}

// Helper functions for generating mock data
function getRandomVendor(): string {
  const vendors = [
    'Starbucks', 'Office Depot', 'Amazon', 'Uber', 'Shell Gas Station',
    'Walmart', 'Home Depot', 'Best Buy', 'Target', 'CVS Pharmacy',
    'McDonald\'s', 'Subway', 'FedEx', 'UPS Store', 'Staples'
  ]
  return vendors[Math.floor(Math.random() * vendors.length)]
}

function getRandomRecentDate(): string {
  const days = Math.floor(Math.random() * 30) // Last 30 days
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

function getRandomItems(): string[] {
  const itemOptions = [
    ['Office supplies', 'Paper', 'Pens'],
    ['Coffee', 'Pastry'],
    ['Gasoline', 'Car wash'],
    ['Software license', 'Cloud storage'],
    ['Lunch', 'Beverages'],
    ['Shipping', 'Packaging materials'],
    ['Hardware', 'Tools'],
    ['Groceries', 'Household items']
  ]
  return itemOptions[Math.floor(Math.random() * itemOptions.length)]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const receiptId = searchParams.get('receiptId')

    if (!receiptId) {
      return NextResponse.json(
        { error: 'Receipt ID parameter is required' },
        { status: 400 }
      )
    }

    // Mock receipt status lookup
    return NextResponse.json({
      success: true,
      receipt: {
        id: receiptId,
        status: 'processed',
        processedAt: new Date().toISOString(),
        ocrCompleted: true,
        matchingCompleted: true,
        reviewRequired: Math.random() > 0.7 // 30% chance of requiring review
      }
    })

  } catch (error) {
    logger.error('Receipt status lookup error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
