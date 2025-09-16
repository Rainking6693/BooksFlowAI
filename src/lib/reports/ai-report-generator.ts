/**
 * AI-Powered Report Generation System
 * PLAIN-ENGLISH SUMMARIES - BUSINESS INSIGHTS - AUTOMATED ANALYSIS
 */

import { logger, withTiming, performanceMonitor } from '../logger'
import { ExternalServiceError, ValidationError, withRetry, CircuitBreaker } from '../errors'
import { env, APP_CONFIG } from '../config'

// Circuit breaker for OpenAI API resilience
const openaiCircuitBreaker = new CircuitBreaker(3, 120000, 'OpenAI-Reports-API')

// Report generation configuration
const REPORT_CONFIG = {
  AI_MODEL: 'gpt-4',
  MAX_TOKENS: 3000,
  TEMPERATURE: 0.3, // More deterministic for business reports
  TIMEOUT: 45000, // 45 seconds for complex reports
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000
}

// Report types and interfaces
export interface ReportGenerationRequest {
  accountantId: string
  clientId: string
  reportType: 'monthly' | 'quarterly' | 'annual' | 'custom'
  periodStart: string
  periodEnd: string
  includeInsights?: boolean
  includeRecommendations?: boolean
  customPrompt?: string
}

export interface TransactionSummary {
  totalIncome: number
  totalExpenses: number
  netIncome: number
  transactionCount: number
  topExpenseCategories: Array<{
    category: string
    amount: number
    percentage: number
    transactionCount: number
  }>
  topVendors: Array<{
    vendor: string
    amount: number
    transactionCount: number
  }>
  monthlyTrends: Array<{
    month: string
    income: number
    expenses: number
    netIncome: number
  }>
}

export interface BusinessInsights {
  cashFlowTrend: 'improving' | 'declining' | 'stable'
  expenseGrowth: number
  incomeGrowth: number
  profitabilityTrend: 'improving' | 'declining' | 'stable'
  seasonalPatterns: string[]
  anomalies: Array<{
    type: 'expense_spike' | 'income_drop' | 'unusual_vendor'
    description: string
    amount?: number
    date?: string
  }>
}

export interface AIReportResponse {
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
  plainEnglishSummary: string
  actionItems: string[]
  generationTime: number
}

/**
 * Generate comprehensive AI-powered business report
 */
export async function generateAIReport(
  request: ReportGenerationRequest
): Promise<AIReportResponse> {
  const context = {
    accountantId: request.accountantId,
    clientId: request.clientId,
    reportType: request.reportType,
    periodStart: request.periodStart,
    periodEnd: request.periodEnd,
    operation: 'ai_report_generation'
  }

  return withTiming(
    () => withRetry(
      () => openaiCircuitBreaker.execute(async () => {
        logger.info('Starting AI report generation', context)
        
        // Gather financial data for the period
        const financialData = await gatherFinancialData(request)
        
        // Generate business insights
        const insights = await generateBusinessInsights(financialData, context)
        
        // Create AI prompt for report generation
        const prompt = buildReportPrompt(request, financialData, insights)
        
        // Generate report using OpenAI
        const aiResponse = await callOpenAIForReport(prompt, context)
        
        // Parse and structure the AI response
        const structuredReport = parseAIResponse(aiResponse, financialData, insights)
        
        logger.info('AI report generation completed successfully', {
          ...context,
          reportLength: structuredReport.plainEnglishSummary.length,
          insightsCount: structuredReport.keyInsights.length,
          recommendationsCount: structuredReport.recommendations.length,
          generationTime: structuredReport.generationTime
        })

        // Record performance metrics
        performanceMonitor.recordMetric('ai_report_generation_time', structuredReport.generationTime)
        performanceMonitor.recordMetric('ai_report_insights_count', structuredReport.keyInsights.length)
        
        return structuredReport
      }),
      REPORT_CONFIG.RETRY_ATTEMPTS,
      REPORT_CONFIG.RETRY_DELAY,
      context
    ),
    'ai_report_generation',
    context
  )
}

