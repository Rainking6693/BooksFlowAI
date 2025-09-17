/**
 * Professional PDF Report Generator
 * BUSINESS REPORT FORMATTING - CHARTS - PROFESSIONAL LAYOUT
 */

import { logger, withTiming, performanceMonitor } from '../logger'
import { ExternalServiceError, ValidationError } from '../errors'
import { formatCurrency, formatDate, formatPercent } from '../utils'

// PDF generation configuration
const PDF_CONFIG = {
  FORMAT: 'A4',
  MARGIN: {
    top: 60,
    right: 40,
    bottom: 60,
    left: 40
  },
  FONTS: {
    primary: 'Helvetica',
    heading: 'Helvetica-Bold',
    mono: 'Courier'
  },
  COLORS: {
    primary: '#1f2937',
    secondary: '#6b7280',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  }
}

interface PDFReportData {
  id: string
  title: string
  clientName: string
  reportType: string
  periodStart: string
  periodEnd: string
  executiveSummary: string
  financialOverview: string
  keyInsights: string[]
  recommendations: string[]
  businessMetrics: {
    profitMargin: number
    expenseRatio: number
    growthRate: number
    efficiency: string
  }
  actionItems: string[]
  plainEnglishSummary: string
  generatedAt: string
}

/**
 * Generate professional PDF report
 */
export async function generatePDFReport(reportData: PDFReportData): Promise<Buffer> {
  const context = {
    reportId: reportData.id,
    clientName: reportData.clientName,
    reportType: reportData.reportType,
    operation: 'pdf_generation'
  }

  return withTiming(
    async () => {
      logger.info('Starting PDF report generation', context)

      // Dynamic import of PDFKit to avoid SSR issues
      const PDFDocument = (await import('pdfkit')).default
      
      // Create PDF document
      const doc = new PDFDocument({
        size: PDF_CONFIG.FORMAT,
        margins: PDF_CONFIG.MARGIN,
        info: {
          Title: reportData.title,
          Author: 'Solo Accountant AI',
          Subject: `Financial Report for ${reportData.clientName}`,
          Keywords: 'financial report, business analysis, accounting',
          CreationDate: new Date(),
          ModDate: new Date()
        }
      })

      // Buffer to collect PDF data
      const chunks: Buffer[] = []
      doc.on('data', chunk => chunks.push(chunk))
      
      // Generate PDF content
      await generatePDFContent(doc, reportData)
      
      // Finalize PDF
      doc.end()
      
      // Wait for PDF generation to complete
      await new Promise<void>((resolve) => {
        doc.on('end', resolve)
      })
      
      const pdfBuffer = Buffer.concat(chunks)
      
      logger.info('PDF report generated successfully', {
        ...context,
        pdfSize: pdfBuffer.length,
        pages: doc.bufferedPageRange().count
      })

      // Record performance metrics
      performanceMonitor.recordMetric('pdf_generation_size', pdfBuffer.length)
      performanceMonitor.recordMetric('pdf_generation_pages', doc.bufferedPageRange().count)
      
      return pdfBuffer
    },
    'pdf_generation',
    context
  )
}

/**
 * Generate PDF content with professional formatting
 */
async function generatePDFContent(doc: any, data: PDFReportData): Promise<void> {
  let yPosition = PDF_CONFIG.MARGIN.top

  // Header with logo and company info
  yPosition = addHeader(doc, data, yPosition)
  
  // Title page
  yPosition = addTitlePage(doc, data, yPosition)
  
  // Executive summary
  yPosition = addExecutiveSummary(doc, data, yPosition)
  
  // Business metrics overview
  yPosition = addBusinessMetrics(doc, data, yPosition)
  
  // Financial overview
  yPosition = addFinancialOverview(doc, data, yPosition)
  
  // Key insights
  yPosition = addKeyInsights(doc, data, yPosition)
  
  // Recommendations
  yPosition = addRecommendations(doc, data, yPosition)
  
  // Action items
  yPosition = addActionItems(doc, data, yPosition)
  
  // Plain English summary
  yPosition = addPlainEnglishSummary(doc, data, yPosition)
  
  // Footer
  addFooter(doc, data)
}

/**
 * Add professional header to PDF
 */
