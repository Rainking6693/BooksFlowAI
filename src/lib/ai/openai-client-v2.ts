/**
 * Production-grade OpenAI Client for Solo Accountant AI
 * ZERO CONSOLE.LOG - COMPREHENSIVE ERROR HANDLING - PERFORMANCE MONITORING
 */

import OpenAI from 'openai'
import { logger, withTiming, performanceMonitor } from '../logger'
import { AIServiceError, withRetry, CircuitBreaker } from '../errors'
import { OPENAI_CONFIG } from '../config'

// Initialize OpenAI client with production configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  timeout: OPENAI_CONFIG.TIMEOUT,
})

// Circuit breaker for OpenAI API resilience
const openaiCircuitBreaker = new CircuitBreaker(5, 60000, 'OpenAI-API')

// Transaction categorization types
export interface TransactionCategorizationRequest {
  description: string
  amount: number
  vendor?: string
  date: string
  accountName?: string
  existingCategories: string[]
}

export interface TransactionCategorizationResponse {
  suggestedCategory: string
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  alternativeCategories: string[]
  confidenceScore: number // 0-1
}

export interface ReportGenerationRequest {
  clientName: string
  businessType: string
  period: {
    start: string
    end: string
  }
  transactions: Array<{
    date: string
    description: string
    amount: number
    category: string
  }>
  previousPeriodData?: {
    revenue: number
    expenses: number
  }
}

export interface ReportGenerationResponse {
  executiveSummary: string
  keyInsights: string[]
  recommendations: string[]
  trends: string[]
  concerns: string[]
}

/**
 * Categorize a single transaction using GPT-4 with comprehensive error handling
 */
