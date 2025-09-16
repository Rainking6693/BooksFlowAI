/**
 * =============================================================================
 * Database Type Definitions
 * Solo Accountant AI SaaS - TypeScript Type Definitions
 * =============================================================================
 * Generated from PostgreSQL schema for type safety in the application
 */

export type UserRole = 'admin' | 'accountant' | 'client' | 'viewer';

export type TransactionType = 
  | 'invoice' 
  | 'payment' 
  | 'expense' 
  | 'deposit' 
  | 'transfer'
  | 'journal_entry' 
  | 'bill' 
  | 'credit_memo' 
  | 'refund'
  | 'payroll' 
  | 'tax_payment' 
  | 'loan_payment';

export type TransactionStatus = 'pending' | 'cleared' | 'reconciled' | 'voided';

export type ReceiptStatus = 'uploaded' | 'processing' | 'processed' | 'matched' | 'failed';

export type ConfidenceLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

export type NotificationType = 
  | 'transaction_categorized' 
  | 'receipt_processed' 
  | 'reconciliation_required'
  | 'anomaly_detected' 
  | 'report_ready' 
  | 'client_invitation' 
  | 'system_alert';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending_auth';

// =============================================================================
// TABLE INTERFACES
// =============================================================================

export interface User {
  id: string;
  email: string;
  password_hash?: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  phone?: string;
  timezone: string;
  avatar_url?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  tax_id?: string;
  logo_url?: string;
  subscription_tier: SubscriptionTier;
  subscription_expires_at?: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  permissions: Record<string, any>;
  joined_at: string;
  created_at: string;
}

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  business_type?: string;
  industry?: string;
  tax_id?: string;
  phone?: string;
  email?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  fiscal_year_end?: string;
  quickbooks_company_id?: string;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientUser {
  id: string;
  client_id: string;
  user_id: string;
  role: UserRole;
  permissions: Record<string, any>;
  invited_at?: string;
  accepted_at?: string;
  created_at: string;
}

