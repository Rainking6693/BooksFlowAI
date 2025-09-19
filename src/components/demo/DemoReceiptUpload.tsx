'use client'

import React, { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'

interface DemoOCRResult {
  vendor: string
  amount: number
  date: string
  tax: number
  items: string[]
  confidence: number
  extractedAt: string
}

interface DemoCategorization {
  suggestedCategory: string
  confidence: number
  reasoning: string
  alternatives: string[]
}

interface DemoMatchingTransaction {
  id: string
  description: string
  amount: number
  date: string
  matchScore: number
  account: string
}

interface DemoReceiptResult {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  status: 'uploading' | 'processing' | 'processed' | 'error'
  processingTime: number
  ocr?: DemoOCRResult
  categorization?: DemoCategorization
  matchingTransactions?: DemoMatchingTransaction[]
  error?: string
}

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'processing' | 'processed' | 'error'
  result?: DemoReceiptResult
  error?: string
}

export function DemoReceiptUpload() {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map())
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setIsUploading(true)

    // Initialize upload progress for each file
    const newUploads = new Map(uploads)
    acceptedFiles.forEach(file => {
      const fileId = `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2)}`
      newUploads.set(fileId, {
        file,
        progress: 0,
        status: 'uploading'
      })
    })
    setUploads(newUploads)

    // Process uploads (can handle multiple files)
    for (const file of acceptedFiles) {
      const fileId = Array.from(newUploads.keys()).find(id => 
        newUploads.get(id)?.file === file
      )
      
      if (!fileId) continue

      try {
        await uploadDemoFile(file, fileId, newUploads)
      } catch (error) {
        console.error('Demo upload failed:', error)
      }
    }

    setIsUploading(false)
  }, [uploads])

  const uploadDemoFile = async (file: File, fileId: string, uploadsMap: Map<string, UploadProgress>) => {
    const updateProgress = (updates: Partial<UploadProgress>) => {
      const current = uploadsMap.get(fileId)
      if (current) {
        const updated = { ...current, ...updates }
        uploadsMap.set(fileId, updated)
        setUploads(new Map(uploadsMap))
      }
    }

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        updateProgress((current) => ({
          progress: Math.min((current.progress || 0) + Math.random() * 15, 85)
        }))
      }, 200)

      // Create form data
      const formData = new FormData()
      formData.append('receipt', file)

      // Update to processing status
      setTimeout(() => {
        clearInterval(progressInterval)
        updateProgress({ progress: 90, status: 'processing' })
      }, 1000 + Math.random() * 1000)

      // Upload file to demo endpoint
      const response = await fetch('/api/demo/receipt-upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()

      // Simulate final processing delay
      setTimeout(() => {
        updateProgress({
          progress: 100,
          status: 'processed',
          result: result.receipt
        })
      }, 1500 + Math.random() * 1000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      updateProgress({
        progress: 0,
        status: 'error',
        error: errorMessage
      })
    }
  }

  const removeUpload = (fileId: string) => {
    const newUploads = new Map(uploads)
    newUploads.delete(fileId)
    setUploads(newUploads)
  }

  const retryUpload = async (fileId: string) => {
    const upload = uploads.get(fileId)
    if (!upload) return

    const newUploads = new Map(uploads)
    newUploads.set(fileId, {
      ...upload,
      progress: 0,
      status: 'uploading',
      error: undefined,
      result: undefined
    })
    setUploads(newUploads)

    try {
      await uploadDemoFile(upload.file, fileId, newUploads)
    } catch (error) {
      console.error('Demo upload retry failed:', error)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 3,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isUploading
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusBadge = (status: UploadProgress['status']) => {
    const badges = {
      uploading: { text: 'Uploading', class: 'bg-blue-100 text-blue-800' },
      processing: { text: 'Processing', class: 'bg-yellow-100 text-yellow-800' },
      processed: { text: 'Complete', class: 'bg-green-100 text-green-800' },
      error: { text: 'Failed', class: 'bg-red-100 text-red-800' }
    }
    
    const badge = badges[status]
    return (
      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${badge.class}`}>
        {badge.text}
      </span>
    )
  }

  const getCategoryBadge = (category: string) => {
    const categoryColors: Record<string, string> = {
      'Meals & Entertainment': 'bg-purple-100 text-purple-800',
      'Office Supplies': 'bg-blue-100 text-blue-800',
      'Travel & Vehicle': 'bg-green-100 text-green-800',
      'Equipment & Software': 'bg-indigo-100 text-indigo-800',
      'Professional Services': 'bg-gray-100 text-gray-800',
      'Uncategorized': 'bg-gray-100 text-gray-600'
    }
    
    return (
      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${categoryColors[category] || categoryColors['Uncategorized']}`}>
        {category}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div 
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">
              {isDragActive ? 'Drop receipt here' : 'Try the AI-Powered OCR'}
            </h4>
            <p className="text-sm text-gray-600 mb-2">
              Upload a receipt image and watch our AI extract vendor, amount, and categorize it instantly
            </p>
            <p className="text-xs text-gray-500">
              Supports JPEG, PNG, WebP, and PDF files up to 10MB
            </p>
          </div>

          {!isUploading && (
            <button
              type="button"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              Select Receipt
            </button>
          )}
        </div>
      </div>

      {/* Upload Results */}
      {uploads.size > 0 && (
        <div className="space-y-4">
          {Array.from(uploads.entries()).map(([fileId, upload]) => (
            <div key={fileId} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              {/* File Info Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {upload.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(upload.file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(upload.status)}
                  <button
                    onClick={() => removeUpload(fileId)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {(upload.status === 'uploading' || upload.status === 'processing') && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>
                      {upload.status === 'uploading' ? 'Uploading...' : 'Processing with AI...'}
                    </span>
                    <span>{Math.round(upload.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        upload.status === 'processing' ? 'bg-yellow-500' : 'bg-primary-600'
                      }`}
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* OCR Results */}
              {upload.status === 'processed' && upload.result?.ocr && (
                <div className="space-y-3">
                  {/* Extracted Data */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-green-800">
                        OCR Extraction Complete ({Math.round(upload.result.ocr.confidence * 100)}% confidence)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500 block">Vendor</span>
                        <span className="font-medium text-gray-900">{upload.result.ocr.vendor}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Amount</span>
                        <span className="font-medium text-gray-900">${upload.result.ocr.amount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Date</span>
                        <span className="font-medium text-gray-900">
                          {new Date(upload.result.ocr.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Tax</span>
                        <span className="font-medium text-gray-900">${upload.result.ocr.tax.toFixed(2)}</span>
                      </div>
                    </div>
                    {upload.result.ocr.items.length > 0 && (
                      <div className="mt-2">
                        <span className="text-gray-500 text-xs block mb-1">Items</span>
                        <div className="flex flex-wrap gap-1">
                          {upload.result.ocr.items.map((item, index) => (
                            <span key={index} className="bg-white px-2 py-1 rounded text-xs text-gray-700 border">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Categorization */}
                  {upload.result.categorization && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className="text-sm font-medium text-blue-800">
                          AI Category Suggestion ({Math.round(upload.result.categorization.confidence * 100)}% confidence)
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Suggested:</span>
                          {getCategoryBadge(upload.result.categorization.suggestedCategory)}
                        </div>
                        <p className="text-xs text-blue-700 italic">
                          {upload.result.categorization.reasoning}
                        </p>
                        {upload.result.categorization.alternatives.length > 0 && (
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">Alternatives:</span>
                            <div className="flex flex-wrap gap-1">
                              {upload.result.categorization.alternatives.map((alt, index) => (
                                <span key={index} className="bg-white px-2 py-1 rounded text-xs text-gray-600 border">
                                  {alt}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transaction Matching */}
                  {upload.result.matchingTransactions && upload.result.matchingTransactions.length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span className="text-sm font-medium text-purple-800">
                          Matching Transaction Found
                        </span>
                      </div>
                      {upload.result.matchingTransactions.map((tx, index) => (
                        <div key={index} className="bg-white rounded border p-2">
                          <div className="flex justify-between items-start text-xs">
                            <div>
                              <p className="font-medium text-gray-900">{tx.description}</p>
                              <p className="text-gray-500">{tx.account} • {new Date(tx.date).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">${tx.amount.toFixed(2)}</p>
                              <p className="text-green-600">{Math.round(tx.matchScore * 100)}% match</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Processing Time */}
                  <div className="text-xs text-gray-500 text-center">
                    Processed in {upload.result.processingTime}ms
                  </div>
                </div>
              )}

              {/* Error State */}
              {upload.status === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-red-800">{upload.error}</span>
                    </div>
                    <button
                      onClick={() => retryUpload(fileId)}
                      className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Demo Info */}
      {uploads.size === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h5 className="text-sm font-medium text-blue-900 mb-1">
                This is a Live Demo
              </h5>
              <p className="text-xs text-blue-700 mb-2">
                Upload any receipt image to see our AI extract vendor information, amounts, dates, and automatically categorize the expense. The results shown are generated for demonstration purposes.
              </p>
              <p className="text-xs text-blue-600">
                ✨ Real OCR processing • 🤖 AI categorization • 🔗 Transaction matching
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}