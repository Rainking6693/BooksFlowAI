-- =============================================================================
-- Migration 03: Transactions and Categories
-- Solo Accountant AI SaaS - Transaction Management and Categorization
-- =============================================================================

-- Transaction categories
CREATE TABLE transaction_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_type VARCHAR(100),
    parent_category_id UUID REFERENCES transaction_categories(id),
    quickbooks_category_id VARCHAR(255),
    is_default BOOLEAN DEFAULT false,
    color VARCHAR(7),
    icon VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, name)
);

-- Financial transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    quickbooks_id VARCHAR(255),
    transaction_type transaction_type NOT NULL,
    transaction_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    memo TEXT,
    reference_number VARCHAR(100),
    status transaction_status DEFAULT 'pending',
    account_id UUID REFERENCES chart_of_accounts(id),
    customer_vendor VARCHAR(255),
    category_id UUID REFERENCES transaction_categories(id),
    subcategory_id UUID REFERENCES transaction_categories(id),
    tax_amount DECIMAL(15,2) DEFAULT 0,
    is_billable BOOLEAN DEFAULT false,
    is_reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMPTZ,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI categorization history
CREATE TABLE ai_categorizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    suggested_category_id UUID NOT NULL REFERENCES transaction_categories(id),
    confidence_score DECIMAL(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    confidence_level confidence_level NOT NULL,
    reasoning TEXT,
    model_version VARCHAR(50),
    features_used JSONB,
    is_accepted BOOLEAN,
    accepted_by UUID REFERENCES users(id),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_transaction_categories_client_id ON transaction_categories(client_id);
CREATE INDEX idx_transaction_categories_type ON transaction_categories(category_type);
CREATE INDEX idx_transaction_categories_parent ON transaction_categories(parent_category_id);

CREATE INDEX idx_transactions_client_id ON transactions(client_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_amount ON transactions(amount);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_quickbooks_id ON transactions(quickbooks_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);

CREATE INDEX idx_ai_categorizations_transaction_id ON ai_categorizations(transaction_id);
CREATE INDEX idx_ai_categorizations_confidence ON ai_categorizations(confidence_level);
CREATE INDEX idx_ai_categorizations_accepted ON ai_categorizations(is_accepted);
CREATE INDEX idx_ai_categorizations_category_id ON ai_categorizations(suggested_category_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_transaction_categories_updated_at 
    BEFORE UPDATE ON transaction_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();