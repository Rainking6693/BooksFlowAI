/**
 * Client Portal - Reports Viewing Page
 * CLIENT REPORT ACCESS - MOBILE RESPONSIVE - PROFESSIONAL DISPLAY
 */

'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ReportViewer } from '@/components/reports/ReportViewer'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ComponentErrorBoundary } from '@/components/ErrorBoundary'
import { logger } from '@/lib/logger'
import { formatDate } from '@/lib/utils'

interface Report {
  id: string
  title: string
  reportType: 'monthly' | 'quarterly' | 'annual' | 'custom'
  periodStart: string
  periodEnd: string
  clientName: string
  aiSummary: string
  reportData: any
  pdfPath?: string
  sharedWithClient: boolean
  sharedAt?: string
  clientViewedAt?: string
  createdAt: string
  updatedAt: string
}

type FilterType = 'all' | 'recent' | 'monthly' | 'quarterly' | 'annual'

function ClientReportsContent() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientInfo, setClientInfo] = useState<any>(null)

  useEffect(() => {
    initializeClient()
  }, [])

  useEffect(() => {
    if (clientId) {
      loadReports()
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

      // Get client profile
      const { data: client, error } = await supabase
        .from('clients')
        .select(`
          id,
          business_name,
          business_type,
          accountants!inner(firm_name)
        `)
        .eq('user_id', user.id)
        .single()

      if (error || !client) {
        logger.error('Client profile not found', error)
        return
      }

      setClientId(client.id)
      setClientInfo(client)
      
      logger.info('Client initialized', {
        clientId: client.id,
        businessName: client.business_name
      })

    } catch (error) {
      logger.error('Error initializing client', error as Error)
    }
  }

  const loadReports = async () => {
    if (!clientId) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          title,
          report_type,
          period_start,
          period_end,
          ai_summary,
          report_data,
          pdf_path,
          shared_with_client,
          shared_at,
          client_viewed_at,
          created_at,
          updated_at
        `)
        .eq('client_id', clientId)
        .eq('shared_with_client', true)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Error loading reports', error)
        return
      }

      // Apply filters
      let filteredReports = data || []
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      switch (filter) {
        case 'recent':
          filteredReports = filteredReports.filter(r => 
            new Date(r.created_at) >= thirtyDaysAgo
          )
          break
        case 'monthly':
          filteredReports = filteredReports.filter(r => r.report_type === 'monthly')
          break
        case 'quarterly':
          filteredReports = filteredReports.filter(r => r.report_type === 'quarterly')
          break
        case 'annual':
          filteredReports = filteredReports.filter(r => r.report_type === 'annual')
          break
      }

      // Transform data to match component interface
      const transformedReports = filteredReports.map((r: any) => ({
        id: r.id,
        title: r.title,
        reportType: r.report_type,
        periodStart: r.period_start,
        periodEnd: r.period_end,
        clientName: clientInfo?.business_name || 'Your Business',
        aiSummary: r.ai_summary,
        reportData: r.report_data,
        pdfPath: r.pdf_path,
        sharedWithClient: r.shared_with_client,
        sharedAt: r.shared_at,
        clientViewedAt: r.client_viewed_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }))

      setReports(transformedReports)

      logger.info('Reports loaded successfully', {
        clientId,
        count: transformedReports.length,
        filter
      })

    } catch (error) {
      logger.error('Error loading reports', error as Error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewReport = async (report: Report) => {
    setSelectedReport(report)

    // Mark report as viewed if not already viewed
    if (!report.clientViewedAt) {
      try {
        const { error } = await supabase
          .from('reports')
          .update({
            client_viewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', report.id)

        if (!error) {
          // Update local state
          setReports(reports.map(r => 
            r.id === report.id 
              ? { ...r, clientViewedAt: new Date().toISOString() }
              : r
          ))

          logger.info('Report marked as viewed', {
            reportId: report.id,
            clientId
          })
        }
      } catch (error) {
        logger.error('Error marking report as viewed', error as Error)
      }
    }
  }

  const handleDownloadPDF = async (reportId: string) => {
    try {
      // This would typically be handled by the accountant's system
      // For now, we'll show a message
      alert('PDF download will be available soon. Please contact your accountant for a PDF copy.')
      
      logger.info('PDF download requested', {
        reportId,
        clientId
      })
    } catch (error) {
      logger.error('Error downloading PDF', error as Error)
    }
  }

  const getFilterCounts = () => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    return {
      all: reports.length,
      recent: reports.filter(r => new Date(r.createdAt) >= thirtyDaysAgo).length,
      monthly: reports.filter(r => r.reportType === 'monthly').length,
      quarterly: reports.filter(r => r.reportType === 'quarterly').length,
      annual: reports.filter(r => r.reportType === 'annual').length
    }
  }

  const getReportTypeBadge = (type: string) => {
    const variants = {
      monthly: 'info',
      quarterly: 'warning',
      annual: 'success',
      custom: 'secondary'
    } as const

    return (
      <Badge variant={variants[type as keyof typeof variants] || 'secondary'} size="sm">
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

  const filterCounts = getFilterCounts()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your reports...</p>
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Financial Reports</h1>
              <p className="text-gray-600">
                {clientInfo?.business_name && `${clientInfo.business_name} • `}
                Prepared by {clientInfo?.accountants?.firm_name || 'Your Accountant'}
              </p>
            </div>
          </div>
        </div>

        {/* Welcome Card */}
        {reports.length > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-primary-900 mb-2">
                    Welcome to Your Financial Dashboard
                  </h2>
                  <p className="text-primary-700 mb-4">
                    Your accountant has prepared {reports.length} report{reports.length !== 1 ? 's' : ''} 
                    to help you understand your business performance and make informed decisions.
                  </p>
                  <div className="flex items-center gap-4 text-sm text-primary-600">
                    <span>📊 AI-Powered Insights</span>
                    <span>📈 Business Recommendations</span>
                    <span>📋 Action Items</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {[
                { key: 'all', label: 'All Reports', count: filterCounts.all },
                { key: 'recent', label: 'Recent (30 days)', count: filterCounts.recent },
                { key: 'monthly', label: 'Monthly', count: filterCounts.monthly },
                { key: 'quarterly', label: 'Quarterly', count: filterCounts.quarterly },
                { key: 'annual', label: 'Annual', count: filterCounts.annual }
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

        {/* Reports Grid */}
        {reports.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports available</h3>
              <p className="text-gray-600 mb-4">
                {filter === 'all' 
                  ? 'Your accountant hasn\'t shared any reports with you yet.'
                  : `No reports match the "${filter}" filter.`
                }
              </p>
              <p className="text-sm text-gray-500">
                Reports will appear here once your accountant generates and shares them with you.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reports.map((report) => (
              <Card key={report.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{report.title}</CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        {getReportTypeBadge(report.reportType)}
                        {!report.clientViewedAt && (
                          <Badge variant="info" size="sm">New</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>Period: {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}</div>
                        <div>Shared: {formatDate(report.sharedAt!)}</div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                    {report.aiSummary}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {report.clientViewedAt ? `Viewed ${formatDate(report.clientViewedAt)}` : 'Not viewed yet'}
                    </div>
                    <div className="flex gap-2">
                      {report.pdfPath && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadPDF(report.id)
                          }}
                        >
                          Download PDF
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleViewReport(report)}
                      >
                        View Report
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Report Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-medium">Financial Report</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedReport(null)}
                >
                  ✕
                </Button>
              </div>
              <div className="p-6">
                <ReportViewer
                  report={selectedReport}
                  compact={false}
                  showActions={false}
                  viewMode="client"
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
export default function ClientReportsPage() {
  return (
    <ComponentErrorBoundary>
      <ClientReportsContent />
    </ComponentErrorBoundary>
  )
}