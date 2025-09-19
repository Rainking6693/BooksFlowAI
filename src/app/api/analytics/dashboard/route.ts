import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { ValidationError, DatabaseError } from '@/lib/errors'

// GET endpoint for analytics dashboard data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const accountantId = searchParams.get('accountantId')
    const timeRange = searchParams.get('timeRange') || '30d'

    if (!clientId && !accountantId) {
      const error = new ValidationError('Either clientId or accountantId is required')
      logger.error('Analytics API validation failed', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      default:
        startDate.setDate(endDate.getDate() - 30)
    }

    if (clientId) {
      return await getClientAnalytics(clientId, startDate, endDate, timeRange)
    } else {
      return await getAccountantAnalytics(accountantId!, startDate, endDate, timeRange)
    }

  } catch (error) {
    logger.error('Analytics API service error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error fetching analytics' },
      { status: 500 }
    )
  }
}

/**
 * Get analytics data for a specific client
 */
async function getClientAnalytics(
  clientId: string,
  startDate: Date,
  endDate: Date,
  timeRange: string
) {
  try {
    // Get overview metrics
    const overview = await getOverviewMetrics(clientId, startDate, endDate)
    
    // Get trend data
    const trends = await getTrendData(clientId, startDate, endDate, timeRange)
    
    // Get category breakdown
    const categories = await getCategoryBreakdown(clientId, startDate, endDate)
    
    // Get receipt metrics
    const receipts = await getReceiptMetrics(clientId, startDate, endDate)
    
    // Get performance metrics
    const performance = await getPerformanceMetrics(clientId, startDate, endDate)
    
    // Get AI insights
    const insights = await getAIInsights(clientId, overview, categories)

    const analyticsData = {
      overview,
      trends,
      categories,
      receipts,
      performance,
      insights,
      metadata: {
        clientId,
        timeRange,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        generatedAt: new Date().toISOString()
      }
    }

    logger.info('Client analytics generated successfully', {
      clientId,
      timeRange,
      dataPoints: {
        trends: trends.incomeData.length,
        categories: categories.length,
        insights: insights.length
      }
    })

    return NextResponse.json(analyticsData)

  } catch (error) {
    const dbError = new DatabaseError('Failed to fetch client analytics', {
      clientId,
      timeRange,
      dbError: error instanceof Error ? error.message : 'Unknown error'
    })
    logger.error('Database error in client analytics', dbError)
    return NextResponse.json(
      { error: dbError.message },
      { status: dbError.statusCode }
    )
  }
}

/**
 * Get analytics data for an accountant (all their clients)
 */
