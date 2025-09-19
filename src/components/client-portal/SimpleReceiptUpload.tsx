'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { logger } from '@/lib/logger'
import { formatFileSize } from '@/lib/utils'

interface UploadedReceipt {
  id: string
  fileName: string
  fileSize: number
  uploadedAt: string
  status: 'uploading' | 'uploaded' | 'processing' | 'processed' | 'error'
  processingStatus?: 'queued' | 'processing' | 'completed' | 'failed'
  ocr?: {
    vendor?: string
    amount?: number
    date?: string
    confidence?: number
  }
  error?: string
}

interface ReceiptUploadProps {
  clientId: string
  accountantId: string
  onUploadComplete?: (receipt: UploadedReceipt) => void
  maxFiles?: number
  className?: string
}

export function ReceiptUpload({
  clientId,
  accountantId,
  onUploadComplete,
  maxFiles = 10,
  className
}: ReceiptUploadProps) {
  const [uploadedReceipts, setUploadedReceipts] = useState<UploadedReceipt[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    const maxSize = 10 * 1024 * 1024 // 10MB
    
    if (!allowedTypes.includes(file.type)) {
      logger.error('Invalid file type', new Error(`File type ${file.type} not allowed`))
      return false
    }
    
    if (file.size > maxSize) {
      logger.error('File too large', new Error(`File size ${file.size} exceeds ${maxSize}`))
      return false
    }
    
    return true
  }

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(validateFile).slice(0, maxFiles)
    
    if (validFiles.length === 0) return

    setIsUploading(true)

    for (const file of validFiles) {
      const receiptId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const newReceipt: UploadedReceipt = {
        id: receiptId,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'uploading'
      }

      setUploadedReceipts(prev => [...prev, newReceipt])
      setUploadProgress(prev => ({ ...prev, [receiptId]: 0 }))

      try {
        await uploadFile(file, receiptId, clientId, accountantId)
      } catch (error) {
        logger.error('File upload failed', error as Error, {
          fileName: file.name,
          fileSize: file.size
        })
        
        setUploadedReceipts(prev => 
          prev.map(receipt => 
            receipt.id === receiptId 
              ? { ...receipt, status: 'error', error: 'Upload failed' }
              : receipt
          )
        )
      }
    }

    setIsUploading(false)
  }

  const uploadFile = async (
    file: File, 
    receiptId: string, 
    clientId: string, 
    accountantId: string
  ) => {
    const formData = new FormData()
    formData.append('receipt', file)
    formData.append('clientId', clientId)
    formData.append('accountantId', accountantId)

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const currentProgress = prev[receiptId] || 0
        const newProgress = Math.min(currentProgress + Math.random() * 20, 90)
        return { ...prev, [receiptId]: newProgress }
      })
    }, 200)

    try {
      const response = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(prev => ({ ...prev, [receiptId]: 100 }))

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      
      // Update receipt with server response
      setUploadedReceipts(prev => 
        prev.map(receipt => 
          receipt.id === receiptId 
            ? {
                ...receipt,
                id: result.receipt.id,
                status: 'uploaded',
                processingStatus: 'queued'
              }
            : receipt
        )
      )

      // Start polling for OCR processing status
      pollProcessingStatus(result.receipt.id)

      if (onUploadComplete) {
        onUploadComplete({
          id: result.receipt.id,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: result.receipt.uploadedAt,
          status: 'uploaded',
          processingStatus: 'queued'
        })
      }

      logger.info('Receipt uploaded successfully', {
        receiptId: result.receipt.id,
        fileName: file.name
      })

    } catch (error) {
      clearInterval(progressInterval)
      throw error
    }
  }

  const pollProcessingStatus = async (receiptId: string) => {
    const maxAttempts = 30 // 5 minutes with 10-second intervals
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/receipts/upload?clientId=${clientId}&accountantId=${accountantId}`
        )
        
        if (response.ok) {
          const data = await response.json()
          const receipt = data.receipts?.find((r: any) => r.id === receiptId)
          
          if (receipt && receipt.status === 'processed') {
            setUploadedReceipts(prev => 
              prev.map(r => 
                r.id === receiptId 
                  ? {
                      ...r,
                      status: 'processed',
                      processingStatus: 'completed',
                      ocr: receipt.ocr
                    }
                  : r
              )
            )
            return // Stop polling
          }
        }
        
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000) // Poll every 10 seconds
        } else {
          // Timeout - mark as processing failed
          setUploadedReceipts(prev => 
            prev.map(r => 
              r.id === receiptId 
                ? { ...r, processingStatus: 'failed', error: 'Processing timeout' }
                : r
            )
          )
        }
      } catch (error) {
        logger.error('Error polling processing status', error as Error, { receiptId })
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000)
        }
      }
    }

    // Start polling after a short delay
    setTimeout(poll, 5000)
  }

  const removeReceipt = (receiptId: string) => {
    setUploadedReceipts(prev => prev.filter(r => r.id !== receiptId))
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[receiptId]
      return newProgress
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    
    if (isUploading) return
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading':
        return 'processing'
      case 'uploaded':
        return 'synced'
      case 'processed':
        return 'approved'
      case 'error':
        return 'error'
      default:
        return 'pending'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {isDragActive ? 'Drop receipts here' : 'Upload Receipt Images'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Drag & drop receipt images or PDFs, or click to browse
            </p>
          </div>
          
          <div className="text-xs text-gray-400">
            <p>Supported formats: JPG, PNG, WebP, PDF</p>
            <p>Maximum file size: 10MB per file</p>
            <p>Maximum {maxFiles} files at once</p>
          </div>
          
          {!isUploading && (
            <Button variant="primary" size="sm">
              Choose Files
            </Button>
          )}
        </div>
      </div>

      {/* Upload Progress & Results */}
      {uploadedReceipts.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900">
            Uploaded Receipts ({uploadedReceipts.length})
          </h4>
          
          <div className="space-y-3">
            {uploadedReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {receipt.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(receipt.fileSize)} • {new Date(receipt.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <StatusBadge 
                          status={getStatusColor(receipt.status) as any}
                          size="sm"
                        />
                        
                        <Button
                          onClick={() => removeReceipt(receipt.id)}
                          variant="ghost"
                          size="xs"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                    
                    {/* Upload Progress */}
                    {receipt.status === 'uploading' && uploadProgress[receipt.id] !== undefined && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Uploading...</span>
                          <span>{Math.round(uploadProgress[receipt.id])}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress[receipt.id]}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Processing Status */}
                    {receipt.status === 'uploaded' && receipt.processingStatus && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <div className="animate-spin rounded-full h-3 w-3 border border-primary-600 border-t-transparent"></div>
                          <span>
                            {receipt.processingStatus === 'queued' && 'Queued for processing...'}
                            {receipt.processingStatus === 'processing' && 'Processing with OCR...'}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* OCR Results */}
                    {receipt.status === 'processed' && receipt.ocr && (
                      <div className="mt-3 p-3 bg-green-50 rounded-md">
                        <div className="text-xs font-medium text-green-800 mb-2">
                          OCR Processing Complete
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {receipt.ocr.vendor && (
                            <div>
                              <span className="text-gray-500">Vendor:</span>
                              <div className="font-medium text-gray-900">{receipt.ocr.vendor}</div>
                            </div>
                          )}
                          {receipt.ocr.amount && (
                            <div>
                              <span className="text-gray-500">Amount:</span>
                              <div className="font-medium text-gray-900">${receipt.ocr.amount.toFixed(2)}</div>
                            </div>
                          )}
                          {receipt.ocr.date && (
                            <div>
                              <span className="text-gray-500">Date:</span>
                              <div className="font-medium text-gray-900">
                                {new Date(receipt.ocr.date).toLocaleDateString()}
                              </div>
                            </div>
                          )}
                        </div>
                        {receipt.ocr.confidence && (
                          <div className="mt-2 text-xs text-gray-500">
                            Confidence: {Math.round(receipt.ocr.confidence * 100)}%
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Error Message */}
                    {receipt.error && (
                      <div className="mt-2 p-2 bg-error-50 rounded text-xs text-error-700">
                        {receipt.error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Upload Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="text-sm font-medium text-blue-900 mb-2">
          📸 Tips for Better OCR Results
        </h5>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Ensure receipts are well-lit and clearly visible</li>
          <li>• Avoid shadows, glare, or blurry images</li>
          <li>• Include the entire receipt with all edges visible</li>
          <li>• For crumpled receipts, flatten them before photographing</li>
          <li>• PDF scans often provide the best OCR accuracy</li>
        </ul>
      </div>
    </div>
  )
}