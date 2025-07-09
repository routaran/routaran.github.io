# Pickleball Tracker Design System

## Overview

This design system document defines the visual design language for the Pickleball Tracker application based on analysis of 30 wireframes across 4 user roles (Visitor, User, Organizer, Admin). The system prioritizes mobile-first design, accessibility, and real-time functionality.

## Color Palette

### Primary Colors
- **Primary Blue**: `#2196F3` - Primary actions, navigation highlights, court badges
- **Success Green**: `#4CAF50` - Wins, successful actions, positive status, login buttons
- **Warning Orange**: `#FF9800` - In-progress matches, warnings, pending states
- **Error Red**: `#f44336` - Losses, errors, negative points, delete actions

### Secondary Colors
- **Purple**: `#9b59b6` - Admin features, special actions
- **Dark Blue**: `#2c3e50` - Admin sidebar, text headings
- **Medium Blue**: `#3498db` - Info messages, secondary actions

### Status Colors
- **Gold**: `#FFD700` - First place ranking badge
- **Silver**: `#C0C0C0` - Second place ranking badge  
- **Bronze**: `#CD7F32` - Third place ranking badge

### Background Colors
- **Light Gray**: `#f5f5f5` - Main page background
- **Light Blue**: `#f0f8ff` - Info cards, bye rounds
- **Light Green**: `#e8f5e9` - Success backgrounds, user highlights
- **Light Orange**: `#fff3e0` - Warning backgrounds
- **Light Red**: `#ffebee` - Error backgrounds

### Neutral Colors
- **White**: `#ffffff` - Card backgrounds, input fields
- **Light Gray**: `#f8f9fa` - Admin interface background
- **Medium Gray**: `#e0e0e0` - Borders, dividers
- **Text Gray**: `#666666` - Secondary text
- **Light Text**: `#999999` - Placeholder text, disabled states
- **Dark Text**: `#333333` - Primary text, status bar

## Typography

### Font Family
- **Primary**: `Arial, sans-serif` - Used consistently across all interfaces
- **Fallback**: System sans-serif fonts

### Font Sizes
- **Status Bar**: `12px` - Mobile status indicators
- **Small Text**: `10px` - Annotations, fine print
- **Body Small**: `12px` - Secondary information, timestamps
- **Body**: `14px` - Standard body text, form labels
- **Body Large**: `16px` - Primary content, player names
- **Heading Small**: `18px` - Card titles, section headers
- **Heading Medium**: `20px` - Page titles, main headers
- **Heading Large**: `24px` - Primary page titles
- **Display Small**: `28px` - Section headings
- **Display Large**: `32px` - Statistics, large numbers
- **Score Display**: `48px` - Match scores

### Font Weights
- **Normal**: `400` - Default text weight
- **Bold**: `700` - Headings, emphasis, buttons, player names

### Line Heights
- **Body Text**: `1.4` - Readable line spacing
- **Headings**: `1.2` - Tighter spacing for titles

## Spacing System

### Base Unit
- **Base**: `8px` - Foundation for all spacing calculations

### Margin/Padding Scale
- **xs**: `4px` - Icon padding, tight spacing
- **sm**: `8px` - Card padding, form element spacing
- **md**: `16px` - Section spacing, card margins
- **lg**: `20px` - Page margins, major sections
- **xl**: `40px` - Large section spacing
- **xxl**: `80px` - Major layout spacing

### Component Spacing
- **Button Padding**: `12px 24px` - Internal button spacing
- **Card Padding**: `16px` - Internal card content spacing
- **Page Margins**: `20px` - Mobile page edge spacing
- **Section Gaps**: `20px` - Between major sections

## Responsive Breakpoints

### Mobile First Approach
- **Mobile**: `360px` - Primary target device width
- **Tablet**: `768px` - Mid-range devices
- **Desktop**: `1200px` - Desktop/laptop screens

### Grid System
- **Mobile**: Single column layout, full-width components
- **Desktop**: Multi-column layouts (2-3 columns for dashboards)
- **Sidebar**: `240px` width on desktop admin interfaces

## Interactive States

### Button States
- **Default**: Base color with full opacity
- **Hover**: 10% darker background (desktop only)
- **Focus**: 2px outline in primary color
- **Active**: 20% darker background
- **Disabled**: 50% opacity, no interaction

### Touch Targets
- **Minimum Size**: `44px` - WCAG AA compliance
- **Recommended**: `48px` - Comfortable mobile interaction
- **Button Height**: `44px` minimum, `48px` recommended

### Form States
- **Default**: Light gray background `#f5f5f5`
- **Focus**: White background, primary border
- **Error**: Red border `#f44336`
- **Success**: Green border `#4CAF50`

## Component Library

