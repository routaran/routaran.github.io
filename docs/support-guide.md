# Support & Troubleshooting Guide

## Table of Contents
1. [Support Overview](#support-overview)
2. [Common Issues](#common-issues)
3. [Troubleshooting Steps](#troubleshooting-steps)
4. [Error Codes](#error-codes)
5. [User Support](#user-support)
6. [Technical Support](#technical-support)
7. [Issue Escalation](#issue-escalation)

---

## Support Overview

### Support Tiers
1. **Self-Service** - User documentation and FAQ
2. **Community Support** - GitHub Discussions and Issues
3. **Technical Support** - Direct developer assistance
4. **Emergency Support** - Critical system failures

### Response Times
| Priority | Response Time | Resolution Target |
|----------|---------------|-------------------|
| **Critical** | 1 hour | 4 hours |
| **High** | 4 hours | 24 hours |
| **Medium** | 24 hours | 72 hours |
| **Low** | 72 hours | 1 week |

### Support Channels
- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues for bugs and features
- **Discussions**: GitHub Discussions for questions
- **Email**: [Configure support email]

---

## Common Issues

### 1. Authentication Problems

#### Magic Link Not Received
**Symptoms**: User doesn't receive login email
**Common Causes**:
- Email in spam folder
- Incorrect email address
- Email service delays
- Supabase email quota exceeded

**Resolution Steps**:
1. Check spam/junk folder
2. Verify email address spelling
3. Wait 2-3 minutes for delivery
4. Request new magic link
5. Check Supabase email logs

```typescript
// Debug authentication issues
const debugAuth = async (email: string) => {
  console.log('Debugging auth for:', email);
  
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  if (error) {
    console.error('Auth error:', error.message);
    // Check specific error codes
    if (error.message.includes('rate limit')) {
      return 'Too many requests. Please wait before trying again.';
    }
  }
  
  return 'Magic link sent successfully';
};
```

#### Magic Link Expired
**Symptoms**: "Link expired" error when clicking magic link
**Common Causes**:
- Link older than 1 hour
- Link already used
- System clock mismatch

**Resolution Steps**:
1. Request new magic link
2. Click link within 1 hour
3. Ensure system time is correct
4. Clear browser cache if needed

#### Session Issues
**Symptoms**: Randomly logged out, permissions errors
**Common Causes**:
- Token expiration
- Network connectivity issues
- Browser storage limitations
- Supabase session management

**Resolution Steps**:
1. Refresh the page
2. Clear browser data
3. Log out and log back in
4. Check network connection
5. Verify browser supports localStorage

### 2. Tournament Management Issues

#### Can't Create Tournament
**Symptoms**: Tournament creation fails or incomplete
**Common Causes**:
- Insufficient permissions
- Invalid player count (not 4-16)
- Network timeout
- Database constraint violation

**Resolution Steps**:
1. Verify user has Organizer role
2. Check player count is 4-16
3. Ensure all players have email addresses
4. Retry with stable internet connection

```typescript
// Debug tournament creation
const debugTournamentCreation = async (players: Player[]) => {
  // Validate player count
  if (players.length < 4 || players.length > 16) {
    return 'Player count must be between 4 and 16';
  }
  
  // Validate all players have emails
  const missingEmails = players.filter(p => !p.email);
  if (missingEmails.length > 0) {
    return `Players missing emails: ${missingEmails.map(p => p.name).join(', ')}`;
  }
  
  // Check user permissions
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return 'User not authenticated';
  }
  
  return 'Tournament creation validation passed';
};
```

#### Schedule Generation Fails
**Symptoms**: Schedule not created, algorithm errors
**Common Causes**:
- Odd number of players without bye handling
- Too many courts for player count
- Algorithm timeout
- Browser memory issues

**Resolution Steps**:
1. Ensure even number of players or accept bye rounds
2. Reduce court count if too high
3. Refresh page and retry
4. Use desktop browser for large tournaments

### 3. Score Entry Problems

#### Can't Enter Scores
**Symptoms**: Score form disabled, submission fails
**Common Causes**:
- User not in the match
- Score already entered
- Invalid score values
- Optimistic locking conflict

**Resolution Steps**:
1. Verify user is player in the match
2. Check if score already submitted
3. Validate score meets win conditions
4. Refresh page and retry
5. Contact match partner to avoid conflicts

```typescript
// Debug score entry issues
const debugScoreEntry = async (matchId: string, score1: number, score2: number) => {
  // Check if user can edit this match
  const { data: match } = await supabase
    .from('matches')
    .select(`
      *,
      partnership1:partnerships!matches_partnership1_id_fkey(
        player1:players!partnerships_player1_id_fkey(*),
        player2:players!partnerships_player2_id_fkey(*)
      ),
      partnership2:partnerships!matches_partnership2_id_fkey(
        player1:players!partnerships_player1_id_fkey(*),
        player2:players!partnerships_player2_id_fkey(*)
      )
    `)
    .eq('id', matchId)
    .single();
    
  if (!match) {
    return 'Match not found';
  }
  
  if (match.completed_at) {
    return 'Score already entered';
  }
  
  // Validate score
  const validation = validateScore(score1, score2, 'first_to_target', 11);
  if (!validation.valid) {
    return validation.error;
  }
  
  return 'Score entry validation passed';
};
```

#### Score Validation Errors
**Symptoms**: "Invalid score" error messages
**Common Causes**:
- Score doesn't meet win conditions
- Negative scores
- Tie scores
- Wrong target score

**Resolution Steps**:
1. Check win condition requirements
2. Ensure winner reaches target score
3. Verify no negative values
4. Confirm no tie scores

### 4. Real-time Update Issues

#### Rankings Not Updating
**Symptoms**: Old rankings displayed, no live updates
**Common Causes**:
- WebSocket connection failure
- Network connectivity issues
- Browser compatibility
- Supabase Realtime quota

**Resolution Steps**:
1. Check connection status indicator
2. Refresh the page
3. Verify stable internet connection
4. Try different browser
5. Check Supabase Realtime status

```typescript
// Debug real-time issues
const debugRealtime = () => {
  const channel = supabase.channel('debug');
  
  channel
    .on('presence', { event: 'sync' }, () => {
      console.log('✅ Realtime connected');
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'matches'
    }, (payload) => {
      console.log('✅ Database change received:', payload);
    })
    .subscribe((status) => {
      console.log('Realtime status:', status);
    });
    
  // Test connection
  setTimeout(() => {
    const state = channel.presenceState();
    console.log('Connection state:', Object.keys(state).length > 0 ? 'Connected' : 'Disconnected');
  }, 5000);
};
```

---

## Troubleshooting Steps

### General Troubleshooting Workflow

#### Step 1: Basic Checks (2 minutes)
1. **Refresh the page** - Solves 60% of issues
2. **Check internet connection** - Verify other sites work
3. **Try incognito mode** - Eliminates extension conflicts
4. **Check browser console** - Look for error messages

#### Step 2: Browser-Specific (5 minutes)
1. **Clear browser cache and cookies**
2. **Disable browser extensions**
3. **Try different browser** (Chrome, Firefox, Safari)
4. **Update browser to latest version**

#### Step 3: Account-Specific (5 minutes)
1. **Log out and log back in**
2. **Verify account permissions**
3. **Check if issue affects all users**
4. **Try different user account**

#### Step 4: Network-Specific (5 minutes)
1. **Try different network connection**
2. **Disable VPN if using one**
3. **Check firewall settings**
4. **Test on mobile data vs WiFi**

### Browser Console Analysis

#### Common Console Errors and Solutions

```typescript
// Error: "Failed to fetch"
// Solution: Network connection issue or API down
if (error.message.includes('Failed to fetch')) {
  console.log('Check internet connection and API status');
}

// Error: "Unauthorized"
// Solution: Authentication token expired
if (error.message.includes('Unauthorized')) {
  console.log('Please log out and log back in');
}

// Error: "Network timeout"
// Solution: Slow connection or large request
if (error.message.includes('timeout')) {
  console.log('Request timed out - try again with better connection');
}
```

#### Performance Issues
```typescript
// Monitor page performance
const performanceObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      console.log('Page load time:', entry.loadEventEnd - entry.loadEventStart);
    }
  }
});

performanceObserver.observe({ entryTypes: ['navigation'] });
```

---

## Error Codes

### Application Error Codes

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| **AUTH_001** | Magic link expired | Link >1 hour old | Request new magic link |
| **AUTH_002** | Invalid email format | Malformed email | Check email format |
| **AUTH_003** | Rate limit exceeded | Too many requests | Wait 5 minutes |
| **TOUR_001** | Invalid player count | <4 or >16 players | Adjust player count |
| **TOUR_002** | Schedule generation failed | Algorithm error | Retry or reduce complexity |
| **SCORE_001** | Invalid score format | Non-numeric input | Enter valid numbers |
| **SCORE_002** | Score validation failed | Doesn't meet win conditions | Check win requirements |
| **SCORE_003** | Optimistic lock conflict | Concurrent update | Refresh and retry |
| **REAL_001** | Connection timeout | Network/WebSocket issue | Check connection |
| **REAL_002** | Subscription failed | Realtime service down | Check Supabase status |

### Database Error Codes

| Code | Description | User Action |
|------|-------------|-------------|
| **23505** | Unique constraint violation | Data already exists |
| **23503** | Foreign key violation | Referenced data missing |
| **42501** | Insufficient privileges | Check user permissions |
| **57014** | Query timeout | Request too complex |

---

## User Support

### Self-Service Resources

#### Documentation Hierarchy
1. **User Guide** (`docs/user-guide.md`) - Complete feature guide
2. **FAQ Section** - Common questions and answers
3. **Video Tutorials** - Step-by-step walkthroughs (if available)
4. **Feature Documentation** - Detailed feature explanations

#### Common User Questions

**Q: How do I create a tournament?**
A: Go to Dashboard → Create Tournament → Add 4-16 players → Set win conditions → Generate schedule

**Q: Can I edit a tournament after matches start?**
A: Limited editing available before first score. Contact organizer for changes after scores entered.

**Q: Why can't I enter a score?**
A: Ensure you're a player in the match and score hasn't been entered yet. Check win condition requirements.

**Q: How are rankings calculated?**
A: Win percentage (primary), point differential (secondary), head-to-head (tiebreaker)

**Q: Can I use this offline?**
A: No, internet connection required for all features including score entry and viewing.

### User Communication Templates

#### Issue Acknowledgment
```markdown
Hi [User Name],

Thank you for reporting this issue. We've received your request and are investigating.

**Issue**: [Brief description]
**Ticket ID**: #[Number]
**Expected Response**: Within [timeframe]

We'll update you as soon as we have more information.

Best regards,
Support Team
```

#### Issue Resolution
```markdown
Hi [User Name],

Good news! We've resolved the issue you reported.

**Issue**: [Description]
**Resolution**: [What was fixed]
**Status**: Resolved

Please try again and let us know if you continue to experience problems.

Best regards,
Support Team
```

---

## Technical Support

### Development Team Support

#### Issue Information Gathering
When users report issues, collect:

1. **Environment Information**:
   - Browser name and version
   - Operating system
   - Device type (mobile/tablet/desktop)
   - Screen resolution

2. **Reproduction Steps**:
   - Exact steps to reproduce
   - Expected vs actual behavior
   - When the issue first occurred
   - Frequency of occurrence

3. **Technical Details**:
   - Console error messages
   - Network tab information
   - Screenshots or screen recordings
   - User account information (no passwords)

#### Technical Investigation Tools

```typescript
// User session debugging
const debugUserSession = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  console.log('User Debug Info:', {
    authenticated: !!user,
    userId: user?.id,
    email: user?.email,
    lastSignIn: user?.last_sign_in_at,
    role: user?.user_metadata?.role
  });
  
  if (error) {
    console.error('Auth Error:', error);
  }
};

// Database connection testing
const testDatabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('play_dates')
      .select('count(*)')
      .limit(1);
      
    if (error) {
      console.error('Database Error:', error);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    return false;
  }
};
```

### Log Analysis

#### Application Logs
```typescript
// Enhanced error logging
const logError = (error: Error, context: string, additionalData?: any) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    message: error.message,
    stack: error.stack,
    userAgent: navigator.userAgent,
    url: window.location.href,
    userId: getCurrentUserId(),
    additionalData
  };
  
  // Send to logging service
  console.error('Application Error:', errorInfo);
  
  // Send to external service in production
  if (process.env.NODE_ENV === 'production') {
    sendToLoggingService(errorInfo);
  }
};
```

#### Performance Monitoring
```typescript
// Performance debugging
const monitorPerformance = () => {
  // Monitor Core Web Vitals
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
  
  // Monitor custom metrics
  performance.mark('tournament-creation-start');
  // ... tournament creation logic
  performance.mark('tournament-creation-end');
  performance.measure('tournament-creation', 'tournament-creation-start', 'tournament-creation-end');
};
```

---

## Issue Escalation

### Escalation Triggers

#### Automatic Escalation
- Multiple users reporting same issue
- Security-related incidents
- Data corruption reports
- System-wide outages

#### Manual Escalation
- Issue unresolved after 24 hours
- User requests escalation
- Technical complexity beyond support level
- Business-critical impact

### Escalation Contacts

```yaml
escalation_levels:
  level_1:
    title: "First Line Support"
    contact: "support@example.com"
    response_time: "4 hours"
    
  level_2:
    title: "Technical Lead"
    contact: "tech-lead@example.com"
    response_time: "2 hours"
    
  level_3:
    title: "Engineering Team"
    contact: "engineering@example.com"
    response_time: "1 hour"
    
  level_4:
    title: "Emergency Response"
    contact: "emergency@example.com"
    response_time: "30 minutes"
```

### Escalation Documentation

#### Issue Handoff Template
```markdown
# Issue Escalation: [Ticket ID]

## Issue Summary
**Reporter**: [User information]
**Issue Type**: [Bug/Feature/Support]
**Priority**: [Critical/High/Medium/Low]
**First Reported**: [Date/Time]

## Problem Description
[Detailed description of the issue]

## Investigation Summary
### Steps Taken
- [Action 1]
- [Action 2]
- [Action 3]

### Findings
- [Finding 1]
- [Finding 2]

### Attempted Solutions
- [Solution 1] - Result: [Success/Failed]
- [Solution 2] - Result: [Success/Failed]

## Technical Details
- **Environment**: [Production/Staging/Development]
- **Browser**: [Browser information]
- **Console Errors**: [Any error messages]
- **Reproduction Steps**: [How to reproduce]

## Business Impact
- **Users Affected**: [Number/All/Specific group]
- **Functionality Impact**: [What's broken]
- **Urgency**: [Why this needs attention]

## Recommended Next Steps
1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

## Contact Information
**Escalating From**: [Name/Email]
**User Contact**: [User email]
**Ticket Created**: [Date/Time]
```

---

## Support Metrics & KPIs

### Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| **First Response Time** | <4 hours | Time to first human response |
| **Resolution Time** | <24 hours | Time to issue resolution |
| **User Satisfaction** | >90% | Post-resolution survey |
| **First Contact Resolution** | >75% | Issues resolved without escalation |
| **Escalation Rate** | <10% | Issues requiring escalation |

### Support Quality Metrics
```typescript
// Support metrics tracking
interface SupportMetrics {
  ticketId: string;
  createdAt: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  escalated: boolean;
  userSatisfaction?: number; // 1-5 scale
  category: 'bug' | 'feature' | 'support' | 'documentation';
}

const calculateMetrics = (tickets: SupportMetrics[]) => {
  const avgResponseTime = tickets
    .filter(t => t.firstResponseAt)
    .reduce((sum, t) => sum + (t.firstResponseAt!.getTime() - t.createdAt.getTime()), 0) / tickets.length;
    
  const avgResolutionTime = tickets
    .filter(t => t.resolvedAt)
    .reduce((sum, t) => sum + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0) / tickets.length;
    
  return {
    avgResponseTime: avgResponseTime / (1000 * 60 * 60), // hours
    avgResolutionTime: avgResolutionTime / (1000 * 60 * 60), // hours
    escalationRate: tickets.filter(t => t.escalated).length / tickets.length * 100,
    satisfaction: tickets
      .filter(t => t.userSatisfaction)
      .reduce((sum, t) => sum + t.userSatisfaction!, 0) / tickets.filter(t => t.userSatisfaction).length
  };
};
```

---

**Document Updated**: 2025-01-10  
**Next Review**: Monthly  
**Owner**: Support Team  
**Version**: 1.0