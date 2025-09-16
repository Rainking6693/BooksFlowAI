-- Solo Accountant AI - Initial Data Seeding
-- Run after main schema is applied

-- Insert default notification templates
INSERT INTO notification_templates (name, subject, body_template, notification_type) VALUES
('missing_receipts_reminder', 
 'Missing Receipts - Action Required', 
 'Hi {{client_name}}, we''re missing receipts for {{missing_count}} transactions from {{period}}. Please upload them to keep your books up to date. You can upload receipts at: {{portal_url}}',
 'email'),
('report_ready', 
 'Your {{report_type}} Report is Ready', 
 'Hi {{client_name}}, your {{report_type}} report for {{period}} is now available in your client portal. View it here: {{report_url}}',
 'email'),
('ai_categorization_complete', 
 'AI Transaction Categorization Complete', 
 'Your QuickBooks transactions have been processed. {{high_confidence_count}} transactions were categorized with high confidence. Please review {{review_needed_count}} transactions that need your attention.',
 'email'),
('welcome_accountant',
 'Welcome to Solo Accountant AI',
 'Welcome {{accountant_name}}! Your account is ready. Next steps: 1) Connect your QuickBooks account, 2) Add your first client, 3) Start automating your workflow.',
 'email'),
('welcome_client',
 'Welcome to {{accountant_firm}} Client Portal',
 'Hi {{client_name}}, {{accountant_name}} has invited you to their client portal. You can upload receipts, view reports, and communicate securely. Access your portal: {{portal_url}}',
 'email'),
('receipt_processed',
 'Receipt Processed Successfully',
 'Your receipt for {{vendor_name}} ({{amount}}) has been processed and matched to your transactions. Thank you for keeping your records up to date!',
 'email');

-- Insert sample transaction categories (basic chart of accounts)
-- These will be customized per accountant when they connect QuickBooks
INSERT INTO transaction_categories (id, accountant_id, name, category_type, is_active) VALUES
-- Income categories
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Sales Revenue', 'Income', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Service Revenue', 'Income', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Interest Income', 'Income', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Other Income', 'Income', true),

-- Expense categories
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Office Supplies', 'Expense', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Travel & Entertainment', 'Expense', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Professional Services', 'Expense', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Marketing & Advertising', 'Expense', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Utilities', 'Expense', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Rent', 'Expense', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Insurance', 'Expense', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Software & Subscriptions', 'Expense', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Bank Fees', 'Expense', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Meals & Entertainment', 'Expense', true),

-- Asset categories
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Checking Account', 'Asset', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Savings Account', 'Asset', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Accounts Receivable', 'Asset', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Equipment', 'Asset', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Inventory', 'Asset', true),

-- Liability categories
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Accounts Payable', 'Liability', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Credit Card', 'Liability', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Loans Payable', 'Liability', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Sales Tax Payable', 'Liability', true),

-- Equity categories
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Owner''s Equity', 'Equity', true),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'Retained Earnings', 'Equity', true);

-- Create a demo accountant profile for testing
INSERT INTO profiles (id, email, full_name, role, company_name) VALUES
('demo-accountant-id', 'demo@soloaccountantai.com', 'Demo Accountant', 'accountant', 'Demo CPA Firm');

INSERT INTO accountants (id, user_id, firm_name, specializations, years_experience, subscription_tier) VALUES
('demo-accountant-uuid', 'demo-accountant-id', 'Demo CPA Firm', ARRAY['Small Business', 'Tax Preparation'], 5, 'pro');

-- Create a demo client for testing
INSERT INTO profiles (id, email, full_name, role, company_name) VALUES
('demo-client-id', 'client@example.com', 'Demo Client', 'client', 'Demo Restaurant LLC');

INSERT INTO clients (id, user_id, accountant_id, business_name, business_type, notification_preferences) VALUES
('demo-client-uuid', 'demo-client-id', 'demo-accountant-uuid', 'Demo Restaurant LLC', 'Restaurant', 
 '{"email": true, "sms": false, "frequency": "weekly"}');

