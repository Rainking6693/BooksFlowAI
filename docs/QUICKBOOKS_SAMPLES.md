# QuickBooks Integration Sample Code

This document provides sample code and implementation examples for integrating QuickBooks with BooksFlowAI.

## Environment Variables Configuration

Create a `.env.local` file with your actual QuickBooks credentials:

```bash
# QuickBooks OAuth 2.0 Configuration
QUICKBOOKS_CLIENT_ID=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop
QUICKBOOKS_CLIENT_SECRET=1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcd
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/auth/quickbooks/callback
QUICKBOOKS_SCOPE=com.intuit.quickbooks.accounting
QUICKBOOKS_DISCOVERY_DOCUMENT_URL=https://appcenter.intuit.com/api/v1/connection/oauth2
QUICKBOOKS_SANDBOX_BASE_URL=https://sandbox-quickbooks.api.intuit.com
QUICKBOOKS_PRODUCTION_BASE_URL=https://quickbooks.api.intuit.com
QUICKBOOKS_ENVIRONMENT=sandbox
```

## FastAPI Backend Implementation

### 1. OAuth Configuration Service

```python
# services/quickbooks_auth.py
import os
import requests
import base64
from urllib.parse import urlencode
from typing import Dict, Optional

class QuickBooksAuth:
    def __init__(self):
        self.client_id = os.getenv("QUICKBOOKS_CLIENT_ID")
        self.client_secret = os.getenv("QUICKBOOKS_CLIENT_SECRET")
        self.redirect_uri = os.getenv("QUICKBOOKS_REDIRECT_URI")
        self.scope = os.getenv("QUICKBOOKS_SCOPE")
        self.discovery_url = os.getenv("QUICKBOOKS_DISCOVERY_DOCUMENT_URL")
        
    def get_authorization_url(self, state: str = None) -> str:
        """Generate QuickBooks OAuth authorization URL"""
        params = {
            "client_id": self.client_id,
            "scope": self.scope,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "access_type": "offline"
        }
        
        if state:
            params["state"] = state
            
        return f"https://appcenter.intuit.com/connect/oauth2?{urlencode(params)}"
    
    def exchange_code_for_tokens(self, authorization_code: str, realm_id: str) -> Dict:
        """Exchange authorization code for access and refresh tokens"""
        
        # Prepare credentials for Basic Auth
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {encoded_credentials}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        data = {
            "grant_type": "authorization_code",
            "code": authorization_code,
            "redirect_uri": self.redirect_uri
        }
        
        response = requests.post(
            "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
            headers=headers,
            data=data
        )
        
        if response.status_code == 200:
            tokens = response.json()
            tokens["realm_id"] = realm_id
            return tokens
        else:
            raise Exception(f"Token exchange failed: {response.text}")
    
    def refresh_access_token(self, refresh_token: str) -> Dict:
        """Refresh access token using refresh token"""
        
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {encoded_credentials}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }
        
        response = requests.post(
            "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
            headers=headers,
            data=data
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Token refresh failed: {response.text}")
```

### 2. QuickBooks API Service

