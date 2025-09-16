-- =============================================================================
-- Row Level Security (RLS) Policies
-- Solo Accountant AI SaaS - Multi-tenant Security Configuration
-- =============================================================================
-- These policies ensure data isolation between organizations and proper
-- access control based on user roles and client relationships
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_categorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER FUNCTIONS FOR RLS
-- =============================================================================

-- Function to get current user ID from JWT
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::UUID;
$$ LANGUAGE SQL STABLE;

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role() RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if user is organization admin/accountant
CREATE OR REPLACE FUNCTION is_organization_member(org_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id 
    AND user_id = auth.uid()
    AND role IN ('admin', 'accountant')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if user has access to client
CREATE OR REPLACE FUNCTION has_client_access(client_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    -- Direct client access
    SELECT 1 FROM client_users 
    WHERE client_id = $1 AND user_id = auth.uid()
    UNION
    -- Organization member access
    SELECT 1 FROM clients c
    JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE c.id = $1 AND om.user_id = auth.uid()
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to get user's organization IDs
CREATE OR REPLACE FUNCTION get_user_organizations() RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(organization_id) 
  FROM organization_members 
  WHERE user_id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to get user's client IDs
CREATE OR REPLACE FUNCTION get_user_clients() RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(DISTINCT client_id) FROM (
    -- Direct client access
    SELECT client_id FROM client_users WHERE user_id = auth.uid()
    UNION
    -- Organization clients
    SELECT c.id FROM clients c
    JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE om.user_id = auth.uid()
  ) subq;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =============================================================================
-- USER POLICIES
-- =============================================================================

-- Users can view their own profile and users in their organizations
CREATE POLICY "Users can view accessible users" ON users FOR SELECT USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM organization_members om1
    JOIN organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid() AND om2.user_id = users.id
  ) OR
  EXISTS (
    SELECT 1 FROM client_users cu1
    JOIN client_users cu2 ON cu1.client_id = cu2.client_id
    WHERE cu1.user_id = auth.uid() AND cu2.user_id = users.id
  )
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (
  id = auth.uid()
);

-- Organization admins can create users
CREATE POLICY "Organization admins can create users" ON users FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'accountant')
);

-- =============================================================================
-- ORGANIZATION POLICIES
-- =============================================================================

-- Users can view organizations they belong to
CREATE POLICY "Users can view their organizations" ON organizations FOR SELECT USING (
  id = ANY(get_user_organizations())
);

-- Organization admins can update their organizations
CREATE POLICY "Admins can update organizations" ON organizations FOR UPDATE USING (
  is_organization_member(id) AND get_user_role() = 'admin'
);

-- Only system admins can create organizations
CREATE POLICY "System admins can create organizations" ON organizations FOR INSERT WITH CHECK (
  get_user_role() = 'admin'
);

-- =============================================================================
-- ORGANIZATION MEMBER POLICIES
-- =============================================================================

-- Users can view organization memberships for their organizations
CREATE POLICY "Users can view org memberships" ON organization_members FOR SELECT USING (
  user_id = auth.uid() OR is_organization_member(organization_id)
);

-- Organization admins can manage memberships
CREATE POLICY "Admins can manage memberships" ON organization_members FOR ALL USING (
  is_organization_member(organization_id) AND get_user_role() = 'admin'
);

-- =============================================================================
-- CLIENT POLICIES
-- =============================================================================

-- Users can view clients they have access to
CREATE POLICY "Users can view accessible clients" ON clients FOR SELECT USING (
  id = ANY(get_user_clients())
);

-- Organization members can create clients
CREATE POLICY "Organization members can create clients" ON clients FOR INSERT WITH CHECK (
  is_organization_member(organization_id)
);

-- Organization members can update their clients
CREATE POLICY "Organization members can update clients" ON clients FOR UPDATE USING (
  is_organization_member(organization_id)
);

-- =============================================================================
-- CLIENT USER POLICIES
-- =============================================================================

-- Users can view client relationships they have access to
CREATE POLICY "Users can view client relationships" ON client_users FOR SELECT USING (
  user_id = auth.uid() OR has_client_access(client_id)
);

-- Organization members can manage client users
CREATE POLICY "Organization members can manage client users" ON client_users FOR ALL USING (
  has_client_access(client_id)
);

-- =============================================================================
-- TRANSACTION POLICIES
-- =============================================================================

-- Users can view transactions for clients they have access to
CREATE POLICY "Users can view accessible transactions" ON transactions FOR SELECT USING (
  has_client_access(client_id)
);

-- Users can create/update transactions for accessible clients
CREATE POLICY "Users can manage accessible transactions" ON transactions FOR ALL USING (
  has_client_access(client_id)
);

-- =============================================================================
-- CATEGORY POLICIES
-- =============================================================================

-- Users can view categories for accessible clients
CREATE POLICY "Users can view accessible categories" ON transaction_categories FOR SELECT USING (
  has_client_access(client_id)
);

-- Users can manage categories for accessible clients
CREATE POLICY "Users can manage accessible categories" ON transaction_categories FOR ALL USING (
  has_client_access(client_id)
);

