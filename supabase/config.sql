-- Solo Accountant AI - Supabase Database Schema
-- Initial setup for Day 1 Foundation

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('accountant', 'client', 'admin');
CREATE TYPE subscription_tier AS ENUM ('starter', 'pro', 'enterprise');
CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'rejected', 'processing');
CREATE TYPE ai_confidence_level AS ENUM ('high', 'medium', 'low');

-- ============================================================================
-- CORE USER MANAGEMENT
-- ============================================================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'accountant',
    avatar_url TEXT,
    phone TEXT,
    company_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accountants table (for CPA/accounting professionals)
CREATE TABLE accountants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    license_number TEXT,
    firm_name TEXT,
    specializations TEXT[],
    years_experience INTEGER,
    subscription_tier subscription_tier DEFAULT 'starter',
    subscription_status TEXT DEFAULT 'active',
    quickbooks_connected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table (small business owners)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    accountant_id UUID REFERENCES accountants(id) ON DELETE CASCADE NOT NULL,
    business_name TEXT NOT NULL,
    business_type TEXT,
    tax_id TEXT,
    address JSONB,
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- QUICKBOOKS INTEGRATION
-- ============================================================================

-- QuickBooks connections
CREATE TABLE quickbooks_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accountant_id UUID REFERENCES accountants(id) ON DELETE CASCADE NOT NULL,
    company_id TEXT NOT NULL, -- QuickBooks company ID
    company_name TEXT NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sandbox_mode BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status TEXT DEFAULT 'connected',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(accountant_id, company_id)
);

-- ============================================================================
-- TRANSACTION MANAGEMENT
-- ============================================================================

