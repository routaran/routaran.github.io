# Wireframe Specification Document

## 1. Overview

This document defines the comprehensive wireframe structure for the Pickleball Tracker application, organizing screens by user role and device type. The application has four main user roles:

- **Visitor**: Read-only access to rankings without authentication
- **User** (Player): Authenticated players who can enter scores and view their profiles
- **Originator** (Organizer): Creates and manages Play Dates, including custom court naming and partnership management
- **Admin** (Project Owner): Full access to all Play Dates across the system

## 2. Directory Structure

```
wireframes/
├── visitor/
│   ├── mobile/
│   │   └── rankings.svg
│   └── desktop/
│       └── rankings.svg
├── user/
│   ├── mobile/
│   │   ├── login.svg
│   │   ├── dashboard.svg
│   │   ├── match_details.svg
│   │   ├── score_entry.svg
│   │   ├── rankings.svg
│   │   └── profile.svg
│   └── desktop/
│       ├── login.svg
│       ├── dashboard.svg
│       ├── match_details.svg
│       └── profile.svg
├── originator/
│   ├── mobile/
│   │   ├── play_date_list.svg
│   │   ├── play_date_create.svg
│   │   ├── player_management.svg
│   │   ├── court_setup.svg
│   │   ├── schedule_view.svg
│   │   ├── partnership_management.svg
│   │   └── partnership_analytics.svg
│   └── desktop/
│       ├── play_date_create.svg
│       ├── player_management.svg
│       ├── schedule_view.svg
│       ├── settings_organizer.svg
│       ├── partnership_management.svg
│       └── partnership_analytics.svg
└── admin/
    ├── mobile/
    │   ├── admin_dashboard.svg
    │   ├── global_players.svg
    │   ├── system_health.svg
    │   └── audit_log.svg
    └── desktop/
        ├── admin_dashboard.svg
        ├── global_players.svg
        ├── system_health.svg
        └── admin_settings.svg
```

## 3. Wireframe Statistics

- **Total wireframes**: 33
- **Visitor role**: 2 wireframes (rankings only - MVP complete)
- **User role**: 10 wireframes (core player functionality)
- **Originator role**: 13 wireframes (includes partnership management)
- **Admin role**: 8 wireframes (system administration)

## 4. Wireframe Specifications

### 4.1 Visitor Role Wireframes

#### Mobile & Desktop Screens

1. **rankings.svg**
   - Public read-only access to live rankings
   - No authentication required
   - Shows current tournament standings
   - Refreshes automatically via Supabase Realtime
   - Prompts visitor to login for full functionality

*Note: Visitor role is MVP complete - provides essential read-only access to rankings for non-authenticated users.*

### 4.2 User Role Wireframes

#### Mobile Screens

1. **match_details.svg**
   - Shows detailed view of a single match
   - Displays all 4 players involved
   - Shows court assignment and round number
   - Includes match status (waiting/completed)
   - If completed, shows final score and who recorded it

2. **profile.svg**
   - Player's personal stats
   - Match history
   - Partnership performance
   - Email management (claim/update)

#### Desktop Screens

1. **match_details.svg**
   - Expanded view with more statistics
   - Shows head-to-head history
   - Partnership combinations performance

2. **profile.svg**
   - Dashboard-style layout with charts
   - Detailed performance metrics
   - Historical trend analysis

### 4.3 Originator Role Wireframes

#### Mobile Screens

1. **play_date_list.svg**
   - List of all Play Dates created by this organizer
   - Quick stats for each (players, completion %)
   - Create new Play Date button
   - Filter by date/status

2. **play_date_create.svg**
   - Date picker (YYYY-MM-DD format)
   - Number of courts input (1-4)
   - Win condition settings (First-to-Target vs Win-by-2)
   - Target score setting (5-21)
   - Create button

3. **player_management.svg**
   - Add player form (name + email)
   - List of current players
   - Edit/delete player buttons
   - Validation for 4-16 players

4. **court_setup.svg**
   - List of courts (1 to number specified)
   - Custom name input for each court
   - Default naming: "Court 1", "Court 2", etc.
   - Examples shown: "Blue Court", "Court 5", "Center Court"
   - Save court names button

