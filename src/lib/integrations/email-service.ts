/**
 * Email Service Integration
 * Handles automated email notifications for BooksFlowAI
 */

import { logger } from '../logger'
import { ExternalServiceError, withRetry, CircuitBreaker } from '../errors'
import { APP_CONFIG } from '../config'

// Email Service Configuration
const EMAIL_CONFIG = {
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY!,
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@booksflowai.com',
  FROM_NAME: process.env.FROM_NAME || 'BooksFlowAI',
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  TIMEOUT: 10000
}

// Circuit breaker for email service resilience
const emailCircuitBreaker = new CircuitBreaker(5, 60000, 'Email-Service')

// Email Types
export interface EmailRecipient {
  email: string
  name?: string
}

export interface EmailTemplate {
  templateId?: string
  subject: string
  htmlContent?: string
  textContent?: string
  dynamicData?: Record<string, any>
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  timestamp: string
}

export interface MissingReceiptNotification {
  clientName: string
  clientEmail: string
  accountantName: string
  missingReceipts: Array<{
    description: string
    amount: number
    date: string
    daysOverdue: number
  }>
  totalAmount: number
  portalUrl: string
}

export interface ReportReadyNotification {
  clientName: string
  clientEmail: string
  reportTitle: string
  reportPeriod: string
  downloadUrl: string
  accountantName: string
}

export interface WelcomeNotification {
  clientName: string
  clientEmail: string
  accountantName: string
  portalUrl: string
  setupInstructions: string[]
}

/**
 * Send missing receipt reminder email to client
 */