```python
# services/quickbooks_api.py
import os
import requests
from typing import List, Dict, Optional
from datetime import datetime, timedelta

class QuickBooksAPI:
    def __init__(self, access_token: str, realm_id: str):
        self.access_token = access_token
        self.realm_id = realm_id
        self.environment = os.getenv("QUICKBOOKS_ENVIRONMENT", "sandbox")
        
        if self.environment == "sandbox":
            self.base_url = os.getenv("QUICKBOOKS_SANDBOX_BASE_URL")
        else:
            self.base_url = os.getenv("QUICKBOOKS_PRODUCTION_BASE_URL")
    
    def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """Make authenticated request to QuickBooks API"""
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json"
        }
        
        url = f"{self.base_url}/v3/companyinfo/{self.realm_id}/{endpoint}"
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 401:
            raise Exception("Access token expired or invalid")
        elif response.status_code == 429:
            raise Exception("Rate limit exceeded")
        else:
            raise Exception(f"API request failed: {response.text}")
    
    def get_company_info(self) -> Dict:
        """Get company information"""
        endpoint = f"companyinfo/{self.realm_id}"
        return self._make_request(endpoint)
    
    def get_bank_accounts(self) -> List[Dict]:
        """Get all bank accounts"""
        endpoint = "accounts"
        params = {
            "query": "SELECT * FROM Account WHERE AccountType = 'Bank'"
        }
        
        response = self._make_request(endpoint, params)
        return response.get("QueryResponse", {}).get("Account", [])
    
    def get_transactions(self, start_date: str = None, end_date: str = None) -> List[Dict]:
        """Get all transactions for AI categorization"""
        
        if not start_date:
            # Default to last 30 days
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        
        transactions = []
        
        # Get Purchase transactions (expenses)
        purchase_endpoint = "purchases"
        purchase_params = {
            "query": f"SELECT * FROM Purchase WHERE TxnDate >= '{start_date}' AND TxnDate <= '{end_date}'"
        }
        
        try:
            purchase_response = self._make_request(purchase_endpoint, purchase_params)
            purchases = purchase_response.get("QueryResponse", {}).get("Purchase", [])
            
            for purchase in purchases:
                transactions.append(self._format_transaction(purchase, "expense"))
        except Exception as e:
            print(f"Error fetching purchases: {e}")
        
        # Get Deposit transactions (income)
        deposit_endpoint = "deposits"
        deposit_params = {
            "query": f"SELECT * FROM Deposit WHERE TxnDate >= '{start_date}' AND TxnDate <= '{end_date}'"
        }
        
        try:
            deposit_response = self._make_request(deposit_endpoint, deposit_params)
            deposits = deposit_response.get("QueryResponse", {}).get("Deposit", [])
            
            for deposit in deposits:
                transactions.append(self._format_transaction(deposit, "income"))
        except Exception as e:
            print(f"Error fetching deposits: {e}")
        
        return transactions
    
    def _format_transaction(self, transaction: Dict, transaction_type: str) -> Dict:
        """Format QuickBooks transaction for AI categorization"""
        
        # Extract vendor/customer information
        entity_name = ""
        if "EntityRef" in transaction:
            entity_name = transaction["EntityRef"].get("name", "")
        
        # Extract account information
        account_name = ""
        if "AccountRef" in transaction:
            account_name = transaction["AccountRef"].get("name", "")
        
        # Extract line item details for better categorization
        description_parts = []
        category = ""
        
        if "Line" in transaction:
            for line in transaction["Line"]:
                if "AccountBasedExpenseLineDetail" in line:
                    account_detail = line["AccountBasedExpenseLineDetail"]
                    if "AccountRef" in account_detail:
                        category = account_detail["AccountRef"].get("name", "")
                        description_parts.append(category)
        
        # Build comprehensive description for AI
        description = f"{entity_name} - {' '.join(description_parts)}".strip(" -")
        if not description:
            description = f"{account_name} Transaction"
        
        return {
            "id": f"qb_{transaction['Id']}",
            "date": transaction["TxnDate"],
            "amount": float(transaction["TotalAmt"]),
            "description": description,
            "account": account_name,
            "vendor": entity_name,
            "category": category,
            "type": transaction_type,
            "source": "quickbooks",
            "realm_id": self.realm_id,
            "raw_data": transaction
        }
    
    def get_chart_of_accounts(self) -> List[Dict]:
        """Get chart of accounts for category mapping"""
        endpoint = "accounts"
        
        response = self._make_request(endpoint)
        return response.get("QueryResponse", {}).get("Account", [])
```

### 3. FastAPI Endpoints

```python
# routers/quickbooks.py
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from services.quickbooks_auth import QuickBooksAuth
from services.quickbooks_api import QuickBooksAPI
from database.models import QuickBooksConnection
from database.session import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/quickbooks", tags=["QuickBooks"])

@router.get("/auth")
async def initiate_quickbooks_auth(user_id: str):
    """Initiate QuickBooks OAuth flow"""
    
    auth_service = QuickBooksAuth()
    
    # Generate state parameter for security
    state = f"user_{user_id}_{int(time.time())}"
    
    authorization_url = auth_service.get_authorization_url(state)
    
    return {
        "authorization_url": authorization_url,
        "state": state
    }

@router.get("/callback")
async def quickbooks_callback(
    request: Request,
    code: str,
    realmId: str,
    state: str = None,
    db: Session = Depends(get_db)
):
    """Handle QuickBooks OAuth callback"""
    
    try:
        auth_service = QuickBooksAuth()
        
        # Exchange code for tokens
        tokens = auth_service.exchange_code_for_tokens(code, realmId)
        
        # Extract user_id from state parameter
        user_id = state.split("_")[1] if state else None
        
        # Save connection to database
        connection = QuickBooksConnection(
            user_id=user_id,
            realm_id=realmId,
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_expires_at=datetime.utcnow() + timedelta(seconds=tokens["expires_in"]),
            is_active=True
        )
        
        db.add(connection)
        db.commit()
        
        # Redirect to success page
        return RedirectResponse(url="/dashboard?quickbooks=connected")
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth callback failed: {str(e)}")

@router.get("/transactions")
async def get_transactions(
    user_id: str,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db)
):
    """Get QuickBooks transactions for AI categorization"""
    
    # Get user's QuickBooks connection
    connection = db.query(QuickBooksConnection).filter(
        QuickBooksConnection.user_id == user_id,
        QuickBooksConnection.is_active == True
    ).first()
    
    if not connection:
        raise HTTPException(status_code=404, detail="QuickBooks not connected")
    
    # Check if token needs refresh
    if connection.token_expires_at <= datetime.utcnow():
        auth_service = QuickBooksAuth()
        new_tokens = auth_service.refresh_access_token(connection.refresh_token)
        
        connection.access_token = new_tokens["access_token"]
        connection.refresh_token = new_tokens.get("refresh_token", connection.refresh_token)
        connection.token_expires_at = datetime.utcnow() + timedelta(seconds=new_tokens["expires_in"])
        db.commit()
    
    # Fetch transactions
    api_service = QuickBooksAPI(connection.access_token, connection.realm_id)
    transactions = api_service.get_transactions(start_date, end_date)
    
    return {
        "transactions": transactions,
        "count": len(transactions),
        "realm_id": connection.realm_id
    }

@router.get("/accounts")
async def get_chart_of_accounts(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get QuickBooks chart of accounts"""
    
    connection = db.query(QuickBooksConnection).filter(
        QuickBooksConnection.user_id == user_id,
        QuickBooksConnection.is_active == True
    ).first()
    
    if not connection:
        raise HTTPException(status_code=404, detail="QuickBooks not connected")
    
    api_service = QuickBooksAPI(connection.access_token, connection.realm_id)
    accounts = api_service.get_chart_of_accounts()
    
    return {
        "accounts": accounts,
        "count": len(accounts)
    }

@router.delete("/disconnect")
async def disconnect_quickbooks(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Disconnect QuickBooks integration"""
    
    connection = db.query(QuickBooksConnection).filter(
        QuickBooksConnection.user_id == user_id,
        QuickBooksConnection.is_active == True
    ).first()
    
    if connection:
        connection.is_active = False
        db.commit()
    
    return {"message": "QuickBooks disconnected successfully"}
```

