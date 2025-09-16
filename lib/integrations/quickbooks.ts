/**
 * QuickBooks Online API Integration
 * Handles OAuth 2.0 authentication and API calls
 */

import { supabase } from '../supabase'

// QuickBooks API Configuration
export const QB_CONFIG = {
  clientId: process.env.QUICKBOOKS_CLIENT_ID!,
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
  redirectUri: process.env.QUICKBOOKS_REDIRECT_URI!,
  scope: 'com.intuit.quickbooks.accounting',
  discoveryDocument: 'https://appcenter.intuit.com/api/v1/connection/oauth2',
  sandboxBaseUrl: 'https://sandbox-quickbooks.api.intuit.com',
  productionBaseUrl: 'https://quickbooks.api.intuit.com',
  environment: process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox'
}

// QuickBooks API Types
export interface QBCompany {
  id: string
  name: string
  country: string
  currency: string
}

export interface QBTransaction {
  id: string
  txnDate: string
  amount: number
  description: string
  account: {
    name: string
    accountType: string
  }
  vendor?: {
    name: string
  }
  customer?: {
    name: string
  }
}

export interface QBAccount {
  id: string
  name: string
  accountType: string
  accountSubType: string
  active: boolean
}

export interface QBAuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  companyId: string
}

/**
 * Generate QuickBooks OAuth 2.0 authorization URL
 */
export function generateAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: QB_CONFIG.clientId,
    scope: QB_CONFIG.scope,
    redirect_uri: QB_CONFIG.redirectUri,
    response_type: 'code',
    access_type: 'offline',
    state: state
  })

  return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  realmId: string
): Promise<QBAuthTokens> {
  const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
  
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: QB_CONFIG.redirectUri
  })

  const credentials = Buffer.from(
    `${QB_CONFIG.clientId}:${QB_CONFIG.clientSecret}`
  ).toString('base64')

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: body.toString()
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`QuickBooks token exchange failed: ${error}`)
  }

  const data = await response.json()
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    companyId: realmId
  }
}

/**
 * Refresh expired access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<QBAuthTokens> {
  const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
  
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  })

  const credentials = Buffer.from(
    `${QB_CONFIG.clientId}:${QB_CONFIG.clientSecret}`
  ).toString('base64')

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: body.toString()
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`QuickBooks token refresh failed: ${error}`)
  }

  const data = await response.json()
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    companyId: '' // Will be filled from stored connection
  }
}

/**
 * Make authenticated API call to QuickBooks
 */
export async function makeQBApiCall(
  endpoint: string,
  accessToken: string,
  companyId: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  body?: any
): Promise<any> {
  const baseUrl = QB_CONFIG.environment === 'sandbox' 
    ? QB_CONFIG.sandboxBaseUrl 
    : QB_CONFIG.productionBaseUrl

  const url = `${baseUrl}/v3/company/${companyId}/${endpoint}`

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json'
  }

  if (method !== 'GET' && body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`QuickBooks API call failed: ${error}`)
  }

  return response.json()
}

/**
 * Get company information
 */
export async function getCompanyInfo(
  accessToken: string,
  companyId: string
): Promise<QBCompany> {
  const response = await makeQBApiCall(
    'companyinfo/1',
    accessToken,
    companyId
  )

  const company = response.QueryResponse.CompanyInfo[0]
  
  return {
    id: company.Id,
    name: company.CompanyName,
    country: company.Country,
    currency: company.Currency
  }
}

/**
 * Get chart of accounts
 */
export async function getAccounts(
  accessToken: string,
  companyId: string
): Promise<QBAccount[]> {
  const response = await makeQBApiCall(
    "accounts?fetchAll=true",
    accessToken,
    companyId
  )

  if (!response.QueryResponse.Account) {
    return []
  }

  return response.QueryResponse.Account.map((account: any) => ({
    id: account.Id,
    name: account.Name,
    accountType: account.AccountType,
    accountSubType: account.AccountSubType,
    active: account.Active
  }))
}

/**
 * Get transactions (items, purchases, sales)
 */
