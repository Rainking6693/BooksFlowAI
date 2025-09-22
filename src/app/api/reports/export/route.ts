/**
 * Report PDF Export API Endpoint
 * PROFESSIONAL PDF GENERATION - FILE STORAGE - SECURE ACCESS
 */

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generatePDFReport } from '@/lib/reports/pdf-generator'
import { logger } from '@/lib/logger'
import { 
  ValidationError, 
  DatabaseError, 
  ExternalServiceError 
} from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportId, accountantId } = body

    const context = {
      reportId,
      accountantId,
      operation: 'pdf_export'
    }

    logger.info('Starting PDF export', context)

    // Validate required fields
    if (!reportId || !accountantId) {
      throw new ValidationError('Report ID and Accountant ID are required', context)
    }

    // Fetch report data
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select(`
        id,
        accountant_id,
        client_id,
        title,
        report_type,
        period_start,
        period_end,
        ai_summary,
        report_data,
        pdf_path,
        created_at,
        clients!inner(business_name)
      `)
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      throw new DatabaseError('Report not found', {
        ...context,
        dbError: reportError?.message
      })
    }

    // Verify accountant has access
    if (report.accountant_id !== accountantId) {
      throw new ValidationError('Access denied to this report', context)
    }

    // Check if PDF already exists and is recent
    if (report.pdf_path) {
      try {
        const { data: existingFile, error: fileError } = await supabase.storage
          .from('reports')
          .download(report.pdf_path)

        if (!fileError && existingFile) {
          logger.info('Returning existing PDF', {
            ...context,
            pdfPath: report.pdf_path
          })

          return new NextResponse(existingFile, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${generatePDFFilename(report)}"`,
              'Cache-Control': 'private, max-age=3600'
            }
          })
        }
      } catch (error) {
        logger.warn('Existing PDF not accessible, generating new one', {
          ...context,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Prepare data for PDF generation
    const pdfData = {
      id: report.id,
      title: report.title,
      clientName: report.clients.business_name,
      reportType: report.report_type,
      periodStart: report.period_start,
      periodEnd: report.period_end,
      executiveSummary: report.report_data.executiveSummary || '',
      financialOverview: report.report_data.financialOverview || '',
      keyInsights: report.report_data.keyInsights || [],
      recommendations: report.report_data.recommendations || [],
      businessMetrics: report.report_data.businessMetrics || {
        profitMargin: 0,
        expenseRatio: 0,
        growthRate: 0,
        efficiency: 'Unknown'
      },
      actionItems: report.report_data.actionItems || [],
      plainEnglishSummary: report.ai_summary || '',
      generatedAt: report.created_at
    }

    // Generate PDF
    const pdfBuffer = await generatePDFReport(pdfData)

    // Store PDF in Supabase storage
    const pdfFileName = generatePDFFilename(report)
    const pdfPath = `reports/${report.client_id}/${pdfFileName}`

    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(pdfPath, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      logger.error('Failed to upload PDF to storage', uploadError, context)
      // Continue without storing - return PDF directly
    } else {
      // Update report with PDF path
      await supabase
        .from('reports')
        .update({
          pdf_path: pdfPath,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)

      logger.info('PDF stored successfully', {
        ...context,
        pdfPath,
        pdfSize: pdfBuffer.length
      })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: accountantId,
      action: 'REPORT_PDF_EXPORTED',
      resource_type: 'report',
      resource_id: reportId,
      new_values: {
        pdf_path: pdfPath,
        pdf_size: pdfBuffer.length,
        export_timestamp: new Date().toISOString()
      }
    })

    logger.info('PDF export completed successfully', {
      ...context,
      pdfSize: pdfBuffer.length,
      filename: pdfFileName
    })

    // Return PDF file
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfFileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600'
      }
    })

  } catch (error) {
    if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof ExternalServiceError) {
      logger.error('PDF export validation error', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    const serviceError = new ExternalServiceError('PDFExport', 'Internal server error during PDF export', {
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    
    logger.error('PDF export service error', serviceError)
    return NextResponse.json(
      { error: serviceError.message },
      { status: serviceError.statusCode }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')
    const accountantId = searchParams.get('accountantId')

    if (!reportId || !accountantId) {
      return NextResponse.json(
        { error: 'Report ID and Accountant ID parameters are required' },
        { status: 400 }
      )
    }

    const context = {
      reportId,
      accountantId,
      operation: 'pdf_download'
    }

    // Fetch report data
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select(`
        id,
        accountant_id,
        title,
        pdf_path,
        clients!inner(business_name)
      `)
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      throw new DatabaseError('Report not found', {
        ...context,
        dbError: reportError?.message
      })
    }

    // Verify accountant has access
    if (report.accountant_id !== accountantId) {
      throw new ValidationError('Access denied to this report', context)
    }

    // Check if PDF exists
    if (!report.pdf_path) {
      return NextResponse.json(
        { error: 'PDF not found. Please generate the PDF first.' },
        { status: 404 }
      )
    }

    // Download PDF from storage
    const { data: pdfFile, error: downloadError } = await supabase.storage
      .from('reports')
      .download(report.pdf_path)

    if (downloadError || !pdfFile) {
      throw new ExternalServiceError('Storage', 'Failed to download PDF file', {
        ...context,
        pdfPath: report.pdf_path,
        storageError: downloadError?.message
      })
    }

    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
    const filename = generatePDFFilename(report)

    logger.info('PDF downloaded successfully', {
      ...context,
      pdfSize: pdfBuffer.length,
      filename
    })

    // Return PDF file
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600'
      }
    })

  } catch (error) {
    if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof ExternalServiceError) {
      logger.error('PDF download validation error', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    const serviceError = new ExternalServiceError('PDFDownload', 'Internal server error during PDF download', {
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    
    logger.error('PDF download service error', serviceError)
    return NextResponse.json(
      { error: serviceError.message },
      { status: serviceError.statusCode }
    )
  }
}

/**
 * Generate PDF filename
 */
function generatePDFFilename(report: any): string {
  const clientName = report.clients?.business_name || 'Client'
  const reportType = report.report_type || 'report'
  const date = new Date(report.period_start || Date.now())
  
  const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_')
  const dateStr = date.toISOString().split('T')[0]
  
  return `${sanitizedClientName}_${reportType}_${dateStr}.pdf`
}