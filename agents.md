# Repository Guidelines

# BooksFlowAI - Repository Structure

## Project Structure & Module Organization

BooksFLowAI follows a standard Next.js 14 structure with TypeScript. Source code is organized in `/pages` for Next.js pages and API routes, `/components` for React components grouped by feature (ai-cleanup, receipts, reports, client-portal, etc.), `/lib` for utilities, database connections, AI services, and type definitions, and `/public` for static assets. The `/integrations` directory contains QuickBooks API and OCR service integrations.

## Build, Test, and Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Code quality checks
npm run lint

# Comprehensive testing
npm run test:comprehensive

# E2E testing
npm run test:e2e

# AI integration tests
npm run test:ai-integration

# Database tests
npm run test:db
```

## Coding Style & Naming Conventions

- **Indentation**: 2 spaces (TypeScript/JavaScript)
- **File naming**: kebab-case for components, camelCase for utilities
- **Function/variable naming**: camelCase with descriptive names
- **Linting**: ESLint with Next.js configuration, TypeScript strict mode enabled

## Testing Guidelines

- **Framework**: Jest for unit tests, Playwright for E2E testing
- **Test files**: Located in `/tests` directory with feature-specific subdirectories
- **Running tests**: Use `npm run test:comprehensive` for full test suite
- **Coverage**: Comprehensive test coverage for AI services, payment flows, and QuickBooks integration

## Commit & Pull Request Guidelines

- **Commit format**: Descriptive messages focusing on feature/fix areas (e.g., "ai-cleanup", "receipts", "reports")
- **PR process**: Team-based development with code review requirements
- **Branch naming**: Feature branches with descriptive names

---

# Repository Tour

## 🎯 What This Repository Does

BooksFlowAI is an AI-powered accounting automation platform that streamlines bookkeeping workflows for solo accountants and small CPA firms. The platform provides intelligent transaction categorization, OCR receipt processing, automated client reporting, and seamless QuickBooks integration to help accountants save 10+ hours per week on manual data entry and cleanup.

**Key responsibilities:**
- AI-powered QuickBooks transaction categorization and cleanup
- OCR receipt processing and automatic entry matching
- Automated client report generation in plain English
- Client portal for document upload and communication
- Subscription management and billing automation

---

## 🏗️ Architecture Overview

### System Context
```
[QuickBooks Data] → [BooksFlowAI Platform] → [Clean Categorized Data]
       ↓                        ↓                        ↓
[Client Receipts] → [AI Processing Engine] → [Automated Reports]
       ↓                        ↓                        ↓
