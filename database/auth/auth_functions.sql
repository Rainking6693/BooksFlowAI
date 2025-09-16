-- =============================================================================
-- Authentication Functions and Triggers
-- Solo Accountant AI SaaS - Multi-tenant Authentication Setup
-- =============================================================================

-- =============================================================================
-- USER MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client'),
    NEW.email_confirmed_at IS NOT NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update user profile when auth user is updated
CREATE OR REPLACE FUNCTION handle_user_updated()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET
    email = NEW.email,
    email_verified = NEW.email_confirmed_at IS NOT NULL,
    last_login_at = CASE 
      WHEN NEW.last_sign_in_at != OLD.last_sign_in_at THEN NEW.last_sign_in_at
      ELSE last_login_at
    END,
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update user profile
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_updated();

-- =============================================================================
-- CUSTOM ACCESS TOKEN CLAIMS
-- =============================================================================

-- Function to add custom claims to JWT token
CREATE OR REPLACE FUNCTION custom_access_token(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
  user_role user_role;
  user_organizations UUID[];
  user_clients UUID[];
BEGIN
  -- Get base claims
  claims := event->'claims';
  
  -- Get user information
  SELECT u.role INTO user_role
  FROM users u
  WHERE u.id = (event->>'user_id')::UUID;
  
  -- Get user's organizations
  SELECT ARRAY_AGG(om.organization_id) INTO user_organizations
  FROM organization_members om
  WHERE om.user_id = (event->>'user_id')::UUID;
  
  -- Get user's accessible clients
  SELECT ARRAY_AGG(DISTINCT client_id) INTO user_clients
  FROM (
    -- Direct client access
    SELECT cu.client_id FROM client_users cu WHERE cu.user_id = (event->>'user_id')::UUID
    UNION
    -- Organization clients
    SELECT c.id FROM clients c
    JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE om.user_id = (event->>'user_id')::UUID
  ) subq;
  
  -- Add custom claims
  claims := claims || jsonb_build_object(
    'user_role', user_role,
    'organizations', COALESCE(user_organizations, ARRAY[]::UUID[]),
    'clients', COALESCE(user_clients, ARRAY[]::UUID[])
  );
  
  -- Return the modified event
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- =============================================================================
-- INVITATION AND ONBOARDING FUNCTIONS
-- =============================================================================

-- Function to invite user to organization
CREATE OR REPLACE FUNCTION invite_user_to_organization(
  p_email VARCHAR(255),
  p_organization_id UUID,
  p_role user_role DEFAULT 'accountant',
  p_invited_by UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_invitation_id UUID;
BEGIN
  -- Check if inviter has permission
  IF NOT is_organization_member(p_organization_id) THEN
    RAISE EXCEPTION 'Insufficient permissions to invite users to this organization';
  END IF;
  
  -- Check if user already exists
  SELECT id INTO v_user_id FROM users WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    -- Create placeholder user (will be completed on signup)
    INSERT INTO users (email, role, is_active)
    VALUES (p_email, p_role, false)
    RETURNING id INTO v_user_id;
  END IF;
  
  -- Add to organization (if not already a member)
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (p_organization_id, v_user_id, p_role)
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  
  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_user_id,
    'client_invitation',
    'Organization Invitation',
    'You have been invited to join an organization',
    jsonb_build_object(
      'organization_id', p_organization_id,
      'invited_by', p_invited_by,
      'role', p_role
    )
  );
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invite user to client
CREATE OR REPLACE FUNCTION invite_user_to_client(
  p_email VARCHAR(255),
  p_client_id UUID,
  p_role user_role DEFAULT 'client',
  p_invited_by UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if inviter has permission
  IF NOT has_client_access(p_client_id) THEN
    RAISE EXCEPTION 'Insufficient permissions to invite users to this client';
  END IF;
  
  -- Check if user already exists
  SELECT id INTO v_user_id FROM users WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    -- Create placeholder user
    INSERT INTO users (email, role, is_active)
    VALUES (p_email, p_role, false)
    RETURNING id INTO v_user_id;
  END IF;
  
  -- Add to client (if not already a member)
  INSERT INTO client_users (client_id, user_id, role, invited_at)
  VALUES (p_client_id, v_user_id, p_role, NOW())
  ON CONFLICT (client_id, user_id) DO UPDATE SET
    invited_at = NOW();
  
  -- Create notification
  INSERT INTO notifications (user_id, client_id, type, title, message, data)
  VALUES (
    v_user_id,
    p_client_id,
    'client_invitation',
    'Client Access Invitation',
    'You have been granted access to a client account',
    jsonb_build_object(
      'client_id', p_client_id,
      'invited_by', p_invited_by,
      'role', p_role
    )
  );
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- AUDIT LOGGING FUNCTIONS
-- =============================================================================

-- Function to log data changes
CREATE OR REPLACE FUNCTION log_data_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action VARCHAR(10);
  v_user_id UUID;
  v_client_id UUID;
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'INSERT';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
  END IF;
  
  -- Get user ID from session
  v_user_id := auth.uid();
  
  -- Try to extract client_id from the record
  IF TG_TABLE_NAME IN ('transactions', 'receipts', 'transaction_categories', 'automation_settings', 'categorization_rules') THEN
    v_client_id := COALESCE(NEW.client_id, OLD.client_id);
  ELSIF TG_TABLE_NAME = 'clients' THEN
    v_client_id := COALESCE(NEW.id, OLD.id);
  END IF;
  
  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    client_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    ip_address,
    user_agent
  ) VALUES (
    v_user_id,
    v_client_id,
    v_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END,
    inet_client_addr(),
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limits(
  p_organization_id UUID,
  p_metric_name VARCHAR(100),
  p_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_period_start TIMESTAMPTZ;
BEGIN
  -- Get current period start
  v_period_start := DATE_TRUNC('month', NOW());
  
  -- Get current usage
  SELECT COALESCE(SUM(metric_value), 0) INTO v_current_usage
  FROM usage_metrics
  WHERE organization_id = p_organization_id
    AND metric_name = p_metric_name
    AND period_start = v_period_start;
  
  -- Get limit from subscription plan
  SELECT 
    CASE p_metric_name
      WHEN 'clients' THEN sp.max_clients
      WHEN 'transactions' THEN sp.max_transactions_per_month
      WHEN 'storage_gb' THEN sp.max_storage_gb
      ELSE NULL
    END INTO v_limit
  FROM organizations o
  JOIN organization_subscriptions os ON o.id = os.organization_id
  JOIN subscription_plans sp ON os.plan_id = sp.id
  WHERE o.id = p_organization_id
    AND os.status = 'active'
    AND os.current_period_end > NOW();
  
  -- Return true if within limits (or no limit)
  RETURN v_limit IS NULL OR (v_current_usage + p_increment) <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record usage
CREATE OR REPLACE FUNCTION record_usage(
  p_organization_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_metric_name VARCHAR(100),
  p_metric_value INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  v_period_start := DATE_TRUNC('month', NOW());
  v_period_end := v_period_start + INTERVAL '1 month' - INTERVAL '1 second';
  
  INSERT INTO usage_metrics (
    organization_id,
    client_id,
    metric_name,
    metric_value,
    period_start,
    period_end
  ) VALUES (
    p_organization_id,
    p_client_id,
    p_metric_name,
    p_metric_value,
    v_period_start,
    v_period_end
  )
  ON CONFLICT (organization_id, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::UUID), metric_name, period_start)
  DO UPDATE SET
    metric_value = usage_metrics.metric_value + p_metric_value,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;