export async function categorizeTransaction(
  request: TransactionCategorizationRequest
): Promise<TransactionCategorizationResponse> {
  const context = {
    transactionDescription: request.description,
    amount: request.amount,
    vendor: request.vendor,
    categoriesCount: request.existingCategories.length
  }

  return withTiming(
    () => withRetry(
      () => openaiCircuitBreaker.execute(async () => {
        logger.debug('Starting AI transaction categorization', context)
        
        // Validate input
        if (!request.description?.trim()) {
          throw new AIServiceError('Transaction description is required', context)
        }
        
        if (!request.existingCategories?.length) {
          throw new AIServiceError('Existing categories list is required', context)
        }

        const prompt = createCategorizationPrompt(request)
        
        const completion = await openai.chat.completions.create({
          model: OPENAI_CONFIG.MODEL,
          messages: [
            {
              role: 'system',
              content: CATEGORIZATION_SYSTEM_PROMPT
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: OPENAI_CONFIG.MAX_TOKENS,
          temperature: OPENAI_CONFIG.TEMPERATURE,
          response_format: { type: 'json_object' }
        })

        const response = completion.choices[0]?.message?.content
        if (!response) {
          throw new AIServiceError('No response from OpenAI API', context)
        }

        let parsed: TransactionCategorizationResponse
        try {
          parsed = JSON.parse(response) as TransactionCategorizationResponse
        } catch (parseError) {
          throw new AIServiceError('Invalid JSON response from OpenAI', {
            ...context,
            response: response.substring(0, 200), // Truncate for logging
            parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
          })
        }
        
        // Validate response structure
        if (!parsed.suggestedCategory || typeof parsed.confidenceScore !== 'number') {
          throw new AIServiceError('Invalid response structure from OpenAI', {
            ...context,
            parsed
          })
        }

        // Validate suggested category exists in available categories
        if (!request.existingCategories.includes(parsed.suggestedCategory)) {
          logger.warn('AI suggested category not in available list, using fallback', {
            ...context,
            suggestedCategory: parsed.suggestedCategory,
            availableCategories: request.existingCategories
          })
          parsed.suggestedCategory = 'Uncategorized'
          parsed.confidenceScore = Math.min(parsed.confidenceScore, 0.5)
        }
        
        // Normalize and validate the response
        const result = {
          suggestedCategory: parsed.suggestedCategory,
          confidence: normalizeConfidence(parsed.confidenceScore),
          reasoning: parsed.reasoning || 'AI categorization based on transaction details',
          alternativeCategories: (parsed.alternativeCategories || [])
            .filter(cat => request.existingCategories.includes(cat))
            .slice(0, 3), // Limit to 3 alternatives
          confidenceScore: Math.max(0, Math.min(1, parsed.confidenceScore))
        }

        logger.info('AI categorization completed successfully', {
          ...context,
          suggestedCategory: result.suggestedCategory,
          confidence: result.confidence,
          confidenceScore: result.confidenceScore,
          alternativesCount: result.alternativeCategories.length
        })

        // Record performance metrics
        performanceMonitor.recordMetric('ai_categorization_confidence', result.confidenceScore)
        performanceMonitor.recordMetric('ai_categorization_alternatives', result.alternativeCategories.length)
        
        return result
      }),
      OPENAI_CONFIG.RETRY_ATTEMPTS,
      OPENAI_CONFIG.RETRY_DELAY,
      context
    ),
    'ai_categorization',
    context
  ).catch(error => {
    logger.error('AI categorization failed, returning fallback', error, context)
    
    // Record failure metric
    performanceMonitor.recordMetric('ai_categorization_failures', 1)
    
    // Return safe fallback response
    return {
      suggestedCategory: 'Uncategorized',
      confidence: 'low' as const,
      reasoning: 'Unable to categorize automatically due to service error. Manual review required.',
      alternativeCategories: [],
      confidenceScore: 0
    }
  })
}

/**
 * Categorize multiple transactions in batch with rate limiting
 */
export async function categorizeTransactionsBatch(
  requests: TransactionCategorizationRequest[]
): Promise<TransactionCategorizationResponse[]> {
  const context = {
    batchSize: requests.length,
    operation: 'batch_categorization'
  }

  logger.info('Starting batch AI categorization', context)

  if (requests.length === 0) {
    logger.warn('Empty batch categorization request', context)
    return []
  }

  const results: TransactionCategorizationResponse[] = []
  const batchSize = 5 // Process in smaller batches to respect rate limits
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize)
    const batchContext = {
      ...context,
      batchIndex: Math.floor(i / batchSize) + 1,
      totalBatches: Math.ceil(requests.length / batchSize),
      currentBatchSize: batch.length
    }

    logger.debug('Processing batch', batchContext)
    
    const batchPromises = batch.map((request, index) => 
      categorizeTransaction(request).catch(error => {
        logger.error(`Failed to categorize transaction ${i + index}`, error, {
          ...batchContext,
          transactionIndex: i + index,
          description: request.description
        })
        
        // Return fallback for failed transaction
        return {
          suggestedCategory: 'Uncategorized',
          confidence: 'low' as const,
          reasoning: 'Batch processing error. Manual review required.',
          alternativeCategories: [],
          confidenceScore: 0
        }
      })
    )
    
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < requests.length) {
      const delay = 1000 // 1 second delay
      logger.debug('Waiting between batches', { ...batchContext, delay })
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  const successCount = results.filter(r => r.suggestedCategory !== 'Uncategorized').length
  const avgConfidence = results.reduce((sum, r) => sum + r.confidenceScore, 0) / results.length

  logger.info('Batch AI categorization completed', {
    ...context,
    successCount,
    failureCount: results.length - successCount,
    averageConfidence: avgConfidence
  })

  // Record batch metrics
  performanceMonitor.recordMetric('ai_batch_success_rate', successCount / results.length)
  performanceMonitor.recordMetric('ai_batch_avg_confidence', avgConfidence)
  
  return results
}

/**
 * Generate AI-powered client report with comprehensive error handling
 */
export async function generateClientReport(
  request: ReportGenerationRequest
): Promise<ReportGenerationResponse> {
  const context = {
    clientName: request.clientName,
    businessType: request.businessType,
    transactionCount: request.transactions.length,
    period: request.period
  }

  return withTiming(
    () => withRetry(
      () => openaiCircuitBreaker.execute(async () => {
        logger.debug('Starting AI report generation', context)
        
        // Validate input
        if (!request.clientName?.trim()) {
          throw new AIServiceError('Client name is required for report generation', context)
        }
        
        if (!request.transactions?.length) {
          throw new AIServiceError('Transaction data is required for report generation', context)
        }

        const prompt = createReportPrompt(request)
        
        const completion = await openai.chat.completions.create({
          model: OPENAI_CONFIG.MODEL,
          messages: [
            {
              role: 'system',
              content: REPORT_GENERATION_SYSTEM_PROMPT
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: OPENAI_CONFIG.MAX_TOKENS,
          temperature: 0.3, // Slightly higher for creative report writing
          response_format: { type: 'json_object' }
        })

        const response = completion.choices[0]?.message?.content
        if (!response) {
          throw new AIServiceError('No response from OpenAI API for report generation', context)
        }

        let parsed: ReportGenerationResponse
        try {
          parsed = JSON.parse(response) as ReportGenerationResponse
        } catch (parseError) {
          throw new AIServiceError('Invalid JSON response from OpenAI for report', {
            ...context,
            parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
          })
        }

        // Validate response structure
        if (!parsed.executiveSummary || !Array.isArray(parsed.keyInsights)) {
          throw new AIServiceError('Invalid report structure from OpenAI', {
            ...context,
            parsed
          })
        }

        logger.info('AI report generation completed successfully', {
          ...context,
          summaryLength: parsed.executiveSummary.length,
          insightsCount: parsed.keyInsights.length,
          recommendationsCount: parsed.recommendations.length
        })

        return parsed
      }),
      OPENAI_CONFIG.RETRY_ATTEMPTS,
      OPENAI_CONFIG.RETRY_DELAY,
      context
    ),
    'ai_report_generation',
    context
  ).catch(error => {
    logger.error('AI report generation failed, returning fallback', error, context)
    
    // Return safe fallback response
    return {
      executiveSummary: 'Report generation temporarily unavailable due to service error. Please contact your accountant for a manual report.',
      keyInsights: ['Manual report generation required due to technical issue'],
      recommendations: ['Contact your accountant for detailed financial analysis'],
      trends: [],
      concerns: ['Technical issue prevented automated report generation']
    }
  })
}

/**
 * Create categorization prompt for GPT-4 with enhanced context
 */
function createCategorizationPrompt(request: TransactionCategorizationRequest): string {
  return `
Categorize this business transaction with high accuracy:

Transaction Details:
- Description: "${request.description}"
- Amount: $${request.amount}
- Vendor: ${request.vendor || 'Unknown'}
- Date: ${request.date}
- Account: ${request.accountName || 'Unknown'}

Available Categories (MUST choose from this list):
${request.existingCategories.map(cat => `- ${cat}`).join('\n')}

Analysis Requirements:
1. Select the MOST APPROPRIATE category from the available list only
2. Provide confidence level: high (90%+), medium (70-89%), low (<70%)
3. Give clear reasoning for the categorization decision
4. Suggest up to 3 alternative categories from the available list
5. Provide numerical confidence score (0.0 to 1.0)

Consider these factors:
- Vendor name patterns and industry classification
- Transaction amount reasonableness for category
- Common business expense patterns
- Account type and typical usage patterns
- Date context (month-end, holidays, seasonal patterns)
- Business context and standard accounting practices

CRITICAL: Only suggest categories that exist in the available categories list.

Respond in this exact JSON format:
{
  "suggestedCategory": "exact category name from available list",
  "confidence": "high|medium|low",
  "reasoning": "detailed explanation of categorization logic",
  "alternativeCategories": ["alt1", "alt2", "alt3"],
  "confidenceScore": 0.95
}
`
}

/**
 * Create report generation prompt for GPT-4
 */
function createReportPrompt(request: ReportGenerationRequest): string {
  const totalRevenue = request.transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)
  
  const totalExpenses = request.transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  
  const netProfit = totalRevenue - totalExpenses

  // Group transactions by category for analysis
  const categoryTotals = request.transactions.reduce((acc, t) => {
    if (t.amount < 0) { // Only expenses
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount)
    }
    return acc
  }, {} as Record<string, number>)

  const topExpenseCategories = Object.entries(categoryTotals)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)

  return `
Generate a professional, client-friendly financial report:

Client Information:
- Name: ${request.clientName}
- Business Type: ${request.businessType}
- Report Period: ${request.period.start} to ${request.period.end}

Financial Summary:
- Total Revenue: $${totalRevenue.toFixed(2)}
- Total Expenses: $${totalExpenses.toFixed(2)}
- Net Profit: $${netProfit.toFixed(2)}

Top Expense Categories:
${topExpenseCategories.map(([cat, amount]) => 
  `- ${cat}: $${amount.toFixed(2)}`
).join('\n')}

Transaction Sample (first 10):
${request.transactions.slice(0, 10).map(t => 
  `- ${t.date}: ${t.description} - $${t.amount.toFixed(2)} (${t.category})`
).join('\n')}

${request.previousPeriodData ? `
Previous Period Comparison:
- Previous Revenue: $${request.previousPeriodData.revenue.toFixed(2)}
- Previous Expenses: $${request.previousPeriodData.expenses.toFixed(2)}
- Revenue Change: ${((totalRevenue - request.previousPeriodData.revenue) / request.previousPeriodData.revenue * 100).toFixed(1)}%
- Expense Change: ${((totalExpenses - request.previousPeriodData.expenses) / request.previousPeriodData.expenses * 100).toFixed(1)}%
` : ''}

Report Requirements:
1. Executive summary in plain English (2-3 sentences, business owner friendly)
2. 3-5 key insights about business performance and financial health
3. 3-5 actionable recommendations for improvement or optimization
4. 2-4 notable trends or patterns in the financial data
5. Any concerns or red flags that need attention

Writing Guidelines:
- Use clear, jargon-free language suitable for business owners
- Focus on actionable insights and business impact
- Be encouraging but honest about challenges
- Provide specific, measurable recommendations when possible
- Consider industry context and seasonal patterns for ${request.businessType}

Respond in this exact JSON format:
{
  "executiveSummary": "plain English summary of business performance",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "trends": ["trend 1", "trend 2"],
  "concerns": ["concern 1", "concern 2"]
}
`
}

