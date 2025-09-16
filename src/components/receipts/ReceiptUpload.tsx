/**
 * Receipt Upload Component
 * DRAG-DROP INTERFACE - MOBILE RESPONSIVE - REAL-TIME PROCESSING
 */

'use client'

import React, { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { logger } from '@/lib/logger'
import { APP_CONFIG } from '@/lib/config'

interface ReceiptUploadProps {
  clientId: string
  uploadedBy: string
  onUploadSuccess?: (receipt: UploadedReceipt) => void
  onUploadError?: (error: string) => void
  maxFiles?: number
  disabled?: boolean
}

interface UploadedReceipt {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  processingTime: number
}

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'processing' | 'success' | 'error'
  error?: string
  result?: UploadedReceipt
}

export function ReceiptUpload({
  clientId,
  uploadedBy,
  onUploadSuccess,
  onUploadError,
  maxFiles = 10,
  disabled = false
}: ReceiptUploadProps) {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map())
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled || acceptedFiles.length === 0) return

    // Validate file count
    if (acceptedFiles.length > maxFiles) {
      const error = `Maximum ${maxFiles} files allowed at once`
      logger.warn('Receipt upload file limit exceeded', {
        clientId,
        filesAttempted: acceptedFiles.length,
        maxFiles
      })
      onUploadError?.(error)
      return
    }

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

    // Process uploads sequentially to avoid overwhelming the server
    for (const file of acceptedFiles) {
      const fileId = Array.from(newUploads.keys()).find(id => 
        newUploads.get(id)?.file === file
      )
      
      if (!fileId) continue

      try {
        await uploadFile(file, fileId, newUploads)
      } catch (error) {
        logger.error('Receipt upload failed', error as Error, {
          clientId,
          fileName: file.name,
          fileSize: file.size
        })
      }
    }

    setIsUploading(false)
  }, [clientId, uploadedBy, uploads, maxFiles, disabled, onUploadSuccess, onUploadError])

  const uploadFile = async (file: File, fileId: string, uploadsMap: Map<string, UploadProgress>) => {
    const updateProgress = (updates: Partial<UploadProgress>) => {
      const current = uploadsMap.get(fileId)
      if (current) {
        const updated = { ...current, ...updates }
        uploadsMap.set(fileId, updated)
        setUploads(new Map(uploadsMap))
      }
    }

    try {
      // Validate file before upload
      validateFile(file)

      // Create form data
      const formData = new FormData()
      formData.append('receipt', file)
      formData.append('clientId', clientId)
      formData.append('uploadedBy', uploadedBy)

      // Update progress to processing
      updateProgress({ progress: 50, status: 'processing' })

      // Upload file
      const response = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()

      // Update progress to success
      updateProgress({
        progress: 100,
        status: 'success',
        result: result.receipt
      })

      logger.info('Receipt uploaded successfully', {
        clientId,
        fileName: file.name,
        receiptId: result.receipt.id,
        processingTime: result.receipt.processingTime
      })

      onUploadSuccess?.(result.receipt)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      updateProgress({
        progress: 0,
        status: 'error',
        error: errorMessage
      })

      logger.error('Receipt upload error', error as Error, {
        clientId,
        fileName: file.name
      })

      onUploadError?.(errorMessage)
    }
  }

  const validateFile = (file: File) => {
    // Check file size
    if (file.size > APP_CONFIG.UPLOAD.MAX_FILE_SIZE) {
      throw new Error(`File size must be less than ${formatFileSize(APP_CONFIG.UPLOAD.MAX_FILE_SIZE)}`)
    }

    // Check file type
    if (!APP_CONFIG.UPLOAD.ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error('Only JPEG, PNG, WebP, and PDF files are allowed')
    }

    // Check file name
    if (file.name.length > 255) {
      throw new Error('File name is too long')
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
      error: undefined
    })
    setUploads(newUploads)

    try {
      await uploadFile(upload.file, fileId, newUploads)
    } catch (error) {
      logger.error('Receipt upload retry failed', error as Error, {
        clientId,
        fileName: upload.file.name
      })
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
    maxFiles,
    maxSize: APP_CONFIG.UPLOAD.MAX_FILE_SIZE,
    disabled: disabled || isUploading
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusBadge = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading':
        return <Badge variant="info" size="sm">Uploading</Badge>
      case 'processing':
        return <Badge variant="warning" size="sm">Processing</Badge>
      case 'success':
        return <Badge variant="success" size="sm">Complete</Badge>
      case 'error':
        return <Badge variant="error" size="sm">Failed</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <Card className={`transition-colors ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300'}`}>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
              ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {isDragActive ? 'Drop receipts here' : 'Upload Receipt Images'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Drag and drop receipt files here, or click to select files
                </p>
                <p className="text-xs text-gray-500">
                  Supports JPEG, PNG, WebP, and PDF files up to {formatFileSize(APP_CONFIG.UPLOAD.MAX_FILE_SIZE)}
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                disabled={disabled || isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? 'Uploading...' : 'Select Files'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploads.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Upload Progress</h4>
            <div className="space-y-3">
              {Array.from(uploads.entries()).map(([fileId, upload]) => (
                <div key={fileId} className="flex items-center space-x-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {upload.file.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(upload.status)}
                        <span className="text-xs text-gray-500">
                          {formatFileSize(upload.file.size)}
                        </span>
                      </div>
                    </div>
                    
                    {upload.status === 'uploading' || upload.status === 'processing' ? (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    ) : upload.status === 'error' ? (
                      <p className="text-xs text-error-600">{upload.error}</p>
                    ) : upload.status === 'success' ? (
                      <p className="text-xs text-success-600">
                        Uploaded successfully • Processing time: {upload.result?.processingTime}ms
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center space-x-1">
                    {upload.status === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryUpload(fileId)}
                      >
                        Retry
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeUpload(fileId)}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile Camera Capture */}
      <div className="block sm:hidden">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isUploading}
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.setAttribute('capture', 'environment')
              fileInputRef.current.click()
            }
          }}
          className="w-full"
        >
          📷 Take Photo
        </Button>
      </div>
    </div>
  )
}