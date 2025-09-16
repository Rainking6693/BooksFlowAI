\# Repository Guidelines



\## Project Structure \& Module Organization



BooksFlowAI follows a modern Next.js 14 App Router structure with TypeScript. Source code is organized in `/app` for Next.js app router pages and API routes, `/components` for React components grouped by feature (ai-cleanup, receipt-upload, dashboard, client-portal, etc.), `/lib` for utilities, database connections, AI services, and type definitions, and `/public` for static assets. The platform uses Supabase for database and authentication with comprehensive Row Level Security (RLS) policies.



\## Build, Test, and Development Commands



```bash

\# Start development server

npm run dev



\# Build for production

npm run build



\# Type checking

npm run type-check



\# Code quality checks

npm run lint



\# Comprehensive testing

npm run test:comprehensive



\# E2E testing with Playwright

npm run test:e2e



\# AI integration tests

npm run test:ai-integration



\# Database migration

npm run db:migrate



\# Generate Supabase types

npm run db:generate-types

```



\## Coding Style \& Naming Conventions



\- \*\*Indentation\*\*: 2 spaces (TypeScript/JavaScript)

\- \*\*File naming\*\*: kebab-case for components, camelCase for utilities

\- \*\*Function/variable naming\*\*: camelCase with descriptive names

\- \*\*Database naming\*\*: snake\_case for tables and columns

\- \*\*Linting\*\*: ESLint with Next.js configuration, TypeScript strict mode enabled

\- \*\*Database\*\*: Supabase conventions with RLS policies



\## Testing Guidelines



\- \*\*Framework\*\*: Jest for unit tests, Playwright for E2E testing

\- \*\*Test files\*\*: Located in `/\_\_tests\_\_` directory with feature-specific subdirectories

\- \*\*AI Testing\*\*: Mock OpenAI responses for predictable testing

\- \*\*Database Testing\*\*: Test database with isolated transactions

\- \*\*Running tests\*\*: Use `npm run test:comprehensive` for full test suite

\- \*\*Coverage\*\*: Comprehensive test coverage for AI services, QuickBooks integration, and financial flows



\## Commit \& Pull Request Guidelines



\- \*\*Commit format\*\*: Descriptive messages focusing on feature areas (e.g., "ai-categorization", "receipt-processing", "quickbooks-integration")

\- \*\*PR process\*\*: Team-based development with code review requirements

\- \*\*Branch naming\*\*: Feature branches with descriptive names (e.g., `feature/ai-categorization`, `fix/receipt-upload`)



---



\# Repository Tour



\## 🎯 What This Repository Does



BooksFlowAI is an AI-powered accounting automation platform designed for solo accountants managing multiple small business clients. The platform automates transaction categorization, receipt processing, and report generation while providing client portals for seamless collaboration. It integrates with QuickBooks for real-time financial data synchronization and uses GPT-4 for intelligent business insights.



\*\*Key responsibilities:\*\*

\- AI-powered transaction categorization and cleanup

\- Intelligent receipt processing with OCR and matching

\- QuickBooks integration for real-time data synchronization  

\- Automated report generation with business insights

\- Client portal for receipt uploads and report access

\- Multi-tenant architecture with role-based access control



---



\## 🏗️ Architecture Overview



\### System Context

```

\[Accountants] ↔ \[BooksFlowAI Platform] ↔ \[Small Business Clients]

&nbsp;                       ↓

&nbsp;           \[QuickBooks Integration]

&nbsp;                       ↓

&nbsp;           \[AI Processing Engine (GPT-4)]

&nbsp;                       ↓

&nbsp;           \[Automated Reports \& Insights]

```



\### Key Components

\- \*\*AI Categorization Engine\*\* - OpenAI GPT-4 integration for intelligent transaction categorization

\- \*\*Receipt Processing System\*\* - Mindee OCR API for receipt data extraction and transaction matching

\- \*\*QuickBooks Integration\*\* - OAuth-based real-time financial data synchronization

\- \*\*Multi-Tenant Database\*\* - Supabase PostgreSQL with Row Level Security for accountant/client isolation