-- Create sample transactions for demo
INSERT INTO transactions (
    accountant_id, 
    client_id, 
    transaction_date, 
    description, 
    amount, 
    vendor_name, 
    account_name, 
    status,
    ai_confidence
) VALUES
('demo-accountant-uuid', 'demo-client-uuid', '2024-01-15', 'Office supplies purchase', -89.99, 'Staples', 'Office Supplies', 'pending', 'high'),
('demo-accountant-uuid', 'demo-client-uuid', '2024-01-16', 'Client payment received', 1500.00, 'ABC Corp', 'Accounts Receivable', 'approved', 'high'),
('demo-accountant-uuid', 'demo-client-uuid', '2024-01-17', 'Restaurant equipment repair', -245.50, 'Equipment Services Inc', 'Equipment Maintenance', 'pending', 'medium'),
('demo-accountant-uuid', 'demo-client-uuid', '2024-01-18', 'Monthly software subscription', -99.00, 'QuickBooks', 'Software & Subscriptions', 'approved', 'high'),
('demo-accountant-uuid', 'demo-client-uuid', '2024-01-19', 'Business lunch with client', -67.89, 'Downtown Bistro', 'Meals & Entertainment', 'pending', 'low'),
('demo-accountant-uuid', 'demo-client-uuid', '2024-01-20', 'Utility bill payment', -156.78, 'City Electric', 'Utilities', 'pending', 'high'),
('demo-accountant-uuid', 'demo-client-uuid', '2024-01-21', 'Marketing campaign', -500.00, 'Google Ads', 'Marketing & Advertising', 'pending', 'medium'),
('demo-accountant-uuid', 'demo-client-uuid', '2024-01-22', 'Insurance premium', -234.56, 'Business Insurance Co', 'Insurance', 'approved', 'high');

-- Create sample receipts for demo
INSERT INTO receipts (
    client_id,
    file_path,
    file_name,
    file_size,
    mime_type,
    vendor_extracted,
    amount_extracted,
    date_extracted,
    is_matched,
    match_confidence,
    ocr_confidence
) VALUES
('demo-client-uuid', '/uploads/receipts/staples_receipt.jpg', 'staples_receipt.jpg', 245678, 'image/jpeg', 'Staples', 89.99, '2024-01-15', true, 0.95, 0.98),
('demo-client-uuid', '/uploads/receipts/equipment_repair.pdf', 'equipment_repair.pdf', 156789, 'application/pdf', 'Equipment Services Inc', 245.50, '2024-01-17', true, 0.92, 0.96),
('demo-client-uuid', '/uploads/receipts/lunch_receipt.jpg', 'lunch_receipt.jpg', 123456, 'image/jpeg', 'Downtown Bistro', 67.89, '2024-01-19', false, 0.45, 0.87);

-- Create sample report for demo
INSERT INTO reports (
    accountant_id,
    client_id,
    report_type,
    period_start,
    period_end,
    title,
    ai_summary,
    report_data,
    shared_with_client
) VALUES
('demo-accountant-uuid', 'demo-client-uuid', 'monthly', '2024-01-01', '2024-01-31', 'January 2024 Financial Summary',
'Your business had a strong January with $1,500 in revenue and $1,393.72 in expenses, resulting in a net profit of $106.28. Key highlights: Equipment maintenance was higher than usual due to the repair, but this is a one-time expense. Your marketing investment of $500 should drive future revenue growth.',
'{"total_revenue": 1500.00, "total_expenses": 1393.72, "net_profit": 106.28, "expense_categories": {"office_supplies": 89.99, "equipment": 245.50, "software": 99.00, "meals": 67.89, "utilities": 156.78, "marketing": 500.00, "insurance": 234.56}, "insights": ["Equipment maintenance spike", "Strong revenue month", "Marketing investment made"]}',
true);

-- Update the demo accountant to show QuickBooks as connected
UPDATE accountants SET quickbooks_connected = true WHERE id = 'demo-accountant-uuid';

-- Add some activity logs for demo
INSERT INTO activity_logs (user_id, action, resource_type, resource_id, new_values) VALUES
('demo-accountant-id', 'INSERT', 'transactions', (SELECT id FROM transactions WHERE description = 'Client payment received' LIMIT 1), '{"status": "approved"}'),
('demo-accountant-id', 'UPDATE', 'transactions', (SELECT id FROM transactions WHERE description = 'Monthly software subscription' LIMIT 1), '{"status": "approved"}'),
('demo-client-id', 'INSERT', 'receipts', (SELECT id FROM receipts WHERE file_name = 'staples_receipt.jpg' LIMIT 1), '{"uploaded": true}');

-- Create indexes for better performance on demo data
CREATE INDEX IF NOT EXISTS idx_demo_transactions_date ON transactions(transaction_date) WHERE accountant_id = 'demo-accountant-uuid';
CREATE INDEX IF NOT EXISTS idx_demo_receipts_client ON receipts(client_id) WHERE client_id = 'demo-client-uuid';