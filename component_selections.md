# Component Selections - Pickleball Tracker

This document provides a comprehensive mapping of UI components identified from wireframe analysis to shadcn/ui components and custom implementations for the Pickleball Tracker application.

## Overview

After analyzing all 30 wireframes across 4 user roles (Visitor, User, Originator, Admin), this document catalogs every UI component needed, maps them to shadcn/ui components where appropriate, and identifies custom components that extend beyond the base library.

## Component Inventory

### 1. Layout & Navigation Components

#### 1.1 Sidebar Navigation (Desktop)
- **Usage:** Admin and Organizer desktop views
- **Implementation:** Custom component using shadcn/ui Button variants
- **Variants:** 
  - Active state (highlighted background)
  - Inactive state (ghost variant)
- **Example:** Admin dashboard sidebar, Organizer dashboard sidebar

#### 1.2 Bottom Navigation (Mobile)
- **Usage:** All mobile views
- **Implementation:** Custom component using shadcn/ui Button variants
- **Variants:**
  - Active tab (highlighted with colored background)
  - Inactive tab (ghost variant)
- **Touch Target:** Minimum 44px height
- **Example:** User mobile navigation, Admin mobile navigation

#### 1.3 Header/App Bar
- **Usage:** All pages
- **Implementation:** Custom component with shadcn/ui typography
- **Variants:**
  - Simple header (title only)
  - Header with actions (settings, back button)
- **Example:** "Today's Matches", "Admin Dashboard"

#### 1.4 Tabs
- **Usage:** Admin settings, filtering options
- **Implementation:** shadcn/ui Tabs component
- **Variants:**
  - Default tabs
  - Underlined tabs
- **Example:** Admin settings tabs (General, Email, Security, etc.)

### 2. Form & Input Components

#### 2.1 Input Fields
- **Usage:** All forms (login, player creation, search)
- **Implementation:** shadcn/ui Input component
- **Variants:**
  - Text input
  - Email input
  - Search input (with icon)
  - Number input (target scores)
- **States:** Default, focused, error, disabled
- **Example:** Player name input, email input, search fields

#### 2.2 Select Dropdowns
- **Usage:** Player selection, filtering, sorting
- **Implementation:** shadcn/ui Select component
- **Variants:**
  - Single select
  - Searchable select
  - Multi-select (for bulk operations)
- **Example:** Player dropdown in login, filter dropdowns

#### 2.3 Radio Buttons
- **Usage:** Win condition selection, court count selection
- **Implementation:** shadcn/ui RadioGroup component
- **Variants:**
  - Default radio group
  - Card-style radio group (visual selection)
- **Example:** Win condition selection, court count selection

#### 2.4 Checkboxes
- **Usage:** Settings, preferences, bulk selections
- **Implementation:** shadcn/ui Checkbox component
- **Variants:**
  - Default checkbox
  - Indeterminate state
- **Example:** Notification preferences, bulk selection

#### 2.5 Toggle Switches
- **Usage:** Settings, feature toggles
- **Implementation:** shadcn/ui Switch component
- **Variants:**
  - Default switch
  - Labeled switch
- **Example:** Maintenance mode, auto-refresh settings

#### 2.6 Buttons
- **Usage:** All actions throughout the app
- **Implementation:** shadcn/ui Button component
- **Variants:**
  - **Primary** (`#4CAF50`) - Main actions (Create, Save, Submit)
  - **Secondary** (`#2196F3`) - Secondary actions (Import, Export)
  - **Destructive** (`#f44336`) - Delete, ban, remove actions
  - **Ghost** - Navigation, subtle actions
  - **Outline** - Filter chips, secondary options
  - **Link** - Text links, inline actions
- **Sizes:** Default, small, large
- **States:** Default, hover, active, disabled, loading

#### 2.7 Date Picker
- **Usage:** Play date creation, filtering
- **Implementation:** shadcn/ui Calendar with Popover
- **Variants:**
  - Single date selection
  - Date range selection
- **Example:** Tournament date selection

#### 2.8 Textarea
- **Usage:** Bulk import, notes, descriptions
- **Implementation:** shadcn/ui Textarea component
- **Variants:**
  - Auto-resizing
  - Fixed height
- **Example:** CSV import field, bulk player input

### 3. Data Display Components

#### 3.1 Tables
- **Usage:** Player lists, match results, audit logs
- **Implementation:** shadcn/ui Table component
- **Features:**
  - Sortable columns
  - Pagination
  - Row selection
  - Responsive design
