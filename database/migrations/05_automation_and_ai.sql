-- =============================================================================
-- Migration 05: Automation and AI Features
-- Solo Accountant AI SaaS - AI Categorization Rules and Automation Settings
-- =============================================================================

-- AI categorization rules
CREATE TABLE categorization_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL,
    category_id UUID NOT NULL REFERENCES transaction_categories(id),
    confidence_boost DECIMAL(3,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation settings
CREATE TABLE automation_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    auto_categorize_enabled BOOLEAN DEFAULT true,
    auto_categorize_threshold DECIMAL(3,2) DEFAULT 0.8,
    auto_match_receipts BOOLEAN DEFAULT true,
    auto_reconcile_enabled BOOLEAN DEFAULT false,
    notification_preferences JSONB DEFAULT '{}',
    ai_learning_enabled BOOLEAN DEFAULT true,
    backup_frequency VARCHAR(20) DEFAULT 'daily',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_categorization_rules_client_id ON categorization_rules(client_id);
CREATE INDEX idx_categorization_rules_category_id ON categorization_rules(category_id);
CREATE INDEX idx_categorization_rules_active ON categorization_rules(is_active);
CREATE INDEX idx_categorization_rules_priority ON categorization_rules(priority);
CREATE INDEX idx_categorization_rules_created_by ON categorization_rules(created_by);

CREATE INDEX idx_automation_settings_client_id ON automation_settings(client_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_categorization_rules_updated_at 
    BEFORE UPDATE ON categorization_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_settings_updated_at 
    BEFORE UPDATE ON automation_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();