/**
 * Gather financial data for report period
 */
async function gatherFinancialData(request: ReportGenerationRequest): Promise<TransactionSummary> {
  const { supabase } = await import('../supabase')
  
  const context = {
    clientId: request.clientId,
    periodStart: request.periodStart,
    periodEnd: request.periodEnd,
    operation: 'gather_financial_data'
  }

  logger.debug('Gathering financial data for report', context)

  // Get all transactions for the period
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      vendor_name,
      transaction_date,
      category_id,
      transaction_categories(name, category_type)
    `)
    .eq('client_id', request.clientId)
    .gte('transaction_date', request.periodStart)
    .lte('transaction_date', request.periodEnd)
    .order('transaction_date', { ascending: true })

  if (error) {
    throw new ExternalServiceError('Database', 'Failed to fetch transaction data for report', {
      ...context,
      dbError: error.message
    })
  }

  if (!transactions || transactions.length === 0) {
    logger.warn('No transactions found for report period', context)
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      transactionCount: 0,
      topExpenseCategories: [],
      topVendors: [],
      monthlyTrends: []
    }
  }

  // Calculate financial summaries
  const income = transactions
    .filter(t => t.transaction_categories?.category_type === 'Income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const expenses = transactions
    .filter(t => t.transaction_categories?.category_type === 'Expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // Group by categories for expense analysis
  const expensesByCategory = transactions
    .filter(t => t.transaction_categories?.category_type === 'Expense')
    .reduce((acc, t) => {
      const category = t.transaction_categories?.name || 'Uncategorized'
      if (!acc[category]) {
        acc[category] = { amount: 0, count: 0 }
      }
      acc[category].amount += Math.abs(t.amount)
      acc[category].count += 1
      return acc
    }, {} as Record<string, { amount: number; count: number }>)

  const topExpenseCategories = Object.entries(expensesByCategory)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: expenses > 0 ? (data.amount / expenses) * 100 : 0,
      transactionCount: data.count
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  // Group by vendors
  const expensesByVendor = transactions
    .filter(t => t.vendor_name && t.transaction_categories?.category_type === 'Expense')
    .reduce((acc, t) => {
      const vendor = t.vendor_name!
      if (!acc[vendor]) {
        acc[vendor] = { amount: 0, count: 0 }
      }
      acc[vendor].amount += Math.abs(t.amount)
      acc[vendor].count += 1
      return acc
    }, {} as Record<string, { amount: number; count: number }>)

  const topVendors = Object.entries(expensesByVendor)
    .map(([vendor, data]) => ({
      vendor,
      amount: data.amount,
      transactionCount: data.count
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  // Calculate monthly trends
  const monthlyData = transactions.reduce((acc, t) => {
    const month = t.transaction_date.substring(0, 7) // YYYY-MM format
    if (!acc[month]) {
      acc[month] = { income: 0, expenses: 0 }
    }
    
    if (t.transaction_categories?.category_type === 'Income') {
      acc[month].income += Math.abs(t.amount)
    } else if (t.transaction_categories?.category_type === 'Expense') {
      acc[month].expenses += Math.abs(t.amount)
    }
    
    return acc
  }, {} as Record<string, { income: number; expenses: number }>)

  const monthlyTrends = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      netIncome: data.income - data.expenses
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return {
    totalIncome: income,
    totalExpenses: expenses,
    netIncome: income - expenses,
    transactionCount: transactions.length,
    topExpenseCategories,
    topVendors,
    monthlyTrends
  }
}

/**
 * Generate business insights from financial data
 */
async function generateBusinessInsights(
  data: TransactionSummary,
  context: any
): Promise<BusinessInsights> {
  logger.debug('Generating business insights', context)

  // Analyze cash flow trend
  const cashFlowTrend = analyzeCashFlowTrend(data.monthlyTrends)
  
  // Calculate growth rates
  const { expenseGrowth, incomeGrowth } = calculateGrowthRates(data.monthlyTrends)
  
  // Determine profitability trend
  const profitabilityTrend = analyzeProfitabilityTrend(data.monthlyTrends)
  
  // Detect seasonal patterns
  const seasonalPatterns = detectSeasonalPatterns(data.monthlyTrends)
  
  // Identify anomalies
  const anomalies = detectAnomalies(data)

  return {
    cashFlowTrend,
    expenseGrowth,
    incomeGrowth,
    profitabilityTrend,
    seasonalPatterns,
    anomalies
  }
}

/**
 * Build comprehensive prompt for AI report generation
 */
function buildReportPrompt(
  request: ReportGenerationRequest,
  data: TransactionSummary,
  insights: BusinessInsights
): string {
  const periodDescription = formatPeriodDescription(request.reportType, request.periodStart, request.periodEnd)
  
  return `You are a senior financial analyst creating a comprehensive business report for a small business client. Generate a professional, plain-English financial report based on the following data:

REPORT PERIOD: ${periodDescription}

FINANCIAL SUMMARY:
- Total Income: $${data.totalIncome.toLocaleString()}
- Total Expenses: $${data.totalExpenses.toLocaleString()}
- Net Income: $${data.netIncome.toLocaleString()}
- Total Transactions: ${data.transactionCount}

TOP EXPENSE CATEGORIES:
${data.topExpenseCategories.map(cat => 
  `- ${cat.category}: $${cat.amount.toLocaleString()} (${cat.percentage.toFixed(1)}% of expenses)`
).join('\n')}

TOP VENDORS:
${data.topVendors.slice(0, 5).map(vendor => 
  `- ${vendor.vendor}: $${vendor.amount.toLocaleString()} (${vendor.transactionCount} transactions)`
).join('\n')}

MONTHLY TRENDS:
${data.monthlyTrends.map(month => 
  `- ${month.month}: Income $${month.income.toLocaleString()}, Expenses $${month.expenses.toLocaleString()}, Net $${month.netIncome.toLocaleString()}`
).join('\n')}

BUSINESS INSIGHTS:
- Cash Flow Trend: ${insights.cashFlowTrend}
- Income Growth: ${insights.incomeGrowth.toFixed(1)}%
- Expense Growth: ${insights.expenseGrowth.toFixed(1)}%
- Profitability Trend: ${insights.profitabilityTrend}

Please provide a comprehensive report with the following sections:

1. EXECUTIVE SUMMARY (2-3 sentences highlighting the most important findings)

2. FINANCIAL OVERVIEW (Plain-English explanation of the financial performance)

3. KEY INSIGHTS (3-5 bullet points of the most important discoveries)

4. BUSINESS RECOMMENDATIONS (3-5 actionable recommendations for improvement)

5. PLAIN ENGLISH SUMMARY (A conversational explanation a business owner would easily understand)

6. ACTION ITEMS (Specific next steps the business owner should take)

Write in a professional but accessible tone. Avoid jargon. Focus on actionable insights that will help the business owner make better decisions. Be specific with numbers and percentages where relevant.`
}

/**
 * Call OpenAI API for report generation
 */
async function callOpenAIForReport(prompt: string, context: any): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'SoloAccountantAI/1.0'
    },
    body: JSON.stringify({
      model: REPORT_CONFIG.AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a senior financial analyst and business advisor specializing in small business financial reporting. You create clear, actionable reports that help business owners understand their finances and make better decisions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: REPORT_CONFIG.MAX_TOKENS,
      temperature: REPORT_CONFIG.TEMPERATURE,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    }),
    signal: AbortSignal.timeout(REPORT_CONFIG.TIMEOUT)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new ExternalServiceError('OpenAI', `Report generation failed: ${response.status}`, {
      ...context,
      status: response.status,
      error: errorText
    })
  }

  const data = await response.json()
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new ExternalServiceError('OpenAI', 'Invalid response format from OpenAI', {
      ...context,
      response: data
    })
  }

  return data.choices[0].message.content
}

/**
 * Parse AI response into structured report format
 */
function parseAIResponse(
  aiResponse: string,
  financialData: TransactionSummary,
  insights: BusinessInsights
): AIReportResponse {
  const startTime = Date.now()
  
  // Parse sections from AI response
  const sections = parseReportSections(aiResponse)
  
  // Calculate business metrics
  const businessMetrics = {
    profitMargin: financialData.totalIncome > 0 ? 
      (financialData.netIncome / financialData.totalIncome) * 100 : 0,
    expenseRatio: financialData.totalIncome > 0 ? 
      (financialData.totalExpenses / financialData.totalIncome) * 100 : 0,
    growthRate: insights.incomeGrowth,
    efficiency: getEfficiencyRating(financialData, insights)
  }

  return {
    executiveSummary: sections.executiveSummary || '',
    financialOverview: sections.financialOverview || '',
    keyInsights: sections.keyInsights || [],
    recommendations: sections.recommendations || [],
    businessMetrics,
    plainEnglishSummary: sections.plainEnglishSummary || '',
    actionItems: sections.actionItems || [],
    generationTime: Date.now() - startTime
  }
}

/**
 * Parse report sections from AI response
 */
function parseReportSections(response: string): any {
  const sections: any = {}
  
  // Extract executive summary
  const execMatch = response.match(/EXECUTIVE SUMMARY[:\n](.*?)(?=\n\n|\n[A-Z]|$)/s)
  sections.executiveSummary = execMatch?.[1]?.trim() || ''
  
  // Extract financial overview
  const overviewMatch = response.match(/FINANCIAL OVERVIEW[:\n](.*?)(?=\n\n|\n[A-Z]|$)/s)
  sections.financialOverview = overviewMatch?.[1]?.trim() || ''
  
  // Extract key insights
  const insightsMatch = response.match(/KEY INSIGHTS[:\n](.*?)(?=\n\n|\n[A-Z]|$)/s)
  sections.keyInsights = parseListItems(insightsMatch?.[1] || '')
  
  // Extract recommendations
  const recsMatch = response.match(/(?:BUSINESS )?RECOMMENDATIONS[:\n](.*?)(?=\n\n|\n[A-Z]|$)/s)
  sections.recommendations = parseListItems(recsMatch?.[1] || '')
  
  // Extract plain English summary
  const summaryMatch = response.match(/PLAIN ENGLISH SUMMARY[:\n](.*?)(?=\n\n|\n[A-Z]|$)/s)
  sections.plainEnglishSummary = summaryMatch?.[1]?.trim() || ''
  
  // Extract action items
  const actionMatch = response.match(/ACTION ITEMS[:\n](.*?)(?=\n\n|\n[A-Z]|$)/s)
  sections.actionItems = parseListItems(actionMatch?.[1] || '')
  
  return sections
}

/**
 * Parse list items from text
 */
function parseListItems(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(line => line.length > 0)
    .slice(0, 10) // Limit to 10 items
}

/**
 * Helper functions for business analysis
 */
function analyzeCashFlowTrend(trends: any[]): 'improving' | 'declining' | 'stable' {
  if (trends.length < 2) return 'stable'
  
  const recent = trends.slice(-3)
  const avgRecent = recent.reduce((sum, t) => sum + t.netIncome, 0) / recent.length
  
  const earlier = trends.slice(0, -3)
  if (earlier.length === 0) return 'stable'
  
  const avgEarlier = earlier.reduce((sum, t) => sum + t.netIncome, 0) / earlier.length
  
  const change = (avgRecent - avgEarlier) / Math.abs(avgEarlier)
  
  if (change > 0.1) return 'improving'
  if (change < -0.1) return 'declining'
  return 'stable'
}

function calculateGrowthRates(trends: any[]): { expenseGrowth: number; incomeGrowth: number } {
  if (trends.length < 2) return { expenseGrowth: 0, incomeGrowth: 0 }
  
  const first = trends[0]
  const last = trends[trends.length - 1]
  
  const incomeGrowth = first.income > 0 ? 
    ((last.income - first.income) / first.income) * 100 : 0
  
  const expenseGrowth = first.expenses > 0 ? 
    ((last.expenses - first.expenses) / first.expenses) * 100 : 0
  
  return { expenseGrowth, incomeGrowth }
}

function analyzeProfitabilityTrend(trends: any[]): 'improving' | 'declining' | 'stable' {
  if (trends.length < 2) return 'stable'
  
  const profitMargins = trends.map(t => 
    t.income > 0 ? (t.netIncome / t.income) * 100 : 0
  )
  
  const recent = profitMargins.slice(-3).reduce((sum, p) => sum + p, 0) / 3
  const earlier = profitMargins.slice(0, -3)
  
  if (earlier.length === 0) return 'stable'
  
  const earlierAvg = earlier.reduce((sum, p) => sum + p, 0) / earlier.length
  
  if (recent > earlierAvg + 5) return 'improving'
  if (recent < earlierAvg - 5) return 'declining'
  return 'stable'
}

function detectSeasonalPatterns(trends: any[]): string[] {
  // Simple seasonal pattern detection
  const patterns: string[] = []
  
  if (trends.length >= 12) {
    // Check for holiday season patterns (Nov-Dec)
    const holidayMonths = trends.filter(t => 
      t.month.endsWith('-11') || t.month.endsWith('-12')
    )
    
    if (holidayMonths.length > 0) {
      const avgHoliday = holidayMonths.reduce((sum, t) => sum + t.expenses, 0) / holidayMonths.length
      const avgOther = trends.filter(t => 
        !t.month.endsWith('-11') && !t.month.endsWith('-12')
      ).reduce((sum, t) => sum + t.expenses, 0) / (trends.length - holidayMonths.length)
      
      if (avgHoliday > avgOther * 1.2) {
        patterns.push('Higher expenses during holiday season')
      }
    }
  }
  
  return patterns
}

function detectAnomalies(data: TransactionSummary): any[] {
  const anomalies: any[] = []
  
  // Detect expense spikes
  if (data.monthlyTrends.length > 1) {
    const avgExpenses = data.monthlyTrends.reduce((sum, t) => sum + t.expenses, 0) / data.monthlyTrends.length
    
    data.monthlyTrends.forEach(trend => {
      if (trend.expenses > avgExpenses * 1.5) {
        anomalies.push({
          type: 'expense_spike',
          description: `Unusually high expenses in ${trend.month}`,
          amount: trend.expenses,
          date: trend.month
        })
      }
    })
  }
  
  return anomalies.slice(0, 5) // Limit to 5 anomalies
}

function getEfficiencyRating(data: TransactionSummary, insights: BusinessInsights): string {
  const profitMargin = data.totalIncome > 0 ? (data.netIncome / data.totalIncome) * 100 : 0
  
  if (profitMargin > 20) return 'Excellent'
  if (profitMargin > 10) return 'Good'
  if (profitMargin > 0) return 'Fair'
  return 'Needs Improvement'
}

function formatPeriodDescription(type: string, start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  
  if (type === 'monthly') {
    return startMonth
  } else if (type === 'quarterly') {
    return `Q${Math.ceil((startDate.getMonth() + 1) / 3)} ${startDate.getFullYear()}`
  } else if (type === 'annual') {
    return `${startDate.getFullYear()}`
  } else {
    return `${startMonth} - ${endMonth}`
  }
}