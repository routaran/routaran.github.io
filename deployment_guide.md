# Deployment Guide - Pickleball Tracker

This guide walks you through deploying the Pickleball Tracker application to production using GitHub Pages and Supabase.

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [GitHub Pages Configuration](#github-pages-configuration)
4. [GitHub Secrets Setup](#github-secrets-setup)
5. [Supabase Configuration](#supabase-configuration)
6. [Deployment Process](#deployment-process)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)

---

## Overview

The Pickleball Tracker uses a modern deployment pipeline:
- **Frontend**: React SPA deployed to GitHub Pages via GitHub Actions
- **Backend**: Supabase (managed PostgreSQL + Auth + Realtime)
- **CI/CD**: Automated testing and deployment on push to master

### Key Features
- ✅ Automated deployment on merge to master
- ✅ Pre-deployment testing (lint, type-check, unit tests)
- ✅ Security scanning
- ✅ Zero-downtime deployments
- ✅ Automatic HTTPS via GitHub Pages

---

## Prerequisites

Before deploying, ensure you have:

1. **GitHub Account** with repository access
2. **Supabase Account** with a project created
3. **Repository Cloned** locally for development
4. **Node.js 18+** installed (for local testing)

### Required Information
Gather these before starting:
- [ ] Supabase Project URL (format: `https://[project-id].supabase.co`)
- [ ] Supabase Anonymous Key (safe for client-side use)
- [ ] GitHub repository name (e.g., `routaran.github.io`)

---

## GitHub Pages Configuration

### Step 1: Enable GitHub Pages with GitHub Actions

1. **Navigate to your repository** on GitHub
   ```
   https://github.com/[your-username]/routaran.github.io
   ```

2. **Go to Settings**
   - Click the "Settings" tab in the repository menu

3. **Find Pages in the sidebar**
   - Scroll down to "Pages" under "Code and automation"

4. **Configure the Source**
   - In "Build and deployment" section
   - Find "Source" dropdown
   - Change from "Deploy from a branch" to **"GitHub Actions"**
   - No other configuration needed!

### Why GitHub Actions?
- **Full control** over the build process
- **Environment variables** can be injected at build time
- **Testing** runs before deployment
- **Security** - secrets aren't exposed in the repository

---

## GitHub Secrets Setup

### Step 2: Configure Repository Secrets

1. **Go to Settings → Secrets and variables → Actions**

2. **Click "New repository secret"** for each:

   | Secret Name | Description | Example |
   |------------|-------------|---------|
   | `VITE_SUPABASE_URL` | Your Supabase project URL | `https://abcdefgh.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGc...` (long string) |
   | `CODECOV_TOKEN` | (Optional) For coverage reports | Token from codecov.io |

3. **How to find Supabase credentials:**
   - Log in to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to Settings → API
   - Copy "Project URL" and "anon public" key

### Security Note
The anonymous key is safe for client-side use. Never commit the service role key!

---

## Supabase Configuration

### Step 3: Prepare Supabase for Production

1. **Database Setup** (if not already done)
   ```bash
   # Run migrations from project root
   cd supabase
   supabase db push
   ```

2. **Verify RLS Policies**
   - Check all tables have RLS enabled
   - Test policies work correctly
   - Review audit_log table

3. **Configure Authentication**
   - Go to Authentication → Settings
   - Set site URL: `https://[your-username].github.io/routaran.github.io`
   - Configure email templates (optional)
   - Enable/disable auth providers as needed

4. **Production Checklist**
   - [ ] RLS enabled on all tables
   - [ ] Email settings configured
   - [ ] Site URL matches GitHub Pages URL
   - [ ] API rate limits reviewed
   - [ ] Backup schedule configured

---

## Deployment Process

### Step 4: Deploy to Production

#### Option A: Deploy from Command Line
```bash
# 1. Ensure you're on the correct branch
git checkout master

# 2. Merge your feature branch
git merge feature/your-branch

# 3. Push to trigger deployment
git push origin master
```

#### Option B: Deploy via Pull Request
1. Create PR from your branch to master
2. Wait for checks to pass
3. Merge PR (deployment triggers automatically)

### Step 5: Monitor Deployment

1. **Go to Actions tab** in your repository
2. **Find the workflow** named "Deploy to GitHub Pages"
3. **Click to see progress** (typically takes 3-5 minutes)

#### Deployment Stages:
- 🔵 **Build and Test** - Runs linting, tests, builds app
- 🟡 **Security Scan** - Checks for vulnerabilities
- 🟢 **Deploy** - Uploads to GitHub Pages

### Success Indicators:
- ✅ All workflow steps show green checkmarks
- ✅ "Deploy to GitHub Pages" badge is green
- ✅ Environment URL is displayed

---

## Post-Deployment Verification

### Step 6: Verify Deployment

1. **Visit your site**
   ```
   https://[your-username].github.io/routaran.github.io/
   ```

2. **Run through this checklist:**

   #### Basic Functionality
   - [ ] Site loads without errors
   - [ ] No console errors in browser DevTools
   - [ ] CSS styles are applied correctly
   - [ ] Images and assets load properly

   #### Authentication
   - [ ] Login page displays
   - [ ] Can request magic link
   - [ ] Email arrives and link works
   - [ ] Session persists after login

   #### Core Features
   - [ ] Can create a Play Date
   - [ ] Schedule generates correctly
   - [ ] Can enter scores
   - [ ] Rankings update in real-time
   - [ ] All user roles work (test each)

   #### Performance
   - [ ] Page loads in <2 seconds
   - [ ] No significant lag
   - [ ] Mobile responsive design works

3. **Check monitoring** (if configured)
   - Error rates normal
   - Performance metrics good
   - No security alerts

---

## Troubleshooting

### Common Issues and Solutions

#### Site shows 404 error
- **Cause**: GitHub Pages not enabled or wrong source
- **Fix**: Verify Pages is enabled with GitHub Actions source

#### Blank white page
- **Cause**: Build failed or wrong base path
- **Fix**: Check Actions tab for errors, verify `base` in vite.config.ts

#### Authentication not working
- **Cause**: Wrong Supabase URL or site URL mismatch
- **Fix**: 
  1. Verify secrets are set correctly
  2. Check Supabase dashboard site URL matches GitHub Pages URL
  3. Ensure no trailing slashes in URLs

#### Assets not loading (broken images/CSS)
- **Cause**: Incorrect base path configuration
- **Fix**: Ensure `vite.config.ts` has correct base path for production

#### Real-time updates not working
- **Cause**: WebSocket connection blocked
- **Fix**: 
  1. Check browser console for WebSocket errors
  2. Verify Supabase Realtime is enabled
  3. Check for firewall/proxy blocking

#### Build fails in GitHub Actions
- **Cause**: Test failures, lint errors, or missing dependencies
- **Fix**:
  1. Run locally: `npm run lint && npm run test`
  2. Fix any errors
  3. Ensure all dependencies are in package.json

### Debug Commands
```bash
# Run locally to replicate CI environment
cd app
npm ci
npm run lint
npm run type-check
npm run test
npm run build
```

---

## Rollback Procedures

If something goes wrong, you can quickly rollback:

### Quick Rollback (< 5 minutes)
```bash
# 1. Find the last working commit
git log --oneline | head -10

# 2. Create rollback branch
git checkout -b rollback-fix

# 3. Reset to last known good commit
git reset --hard [commit-hash]

# 4. Force push to master
git push origin rollback-fix:master --force
```

### For detailed rollback procedures:
See `docs/rollback-plan.md` for comprehensive rollback instructions including:
- Database rollback procedures
- Point-in-time recovery
- Communication templates
- Post-rollback verification

---

## Additional Resources

### Documentation
- **User Guide**: `docs/user-guide.md`
- **API Reference**: `docs/api-reference.md`
- **Security Audit**: `docs/security-audit.md`
- **Performance Benchmarks**: `docs/performance-benchmarks.md`
- **Support Guide**: `docs/support-guide.md`

### External Links
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#github-pages)

### Support
- **Issues**: Use GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions
- **Security**: Report security issues privately

---

## Deployment Checklist Summary

### Pre-Deployment
- [ ] GitHub Pages source set to "GitHub Actions"
- [ ] GitHub Secrets configured (SUPABASE_URL, SUPABASE_ANON_KEY)
- [ ] Supabase production settings verified
- [ ] All tests passing locally
- [ ] Feature branch ready to merge

### Deployment
- [ ] Merge to master branch
- [ ] Monitor GitHub Actions progress
- [ ] Verify successful deployment

### Post-Deployment
- [ ] Site accessible at GitHub Pages URL
- [ ] All features working correctly
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Monitor for issues

---

**Last Updated**: 2025-01-10  
**Deployment Status**: Ready for Production 🚀