[Client Portal] → [Smart Notifications] → [Enhanced Client Communication]
```

### Key Components
- **AI Categorization Engine** - OpenAI GPT-4 integration for transaction classification and cleanup
- **OCR Receipt Processing** - Mindee API integration for receipt data extraction and matching
- **QuickBooks Integration** - OAuth-based connection for transaction sync and categorization updates
- **Client Portal System** - Secure document upload and report sharing interface
- **Automated Reporting** - AI-generated monthly summaries and financial insights
- **Notification System** - Automated email reminders and status updates
- **Subscription Management** - Stripe-powered billing with tiered feature access

### Data Flow
1. Accountant connects QuickBooks account via OAuth integration
2. AI engine analyzes and categorizes transactions with confidence scoring
3. Client uploads receipts through secure portal with OCR processing
4. System matches receipts to transactions and updates categorization
5. Automated reports generated with AI-powered business insights
6. Email notifications sent to clients with report access and missing document reminders

---

## 📁 Project Structure [Complete Directory Tree]

```
BooksFlowAI/
├── pages/                          # Next.js pages and API routes
│   ├── api/                        # Backend API endpoints
│   │   ├── ai/                     # AI processing endpoints
│   │   │   ├── categorize.ts       # Transaction categorization
│   │   │   ├── generate-report.ts  # Report generation
│   │   │   └── analyze-receipt.ts  # OCR analysis
│   │   ├── quickbooks/             # QuickBooks integration
│   │   │   ├── auth.ts             # OAuth flow
│   │   │   ├── sync.ts             # Data synchronization
│   │   │   └── transactions.ts     # Transaction CRUD
│   │   ├── clients/                # Client management
│   │   │   ├── upload.ts           # Receipt upload handling
│   │   │   ├── reports.ts          # Report generation
│   │   │   └── notifications.ts    # Email automation
│   │   ├── stripe/                 # Payment processing
│   │   │   ├── checkout.ts         # Subscription checkout
│   │   │   ├── webhook.ts          # Payment webhooks
│   │   │   └── portal.ts           # Customer portal
│   │   ├── health.ts               # System health monitoring
│   │   └── cron/                   # Scheduled jobs
│   │       ├── daily-reminders.ts  # Client reminders
│   │       └── cleanup.ts          # Data cleanup tasks
│   ├── dashboard/                  # Accountant dashboard
│   │   ├── index.tsx               # Main dashboard
│   │   ├── transactions.tsx        # Transaction management
│   │   ├── clients.tsx             # Client management
│   │   ├── reports.tsx             # Report generation
│   │   └── settings.tsx            # Account settings
│   ├── client-portal/              # Client-facing pages
│   │   ├── [clientId]/             # Dynamic client routes
│   │   │   ├── upload.tsx          # Receipt upload
│   │   │   ├── reports.tsx         # Report viewing
│   │   │   └── profile.tsx         # Client profile
│   │   └── login.tsx               # Client authentication
│   ├── auth/                       # Authentication pages
│   │   ├── login.tsx               # Accountant login
│   │   ├── signup.tsx              # Account registration
│   │   └── callback.tsx            # OAuth callbacks
│   ├── pricing.tsx                 # Subscription pricing
│   ├── onboarding.tsx              # New user setup
│   ├── index.tsx                   # Marketing homepage
│   └── _app.tsx                    # App configuration
├── components/                     # React components by feature
│   ├── ai-cleanup/                 # AI categorization interface
│   │   ├── TransactionReview.tsx   # Review AI suggestions
│   │   ├── CategorySelector.tsx    # Manual category selection
│   │   ├── ConfidenceIndicator.tsx # AI confidence display
│   │   └── BulkActions.tsx         # Batch processing
│   ├── receipts/                   # Receipt management
│   │   ├── UploadZone.tsx          # Drag-drop upload
│   │   ├── ReceiptViewer.tsx       # Receipt preview
│   │   ├── OCRResults.tsx          # Extracted data display
│   │   └── MatchingInterface.tsx   # Transaction matching
│   ├── reports/                    # Report generation
│   │   ├── ReportBuilder.tsx       # Report configuration
│   │   ├── ReportPreview.tsx       # Report preview
│   │   ├── PlainEnglishSummary.tsx # AI-generated summaries
│   │   └── ExportOptions.tsx       # PDF/Excel export
│   ├── client-portal/              # Client interface components
│   │   ├── DocumentUpload.tsx      # Client file uploads
│   │   ├── ReportViewer.tsx        # Client report access
│   │   ├── MessageCenter.tsx       # Client communication
│   │   └── ProfileSettings.tsx     # Client profile management
│   ├── dashboard/                  # Main dashboard components
│   │   ├── StatsOverview.tsx       # Key metrics display
│   │   ├── RecentActivity.tsx      # Activity timeline
│   │   ├── ClientList.tsx          # Client management
│   │   └── QuickActions.tsx        # Common tasks
│   ├── integrations/               # Third-party integrations
│   │   ├── QuickBooksConnect.tsx   # QB connection setup
│   │   ├── SyncStatus.tsx          # Sync monitoring
│   │   └── APISettings.tsx         # Integration settings
│   ├── notifications/              # Notification system
│   │   ├── EmailTemplates.tsx      # Email customization
│   │   ├── NotificationCenter.tsx  # In-app notifications
│   │   └── ReminderSettings.tsx    # Automation settings
│   └── ui/                         # Reusable UI components
│       ├── Button.tsx              # Button variants
│       ├── Modal.tsx               # Modal dialogs
│       ├── Table.tsx               # Data tables
│       ├── Form.tsx                # Form components
│       └── Loading.tsx             # Loading states
├── lib/                           # Core utilities and services
│   ├── ai-services/               # AI integrations
│   │   ├── openai-client.ts       # OpenAI API wrapper
│   │   ├── categorization.ts      # Transaction categorization
│   │   ├── report-generation.ts   # AI report creation
│   │   └── ocr-processing.ts      # Receipt OCR handling
│   ├── integrations/              # Third-party APIs
│   │   ├── quickbooks-api.ts      # QuickBooks API client
│   │   ├── mindee-ocr.ts          # Mindee OCR integration
│   │   ├── stripe-client.ts       # Stripe API wrapper
│   │   └── email-service.ts       # Email automation
│   ├── database/                  # Database operations
│   │   ├── supabase-client.ts     # Supabase configuration
│   │   ├── transactions.ts        # Transaction data layer
│   │   ├── clients.ts             # Client data operations
│   │   ├── receipts.ts            # Receipt storage
│   │   ├── reports.ts             # Report data management
│   │   └── subscriptions.ts       # Billing data
│   ├── auth/                      # Authentication utilities
│   │   ├── supabase-auth.ts       # Supabase auth config
│   │   ├── session-management.ts  # Session handling
│   │   └── role-based-access.ts   # Permission system
│   ├── types/                     # TypeScript definitions
│   │   ├── ai.types.ts            # AI service types
│   │   ├── quickbooks.types.ts    # QuickBooks data types
│   │   ├── database.types.ts      # Database schema types
│   │   ├── client.types.ts        # Client data types
│   │   └── subscription.types.ts  # Billing types
│   ├── utils/                     # Helper functions
│   │   ├── validation.ts          # Input validation
│   │   ├── formatting.ts          # Data formatting
│   │   ├── date-helpers.ts        # Date utilities
│   │   ├── file-processing.ts     # File handling
│   │   └── error-handling.ts      # Error management
│   ├── hooks/                     # Custom React hooks
│   │   ├── useAI.ts              # AI service hooks
│   │   ├── useQuickBooks.ts      # QuickBooks integration
│   │   ├── useSubscription.ts    # Billing hooks
│   │   └── useNotifications.ts   # Notification hooks
│   └── constants/                 # Application constants
│       ├── ai-prompts.ts         # AI prompt templates
│       ├── subscription-tiers.ts # Pricing configuration
│       └── app-config.ts         # Global settings
├── integrations/                  # Integration-specific code
│   ├── quickbooks/               # QuickBooks integration
│   │   ├── oauth-handler.ts      # OAuth flow management
│   │   ├── data-sync.ts          # Data synchronization
│   │   ├── webhook-handlers.ts   # QB webhook processing
│   │   └── api-client.ts         # QB API wrapper
│   ├── ocr/                      # OCR service integrations
│   │   ├── mindee-processor.ts   # Mindee integration
│   │   ├── tesseract-fallback.ts # Backup OCR service
│   │   └── result-validator.ts   # OCR result validation
│   └── email/                    # Email service integration
│       ├── sendgrid-client.ts    # SendGrid integration
│       ├── template-manager.ts   # Email templates
│       └── automation-rules.ts   # Email automation
├── public/                       # Static assets
│   ├── images/                   # Application images
│   ├── icons/                    # UI icons
│   ├── receipts/                 # Uploaded receipt files
│   └── reports/                  # Generated report files
├── styles/                       # Styling
│   ├── globals.css              # Global styles
│   ├── components/              # Component-specific styles
│   └── tailwind.config.js       # Tailwind configuration
├── tests/                        # Test files
│   ├── ai-services/             # AI service tests
│   ├── integrations/            # Integration tests
│   ├── components/              # Component tests
│   ├── api/                     # API endpoint tests
│   └── e2e/                     # End-to-end tests
├── docs/                         # Documentation
│   ├── api/                     # API documentation
│   ├── setup/                   # Setup guides
│   └── user-guides/             # User documentation
├── scripts/                      # Build and deployment scripts
│   ├── build.js                 # Custom build script
│   ├── deploy.js                # Deployment automation
│   └── seed-db.js               # Database seeding
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── netlify.toml                 # Netlify deployment config
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── .env.example                 # Environment variable template
├── .eslintrc.json              # ESLint configuration
├── jest.config.js              # Jest testing configuration
└── playwright.config.ts        # Playwright E2E configuration
```

### Key Files to Know

| File | Purpose | When You'd Touch It |
|------|---------|---------------------|
| `pages/api/ai/categorize.ts` | Main AI categorization endpoint | Adding new categorization features |
| `lib/integrations/quickbooks-api.ts` | QuickBooks API operations | Extending QB functionality |
| `lib/ai-services/openai-client.ts` | OpenAI service wrapper | Modifying AI behavior |
| `components/ai-cleanup/TransactionReview.tsx` | AI suggestion review UI | Improving user experience |
| `lib/database/transactions.ts` | Transaction data operations | Database schema changes |
| `pages/_app.tsx` | App configuration and providers | Global app changes |
| `lib/types/ai.types.ts` | AI service type definitions | Adding new AI features |
| `next.config.js` | Next.js build configuration | Build optimization |
| `tailwind.config.js` | Design system configuration | UI/styling changes |
| `netlify.toml` | Deployment and serverless config | Infrastructure changes |

---

## 🔧 Technology Stack

### Core Technologies
- **Language:** TypeScript (5.2+) - Full type safety across frontend and backend
- **Framework:** Next.js 14 with App Router - Server-side rendering and API routes
- **Database:** Supabase - PostgreSQL with real-time capabilities and transaction storage
- **Styling:** Tailwind CSS 3.4 - Utility-first CSS with custom accounting-focused design system

### Key Libraries
- **openai** - GPT-4 integration for transaction categorization and report generation
- **stripe** - Payment processing and subscription management
- **@supabase/supabase-js** - Database operations and real-time updates
- **mindee** - OCR API for receipt processing and data extraction
- **intuit-oauth** - QuickBooks OAuth integration and API access
- **framer-motion** - UI animations and micro-interactions
- **@headlessui/react** - Accessible UI components

### Development Tools
- **Jest** - Unit testing framework with AI service mocks
- **Playwright** - End-to-end testing for user workflows
- **ESLint** - Code quality and Next.js best practices
- **TypeScript** - Static type checking and IntelliSense

---

## 🌐 External Dependencies

### Required Services
- **Supabase** - Primary database for transactions, clients, and receipts
- **Stripe** - Payment processing for subscriptions ($199/$399/$599 tiers)
- **OpenAI API** - Transaction categorization and report generation
- **Mindee API** - OCR processing for receipt data extraction
- **QuickBooks API** - Transaction sync and categorization updates
- **Netlify** - Hosting platform with serverless functions and CDN

### Optional Integrations
- **SendGrid** - Email automation for client notifications
- **Sentry** - Error monitoring and performance tracking
- **Google Analytics** - User behavior tracking and conversion metrics

### Environment Variables

```bash
# Required
STRIPE_SECRET_KEY=          # Stripe payment processing
OPENAI_API_KEY=            # AI categorization and reports
MINDEE_API_KEY=            # OCR receipt processing
QUICKBOOKS_CLIENT_ID=      # QuickBooks OAuth
QUICKBOOKS_CLIENT_SECRET=  # QuickBooks OAuth
SUPABASE_URL=              # Database connection
SUPABASE_SERVICE_KEY=      # Database admin access