export async function sendMissingReceiptReminder(
  notification: MissingReceiptNotification
): Promise<EmailResult> {
  const startTime = Date.now()
  
  try {
    logger.info('Sending missing receipt reminder', {
      clientEmail: notification.clientEmail,
      missingCount: notification.missingReceipts.length,
      totalAmount: notification.totalAmount
    })

    const emailData = {
      to: [{ email: notification.clientEmail, name: notification.clientName }],
      subject: `📄 Missing Receipts Reminder - ${notification.missingReceipts.length} receipts needed`,
      htmlContent: generateMissingReceiptHTML(notification),
      textContent: generateMissingReceiptText(notification)
    }

    const result = await emailCircuitBreaker.execute(() =>
      withRetry(
        () => sendEmailViaProvider(emailData),
        EMAIL_CONFIG.RETRY_ATTEMPTS,
        EMAIL_CONFIG.RETRY_DELAY,
        { clientEmail: notification.clientEmail }
      )
    )

    const processingTime = Date.now() - startTime

    logger.info('Missing receipt reminder sent successfully', {
      clientEmail: notification.clientEmail,
      messageId: result.messageId,
      processingTime
    })

    return {
      success: true,
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    
    logger.error('Failed to send missing receipt reminder', error as Error, {
      clientEmail: notification.clientEmail,
      processingTime
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Send report ready notification to client
 */
export async function sendReportReadyNotification(
  notification: ReportReadyNotification
): Promise<EmailResult> {
  const startTime = Date.now()
  
  try {
    logger.info('Sending report ready notification', {
      clientEmail: notification.clientEmail,
      reportTitle: notification.reportTitle
    })

    const emailData = {
      to: [{ email: notification.clientEmail, name: notification.clientName }],
      subject: `📊 Your ${notification.reportTitle} is Ready`,
      htmlContent: generateReportReadyHTML(notification),
      textContent: generateReportReadyText(notification)
    }

    const result = await emailCircuitBreaker.execute(() =>
      withRetry(
        () => sendEmailViaProvider(emailData),
        EMAIL_CONFIG.RETRY_ATTEMPTS,
        EMAIL_CONFIG.RETRY_DELAY,
        { clientEmail: notification.clientEmail }
      )
    )

    const processingTime = Date.now() - startTime

    logger.info('Report ready notification sent successfully', {
      clientEmail: notification.clientEmail,
      messageId: result.messageId,
      processingTime
    })

    return {
      success: true,
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    
    logger.error('Failed to send report ready notification', error as Error, {
      clientEmail: notification.clientEmail,
      processingTime
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Send welcome email to new client
 */
export async function sendWelcomeNotification(
  notification: WelcomeNotification
): Promise<EmailResult> {
  const startTime = Date.now()
  
  try {
    logger.info('Sending welcome notification', {
      clientEmail: notification.clientEmail
    })

    const emailData = {
      to: [{ email: notification.clientEmail, name: notification.clientName }],
      subject: `🎉 Welcome to BooksFlowAI - Your Bookkeeping Just Got Easier`,
      htmlContent: generateWelcomeHTML(notification),
      textContent: generateWelcomeText(notification)
    }

    const result = await emailCircuitBreaker.execute(() =>
      withRetry(
        () => sendEmailViaProvider(emailData),
        EMAIL_CONFIG.RETRY_ATTEMPTS,
        EMAIL_CONFIG.RETRY_DELAY,
        { clientEmail: notification.clientEmail }
      )
    )

    const processingTime = Date.now() - startTime

    logger.info('Welcome notification sent successfully', {
      clientEmail: notification.clientEmail,
      messageId: result.messageId,
      processingTime
    })

    return {
      success: true,
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    
    logger.error('Failed to send welcome notification', error as Error, {
      clientEmail: notification.clientEmail,
      processingTime
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Send email via configured provider (SendGrid)
 */
async function sendEmailViaProvider(emailData: {
  to: EmailRecipient[]
  subject: string
  htmlContent: string
  textContent: string
}): Promise<{ messageId: string }> {
  const payload = {
    personalizations: [
      {
        to: emailData.to,
        subject: emailData.subject
      }
    ],
    from: {
      email: EMAIL_CONFIG.FROM_EMAIL,
      name: EMAIL_CONFIG.FROM_NAME
    },
    content: [
      {
        type: 'text/plain',
        value: emailData.textContent
      },
      {
        type: 'text/html',
        value: emailData.htmlContent
      }
    ]
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${EMAIL_CONFIG.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(EMAIL_CONFIG.TIMEOUT)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new ExternalServiceError(
      'SendGrid',
      `Email send failed (${response.status}): ${errorText}`,
      { payload }
    )
  }

  // SendGrid returns 202 with X-Message-Id header
  const messageId = response.headers.get('X-Message-Id') || `msg_${Date.now()}`
  
  return { messageId }
}

/**
 * Generate HTML content for missing receipt reminder
 */
function generateMissingReceiptHTML(notification: MissingReceiptNotification): string {
  const receiptRows = notification.missingReceipts.map(receipt => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${receipt.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${receipt.amount.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${new Date(receipt.date).toLocaleDateString()}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #dc2626;">${receipt.daysOverdue} days</td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Missing Receipts Reminder</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <div style="background-color: #3b82f6; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">📄 Missing Receipts Reminder</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">BooksFlowAI</p>
        </div>
        
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px 0; font-size: 16px;">Hi ${notification.clientName},</p>
          
          <p style="margin: 0 0 24px 0;">Your accountant <strong>${notification.accountantName}</strong> is waiting for ${notification.missingReceipts.length} receipt${notification.missingReceipts.length > 1 ? 's' : ''} to complete your bookkeeping.</p>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 24px 0;">
            <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">⚠️ Missing Receipts (${notification.missingReceipts.length})</h3>
            <p style="margin: 0; color: #92400e; font-size: 14px;">Total amount: <strong>$${notification.totalAmount.toFixed(2)}</strong></p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Transaction</th>
                <th style="padding: 12px; text-align: right; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Amount</th>
                <th style="padding: 12px; text-align: center; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Date</th>
                <th style="padding: 12px; text-align: center; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Overdue</th>
              </tr>
            </thead>
            <tbody>
              ${receiptRows}
            </tbody>
          </table>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${notification.portalUrl}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">Upload Receipts Now</a>
          </div>
          
          <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">Need help? Reply to this email or contact ${notification.accountantName} directly.</p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">This is an automated reminder from BooksFlowAI</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate text content for missing receipt reminder
 */
function generateMissingReceiptText(notification: MissingReceiptNotification): string {
  const receiptList = notification.missingReceipts.map(receipt => 
    `- ${receipt.description}: $${receipt.amount.toFixed(2)} (${new Date(receipt.date).toLocaleDateString()}) - ${receipt.daysOverdue} days overdue`
  ).join('\n')

  return `
Missing Receipts Reminder

Hi ${notification.clientName},

Your accountant ${notification.accountantName} is waiting for ${notification.missingReceipts.length} receipt${notification.missingReceipts.length > 1 ? 's' : ''} to complete your bookkeeping.

Missing Receipts (Total: $${notification.totalAmount.toFixed(2)}):
${receiptList}

Please upload these receipts as soon as possible:
${notification.portalUrl}

Quick Tips:
- Take clear photos with good lighting
- Include the entire receipt
- PDF scans work best for OCR accuracy

Need help? Reply to this email or contact ${notification.accountantName} directly.

Best regards,
BooksFlowAI Team
  `
}

/**
 * Generate HTML content for report ready notification
 */
function generateReportReadyHTML(notification: ReportReadyNotification): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Report Ready</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <div style="background-color: #10b981; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">📊 Your Report is Ready!</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">BooksFlowAI</p>
        </div>
        
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px 0; font-size: 16px;">Hi ${notification.clientName},</p>
          
          <p style="margin: 0 0 24px 0;">Great news! ${notification.accountantName} has completed your <strong>${notification.reportTitle}</strong> for ${notification.reportPeriod}.</p>
          
          <div style="background-color: #d1fae5; border: 1px solid #10b981; border-radius: 6px; padding: 20px; margin: 24px 0; text-align: center;">
            <h3 style="margin: 0 0 12px 0; color: #065f46; font-size: 18px;">✅ ${notification.reportTitle}</h3>
            <p style="margin: 0 0 16px 0; color: #065f46; font-size: 14px;">${notification.reportPeriod}</p>
            <a href="${notification.downloadUrl}" style="display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">Download Report (PDF)</a>
          </div>
          
          <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">Questions about your report? Contact ${notification.accountantName} or reply to this email.</p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">This notification was sent from BooksFlowAI</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate text content for report ready notification
 */
function generateReportReadyText(notification: ReportReadyNotification): string {
  return `
Your Report is Ready!

Hi ${notification.clientName},

Great news! ${notification.accountantName} has completed your ${notification.reportTitle} for ${notification.reportPeriod}.

Download your report here:
${notification.downloadUrl}

What's Included:
- Income and expense summary
- Transaction categorization
- Receipt matching status
- AI-powered insights and recommendations

Questions about your report? Contact ${notification.accountantName} or reply to this email.

Best regards,
BooksFlowAI Team
  `
}

/**
 * Generate HTML content for welcome notification
 */
function generateWelcomeHTML(notification: WelcomeNotification): string {
  const instructionsList = notification.setupInstructions.map(instruction => 
    `<li style="margin: 8px 0;">${instruction}</li>`
  ).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to BooksFlowAI</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <div style="background-color: #8b5cf6; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">🎉 Welcome to BooksFlowAI!</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Your Bookkeeping Just Got Easier</p>
        </div>
        
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px 0; font-size: 16px;">Hi ${notification.clientName},</p>
          
          <p style="margin: 0 0 24px 0;">Welcome to BooksFlowAI! Your accountant <strong>${notification.accountantName}</strong> has set up your account and you're ready to streamline your bookkeeping with AI-powered automation.</p>
          
          <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 20px; margin: 24px 0;">
            <h3 style="margin: 0 0 16px 0; color: #0c4a6e; font-size: 18px;">🚀 Getting Started</h3>
            <ol style="margin: 0; padding-left: 20px; color: #0c4a6e;">
              ${instructionsList}
            </ol>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${notification.portalUrl}" style="display: inline-block; background-color: #8b5cf6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">Access Your Portal</a>
          </div>
          
          <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">Need help getting started? Contact ${notification.accountantName} or reply to this email.</p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">Welcome to the future of bookkeeping with BooksFlowAI</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate text content for welcome notification
 */
function generateWelcomeText(notification: WelcomeNotification): string {
  const instructionsList = notification.setupInstructions.map((instruction, index) => 
    `${index + 1}. ${instruction}`
  ).join('\n')

  return `
Welcome to BooksFlowAI!

Hi ${notification.clientName},

Welcome to BooksFlowAI! Your accountant ${notification.accountantName} has set up your account and you're ready to streamline your bookkeeping with AI-powered automation.

Getting Started:
${instructionsList}

Access your portal here:
${notification.portalUrl}

What Makes BooksFlowAI Special:
- AI-powered receipt processing and categorization
- Automatic transaction matching
- Real-time collaboration with your accountant
- Intelligent insights and recommendations

Need help getting started? Contact ${notification.accountantName} or reply to this email.

Welcome to the future of bookkeeping!
BooksFlowAI Team
  `
}

/**
 * Get email sending statistics
 */
export async function getEmailStatistics(accountantId?: string): Promise<{
  totalSent: number
  successRate: number
  recentActivity: Array<{
    type: string
    recipient: string
    status: 'sent' | 'failed'
    timestamp: string
  }>
}> {
  try {
    // In a real implementation, this would query email logs from database
    // For now, return mock data
    return {
      totalSent: 0,
      successRate: 0,
      recentActivity: []
    }
  } catch (error) {
    logger.error('Error getting email statistics', error as Error, { accountantId })
    throw new Error(`Failed to get email statistics: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}