/**
 * Normalize confidence score to categorical confidence level
 */
function normalizeConfidence(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.9) return 'high'
  if (score >= 0.7) return 'medium'
  return 'low'
}

// System prompts for different AI tasks
const CATEGORIZATION_SYSTEM_PROMPT = `
You are an expert accounting AI assistant specializing in transaction categorization for small businesses.

Your role is to:
- Accurately categorize business transactions based on description, vendor, amount, and context
- Provide confidence levels based on the clarity and certainty of categorization
- Explain your reasoning in clear, professional language
- Suggest alternative categories when appropriate
- Follow standard accounting practices and chart of accounts conventions

Key principles:
- Be conservative with confidence levels - only mark as "high" when very certain
- Consider industry-specific patterns and common business expenses
- Flag unusual or suspicious transactions with lower confidence
- Provide educational reasoning to help accountants understand the logic
- ALWAYS respond in valid JSON format
- ONLY suggest categories from the provided available categories list

You have extensive knowledge of:
- Standard chart of accounts structures
- Industry-specific expense patterns
- Vendor recognition and categorization
- Tax deduction categories
- Business expense reasonableness
- Accounting best practices and compliance requirements

Quality standards:
- 95%+ accuracy for high confidence categorizations
- Clear, actionable reasoning for all suggestions
- Consistent categorization across similar transactions
- Proper handling of edge cases and ambiguous transactions
`

const REPORT_GENERATION_SYSTEM_PROMPT = `
You are an expert financial analyst and business advisor specializing in small business reporting.

Your role is to:
- Transform complex financial data into clear, actionable insights
- Write in plain English that business owners can understand
- Provide specific, actionable recommendations
- Identify trends, opportunities, and potential concerns
- Focus on business growth and operational efficiency

Key principles:
- Avoid accounting jargon and technical terms
- Focus on business impact and actionable insights
- Be encouraging but honest about challenges
- Provide specific, measurable recommendations
- Consider industry context and seasonal patterns
- ALWAYS respond in valid JSON format

You have expertise in:
- Small business financial analysis
- Industry benchmarking and trends
- Cash flow management and optimization
- Profitability analysis and improvement
- Tax planning strategies
- Business growth planning and forecasting
- Risk assessment and mitigation

Quality standards:
- Clear, jargon-free language appropriate for business owners
- Actionable recommendations with specific next steps
- Accurate financial analysis and trend identification
- Professional but accessible tone
- Focus on business value and growth opportunities
`

export { openai }