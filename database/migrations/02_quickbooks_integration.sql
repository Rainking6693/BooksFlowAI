-- =============================================================================
-- Migration 02: QuickBooks Integration Tables
-- Solo Accountant AI SaaS - QuickBooks Connection and Chart of Accounts
-- =============================================================================

-- QuickBooks connections
CREATE TABLE quickbooks_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    company_id VARCHAR(255) NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    realm_id VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status integration_status DEFAULT 'connected',
    last_sync_at TIMESTAMPTZ,
    sync_settings JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id)
);

-- Chart of accounts from QuickBooks
CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    quickbooks_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(100) NOT NULL,
    account_sub_type VARCHAR(100),
    account_number VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    balance DECIMAL(15,2) DEFAULT 0,
    parent_account_id UUID REFERENCES chart_of_accounts(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, quickbooks_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_quickbooks_connections_client_id ON quickbooks_connections(client_id);
CREATE INDEX idx_quickbooks_connections_status ON quickbooks_connections(status);
CREATE INDEX idx_chart_of_accounts_client_id ON chart_of_accounts(client_id);
CREATE INDEX idx_chart_of_accounts_quickbooks_id ON chart_of_accounts(quickbooks_id);
CREATE INDEX idx_chart_of_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX idx_chart_of_accounts_active ON chart_of_accounts(is_active);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_quickbooks_connections_updated_at 
    BEFORE UPDATE ON quickbooks_connections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chart_of_accounts_updated_at 
    BEFORE UPDATE ON chart_of_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();