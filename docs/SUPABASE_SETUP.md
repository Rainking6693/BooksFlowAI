# Supabase Setup Guide for Solo Accountant AI

## 🎯 Overview
This guide walks through setting up Supabase as the database backend for Solo Accountant AI.

## 📋 Prerequisites
- Supabase account (free tier available)
- Solo Accountant AI development environment
- Access to environment variables

## 🚀 Step-by-Step Setup

### Step 1: Create Supabase Project
1. **Visit Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Sign in or create account
   - Click "New Project"

2. **Configure Project**
   ```
   Organization: Your organization
   Project Name: Solo Accountant AI
   Database Password: [Generate strong password]
   Region: Choose closest to your users
   Pricing Plan: Free (for development)
   ```

3. **Wait for Setup**
   - Project creation takes 2-3 minutes
   - Note the project URL and API keys

### Step 2: Get API Credentials
1. **Access Project Settings**
   - Go to Settings > API
   - Copy the following values:

2. **Required Environment Variables**
   ```bash
   # Add to .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### Step 3: Apply Database Schema
1. **Access SQL Editor**
   - Go to SQL Editor in Supabase dashboard
   - Create new query

2. **Run Schema Script**
   - Copy contents of `supabase/config.sql`
   - Paste into SQL Editor
   - Click "Run" to execute

3. **Verify Tables Created**
   - Go to Table Editor
   - Confirm all tables are present:
     - profiles
     - accountants
     - clients
     - transactions
     - receipts
     - reports
     - notifications
     - activity_logs

### Step 4: Seed Demo Data
1. **Run Seed Script**
   - Copy contents of `supabase/seed.sql`
   - Paste into SQL Editor
   - Click "Run" to execute

2. **Verify Demo Data**
   - Check profiles table for demo users
   - Check transactions table for sample data
   - Check receipts table for sample receipts

### Step 5: Configure Authentication
1. **Enable Email Auth**
   - Go to Authentication > Settings
   - Enable "Email" provider
   - Configure email templates (optional)

2. **Set Auth Policies**
   - Row Level Security is already enabled
   - Policies are defined in schema
   - Test with demo accounts

### Step 6: Test Connection
1. **Update Environment Variables**
   ```bash
   # In .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-actual-service-key
   ```

2. **Test API Connection**
   ```typescript
   import { supabase } from '@/lib/supabase'
   
   // Test query
   const { data, error } = await supabase
     .from('profiles')
     .select('*')
     .limit(1)
   
   console.log('Connection test:', { data, error })
   ```

## 🔧 Database Schema Overview

### Core Tables
- **profiles**: User accounts (extends Supabase auth)
- **accountants**: CPA/accounting professional data
- **clients**: Small business client information
- **transactions**: Financial transactions from QuickBooks
- **receipts**: Uploaded receipt files with OCR data
- **reports**: AI-generated financial reports

### Security Features
- **Row Level Security (RLS)**: Enabled on all tables
- **Role-based Access**: Accountants vs clients vs admins
- **Audit Trail**: All changes logged in activity_logs
- **Data Encryption**: Sensitive fields encrypted at rest

### Performance Optimizations
- **Indexes**: Strategic indexes on frequently queried fields
- **Partitioning**: Ready for date-based partitioning
- **Connection Pooling**: Built-in with Supabase

## 🔒 Security Configuration

### Row Level Security Policies
```sql
-- Example: Accountants can only see their own data
CREATE POLICY "Accountants can view own data" ON accountants
    FOR ALL USING (user_id = auth.uid());

-- Example: Clients can see their data + their accountant can see them
CREATE POLICY "Client data access" ON clients
    FOR SELECT USING (
        user_id = auth.uid() OR 
        accountant_id IN (SELECT id FROM accountants WHERE user_id = auth.uid())
    );
```

### API Key Security
- **Anon Key**: Safe for client-side use (RLS enforced)
- **Service Role Key**: Server-side only (bypasses RLS)
- **Never expose service role key in frontend**

## 📊 Monitoring & Maintenance

### Database Monitoring
- **Dashboard**: Monitor usage in Supabase dashboard
- **Logs**: Check logs for errors and performance
- **Metrics**: Track query performance and usage

### Backup Strategy
- **Automatic Backups**: Enabled by default
- **Point-in-time Recovery**: Available on paid plans
- **Manual Exports**: Regular exports for critical data

### Scaling Considerations
- **Connection Limits**: Monitor connection usage
- **Storage Limits**: Track file storage usage
- **API Limits**: Monitor API request volume

## 🚨 Common Issues & Solutions

### Issue: "relation does not exist"
**Solution:** Ensure schema script ran successfully, check table names

### Issue: "RLS policy violation"
**Solution:** Verify user authentication and policy conditions

### Issue: "Connection timeout"
**Solution:** Check network connectivity and Supabase status

### Issue: "Invalid API key"
**Solution:** Verify environment variables and key format

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **SQL Reference**: https://supabase.com/docs/guides/database
- **Auth Guide**: https://supabase.com/docs/guides/auth
- **Community**: https://github.com/supabase/supabase/discussions

## 🎯 Day 1 Success Criteria

For Day 1 foundation setup, we need:
- [ ] Supabase project created
- [ ] Database schema applied successfully
- [ ] Demo data seeded
- [ ] Environment variables configured
- [ ] Basic authentication working
- [ ] Health check API connecting to database

**Next Steps for Day 2:**
- Connect frontend authentication
- Implement transaction sync from QuickBooks
- Build AI categorization pipeline
- Test end-to-end data flow

## 🔧 Development Commands

```bash
# Generate TypeScript types from schema
npm run db:generate-types

# Reset database (development only)
npm run db:reset

# Run migrations
npm run db:migrate

# Test database connection
curl http://localhost:3000/api/health
```

## 📈 Production Checklist

Before going live:
- [ ] Enable database backups
- [ ] Configure custom domain
- [ ] Set up monitoring alerts
- [ ] Review and test all RLS policies
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Test disaster recovery procedures