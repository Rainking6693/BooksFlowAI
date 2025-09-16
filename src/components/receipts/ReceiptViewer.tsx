/**
 * Receipt Viewer Component
 * RECEIPT DISPLAY - OCR RESULTS - TRANSACTION MATCHING
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { logger } from '@/lib/logger'

interface Receipt {
  id: string
  file_name: string
  file_size: number
  mime_type: string
  vendor_extracted: string | null
  amount_extracted: number | null
  date_extracted: string | null
  ocr_confidence: number | null
  is_matched: boolean
  match_confidence: number | null
  uploaded_at: string
  processed_at: string | null
  transaction_id: string | null
  transactions?: {
    id: string
    description: string
    amount: number
    transaction_date: string
  } | null
}

interface ReceiptViewerProps {
  receipt: Receipt
  onMatchTransaction?: (receiptId: string, transactionId: string | null) => void
  onViewMatches?: (receiptId: string) => void
  showActions?: boolean
  compact?: boolean
}

export function ReceiptViewer({
  receipt,
  onMatchTransaction,
  onViewMatches,
  showActions = true,
  compact = false
}: ReceiptViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load receipt image if it's an image file
    if (receipt.mime_type.startsWith('image/')) {
      loadReceiptImage()
    }
  }, [receipt.id])

  const loadReceiptImage = async () => {
    try {
      setLoading(true)
      // In a real implementation, this would fetch the signed URL from Supabase storage
      // For now, we'll simulate the image loading
      const response = await fetch(`/api/receipts/${receipt.id}/image`)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setImageUrl(url)
      } else {
        setImageError(true)
      }
    } catch (error) {
      logger.error('Failed to load receipt image', error as Error, {
        receiptId: receipt.id
      })
      setImageError(true)
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceBadge = (confidence: number | null) => {
    if (confidence === null) return null

    if (confidence >= 0.85) {
      return <Badge variant="success" size="sm">High Confidence</Badge>
    } else if (confidence >= 0.65) {
      return <Badge variant="warning" size="sm">Medium Confidence</Badge>
    } else {
      return <Badge variant="error" size="sm">Low Confidence</Badge>
    }
  }

  const getMatchStatusBadge = () => {
    if (receipt.is_matched && receipt.transaction_id) {
      return <Badge variant="success" size="sm">Matched</Badge>
    } else if (receipt.processed_at) {
      return <Badge variant="warning" size="sm">Needs Review</Badge>
    } else {
      return <Badge variant="info" size="sm">Processing</Badge>
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleUnmatch = () => {
    if (onMatchTransaction) {
      onMatchTransaction(receipt.id, null)
    }
  }

  const handleViewMatches = () => {
    if (onViewMatches) {
      onViewMatches(receipt.id)
    }
  }

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {receipt.file_name}
                </h3>
                {getMatchStatusBadge()}
                {getConfidenceBadge(receipt.ocr_confidence)}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Vendor:</span> {receipt.vendor_extracted || 'Unknown'}
                </div>
                <div>
                  <span className="font-medium">Amount:</span> {receipt.amount_extracted ? formatCurrency(receipt.amount_extracted) : 'Unknown'}
                </div>
                <div>
                  <span className="font-medium">Date:</span> {receipt.date_extracted ? formatDate(receipt.date_extracted) : 'Unknown'}
                </div>
                <div>
                  <span className="font-medium">Uploaded:</span> {formatDate(receipt.uploaded_at)}
                </div>
              </div>

              {receipt.is_matched && receipt.transactions && (
                <div className="mt-2 p-2 bg-success-50 rounded text-xs">
                  <span className="font-medium text-success-800">Matched to:</span>
                  <span className="text-success-700 ml-1">{receipt.transactions.description}</span>
                </div>
              )}
            </div>

            {showActions && (
              <div className="flex items-center gap-1 ml-2">
                {!receipt.is_matched && receipt.processed_at && (
                  <Button size="sm" variant="outline" onClick={handleViewMatches}>
                    Match
                  </Button>
                )}
                {receipt.is_matched && (
                  <Button size="sm" variant="ghost" onClick={handleUnmatch}>
                    Unmatch
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{receipt.file_name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {getMatchStatusBadge()}
              {getConfidenceBadge(receipt.ocr_confidence)}
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>{formatFileSize(receipt.file_size)}</div>
            <div>Uploaded {formatDate(receipt.uploaded_at)}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Receipt Image/Preview */}
        {receipt.mime_type.startsWith('image/') && (
          <div className="aspect-[3/4] max-w-sm mx-auto bg-gray-100 rounded-lg overflow-hidden">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : imageError ? (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Image not available</p>
                </div>
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={receipt.file_name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">PDF Document</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* OCR Extracted Data */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Extracted Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor</label>
              <p className="mt-1 text-sm text-gray-900">{receipt.vendor_extracted || 'Not detected'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</label>
              <p className="mt-1 text-sm text-gray-900">
                {receipt.amount_extracted ? formatCurrency(receipt.amount_extracted) : 'Not detected'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</label>
              <p className="mt-1 text-sm text-gray-900">
                {receipt.date_extracted ? formatDate(receipt.date_extracted) : 'Not detected'}
              </p>
            </div>
          </div>

          {receipt.ocr_confidence !== null && (
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">OCR Confidence</label>
              <div className="mt-1 flex items-center">
                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                  <div
                    className={`h-2 rounded-full ${
                      receipt.ocr_confidence >= 0.85 ? 'bg-success-500' :
                      receipt.ocr_confidence >= 0.65 ? 'bg-warning-500' : 'bg-error-500'
                    }`}
                    style={{ width: `${receipt.ocr_confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">{Math.round(receipt.ocr_confidence * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Matching */}
        {receipt.is_matched && receipt.transactions ? (
          <div className="bg-success-50 border border-success-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-success-800 mb-2">Matched Transaction</h4>
                <div className="space-y-1 text-sm text-success-700">
                  <p><span className="font-medium">Description:</span> {receipt.transactions.description}</p>
                  <p><span className="font-medium">Amount:</span> {formatCurrency(receipt.transactions.amount)}</p>
                  <p><span className="font-medium">Date:</span> {formatDate(receipt.transactions.transaction_date)}</p>
                  {receipt.match_confidence && (
                    <p><span className="font-medium">Match Confidence:</span> {Math.round(receipt.match_confidence * 100)}%</p>
                  )}
                </div>
              </div>
              {showActions && (
                <Button size="sm" variant="outline" onClick={handleUnmatch}>
                  Unmatch
                </Button>
              )}
            </div>
          </div>
        ) : receipt.processed_at && showActions ? (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-warning-800 mb-1">No Transaction Match</h4>
                <p className="text-sm text-warning-700">This receipt hasn't been matched to a transaction yet.</p>
              </div>
              <Button size="sm" variant="primary" onClick={handleViewMatches}>
                Find Matches
              </Button>
            </div>
          </div>
        ) : !receipt.processed_at ? (
          <div className="bg-info-50 border border-info-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-info-600 mr-3"></div>
              <div>
                <h4 className="text-sm font-medium text-info-800">Processing Receipt</h4>
                <p className="text-sm text-info-700">OCR processing is in progress...</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Processing Timeline */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Processing Timeline</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Uploaded</span>
              <span className="text-gray-900">{formatDate(receipt.uploaded_at)}</span>
            </div>
            {receipt.processed_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">OCR Completed</span>
                <span className="text-gray-900">{formatDate(receipt.processed_at)}</span>
              </div>
            )}
            {receipt.is_matched && (
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction Matched</span>
                <span className="text-success-600">✓ Complete</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}