\- \*\*Report Generation Engine\*\* - AI-powered business insights and plain English financial reports

\- \*\*Authentication \& Authorization\*\* - Supabase Auth with role-based access control (Accountant/Client)



\### Data Flow

1\. Accountant connects QuickBooks account via OAuth integration

2\. System syncs transaction data and applies AI categorization

3\. Clients upload receipts through dedicated portal

4\. OCR processes receipts and AI matches them to transactions

5\. AI generates comprehensive business reports with insights

6\. Reports are shared with clients through secure portal access



---



\## 📁 Project Structure \[Partial Directory Tree]



```

BooksFlowAI/

├── app/                           # Next.js 14 App Router

│   ├── (auth)/                    # Authentication routes

│   │   ├── login/                 # Login page

│   │   └── signup/                # Registration page

│   ├── dashboard/                 # Main dashboard

│   │   ├── ai-cleanup/            # AI categorization interface

│   │   ├── receipts/              # Receipt management

│   │   ├── reports/               # Report generation \& viewing

│   │   └── clients/               # Client management

│   ├── client-portal/             # Client-specific interface

│   │   ├── receipts/              # Client receipt uploads

│   │   └── reports/               # Client report access

│   ├── api/                       # API routes

│   │   ├── ai/                    # AI processing endpoints

│   │   │   ├── categorize/        # Transaction categorization

│   │   │   └── insights/          # Business insights generation

│   │   ├── receipts/              # Receipt processing

│   │   │   ├── upload/            # File upload handling

│   │   │   ├── process/           # OCR processing

│   │   │   └── match/             # Transaction matching

│   │   ├── quickbooks/            # QuickBooks integration

│   │   │   ├── auth/              # OAuth flow

│   │   │   ├── sync/              # Data synchronization

│   │   │   └── webhook/           # QuickBooks webhooks

│   │   ├── reports/               # Report generation

│   │   │   ├── generate/          # AI report generation

│   │   │   └── export/            # PDF export

│   │   └── health/                # System health monitoring

│   ├── globals.css                # Global styles with Tailwind

│   ├── layout.tsx                 # Root layout with providers

│   └── page.tsx                   # Homepage

├── components/                    # React components by feature

│   ├── ai-cleanup/                # AI categorization components

│   │   ├── TransactionList.tsx    # Transaction display

│   │   ├── CategorySuggestions.tsx# AI category suggestions

│   │   └── ConfidenceIndicator.tsx# AI confidence display

│   ├── receipt-upload/            # Receipt processing components

│   │   ├── DropzoneUpload.tsx     # File upload interface

│   │   ├── ReceiptPreview.tsx     # Receipt image preview

│   │   └── MatchingResults.tsx    # Transaction matching results

│   ├── dashboard/                 # Dashboard components

│   │   ├── MetricCards.tsx        # Key financial metrics

│   │   ├── ClientOverview.tsx     # Client status overview

│   │   └── ActivityFeed.tsx       # Recent activity feed

│   ├── reports/                   # Report components

│   │   ├── ReportViewer.tsx       # PDF/HTML report display

│   │   ├── InsightsPanel.tsx      # AI business insights

│   │   └── ExportOptions.tsx      # Report export options

│   ├── client-portal/             # Client-facing components

│   │   ├── SimpleUpload.tsx       # Simplified receipt upload

│   │   ├── ReportAccess.tsx       # Client report viewing

│   │   └── NotificationCenter.tsx # Client notifications

│   ├── auth/                      # Authentication components

│   │   ├── LoginForm.tsx          # Login interface

│   │   ├── SignupForm.tsx         # Registration interface

│   │   └── RoleSelector.tsx       # Role selection

│   └── ui/                        # Reusable UI components

│       ├── Button.tsx             # Custom button component

│       ├── Card.tsx               # Card layout component

│       ├── Modal.tsx              # Modal dialogs

│       └── LoadingSpinner.tsx     # Loading indicators

├── lib/                          # Core utilities and services

│   ├── ai-services/              # AI integrations

│   │   ├── openai-client.ts      # OpenAI API wrapper

│   │   ├── categorization.ts     # Transaction categorization logic

│   │   └── report-generation.ts  # AI report generation

│   ├── database/                 # Supabase database layer

│   │   ├── supabase.ts           # Supabase client configuration

│   │   ├── transactions.ts       # Transaction CRUD operations

│   │   ├── receipts.ts           # Receipt CRUD operations

│   │   ├── reports.ts            # Report CRUD operations

│   │   └── auth.ts               # Authentication utilities

│   ├── integrations/             # External service integrations

│   │   ├── quickbooks.ts         # QuickBooks API integration

│   │   ├── mindee-ocr.ts         # Mindee OCR processing

│   │   └── pdf-generator.ts      # PDF report generation

│   ├── types/                    # TypeScript type definitions

│   │   ├── database.types.ts     # Supabase generated types

│   │   ├── ai.types.ts           # AI service types

│   │   ├── quickbooks.types.ts   # QuickBooks API types

│   │   └── receipt.types.ts      # Receipt processing types

│   ├── utils/                    # Helper functions

│   │   ├── formatters.ts         # Data formatting utilities

│   │   ├── validators.ts         # Input validation

│   │   ├── encryption.ts         # Data encryption utilities

│   │   └── file-handling.ts      # File upload/processing

│   └── hooks/                    # Custom React hooks

│       ├── useAuth.ts            # Authentication state

│       ├── useTransactions.ts    # Transaction data fetching

│       ├── useReceipts.ts        # Receipt management

│       └── useReports.ts         # Report generation

├── middleware.ts                 # Next.js middleware for auth

├── supabase/                     # Database schema and migrations

│   ├── migrations/               # Database migration files

│   │   ├── 001\_initial\_schema.sql

│   │   ├── 002\_rls\_policies.sql

│   │   └── 003\_indexes.sql

│   └── seed.sql                  # Development seed data

├── public/                       # Static assets

│   ├── images/                   # Application images

│   ├── icons/                    # UI icons and favicons

│   └── docs/                     # Documentation assets

├── styles/                       # Additional styles

│   └── globals.css               # Global CSS with Tailwind

├── \_\_tests\_\_/                    # Test files

│   ├── ai-services/              # AI service tests

│   ├── components/               # Component tests

│   ├── api/                      # API endpoint tests

│   └── e2e/                      # End-to-end tests

├── next.config.js                # Next.js configuration

├── tailwind.config.js            # Tailwind CSS configuration

├── tsconfig.json                 # TypeScript configuration

└── vercel.json                   # Vercel deployment configuration

```