5. **schedule_view.svg**
   - Round-by-round view
   - Each match shows court name (custom or default)
   - Partnership assignments
   - Bye round indicators for odd player counts
   - Swipe between rounds

6. **partnership_management.svg** ⭐ NEW FEATURE
   - Shows all generated partnerships for the Play Date
   - Displays partnership pairings with player names
   - Round-robin match distribution visualization
   - Partnership statistics (games played, wins/losses)
   - Links to detailed partnership analytics

7. **partnership_analytics.svg** ⭐ NEW FEATURE
   - Detailed analytics for each partnership
   - Head-to-head performance against other partnerships
   - Historical partnership performance trends
   - Win rate statistics and point differentials
   - Partnership compatibility metrics


#### Desktop Screens

1. **play_date_create.svg**
   - Single form with all settings
   - Live preview of settings
   - Enhanced layout for desktop use

2. **player_management.svg**
   - Table view with sorting
   - Drag-and-drop reordering
   - Bulk player operations

3. **schedule_view.svg**
   - Full tournament bracket view
   - All rounds visible simultaneously
   - Enhanced desktop layout
   - Print-friendly options

4. **settings_organizer.svg**
   - Organizer-specific settings panel
   - Play Date configuration options
   - Court and tournament preferences

5. **partnership_management.svg** ⭐ NEW FEATURE
   - Enhanced desktop view of partnerships
   - Grid layout showing all partnerships
   - Advanced filtering and sorting
   - Partnership performance comparisons

6. **partnership_analytics.svg** ⭐ NEW FEATURE
   - Comprehensive analytics dashboard
   - Charts and graphs for partnership performance
   - Advanced statistical analysis
   - Export capabilities for partnership data


### 4.4 Admin Role Wireframes

#### Mobile Screens

1. **admin_dashboard.svg**
   - System overview with key metrics
   - Active Play Dates summary
   - Recent activity feed
   - Quick access to admin functions

2. **global_players.svg**
   - Global player database view
   - Merge duplicate players
   - View player claims (auth mappings)
   - Player statistics and management

3. **system_health.svg**
   - System health monitoring
   - Database connection status
   - Performance metrics
   - Error tracking and alerts

4. **audit_log.svg**
   - Score edit history
   - Filter by player/date/Play Date
   - Dispute resolution tools
   - System activity tracking

#### Desktop Screens

1. **admin_dashboard.svg**
   - Enhanced multi-panel dashboard
   - System health metrics
   - Active users count
   - Recent activity feed
   - Quick actions panel

2. **global_players.svg**
   - Comprehensive player database
   - Advanced search and filters
   - Player relationship mapping
   - Performance analytics

3. **system_health.svg**
   - Detailed system monitoring
   - Performance dashboards
   - Error tracking and resolution
   - Capacity planning metrics

4. **admin_settings.svg**
   - Tabbed interface for settings categories
   - Live preview of changes
   - System configuration options
   - API and integration settings

## 5. Design Standards

### 5.1 Mobile Standards
- Screen size: 360x800px (iPhone SE baseline)
- Touch targets: Minimum 44x44px
- Font sizes: 
  - Headers: 18-20px
  - Body: 14-16px
  - Captions: 12px
- Margins: 20px horizontal
- Card padding: 16px
- Bottom navigation: 80px height

### 5.2 Desktop Standards
- Screen size: 1200x800px minimum
- Sidebar width: 240px
- Main content margins: 40px
- Card grid: 3 columns for matches
- Font sizes:
  - Headers: 24-28px
  - Body: 16px
  - Captions: 14px