export async function getTransactions(
  accessToken: string,
  companyId: string,
  startDate?: string,
  endDate?: string
): Promise<QBTransaction[]> {
  const transactions: QBTransaction[] = []

  // Get Purchase transactions
  try {
    let query = "purchases?fetchAll=true"
    if (startDate && endDate) {
      query += `&where=TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`
    }

    const purchaseResponse = await makeQBApiCall(query, accessToken, companyId)
    
    if (purchaseResponse.QueryResponse.Purchase) {
      const purchases = purchaseResponse.QueryResponse.Purchase.map((purchase: any) => ({
        id: purchase.Id,
        txnDate: purchase.TxnDate,
        amount: purchase.TotalAmt,
        description: purchase.PrivateNote || `Purchase from ${purchase.EntityRef?.name || 'Unknown'}`,
        account: {
          name: purchase.AccountRef?.name || 'Unknown Account',
          accountType: 'Expense'
        },
        vendor: purchase.EntityRef ? {
          name: purchase.EntityRef.name
        } : undefined
      }))
      
      transactions.push(...purchases)
    }
  } catch (error) {
    console.error('Error fetching purchases:', error)
  }

  // Get Bill transactions
  try {
    let query = "bills?fetchAll=true"
    if (startDate && endDate) {
      query += `&where=TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`
    }

    const billResponse = await makeQBApiCall(query, accessToken, companyId)
    
    if (billResponse.QueryResponse.Bill) {
      const bills = billResponse.QueryResponse.Bill.map((bill: any) => ({
        id: bill.Id,
        txnDate: bill.TxnDate,
        amount: bill.TotalAmt,
        description: bill.PrivateNote || `Bill from ${bill.VendorRef?.name || 'Unknown'}`,
        account: {
          name: 'Accounts Payable',
          accountType: 'Liability'
        },
        vendor: bill.VendorRef ? {
          name: bill.VendorRef.name
        } : undefined
      }))
      
      transactions.push(...bills)
    }
  } catch (error) {
    console.error('Error fetching bills:', error)
  }

  // Get Sales Receipt transactions
  try {
    let query = "salesreceipts?fetchAll=true"
    if (startDate && endDate) {
      query += `&where=TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`
    }

    const salesResponse = await makeQBApiCall(query, accessToken, companyId)
    
    if (salesResponse.QueryResponse.SalesReceipt) {
      const sales = salesResponse.QueryResponse.SalesReceipt.map((sale: any) => ({
        id: sale.Id,
        txnDate: sale.TxnDate,
        amount: sale.TotalAmt,
        description: sale.PrivateNote || `Sale to ${sale.CustomerRef?.name || 'Unknown'}`,
        account: {
          name: 'Sales',
          accountType: 'Income'
        },
        customer: sale.CustomerRef ? {
          name: sale.CustomerRef.name
        } : undefined
      }))
      
      transactions.push(...sales)
    }
  } catch (error) {
    console.error('Error fetching sales receipts:', error)
  }

  return transactions.sort((a, b) => 
    new Date(b.txnDate).getTime() - new Date(a.txnDate).getTime()
  )
}

/**
 * Store QuickBooks connection in database
 */
export async function storeQBConnection(
  accountantId: string,
  tokens: QBAuthTokens,
  companyInfo: QBCompany
): Promise<void> {
  // In a real implementation, encrypt the tokens before storing
  const encryptedAccessToken = tokens.accessToken // TODO: Implement encryption
  const encryptedRefreshToken = tokens.refreshToken // TODO: Implement encryption

  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString()

  const { error } = await supabase
    .from('quickbooks_connections')
    .upsert({
      accountant_id: accountantId,
      company_id: tokens.companyId,
      company_name: companyInfo.name,
      access_token_encrypted: encryptedAccessToken,
      refresh_token_encrypted: encryptedRefreshToken,
      token_expires_at: expiresAt,
      sandbox_mode: QB_CONFIG.environment === 'sandbox',
      sync_status: 'connected',
      last_sync_at: new Date().toISOString()
    })

  if (error) {
    throw new Error(`Failed to store QuickBooks connection: ${error.message}`)
  }

  // Update accountant's QuickBooks connection status
  await supabase
    .from('accountants')
    .update({ quickbooks_connected: true })
    .eq('id', accountantId)
}

