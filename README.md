# Solo Accountant AI

AI-powered QuickBooks automation and client reporting for solo CPAs and accounting professionals.

## 🎯 Overview

Solo Accountant AI automates the most time-consuming aspects of accounting practice:
- **AI Transaction Categorization** - 95% accurate QuickBooks cleanup
- **OCR Receipt Processing** - Automated client receipt intake and matching
- **Smart Client Reports** - Plain-English financial summaries
- **Automated Communications** - Client reminders and notifications

**Save 10+ hours per week** on manual data entry and focus on advisory services.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Supabase account
- QuickBooks Developer account (for integrations)
- OpenAI API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/solo-accountant-ai.git
   cd solo-accountant-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

4. **Set up Supabase database**
   ```bash
   # Create Supabase project and get credentials
   # Run the schema from supabase/config.sql
   # Run seed data from supabase/seed.sql
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT-4
- **OCR**: Mindee API
- **Integrations**: QuickBooks Online API
- **Deployment**: Vercel

## 📁 Project Structure

```
solo-accountant-ai/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Accountant dashboard
│   │   └── api/               # API endpoints
│   ├── components/            # React components
│   │   ├── auth/              # Authentication components
│   │   ├── ui/                # Reusable UI components
│   │   └── dashboard/         # Dashboard-specific components
│   └── lib/                   # Utilities and integrations
│       ├── integrations/      # Third-party API clients
│       ├── supabase.ts        # Database client
│       └── utils.ts           # Helper functions
├── docs/                      # Documentation
├── database/                  # Database schemas and migrations
├── supabase/                  # Supabase configuration
└── public/                    # Static assets
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run type-check      # TypeScript type checking

# Testing
npm run test            # Run Jest tests
npm run test:watch      # Run tests in watch mode
npm run test:ci         # Run tests for CI

# Database
npm run db:generate-types  # Generate TypeScript types from Supabase
npm run db:reset          # Reset database (development only)
npm run db:migrate        # Run database migrations
```

### Environment Variables

Required environment variables (see `.env.example`):

```bash
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
NODE_ENV=development

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# QuickBooks Integration
QUICKBOOKS_CLIENT_ID=your-quickbooks-client-id
QUICKBOOKS_CLIENT_SECRET=your-quickbooks-client-secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/auth/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox

# AI Services
OPENAI_API_KEY=your-openai-api-key
MINDEE_API_KEY=your-mindee-api-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Monitoring (Optional)
SENTRY_DSN=

# Email (Optional)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
```

## Backend (FastAPI)

This repo includes a minimal FastAPI service in `backend/` to align with the architecture plan. It currently exposes `/health` and is wired in `docker-compose.yml`.

Run locally:

```bash
docker compose up --build
```

The frontend will call the backend at `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

## 🔌 Integrations

### QuickBooks Online
- OAuth 2.0 authentication
- Transaction sync and categorization
- Chart of accounts import
- Bidirectional data updates

### AI Services
- **OpenAI GPT-4**: Transaction categorization and report generation
- **Mindee OCR**: Receipt data extraction and processing

### Database
- **Supabase**: PostgreSQL with real-time subscriptions
- **Row Level Security**: Multi-tenant data isolation
- **Audit Trail**: Complete activity logging

## 📊 Features

### For Accountants
- ✅ **AI Transaction Cleanup** - Automated QuickBooks categorization
- ✅ **Client Management** - Centralized client portal access
- ✅ **Bulk Operations** - Efficient transaction review workflows
- ✅ **Professional Reports** - Customizable client reporting
- ✅ **Automated Notifications** - Client communication automation

### For Clients
- ✅ **Mobile Receipt Upload** - Camera integration for easy capture
- ✅ **Plain-English Reports** - Financial summaries without jargon
- ✅ **Secure Portal** - Protected document sharing
- ✅ **Real-time Status** - Track receipt processing progress
- ✅ **Automated Reminders** - Gentle nudges for missing documents

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect GitHub repository**
   ```bash
   # Push to GitHub
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect repository in Vercel dashboard
   - Configure environment variables
   - Deploy automatically on push

3. **Configure custom domain** (optional)
   - Add domain in Vercel settings
   - Update DNS records
   - Enable SSL certificate

### Environment Setup

Production environment variables:
```bash
# Update these for production
NEXT_PUBLIC_APP_URL=https://your-domain.com
QUICKBOOKS_REDIRECT_URI=https://your-domain.com/api/auth/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=production
NODE_ENV=production
```

## 🔒 Security

### Data Protection
- **Encryption at rest** for sensitive data
- **HTTPS enforcement** for all communications
- **Row Level Security** for multi-tenant isolation
- **API key management** via environment variables

### Authentication
- **Supabase Auth** with email/password
- **Session management** with secure tokens
- **Role-based access control** (accountant vs client)
- **Password requirements** and validation

### Compliance
- **SOC 2 Type II** ready architecture
- **GDPR compliance** with data export/deletion
- **Audit trails** for all data changes
- **Regular security updates** and monitoring

## 📈 Monitoring

### Health Checks
```bash
# Check application health
curl https://your-domain.com/api/health

# Response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "quickbooks": "configured",
    "ai": "configured"
  }
}
```

### Performance Monitoring
- **Vercel Analytics** for performance metrics
- **Supabase Dashboard** for database monitoring
- **Error tracking** with detailed logging
- **API response times** and success rates

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for code formatting
- **Conventional Commits** for commit messages

### Testing
- **Unit tests** for utility functions
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows
- **Accessibility tests** for WCAG compliance

## 📞 Support

### Documentation
- **Setup Guide**: `docs/SUPABASE_SETUP.md`
- **QuickBooks Integration**: `docs/QUICKBOOKS_SETUP.md`
- **User Personas**: `docs/USER_PERSONAS.md`
- **API Documentation**: `docs/api/`

### Getting Help
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community support and questions
- **Email**: support@soloaccountantai.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

### Phase 1 (Current) - Foundation
- ✅ Core authentication and dashboard
- ✅ QuickBooks integration setup
- ✅ Basic AI categorization
- ✅ Client portal foundation

### Phase 2 - AI Enhancement
- 🔄 Advanced AI categorization rules
- 🔄 OCR receipt processing
- 🔄 Automated report generation
- 🔄 Smart client notifications

### Phase 3 - Scale & Growth
- 📋 Multi-firm support
- 📋 Advanced reporting and analytics
- 📋 Mobile app development
- 📋 Enterprise features

---

**Built with ❤️ for solo CPAs and accounting professionals**

*Save time, grow your practice, focus on what matters most.*