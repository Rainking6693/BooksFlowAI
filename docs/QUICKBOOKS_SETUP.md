# QuickBooks Integration Setup Guide

## 🎯 Overview
This guide walks through setting up QuickBooks Online API integration for Solo Accountant AI.

## 📋 Prerequisites
- QuickBooks Developer Account
- Solo Accountant AI development environment
- Access to environment variables

## 🚀 Step-by-Step Setup

### Step 1: Create QuickBooks Developer Account
1. **Visit Developer Portal**
   - Go to https://developer.intuit.com/
   - Click "Sign up" or "Get started"
   - Use your business email address

2. **Verify Account**
   - Check email for verification link
   - Complete account verification
   - Accept developer terms of service

### Step 2: Create New App
1. **Access App Dashboard**
   - Login to developer.intuit.com
   - Click "My Apps" in top navigation
   - Click "Create an app"

2. **Configure App Details**
   ```
   App Name: Solo Accountant AI
   Description: AI-powered QuickBooks transaction categorization and client reporting for solo CPAs
   App Type: QuickBooks Online API
   ```

3. **Set Redirect URIs**
   ```
   Development: http://localhost:3000/api/auth/quickbooks/callback
   Production: https://your-domain.com/api/auth/quickbooks/callback
   ```

4. **Configure Scopes**
   - Select "Accounting" scope
   - This provides access to: `com.intuit.quickbooks.accounting`

### Step 3: Get API Credentials
1. **Copy Credentials**
   - Client ID: Found in "Keys & OAuth" tab
   - Client Secret: Found in "Keys & OAuth" tab
   - Save these securely - Client Secret is only shown once

2. **Environment Variables**
   Add to your `.env.local` file:
   ```bash
   # QuickBooks Integration
   QUICKBOOKS_CLIENT_ID=your_client_id_here
   QUICKBOOKS_CLIENT_SECRET=your_client_secret_here
   QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/auth/quickbooks/callback
   QUICKBOOKS_ENVIRONMENT=sandbox
   ```

### Step 4: Test Sandbox Connection
1. **Create Sandbox Company**
   - In developer dashboard, go to "Sandbox"
   - Create a test company or use existing
   - Note the Company ID for testing

2. **Test OAuth Flow**
   ```typescript
   // Test the authorization URL generation
   import { generateAuthUrl } from '@/lib/integrations/quickbooks'
   
   const authUrl = generateAuthUrl('test-state-123')
   console.log('Auth URL:', authUrl)
   ```

3. **Complete Authorization**
   - Visit the generated auth URL
   - Login with Intuit Developer credentials
   - Authorize the app for sandbox company
   - Verify redirect to callback URL

### Step 5: Verify API Access
1. **Test Company Info**
   ```typescript
   import { getCompanyInfo } from '@/lib/integrations/quickbooks'
   
   const company = await getCompanyInfo(accessToken, companyId)
   console.log('Company:', company)
   ```

2. **Test Transaction Sync**
   ```typescript
   import { getTransactions } from '@/lib/integrations/quickbooks'
   
   const transactions = await getTransactions(accessToken, companyId)
   console.log('Transactions:', transactions.length)
   ```

## 🔧 API Endpoints to Create

### 1. OAuth Initiation
```typescript
// pages/api/auth/quickbooks/authorize.ts
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const state = generateRandomState()
  const authUrl = generateAuthUrl(state)
  
  // Store state in session for verification
  req.session.qbState = state
  
  res.redirect(authUrl)
}
```

### 2. OAuth Callback
```typescript
// pages/api/auth/quickbooks/callback.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, realmId, state } = req.query
  
  // Verify state parameter
  if (state !== req.session.qbState) {
    return res.status(400).json({ error: 'Invalid state parameter' })
  }
  
  try {
    const tokens = await exchangeCodeForTokens(code as string, realmId as string)
    const company = await getCompanyInfo(tokens.accessToken, tokens.companyId)
    
    // Store connection in database
    await storeQBConnection(accountantId, tokens, company)
    
    res.redirect('/dashboard?qb=connected')
  } catch (error) {
    res.redirect('/dashboard?qb=error')
  }
}
```

### 3. Transaction Sync
```typescript
// pages/api/quickbooks/sync.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { accountantId } = req.body
  
  try {
    const result = await syncTransactions(accountantId)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
```

## 🔒 Security Considerations

### Token Storage
- **Encrypt tokens** before storing in database
- Use AES-256 encryption with environment-specific keys
- Rotate encryption keys regularly

### API Rate Limits
- QuickBooks allows 500 requests per minute
- Implement request queuing for bulk operations
- Cache frequently accessed data

### Error Handling
- Handle token expiration gracefully
- Implement automatic token refresh
- Log all API errors for debugging

## 📊 Testing Checklist

### Sandbox Testing
- [ ] OAuth flow completes successfully
- [ ] Company information retrieved
- [ ] Chart of accounts imported
- [ ] Transactions synced correctly
- [ ] Token refresh works
- [ ] Error handling tested

### Production Readiness
- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Redirect URIs updated in QB app
- [ ] Rate limiting implemented
- [ ] Error monitoring setup
- [ ] Backup/recovery tested

## 🚨 Common Issues & Solutions

### Issue: "Invalid Redirect URI"
**Solution:** Ensure redirect URI in QuickBooks app exactly matches the one in your code

### Issue: "Invalid Client"
**Solution:** Verify Client ID and Secret are correct and environment matches (sandbox vs production)

### Issue: "Token Expired"
**Solution:** Implement automatic token refresh using refresh token

### Issue: "Rate Limit Exceeded"
**Solution:** Implement request queuing and respect 500 requests/minute limit

## 📞 Support Resources

- **QuickBooks Developer Docs:** https://developer.intuit.com/app/developer/qbo/docs/api/accounting
- **OAuth 2.0 Guide:** https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0
- **API Explorer:** https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities
- **Developer Community:** https://help.developer.intuit.com/s/

## 🎯 Day 1 Success Criteria

For Day 1 foundation setup, we need:
- [ ] QuickBooks Developer account created
- [ ] App registered with correct settings
- [ ] API credentials configured in environment
- [ ] Basic OAuth flow documented
- [ ] Sandbox connection tested

**Next Steps for Day 2:**
- Implement OAuth endpoints
- Create transaction sync functionality
- Build AI categorization pipeline
- Test end-to-end flow