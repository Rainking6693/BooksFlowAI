-- =============================================================================
-- Migration 07: Billing and Subscriptions
-- Solo Accountant AI SaaS - Subscription Management and Usage Tracking
-- =============================================================================

-- Subscription plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    tier subscription_tier NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    max_clients INTEGER,
    max_transactions_per_month INTEGER,
    max_storage_gb INTEGER,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization subscriptions
CREATE TABLE organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_end TIMESTAMPTZ,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    usage_stats JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value INTEGER NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_subscription_plans_tier ON subscription_plans(tier);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);

CREATE INDEX idx_organization_subscriptions_org_id ON organization_subscriptions(organization_id);
CREATE INDEX idx_organization_subscriptions_plan_id ON organization_subscriptions(plan_id);
CREATE INDEX idx_organization_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX idx_organization_subscriptions_period_end ON organization_subscriptions(current_period_end);

CREATE INDEX idx_usage_metrics_org_id ON usage_metrics(organization_id);
CREATE INDEX idx_usage_metrics_client_id ON usage_metrics(client_id);
CREATE INDEX idx_usage_metrics_metric_name ON usage_metrics(metric_name);
CREATE INDEX idx_usage_metrics_period ON usage_metrics(period_start, period_end);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_subscription_plans_updated_at 
    BEFORE UPDATE ON subscription_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_subscriptions_updated_at 
    BEFORE UPDATE ON organization_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();