async function getAccountantAnalytics(
  accountantId: string,
  startDate: Date,
  endDate: Date,
  timeRange: string
) {
  try {
    // Get all clients for this accountant
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('accountant_id', accountantId)

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`)
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({
        overview: getEmptyOverview(),
        trends: getEmptyTrends(),
        categories: [],
        receipts: getEmptyReceipts(),
        performance: getEmptyPerformance(),
        insights: [],
        clients: [],
        metadata: {
          accountantId,
          timeRange,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          generatedAt: new Date().toISOString()
        }
      })
    }

    // Aggregate data across all clients
    const clientIds = clients.map(c => c.id)
    
    const overview = await getAggregatedOverview(clientIds, startDate, endDate)
    const trends = await getAggregatedTrends(clientIds, startDate, endDate, timeRange)
    const categories = await getAggregatedCategories(clientIds, startDate, endDate)
    const receipts = await getAggregatedReceipts(clientIds, startDate, endDate)
    const performance = await getAggregatedPerformance(clientIds, startDate, endDate)
    const insights = await getAccountantInsights(clientIds, overview, categories)

    const analyticsData = {
      overview,
      trends,
      categories,
      receipts,
      performance,
      insights,
      clients: clients.map(client => ({
        id: client.id,
        name: client.name
      })),
      metadata: {
        accountantId,
        timeRange,
        clientCount: clients.length,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        generatedAt: new Date().toISOString()
      }
    }

    logger.info('Accountant analytics generated successfully', {
      accountantId,
      timeRange,
      clientCount: clients.length,
      dataPoints: {
        trends: trends.incomeData.length,
        categories: categories.length,
        insights: insights.length
      }
    })

    return NextResponse.json(analyticsData)

  } catch (error) {
    const dbError = new DatabaseError('Failed to fetch accountant analytics', {
      accountantId,
      timeRange,
      dbError: error instanceof Error ? error.message : 'Unknown error'
    })
    logger.error('Database error in accountant analytics', dbError)
    return NextResponse.json(
      { error: dbError.message },
      { status: dbError.statusCode }
    )
  }
}

/**
 * Get overview metrics for a client
 */
async function getOverviewMetrics(clientId: string, startDate: Date, endDate: Date) {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount, category, date')
    .eq('client_id', clientId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  }

  const currentIncome = transactions
    ?.filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0) || 0

  const currentExpenses = transactions
    ?.filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

  const currentProfit = currentIncome - currentExpenses
  const profitMargin = currentIncome > 0 ? (currentProfit / currentIncome) * 100 : 0

  // Calculate growth rates (compare with previous period)
  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const previousStartDate = new Date(startDate.getTime() - (periodDays * 24 * 60 * 60 * 1000))
  const previousEndDate = new Date(startDate.getTime() - 1)

  const { data: previousTransactions } = await supabase
    .from('transactions')
    .select('amount')
    .eq('client_id', clientId)
    .gte('date', previousStartDate.toISOString().split('T')[0])
    .lte('date', previousEndDate.toISOString().split('T')[0])

  const previousIncome = previousTransactions
    ?.filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0) || 0

  const previousExpenses = previousTransactions
    ?.filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

  const incomeGrowthRate = previousIncome > 0 
    ? ((currentIncome - previousIncome) / previousIncome) * 100 
    : 0

  const expenseGrowthRate = previousExpenses > 0 
    ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 
    : 0

  return {
    currentIncome,
    currentExpenses,
    currentProfit,
    incomeGrowthRate,
    expenseGrowthRate,
    profitMargin
  }
}

/**
 * Get trend data for charts
 */
async function getTrendData(clientId: string, startDate: Date, endDate: Date, timeRange: string) {
  // Determine grouping interval based on time range
  const groupBy = timeRange === '7d' ? 'day' : timeRange === '30d' ? 'week' : 'month'
  
  const { data: dailyMetrics, error } = await supabase
    .from('daily_financial_metrics')
    .select('date, total_income, total_expenses')
    .eq('client_id', clientId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date')

  if (error) {
    throw new Error(`Failed to fetch daily metrics: ${error.message}`)
  }

  // Group data by the specified interval
  const groupedData = groupDataByInterval(dailyMetrics || [], groupBy)
  
  return {
    incomeData: groupedData.map(item => ({
      month: item.period,
      amount: item.income
    })),
    expenseData: groupedData.map(item => ({
      month: item.period,
      amount: item.expenses
    })),
    profitData: groupedData.map(item => ({
      month: item.period,
      amount: item.income - item.expenses
    }))
  }
}

/**
 * Get category breakdown
 */
async function getCategoryBreakdown(clientId: string, startDate: Date, endDate: Date) {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount, category')
    .eq('client_id', clientId)
    .lt('amount', 0) // Only expenses
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])

  if (error) {
    throw new Error(`Failed to fetch category data: ${error.message}`)
  }

  // Group by category
  const categoryTotals = (transactions || []).reduce((acc: Record<string, number>, transaction) => {
    const category = transaction.category || 'Uncategorized'
    acc[category] = (acc[category] || 0) + Math.abs(transaction.amount)
    return acc
  }, {})

  const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0)

  return Object.entries(categoryTotals)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      trend: 'stable' as const // TODO: Calculate actual trend
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10) // Top 10 categories
}

/**
 * Get receipt metrics
 */
async function getReceiptMetrics(clientId: string, startDate: Date, endDate: Date) {
  const { data: receipts, error } = await supabase
    .from('receipts')
    .select('status, created_at')
    .eq('client_id', clientId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  if (error) {
    throw new Error(`Failed to fetch receipt metrics: ${error.message}`)
  }

  const thisMonth = receipts?.length || 0
  const pending = receipts?.filter(r => r.status === 'pending').length || 0
  const processed = receipts?.filter(r => r.status === 'processed').length || 0
  const accuracy = processed > 0 ? Math.round((processed / thisMonth) * 100) : 0

  return {
    thisMonth,
    pending,
    processed,
    accuracy
  }
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics(clientId: string, startDate: Date, endDate: Date) {
  // This would typically come from performance tracking tables
  // For now, return sample data
  return {
    accuracyScore: 94,
    avgProcessingTime: 1200, // milliseconds
    automationRate: 87,
    clientSatisfaction: 4.6
  }
}

/**
 * Generate AI insights based on the data
 */
async function getAIInsights(clientId: string, overview: any, categories: any[]) {
  const insights = []

  // Profit margin insight
  if (overview.profitMargin < 10) {
    insights.push({
      type: 'warning' as const,
      title: 'Low Profit Margin',
      description: `Your profit margin is ${overview.profitMargin.toFixed(1)}%, which is below the recommended 15-20% for most businesses.`,
      impact: overview.currentIncome * 0.1,
      actionable: true
    })
  }

  // Growth opportunity
  if (overview.incomeGrowthRate > 10) {
    insights.push({
      type: 'achievement' as const,
      title: 'Strong Income Growth',
      description: `Your income has grown by ${overview.incomeGrowthRate.toFixed(1)}% compared to the previous period.`,
      impact: overview.currentIncome - (overview.currentIncome / (1 + overview.incomeGrowthRate / 100)),
      actionable: false
    })
  }

  // Category optimization
  const topCategory = categories[0]
  if (topCategory && topCategory.percentage > 30) {
    insights.push({
      type: 'opportunity' as const,
      title: 'Expense Optimization Opportunity',
      description: `${topCategory.name} represents ${topCategory.percentage}% of your expenses. Consider reviewing these costs for potential savings.`,
      impact: topCategory.amount * 0.1,
      actionable: true
    })
  }

  return insights
}

/**
 * Helper function to group data by time interval
 */
function groupDataByInterval(data: any[], groupBy: 'day' | 'week' | 'month') {
  // Implementation would depend on the specific grouping logic
  // For now, return the data as-is with formatted periods
  return data.map(item => ({
    period: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      ...(groupBy === 'day' && { day: 'numeric' })
    }),
    income: item.total_income || 0,
    expenses: item.total_expenses || 0
  }))
}

/**
 * Helper functions for empty data states
 */
function getEmptyOverview() {
  return {
    currentIncome: 0,
    currentExpenses: 0,
    currentProfit: 0,
    incomeGrowthRate: 0,
    expenseGrowthRate: 0,
    profitMargin: 0
  }
}

function getEmptyTrends() {
  return {
    incomeData: [],
    expenseData: [],
    profitData: []
  }
}

function getEmptyReceipts() {
  return {
    thisMonth: 0,
    pending: 0,
    processed: 0,
    accuracy: 0
  }
}

function getEmptyPerformance() {
  return {
    accuracyScore: 0,
    avgProcessingTime: 0,
    automationRate: 0,
    clientSatisfaction: 0
  }
}

/**
 * Aggregated functions for accountant analytics
 */
async function getAggregatedOverview(clientIds: string[], startDate: Date, endDate: Date) {
  // Implementation for aggregating across multiple clients
  // This would sum up all client metrics
  return getEmptyOverview() // Placeholder
}

async function getAggregatedTrends(clientIds: string[], startDate: Date, endDate: Date, timeRange: string) {
  // Implementation for aggregating trends across clients
  return getEmptyTrends() // Placeholder
}

async function getAggregatedCategories(clientIds: string[], startDate: Date, endDate: Date) {
  // Implementation for aggregating categories across clients
  return [] // Placeholder
}

async function getAggregatedReceipts(clientIds: string[], startDate: Date, endDate: Date) {
  // Implementation for aggregating receipt metrics
  return getEmptyReceipts() // Placeholder
}

async function getAggregatedPerformance(clientIds: string[], startDate: Date, endDate: Date) {
  // Implementation for aggregating performance metrics
  return getEmptyPerformance() // Placeholder
}

async function getAccountantInsights(clientIds: string[], overview: any, categories: any[]) {
  // Implementation for accountant-specific insights
  return [] // Placeholder
}