# Optional
SENDGRID_API_KEY=         # Email automation
SENTRY_DSN=               # Error monitoring
GA_MEASUREMENT_ID=        # Analytics tracking
```

---

## 🔄 Common Workflows

### AI Transaction Categorization Workflow
1. Accountant connects QuickBooks account via OAuth
2. System pulls uncategorized transactions via QuickBooks API
3. `pages/api/ai/categorize.ts` processes transactions with GPT-4
4. AI returns category suggestions with confidence scores
5. Accountant reviews and approves suggestions via dashboard
6. Approved categorizations sync back to QuickBooks

**Code path:** `components/integrations/QuickBooksConnect.tsx` → `lib/integrations/quickbooks-api.ts` → `pages/api/ai/categorize.ts` → `lib/ai-services/categorization.ts` → `components/ai-cleanup/TransactionReview.tsx`

### Receipt Processing Workflow
1. Client uploads receipt through client portal
2. `pages/api/clients/upload.ts` handles file upload to Supabase storage
3. OCR service extracts vendor, amount, date from receipt
4. AI matches receipt to existing transactions
5. Accountant reviews and confirms matches
6. Transaction categorization updated with receipt attachment

**Code path:** `components/client-portal/DocumentUpload.tsx` → `pages/api/clients/upload.ts` → `lib/integrations/mindee-ocr.ts` → `lib/ai-services/ocr-processing.ts` → `components/receipts/MatchingInterface.tsx`

### Automated Report Generation Workflow
1. Accountant selects client and report period
2. System aggregates categorized transactions for period
3. AI generates plain-English business summary
4. Report compiled with charts, insights, and recommendations
5. PDF generated and shared with client via portal
6. Automated email notification sent to client

**Code path:** `components/reports/ReportBuilder.tsx` → `pages/api/ai/generate-report.ts` → `lib/ai-services/report-generation.ts` → `components/reports/ReportPreview.tsx` → `pages/api/clients/reports.ts`

### Subscription Management Workflow
1. Accountant selects subscription tier on pricing page
2. Stripe checkout session created with tier-specific features
3. Webhook processes successful payments and updates access
4. Dashboard unlocks features based on subscription tier
5. Usage tracking for AI requests and client limits

**Code path:** `pages/pricing.tsx` → `pages/api/stripe/checkout.ts` → `pages/api/stripe/webhook.ts` → `lib/database/subscriptions.ts` → `lib/auth/role-based-access.ts`

---

## 📈 Performance & Scale

### Performance Considerations
- **AI API Optimization** - Request batching and response caching for categorization
- **QuickBooks Rate Limiting** - Respect API limits with queue management
- **Database Optimization** - Indexed queries for transaction and receipt lookups
- **File Storage** - Efficient receipt storage with CDN delivery
- **Real-time Updates** - Supabase subscriptions for live transaction sync

### Monitoring
- **Health Checks** - `/api/health` monitors database, QuickBooks API, and AI services
- **Performance Metrics** - Track AI processing times and categorization accuracy
- **Usage Analytics** - Monitor AI token usage and cost optimization
- **Error Tracking** - Comprehensive error handling with fallback mechanisms
- **Subscription Metrics** - Track conversion rates and feature usage by tier

---

## 🚨 Things to Be Careful About

### 🔒 Security Considerations
- **QuickBooks OAuth** - Secure token storage and refresh handling
- **Client Data Protection** - Encrypted receipt storage and secure file access
- **API Key Management** - All service keys stored in environment variables
- **Input Validation** - Sanitization for financial data and file uploads
- **Rate Limiting** - Protect AI endpoints from abuse and excessive costs

### 🤖 AI Service Management
- **Token Usage** - Monitor OpenAI API costs and implement usage limits per tier
- **Categorization Accuracy** - Track and improve AI categorization confidence
- **Fallback Handling** - Manual categorization when AI confidence is low
- **Response Validation** - Validate AI responses before updating QuickBooks
- **Cost Optimization** - Batch processing and caching for efficiency

### 💳 Financial Data Handling
- **Transaction Security** - Encrypt sensitive financial data at rest
- **QuickBooks Sync** - Careful handling of bidirectional data sync
- **Audit Trail** - Complete logging of all categorization changes
- **Data Integrity** - Validation before writing back to QuickBooks
- **Backup Strategy** - Regular backups of categorized transaction data

### 📊 Subscription & Billing
- **Feature Gating** - Tier-based access control for AI features and client limits
- **Usage Tracking** - Monitor API calls and storage per subscription tier
- **Webhook Security** - Stripe webhook signature validation
- **Billing Accuracy** - Proper handling of upgrades, downgrades, and cancellations

*Updated at: 2025-01-15 UTC*