function addHeader(doc: any, data: PDFReportData, yPos: number): number {
  const pageWidth = doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right
  
  // Company logo area (placeholder)
  doc.rect(PDF_CONFIG.MARGIN.left, yPos, 60, 40)
    .stroke(PDF_CONFIG.COLORS.secondary)
  
  doc.fontSize(8)
    .fillColor(PDF_CONFIG.COLORS.secondary)
    .text('LOGO', PDF_CONFIG.MARGIN.left + 20, yPos + 15)
  
  // Company info
  doc.fontSize(12)
    .fillColor(PDF_CONFIG.COLORS.primary)
    .font(PDF_CONFIG.FONTS.heading)
    .text('Solo Accountant AI', PDF_CONFIG.MARGIN.left + 80, yPos)
  
  doc.fontSize(10)
    .fillColor(PDF_CONFIG.COLORS.secondary)
    .font(PDF_CONFIG.FONTS.primary)
    .text('Professional Financial Reporting', PDF_CONFIG.MARGIN.left + 80, yPos + 15)
    .text('Generated on ' + formatDate(data.generatedAt), PDF_CONFIG.MARGIN.left + 80, yPos + 28)
  
  // Horizontal line
  doc.moveTo(PDF_CONFIG.MARGIN.left, yPos + 50)
    .lineTo(PDF_CONFIG.MARGIN.left + pageWidth, yPos + 50)
    .stroke(PDF_CONFIG.COLORS.secondary)
  
  return yPos + 70
}

/**
 * Add title page section
 */
function addTitlePage(doc: any, data: PDFReportData, yPos: number): number {
  const pageWidth = doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right
  
  // Report title
  doc.fontSize(24)
    .fillColor(PDF_CONFIG.COLORS.primary)
    .font(PDF_CONFIG.FONTS.heading)
    .text(data.title, PDF_CONFIG.MARGIN.left, yPos, {
      width: pageWidth,
      align: 'center'
    })
  
  yPos += 40
  
  // Client and period info
  doc.fontSize(14)
    .fillColor(PDF_CONFIG.COLORS.secondary)
    .font(PDF_CONFIG.FONTS.primary)
    .text(`Client: ${data.clientName}`, PDF_CONFIG.MARGIN.left, yPos, {
      width: pageWidth,
      align: 'center'
    })
  
  yPos += 20
  
  const periodText = formatPeriodText(data.reportType, data.periodStart, data.periodEnd)
  doc.text(`Period: ${periodText}`, PDF_CONFIG.MARGIN.left, yPos, {
    width: pageWidth,
    align: 'center'
  })
  
  yPos += 20
  
  doc.text(`Report Type: ${data.reportType.charAt(0).toUpperCase() + data.reportType.slice(1)}`, PDF_CONFIG.MARGIN.left, yPos, {
    width: pageWidth,
    align: 'center'
  })
  
  return yPos + 60
}

/**
 * Add executive summary section
 */
function addExecutiveSummary(doc: any, data: PDFReportData, yPos: number): number {
  yPos = checkPageBreak(doc, yPos, 100)
  
  // Section title
  yPos = addSectionTitle(doc, 'Executive Summary', yPos)
  
  // Summary content
  doc.fontSize(11)
    .fillColor(PDF_CONFIG.COLORS.primary)
    .font(PDF_CONFIG.FONTS.primary)
    .text(data.executiveSummary, PDF_CONFIG.MARGIN.left, yPos, {
      width: doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right,
      align: 'justify',
      lineGap: 4
    })
  
  return yPos + doc.heightOfString(data.executiveSummary, {
    width: doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right
  }) + 30
}

/**
 * Add business metrics overview
 */
function addBusinessMetrics(doc: any, data: PDFReportData, yPos: number): number {
  yPos = checkPageBreak(doc, yPos, 150)
  
  // Section title
  yPos = addSectionTitle(doc, 'Business Metrics Overview', yPos)
  
  const metrics = [
    { label: 'Profit Margin', value: formatPercent(data.businessMetrics.profitMargin), color: getMetricColor(data.businessMetrics.profitMargin, 'percentage') },
    { label: 'Expense Ratio', value: formatPercent(data.businessMetrics.expenseRatio), color: getMetricColor(data.businessMetrics.expenseRatio, 'expense') },
    { label: 'Growth Rate', value: formatPercent(data.businessMetrics.growthRate), color: getMetricColor(data.businessMetrics.growthRate, 'growth') },
    { label: 'Efficiency Rating', value: data.businessMetrics.efficiency, color: getEfficiencyColor(data.businessMetrics.efficiency) }
  ]
  
  const boxWidth = (doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right - 30) / 2
  const boxHeight = 60
  
  metrics.forEach((metric, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const x = PDF_CONFIG.MARGIN.left + col * (boxWidth + 15)
    const y = yPos + row * (boxHeight + 15)
    
    // Metric box
    doc.rect(x, y, boxWidth, boxHeight)
      .fillAndStroke('#f9fafb', '#e5e7eb')
    
    // Metric value
    doc.fontSize(18)
      .fillColor(metric.color)
      .font(PDF_CONFIG.FONTS.heading)
      .text(metric.value, x + 10, y + 10, {
        width: boxWidth - 20,
        align: 'center'
      })
    
    // Metric label
    doc.fontSize(10)
      .fillColor(PDF_CONFIG.COLORS.secondary)
      .font(PDF_CONFIG.FONTS.primary)
      .text(metric.label, x + 10, y + 35, {
        width: boxWidth - 20,
        align: 'center'
      })
  })
  
  return yPos + Math.ceil(metrics.length / 2) * (boxHeight + 15) + 20
}

