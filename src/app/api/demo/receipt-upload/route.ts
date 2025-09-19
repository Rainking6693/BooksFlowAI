import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { APP_CONFIG } from '@/lib/config'

// Mock OCR results for demo purposes
const DEMO_OCR_RESULTS = [
  {
    vendor: "Starbucks Coffee",
    amount: 15.47,
    date: "2024-12-15",
    tax: 1.24,
    items: ["Venti Latte", "Blueberry Muffin"],
    confidence: 0.95
  },
  {
    vendor: "Office Depot",
    amount: 127.43,
    date: "2024-12-14",
    tax: 10.19,
    items: ["HP Printer Paper", "Stapler", "Pens"],
    confidence: 0.98
  },
  {
    vendor: "Amazon",
    amount: 89.99,
    date: "2024-12-13",
    tax: 7.20,
    items: ["Wireless Mouse", "USB Cable"],
    confidence: 0.93
  },
  {
    vendor: "Restaurant ABC",
    amount: 45.67,
    date: "2024-12-12",
    tax: 3.65,
    items: ["Lunch Meeting", "Business Meal"],
    confidence: 0.91
  },
  {
    vendor: "Gas Station XYZ",
    amount: 52.80,
    date: "2024-12-11",
    tax: 4.22,
    items: ["Fuel"],
    confidence: 0.89
  }
]

// AI categorization suggestions
const CATEGORY_SUGGESTIONS = {
  "Starbucks Coffee": {
    category: "Meals & Entertainment",
    confidence: 0.95,
    reasoning: "Coffee shop expense typically categorized as meals & entertainment"
  },
  "Office Depot": {
    category: "Office Supplies",
    confidence: 0.98,
    reasoning: "Office supply store purchases are business supplies"
  },
  "Amazon": {
    category: "Equipment & Software",
    confidence: 0.93,
    reasoning: "Electronic accessories for business use"
  },
  "Restaurant ABC": {
    category: "Meals & Entertainment",
    confidence: 0.91,
    reasoning: "Restaurant expense during business hours"
  },
  "Gas Station XYZ": {
    category: "Travel & Vehicle",
    confidence: 0.89,
    reasoning: "Fuel expense for business transportation"
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('receipt') as File

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No receipt file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > APP_CONFIG.UPLOAD.MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${Math.floor(APP_CONFIG.UPLOAD.MAX_FILE_SIZE / 1024 / 1024)}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    if (!APP_CONFIG.UPLOAD.ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload JPEG, PNG, WebP, or PDF files.' },
        { status: 400 }
      )
    }

    logger.info('Demo receipt upload started', {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type
    })

    // Generate a unique demo receipt ID
    const demoReceiptId = `demo-${Date.now()}-${Math.random().toString(36).substring(2)}`

    // Simulate processing delay (1-3 seconds)
    const processingTime = 1000 + Math.random() * 2000

    // Select a random OCR result for demo
    const ocrResult = DEMO_OCR_RESULTS[Math.floor(Math.random() * DEMO_OCR_RESULTS.length)]
    const categoryResult = CATEGORY_SUGGESTIONS[ocrResult.vendor] || {
      category: "Uncategorized",
      confidence: 0.75,
      reasoning: "Unable to determine category automatically"
    }

    // Create response with realistic processing simulation
    const response = {
      success: true,
      receipt: {
        id: demoReceiptId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        status: 'processing',
        processingTime: Math.round(processingTime),
        ocr: {
          vendor: ocrResult.vendor,
          amount: ocrResult.amount,
          date: ocrResult.date,
          tax: ocrResult.tax,
          items: ocrResult.items,
          confidence: ocrResult.confidence,
          extractedAt: new Date().toISOString()
        },
        categorization: {
          suggestedCategory: categoryResult.category,
          confidence: categoryResult.confidence,
          reasoning: categoryResult.reasoning,
          alternatives: [
            "Office Supplies",
            "Meals & Entertainment", 
            "Travel & Vehicle",
            "Equipment & Software",
            "Professional Services"
          ].filter(cat => cat !== categoryResult.category).slice(0, 2)
        },
        matchingTransactions: Math.random() > 0.5 ? [
          {
            id: `tx-${Math.random().toString(36).substring(2)}`,
            description: `Card Payment - ${ocrResult.vendor}`,
            amount: ocrResult.amount + (Math.random() - 0.5) * 2, // Slight variance
            date: ocrResult.date,
            matchScore: 0.85 + Math.random() * 0.1,
            account: "Business Credit Card"
          }
        ] : []
      },
      message: 'Demo receipt processed successfully with OCR and AI categorization'
    }

    logger.info('Demo receipt upload completed', {
      receiptId: demoReceiptId,
      fileName: file.name,
      vendor: ocrResult.vendor,
      amount: ocrResult.amount,
      category: categoryResult.category,
      processingTime: Math.round(processingTime)
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Demo receipt upload error', error as Error)
    return NextResponse.json(
      { error: 'Failed to process demo receipt upload' },
      { status: 500 }
    )
  }
}

// GET endpoint for demo status (if needed)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const receiptId = searchParams.get('receiptId')

  if (!receiptId || !receiptId.startsWith('demo-')) {
    return NextResponse.json(
      { error: 'Invalid demo receipt ID' },
      { status: 400 }
    )
  }

  // For demo purposes, always return processed status
  return NextResponse.json({
    success: true,
    receipt: {
      id: receiptId,
      status: 'processed',
      processedAt: new Date().toISOString()
    }
  })
}