- **Variants:**
  - Standard table
  - Striped rows
  - Hoverable rows
- **Example:** Player management table, audit log table

#### 3.2 Cards
- **Usage:** Match cards, player cards, stat cards
- **Implementation:** shadcn/ui Card component
- **Variants:**
  - Default card
  - Interactive card (hover effects)
  - Status cards (colored borders)
  - Highlighted cards (current player/match)
- **Example:** Match cards, player profile cards, stat summary cards

#### 3.3 Lists
- **Usage:** Rankings, player lists, navigation
- **Implementation:** Custom component with shadcn/ui styling
- **Variants:**
  - Simple list
  - Ordered list (rankings)
  - Interactive list items
- **Example:** Tournament rankings, player lists

#### 3.4 Progress Bars
- **Usage:** Tournament progress, system health
- **Implementation:** shadcn/ui Progress component
- **Variants:**
  - Linear progress
  - Circular progress (loading)
  - Multi-step progress
- **Example:** Tournament completion, round progress

#### 3.5 Badges
- **Usage:** Status indicators, court numbers, notifications
- **Implementation:** shadcn/ui Badge component
- **Variants:**
  - **Success** (`#27ae60`) - Claimed, Healthy, Completed
  - **Warning** (`#f39c12`) - Pending, Warning, In Progress
  - **Destructive** (`#e74c3c`) - Banned, Error, Issues
  - **Secondary** (`#3498db`) - Live, Active
  - **Outline** - Default states
- **Example:** Player status, match status, court numbers

#### 3.6 Avatars
- **Usage:** Player representation, user profiles
- **Implementation:** shadcn/ui Avatar component
- **Variants:**
  - Initials avatar
  - Image avatar
  - Fallback avatar
- **Example:** Player initials in lists and cards

#### 3.7 Separator
- **Usage:** Section dividers, list item separators
- **Implementation:** shadcn/ui Separator component
- **Variants:**
  - Horizontal separator
  - Vertical separator
- **Example:** Between list items, section divisions

### 4. Feedback & Status Components

#### 4.1 Alert/Notification
- **Usage:** Warnings, errors, success messages
- **Implementation:** shadcn/ui Alert component
- **Variants:**
  - Info alert
  - Warning alert
  - Error alert
  - Success alert
- **Example:** Player list lock warning, form validation errors

#### 4.2 Toast Notifications
- **Usage:** Real-time updates, action confirmations
- **Implementation:** shadcn/ui Toast component
- **Variants:**
  - Success toast
  - Error toast
  - Info toast
  - Loading toast
- **Example:** Score update confirmations, real-time match updates

#### 4.3 Modal/Dialog
- **Usage:** Confirmations, detailed views
- **Implementation:** shadcn/ui Dialog component
- **Variants:**
  - Alert dialog
  - Confirmation dialog
  - Content dialog
- **Example:** Delete confirmations, detailed player views

#### 4.4 Popover
- **Usage:** Tooltips, context menus, additional info
- **Implementation:** shadcn/ui Popover component
- **Variants:**
  - Tooltip popover
  - Menu popover
  - Content popover
- **Example:** Action menus, help text, additional details

#### 4.5 Sheet
- **Usage:** Mobile overlays, slide-up panels
- **Implementation:** shadcn/ui Sheet component
- **Variants:**
  - Bottom sheet (mobile)
  - Side sheet
- **Example:** Mobile score entry, mobile filters

#### 4.6 Skeleton
- **Usage:** Loading states
- **Implementation:** shadcn/ui Skeleton component
- **Variants:**
  - Text skeleton
  - Card skeleton
  - Table skeleton
- **Example:** Loading player lists, loading match data

### 5. Interactive Elements

#### 5.1 Pagination
- **Usage:** Player lists, audit logs, large data sets
- **Implementation:** shadcn/ui Pagination component
- **Features:**
  - Previous/Next navigation
  - Page number selection
  - Items per page control
- **Example:** Global player management, audit log navigation

#### 5.2 Search
- **Usage:** Finding players, matches, logs
- **Implementation:** shadcn/ui Input with search icon
- **Features:**
  - Real-time search
  - Search suggestions
  - Clear search action
- **Example:** Player search, audit log search

#### 5.3 Filter Chips
- **Usage:** Filtering data, status selections
- **Implementation:** shadcn/ui Toggle or Button variants
- **Variants:**
  - Active filter (highlighted)
  - Inactive filter (outline)
  - Removable filter (with X)
