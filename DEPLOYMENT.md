# BooksFlow AI - Deployment & DevOps Documentation

## Overview
This document provides comprehensive deployment and DevOps information for the BooksFlow AI project.

## Quick Start - Local Development

### Prerequisites
- Node.js 18+ and npm 9+
- Docker and Docker Compose (optional, for full stack development)
- Git

### Setup Steps

1. **Clone and Install**
   ```bash
   git clone https://github.com/your-org/BooksFlowAI.git
   cd BooksFlowAI
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   # Server will be available at http://localhost:3000
   ```

4. **Docker Development (Full Stack)**
   ```bash
   docker-compose up -d
   # Frontend: http://localhost:3000
   # PostgreSQL: localhost:5432
   # Redis: localhost:6379
   ```

## Deployment

### Vercel Deployment (Recommended)

The project is configured for seamless Vercel deployment:

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Environment Variables**: Set the following in Vercel dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - `NEXTAUTH_SECRET`
   
3. **Deploy**: Push to `main` branch triggers automatic deployment

### Manual Deployment

```bash
npm run build
npm start
```

## CI/CD Pipeline

### GitHub Actions Workflows

1. **Main CI/CD** (`.github/workflows/ci.yml`)
   - Runs on: Push to `main/develop`, PRs to `main`
   - Steps: Test → Security Scan → Build → Deploy
   - Preview deployments for PRs
   - Production deployment on main branch

2. **Security Scanning** (`.github/workflows/security.yml`)
   - Runs: Daily at 2 AM UTC, manual trigger
   - Tools: Snyk vulnerability scan, npm audit
   - Dependency review on PRs

### Required Secrets

Configure these in GitHub repository settings:

```
# Vercel Integration
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id

# Security Tools
SNYK_TOKEN=your-snyk-token
CODECOV_TOKEN=your-codecov-token

# Application URLs
PRODUCTION_URL=https://your-production-url.vercel.app
```

## Environment Variables

### Development (.env.local)
```bash
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Production (Vercel Environment Variables)
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-openai-key
NEXTAUTH_SECRET=your-nextauth-secret
```

## Security Configuration

### Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- X-XSS-Protection: 1; mode=block

### Dependency Management
- Automated security scanning with Snyk
- Daily vulnerability checks
- Dependency review on pull requests
- Moderate severity threshold enforcement

## Monitoring & Health Checks

### Health Check Endpoint
- **URL**: `/api/health`
- **Response**: System status, uptime, memory usage
- **Used by**: Docker health checks, CI/CD pipeline

### Monitoring Integration
- Vercel Analytics (production)
- Sentry error tracking (when configured)
- Application performance monitoring

## Docker Configuration

### Local Development Stack
```bash
docker-compose up -d
```

**Services:**
- Next.js frontend (port 3000)
- PostgreSQL database (port 5432)
- Redis cache (port 6379)

### Production Docker Build
```bash
docker build -t booksflow-ai .
docker run -p 3000:3000 booksflow-ai
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors: `npm run type-check`
   - Verify environment variables are set
   - Clear .next cache: `rm -rf .next`

2. **Docker Issues**
   - Ensure ports are not in use
   - Reset Docker volumes: `docker-compose down -v`
   - Check Docker daemon is running

3. **Deployment Issues**
   - Verify all required environment variables are set
   - Check build logs in Vercel dashboard
   - Ensure dependencies are properly declared in package.json

### Rollback Procedure

1. **Vercel Rollback**: Use Vercel dashboard to rollback to previous deployment
2. **Git Rollback**: 
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

## Performance Guidelines

### Build Optimization
- Image optimization enabled
- Bundle analysis available: `npm run build -- --analyze`
- Tree shaking for unused code elimination
- SWC minification enabled

### Runtime Performance
- Server-side rendering for initial page load
- Static generation where applicable
- Code splitting by route
- Optimized font loading (Inter font)

## Security Best Practices

1. **Never commit sensitive data**
2. **Use environment variables for all secrets**
3. **Keep dependencies updated**
4. **Review security scan results**
5. **Enable security headers**
6. **Use HTTPS in production**

## Next Steps for Development Team

1. Install dependencies: `npm install`
2. Set up local environment variables
3. Start development server: `npm run dev`
4. Begin implementing application features
5. Follow the established CI/CD workflow for deployments

For questions or issues, refer to the project documentation or create an issue in the repository.