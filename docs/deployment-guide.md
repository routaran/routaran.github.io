# Deployment Guide

This guide covers deploying the Pickleball Tracker application to production using GitHub Pages for the frontend and Supabase for the backend.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Supabase Setup](#supabase-setup)
- [GitHub Pages Setup](#github-pages-setup)
- [CI/CD Configuration](#cicd-configuration)
- [Environment Variables](#environment-variables)
- [Deployment Process](#deployment-process)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Rollback Procedures](#rollback-procedures)

## Overview

The deployment architecture consists of:

- **Frontend**: Static React app hosted on GitHub Pages
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **CI/CD**: GitHub Actions for automated deployment
- **Domain**: GitHub Pages default or custom domain

## Prerequisites

### Required Access

- GitHub repository with admin permissions
- Supabase account with project creation ability
- Custom domain (optional)

### Local Requirements

- Git configured with repository access
- Node.js 18+ for local builds
- Supabase CLI (optional, for advanced operations)

## Supabase Setup

### 1. Create Supabase Project

1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Configure:
   - **Name**: pickleball-tracker-prod
   - **Database Password**: Generate strong password
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier or Pro

### 2. Database Setup

#### Run Migrations

Execute migrations in the SQL editor:

```sql
-- Run each migration file in order
-- Location: supabase/migrations/
```

1. Navigate to SQL Editor in Supabase Dashboard
2. Copy and run each migration file in numerical order:
   - `001_initial_schema.sql`
   - `002_add_partnerships.sql`
   - `003_add_audit_log.sql`
   - etc.

#### Verify Tables

Confirm all tables are created:
- play_dates
- players
- player_claims
- partnerships
- matches
- match_results (view)
- audit_log

### 3. Configure Authentication

1. Go to Authentication → Providers
2. Enable Email provider
3. Configure:
   - **Enable Email Confirmations**: Yes
   - **Secure Email Change**: Yes
   - **Magic Link**: Enable

4. Set up email templates:
   - Go to Authentication → Email Templates
   - Customize magic link email

### 4. Set Up Row Level Security

Verify RLS is enabled on all tables:

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### 5. Configure Realtime

1. Go to Database → Replication
2. Enable replication for:
   - matches
   - play_dates
   - players

### 6. Get API Credentials

1. Go to Settings → API
2. Copy:
   - **Project URL**: `https://[project-id].supabase.co`
   - **Anon Key**: For public client access

## GitHub Pages Setup

### 1. Enable GitHub Pages

1. Go to repository Settings → Pages
2. Configure:
   - **Source**: Deploy from a branch
   - **Branch**: `gh-pages`
   - **Folder**: `/ (root)`

### 2. Custom Domain (Optional)

1. Add custom domain in Pages settings
2. Configure DNS:
   ```
   Type: CNAME
   Name: www
   Value: [username].github.io
   ```

3. Enable HTTPS enforcement

## CI/CD Configuration

### 1. GitHub Actions Workflow

The deployment workflow is located at `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: app/package-lock.json

      - name: Install dependencies
        working-directory: ./app
        run: npm ci

      - name: Build
        working-directory: ./app
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./app/dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 2. Configure GitHub Secrets

Add secrets in repository Settings → Secrets:

1. `VITE_SUPABASE_URL`: Your Supabase project URL
2. `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

## Environment Variables

### Production Variables

```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Build-Time Variables

All environment variables must be prefixed with `VITE_` to be included in the build.

## Deployment Process

### Automatic Deployment

1. Merge PR to main branch
2. GitHub Actions workflow triggers
3. Workflow:
   - Installs dependencies
   - Runs tests
   - Builds production bundle
   - Deploys to GitHub Pages

### Manual Deployment

1. Trigger workflow manually:
   - Go to Actions tab
   - Select "Deploy to GitHub Pages"
   - Click "Run workflow"

### Local Build Verification

Test the production build locally:

```bash
cd app
npm run build
npm run preview
```

## Post-Deployment

### 1. Verify Deployment

1. Check GitHub Actions for successful run
2. Visit production URL
3. Test key features:
   - Authentication
   - Creating play date
   - Real-time updates
   - Score entry

### 2. Database Verification

Ensure production database has:
- Correct RLS policies
- Proper indexes
- Seed data (if needed)

### 3. Performance Check

1. Run Lighthouse audit
2. Check bundle size
3. Verify lazy loading

## Monitoring

### Application Monitoring

1. **GitHub Actions**: Monitor deployment status
2. **Supabase Dashboard**:
   - Database performance
   - API usage
   - Real-time connections

### Error Tracking

Consider integrating:
- Sentry for error tracking
- LogRocket for session replay
- Google Analytics for usage

### Health Checks

Create monitoring for:
- Application availability
- Database connectivity
- API response times

## Rollback Procedures

### Quick Rollback

1. Go to GitHub Actions
2. Find last successful deployment
3. Click "Re-run all jobs"

### Manual Rollback

```bash
# Checkout previous version
git checkout <commit-hash>

# Create rollback branch
git checkout -b rollback/version-x

# Push and create PR
git push origin rollback/version-x
```

### Database Rollback

1. Identify migration to rollback
2. Create reverse migration
3. Apply via Supabase SQL editor
4. Update application code

## Production Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies verified
- [ ] Email templates configured
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Rollback plan documented

## Troubleshooting Deployment

### Build Failures

1. Check GitHub Actions logs
2. Verify environment variables
3. Test local build

### 404 Errors

For SPA routing on GitHub Pages:

1. Ensure `404.html` exists
2. Contains redirect to index.html
3. Already handled in build process

### CORS Issues

1. Check Supabase URL is correct
2. Verify anon key is valid
3. Check browser console for errors

### Performance Issues

1. Enable caching headers
2. Optimize bundle size
3. Use CDN for assets
4. Enable gzip compression