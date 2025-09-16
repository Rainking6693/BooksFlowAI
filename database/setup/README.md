# Database Setup Instructions

## Quick Start Guide

### 1. Supabase Project Setup

1. **Create a new Supabase project:**
   - Go to [https://supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose your organization
   - Enter project details:
     - Name: `solo-accountant-ai-saas`
     - Database Password: Generate a strong password
     - Region: Choose closest to your users

2. **Get your project credentials:**
   - Copy the Project URL and API keys from Settings > API
   - Update your `.env.local` file with the credentials

### 2. Local Development Setup

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Initialize Supabase in your project:**
   ```bash
   supabase init
   ```

3. **Link to your remote project:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. **Start local development server:**
   ```bash
   supabase start
   ```

### 3. Database Schema Setup

#### Option A: Remote Database (Recommended for team development)

1. **Run migrations on remote database:**
   ```bash
   # Apply all migrations in order
   supabase db push
   
   # Or apply individual migrations
   psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f database/migrations/01_initial_schema.sql
   psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f database/migrations/02_quickbooks_integration.sql
   psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f database/migrations/03_transactions_and_categories.sql
   psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f database/migrations/04_receipts_and_ocr.sql
   psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f database/migrations/05_automation_and_ai.sql
   psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f database/migrations/06_notifications_and_audit.sql
   psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f database/migrations/07_billing_and_subscriptions.sql
   ```

2. **Apply RLS policies:**
   ```bash
   psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f database/policies/rls_policies.sql
   ```

3. **Add authentication functions:**
   ```bash
   psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f database/auth/auth_functions.sql
   ```

4. **Seed with demo data:**
   ```bash
   psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f supabase/seed.sql
   ```

#### Option B: Local Database (For isolated development)

1. **Apply schema to local database:**
   ```bash
   # Start local Supabase
   supabase start
   
   # Apply complete schema
   psql -h localhost -p 54322 -U postgres -d postgres -f database/schema.sql
   
   # Apply RLS policies
   psql -h localhost -p 54322 -U postgres -d postgres -f database/policies/rls_policies.sql
   
   # Add auth functions
   psql -h localhost -p 54322 -U postgres -d postgres -f database/auth/auth_functions.sql
   
   # Seed demo data
   psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed.sql
   ```

### 4. Environment Configuration

Update your `.env.local` file:

```env
# =============================================================================
# SUPABASE CONFIGURATION
# =============================================================================
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# =============================================================================
# NEXTAUTH CONFIGURATION
# =============================================================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key_here

# =============================================================================
# OAUTH PROVIDERS (OPTIONAL)
# =============================================================================
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### 5. Storage Buckets Setup

In the Supabase dashboard, create the following storage buckets:

1. **receipts** (Private)
   - Used for storing receipt images/PDFs
   - Access: Authenticated users with client access only

2. **documents** (Private)
   - Used for storing exported reports and documents
   - Access: Authenticated users with client access only

3. **avatars** (Public)
   - Used for user profile pictures
   - Access: Public read, authenticated write

4. **exports** (Private)
   - Used for temporary export files
   - Access: Authenticated users only

### 6. Authentication Configuration

1. **Enable Email/Password authentication:**
   - Go to Authentication > Settings
   - Enable "Enable email confirmations"
   - Set up SMTP settings for email delivery

2. **Configure OAuth providers (optional):**
   - Go to Authentication > Settings > Auth Providers
   - Enable Google and/or GitHub
   - Add your OAuth app credentials

3. **Set up custom email templates:**
   - Go to Authentication > Settings > Email Templates
   - Customize the templates for your branding

## Development Workflow

### Daily Development

1. **Start local Supabase:**
   ```bash
   supabase start
   ```

2. **View local dashboard:**
   - Database: http://localhost:54323
   - API: http://localhost:54321

3. **Make schema changes:**
   - Create new migration files in `database/migrations/`
   - Apply with `supabase db push` or run manually

4. **Test with seed data:**
   - Use the demo organization and users from seed.sql
   - Login with: `accountant@demo.com` or `client@demo.com`

### Database Migrations

1. **Create a new migration:**
   ```bash
   supabase migration new your_migration_name
   ```

2. **Write your SQL changes in the migration file**

3. **Apply the migration:**
   ```bash
   supabase db push
   ```

## Troubleshooting

### Common Issues

1. **Connection refused errors:**
   - Ensure Supabase is running: `supabase status`
   - Check if ports are available: `netstat -an | grep 54321`

2. **RLS policy errors:**
   - Verify user authentication in your app
   - Check that JWT contains required claims
   - Test policies with service role key temporarily

3. **Migration errors:**
   - Check for syntax errors in SQL files
   - Ensure dependencies exist (referenced tables/functions)
   - Apply migrations in correct order

4. **Authentication issues:**
   - Verify NEXTAUTH_SECRET is set
   - Check OAuth provider configurations
   - Ensure redirect URLs match exactly

### Useful Commands

```bash
# Check Supabase status
supabase status

# View logs
supabase logs

# Reset local database (WARNING: destroys data)
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > src/types/supabase.ts

# Backup database
supabase db dump > backup.sql

# Restore database
psql -h localhost -p 54322 -U postgres -d postgres < backup.sql
```

## Database Schema Overview

### Core Tables
- `users` - User accounts and profiles
- `organizations` - Accounting firms/companies
- `clients` - Client companies managed by organizations
- `transactions` - Financial transactions from QuickBooks
- `receipts` - Uploaded receipt files and OCR data

### Integration Tables
- `quickbooks_connections` - QuickBooks OAuth tokens and settings
- `chart_of_accounts` - Synced account structures

### AI & Automation
- `transaction_categories` - Custom categorization schema
- `ai_categorizations` - AI suggestion history and confidence
- `categorization_rules` - Custom automation rules
- `automation_settings` - Client-specific automation preferences

### System Tables
- `notifications` - In-app notifications
- `audit_logs` - Security and change auditing
- `subscription_plans` - Billing tiers and limits
- `usage_metrics` - Resource usage tracking

## Security Features

### Row Level Security (RLS)
- Multi-tenant data isolation
- Role-based access control
- Automatic policy enforcement

### Authentication
- JWT-based session management
- OAuth provider integration
- Custom claims for permissions

### Audit Logging
- Automatic change tracking
- User action logging
- Security event monitoring

## Performance Considerations

### Indexing Strategy
- Optimized for transaction queries
- Client-based partitioning considerations
- Composite indexes for common filters

### Caching
- Application-level caching recommended
- Consider Redis for session data
- CDN for static assets (receipts, avatars)

### Scaling
- Horizontal scaling with read replicas
- Connection pooling configured
- Usage-based resource allocation