- **Example:** Status filters, date filters, role filters

#### 5.4 Dropdown Menu
- **Usage:** Actions, bulk operations, context menus
- **Implementation:** shadcn/ui DropdownMenu component
- **Variants:**
  - Action menu
  - Context menu
  - Bulk actions menu
- **Example:** Player actions, bulk operations

#### 5.5 Command
- **Usage:** Search and selection interfaces
- **Implementation:** shadcn/ui Command component
- **Features:**
  - Searchable options
  - Keyboard navigation
  - Grouped options
- **Example:** Player selection, quick actions

#### 5.6 Scroll Area
- **Usage:** Long lists, scrollable content
- **Implementation:** shadcn/ui ScrollArea component
- **Variants:**
  - Vertical scroll
  - Horizontal scroll
  - Virtual scrolling (for large lists)
- **Example:** Long player lists, audit logs

## Custom Components

### 6. Application-Specific Components

#### 6.1 ScoreCounter
- **Purpose:** Score entry with +/- buttons
- **Base Components:** shadcn/ui Button, custom styling
- **Features:**
  - Large number display
  - Increment/decrement buttons
  - Validation (score ranges)
  - Real-time validation messages
- **Usage:** Mobile score entry modal

#### 6.2 CourtBadge
- **Purpose:** Court identification with custom names
- **Base Components:** shadcn/ui Badge with custom styling
- **Features:**
  - Court number or custom name
  - Color coding for different courts
  - Responsive sizing
- **Usage:** Match cards, schedule views

#### 6.3 MatchCard
- **Purpose:** Comprehensive match information display
- **Base Components:** shadcn/ui Card, Badge, Button
- **Features:**
  - Team information
  - Match status
  - Score display
  - Action buttons
  - Status indicators
- **Usage:** Dashboard match grids, schedule views

#### 6.4 PlayerCard
- **Purpose:** Player information with actions
- **Base Components:** shadcn/ui Card, Avatar, Badge, Button
- **Features:**
  - Player avatar/initials
  - Status indicators
  - Statistics display
  - Action buttons
  - Claim status
- **Usage:** Player management, rankings

#### 6.5 TournamentProgress
- **Purpose:** Multi-step tournament progress visualization
- **Base Components:** shadcn/ui Progress, Badge
- **Features:**
  - Round indicators
  - Completion percentage
  - Status visualization
  - Interactive round navigation
- **Usage:** Tournament overview, schedule management

#### 6.6 HealthMetrics
- **Purpose:** System health visualization
- **Base Components:** shadcn/ui Card, Badge, Progress
- **Features:**
  - Status indicators
  - Metric displays
  - Alert states
  - Real-time updates
- **Usage:** Admin system health monitoring

#### 6.7 AuditLogEntry
- **Purpose:** Timestamped activity entries
- **Base Components:** shadcn/ui Card, Badge, Avatar
- **Features:**
  - Activity type indicators
  - Timestamp display
  - User information
  - Action details
- **Usage:** Admin audit log, activity tracking

#### 6.8 RankingsList
- **Purpose:** Ordered tournament rankings
- **Base Components:** shadcn/ui Card, Badge, Avatar
- **Features:**
  - Position indicators
  - Player statistics
  - Sorting options
  - Responsive design
- **Usage:** Public rankings, tournament results

#### 6.9 BottomNavigation
- **Purpose:** Mobile-specific navigation
- **Base Components:** shadcn/ui Button variants
- **Features:**
  - Touch-friendly targets (≥44px)
  - Active state indicators
  - Icon + label layout
  - Accessibility support
- **Usage:** Mobile app navigation

#### 6.10 SidebarNavigation
- **Purpose:** Desktop-specific navigation
- **Base Components:** shadcn/ui Button variants
- **Features:**
  - Collapsible sections
  - Active state indicators
  - Icon + label layout
  - Nested navigation
- **Usage:** Desktop admin and organizer views

## Component Variants and Configurations

### Button Variants
```tsx
// Primary action buttons
<Button variant="default">Create Play Date</Button>
<Button variant="default">Save Score</Button>

// Secondary actions
<Button variant="secondary">Import Players</Button>
<Button variant="secondary">Export Data</Button>

// Destructive actions
<Button variant="destructive">Delete Player</Button>
<Button variant="destructive">Ban User</Button>

// Subtle actions
<Button variant="ghost">Cancel</Button>
<Button variant="outline">Filter</Button>
<Button variant="link">Edit Profile</Button>
```