### 5.3 Component Standards
- Primary buttons: Green (#4CAF50)
- Secondary buttons: Blue (#2196F3)
- Destructive buttons: Red (#f44336)
- Your content highlight: Light green background (#e8f5e9)
- Completed items: Gray background (#f5f5f5)
- Court badges: Blue circles with white text
- Rankings medals: Gold/Silver/Bronze for top 3

### 5.4 Accessibility Requirements
- WCAG 2.1 AA compliance
- High contrast text (4.5:1 minimum)
- Focus indicators on all interactive elements
- Screen reader labels on all icons
- Logical tab order

## 6. Requirements Mapping

### 6.1 User Role Requirements

| Requirement | Wireframe(s) |
|-------------|--------------|
| FR-01: Create Play Date | originator/*/play_date_create.svg |
| FR-02: Specify courts | originator/*/play_date_create.svg, court_setup.svg |
| FR-03: Manage players | originator/*/player_management.svg |
| FR-04: Round-robin schedule | originator/*/schedule_view.svg |
| FR-06: List matches | user/*/dashboard.svg |
| FR-07: Enter scores | user/mobile/score_entry.svg |
| FR-10: Rankings | user/*/rankings.svg, visitor/*/rankings.svg |
| FR-17: Magic link login | user/*/login.svg |
| FR-21: Partnership management | originator/*/partnership_management.svg |
| **NEW**: Custom court names | originator/*/court_setup.svg |
| **NEW**: Partnership analytics | originator/*/partnership_analytics.svg |

### 6.2 Originator Role Requirements

| Requirement | Wireframe(s) |
|-------------|--------------|
| FR-12: Regenerate schedule | originator/*/schedule_view.svg |
| FR-16: Win conditions | originator/*/play_date_create.svg |
| FR-21: Partnership pre-generation | originator/*/partnership_management.svg |
| FR-22: Fair bye round rotation | originator/*/partnership_analytics.svg |

### 6.3 Admin Role Requirements

| Requirement | Wireframe(s) |
|-------------|--------------|
| Full Play Date access | admin/*/admin_dashboard.svg |
| Player management | admin/*/global_players.svg |
| Audit trail (FR-20) | admin/*/audit_log.svg |
| System configuration | admin/*/admin_settings.svg |
| System monitoring | admin/*/system_health.svg |

## 7. Implementation Notes

### 7.1 Progressive Enhancement
- Mobile wireframes are the primary design
- Desktop versions enhance with more visible data
- Score entry remains mobile-only (even on desktop, redirect to mobile view)

### 7.2 Real-time Updates
- All list views should indicate real-time connectivity
- Show update indicators when data changes
- Optimistic UI updates for better perceived performance

### 7.3 Partnership Management Feature
- Pre-generated partnerships for enhanced analytics (FR-21)
- Round-robin ensures each partnership plays with/against all others exactly once
- Partnership performance tracking across matches
- Fair bye round rotation for odd player counts (FR-22)
- Detailed partnership analytics and statistics
- Historical partnership performance data

### 7.4 Court Naming Feature
- Court names are per-Play Date (not global)
- Default to "Court 1", "Court 2", etc. if not customized
- Display custom names throughout the app:
  - Match listings
  - Schedule views
  - Score entry screens
- Maximum 20 characters per court name
- Allow emojis in court names for fun personalization

### 7.5 State Management
- Wireframes should indicate loading states
- Error states for failed operations
- Empty states with helpful actions
- Success confirmations for major actions

## 8. Scope Changes and Updates

### 8.1 Removed Features (Out of Scope)
- **Import/Export functionality** (FR-13, FR-14) - Removed from requirements
- **Archive/backup features** - Handled by Supabase data persistence
- **Offline support** - Requires active internet connection
- **Push notifications** - In-browser realtime updates only

### 8.2 Added Features
- **Visitor role** - Read-only rankings access without authentication
- **Partnership management** - Enhanced analytics and pre-generation (FR-21)
- **Partnership analytics** - Detailed performance metrics and trends
- **System health monitoring** - Admin dashboard for system oversight

### 8.3 Implementation Status
- **Wireframes**: 33 total wireframes completed
- **Visitor MVP**: Complete (rankings view)
- **Partnership system**: Wireframes complete, ready for implementation
- **Admin system**: Core wireframes complete
- **User flows**: All primary user journeys documented

## 9. Next Steps

1. Implement partnership management backend logic
2. Build visitor role authentication flow
3. Create partnership analytics components
4. Develop admin system health monitoring
5. Add interactive prototype annotations
6. Create component library for reusable elements
7. Document interaction flows between screens