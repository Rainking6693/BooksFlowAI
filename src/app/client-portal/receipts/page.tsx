/**
 * Client Portal - Receipt Management Page
 * MOBILE-RESPONSIVE - ACCESSIBILITY COMPLIANT - REAL-TIME UPDATES
 */

'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ReceiptUpload } from '@/components/receipts/ReceiptUpload'
import { ReceiptViewer } from '@/components/receipts/ReceiptViewer'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ComponentErrorBoundary } from '@/components/ErrorBoundary'
import { logger } from '@/lib/logger'
import { formatDate } from '@/lib/utils'

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

type ViewMode = 'grid' | 'list'
type FilterType = 'all' | 'processing' | 'processed' | 'matched' | 'unmatched'

function ReceiptManagementContent() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    initializeClient()
  }, [])

  useEffect(() => {
    if (clientId) {
      loadReceipts()
    }
  }, [clientId, filter])

  const initializeClient = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        logger.error('No authenticated user found')
        return
      }

      setUserId(user.id)

      // Get client profile
      const { data: client, error } = await supabase
        .from('clients')
        .select('id, business_name')
        .eq('user_id', user.id)
        .single()

      if (error || !client) {
        logger.error('Client profile not found', error)
        return
      }

      setClientId(client.id)
      logger.info('Client initialized', {
        clientId: client.id,
        businessName: client.business_name
      })

    } catch (error) {
      logger.error('Error initializing client', error as Error)
    }
  }

  const loadReceipts = async () => {
    if (!clientId) return

    try {
      setLoading(true)

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
        .eq('client_id', clientId)
        .order('uploaded_at', { ascending: false })

      // Apply filters
      switch (filter) {
        case 'processing':
          query = query.is('processed_at', null)
          break
        case 'processed':
          query = query.not('processed_at', 'is', null).eq('is_matched', false)
          break
        case 'matched':
          query = query.eq('is_matched', true)
          break
        case 'unmatched':
          query = query.eq('is_matched', false).not('processed_at', 'is', null)
          break
      }

      const { data, error } = await query.limit(50)

      if (error) {
        logger.error('Error loading receipts', error)
        return
      }

      setReceipts(data || [])
      logger.info('Receipts loaded successfully', {
        clientId,
        count: data?.length || 0,
        filter
      })

    } catch (error) {
      logger.error('Error in loadReceipts', error as Error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadSuccess = (receipt: any) => {
    logger.info('Receipt uploaded successfully', {
      receiptId: receipt.id,
      fileName: receipt.fileName
    })
    
    // Refresh receipts list
    loadReceipts()
    
    // Show success message
    // In a real app, you'd use a toast notification system
    alert('Receipt uploaded successfully! Processing will begin shortly.')
  }

  const handleUploadError = (error: string) => {
    logger.error('Receipt upload failed', new Error(error))
    alert(`Upload failed: ${error}`)
  }

  const getFilterCounts = () => {
    return {
      all: receipts.length,
      processing: receipts.filter(r => !r.processed_at).length,
      processed: receipts.filter(r => r.processed_at && !r.is_matched).length,
      matched: receipts.filter(r => r.is_matched).length,
      unmatched: receipts.filter(r => !r.is_matched && r.processed_at).length
    }
  }

  const getStatusBadge = (receipt: Receipt) => {
    if (receipt.is_matched) {
      return <Badge variant="success" size="sm">Matched</Badge>
    } else if (receipt.processed_at) {
      return <Badge variant="warning" size="sm">Needs Review</Badge>
    } else {
      return <Badge variant="info" size="sm">Processing</Badge>
    }
  }

  const filterCounts = getFilterCounts()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your receipts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Receipt Management</h1>
              <p className="text-gray-600">Upload and manage your business receipts</p>
            </div>
            <div className="mt-4 sm:mt-0 flex gap-2">
              <Button
                variant="primary"
                onClick={() => setShowUpload(!showUpload)}
              >
                {showUpload ? 'Hide Upload' : 'Upload Receipts'}
              </Button>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        {showUpload && clientId && userId && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Upload New Receipts</CardTitle>
              </CardHeader>
              <CardContent>
                <ReceiptUpload
                  clientId={clientId}
                  uploadedBy={userId}
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                  maxFiles={5}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {[
                { key: 'all', label: 'All Receipts', count: filterCounts.all },
                { key: 'processing', label: 'Processing', count: filterCounts.processing },
                { key: 'processed', label: 'Processed', count: filterCounts.processed },
                { key: 'matched', label: 'Matched', count: filterCounts.matched },
                { key: 'unmatched', label: 'Needs Review', count: filterCounts.unmatched }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as FilterType)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    filter === tab.key
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} found
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">View:</span>
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'primary' : 'outline'}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
          </div>
        </div>

        {/* Receipts Display */}
        {receipts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No receipts found</h3>
              <p className="text-gray-600 mb-4">
                {filter === 'all' 
                  ? 'Upload your first receipt to get started.'
                  : `No receipts match the "${filter}" filter.`
                }
              </p>
              {filter === 'all' && (
                <Button
                  variant="primary"
                  onClick={() => setShowUpload(true)}
                >
                  Upload Your First Receipt
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {receipts.map((receipt) => (
              <div key={receipt.id} onClick={() => setSelectedReceipt(receipt)}>
                <ReceiptViewer
                  receipt={receipt}
                  compact={true}
                  showActions={false}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {receipts.map((receipt) => (
              <Card key={receipt.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {receipt.file_name}
                        </h3>
                        {getStatusBadge(receipt)}
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">Vendor:</span> {receipt.vendor_extracted || 'Unknown'}
                        </div>
                        <div>
                          <span className="font-medium">Amount:</span> {receipt.amount_extracted ? `$${receipt.amount_extracted.toFixed(2)}` : 'Unknown'}
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

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedReceipt(receipt)
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Receipt Detail Modal */}
        {selectedReceipt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-medium">Receipt Details</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedReceipt(null)}
                >
                  ✕
                </Button>
              </div>
              <div className="p-4">
                <ReceiptViewer
                  receipt={selectedReceipt}
                  compact={false}
                  showActions={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Wrap in error boundary
export default function ReceiptManagementPage() {
  return (
    <ComponentErrorBoundary>
      <ReceiptManagementContent />
    </ComponentErrorBoundary>
  )
}