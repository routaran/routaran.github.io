# Database Entity Relationship Diagram - Pickleball Tracker

## Overview

This Entity Relationship Diagram (ERD) represents the complete database schema for the Pickleball Tracker system. The schema supports a partnership-based round-robin tournament system with real-time updates, comprehensive audit trails, and multi-role security.

## Database Schema ERD

```mermaid
erDiagram
    %% Core Tables
    players {
        uuid id PK
        varchar(100) name UK
        varchar(255) email UK
        boolean is_project_owner
        timestamptz created_at
        timestamptz updated_at
    }
    
    player_claims {
        uuid player_id PK,FK
        uuid supabase_uid UK,FK
        timestamptz claimed_at
    }
    
    play_dates {
        uuid id PK
        date date
        uuid organizer_id FK
        integer num_courts
        varchar(20) win_condition
        integer target_score
        varchar(20) status
        boolean schedule_locked
        timestamptz created_at
        timestamptz updated_at
        integer version
    }
    
    courts {
        uuid id PK
        uuid play_date_id FK
        integer court_number
        varchar(20) court_name
        timestamptz created_at
    }
    
    partnerships {
        uuid id PK
        uuid play_date_id FK
        uuid player1_id FK
        uuid player2_id FK
        varchar(20) partnership_name
        timestamptz created_at
    }
    
    matches {
        uuid id PK
        uuid play_date_id FK
        uuid court_id FK
        integer round_number
        uuid partnership1_id FK
        uuid partnership2_id FK
        integer team1_score
        integer team2_score
        uuid winning_partnership_id FK
        varchar(20) status
        uuid recorded_by FK
        timestamptz recorded_at
        timestamptz created_at
        timestamptz updated_at
        integer version
    }
    
    audit_log {
        uuid id PK
        uuid play_date_id FK
        uuid match_id FK
        uuid player_id FK
        varchar(50) action_type
        jsonb old_values
        jsonb new_values
        jsonb metadata
        timestamptz created_at
    }
    
    %% Materialized View
    match_results {
        uuid player_id FK
        varchar(100) player_name
        uuid play_date_id FK
        date play_date
        varchar(20) play_date_status
        integer games_played
        integer wins
        integer losses
        integer points_for
        integer points_against
        decimal win_percentage
        integer point_differential
    }
    
    %% External Reference (Supabase Auth)
    auth_users {
        uuid id PK
        varchar email
        timestamptz created_at
    }
    
    %% Relationships
    
    %% Player relationships
    players ||--o{ player_claims : "claims"
    players ||--o{ play_dates : "organizes"
    players ||--o{ partnerships : "player1"
    players ||--o{ partnerships : "player2"
    players ||--o{ matches : "records_score"
    players ||--o{ audit_log : "performs_action"
    
    %% Player claims to auth
    player_claims ||--|| auth_users : "links_to"
    
    %% Play date relationships
    play_dates ||--o{ courts : "has"
    play_dates ||--o{ partnerships : "contains"
    play_dates ||--o{ matches : "schedules"
    play_dates ||--o{ audit_log : "tracks_changes"
    
    %% Court relationships
    courts ||--o{ matches : "hosts"
    
    %% Partnership relationships
    partnerships ||--o{ matches : "team1"
    partnerships ||--o{ matches : "team2"
    partnerships ||--o{ matches : "wins"
    
    %% Match relationships
    matches ||--o{ audit_log : "logs_changes"
    
    %% Materialized view relationships
    match_results }|--|| players : "aggregates_for"
    match_results }|--|| play_dates : "aggregates_by"
```

## Legend

### Symbols and Notations

| Symbol | Meaning |
|--------|---------|
| `PK` | Primary Key |
| `FK` | Foreign Key |
| `UK` | Unique Key |
| `||--o{` | One-to-Many relationship |
| `||--||` | One-to-One relationship |
| `}|--||` | Many-to-One relationship |

### Data Types

| Type | Description |
|------|-------------|
| `uuid` | Universally Unique Identifier |
| `varchar(n)` | Variable character string with max length n |
| `integer` | 32-bit signed integer |
| `boolean` | True/false value |
| `date` | Date value (year-month-day) |
| `timestamptz` | Timestamp with timezone |
| `jsonb` | Binary JSON data |
| `decimal` | Decimal number with precision |

### Status Values

| Field | Possible Values |
|-------|-----------------|
| `play_dates.status` | `scheduled`, `active`, `completed`, `cancelled` |
| `play_dates.win_condition` | `first_to_target`, `win_by_2` |
| `matches.status` | `waiting`, `in_progress`, `completed`, `disputed` |

## Key Relationships and Constraints

### 1. Authentication Flow
- **players** ↔ **player_claims** ↔ **auth_users**: Links player identities to Supabase authentication
- One player can claim one auth account, and vice versa
- Enables secure score entry and role-based access

### 2. Tournament Structure
- **play_dates** → **courts**: Each tournament has 1-4 courts with custom names
- **play_dates** → **partnerships**: Pre-generated doubles pairings for round-robin
- **partnerships** → **matches**: Each match involves exactly 2 partnerships

### 3. Match Scheduling
- **matches** references two partnerships (team1 and team2)
- **matches** assigned to specific court and round number
- **winning_partnership_id** denormalizes winner for performance

### 4. Audit Trail
- **audit_log** tracks all changes to matches and play dates
- JSONB fields store flexible before/after values
- Links to player who made the change

### 5. Performance Optimization
- **match_results** materialized view pre-calculates player statistics
- Strategic indexes on frequently queried columns
- Real-time subscriptions enabled for live updates

## Data Integrity Features

### Constraints
- **Check constraints**: Validate score ranges, court numbers, and status values
- **Unique constraints**: Prevent duplicate player names (FR-03), partnerships, and email addresses
- **Foreign key constraints**: Ensure referential integrity across all relationships

### Triggers
- **Schedule locking**: Prevents regeneration after first score entry
- **Audit logging**: Automatically tracks all match changes
- **Materialized view refresh**: Updates statistics after score changes

### Optimistic Locking
- **Version fields** on `play_dates` and `matches` prevent concurrent update conflicts
- Critical for real-time score entry with multiple users

## Security Architecture

### Row-Level Security (RLS)
- **Project owners**: Full access to all data
- **Organizers**: Manage their own play dates
- **Players**: Update scores for their incomplete matches only (FR-07)
- **Completed matches**: Locked from further updates (NFR-09)
- **Visitors**: Read-only access to public tournaments

### Data Privacy
- Email addresses only stored in `players` table
- No sensitive data in audit logs or exports
- Magic link authentication (no passwords stored)

## Performance Considerations

### Indexing Strategy
- **Primary lookups**: Date, organizer, status indexes on play_dates
- **Match queries**: Composite indexes on play_date_id + status
- **Partnership lookups**: Indexes on both player1_id and player2_id
- **Real-time updates**: Optimized for frequent match status changes

### Scalability
- **Maximum capacity**: 16 players, 4 courts, 120 matches per tournament
- **Concurrent users**: 50+ players per tournament
- **Storage efficiency**: ~10KB per completed tournament

This ERD provides a comprehensive view of the Pickleball Tracker database schema, supporting all functional requirements while maintaining high performance and security standards.