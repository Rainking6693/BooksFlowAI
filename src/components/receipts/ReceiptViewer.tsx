'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfidenceIndicator } from '@/components/ui/ConfidenceIndicator'
import { formatFileSize } from '@/lib/utils'

interface Receipt {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  processedAt?: string
  status: 'uploaded' | 'processed' | 'matched' | 'error'
  ocr?: {
    vendor?: string
    amount?: number
    date?: string
    confidence?: number
  }
  matching?: {
    isMatched: boolean
    confidence?: number
    transaction?: {
      id: string
      description: string
      amount: number
      date: string
    }
  }
}

interface ReceiptViewerProps {
  receipt: Receipt
  onMatch?: (receiptId: string, transactionId: string) => void
  onUnmatch?: (receiptId: string) => void
  onDelete?: (receiptId: string) => void
  className?: string
}

export function ReceiptViewer({
  receipt,
  onMatch,
  onUnmatch,
  onDelete,
  className
}: ReceiptViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(false)

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    } else if (mimeType === 'application/pdf') {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'approved'
      case 'matched':
        return 'synced'
      case 'error':
        return 'error'
      default:
        return 'pending'
    }
  }

  const getConfidenceLevel = (confidence?: number): 'high' | 'medium' | 'low' => {
    if (!confidence) return 'low'
    if (confidence >= 0.8) return 'high'
    if (confidence >= 0.6) return 'medium'
    return 'low'
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 text-gray-400">
              {getFileIcon(receipt.mimeType)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {receipt.fileName}
                </h3>
                <StatusBadge 
                  status={getStatusColor(receipt.status) as any}
                  size="sm"
                />
              </div>
              
              <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                <span>{formatFileSize(receipt.fileSize)}</span>
                <span>•</span>
                <span>Uploaded {new Date(receipt.uploadedAt).toLocaleDateString()}</span>
                {receipt.processedAt && (
                  <>
                    <span>•</span>
                    <span>Processed {new Date(receipt.processedAt).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {receipt.mimeType.startsWith('image/') && (
              <Button
                onClick={() => setShowImagePreview(true)}
                variant="ghost"
                size="xs"
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </Button>
            )}
            
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="ghost"
              size="xs"
              className="text-gray-400 hover:text-gray-600"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
            
            {onDelete && (
              <Button
                onClick={() => onDelete(receipt.id)}
                variant="ghost"
                size="xs"
                className="text-gray-400 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* OCR Results */}
          {receipt.ocr && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">OCR Results</h4>
                {receipt.ocr.confidence && (
                  <ConfidenceIndicator
                    confidence={getConfidenceLevel(receipt.ocr.confidence)}
                    score={receipt.ocr.confidence}
                    showScore
                    size="sm"
                  />
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {receipt.ocr.vendor && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Vendor
                    </label>
                    <div className="text-sm text-gray-900">{receipt.ocr.vendor}</div>
                  </div>
                )}
                
                {receipt.ocr.amount && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Amount
                    </label>
                    <div className="text-sm text-gray-900 font-mono">
                      ${receipt.ocr.amount.toFixed(2)}
                    </div>
                  </div>
                )}
                
                {receipt.ocr.date && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Date
                    </label>
                    <div className="text-sm text-gray-900">
                      {new Date(receipt.ocr.date).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Matching Status */}
          {receipt.matching && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Transaction Matching</h4>
                {receipt.matching.confidence && (
                  <div className="text-xs text-gray-500">
                    Match Confidence: {Math.round(receipt.matching.confidence * 100)}%
                  </div>
                )}
              </div>
              
              {receipt.matching.isMatched && receipt.matching.transaction ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-700 font-medium">Matched to Transaction</span>
                  </div>
                  
                  <div className="bg-white rounded border p-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Description
                        </label>
                        <div className="text-sm text-gray-900">
                          {receipt.matching.transaction.description}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Amount
                        </label>
                        <div className="text-sm text-gray-900 font-mono">
                          ${Math.abs(receipt.matching.transaction.amount).toFixed(2)}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Date
                        </label>
                        <div className="text-sm text-gray-900">
                          {new Date(receipt.matching.transaction.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center space-x-2">
                      {onUnmatch && (
                        <Button
                          onClick={() => onUnmatch(receipt.id)}
                          variant="outline"
                          size="xs"
                        >
                          Unmatch
                        </Button>
                      )}
                      
                      <Button
                        onClick={() => window.open(`/transactions/${receipt.matching?.transaction?.id}`, '_blank')}
                        variant="ghost"
                        size="xs"
                      >
                        View Transaction
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-yellow-700 font-medium">No Match Found</span>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    This receipt hasn't been matched to any transaction yet.
                  </p>
                  
                  {onMatch && (
                    <Button
                      onClick={() => {
                        console.log('Find matching transaction for receipt:', receipt.id)
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Find Matching Transaction
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {receipt.status === 'error' && (
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-red-700 font-medium">Processing Error</span>
              </div>
              
              <p className="text-sm text-red-600">
                There was an error processing this receipt. Please try uploading again or contact support.
              </p>
              
              <div className="mt-3">
                <Button
                  onClick={() => {
                    console.log('Retry processing receipt:', receipt.id)
                  }}
                  variant="outline"
                  size="sm"
                >
                  Retry Processing
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      {showImagePreview && receipt.mimeType.startsWith('image/') && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="max-w-4xl max-h-full p-4">
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">{receipt.fileName}</h3>
                <Button
                  onClick={() => setShowImagePreview(false)}
                  variant="ghost"
                  size="sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              
              <div className="p-4">
                <img
                  src={`/api/receipts/${receipt.id}/preview`}
                  alt={receipt.fileName}
                  className="max-w-full max-h-96 mx-auto"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-receipt.png'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}