export interface QuickBooksConnection {
  id: string;
  client_id: string;
  company_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  realm_id: string;
  expires_at: string;
  status: IntegrationStatus;
  last_sync_at?: string;
  sync_settings: Record<string, any>;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ChartOfAccount {
  id: string;
  client_id: string;
  quickbooks_id: string;
  name: string;
  account_type: string;
  account_sub_type?: string;
  account_number?: string;
  description?: string;
  is_active: boolean;
  balance: number;
  parent_account_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  client_id: string;
  quickbooks_id?: string;
  transaction_type: TransactionType;
  transaction_date: string;
  amount: number;
  description?: string;
  memo?: string;
  reference_number?: string;
  status: TransactionStatus;
  account_id?: string;
  customer_vendor?: string;
  category_id?: string;
  subcategory_id?: string;
  tax_amount: number;
  is_billable: boolean;
  is_reconciled: boolean;
  reconciled_at?: string;
  raw_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TransactionCategory {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  category_type?: string;
  parent_category_id?: string;
  quickbooks_category_id?: string;
  is_default: boolean;
  color?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface AICategorization {
  id: string;
  transaction_id: string;
  suggested_category_id: string;
  confidence_score: number;
  confidence_level: ConfidenceLevel;
  reasoning?: string;
  model_version?: string;
  features_used?: Record<string, any>;
  is_accepted?: boolean;
  accepted_by?: string;
  accepted_at?: string;
  created_at: string;
}

export interface Receipt {
  id: string;
  client_id: string;
  transaction_id?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: ReceiptStatus;
  uploaded_by: string;
  ocr_text?: string;
  ocr_confidence?: number;
  extracted_data?: Record<string, any>;
  processing_error?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReceiptExtraction {
  id: string;
  receipt_id: string;
  vendor_name?: string;
  transaction_date?: string;
  total_amount?: number;
  tax_amount?: number;
  currency: string;
  line_items?: Record<string, any>;
  confidence_scores?: Record<string, any>;
  extracted_fields?: Record<string, any>;
  processing_time_ms?: number;
  ocr_provider?: string;
  created_at: string;
}

export interface CategorizationRule {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  conditions: Record<string, any>;
  category_id: string;
  confidence_boost: number;
  is_active: boolean;
  priority: number;
  created_by: string;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationSettings {
  id: string;
  client_id: string;
  auto_categorize_enabled: boolean;
  auto_categorize_threshold: number;
  auto_match_receipts: boolean;
  auto_reconcile_enabled: boolean;
  notification_preferences: Record<string, any>;
  ai_learning_enabled: boolean;
  backup_frequency: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  client_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  read_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  client_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  description?: string;
  price_monthly: number;
  price_yearly?: number;
  max_clients?: number;
  max_transactions_per_month?: number;
  max_storage_gb?: number;
  features: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  usage_stats: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UsageMetric {
  id: string;
  organization_id: string;
  client_id?: string;
  metric_name: string;
  metric_value: number;
  period_start: string;
  period_end: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// =============================================================================
// SUPABASE DATABASE TYPE
// =============================================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Organization, 'id' | 'created_at'>>;
      };
      organization_members: {
        Row: OrganizationMember;
        Insert: Omit<OrganizationMember, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<OrganizationMember, 'id' | 'created_at'>>;
      };
      clients: {
        Row: Client;
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Client, 'id' | 'created_at'>>;
      };
      client_users: {
        Row: ClientUser;
        Insert: Omit<ClientUser, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ClientUser, 'id' | 'created_at'>>;
      };
      quickbooks_connections: {
        Row: QuickBooksConnection;
        Insert: Omit<QuickBooksConnection, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<QuickBooksConnection, 'id' | 'created_at'>>;
      };
      chart_of_accounts: {
        Row: ChartOfAccount;
        Insert: Omit<ChartOfAccount, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ChartOfAccount, 'id' | 'created_at'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Transaction, 'id' | 'created_at'>>;
      };
      transaction_categories: {
        Row: TransactionCategory;
        Insert: Omit<TransactionCategory, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<TransactionCategory, 'id' | 'created_at'>>;
      };
      ai_categorizations: {
        Row: AICategorization;
        Insert: Omit<AICategorization, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<AICategorization, 'id' | 'created_at'>>;
      };
      receipts: {
        Row: Receipt;
        Insert: Omit<Receipt, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Receipt, 'id' | 'created_at'>>;
      };
      receipt_extractions: {
        Row: ReceiptExtraction;
        Insert: Omit<ReceiptExtraction, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ReceiptExtraction, 'id' | 'created_at'>>;
      };
      categorization_rules: {
        Row: CategorizationRule;
        Insert: Omit<CategorizationRule, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<CategorizationRule, 'id' | 'created_at'>>;
      };
      automation_settings: {
        Row: AutomationSettings;
        Insert: Omit<AutomationSettings, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<AutomationSettings, 'id' | 'created_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<AuditLog, 'id' | 'created_at'>>;
      };
      subscription_plans: {
        Row: SubscriptionPlan;
        Insert: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SubscriptionPlan, 'id' | 'created_at'>>;
      };
      organization_subscriptions: {
        Row: OrganizationSubscription;
        Insert: Omit<OrganizationSubscription, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<OrganizationSubscription, 'id' | 'created_at'>>;
      };
      usage_metrics: {
        Row: UsageMetric;
        Insert: Omit<UsageMetric, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<UsageMetric, 'id' | 'created_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      transaction_type: TransactionType;
      transaction_status: TransactionStatus;
      receipt_status: ReceiptStatus;
      confidence_level: ConfidenceLevel;
      subscription_tier: SubscriptionTier;
      notification_type: NotificationType;
      integration_status: IntegrationStatus;
    };
  };
}