### 4. Database Models

```python
# database/models.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class QuickBooksConnection(Base):
    __tablename__ = "quickbooks_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    realm_id = Column(String, nullable=False)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    token_expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class QuickBooksTransaction(Base):
    __tablename__ = "quickbooks_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    realm_id = Column(String, nullable=False)
    qb_transaction_id = Column(String, nullable=False)
    transaction_type = Column(String, nullable=False)  # expense, income
    date = Column(DateTime, nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(Text)
    account = Column(String)
    vendor = Column(String)
    category = Column(String)
    ai_category = Column(String)  # AI-suggested category
    ai_confidence = Column(Float)  # AI confidence score
    is_categorized = Column(Boolean, default=False)
    raw_data = Column(Text)  # JSON string of original QB response
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

## Frontend Integration Examples

### 1. React Component for QuickBooks Connection

```javascript
// components/QuickBooksConnect.jsx
import { useState } from 'react';

export default function QuickBooksConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      const response = await fetch('/api/quickbooks/auth?user_id=current_user');
      const data = await response.json();
      
      // Redirect to QuickBooks OAuth
      window.location.href = data.authorization_url;
    } catch (error) {
      console.error('QuickBooks connection failed:', error);
      setIsConnecting(false);
    }
  };

  return (
    <div className="quickbooks-connect">
      {!isConnected ? (
        <button 
          onClick={handleConnect}
          disabled={isConnecting}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isConnecting ? 'Connecting...' : 'Connect QuickBooks'}
        </button>
      ) : (
        <div className="text-green-600">
          ✓ QuickBooks Connected
        </div>
      )}
    </div>
  );
}
```

### 2. Transaction Sync Component

```javascript
// components/TransactionSync.jsx
import { useState, useEffect } from 'react';

export default function TransactionSync() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const syncTransactions = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/quickbooks/transactions?user_id=current_user');
      const data = await response.json();
      
      setTransactions(data.transactions);
      setLastSync(new Date());
    } catch (error) {
      console.error('Transaction sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="transaction-sync">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">QuickBooks Transactions</h3>
        <button 
          onClick={syncTransactions}
          disabled={isLoading}
          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
      
      {lastSync && (
        <p className="text-sm text-gray-600 mb-4">
          Last synced: {lastSync.toLocaleString()}
        </p>
      )}
      
      <div className="space-y-2">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="border p-3 rounded">
            <div className="flex justify-between">
              <span className="font-medium">{transaction.description}</span>
              <span className={`font-bold ${transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                {transaction.type === 'expense' ? '-' : '+'}${transaction.amount}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {transaction.date} • {transaction.category}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Testing with Sample Data

### Sandbox Test Credentials
Once you complete the setup, you'll receive sandbox credentials for testing:

```bash
# Sample sandbox environment variables
QUICKBOOKS_CLIENT_ID=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop
QUICKBOOKS_CLIENT_SECRET=1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcd
QUICKBOOKS_ENVIRONMENT=sandbox
```

### Test Cases
1. **OAuth Flow**: Test complete authorization flow
2. **Transaction Retrieval**: Fetch sample transactions
3. **Token Refresh**: Test token refresh mechanism
4. **Error Handling**: Test various error scenarios
5. **Rate Limiting**: Test API rate limit compliance

This implementation provides a complete foundation for QuickBooks integration with BooksFlowAI's AI-powered transaction categorization system.