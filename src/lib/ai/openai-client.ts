/**
 * OpenAI Client for Solo Accountant AI
 * Handles GPT-4 integration for transaction categorization and report generation
 */

import OpenAI from 'openai'
import { logger, withTiming, performanceMonitor } from '../logger'
import { AIServiceError, withRetry, CircuitBreaker } from '../errors'
import { OPENAI_CONFIG } from '../config'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
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
 * Categorize a single transaction using GPT-4
 */
export async function categorizeTransaction(
  request: TransactionCategorizationRequest
): Promise<TransactionCategorizationResponse> {
  try {
    const prompt = createCategorizationPrompt(request)
    
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
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
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
      response_format: { type: 'json_object' }
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    const parsed = JSON.parse(response) as TransactionCategorizationResponse
    
    // Validate and normalize the response
    return {
      suggestedCategory: parsed.suggestedCategory || 'Uncategorized',
      confidence: normalizeConfidence(parsed.confidenceScore),
      reasoning: parsed.reasoning || 'AI categorization based on transaction details',
      alternativeCategories: parsed.alternativeCategories || [],
      confidenceScore: Math.max(0, Math.min(1, parsed.confidenceScore || 0))
    }
  } catch (error) {
    console.error('Error categorizing transaction:', error)
    
    // Return fallback response
    return {
      suggestedCategory: 'Uncategorized',
      confidence: 'low',
      reasoning: 'Unable to categorize automatically. Manual review required.',
      alternativeCategories: [],
      confidenceScore: 0
    }
  }
}

/**
 * Categorize multiple transactions in batch
 */
export async function categorizeTransactionsBatch(
  requests: TransactionCategorizationRequest[]
): Promise<TransactionCategorizationResponse[]> {
  const results: TransactionCategorizationResponse[] = []
  
  // Process in batches of 5 to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize)
    
    const batchPromises = batch.map(request => categorizeTransaction(request))
    const batchResults = await Promise.allSettled(batchPromises)
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        console.error(`Failed to categorize transaction ${i + index}:`, result.reason)
        results.push({
          suggestedCategory: 'Uncategorized',
          confidence: 'low',
          reasoning: 'Batch processing error. Manual review required.',
          alternativeCategories: [],
          confidenceScore: 0
        })
      }
    })
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < requests.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return results
}

/**
 * Generate AI-powered client report
 */
export async function generateClientReport(
  request: ReportGenerationRequest
): Promise<ReportGenerationResponse> {
  try {
    const prompt = createReportPrompt(request)
    
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
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
      max_tokens: AI_CONFIG.maxTokens,
      temperature: 0.3, // Slightly higher for creative report writing
      response_format: { type: 'json_object' }
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    return JSON.parse(response) as ReportGenerationResponse
  } catch (error) {
    console.error('Error generating report:', error)
    
    // Return fallback response
    return {
      executiveSummary: 'Report generation temporarily unavailable. Please contact your accountant for a manual report.',
      keyInsights: ['Manual report generation required'],
      recommendations: ['Contact your accountant for detailed analysis'],
      trends: [],
      concerns: []
    }
  }
}

/**
 * Create categorization prompt for GPT-4
 */
function createCategorizationPrompt(request: TransactionCategorizationRequest): string {
  return `
Categorize this business transaction:

Transaction Details:
- Description: "${request.description}"
- Amount: $${request.amount}
- Vendor: ${request.vendor || 'Unknown'}
- Date: ${request.date}
- Account: ${request.accountName || 'Unknown'}

Available Categories:
${request.existingCategories.map(cat => `- ${cat}`).join('\n')}

Please analyze this transaction and provide:
1. The most appropriate category from the available list
2. Confidence level (high: 90%+, medium: 70-89%, low: <70%)
3. Clear reasoning for the categorization
4. Alternative categories if applicable
5. Numerical confidence score (0.0 to 1.0)

Consider:
- Vendor name patterns and industry
- Transaction amount reasonableness
- Common business expense patterns
- Account type and typical usage
- Date context (end of month, holidays, etc.)

Respond in JSON format with the exact structure:
{
  "suggestedCategory": "category name",
  "confidence": "high|medium|low",
  "reasoning": "explanation of categorization logic",
  "alternativeCategories": ["alt1", "alt2"],
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

  return `
Generate a client-friendly financial report for:

Client: ${request.clientName}
Business Type: ${request.businessType}
Period: ${request.period.start} to ${request.period.end}

Financial Summary:
- Total Revenue: $${totalRevenue.toFixed(2)}
- Total Expenses: $${totalExpenses.toFixed(2)}
- Net Profit: $${netProfit.toFixed(2)}

Transaction Data:
${request.transactions.slice(0, 20).map(t => 
  `- ${t.date}: ${t.description} - $${t.amount} (${t.category})`
).join('\n')}

${request.previousPeriodData ? `
Previous Period Comparison:
- Previous Revenue: $${request.previousPeriodData.revenue}
- Previous Expenses: $${request.previousPeriodData.expenses}
` : ''}

Create a professional but accessible report with:
1. Executive summary in plain English (2-3 sentences)
2. Key insights about business performance
3. Actionable recommendations for improvement
4. Notable trends or patterns
5. Any concerns or red flags

Write for a business owner, not an accountant. Use clear, jargon-free language.

Respond in JSON format:
{
  "executiveSummary": "plain English summary",
  "keyInsights": ["insight 1", "insight 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
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
- Always respond in valid JSON format

You have extensive knowledge of:
- Standard chart of accounts structures
- Industry-specific expense patterns
- Vendor recognition and categorization
- Tax deduction categories
- Business expense reasonableness
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
- Always respond in valid JSON format

You have expertise in:
- Small business financial analysis
- Industry benchmarking and trends
- Cash flow management
- Profitability optimization
- Tax planning strategies
- Business growth planning
`

export { openai }