-- Transaction categories (Chart of Accounts)
CREATE TABLE transaction_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accountant_id UUID REFERENCES accountants(id) ON DELETE CASCADE NOT NULL,
    quickbooks_id TEXT, -- QuickBooks account ID
    name TEXT NOT NULL,
    category_type TEXT NOT NULL, -- Income, Expense, Asset, Liability, Equity
    parent_category_id UUID REFERENCES transaction_categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions (imported from QuickBooks)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accountant_id UUID REFERENCES accountants(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    quickbooks_id TEXT, -- QuickBooks transaction ID
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    vendor_name TEXT,
    account_name TEXT,
    category_id UUID REFERENCES transaction_categories(id),
    ai_suggested_category_id UUID REFERENCES transaction_categories(id),
    ai_confidence ai_confidence_level,
    ai_reasoning TEXT,
    status transaction_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- RECEIPT MANAGEMENT
-- ============================================================================

-- Receipts uploaded by clients
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    ocr_data JSONB, -- Extracted data from OCR
    ocr_confidence DECIMAL(3,2), -- 0.00 to 1.00
    vendor_extracted TEXT,
    amount_extracted DECIMAL(12,2),
    date_extracted DATE,
    is_matched BOOLEAN DEFAULT FALSE,
    match_confidence DECIMAL(3,2),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- REPORTING SYSTEM
-- ============================================================================

-- Generated reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accountant_id UUID REFERENCES accountants(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    report_type TEXT NOT NULL, -- monthly, quarterly, annual, custom
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    title TEXT NOT NULL,
    ai_summary TEXT, -- AI-generated plain English summary
    report_data JSONB NOT NULL, -- Charts, tables, insights
    pdf_path TEXT, -- Generated PDF file path
    shared_with_client BOOLEAN DEFAULT FALSE,
    shared_at TIMESTAMP WITH TIME ZONE,
    client_viewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATION SYSTEM
-- ============================================================================

-- Notification templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    body_template TEXT NOT NULL,
    notification_type TEXT NOT NULL, -- email, sms, in_app
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sent notifications log
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB, -- Additional data like email provider response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AUDIT TRAIL
-- ============================================================================

-- Activity log for compliance and debugging
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL, -- transaction, receipt, report, etc.
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User and role indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Transaction indexes
CREATE INDEX idx_transactions_accountant_id ON transactions(accountant_id);
CREATE INDEX idx_transactions_client_id ON transactions(client_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_ai_confidence ON transactions(ai_confidence);

-- Receipt indexes
CREATE INDEX idx_receipts_client_id ON receipts(client_id);
CREATE INDEX idx_receipts_transaction_id ON receipts(transaction_id);
CREATE INDEX idx_receipts_uploaded_at ON receipts(uploaded_at);
CREATE INDEX idx_receipts_is_matched ON receipts(is_matched);

-- Report indexes
CREATE INDEX idx_reports_accountant_id ON reports(accountant_id);
CREATE INDEX idx_reports_client_id ON reports(client_id);
CREATE INDEX idx_reports_period ON reports(period_start, period_end);

-- Notification indexes
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);

-- Activity log indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountants ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Accountants: Can only see their own data
CREATE POLICY "Accountants can view own data" ON accountants
    FOR ALL USING (user_id = auth.uid());

-- Clients: Can only see their own data + their accountant can see them
CREATE POLICY "Clients can view own data" ON clients
    FOR SELECT USING (
        user_id = auth.uid() OR 
        accountant_id IN (SELECT id FROM accountants WHERE user_id = auth.uid())
    );

-- Transactions: Accountants see their transactions, clients see their own
CREATE POLICY "Transaction access control" ON transactions
    FOR SELECT USING (
        accountant_id IN (SELECT id FROM accountants WHERE user_id = auth.uid()) OR
        client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    );

-- Receipts: Clients can manage their receipts, accountants can view them
CREATE POLICY "Receipt access control" ON receipts
    FOR ALL USING (
        client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
        client_id IN (
            SELECT c.id FROM clients c 
            JOIN accountants a ON c.accountant_id = a.id 
            WHERE a.user_id = auth.uid()
        )
    );

-- Reports: Accountants can manage, clients can view their own
CREATE POLICY "Report access control" ON reports
    FOR SELECT USING (
        accountant_id IN (SELECT id FROM accountants WHERE user_id = auth.uid()) OR
        client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    );

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accountants_updated_at BEFORE UPDATE ON accountants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Add activity logging to critical tables
CREATE TRIGGER log_transaction_activity AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_receipt_activity AFTER INSERT OR UPDATE OR DELETE ON receipts
    FOR EACH ROW EXECUTE FUNCTION log_activity();

-- ============================================================================
-- INITIAL DATA SEEDING
-- ============================================================================

-- Insert default notification templates
INSERT INTO notification_templates (name, subject, body_template, notification_type) VALUES
('missing_receipts_reminder', 
 'Missing Receipts - Action Required', 
 'Hi {{client_name}}, we''re missing receipts for {{missing_count}} transactions from {{period}}. Please upload them to keep your books up to date.',
 'email'),
('report_ready', 
 'Your {{report_type}} Report is Ready', 
 'Hi {{client_name}}, your {{report_type}} report for {{period}} is now available in your client portal.',
 'email'),
('ai_categorization_complete', 
 'AI Transaction Categorization Complete', 
 'Your QuickBooks transactions have been processed. {{high_confidence_count}} transactions were categorized with high confidence. Please review {{review_needed_count}} transactions that need your attention.',
 'email');

-- Insert default transaction categories (basic chart of accounts)
-- Note: These will be populated per accountant when they connect QuickBooks
-- This is just a reference structure

COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE accountants IS 'CPA and accounting professionals using the platform';
COMMENT ON TABLE clients IS 'Small business clients of accountants';
COMMENT ON TABLE transactions IS 'Financial transactions imported from QuickBooks';
COMMENT ON TABLE receipts IS 'Receipt images uploaded by clients with OCR data';
COMMENT ON TABLE reports IS 'AI-generated financial reports for clients';
COMMENT ON TABLE notifications IS 'Email and SMS notifications sent to users';
COMMENT ON TABLE activity_logs IS 'Audit trail for compliance and debugging';