### Cards
- **Border Radius**: `8px` - Rounded corners
- **Shadow**: Subtle drop shadow for depth
- **Background**: `#ffffff`
- **Border**: `1px solid #e0e0e0`

### Buttons
- **Primary**: Green background `#4CAF50`, white text
- **Secondary**: Blue background `#2196F3`, white text
- **Danger**: Red background `#f44336`, white text
- **Ghost**: Transparent background, colored border

### Navigation
- **Active State**: Highlighted background `#e3f2fd`
- **Mobile Bottom Nav**: Fixed height `80px`
- **Desktop Sidebar**: Dark theme `#2c3e50` background

### Status Indicators
- **Success**: Green circle `#4CAF50`
- **Warning**: Orange circle `#FF9800`
- **Error**: Red circle `#f44336`
- **Info**: Blue circle `#2196F3`

### Rankings
- **Gold Badge**: `#FFD700` background, white text
- **Silver Badge**: `#C0C0C0` background, white text
- **Bronze Badge**: `#CD7F32` background, white text
- **Other Ranks**: Gray text `#666666`

## Accessibility

### Color Contrast
- **Primary Text**: 4.5:1 ratio minimum (WCAG AA)
- **Large Text**: 3:1 ratio minimum
- **Status Colors**: Verified against white and dark backgrounds

### Focus Management
- **Focus Indicators**: 2px outline, high contrast
- **Tab Order**: Logical progression through interface
- **Skip Links**: Available for keyboard navigation

### Screen Reader Support
- **Alt Text**: Descriptive text for all images
- **ARIA Labels**: Proper labeling for interactive elements
- **Semantic HTML**: Proper heading hierarchy

## Icon System

### Icon Style
- **Type**: Emoji-based icons for consistency
- **Size**: `20px` standard, `24px` for emphasis
- **Color**: Inherit from parent element

### Common Icons
- **Dashboard**: 📋
- **Rankings**: 🏆
- **Settings**: ⚙️
- **Courts**: Numbers in circles
- **Search**: 🔍
- **Calendar**: 📅
- **Success**: ✓
- **Warning**: ⚠️
- **Error**: ×

## Layout Patterns

### Mobile Layouts
- **Single Column**: Primary content flow
- **Card Lists**: Vertically stacked cards
- **Bottom Navigation**: Fixed tab bar
- **Modal Sheets**: Slide-up overlays

### Desktop Layouts
- **Sidebar + Content**: Admin interfaces
- **Multi-column**: Dashboard grid layouts
- **Data Tables**: Structured information display

## Animation Guidelines

### Transitions
- **Duration**: 200ms for micro-interactions
- **Easing**: Ease-out for natural feel
- **Properties**: Transform, opacity preferred

### Real-time Updates
- **Smooth Transitions**: Between states
- **Loading States**: Subtle indicators
- **Success Feedback**: Brief confirmation

## Data Visualization

### Progress Indicators
- **Percentage Bars**: Green fill on gray background
- **Completion Status**: Circular progress indicators
- **Match Progress**: Visual completion tracking

### Score Display
- **Large Numbers**: `48px` font size
- **Color Coding**: Green for wins, red for losses
- **Hierarchy**: Score primary, details secondary

## User Role Variations

### Visitor
- **Limited Palette**: Grays and neutrals
- **Public Indicators**: Clear labeling
- **Login Prompts**: Prominent green buttons

### User
- **Personal Highlights**: Green backgrounds for user matches
- **Action Colors**: Green for editable, gray for read-only
- **Status Feedback**: Clear win/loss indicators

### Organizer
- **Management Colors**: Blue for actions, orange for warnings
- **Court Identification**: Colored badges and names
- **Schedule States**: Color-coded match statuses

### Admin
- **System Colors**: Extended palette with purples
- **Alert States**: Strong red for urgent issues
- **Data Emphasis**: Clear hierarchy for large datasets

## Implementation Notes

### CSS Variables
```css
:root {
  --primary-blue: #2196F3;
  --success-green: #4CAF50;
  --warning-orange: #FF9800;
  --error-red: #f44336;
  --text-primary: #333333;
  --text-secondary: #666666;
  --background-page: #f5f5f5;
  --background-card: #ffffff;
  --border-color: #e0e0e0;
  --shadow-subtle: 0 2px 4px rgba(0,0,0,0.1);
}
```

### Mobile-First CSS
- Start with mobile styles
- Use min-width media queries for larger screens
- Ensure touch targets meet size requirements

### Performance Considerations
- Minimize color variations
- Use system fonts when possible
- Optimize for real-time updates

This design system provides a comprehensive foundation for implementing the Pickleball Tracker application while maintaining consistency, accessibility, and user experience across all device sizes and user roles.