# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pickleball Tracker** - A mobile-first SPA for managing pickleball tournaments with round-robin scheduling, live score tracking, and real-time rankings. Deployed as static site on GitHub Pages with Supabase backend.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 5
- **Styling**: Tailwind CSS v3 + shadcn/ui
- **Backend**: Supabase (Auth, Postgres, Realtime)
- **State**: Supabase JS v2 + React Context/Zustand

## Database Design

### Tables
- `play_dates` - Tournament days with settings
- `players` - All players with email and project owner flag
- `player_claims` - Links players to Supabase auth UIDs
- `partnerships` - Pre-generated doubles pairings
- `matches` - Games with scores and optimistic locking (version field)
- `match_results` - Materialized view for player stats
- `audit_log` - Score edit history for dispute resolution

### Key Design Decisions
- Partnership-based model for rich analytics
- Optimistic locking prevents concurrent score updates
- RLS policies enforce permissions by role

## User Roles

1. **Project Owner** - Full admin access to all Play Dates
2. **Organizer** - Creates/manages their Play Dates (first creator)
3. **Player** - Updates scores for their matches only
4. **Visitor** - Read-only access without login

## Core Features

### Scheduling
- Round-robin: each partnership plays all others exactly once
- Handles 4-16 players per Play Date
- Max 4 courts
- Bye rounds for odd player counts

### Authentication
- Magic link (passwordless) via Supabase
- Players claim names on first login
- Email required for all players

### Score Entry
- Players enter final scores only (no timestamps)
- Optimistic locking prevents conflicts
- Audit trail tracks all edits

### Real-time Updates
- Supabase Realtime broadcasts changes
- Sub-1-second updates to all connected clients

## Constraints

- **No offline support** - Internet connection required
- **No push notifications** - In-browser updates only
- **Static deployment** - No server-side rendering
- **GitHub Pages hosting** - Must work with static files

## Key Requirements

### Functional
- Win conditions: First-to-target or Win-by-2 (5-21 points)
- Schedule regeneration blocked after first score
- JSON export/import for archival

### Non-Functional
- Mobile-first with ≥44px touch targets
- WCAG 2.1 AA compliant
- ≥90% test coverage for critical logic
- 2-second max initial load time

## Development Notes

When implementing:
1. Check `project_requirements.md` for detailed requirements
2. Follow mobile-first approach from `ux_design_document.md`
3. Use partnership-based queries for all match operations
4. Implement audit logging for all score updates
5. Test RLS policies thoroughly

## Security

- Sanitize all inputs
- Use Supabase RLS for authorization
- Never store emails in exports/archives
- CSP headers block inline scripts