\### Key Files to Know



| File | Purpose | When You'd Touch It |

|------|---------|---------------------|

| `app/api/ai/categorize/route.ts` | AI transaction categorization | Adding new categorization features |

| `lib/integrations/quickbooks.ts` | QuickBooks API integration | Modifying QB sync functionality |

| `lib/ai-services/openai-client.ts` | OpenAI service wrapper | Adjusting AI models or prompts |

| `components/ai-cleanup/TransactionList.tsx` | Main transaction interface | UI improvements for categorization |

| `lib/database/supabase.ts` | Database client configuration | Database connection changes |

| `supabase/migrations/` | Database schema changes | Adding tables or modifying structure |

| `middleware.ts` | Authentication middleware | Auth flow modifications |

| `app/layout.tsx` | Root layout and providers | Global app configuration |

| `next.config.js` | Next.js build configuration | Build optimization and API config |

| `tailwind.config.js` | Design system configuration | UI/styling system changes |



---



\## 🔧 Technology Stack



\### Core Technologies

\- \*\*Language:\*\* TypeScript (5.5+) - Full type safety across frontend and backend

\- \*\*Framework:\*\* Next.js 14 with App Router - Server-side rendering and API routes

\- \*\*Database:\*\* Supabase PostgreSQL - Real-time capabilities with Row Level Security

\- \*\*Authentication:\*\* Supabase Auth - Role-based access control for multi-tenant architecture

\- \*\*Styling:\*\* Tailwind CSS 3.4 - Utility-first CSS with custom component library



\### Key Libraries

\- \*\*openai\*\* - GPT-4 integration for transaction categorization and business insights

