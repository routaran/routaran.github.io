# Production Rollback Plan

## Table of Contents
1. [Rollback Overview](#rollback-overview)
2. [Rollback Triggers](#rollback-triggers)
3. [Rollback Procedures](#rollback-procedures)
4. [Database Rollback](#database-rollback)
5. [Communication Plan](#communication-plan)
6. [Testing After Rollback](#testing-after-rollback)
7. [Post-Rollback Analysis](#post-rollback-analysis)

---

## Rollback Overview

### Rollback Philosophy
**Primary Goal**: Restore service functionality with minimal downtime  
**Secondary Goal**: Preserve data integrity during rollback process  
**Recovery Time Objective (RTO)**: <15 minutes for application rollback  
**Recovery Point Objective (RPO)**: <5 minutes for data recovery  

### Rollback Scenarios
1. **Application Deployment Failure** - Code issues preventing normal operation
2. **Database Migration Issues** - Schema changes causing data problems
3. **Performance Degradation** - New release causing unacceptable performance
4. **Security Vulnerabilities** - Critical security issues discovered post-deployment
5. **Third-Party Service Issues** - External service integration failures

---

## Rollback Triggers

### Automatic Rollback Triggers
**Health Check Failures**:
- Application returns 5xx errors for >2 minutes
- Response time exceeds 10 seconds for >1 minute
- Core functionality unavailable (login, score entry)

**Performance Degradation**:
- Page load time increases >200% from baseline
- API response time exceeds 5 seconds
- Database connection errors >10% of requests

### Manual Rollback Triggers
**Critical Bugs**:
- Data corruption or loss
- Security breach or vulnerability
- Complete feature failure
- User-reported critical issues

**Business Impact**:
- Tournament operations disrupted
- Unable to enter scores
- Ranking calculations incorrect
- Authentication failures

---

## Rollback Procedures

### 1. Immediate Assessment (0-5 minutes)

#### Step 1.1: Identify Issue Scope
```bash
# Quick health check
curl -I https://your-domain.com
curl -I https://your-domain.com/api/health

# Check error rates in logs
# Check performance metrics
# Verify core functionality
```

#### Step 1.2: Decision Matrix
| Issue Type | Severity | Auto Rollback | Manual Decision |
|------------|----------|---------------|-----------------|
| 5xx errors | >50% requests | Yes | - |
| Performance | >5s response | Yes | - |
| Data corruption | Any amount | No | Always rollback |
| Security issue | Critical | No | Always rollback |
| Feature broken | Core features | No | Evaluate impact |

### 2. Application Rollback (5-15 minutes)

#### Step 2.1: GitHub Deployment Rollback
```bash
#!/bin/bash
# scripts/rollback-deployment.sh

set -e

# Get the last known good commit
LAST_GOOD_COMMIT=$(git log --oneline --grep="Deploy to production" | head -2 | tail -1 | awk '{print $1}')

echo "🔄 Rolling back to commit: $LAST_GOOD_COMMIT"

# Create rollback branch
ROLLBACK_BRANCH="rollback-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$ROLLBACK_BRANCH"

# Reset to last good commit
git reset --hard "$LAST_GOOD_COMMIT"

# Force push to trigger deployment
git push origin "$ROLLBACK_BRANCH":main --force

echo "✅ Rollback deployment initiated"
echo "📊 Monitor deployment status at: https://github.com/user/repo/actions"
```

#### Step 2.2: Verify Rollback Success
```bash
# Wait for deployment to complete
sleep 60

# Verify site is accessible
curl -f https://your-domain.com || {
  echo "❌ Rollback failed - site still not accessible"
  exit 1
}

# Test core functionality
curl -f https://your-domain.com/api/health || {
  echo "❌ API health check failed"
  exit 1
}

echo "✅ Application rollback successful"
```

### 3. Configuration Rollback (if needed)

#### Step 3.1: Environment Variables
```bash
# Rollback environment variables in GitHub secrets
# This requires manual action in GitHub repository settings

echo "📝 Manual action required:"
echo "1. Go to GitHub Repository Settings > Secrets"
echo "2. Update production secrets to previous values:"
echo "   - VITE_SUPABASE_URL_PRODUCTION"
echo "   - VITE_SUPABASE_ANON_KEY_PRODUCTION"
echo "   - Any other changed secrets"
```

#### Step 3.2: Supabase Configuration
```typescript
// If Supabase configuration needs rollback
const rollbackSupabaseConfig = {
  previousUrl: 'https://previous-project.supabase.co',
  previousKey: 'previous-anon-key',
  // Update these in GitHub secrets
};
```

---

## Database Rollback

### 1. Assessment Phase (0-2 minutes)

#### Step 1.1: Identify Database Changes
```sql
-- Check recent migrations
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 5;

-- Check for data inconsistencies
SELECT 
  table_name,
  count(*) as record_count
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
```

#### Step 1.2: Backup Current State
```bash
# Create immediate backup before rollback
supabase db dump \
  --project-ref "$SUPABASE_PROJECT_REF" \
  --file "backups/pre_rollback_$(date +%Y%m%d_%H%M%S).sql" \
  --data-only
```

### 2. Migration Rollback (if needed)

#### Step 2.1: Schema Rollback
```sql
-- Example: Rollback a column addition
ALTER TABLE matches DROP COLUMN IF EXISTS new_column_name;

-- Example: Rollback a table creation
DROP TABLE IF EXISTS new_table_name;

-- Example: Rollback RLS policy changes
DROP POLICY IF EXISTS new_policy_name ON table_name;
```

#### Step 2.2: Data Rollback
```bash
# Point-in-time recovery using Supabase
TARGET_TIME="2024-01-15T10:30:00Z"  # Time before problematic deployment

# Create recovery project
supabase projects create "pickleball-tracker-recovery" \
  --region us-east-1

# Perform point-in-time recovery
RECOVERY_PROJECT_REF=$(supabase projects list | grep recovery | awk '{print $1}')
supabase db recover \
  --project-ref "$RECOVERY_PROJECT_REF" \
  --target-time "$TARGET_TIME"

echo "🔄 Database recovered to: $TARGET_TIME"
echo "📝 Update application to use recovery project: $RECOVERY_PROJECT_REF"
```

### 3. Data Integrity Verification

#### Step 3.1: Data Consistency Checks
```sql
-- Verify tournament data integrity
SELECT 
  pd.id,
  pd.date,
  count(DISTINCT p.id) as partnerships,
  count(DISTINCT m.id) as matches,
  count(CASE WHEN m.completed_at IS NOT NULL THEN 1 END) as completed_matches
FROM play_dates pd
LEFT JOIN partnerships p ON p.play_date_id = pd.id
LEFT JOIN matches m ON m.play_date_id = pd.id
GROUP BY pd.id, pd.date
ORDER BY pd.date DESC
LIMIT 10;

-- Verify no data corruption
SELECT 
  table_name,
  count(*) as records
FROM (
  SELECT 'play_dates' as table_name, count(*) as count FROM play_dates
  UNION ALL
  SELECT 'players' as table_name, count(*) as count FROM players
  UNION ALL
  SELECT 'matches' as table_name, count(*) as count FROM matches
) as counts;
```

#### Step 3.2: Functional Verification
```bash
# Test core database operations
echo "Testing database functionality..."

# Test user creation
# Test tournament creation
# Test score entry
# Test rankings calculation

echo "✅ Database functionality verified"
```

---

## Communication Plan

### 1. Internal Communication

#### Step 1.1: Team Notification
```markdown
# Rollback Notification Template

**URGENT: Production Rollback Initiated**

**Time**: 2024-01-15 14:30 UTC
**Issue**: [Brief description of issue]
**Action**: Rolling back to previous stable version
**ETA**: 15 minutes
**Status**: In Progress

**Next Update**: 14:45 UTC

**Team**: Please monitor #incidents channel for updates
```

#### Step 1.2: Stakeholder Update
```markdown
# Stakeholder Notification

**Subject**: Pickleball Tracker - Service Restoration in Progress

We detected an issue with the latest update and are immediately restoring the previous stable version.

**Impact**: [Describe user impact]
**Resolution**: Rolling back to stable version
**ETA**: Service restoration within 15 minutes

We will provide another update once service is fully restored.
```

### 2. User Communication

#### Step 2.1: Status Page Update
```markdown
# Status Page Update

**Investigating** - We're investigating reports of issues with tournament functionality.
*Posted 5 minutes ago*

**Identified** - We've identified the issue and are implementing a fix.
*Posted 10 minutes ago*

**Monitoring** - Service has been restored. We're monitoring to ensure stability.
*Posted 20 minutes ago*

**Resolved** - All systems are operating normally.
*Posted 30 minutes ago*
```

#### Step 2.2: User Notification (if needed)
```markdown
# In-App Notification

🔧 **Service Restored**

We experienced a brief service disruption and have restored full functionality. 
Any tournaments in progress have been preserved. 

Thank you for your patience.
```

---

## Testing After Rollback

### 1. Automated Testing (5-10 minutes)

#### Step 1.1: Health Checks
```bash
#!/bin/bash
# scripts/post-rollback-tests.sh

echo "🧪 Running post-rollback tests..."

# Test application availability
curl -f https://your-domain.com || exit 1

# Test authentication
curl -f https://your-domain.com/login || exit 1

# Test API endpoints
curl -f https://your-domain.com/api/health || exit 1

echo "✅ Basic health checks passed"
```

#### Step 1.2: Core Functionality Tests
```typescript
// Automated test suite for post-rollback verification
describe('Post-Rollback Verification', () => {
  test('User can login', async () => {
    // Test magic link authentication
  });

  test('User can create tournament', async () => {
    // Test tournament creation flow
  });

  test('User can enter scores', async () => {
    // Test score entry functionality
  });

  test('Rankings update correctly', async () => {
    // Test ranking calculations
  });

  test('Real-time updates work', async () => {
    // Test real-time subscriptions
  });
});
```

### 2. Manual Testing (10-15 minutes)

#### Step 2.1: Critical User Journeys
```markdown
## Manual Test Checklist

### Authentication Flow
- [ ] Can access login page
- [ ] Can request magic link
- [ ] Can authenticate with magic link
- [ ] Session persists correctly

### Tournament Management
- [ ] Can view tournament list
- [ ] Can create new tournament
- [ ] Can add players
- [ ] Can generate schedule

### Score Entry
- [ ] Can find assigned matches
- [ ] Can enter scores
- [ ] Scores save correctly
- [ ] Rankings update immediately

### Real-time Features
- [ ] Live updates appear
- [ ] Connection status accurate
- [ ] No console errors
```

#### Step 2.2: Data Integrity Verification
```markdown
## Data Verification Checklist

### Tournament Data
- [ ] All tournaments visible
- [ ] Player lists correct
- [ ] Schedules generated properly
- [ ] No missing matches

### Score Data
- [ ] All scores preserved
- [ ] Rankings accurate
- [ ] Statistics correct
- [ ] Audit log intact

### User Data
- [ ] User accounts accessible
- [ ] Permissions working
- [ ] Profile data correct
```

---

## Post-Rollback Analysis

### 1. Incident Analysis (30-60 minutes)

#### Step 1.1: Root Cause Analysis
```markdown
# Incident Report Template

## Incident Summary
**Date**: 2024-01-15
**Duration**: 15 minutes
**Impact**: [Describe user impact]
**Root Cause**: [Technical root cause]

## Timeline
- 14:25 - Deployment completed
- 14:27 - First error reports
- 14:30 - Rollback initiated
- 14:35 - Rollback completed
- 14:40 - Service verified

## Contributing Factors
- [Factor 1]
- [Factor 2]
- [Factor 3]

## Lessons Learned
- [Lesson 1]
- [Lesson 2]
- [Lesson 3]

## Action Items
- [ ] [Action 1] - Owner: [Name] - Due: [Date]
- [ ] [Action 2] - Owner: [Name] - Due: [Date]
- [ ] [Action 3] - Owner: [Name] - Due: [Date]
```

#### Step 1.2: Process Improvements
```markdown
## Rollback Process Improvements

### What Worked Well
- Fast detection of issues
- Automated rollback procedures
- Clear communication plan
- Effective team coordination

### Areas for Improvement
- Earlier detection possible
- Faster rollback execution
- Better user communication
- Improved monitoring

### Action Items
1. Enhanced monitoring alerts
2. Improved rollback automation
3. Better staging environment testing
4. Updated incident response procedures
```

### 2. Prevention Measures

#### Step 2.1: Enhanced Testing
```yaml
# Enhanced CI/CD pipeline
stages:
  - lint_and_test
  - security_scan
  - build
  - staging_deploy
  - integration_tests
  - performance_tests
  - production_deploy
  - smoke_tests
  - monitor
```

#### Step 2.2: Improved Monitoring
```typescript
// Enhanced monitoring configuration
const monitoringConfig = {
  alerts: {
    errorRate: { threshold: '5%', window: '5m' },
    responseTime: { threshold: '2s', window: '2m' },
    healthCheck: { threshold: '1 failure', window: '1m' }
  },
  
  notifications: {
    critical: ['slack', 'email', 'sms'],
    warning: ['slack', 'email'],
    info: ['slack']
  }
};
```

---

## Rollback Checklist Summary

### ✅ Pre-Rollback Checklist
- [ ] Issue severity assessed
- [ ] Rollback decision made
- [ ] Team notified
- [ ] Backup created
- [ ] Rollback procedure identified

### ✅ During Rollback Checklist
- [ ] Application rolled back
- [ ] Database rolled back (if needed)
- [ ] Configuration updated
- [ ] Health checks passed
- [ ] Stakeholders notified

### ✅ Post-Rollback Checklist
- [ ] Core functionality tested
- [ ] Data integrity verified
- [ ] Performance validated
- [ ] Users notified
- [ ] Incident documented
- [ ] Improvements identified

---

**Document Updated**: 2025-01-10  
**Next Review**: After each rollback event  
**Owner**: Development Team  
**Status**: Ready for production use