# Troubleshooting Guide

This guide covers common issues you may encounter while developing, deploying, or using the Pickleball Tracker application.

## Table of Contents

- [Development Issues](#development-issues)
- [Build and Deployment Issues](#build-and-deployment-issues)
- [Authentication Issues](#authentication-issues)
- [Database Issues](#database-issues)
- [Real-Time Issues](#real-time-issues)
- [Performance Issues](#performance-issues)
- [User Interface Issues](#user-interface-issues)
- [Debugging Tools](#debugging-tools)

## Development Issues

### Cannot Start Development Server

**Symptoms:**
- `npm run dev` fails
- Port already in use error
- Module not found errors

**Solutions:**

1. **Port conflicts:**
   ```bash
   # Kill process using port 5173
   npx kill-port 5173
   
   # Or use different port
   npm run dev -- --port 3000
   ```

2. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Clear Vite cache:**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

### TypeScript Errors

**Symptoms:**
- Red squiggly lines in VS Code
- Build fails with type errors
- Cannot find module errors

**Solutions:**

1. **Restart TypeScript server in VS Code:**
   - `Cmd/Ctrl + Shift + P`
   - Type "TypeScript: Restart TS Server"

2. **Check tsconfig.json paths:**
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

3. **Install missing type definitions:**
   ```bash
   npm install --save-dev @types/node
   ```

### Import Path Issues

**Symptoms:**
- "Module not found" errors
- Absolute imports not working

**Solutions:**

1. **Verify Vite config aliases:**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './src')
       }
     }
   })
   ```

2. **Use correct import syntax:**
   ```typescript
   // Good
   import { Button } from '@/components/common/Button'
   
   // Bad
   import { Button } from '../../../components/common/Button'
   ```

## Build and Deployment Issues

### Build Fails

**Symptoms:**
- `npm run build` fails
- Out of memory errors
- Type errors in build

**Solutions:**

1. **Check environment variables:**
   ```bash
   # Ensure all required variables are set
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   ```

2. **Increase Node.js memory:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

3. **Clean build artifacts:**
   ```bash
   rm -rf dist node_modules/.vite
   npm run build
   ```

### GitHub Actions Deployment Fails

**Symptoms:**
- Deployment workflow fails
- Environment variables not found
- Pages not updating

**Solutions:**

1. **Check GitHub Secrets:**
   - Go to repository Settings → Secrets
   - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set

2. **Verify workflow permissions:**
   ```yaml
   permissions:
     contents: read
     pages: write
     id-token: write
   ```

3. **Check workflow logs:**
   - Go to Actions tab
   - Click on failed workflow
   - Review error messages

### 404 Errors on Production

**Symptoms:**
- Direct URLs return 404
- Refresh causes 404
- Works on development

**Solutions:**

1. **Add 404.html for SPA routing:**
   ```html
   <!-- public/404.html -->
   <!DOCTYPE html>
   <html>
   <head>
     <meta charset="utf-8">
     <title>Pickleball Tracker</title>
     <script>
       sessionStorage.redirect = location.href;
     </script>
     <meta http-equiv="refresh" content="0;URL='/routaran.github.io'">
   </head>
   <body></body>
   </html>
   ```

2. **Handle redirects in main app:**
   ```typescript
   // In App.tsx or main.tsx
   const redirect = sessionStorage.redirect;
   delete sessionStorage.redirect;
   if (redirect && redirect !== location.href) {
     history.replaceState(null, null, redirect);
   }
   ```

## Authentication Issues

### Magic Link Not Working

**Symptoms:**
- Magic link emails not received
- Magic link returns errors
- Cannot log in

**Solutions:**

1. **Check email configuration:**
   - Go to Supabase Authentication → Email Templates
   - Verify SMTP settings
   - Check spam folder

2. **Verify redirect URL:**
   ```typescript
   const { error } = await supabase.auth.signInWithOtp({
     email,
     options: {
       emailRedirectTo: 'https://yourapp.com/auth/callback'
     }
   })
   ```

3. **Add redirect URL to Supabase:**
   - Go to Authentication → URL Configuration
   - Add your domain to redirect URLs

### User Not Authenticated

**Symptoms:**
- User appears logged out
- Auth state inconsistent
- RLS policies blocking access

**Solutions:**

1. **Check session persistence:**
   ```typescript
   useEffect(() => {
     const { data: { subscription } } = supabase.auth.onAuthStateChange(
       (event, session) => {
         console.log('Auth state:', event, session)
       }
     )
     return () => subscription.unsubscribe()
   }, [])
   ```

2. **Verify JWT token:**
   ```typescript
   const { data: { session } } = await supabase.auth.getSession()
   console.log('Session:', session)
   ```

3. **Clear local storage:**
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   location.reload()
   ```

## Database Issues

### RLS Policy Errors

**Symptoms:**
- "Row level security policy violated" errors
- Cannot read/write data
- Permissions denied

**Solutions:**

1. **Check user authentication:**
   ```sql
   SELECT auth.uid(); -- Should return user ID
   ```

2. **Review RLS policies:**
   ```sql
   -- View policies for a table
   SELECT * FROM pg_policies WHERE tablename = 'matches';
   ```

3. **Test policy conditions:**
   ```sql
   -- Debug policy function
   SELECT get_current_player_id();
   SELECT is_project_owner();
   ```

### Query Performance Issues

**Symptoms:**
- Slow page loads
- Database timeouts
- High CPU usage

**Solutions:**

1. **Add missing indexes:**
   ```sql
   CREATE INDEX idx_matches_play_date ON matches(play_date_id);
   CREATE INDEX idx_partnerships_play_date ON partnerships(play_date_id);
   ```

2. **Optimize queries:**
   ```typescript
   // Good - select only needed columns
   .select('id, name, date')
   
   // Bad - select everything
   .select('*')
   ```

3. **Use EXPLAIN ANALYZE:**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM matches WHERE play_date_id = '...';
   ```

### Migration Errors

**Symptoms:**
- Migration scripts fail
- Database schema mismatch
- Foreign key constraints

**Solutions:**

1. **Run migrations in order:**
   ```bash
   # Check migration files are numbered correctly
   ls supabase/migrations/
   ```

2. **Check foreign key dependencies:**
   ```sql
   -- Verify referenced tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

3. **Rollback and retry:**
   ```sql
   DROP TABLE IF EXISTS problematic_table CASCADE;
   -- Re-run migration
   ```

## Real-Time Issues

### Real-Time Not Working

**Symptoms:**
- Changes not appearing in real-time
- WebSocket connection fails
- Subscription errors

**Solutions:**

1. **Check Supabase Realtime settings:**
   - Go to Database → Replication
   - Ensure tables are enabled for replication

2. **Verify subscription setup:**
   ```typescript
   const subscription = supabase
     .channel('matches')
     .on('postgres_changes', {
       event: '*',
       schema: 'public',
       table: 'matches'
     }, (payload) => {
       console.log('Change received!', payload)
     })
     .subscribe((status) => {
       console.log('Subscription status:', status)
     })
   ```

3. **Check connection status:**
   ```typescript
   supabase.realtime.setAuth('your-jwt-token')
   ```

### Connection Drops

**Symptoms:**
- Frequent disconnections
- "Connection lost" messages
- Manual refresh required

**Solutions:**

1. **Implement auto-reconnect:**
   ```typescript
   useEffect(() => {
     const subscription = supabase
       .channel('matches')
       .on('system', { event: 'CHANNEL_ERROR' }, () => {
         console.log('Reconnecting...')
         subscription.unsubscribe()
         // Recreate subscription
       })
       .subscribe()
       
     return () => subscription.unsubscribe()
   }, [])
   ```

2. **Handle network changes:**
   ```typescript
   useEffect(() => {
     const handleOnline = () => {
       // Reestablish connections
     }
     window.addEventListener('online', handleOnline)
     return () => window.removeEventListener('online', handleOnline)
   }, [])
   ```

## Performance Issues

### Slow Initial Load

**Symptoms:**
- Long loading times
- Large bundle size
- Poor Lighthouse scores

**Solutions:**

1. **Implement code splitting:**
   ```typescript
   // Lazy load pages
   const Dashboard = lazy(() => import('./pages/Dashboard'))
   const PlayDate = lazy(() => import('./pages/PlayDate'))
   ```

2. **Optimize bundle size:**
   ```bash
   # Analyze bundle
   npm run build
   npx vite-bundle-analyzer dist
   ```

3. **Enable compression:**
   ```typescript
   // vite.config.ts
   import { defineConfig } from 'vite'
   import { compression } from 'vite-plugin-compression'
   
   export default defineConfig({
     plugins: [compression()]
   })
   ```

### Memory Leaks

**Symptoms:**
- Increasing memory usage
- Browser becomes unresponsive
- Component re-renders

**Solutions:**

1. **Clean up subscriptions:**
   ```typescript
   useEffect(() => {
     const subscription = supabase.channel('matches').subscribe()
     return () => subscription.unsubscribe() // Important!
   }, [])
   ```

2. **Use dependency arrays correctly:**
   ```typescript
   // Good
   useEffect(() => {
     // effect code
   }, [dependency])
   
   // Bad - missing dependencies
   useEffect(() => {
     // effect code
   }, [])
   ```

## User Interface Issues

### Mobile Responsiveness

**Symptoms:**
- Layout breaks on mobile
- Touch targets too small
- Horizontal scrolling

**Solutions:**

1. **Use mobile-first approach:**
   ```css
   /* Mobile first */
   .button {
     @apply px-4 py-2 text-sm;
   }
   
   /* Then tablet/desktop */
   @screen md {
     .button {
       @apply px-6 py-3 text-base;
     }
   }
   ```

2. **Ensure minimum touch targets:**
   ```css
   .touch-target {
     @apply min-h-[44px] min-w-[44px];
   }
   ```

### Accessibility Issues

**Symptoms:**
- Screen reader problems
- Keyboard navigation issues
- Color contrast warnings

**Solutions:**

1. **Add ARIA labels:**
   ```jsx
   <button aria-label="Delete match">🗑️</button>
   ```

2. **Ensure keyboard navigation:**
   ```jsx
   <div 
     tabIndex={0}
     onKeyDown={(e) => e.key === 'Enter' && handleClick()}
   >
   ```

3. **Use semantic HTML:**
   ```jsx
   // Good
   <button onClick={handleClick}>Submit</button>
   
   // Bad
   <div onClick={handleClick}>Submit</div>
   ```

## Debugging Tools

### Browser DevTools

1. **Network Tab**: Monitor API calls
2. **Console**: Check for errors and logs
3. **Application Tab**: Inspect local storage and session data
4. **Sources Tab**: Set breakpoints in code

### React DevTools

1. **Components**: Inspect component tree and props
2. **Profiler**: Analyze performance and re-renders

### Supabase Dashboard

1. **Logs**: View real-time database logs
2. **SQL Editor**: Test queries directly
3. **API Docs**: Reference auto-generated API documentation

### VS Code Extensions

1. **Error Lens**: Inline error display
2. **GitLens**: Git history and blame information
3. **ES7+ React Snippets**: Code snippets for faster development

### Useful Console Commands

```javascript
// Check current user
console.log(await supabase.auth.getUser())

// Test database connection
console.log(await supabase.from('players').select('count'))

// View current route
console.log(window.location)

// Check local storage
console.log(localStorage)
```

### Performance Monitoring

```typescript
// Measure component render time
console.time('Component Render')
// ... component logic
console.timeEnd('Component Render')

// Monitor memory usage
console.log(performance.memory)
```

## Getting Help

If you can't resolve an issue:

1. **Check GitHub Issues**: See if others have encountered the same problem
2. **Supabase Documentation**: Comprehensive guides and API reference
3. **React Documentation**: Official React docs and troubleshooting
4. **Community Resources**: Stack Overflow, Discord communities
5. **Create a Bug Report**: Include steps to reproduce, expected behavior, and actual behavior