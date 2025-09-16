/**
 * Accountant Dashboard - Reports Management
 * REPORT GENERATION - CLIENT SHARING - ANALYTICS
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

interface Client {
  id: string
  business_name: string
  business_type: string
}

type ViewMode = 'list' | 'generate'
type FilterType = 'all' | 'shared' | 'unshared' | 'viewed'

function ReportsManagementContent() {
  const [reports, setReports] = useState<Report[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [accountantId, setAccountantId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [statistics, setStatistics] = useState<any>(null)

  // Report generation form state
  const [generateForm, setGenerateForm] = useState({
    clientId: '',
    reportType: 'monthly' as const,
    periodStart: '',
    periodEnd: '',
    title: '',
    includeInsights: true,
    includeRecommendations: true
  })

  useEffect(() => {
    initializeAccountant()
  }, [])

  useEffect(() => {
    if (accountantId) {
      loadReports()
      loadClients()
    }
  }, [accountantId, filter])

  const initializeAccountant = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        logger.error('No authenticated user found')
        return
      }

      // Get accountant profile
      const { data: accountant, error } = await supabase
        .from('accountants')
        .select('id, firm_name')
        .eq('user_id', user.id)
        .single()

      if (error || !accountant) {
        logger.error('Accountant profile not found', error)
        return
      }

      setAccountantId(accountant.id)
      logger.info('Accountant initialized', {
        accountantId: accountant.id,
        firmName: accountant.firm_name
      })

    } catch (error) {
      logger.error('Error initializing accountant', error as Error)
    }
  }

  const loadReports = async () => {
    if (!accountantId) return

    try {
      setLoading(true)

      const response = await fetch(`/api/reports/generate?accountantId=${accountantId}`)
      if (!response.ok) {
        throw new Error('Failed to load reports')
      }

      const data = await response.json()
      
      // Apply filters
      let filteredReports = data.reports || []
      switch (filter) {
        case 'shared':
          filteredReports = filteredReports.filter((r: any) => r.shared_with_client)
          break
        case 'unshared':
          filteredReports = filteredReports.filter((r: any) => !r.shared_with_client)
          break
        case 'viewed':
          filteredReports = filteredReports.filter((r: any) => r.client_viewed_at)
          break
      }

      // Transform data to match component interface
      const transformedReports = filteredReports.map((r: any) => ({
        id: r.id,
        title: r.title,
        reportType: r.report_type,
        periodStart: r.period_start,
        periodEnd: r.period_end,
        clientName: r.clients.business_name,
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
      setStatistics(data.statistics)

      logger.info('Reports loaded successfully', {
        accountantId,
        count: transformedReports.length,
        filter
      })

    } catch (error) {
      logger.error('Error loading reports', error as Error)
    } finally {
      setLoading(false)
    }
  }

  const loadClients = async () => {
    if (!accountantId) return

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, business_name, business_type')
        .eq('accountant_id', accountantId)
        .order('business_name')

      if (error) {
        logger.error('Error loading clients', error)
        return
      }

      setClients(data || [])

    } catch (error) {
      logger.error('Error in loadClients', error as Error)
    }
  }

  const handleGenerateReport = async () => {
    if (!accountantId || !generateForm.clientId) return

    try {
      setGenerating(true)

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountantId,
          ...generateForm
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate report')
      }

      const data = await response.json()

      logger.info('Report generated successfully', {
        reportId: data.report.id,
        clientId: generateForm.clientId,
        reportType: generateForm.reportType
      })

      // Reset form and reload reports
      setGenerateForm({
        clientId: '',
        reportType: 'monthly',
        periodStart: '',
        periodEnd: '',
        title: '',
        includeInsights: true,
        includeRecommendations: true
      })
      
      setViewMode('list')
      await loadReports()

      alert('Report generated successfully!')

    } catch (error) {
      logger.error('Error generating report', error as Error)
      alert(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleShareReport = async (reportId: string, share: boolean) => {
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reportId,
          accountantId,
          shareWithClient: share
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update sharing status')
      }

      // Update local state
      setReports(reports.map(r => 
        r.id === reportId 
          ? { ...r, sharedWithClient: share, sharedAt: share ? new Date().toISOString() : undefined }
          : r
      ))

      if (selectedReport?.id === reportId) {
        setSelectedReport({
          ...selectedReport,
          sharedWithClient: share,
          sharedAt: share ? new Date().toISOString() : undefined
        })
      }

    } catch (error) {
      logger.error('Error updating report sharing', error as Error)
      throw error
    }
  }

  const handleExportPDF = async (reportId: string) => {
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reportId,
          accountantId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to export PDF')
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${reportId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (error) {
      logger.error('Error exporting PDF', error as Error)
      throw error
    }
  }

  const getFilterCounts = () => {
    return {
      all: reports.length,
      shared: reports.filter(r => r.sharedWithClient).length,
      unshared: reports.filter(r => !r.sharedWithClient).length,
      viewed: reports.filter(r => r.clientViewedAt).length
    }
  }

  const filterCounts = getFilterCounts()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports Management</h1>
              <p className="text-gray-600">Generate and manage AI-powered client reports</p>
            </div>
            <div className="mt-4 sm:mt-0 flex gap-2">
              <Button
                variant={viewMode === 'list' ? 'primary' : 'outline'}
                onClick={() => setViewMode('list')}
              >
                View Reports
              </Button>
              <Button
                variant={viewMode === 'generate' ? 'primary' : 'outline'}
                onClick={() => setViewMode('generate')}
              >
                Generate Report
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && viewMode === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-900">{statistics.totalReports}</div>
                <div className="text-sm text-gray-600">Total Reports</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-success-600">{statistics.sharedReports}</div>
                <div className="text-sm text-gray-600">Shared with Clients</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-info-600">{statistics.viewedReports}</div>
                <div className="text-sm text-gray-600">Viewed by Clients</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary-600">
                  {Object.keys(statistics.reportTypes).length}
                </div>
                <div className="text-sm text-gray-600">Report Types</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Generate Report Form */}
        {viewMode === 'generate' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Generate New Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client
                  </label>
                  <select
                    value={generateForm.clientId}
                    onChange={(e) => setGenerateForm({ ...generateForm, clientId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Select a client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.business_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Type
                  </label>
                  <select
                    value={generateForm.reportType}
                    onChange={(e) => setGenerateForm({ ...generateForm, reportType: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="custom">Custom Period</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period Start
                  </label>
                  <input
                    type="date"
                    value={generateForm.periodStart}
                    onChange={(e) => setGenerateForm({ ...generateForm, periodStart: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period End
                  </label>
                  <input
                    type="date"
                    value={generateForm.periodEnd}
                    onChange={(e) => setGenerateForm({ ...generateForm, periodEnd: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Title (Optional)
                </label>
                <input
                  type="text"
                  value={generateForm.title}
                  onChange={(e) => setGenerateForm({ ...generateForm, title: e.target.value })}
                  placeholder="Leave blank for auto-generated title"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={generateForm.includeInsights}
                    onChange={(e) => setGenerateForm({ ...generateForm, includeInsights: e.target.checked })}
                    className="mr-2"
                  />
                  Include Business Insights
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={generateForm.includeRecommendations}
                    onChange={(e) => setGenerateForm({ ...generateForm, includeRecommendations: e.target.checked })}
                    className="mr-2"
                  />
                  Include Recommendations
                </label>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleGenerateReport}
                  disabled={generating || !generateForm.clientId || !generateForm.periodStart || !generateForm.periodEnd}
                >
                  {generating ? 'Generating Report...' : 'Generate Report'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports List */}
        {viewMode === 'list' && (
          <>
            {/* Filter Tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                  {[
                    { key: 'all', label: 'All Reports', count: filterCounts.all },
                    { key: 'shared', label: 'Shared', count: filterCounts.shared },
                    { key: 'unshared', label: 'Not Shared', count: filterCounts.unshared },
                    { key: 'viewed', label: 'Viewed', count: filterCounts.viewed }
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                  <p className="text-gray-600 mb-4">
                    {filter === 'all' 
                      ? 'Generate your first AI-powered report to get started.'
                      : `No reports match the "${filter}" filter.`
                    }
                  </p>
                  {filter === 'all' && (
                    <Button
                      variant="primary"
                      onClick={() => setViewMode('generate')}
                    >
                      Generate Your First Report
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} onClick={() => setSelectedReport(report)}>
                    <ReportViewer
                      report={report}
                      compact={true}
                      onShare={handleShareReport}
                      onExportPDF={handleExportPDF}
                      onEdit={(id) => setSelectedReport(reports.find(r => r.id === id) || null)}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Report Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-medium">Report Details</h2>
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
                  onShare={handleShareReport}
                  onExportPDF={handleExportPDF}
                  viewMode="accountant"
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
export default function ReportsManagementPage() {
  return (
    <ComponentErrorBoundary>
      <ReportsManagementContent />
    </ComponentErrorBoundary>
  )
}