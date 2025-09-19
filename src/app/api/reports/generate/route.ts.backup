/**
 * AI Report Generation API Endpoint
 * COMPREHENSIVE BUSINESS REPORTS - PDF EXPORT - CLIENT SHARING
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateAIReport } from '@/lib/reports/ai-report-generator'
import { logger } from '@/lib/logger'
import { 
  ValidationError, 
  DatabaseError, 
  ExternalServiceError 
} from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      accountantId, 
      clientId, 
      reportType, 
      periodStart, 
      periodEnd,
      title,
      includeInsights = true,
      includeRecommendations = true,
      customPrompt
    } = body

    const context = {
      accountantId,
      clientId,
      reportType,
      periodStart,
      periodEnd,
      operation: 'generate_ai_report'
    }

    logger.info('Starting AI report generation', context)

    // Validate required fields
    if (!accountantId || !clientId || !reportType || !periodStart || !periodEnd) {
      throw new ValidationError('Missing required fields: accountantId, clientId, reportType, periodStart, periodEnd', context)
    }

    // Validate report type
    const validReportTypes = ['monthly', 'quarterly', 'annual', 'custom']
    if (!validReportTypes.includes(reportType)) {
      throw new ValidationError('Invalid report type', {
        ...context,
        validTypes: validReportTypes
      })
    }

    // Validate date range
    const startDate = new Date(periodStart)
    const endDate = new Date(periodEnd)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid date format', context)
    }

    if (startDate >= endDate) {
      throw new ValidationError('Start date must be before end date', context)
    }

    // Verify client exists and accountant has access
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select(`
        id,
        business_name,
        business_type,
        accountant_id
      `)
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      throw new ValidationError('Client not found or access denied', {
        ...context,
        dbError: clientError?.message
      })
    }

    if (client.accountant_id !== accountantId) {
      throw new ValidationError('Access denied to this client', context)
    }

    // Generate AI report
    const aiReport = await generateAIReport({
      accountantId,
      clientId,
      reportType,
      periodStart,
      periodEnd,
      includeInsights,
      includeRecommendations,
      customPrompt
    })

    // Create report record in database
    const reportTitle = title || generateReportTitle(reportType, periodStart, periodEnd, client.business_name)
    
    const { data: reportRecord, error: reportError } = await supabase
      .from('reports')
      .insert({
        accountant_id: accountantId,
        client_id: clientId,
        report_type: reportType,
        period_start: periodStart,
        period_end: periodEnd,
        title: reportTitle,
        ai_summary: aiReport.plainEnglishSummary,
        report_data: {
          executiveSummary: aiReport.executiveSummary,
          financialOverview: aiReport.financialOverview,
          keyInsights: aiReport.keyInsights,
          recommendations: aiReport.recommendations,
          businessMetrics: aiReport.businessMetrics,
          actionItems: aiReport.actionItems,
          generationTime: aiReport.generationTime,
          generatedAt: new Date().toISOString()
        },
        shared_with_client: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (reportError || !reportRecord) {
      throw new DatabaseError('Failed to create report record', {
        ...context,
        dbError: reportError?.message
      })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: accountantId,
      action: 'REPORT_GENERATED',
      resource_type: 'report',
      resource_id: reportRecord.id,
      new_values: {
        client_id: clientId,
        report_type: reportType,
        period_start: periodStart,
        period_end: periodEnd,
        generation_time: aiReport.generationTime,
        insights_count: aiReport.keyInsights.length,
        recommendations_count: aiReport.recommendations.length
      }
    })

    logger.info('AI report generated successfully', {
      ...context,
      reportId: reportRecord.id,
      reportTitle,
      generationTime: aiReport.generationTime,
      insightsCount: aiReport.keyInsights.length,
      recommendationsCount: aiReport.recommendations.length
    })

    return NextResponse.json({
      success: true,
      report: {
        id: reportRecord.id,
        title: reportTitle,
        reportType,
        periodStart,
        periodEnd,
        clientName: client.business_name,
        generationTime: aiReport.generationTime,
        ...aiReport
      },
      message: 'AI report generated successfully'
    })

  } catch (error) {
    if (error instanceof ValidationError || error instanceof DatabaseError || error instanceof ExternalServiceError) {
      logger.error('AI report generation validation error', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    const serviceError = new ExternalServiceError('ReportGeneration', 'Internal server error during AI report generation', {
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    
    logger.error('AI report generation service error', serviceError)
    return NextResponse.json(
      { error: serviceError.message },
      { status: serviceError.statusCode }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountantId = searchParams.get('accountantId')
    const clientId = searchParams.get('clientId')
    const reportId = searchParams.get('reportId')

    if (!accountantId) {
      return NextResponse.json(
        { error: 'Accountant ID parameter is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('reports')
      .select(`
        id,
        client_id,
        report_type,
        period_start,
        period_end,
        title,
        ai_summary,
        report_data,
        pdf_path,
        shared_with_client,
        shared_at,
        client_viewed_at,
        created_at,
        updated_at,
        clients!inner(id, business_name, business_type)
      `)
      .eq('accountant_id', accountantId)
      .order('created_at', { ascending: false })

    if (reportId) {
      query = query.eq('id', reportId).single()
    } else if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query.limit(50)

    if (error) {
      const dbError = new DatabaseError('Failed to fetch reports', {
        accountantId,
        clientId,
        reportId,
        dbError: error.message
      })
      logger.error('Database error fetching reports', dbError)
      return NextResponse.json(
        { error: dbError.message },
        { status: dbError.statusCode }
      )
    }

    // Calculate summary statistics for list view
    if (!reportId && Array.isArray(data)) {
      const stats = {
        totalReports: data.length,
        sharedReports: data.filter(r => r.shared_with_client).length,
        viewedReports: data.filter(r => r.client_viewed_at).length,
        reportTypes: data.reduce((acc, r) => {
          acc[r.report_type] = (acc[r.report_type] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        recentActivity: data.slice(0, 5).map(r => ({
          id: r.id,
          title: r.title,
          clientName: r.clients.business_name,
          createdAt: r.created_at,
          shared: r.shared_with_client,
          viewed: !!r.client_viewed_at
        }))
      }

      return NextResponse.json({
        success: true,
        reports: data,
        statistics: stats
      })
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    const serviceError = new ExternalServiceError('ReportGeneration', 'Internal server error fetching reports', {
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    logger.error('Report fetch service error', serviceError)
    return NextResponse.json(
      { error: serviceError.message },
      { status: serviceError.statusCode }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportId, accountantId, shareWithClient, title, customData } = body

    const context = {
      reportId,
      accountantId,
      shareWithClient,
      operation: 'update_report'
    }

    logger.info('Updating report', context)

    // Validate required fields
    if (!reportId || !accountantId) {
      throw new ValidationError('Report ID and Accountant ID are required', context)
    }

    // Verify report exists and accountant has access
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, accountant_id, shared_with_client')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      throw new DatabaseError('Report not found', {
        ...context,
        dbError: reportError?.message
      })
    }

    if (report.accountant_id !== accountantId) {
      throw new ValidationError('Access denied to this report', context)
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) {
      updateData.title = title
    }

    if (customData !== undefined) {
      updateData.report_data = {
        ...updateData.report_data,
        ...customData
      }
    }

    if (shareWithClient !== undefined) {
      updateData.shared_with_client = shareWithClient
      if (shareWithClient && !report.shared_with_client) {
        updateData.shared_at = new Date().toISOString()
      }
    }

    // Update report
    const { error: updateError } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', reportId)

    if (updateError) {
      throw new DatabaseError('Failed to update report', {
        ...context,
        dbError: updateError.message
      })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: accountantId,
      action: shareWithClient ? 'REPORT_SHARED' : 'REPORT_UPDATED',
      resource_type: 'report',
      resource_id: reportId,
      new_values: updateData
    })

    logger.info('Report updated successfully', {
      ...context,
      updateData
    })

    return NextResponse.json({
      success: true,
      message: shareWithClient ? 'Report shared with client successfully' : 'Report updated successfully'
    })

  } catch (error) {
    if (error instanceof ValidationError || error instanceof DatabaseError) {
      logger.error('Report update validation error', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    const serviceError = new ExternalServiceError('ReportGeneration', 'Internal server error updating report', {
      originalError: error instanceof Error ? error.message : 'Unknown error'
    })
    
    logger.error('Report update service error', serviceError)
    return NextResponse.json(
      { error: serviceError.message },
      { status: serviceError.statusCode }
    )
  }
}

/**
 * Generate report title based on type and period
 */
function generateReportTitle(
  reportType: string,
  periodStart: string,
  periodEnd: string,
  businessName: string
): string {
  const startDate = new Date(periodStart)
  const endDate = new Date(periodEnd)
  
  switch (reportType) {
    case 'monthly':
      return `${businessName} - ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Financial Report`
    
    case 'quarterly':
      const quarter = Math.ceil((startDate.getMonth() + 1) / 3)
      return `${businessName} - Q${quarter} ${startDate.getFullYear()} Financial Report`
    
    case 'annual':
      return `${businessName} - ${startDate.getFullYear()} Annual Financial Report`
    
    default:
      return `${businessName} - Financial Report (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
  }
}