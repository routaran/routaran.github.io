# Architecture Overview

This document describes the architecture of the Pickleball Tracker application, including system design, component structure, data flow, and key architectural decisions.

## Table of Contents

- [System Architecture](#system-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Real-Time Features](#real-time-features)
- [Deployment Architecture](#deployment-architecture)

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    React SPA (Vite)                      │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │   Pages     │  │  Components  │  │    Stores    │  │   │
│  │  └─────────────┘  └──────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Pages                             │
│                    (Static File Hosting)                         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ API Calls
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                           Supabase                               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐    │
│  │     Auth     │  │   Database   │  │     Realtime      │    │
│  │  (Magic Link)│  │ (PostgreSQL) │  │  (WebSockets)     │    │
│  └──────────────┘  └──────────────┘  └───────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite 5
- **UI Framework**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand + React Context
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Hosting**: GitHub Pages (Static)
- **CI/CD**: GitHub Actions

## Frontend Architecture

### Component Organization

The application follows a feature-based organization structure:

```
app/src/
├── components/           # Feature-based components
│   ├── auth/            # Authentication components
│   ├── common/          # Shared UI components
│   ├── dashboard/       # Dashboard features
│   ├── layout/          # Layout components
│   ├── playdate/        # Play date management
│   ├── rankings/        # Rankings display
│   ├── realtime/        # Real-time features
│   ├── schedule/        # Schedule viewing
│   └── score/           # Score entry
├── pages/               # Page-level components
├── hooks/               # Custom React hooks
├── stores/              # Zustand state stores
├── contexts/            # React contexts
├── lib/                 # Utilities and services
└── types/               # TypeScript definitions
```

### State Management

The application uses a hybrid approach for state management:

1. **Zustand Stores** - Global application state
   - `authStore`: Authentication state and user permissions
   - `appStore`: General application state

2. **React Context** - Feature-specific state
   - `RealtimeContext`: Manages WebSocket connections
   - `ToastContext`: Notification system

3. **Local Component State** - UI-specific state

### Routing

React Router v6 handles client-side routing:

```typescript
/                     # Redirects to dashboard or login
/login               # Authentication page
/dashboard           # Main dashboard (authenticated)
/play-dates/new      # Create new play date
/play-dates/:id      # Play date details
/rankings/:id        # Public rankings view
/auth/callback       # Auth callback handler
```

### Key Components

#### Layout Components

- **RootLayout**: Main application layout with navigation
- **Navigation**: Responsive navigation with role-based menu items
- **ProtectedRoute**: Authentication wrapper for protected pages

#### Feature Components

- **PlayDateForm**: Complex form for creating tournaments
- **ScheduleView**: Display and manage tournament schedules
- **ScoreEntryForm**: Optimistic score updates with conflict resolution
- **RankingsTable**: Real-time rankings calculation and display

#### Common Components

- **Button, Card, Modal**: Reusable UI components from shadcn/ui
- **ErrorBoundary**: Global error handling
- **LoadingSpinner**: Consistent loading states
- **Toast**: Notification system

## Backend Architecture

### Database Schema

The database follows a partnership-based model optimized for doubles play:

```sql
-- Core Tables
play_dates          # Tournament events
players             # All registered players
player_claims       # Links players to auth UIDs
partnerships        # Doubles pairings
matches             # Games between partnerships
match_results       # Materialized view for stats
audit_log          # Score change history

-- Supporting Tables
play_date_players   # Players in each tournament
```

### Key Design Decisions

1. **Partnership Model**: Matches are between partnerships (pairs), not individual players
2. **Optimistic Locking**: Version field on matches prevents concurrent updates
3. **Audit Trail**: Complete history of score changes for dispute resolution
4. **Materialized Views**: Pre-calculated stats for performance

### Row Level Security (RLS)

All tables implement RLS policies based on user roles:

```sql
-- Example: Matches table policies
- SELECT: Anyone can view matches
- INSERT: Organizers can create matches
- UPDATE: Players can update their own match scores
- DELETE: Only project owners can delete matches
```

## Data Flow

### Score Entry Flow

```
1. User enters score in UI
2. Optimistic update in local state
3. API call to Supabase with version check
4. If successful:
   - Database updated
   - Audit log entry created
   - Realtime broadcast to all clients
5. If conflict:
   - Fetch latest data
   - Show conflict resolution UI
```

### Real-Time Updates

```
1. Client subscribes to Supabase Realtime channels
2. Database changes trigger Realtime events
3. Events broadcast to all subscribed clients
4. Clients update local state
5. React re-renders affected components
```

## Security Architecture

### Authentication

- **Magic Links**: Passwordless authentication via email
- **Session Management**: Supabase handles JWT tokens
- **Player Claims**: First-time users claim their player name

### Authorization

- **RLS Policies**: Database-level access control
- **Role Hierarchy**:
  1. Project Owner: Full access
  2. Organizer: Manage own tournaments
  3. Player: Update own scores
  4. Visitor: Read-only

### Data Protection

- **HTTPS**: All traffic encrypted
- **Sanitization**: Input validation on all forms
- **No PII in Exports**: Email addresses excluded from JSON exports
- **CSP Headers**: Prevent XSS attacks

## Real-Time Features

### Architecture

```
┌──────────────┐     WebSocket      ┌─────────────────┐
│    Client    │ ◄─────────────────► │    Supabase     │
│              │                     │    Realtime     │
└──────────────┘                     └─────────────────┘
       │                                      ▲
       │                                      │
       ▼                                      │
┌──────────────┐                     ┌─────────────────┐
│  Local State │                     │   PostgreSQL    │
│   (Zustand)  │                     │   (Triggers)    │
└──────────────┘                     └─────────────────┘
```

### Implementation

1. **Connection Management**: Auto-reconnect with exponential backoff
2. **Channel Subscriptions**: Table-specific channels for targeted updates
3. **Optimistic UI**: Immediate feedback with rollback on failure
4. **Status Indicators**: Visual feedback for connection state

## Deployment Architecture

### Build Process

```
1. GitHub Actions triggered on push to main
2. Install dependencies and run tests
3. Build static assets with Vite
4. Deploy to GitHub Pages
```

### Static Hosting

- **GitHub Pages**: Serves static files
- **Custom Domain**: Optional custom domain support
- **Cache Headers**: Optimized for performance
- **404 Handling**: SPA routing support

### Environment Configuration

```bash
# Production variables set in GitHub Secrets
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

## Performance Considerations

### Frontend Optimization

- **Code Splitting**: Route-based lazy loading
- **Bundle Size**: Tree-shaking and minification
- **Asset Optimization**: Image compression and lazy loading
- **Caching**: Service worker for offline assets

### Backend Optimization

- **Database Indexes**: Optimized query performance
- **Connection Pooling**: Managed by Supabase
- **Query Optimization**: Efficient partnership-based queries
- **Materialized Views**: Pre-calculated statistics

## Scalability

### Current Limitations

- **Concurrent Users**: ~100 per tournament (Realtime connection limits)
- **Database Size**: Supabase free tier limits
- **Static Hosting**: No server-side processing

### Future Considerations

- **CDN Integration**: CloudFlare for global distribution
- **Database Scaling**: Supabase Pro for larger tournaments
- **Caching Layer**: Redis for frequently accessed data
- **Background Jobs**: Supabase Edge Functions for async processing