/**
 * Add financial overview section
 */
function addFinancialOverview(doc: any, data: PDFReportData, yPos: number): number {
  yPos = checkPageBreak(doc, yPos, 100)
  
  // Section title
  yPos = addSectionTitle(doc, 'Financial Overview', yPos)
  
  // Overview content
  doc.fontSize(11)
    .fillColor(PDF_CONFIG.COLORS.primary)
    .font(PDF_CONFIG.FONTS.primary)
    .text(data.financialOverview, PDF_CONFIG.MARGIN.left, yPos, {
      width: doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right,
      align: 'justify',
      lineGap: 4
    })
  
  return yPos + doc.heightOfString(data.financialOverview, {
    width: doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right
  }) + 30
}

/**
 * Add key insights section
 */
function addKeyInsights(doc: any, data: PDFReportData, yPos: number): number {
  yPos = checkPageBreak(doc, yPos, 100)
  
  // Section title
  yPos = addSectionTitle(doc, 'Key Insights', yPos)
  
  // Insights list
  data.keyInsights.forEach((insight, index) => {
    yPos = checkPageBreak(doc, yPos, 30)
    
    // Bullet point
    doc.circle(PDF_CONFIG.MARGIN.left + 5, yPos + 6, 2)
      .fill(PDF_CONFIG.COLORS.accent)
    
    // Insight text
    doc.fontSize(11)
      .fillColor(PDF_CONFIG.COLORS.primary)
      .font(PDF_CONFIG.FONTS.primary)
      .text(insight, PDF_CONFIG.MARGIN.left + 15, yPos, {
        width: doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right - 15,
        lineGap: 3
      })
    
    yPos += doc.heightOfString(insight, {
      width: doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right - 15
    }) + 10
  })
  
  return yPos + 20
}

/**
 * Add recommendations section
 */
function addRecommendations(doc: any, data: PDFReportData, yPos: number): number {
  yPos = checkPageBreak(doc, yPos, 100)
  
  // Section title
  yPos = addSectionTitle(doc, 'Business Recommendations', yPos)
  
  // Recommendations list
  data.recommendations.forEach((recommendation, index) => {
    yPos = checkPageBreak(doc, yPos, 50)
    
    // Recommendation box
    const boxHeight = doc.heightOfString(recommendation, {
      width: doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right - 40
    }) + 20
    
    doc.rect(PDF_CONFIG.MARGIN.left, yPos, doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right, boxHeight)
      .fillAndStroke('#eff6ff', '#bfdbfe')
    
    // Recommendation number
    doc.circle(PDF_CONFIG.MARGIN.left + 15, yPos + 15, 8)
      .fill(PDF_CONFIG.COLORS.accent)
    
    doc.fontSize(10)
      .fillColor('white')
      .font(PDF_CONFIG.FONTS.heading)
      .text((index + 1).toString(), PDF_CONFIG.MARGIN.left + 12, yPos + 11)
    
    // Recommendation text
    doc.fontSize(11)
      .fillColor(PDF_CONFIG.COLORS.primary)
      .font(PDF_CONFIG.FONTS.primary)
      .text(recommendation, PDF_CONFIG.MARGIN.left + 30, yPos + 10, {
        width: doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right - 40,
        lineGap: 3
      })
    
    yPos += boxHeight + 10
  })
  
  return yPos + 20
}

/**
 * Add action items section
 */
function addActionItems(doc: any, data: PDFReportData, yPos: number): number {
  if (data.actionItems.length === 0) return yPos
  
  yPos = checkPageBreak(doc, yPos, 100)
  
  // Section title
  yPos = addSectionTitle(doc, 'Action Items', yPos)
  
  // Action items list
  data.actionItems.forEach((item, index) => {
    yPos = checkPageBreak(doc, yPos, 30)
    
    // Checkbox
    doc.rect(PDF_CONFIG.MARGIN.left, yPos + 2, 10, 10)
      .stroke(PDF_CONFIG.COLORS.secondary)
    
    // Action item text
    doc.fontSize(11)
      .fillColor(PDF_CONFIG.COLORS.primary)
      .font(PDF_CONFIG.FONTS.primary)
      .text(item, PDF_CONFIG.MARGIN.left + 20, yPos, {
        width: doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right - 20,
        lineGap: 3
      })
    
    yPos += doc.heightOfString(item, {
      width: doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right - 20
    }) + 15
  })
  
  return yPos + 20
}