/**
 * Get stored QuickBooks connection
 */
export async function getQBConnection(accountantId: string) {
  const { data, error } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('accountant_id', accountantId)
    .eq('sync_status', 'connected')
    .single()

  if (error) {
    throw new Error(`Failed to get QuickBooks connection: ${error.message}`)
  }

  return data
}

/**
 * Sync transactions from QuickBooks to database
 */
export async function syncTransactions(
  accountantId: string,
  startDate?: string,
  endDate?: string
): Promise<{ synced: number; errors: string[] }> {
  const connection = await getQBConnection(accountantId)
  const errors: string[] = []
  let synced = 0

  try {
    // Check if token needs refresh
    const expiresAt = new Date(connection.token_expires_at)
    const now = new Date()
    
    let accessToken = connection.access_token_encrypted // TODO: Decrypt
    
    if (expiresAt <= now) {
      const refreshedTokens = await refreshAccessToken(connection.refresh_token_encrypted)
      accessToken = refreshedTokens.accessToken
      
      // Update stored tokens
      await supabase
        .from('quickbooks_connections')
        .update({
          access_token_encrypted: refreshedTokens.accessToken, // TODO: Encrypt
          refresh_token_encrypted: refreshedTokens.refreshToken, // TODO: Encrypt
          token_expires_at: new Date(Date.now() + refreshedTokens.expiresIn * 1000).toISOString()
        })
        .eq('id', connection.id)
    }

    // Fetch transactions from QuickBooks
    const qbTransactions = await getTransactions(
      accessToken,
      connection.company_id,
      startDate,
      endDate
    )

    // Store transactions in database
    for (const qbTxn of qbTransactions) {
      try {
        const { error } = await supabase
          .from('transactions')
          .upsert({
            accountant_id: accountantId,
            quickbooks_id: qbTxn.id,
            transaction_date: qbTxn.txnDate,
            description: qbTxn.description,
            amount: qbTxn.amount,
            vendor_name: qbTxn.vendor?.name,
            account_name: qbTxn.account.name,
            status: 'pending'
          })

        if (error) {
          errors.push(`Failed to store transaction ${qbTxn.id}: ${error.message}`)
        } else {
          synced++
        }
      } catch (err) {
        errors.push(`Error processing transaction ${qbTxn.id}: ${err}`)
      }
    }

    // Update last sync time
    await supabase
      .from('quickbooks_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id)

  } catch (error) {
    errors.push(`Sync failed: ${error}`)
  }

  return { synced, errors }
}

// QuickBooks Developer Setup Instructions
export const QB_SETUP_INSTRUCTIONS = `
# QuickBooks Developer Setup Instructions

## 1. Create QuickBooks Developer Account
1. Go to https://developer.intuit.com/
2. Sign up for a developer account
3. Create a new app for "QuickBooks Online API"

## 2. Configure App Settings
- App Name: Solo Accountant AI
- Description: AI-powered accounting automation for solo CPAs
- Redirect URI: ${QB_CONFIG.redirectUri}
- Scope: Accounting (com.intuit.quickbooks.accounting)

## 3. Get Credentials
- Client ID: Copy from app dashboard
- Client Secret: Copy from app dashboard
- Add to environment variables:
  - QUICKBOOKS_CLIENT_ID=your_client_id
  - QUICKBOOKS_CLIENT_SECRET=your_client_secret
  - QUICKBOOKS_REDIRECT_URI=${QB_CONFIG.redirectUri}
  - QUICKBOOKS_ENVIRONMENT=sandbox

## 4. Test Connection
1. Use sandbox company for testing
2. Complete OAuth flow
3. Verify transaction sync works
4. Test token refresh functionality

## 5. Production Setup
- Switch QUICKBOOKS_ENVIRONMENT to "production"
- Update redirect URI in QuickBooks app settings
- Test with real QuickBooks company
`