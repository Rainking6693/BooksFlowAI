# QuickBooks API Integration Documentation

This document outlines the QuickBooks Online API endpoints and data structures needed for BooksFlowAI's transaction categorization system.

## API Overview

### Base URLs
- **Sandbox**: `https://sandbox-quickbooks.api.intuit.com`
- **Production**: `https://quickbooks.api.intuit.com`

### Authentication
All API calls require OAuth 2.0 Bearer token in the Authorization header:
```
Authorization: Bearer {access_token}
```

## Core Endpoints for Transaction Data

### 1. Company Information
Get basic company details for the connected QuickBooks account.

**Endpoint**: `GET /v3/companyinfo/{companyId}/companyinfo/{companyId}`

**Sample Request**:
```bash
curl -X GET \
  "https://sandbox-quickbooks.api.intuit.com/v3/companyinfo/123456789/companyinfo/123456789" \
  -H "Authorization: Bearer {access_token}" \
  -H "Accept: application/json"
```

**Sample Response**:
```json
{
  "QueryResponse": {
    "CompanyInfo": [{
      "Name": "Sample Company",
      "CompanyAddr": {
        "Line1": "123 Main Street",
        "City": "Anytown",
        "CountrySubDivisionCode": "CA",
        "PostalCode": "94042",
        "Country": "US"
      },
      "Country": "US",
      "FiscalYearStartMonth": "January"
    }]
  }
}
```

### 2. Bank Accounts
Retrieve all bank accounts for transaction synchronization.

**Endpoint**: `GET /v3/companyinfo/{companyId}/accounts`

**Query Parameters**:
- `query`: `SELECT * FROM Account WHERE AccountType = 'Bank'`

**Sample Request**:
```bash
curl -X GET \
  "https://sandbox-quickbooks.api.intuit.com/v3/companyinfo/123456789/accounts?query=SELECT * FROM Account WHERE AccountType = 'Bank'" \
  -H "Authorization: Bearer {access_token}" \
  -H "Accept: application/json"
```

**Sample Response**:
```json
{
  "QueryResponse": {
    "Account": [
      {
        "Id": "35",
        "Name": "Checking",
        "SubAccount": false,
        "AccountType": "Bank",
        "AccountSubType": "Checking",
        "CurrentBalance": 1201.00,
        "CurrentBalanceWithSubAccounts": 1201.00,
        "CurrencyRef": {
          "value": "USD",
          "name": "United States Dollar"
        }
      }
    ]
  }
}
```

### 3. Transactions (Bank Deposits)
Get bank deposit transactions for AI categorization.

**Endpoint**: `GET /v3/companyinfo/{companyId}/deposits`

**Query Parameters**:
- `query`: `SELECT * FROM Deposit WHERE TxnDate >= '2024-01-01'`

**Sample Request**:
```bash
curl -X GET \
  "https://sandbox-quickbooks.api.intuit.com/v3/companyinfo/123456789/deposits?query=SELECT * FROM Deposit WHERE TxnDate >= '2024-01-01'" \
  -H "Authorization: Bearer {access_token}" \
  -H "Accept: application/json"
```

### 4. Purchase Transactions
Get purchase/expense transactions for categorization.

**Endpoint**: `GET /v3/companyinfo/{companyId}/purchases`

**Query Parameters**:
- `query`: `SELECT * FROM Purchase WHERE TxnDate >= '2024-01-01'`

**Sample Request**:
```bash
curl -X GET \
  "https://sandbox-quickbooks.api.intuit.com/v3/companyinfo/123456789/purchases?query=SELECT * FROM Purchase WHERE TxnDate >= '2024-01-01'" \
  -H "Authorization: Bearer {access_token}" \
  -H "Accept: application/json"
```

**Sample Response**:
```json
{
  "QueryResponse": {
    "Purchase": [
      {
        "Id": "146",
        "TxnDate": "2024-01-15",
        "AccountRef": {
          "value": "35",
          "name": "Checking"
        },
        "PaymentType": "Check",
        "EntityRef": {
          "value": "56",
          "name": "Office Supply Store"
        },
        "TotalAmt": 157.50,
        "Line": [
          {
            "Id": "1",
            "Amount": 157.50,
            "DetailType": "AccountBasedExpenseLineDetail",
            "AccountBasedExpenseLineDetail": {
              "AccountRef": {
                "value": "7",
                "name": "Office Supplies"
              }
            }
          }
        ]
      }
    ]
  }
}
```

### 5. Items/Products
Get items for transaction categorization mapping.

**Endpoint**: `GET /v3/companyinfo/{companyId}/items`

**Sample Request**:
```bash
curl -X GET \
  "https://sandbox-quickbooks.api.intuit.com/v3/companyinfo/123456789/items" \
  -H "Authorization: Bearer {access_token}" \
  -H "Accept: application/json"
```