\- \*\*@mindee/mindee-js\*\* - OCR processing for receipt data extraction

\- \*\*@supabase/supabase-js\*\* - Database operations and real-time subscriptions

\- \*\*intuit-oauth\*\* - QuickBooks OAuth integration for financial data access

\- \*\*jsPDF\*\* - PDF generation for financial reports

\- \*\*framer-motion\*\* - UI animations and micro-interactions

\- \*\*react-dropzone\*\* - File upload interface for receipts



\### AI \& External Services

\- \*\*OpenAI GPT-4\*\* - Transaction categorization, report generation, business insights

\- \*\*Mindee OCR API\*\* - Receipt processing and data extraction

\- \*\*QuickBooks API\*\* - Financial data synchronization and OAuth integration

\- \*\*Supabase Storage\*\* - Encrypted file storage for receipts and documents



\### Development Tools

\- \*\*Jest\*\* - Unit testing framework with AI service mocks

\- \*\*Playwright\*\* - End-to-end testing for user workflows

\- \*\*ESLint\*\* - Code quality with Next.js and TypeScript rules

\- \*\*Prettier\*\* - Code formatting and consistency

\- \*\*Supabase CLI\*\* - Database migrations and type generation



---



\## 🌐 External Dependencies



\### Required Services

\- \*\*Supabase\*\* - Primary database, authentication, and file storage

\- \*\*OpenAI API\*\* - AI-powered transaction categorization and report generation

\- \*\*Mindee OCR API\*\* - Receipt processing and data extraction

\- \*\*QuickBooks API\*\* - Financial data integration and OAuth authentication

\- \*\*Vercel\*\* - Hosting platform with serverless functions and global CDN



\### Optional Integrations

\- \*\*Stripe\*\* - Payment processing for subscription tiers (if premium features)

\- \*\*SendGrid\*\* - Email notifications and report delivery

\- \*\*Sentry\*\* - Error monitoring and performance tracking

\- \*\*PostHog\*\* - User analytics and feature usage tracking



\### Environment Variables



```bash

\# Required - Database \& Auth

NEXT\_PUBLIC\_SUPABASE\_URL=          # Supabase project URL

NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY=     # Supabase anonymous key

SUPABASE\_SERVICE\_ROLE\_KEY=         # Supabase service role key



\# Required - AI Services

OPENAI\_API\_KEY=                    # OpenAI API for categorization/insights

MINDEE\_API\_KEY=                    # Mindee OCR processing



\# Required - QuickBooks Integration

QUICKBOOKS\_CLIENT\_ID=              # QuickBooks app client ID

QUICKBOOKS\_CLIENT\_SECRET=          # QuickBooks app client secret

QUICKBOOKS\_REDIRECT\_URI=           # OAuth redirect URI

QUICKBOOKS\_ENVIRONMENT=            # sandbox | production



\# Optional - Additional Services

STRIPE\_SECRET\_KEY=                 # Payment processing (if premium)

SENDGRID\_API\_KEY=                  # Email notifications

SENTRY\_DSN=                        # Error monitoring

POSTHOG\_API\_KEY=                   # User analytics



\# Development

DATABASE\_URL=                      # Local development database

NEXT\_PUBLIC\_APP\_URL=               # Application base URL

```



---



\## 📋 Common Workflows



\### QuickBooks Integration Workflow

1\. Accountant initiates QuickBooks connection from dashboard

2\. OAuth flow redirects to QuickBooks authorization

3\. System stores encrypted access tokens in database

4\. Background sync pulls transaction data from QuickBooks

5\. AI automatically categorizes imported transactions



\*\*Code path:\*\* `app/dashboard/page.tsx` → `app/api/quickbooks/auth/route.ts` → `lib/integrations/quickbooks.ts` → `lib/ai-services/categorization.ts`



\### AI Transaction Categorization Workflow

1\. System displays uncategorized transactions to accountant

2\. AI analyzes transaction descriptions, vendors, and amounts

3\. GPT-4 suggests categories with confidence scores

4\. Accountant reviews and approves/modifies suggestions

5\. System learns from feedback for future categorizations