### Badge Variants
```tsx
// Status indicators
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Pending</Badge>
<Badge variant="destructive">Banned</Badge>
<Badge variant="outline">Unclaimed</Badge>

// Success states
<Badge className="bg-green-500">Claimed</Badge>
<Badge className="bg-green-500">Completed</Badge>
<Badge className="bg-green-500">Healthy</Badge>

// Warning states
<Badge className="bg-yellow-500">Warning</Badge>
<Badge className="bg-yellow-500">In Progress</Badge>
<Badge className="bg-orange-500">Pending</Badge>
```

### Card Variants
```tsx
// Default cards
<Card>
  <CardHeader>
    <CardTitle>Player Information</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>

// Interactive cards
<Card className="hover:shadow-lg transition-shadow cursor-pointer">
  <CardContent>...</CardContent>
</Card>

// Status cards with borders
<Card className="border-green-500">
  <CardContent>...</CardContent>
</Card>

// Highlighted cards
<Card className="bg-green-50 border-green-200">
  <CardContent>...</CardContent>
</Card>
```

## Usage Examples and Patterns

### 1. Form Validation Pattern
```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email Address</Label>
  <Input
    id="email"
    type="email"
    placeholder="player@email.com"
    className={errors.email ? "border-red-500" : ""}
  />
  {errors.email && (
    <p className="text-sm text-red-600">{errors.email}</p>
  )}
</div>
```

### 2. Status Indicator Pattern
```tsx
<div className="flex items-center gap-2">
  <Badge variant={getStatusVariant(player.status)}>
    {player.status}
  </Badge>
  <span className="text-sm text-gray-600">
    {player.email}
  </span>
</div>
```

### 3. Action Menu Pattern
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>View Details</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-red-600">
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 4. Loading State Pattern
```tsx
{loading ? (
  <div className="space-y-2">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
) : (
  <div>{content}</div>
)}
```

## Component Hierarchy and Relationships

### Page-Level Components
```
Layout
├── Header
├── Navigation (Sidebar | BottomNav)
├── Main Content
│   ├── Page Header
│   ├── Filters/Search
│   ├── Content Area
│   │   ├── Cards/Tables/Lists
│   │   ├── Modals/Sheets
│   │   └── Actions
│   └── Pagination
└── Footer
```

### Card Component Structure
```
Card
├── CardHeader
│   ├── CardTitle
│   └── CardActions
├── CardContent
│   ├── Primary Information
│   ├── Secondary Information
│   └── Status Indicators
└── CardFooter
    └── Actions
```

## Responsive Design Considerations

### Mobile-First Approach
- Minimum 44px touch targets
- Bottom navigation for mobile
- Sheet components for overlays
- Stacked layouts
- Condensed information display

### Desktop Enhancements
- Sidebar navigation
- Dialog modals
- Grid layouts
- Expanded information display
- Hover states

## Accessibility Features

### WCAG 2.1 AA Compliance
- Semantic HTML structure
- Proper heading hierarchy
- Color contrast ratios
- Focus management
- Screen reader support
- Keyboard navigation
- Touch target sizing

### Implementation Notes
- Use proper ARIA labels
- Implement focus trapping in modals
- Provide alternative text for icons
- Ensure keyboard navigation works
- Test with screen readers
- Maintain color contrast ratios

## Development Guidelines

### Component Organization
```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── custom/       # Custom app components
│   ├── forms/        # Form-specific components
│   ├── layout/       # Layout components
│   └── features/     # Feature-specific components
```

### Naming Conventions
- Use PascalCase for component names
- Use descriptive, intention-revealing names
- Group related components in directories
- Use consistent prop naming

### Testing Strategy
- Unit tests for custom components
- Integration tests for complex interactions
- Accessibility testing
- Visual regression testing
- Cross-browser testing

## Performance Considerations

### Optimization Strategies
- Lazy loading for large lists
- Virtual scrolling for performance
- Memoization of expensive calculations
- Debounced search inputs
- Optimized re-renders

### Bundle Size Management
- Tree-shaking unused components
- Code splitting by route
- Lazy loading heavy components
- Optimized icon usage

This comprehensive component selection document provides the foundation for implementing a consistent, accessible, and performant UI for the Pickleball Tracker application using shadcn/ui as the base component library with custom extensions where needed.