-- =============================================================================
-- RECEIPT POLICIES
-- =============================================================================

-- Users can view receipts for accessible clients
CREATE POLICY "Users can view accessible receipts" ON receipts FOR SELECT USING (
  has_client_access(client_id)
);

-- Users can manage receipts for accessible clients (must be uploader or have client access)
CREATE POLICY "Users can manage accessible receipts" ON receipts FOR ALL USING (
  uploaded_by = auth.uid() OR has_client_access(client_id)
);

-- =============================================================================
-- AI CATEGORIZATION POLICIES
-- =============================================================================

-- Users can view AI categorizations for accessible transactions
CREATE POLICY "Users can view accessible AI categorizations" ON ai_categorizations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.id = transaction_id AND has_client_access(t.client_id)
  )
);

-- Users can manage AI categorizations for accessible transactions
CREATE POLICY "Users can manage accessible AI categorizations" ON ai_categorizations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.id = transaction_id AND has_client_access(t.client_id)
  )
);

-- =============================================================================
-- QUICKBOOKS CONNECTION POLICIES
-- =============================================================================

-- Users can view QuickBooks connections for accessible clients
CREATE POLICY "Users can view accessible QB connections" ON quickbooks_connections FOR SELECT USING (
  has_client_access(client_id)
);

-- Organization members can manage QuickBooks connections
CREATE POLICY "Organization members can manage QB connections" ON quickbooks_connections FOR ALL USING (
  has_client_access(client_id) AND get_user_role() IN ('admin', 'accountant')
);

-- =============================================================================
-- CHART OF ACCOUNTS POLICIES
-- =============================================================================

-- Users can view chart of accounts for accessible clients
CREATE POLICY "Users can view accessible chart of accounts" ON chart_of_accounts FOR SELECT USING (
  has_client_access(client_id)
);

-- Organization members can manage chart of accounts
CREATE POLICY "Organization members can manage chart of accounts" ON chart_of_accounts FOR ALL USING (
  has_client_access(client_id) AND get_user_role() IN ('admin', 'accountant')
);

-- =============================================================================
-- AUTOMATION POLICIES
-- =============================================================================

-- Users can view automation settings for accessible clients
CREATE POLICY "Users can view accessible automation settings" ON automation_settings FOR SELECT USING (
  has_client_access(client_id)
);

-- Organization members can manage automation settings
CREATE POLICY "Users can manage accessible automation settings" ON automation_settings FOR ALL USING (
  has_client_access(client_id) AND get_user_role() IN ('admin', 'accountant')
);

-- Users can view categorization rules for accessible clients
CREATE POLICY "Users can view accessible categorization rules" ON categorization_rules FOR SELECT USING (
  has_client_access(client_id)
);

-- Users can manage categorization rules for accessible clients
CREATE POLICY "Users can manage accessible categorization rules" ON categorization_rules FOR ALL USING (
  has_client_access(client_id)
);

-- =============================================================================
-- NOTIFICATION POLICIES
-- =============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (
  user_id = auth.uid()
);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (
  user_id = auth.uid()
);

-- System can create notifications for users
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (
  true -- This will be controlled at the application level
);

-- =============================================================================
-- AUDIT LOG POLICIES
-- =============================================================================

-- Organization admins can view audit logs for their organization's data
CREATE POLICY "Admins can view org audit logs" ON audit_logs FOR SELECT USING (
  get_user_role() = 'admin' AND (
    client_id = ANY(get_user_clients()) OR
    user_id IN (
      SELECT om.user_id FROM organization_members om
      WHERE om.organization_id = ANY(get_user_organizations())
    )
  )
);

-- System can create audit logs
CREATE POLICY "System can create audit logs" ON audit_logs FOR INSERT WITH CHECK (
  true -- This will be controlled at the application level
);

-- =============================================================================
-- BILLING POLICIES
-- =============================================================================

-- Everyone can view subscription plans
CREATE POLICY "Everyone can view subscription plans" ON subscription_plans FOR SELECT USING (
  is_active = true
);

-- Organization admins can view their subscription
CREATE POLICY "Admins can view org subscriptions" ON organization_subscriptions FOR SELECT USING (
  is_organization_member(organization_id) AND get_user_role() = 'admin'
);

-- Organization admins can view their usage metrics
CREATE POLICY "Admins can view org usage metrics" ON usage_metrics FOR SELECT USING (
  is_organization_member(organization_id) AND get_user_role() = 'admin'
);

-- =============================================================================
-- RECEIPT EXTRACTION POLICIES
-- =============================================================================

-- Users can view receipt extractions for accessible receipts
CREATE POLICY "Users can view accessible receipt extractions" ON receipt_extractions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM receipts r 
    WHERE r.id = receipt_id AND has_client_access(r.client_id)
  )
);

-- System can create receipt extractions
CREATE POLICY "System can create receipt extractions" ON receipt_extractions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM receipts r 
    WHERE r.id = receipt_id AND has_client_access(r.client_id)
  )
);