/**
 * Professional Report Viewer Component
 * INTERACTIVE REPORTS - PDF EXPORT - CLIENT SHARING
 */

'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils'
import { logger } from '@/lib/logger'

interface BusinessMetrics {
  profitMargin: number
  expenseRatio: number
  growthRate: number
  efficiency: string
}

interface ReportData {
  executiveSummary: string
  financialOverview: string
  keyInsights: string[]
  recommendations: string[]
  businessMetrics: BusinessMetrics
  actionItems: string[]
  generationTime: number
  generatedAt: string
}

interface Report {
  id: string
  title: string
  reportType: 'monthly' | 'quarterly' | 'annual' | 'custom'
  periodStart: string
  periodEnd: string
  clientName: string
  aiSummary: string
  reportData: ReportData
  pdfPath?: string
  sharedWithClient: boolean
  sharedAt?: string
  clientViewedAt?: string
  createdAt: string
  updatedAt: string
}

interface ReportViewerProps {
  report: Report
  onShare?: (reportId: string, share: boolean) => void
  onExportPDF?: (reportId: string) => void
  onEdit?: (reportId: string) => void
  showActions?: boolean
  compact?: boolean
  viewMode?: 'accountant' | 'client'
}

export function ReportViewer({
  report,
  onShare,
  onExportPDF,
  onEdit,
  showActions = true,
  compact = false,
  viewMode = 'accountant'
}: ReportViewerProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const handleShare = async () => {
    if (!onShare) return
    
    try {
      setIsSharing(true)
      await onShare(report.id, !report.sharedWithClient)
      
      logger.info('Report sharing toggled', {
        reportId: report.id,
        shared: !report.sharedWithClient,
        operation: 'report_sharing'
      })
    } catch (error) {
      logger.error('Error sharing report', error as Error, {
        reportId: report.id
      })
      alert('Failed to update sharing status. Please try again.')
    } finally {
      setIsSharing(false)
    }
  }

  const handleExportPDF = async () => {
    if (!onExportPDF) return
    
    try {
      setIsExporting(true)
      await onExportPDF(report.id)
      
      logger.info('Report PDF export initiated', {
        reportId: report.id,
        operation: 'pdf_export'
      })
    } catch (error) {
      logger.error('Error exporting PDF', error as Error, {
        reportId: report.id
      })
      alert('Failed to export PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML
      const printWindow = window.open('', '_blank')
      
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${report.title}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .metric-card { border: 1px solid #e5e7eb; padding: 16px; margin: 8px 0; border-radius: 8px; }
                .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; }
                .metric-label { font-size: 14px; color: #6b7280; }
                .section { margin: 24px 0; }
                .section-title { font-size: 18px; font-weight: bold; margin-bottom: 12px; }
                .insight-item { margin: 8px 0; padding-left: 16px; }
                .recommendation-item { margin: 8px 0; padding: 12px; background: #f9fafb; border-radius: 6px; }
                @media print { .no-print { display: none; } }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const getReportTypeBadge = () => {
    const variants = {
      monthly: 'info',
      quarterly: 'warning',
      annual: 'success',
      custom: 'secondary'
    } as const

    return (
      <Badge variant={variants[report.reportType]} size="sm">
        {report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)}
      </Badge>
    )
  }

  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency.toLowerCase()) {
      case 'excellent': return 'text-success-600'
      case 'good': return 'text-info-600'
      case 'fair': return 'text-warning-600'
      default: return 'text-error-600'
    }
  }

  const formatPeriod = () => {
    const start = new Date(report.periodStart)
    const end = new Date(report.periodEnd)
    
    if (report.reportType === 'monthly') {
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } else if (report.reportType === 'annual') {
      return start.getFullYear().toString()
    } else {
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
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
                  {report.title}
                </h3>
                {getReportTypeBadge()}
                {report.sharedWithClient && (
                  <Badge variant="success" size="sm">Shared</Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                <div>
                  <span className="font-medium">Period:</span> {formatPeriod()}
                </div>
                <div>
                  <span className="font-medium">Client:</span> {report.clientName}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {formatDate(report.createdAt)}
                </div>
                <div>
                  <span className="font-medium">Efficiency:</span> 
                  <span className={`ml-1 ${getEfficiencyColor(report.reportData.businessMetrics.efficiency)}`}>
                    {report.reportData.businessMetrics.efficiency}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-700 line-clamp-2">
                {report.aiSummary}
              </p>
            </div>

            {showActions && (
              <div className="flex items-center gap-1 ml-2">
                <Button size="sm" variant="outline" onClick={() => onEdit?.(report.id)}>
                  View
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl mb-2">{report.title}</CardTitle>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span>Period: {formatPeriod()}</span>
                <span>•</span>
                <span>Client: {report.clientName}</span>
                <span>•</span>
                <span>Generated: {formatDate(report.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {getReportTypeBadge()}
                {report.sharedWithClient && (
                  <Badge variant="success" size="sm">
                    Shared {report.sharedAt && `on ${formatDate(report.sharedAt)}`}
                  </Badge>
                )}
                {report.clientViewedAt && (
                  <Badge variant="info" size="sm">
                    Viewed by client on {formatDate(report.clientViewedAt)}
                  </Badge>
                )}
              </div>
            </div>

            {showActions && viewMode === 'accountant' && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                >
                  Print
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportPDF}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : 'Export PDF'}
                </Button>
                <Button
                  size="sm"
                  variant={report.sharedWithClient ? "secondary" : "primary"}
                  onClick={handleShare}
                  disabled={isSharing}
                >
                  {isSharing ? 'Updating...' : report.sharedWithClient ? 'Unshare' : 'Share with Client'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Report Content */}
      <div ref={printRef} className="space-y-6">
        {/* Business Metrics Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Business Metrics Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="metric-card bg-gray-50 p-4 rounded-lg">
                <div className="metric-value text-2xl font-bold text-gray-900">
                  {formatPercentage(report.reportData.businessMetrics.profitMargin)}
                </div>
                <div className="metric-label text-sm text-gray-600">Profit Margin</div>
              </div>
              
              <div className="metric-card bg-gray-50 p-4 rounded-lg">
                <div className="metric-value text-2xl font-bold text-gray-900">
                  {formatPercentage(report.reportData.businessMetrics.expenseRatio)}
                </div>
                <div className="metric-label text-sm text-gray-600">Expense Ratio</div>
              </div>
              
              <div className="metric-card bg-gray-50 p-4 rounded-lg">
                <div className="metric-value text-2xl font-bold text-gray-900">
                  {formatPercentage(report.reportData.businessMetrics.growthRate)}
                </div>
                <div className="metric-label text-sm text-gray-600">Growth Rate</div>
              </div>
              
              <div className="metric-card bg-gray-50 p-4 rounded-lg">
                <div className={`metric-value text-2xl font-bold ${getEfficiencyColor(report.reportData.businessMetrics.efficiency)}`}>
                  {report.reportData.businessMetrics.efficiency}
                </div>
                <div className="metric-label text-sm text-gray-600">Efficiency Rating</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Executive Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">
              {report.reportData.executiveSummary}
            </p>
          </CardContent>
        </Card>

        {/* Financial Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {report.reportData.financialOverview}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Key Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.reportData.keyInsights.map((insight, index) => (
                <div key={index} className="insight-item flex items-start">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Business Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.reportData.recommendations.map((recommendation, index) => (
                <div key={index} className="recommendation-item bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-700">{recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Items */}
        {report.reportData.actionItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Action Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.reportData.actionItems.map((item, index) => (
                  <div key={index} className="flex items-start">
                    <div className="w-4 h-4 border-2 border-gray-300 rounded mr-3 mt-1 flex-shrink-0"></div>
                    <p className="text-gray-700">{item}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plain English Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Plain English Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {report.aiSummary}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Report Metadata */}
        {viewMode === 'accountant' && (
          <Card>
            <CardHeader>
              <CardTitle>Report Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Generated:</span>
                  <span className="ml-2 text-gray-900">{formatDate(report.createdAt)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Generation Time:</span>
                  <span className="ml-2 text-gray-900">{report.reportData.generationTime}ms</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Shared with Client:</span>
                  <span className="ml-2 text-gray-900">
                    {report.sharedWithClient ? `Yes (${formatDate(report.sharedAt!)})` : 'No'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Client Viewed:</span>
                  <span className="ml-2 text-gray-900">
                    {report.clientViewedAt ? formatDate(report.clientViewedAt) : 'Not yet'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}