\*\*Code path:\*\* `components/ai-cleanup/TransactionList.tsx` → `app/api/ai/categorize/route.ts` → `lib/ai-services/openai-client.ts` → `lib/database/transactions.ts`



\### Receipt Processing Workflow

1\. Client uploads receipt through client portal

2\. File is stored securely in Supabase Storage

3\. OCR service extracts vendor, amount, and date information

4\. AI matches receipt to existing transactions

5\. Accountant reviews matches and confirms linkages



\*\*Code path:\*\* `components/receipt-upload/DropzoneUpload.tsx` → `app/api/receipts/upload/route.ts` → `lib/integrations/mindee-ocr.ts` → `app/api/receipts/match/route.ts`



\### Report Generation Workflow

1\. Accountant selects client and reporting period

2\. System aggregates categorized transactions and matched receipts

3\. AI generates business insights and plain English summaries

4\. PDF report is created with financial data and insights

5\. Report is shared with client through secure portal



\*\*Code path:\*\* `components/reports/ReportViewer.tsx` → `app/api/reports/generate/route.ts` → `lib/ai-services/report-generation.ts` → `lib/integrations/pdf-generator.ts`



---



\## 📊 Performance \& Scale



\### Performance Considerations

\- \*\*AI API Optimization\*\* - Request batching and response caching for categorization

\- \*\*Database Queries\*\* - Optimized PostgreSQL queries with proper indexing and RLS

\- \*\*File Upload Optimization\*\* - Direct Supabase Storage uploads with progress tracking

\- \*\*Real-time Updates\*\* - Supabase subscriptions for live transaction updates



\### Multi-Tenant Architecture

\- \*\*Row Level Security\*\* - Database-level isolation between accountants and their clients

\- \*\*Role-Based Access\*\* - Granular permissions for accountant vs client features

\- \*\*Data Isolation\*\* - Encrypted storage with tenant-specific access controls

\- \*\*Scalable Design\*\* - Horizontal scaling for thousands of accountants and clients



\### Monitoring

\- \*\*Health Checks\*\* - `/api/health` endpoint monitors database, AI services, and integrations

\- \*\*Performance Metrics\*\* - Real-time monitoring of AI processing times and costs

\- \*\*Error Tracking\*\* - Comprehensive error handling with fallback mechanisms

\- \*\*Usage Analytics\*\* - AI token usage tracking and cost optimization



---



\## 🚨 Things to Be Careful About



\### 🔒 Security Considerations

\- \*\*Financial Data Protection\*\* - All sensitive data encrypted at rest and in transit

\- \*\*Multi-Tenant Isolation\*\* - Strict RLS policies prevent cross-tenant data access

\- \*\*API Key Management\*\* - All external service keys stored in environment variables

\- \*\*File Upload Security\*\* - Virus scanning and file type validation for receipts

\- \*\*OAuth Token Security\*\* - Encrypted storage of QuickBooks access tokens



\### 🤖 AI Service Management

\- \*\*Token Usage Monitoring\*\* - Track OpenAI API costs and implement usage limits

\- \*\*Categorization Accuracy\*\* - Monitor AI categorization confidence and user feedback

\- \*\*Fallback Handling\*\* - Graceful degradation when AI services are unavailable

\- \*\*Data Privacy\*\* - Ensure financial data sent to AI services is properly anonymized



\### 💰 Financial Data Integrity

\- \*\*QuickBooks Sync Reliability\*\* - Proper error handling for failed synchronizations

\- \*\*Transaction Matching\*\* - Prevent duplicate entries and maintain data consistency

\- \*\*Audit Trail\*\* - Complete logging of all financial data modifications

\- \*\*Backup Strategy\*\* - Regular backups of critical financial data



\### 🏢 Multi-Tenant Considerations

\- \*\*Client Data Separation\*\* - Ensure clients can only access their own data

\- \*\*Accountant Permissions\*\* - Proper access control for accountant-client relationships

\- \*\*Data Export\*\* - Secure methods for data portability and client offboarding

\- \*\*Compliance Readiness\*\* - SOX, GDPR, and accounting regulation compliance



\*Updated at: 2025-01-16 UTC\*

