'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ReceiptUpload } from '@/components/client-portal/SimpleReceiptUpload'
import { logger } from '@/lib/logger'

interface ClientPortalData {
  client: {
    id: string
    name: string
    email: string
    accountant: {
      name: string
      email: string
      phone?: string
    }
  }
  recentReports: Array<{
    id: string
    title: string
    period: string
    generatedAt: string
    status: 'draft' | 'final' | 'sent'
    downloadUrl?: string
  }>
  pendingReceipts: Array<{
    id: string
    description: string
    amount: number
    date: string
    daysOverdue: number
  }>
  recentActivity: Array<{
    id: string
    type: 'receipt_uploaded' | 'report_generated' | 'message_received' | 'reminder_sent'
    description: string
    timestamp: string
  }>
  stats: {
    receiptsThisMonth: number
    receiptsProcessed: number
    pendingReceipts: number
    lastReportDate: string
  }
}

export default function ClientPortalPage() {
  const [portalData, setPortalData] = useState<ClientPortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'receipts' | 'reports' | 'messages'>('dashboard')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadPortalData()
  }, [])

  const loadPortalData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // In a real implementation, this would get client ID from authentication
      const clientId = 'demo-client-id'
      
      const response = await fetch(`/api/client-portal/dashboard?clientId=${clientId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load portal data')
      }
      
      const data = await response.json()
      setPortalData(data)
      
    } catch (error) {
      logger.error('Error loading portal data', error as Error)
      setError('Failed to load portal data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReceiptUpload = (receipt: any) => {
    // Refresh portal data after successful upload
    loadPortalData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your portal...</p>
        </div>
      </div>
    )
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Portal</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadPortalData} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">BooksFlowAI</h1>
              <span className="ml-3 text-sm text-gray-500">Client Portal</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{portalData.client.name}</p>
                <p className="text-xs text-gray-500">{portalData.client.email}</p>
              </div>
              
              <Button
                onClick={() => {
                  // Handle logout
                  router.push('/auth/login')
                }}
                variant="ghost"
                size="sm"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'receipts', label: 'Upload Receipts', icon: '📄' },
              { id: 'reports', label: 'Reports', icon: '📈' },
              { id: 'messages', label: 'Messages', icon: '💬' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardTab portalData={portalData} onRefresh={loadPortalData} />
        )}
        
        {activeTab === 'receipts' && (
          <ReceiptsTab 
            clientId={portalData.client.id}
            accountantId={portalData.client.accountant.email} // Using email as ID for demo
            onUploadComplete={handleReceiptUpload}
          />
        )}
        
        {activeTab === 'reports' && (
          <ReportsTab reports={portalData.recentReports} />
        )}
        
        {activeTab === 'messages' && (
          <MessagesTab 
            clientId={portalData.client.id}
            accountant={portalData.client.accountant}
          />
        )}
      </main>
    </div>
  )
}

// Dashboard Tab Component
function DashboardTab({ portalData, onRefresh }: { portalData: ClientPortalData; onRefresh: () => void }) {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Welcome back, {portalData.client.name.split(' ')[0]}!
        </h2>
        <p className="text-gray-600">
          Your accountant is {portalData.client.accountant.name}. 
          Here's what's happening with your bookkeeping.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm">📄</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">This Month</p>
              <p className="text-2xl font-semibold text-gray-900">{portalData.stats.receiptsThisMonth}</p>
              <p className="text-xs text-gray-500">receipts uploaded</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Processed</p>
              <p className="text-2xl font-semibold text-gray-900">{portalData.stats.receiptsProcessed}</p>
              <p className="text-xs text-gray-500">receipts completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 text-sm">⏳</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{portalData.stats.pendingReceipts}</p>
              <p className="text-xs text-gray-500">need attention</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-sm">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Last Report</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(portalData.stats.lastReportDate).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500">monthly summary</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Receipts Alert */}
      {portalData.pendingReceipts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Missing Receipts ({portalData.pendingReceipts.length})
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Your accountant is waiting for these receipts:</p>
                <ul className="mt-2 space-y-1">
                  {portalData.pendingReceipts.slice(0, 3).map((receipt) => (
                    <li key={receipt.id} className="flex justify-between">
                      <span>{receipt.description}</span>
                      <span className="font-medium">
                        ${receipt.amount.toFixed(2)} • {receipt.daysOverdue} days overdue
                      </span>
                    </li>
                  ))}
                  {portalData.pendingReceipts.length > 3 && (
                    <li className="text-yellow-600">...and {portalData.pendingReceipts.length - 3} more</li>
                  )}
                </ul>
              </div>
              <div className="mt-4">
                <Button
                  onClick={() => setActiveTab('receipts')}
                  variant="outline"
                  size="sm"
                  className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                >
                  Upload Missing Receipts
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {portalData.recentActivity.map((activity) => (
            <div key={activity.id} className="px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {activity.type === 'receipt_uploaded' && (
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm">📄</span>
                    </div>
                  )}
                  {activity.type === 'report_generated' && (
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">📊</span>
                    </div>
                  )}
                  {activity.type === 'message_received' && (
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-sm">💬</span>
                    </div>
                  )}
                  {activity.type === 'reminder_sent' && (
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 text-sm">⏰</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Receipts Tab Component
function ReceiptsTab({ 
  clientId, 
  accountantId, 
  onUploadComplete 
}: { 
  clientId: string
  accountantId: string
  onUploadComplete: (receipt: any) => void 
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Receipts</h2>
        <p className="text-gray-600 mb-6">
          Upload your business receipts here. Our AI will automatically extract the vendor, amount, and date, 
          then match them to your transactions.
        </p>
        
        <ReceiptUpload
          clientId={clientId}
          accountantId={accountantId}
          onUploadComplete={onUploadComplete}
          maxFiles={10}
        />
      </div>
    </div>
  )
}

// Reports Tab Component
function ReportsTab({ reports }: { reports: ClientPortalData['recentReports'] }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Your Reports</h2>
          <p className="text-gray-600 mt-1">
            View and download your monthly financial reports
          </p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {reports.map((report) => (
            <div key={report.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{report.title}</h3>
                  <p className="text-sm text-gray-500">
                    {report.period} • Generated {new Date(report.generatedAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center space-x-3">
                  <StatusBadge 
                    status={report.status === 'final' ? 'approved' : report.status === 'sent' ? 'synced' : 'pending'}
                    size="sm"
                  />
                  
                  {report.downloadUrl && (
                    <Button
                      onClick={() => window.open(report.downloadUrl, '_blank')}
                      variant="outline"
                      size="sm"
                    >
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {reports.length === 0 && (
            <div className="px-6 py-8 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No reports yet</h3>
              <p className="text-sm text-gray-500">
                Your accountant will generate your first report once you've uploaded some receipts.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Messages Tab Component
function MessagesTab({ 
  clientId, 
  accountant 
}: { 
  clientId: string
  accountant: ClientPortalData['client']['accountant']
}) {
  const [messages, setMessages] = useState<Array<{
    id: string
    from: 'client' | 'accountant'
    message: string
    timestamp: string
    read: boolean
  }>>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      // In a real implementation, this would send to the API
      const message = {
        id: Date.now().toString(),
        from: 'client' as const,
        message: newMessage,
        timestamp: new Date().toISOString(),
        read: true
      }
      
      setMessages(prev => [...prev, message])
      setNewMessage('')
      
    } catch (error) {
      logger.error('Error sending message', error as Error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
          <p className="text-gray-600 mt-1">
            Communicate directly with {accountant.name}
          </p>
        </div>
        
        {/* Messages List */}
        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No messages yet</h3>
              <p className="text-sm text-gray-500">
                Start a conversation with your accountant below.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.from === 'client' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.from === 'client'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.from === 'client' ? 'text-primary-100' : 'text-gray-500'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Message Input */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              disabled={sending}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              variant="primary"
            >
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Contact Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-gray-900">{accountant.name}</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <a href={`mailto:${accountant.email}`} className="text-primary-600 hover:text-primary-700">
              {accountant.email}
            </a>
          </div>
          
          {accountant.phone && (
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <a href={`tel:${accountant.phone}`} className="text-primary-600 hover:text-primary-700">
                {accountant.phone}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}