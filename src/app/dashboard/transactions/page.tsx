'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { ComponentErrorBoundary, TransactionErrorFallback } from '@/components/ErrorBoundary'

interface Transaction {
  id: string
  description: string
  amount: number
  vendor_name: string | null
  transaction_date: string
  ai_confidence: 'high' | 'medium' | 'low' | null
  ai_reasoning: string | null
  status: 'pending' | 'approved' | 'rejected' | 'processing'
  category_name?: string
  ai_suggested_category?: string
}

type FilterType = 'all' | 'pending' | 'high_confidence' | 'medium_confidence' | 'low_confidence'

function TransactionsPageContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState(false)
  const [accountantId, setAccountantId] = useState<string | null>(null)

  useEffect(() => {
    loadTransactions()
  }, [filter])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      
      // Get current user and accountant profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: accountant } = await supabase
        .from('accountants')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!accountant) return
      setAccountantId(accountant.id)

      // Build query based on filter
      let query = supabase
        .from('transactions')
        .select(`
          id,
          description,
          amount,
          vendor_name,
          transaction_date,
          ai_confidence,
          ai_reasoning,
          status,
          transaction_categories!ai_suggested_category_id(name)
        `)
        .eq('accountant_id', accountant.id)
        .order('transaction_date', { ascending: false })

      // Apply filters
      switch (filter) {
        case 'pending':
          query = query.eq('status', 'pending')
          break
        case 'high_confidence':
          query = query.eq('ai_confidence', 'high')
          break
        case 'medium_confidence':
          query = query.eq('ai_confidence', 'medium')
          break
        case 'low_confidence':
          query = query.eq('ai_confidence', 'low')
          break
      }

      const { data, error } = await query.limit(100)

      if (error) {
        logger.error('Error loading transactions', error as Error, {
          accountantId: accountant?.id,
          filter,
          operation: 'load_transactions'
        })
        return
      }

      // Transform data to include category names
      const transformedData = data?.map(transaction => ({
        ...transaction,
        ai_suggested_category: transaction.transaction_categories?.name || 'Uncategorized'
      })) || []

      setTransactions(transformedData)
    } catch (error) {
      logger.error('Error in loadTransactions function', error as Error, {
        filter,
        operation: 'load_transactions_catch'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTransactionSelect = (transactionId: string, selected: boolean) => {
    const newSelected = new Set(selectedTransactions)
    if (selected) {
      newSelected.add(transactionId)
    } else {
      newSelected.delete(transactionId)
    }
    setSelectedTransactions(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set())
    } else {
      setSelectedTransactions(new Set(transactions.map(t => t.id)))
    }
  }

  const handleBulkApprove = async () => {
    if (selectedTransactions.size === 0) return

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .in('id', Array.from(selectedTransactions))

      if (error) {
        logger.error('Error approving transactions', error as Error, {
          selectedTransactions: Array.from(selectedTransactions),
          operation: 'bulk_approve'
        })
        return
      }

      // Reload transactions
      await loadTransactions()
      setSelectedTransactions(new Set())
    } catch (error) {
      logger.error('Error in bulk approve operation', error as Error, {
        selectedTransactions: Array.from(selectedTransactions),
        operation: 'bulk_approve_catch'
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleSingleAction = async (transactionId: string, action: 'approve' | 'reject') => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', transactionId)

      if (error) {
        logger.error(`Error ${action}ing transaction`, error as Error, {
          transactionId,
          action,
          operation: 'single_transaction_action'
        })
        return
      }

      // Reload transactions
      await loadTransactions()
    } catch (error) {
      logger.error(`Error in ${action} action`, error as Error, {
        transactionId,
        action,
        operation: 'single_transaction_action_catch'
      })
    }
  }

  const handleRunAI = async () => {
    if (!accountantId) return

    setProcessing(true)
    try {
      const pendingTransactions = transactions
        .filter(t => t.status === 'pending' && !t.ai_confidence)
        .map(t => t.id)

      if (pendingTransactions.length === 0) {
        alert('No pending transactions to categorize')
        return
      }

      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds: pendingTransactions,
          accountantId,
          batchMode: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to run AI categorization')
      }

      const result = await response.json()
      logger.info('AI categorization completed', {
        accountantId,
        transactionCount: pendingTransactions.length,
        operation: 'ai_categorization_success'
      })

      // Reload transactions to show AI suggestions
      await loadTransactions()
    } catch (error) {
      logger.error('Error running AI categorization', error as Error, {
        accountantId,
        operation: 'ai_categorization_error'
      })
      alert('Failed to run AI categorization. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const getConfidenceBadge = (confidence: string | null) => {
    if (!confidence) return null

    const variants = {
      high: 'success' as const,
      medium: 'warning' as const,
      low: 'error' as const
    }

    return (
      <Badge variant={variants[confidence as keyof typeof variants]} size="sm">
        {confidence.toUpperCase()} CONFIDENCE
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'warning' as const,
      approved: 'success' as const,
      rejected: 'error' as const,
      processing: 'info' as const
    }

    return (
      <Badge variant={variants[status as keyof typeof variants]} size="sm">
        {status.toUpperCase()}
      </Badge>
    )
  }

  const filteredCounts = {
    all: transactions.length,
    pending: transactions.filter(t => t.status === 'pending').length,
    high_confidence: transactions.filter(t => t.ai_confidence === 'high').length,
    medium_confidence: transactions.filter(t => t.ai_confidence === 'medium').length,
    low_confidence: transactions.filter(t => t.ai_confidence === 'low').length
  }

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Transaction Review</h1>
        <p className="text-gray-600">Review and approve AI-categorized transactions</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All', count: filteredCounts.all },
              { key: 'pending', label: 'Pending', count: filteredCounts.pending },
              { key: 'high_confidence', label: 'High Confidence', count: filteredCounts.high_confidence },
              { key: 'medium_confidence', label: 'Medium Confidence', count: filteredCounts.medium_confidence },
              { key: 'low_confidence', label: 'Low Confidence', count: filteredCounts.low_confidence }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as FilterType)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
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

      {/* Action Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <Button
            onClick={handleRunAI}
            loading={processing}
            disabled={transactions.filter(t => t.status === 'pending' && !t.ai_confidence).length === 0}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Run AI Categorization
          </Button>
          <Button
            variant="secondary"
            onClick={handleBulkApprove}
            disabled={selectedTransactions.size === 0}
            loading={processing}
          >
            Approve Selected ({selectedTransactions.size})
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedTransactions.size === transactions.length && transactions.length > 0}
            onChange={handleSelectAll}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-600">Select All</span>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-4">
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? 'Connect your QuickBooks account to start importing transactions.'
                  : `No transactions match the "${filter.replace('_', ' ')}" filter.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          transactions.map((transaction) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={(e) => handleTransactionSelect(transaction.id, e.target.checked)}
                      className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {transaction.description}
                        </h3>
                        {getConfidenceBadge(transaction.ai_confidence)}
                        {getStatusBadge(transaction.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">Amount:</span> {formatCurrency(transaction.amount)}
                        </div>
                        <div>
                          <span className="font-medium">Vendor:</span> {transaction.vendor_name || 'Unknown'}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {formatDate(transaction.transaction_date)}
                        </div>
                      </div>

                      {transaction.ai_suggested_category && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700">AI Suggested Category:</span>
                          <span className="ml-2 text-sm text-primary-600">{transaction.ai_suggested_category}</span>
                        </div>
                      )}

                      {transaction.ai_reasoning && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <span className="text-sm font-medium text-gray-700">AI Reasoning:</span>
                          <p className="text-sm text-gray-600 mt-1">{transaction.ai_reasoning}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {transaction.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleSingleAction(transaction.id, 'approve')}
                      >
                        ✓ Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleSingleAction(transaction.id, 'reject')}
                      >
                        ✗ Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// Wrap component in error boundary
export default function TransactionsPage() {
  return (
    <ComponentErrorBoundary>
      <TransactionsPageContent />
    </ComponentErrorBoundary>
  )
}