### 6. Chart of Accounts
Get all accounts for proper categorization mapping.

**Endpoint**: `GET /v3/companyinfo/{companyId}/accounts`

**Sample Request**:
```bash
curl -X GET \
  "https://sandbox-quickbooks.api.intuit.com/v3/companyinfo/123456789/accounts" \
  -H "Authorization: Bearer {access_token}" \
  -H "Accept: application/json"
```

**Sample Response**:
```json
{
  "QueryResponse": {
    "Account": [
      {
        "Id": "7",
        "Name": "Office Supplies",
        "AccountType": "Expense",
        "AccountSubType": "SuppliesMaterials",
        "Classification": "Expense",
        "CurrentBalance": 0,
        "Active": true
      }
    ]
  }
}
```

## Data Mapping for AI Categorization

### Transaction Data Structure
Each transaction will be mapped to this standardized format for AI processing:

```json
{
  "id": "qb_146",
  "date": "2024-01-15",
  "amount": 157.50,
  "description": "Office Supply Store - Office Supplies",
  "account": "Checking",
  "vendor": "Office Supply Store",
  "category": "Office Supplies",
  "type": "expense",
  "source": "quickbooks",
  "raw_data": { /* Original QB response */ }
}
```

### Category Mapping
Map QuickBooks account types to standardized categories:

```javascript
const categoryMapping = {
  // Income Categories
  "Income": "revenue",
  "OtherIncome": "other_income",
  
  // Expense Categories
  "Expense": "expense",
  "CostOfGoodsSold": "cogs",
  "OtherExpense": "other_expense",
  
  // Asset Categories
  "Bank": "cash",
  "AccountsReceivable": "receivables",
  "Inventory": "inventory",
  "FixedAsset": "fixed_assets",
  
  // Liability Categories
  "AccountsPayable": "payables",
  "CreditCard": "credit_card",
  "LongTermLiability": "long_term_debt"
};
```

## OAuth 2.0 Implementation

### 1. Authorization URL
```javascript
const authUrl = `https://appcenter.intuit.com/connect/oauth2?` +
  `client_id=${clientId}&` +
  `scope=com.intuit.quickbooks.accounting&` +
  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  `response_type=code&` +
  `access_type=offline`;
```

### 2. Token Exchange
**Endpoint**: `POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`

**Request Body**:
```
grant_type=authorization_code&
code={authorization_code}&
redirect_uri={redirect_uri}
```

**Headers**:
```
Authorization: Basic {base64(client_id:client_secret)}
Content-Type: application/x-www-form-urlencoded
```

### 3. Token Refresh
**Request Body**:
```
grant_type=refresh_token&
refresh_token={refresh_token}
```

## Error Handling

### Common Error Responses
```json
{
  "Fault": {
    "Error": [
      {
        "code": "ValidationFault",
        "Detail": "Invalid query",
        "type": "ValidationFault"
      }
    ],
    "type": "ValidationFault"
  }
}
```

### Rate Limiting
- Monitor `X-RateLimit-Remaining` header
- Implement exponential backoff for 429 responses
- Queue requests during rate limit periods

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request (invalid query)
- `401`: Unauthorized (invalid token)
- `403`: Forbidden (insufficient scope)
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error

## Webhook Implementation (Optional)

For real-time transaction updates, implement webhooks:

**Webhook URL**: `https://booksflow.ai/api/webhooks/quickbooks`

**Sample Webhook Payload**:
```json
{
  "eventNotifications": [
    {
      "realmId": "123456789",
      "dataChangeEvent": {
        "entities": [
          {
            "name": "Purchase",
            "id": "146",
            "operation": "Create",
            "lastUpdated": "2024-01-15T10:30:00-08:00"
          }
        ]
      }
    }
  ]
}
```

## Performance Optimization

### 1. Batch Queries
Use compound queries to reduce API calls:
```sql
SELECT * FROM Purchase WHERE TxnDate >= '2024-01-01' MAXRESULTS 1000
```

### 2. Incremental Sync
Store last sync timestamp and query only new/updated records:
```sql
SELECT * FROM Purchase WHERE MetaData.LastUpdatedTime >= '2024-01-15T10:00:00-08:00'
```

### 3. Pagination
Handle large datasets with pagination:
```sql
SELECT * FROM Purchase STARTPOSITION 1 MAXRESULTS 1000
```

## Integration Checklist for Day 2

- [ ] Implement OAuth 2.0 flow in FastAPI
- [ ] Create database models for QB transaction data
- [ ] Build transaction sync service
- [ ] Implement error handling and retry logic
- [ ] Add rate limiting compliance
- [ ] Create webhook endpoints (optional)
- [ ] Test with sandbox data
- [ ] Integrate with AI categorization pipeline

This API documentation provides all necessary endpoints and data structures for implementing QuickBooks integration in BooksFlowAI's transaction categorization system.