/**
 * Add plain English summary section
 */
function addPlainEnglishSummary(doc: any, data: PDFReportData, yPos: number): number {
  yPos = checkPageBreak(doc, yPos, 100)
  
  // Section title
  yPos = addSectionTitle(doc, 'Plain English Summary', yPos)
  
  // Summary box
  const summaryHeight = doc.heightOfString(data.plainEnglishSummary, {
    width: doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right - 20
  }) + 20
  
  doc.rect(PDF_CONFIG.MARGIN.left, yPos, doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right, summaryHeight)
    .fillAndStroke('#f9fafb', '#e5e7eb')
  
  // Summary content
  doc.fontSize(11)
    .fillColor(PDF_CONFIG.COLORS.primary)
    .font(PDF_CONFIG.FONTS.primary)
    .text(data.plainEnglishSummary, PDF_CONFIG.MARGIN.left + 10, yPos + 10, {
      width: doc.page.width - PDF_CONFIG.MARGIN.left - PDF_CONFIG.MARGIN.right - 20,
      align: 'justify',
      lineGap: 4
    })
  
  return yPos + summaryHeight + 30
}

/**
 * Add footer to all pages
 */
function addFooter(doc: any, data: PDFReportData): void {
  const pageCount = doc.bufferedPageRange().count
  
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i)
    
    const footerY = doc.page.height - PDF_CONFIG.MARGIN.bottom + 20
    
    // Footer line
    doc.moveTo(PDF_CONFIG.MARGIN.left, footerY)
      .lineTo(doc.page.width - PDF_CONFIG.MARGIN.right, footerY)
      .stroke(PDF_CONFIG.COLORS.secondary)
    
    // Footer text
    doc.fontSize(8)
      .fillColor(PDF_CONFIG.COLORS.secondary)
      .font(PDF_CONFIG.FONTS.primary)
      .text(`Generated by Solo Accountant AI • ${formatDate(data.generatedAt)}`, 
        PDF_CONFIG.MARGIN.left, footerY + 10)
      .text(`Page ${i + 1} of ${pageCount}`, 
        doc.page.width - PDF_CONFIG.MARGIN.right - 50, footerY + 10)
  }
}

/**
 * Helper functions
 */
function addSectionTitle(doc: any, title: string, yPos: number): number {
  doc.fontSize(16)
    .fillColor(PDF_CONFIG.COLORS.primary)
    .font(PDF_CONFIG.FONTS.heading)
    .text(title, PDF_CONFIG.MARGIN.left, yPos)
  
  // Underline
  const titleWidth = doc.widthOfString(title)
  doc.moveTo(PDF_CONFIG.MARGIN.left, yPos + 20)
    .lineTo(PDF_CONFIG.MARGIN.left + titleWidth, yPos + 20)
    .stroke(PDF_CONFIG.COLORS.accent)
  
  return yPos + 35
}

function checkPageBreak(doc: any, yPos: number, requiredSpace: number): number {
  if (yPos + requiredSpace > doc.page.height - PDF_CONFIG.MARGIN.bottom) {
    doc.addPage()
    return PDF_CONFIG.MARGIN.top
  }
  return yPos
}

function getMetricColor(value: number, type: 'percentage' | 'expense' | 'growth'): string {
  switch (type) {
    case 'percentage':
    case 'growth':
      if (value > 10) return PDF_CONFIG.COLORS.success
      if (value > 0) return PDF_CONFIG.COLORS.warning
      return PDF_CONFIG.COLORS.error
    case 'expense':
      if (value < 70) return PDF_CONFIG.COLORS.success
      if (value < 90) return PDF_CONFIG.COLORS.warning
      return PDF_CONFIG.COLORS.error
    default:
      return PDF_CONFIG.COLORS.primary
  }
}

function getEfficiencyColor(efficiency: string): string {
  switch (efficiency.toLowerCase()) {
    case 'excellent': return PDF_CONFIG.COLORS.success
    case 'good': return PDF_CONFIG.COLORS.accent
    case 'fair': return PDF_CONFIG.COLORS.warning
    default: return PDF_CONFIG.COLORS.error
  }
}

function formatPeriodText(reportType: string, start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  
  switch (reportType) {
    case 'monthly':
      return startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    case 'quarterly':
      const quarter = Math.ceil((startDate.getMonth() + 1) / 3)
      return `Q${quarter} ${startDate.getFullYear()}`
    case 'annual':
      return startDate.getFullYear().toString()
    default:
      return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
  }
}
