# Sequence Diagrams

This document provides an overview of the comprehensive PlantUML sequence diagrams for all major workflows in the Pickleball Tracker application. The diagrams are organized by priority tiers and detail the complete technical implementation of each workflow.

## Individual Diagram Files

The sequence diagrams have been split into individual `.puml` files in the `sequence_diagrams/` directory for better organization and maintainability:

### Tier 1 (Most Critical)
- [T1.1_Authentication_Workflow.puml](./sequence_diagrams/T1.1_Authentication_Workflow.puml) - Magic link login, player claiming, session management
- [T1.2_Real_time_Conflict_Resolution.puml](./sequence_diagrams/T1.2_Real_time_Conflict_Resolution.puml) - Optimistic locking, version conflicts, resolution strategies
- [T1.3_Tournament_Scheduling_Algorithm.puml](./sequence_diagrams/T1.3_Tournament_Scheduling_Algorithm.puml) - Partnership generation, round-robin matrix, court assignment
- [T1.4_Enter_Scores_Workflow.puml](./sequence_diagrams/T1.4_Enter_Scores_Workflow.puml) - Score validation, optimistic updates, real-time propagation

### Tier 2 (Important)
- [T2.1_Play_Date_Create_Update_Workflow.puml](./sequence_diagrams/T2.1_Play_Date_Create_Update_Workflow.puml) - Tournament creation, player selection, modification restrictions
- [T2.2_Tournament_State_Transition.puml](./sequence_diagrams/T2.2_Tournament_State_Transition.puml) - State management, schedule locking, business rules
- [T2.3_Player_Management_Partnership_Assignment.puml](./sequence_diagrams/T2.3_Player_Management_Partnership_Assignment.puml) - Rigid player management, partnership generation

### Tier 3 (Supporting)
- [T3.1_Real_time_Subscription_Management.puml](./sequence_diagrams/T3.1_Real_time_Subscription_Management.puml) - WebSocket lifecycle, channel management, reconnection
- [T3.2_Rankings_Calculation_Workflow.puml](./sequence_diagrams/T3.2_Rankings_Calculation_Workflow.puml) - Win evaluation, multi-tier tie-breaking, materialized views
- [T3.3_Audit_Trail_Dispute_Resolution.puml](./sequence_diagrams/T3.3_Audit_Trail_Dispute_Resolution.puml) - Change logging, investigation tools, admin overrides
- [T3.4_Data_Export_Archive_Workflow.puml](./sequence_diagrams/T3.4_Data_Export_Archive_Workflow.puml) - JSON/CSV generation, privacy filtering, validation

## How to Use These Diagrams

These PlantUML sequence diagrams can be rendered using:
1. **PlantUML CLI**: `plantuml sequence_diagrams/T1.1_Authentication_Workflow.puml`
2. **VS Code Extension**: PlantUML extension with live preview
3. **Online**: Copy diagram code to [plantuml.com](https://plantuml.com)
4. **IDE Integration**: IntelliJ, Eclipse, or other PlantUML plugins
5. **Batch Processing**: `plantuml sequence_diagrams/*.puml` to render all diagrams

## Directory Structure

```
docs/
├── sequence-diagrams.md          # This overview file
└── sequence_diagrams/            # Individual PlantUML files
    ├── T1.1_Authentication_Workflow.puml
    ├── T1.2_Real_time_Conflict_Resolution.puml
    ├── T1.3_Tournament_Scheduling_Algorithm.puml
    ├── T1.4_Enter_Scores_Workflow.puml
    ├── T2.1_Play_Date_Create_Update_Workflow.puml
    ├── T2.2_Tournament_State_Transition.puml
    ├── T2.3_Player_Management_Partnership_Assignment.puml
    ├── T3.1_Real_time_Subscription_Management.puml
    ├── T3.2_Rankings_Calculation_Workflow.puml
    ├── T3.3_Audit_Trail_Dispute_Resolution.puml
    └── T3.4_Data_Export_Archive_Workflow.puml
```

## Workflow Descriptions

### Tier 1 (Most Critical)

#### Authentication Workflow
Shows the complete authentication flow including magic link login, player claiming for first-time users, and protected route access.

**Key Features:**
- **Passwordless Authentication**: Magic link via email using Supabase Auth
- **Player Claiming**: First-time users must claim their player identity
- **Role-Based Access**: Supports project owner, organizer, player, and visitor roles
- **Session Persistence**: Automatic token refresh and secure session management

#### Real-time Conflict Resolution
Demonstrates how the system handles concurrent score updates using optimistic locking and conflict resolution strategies.

**Key Features:**
- **Optimistic Locking**: Version field prevents concurrent modifications
- **Conflict Detection**: Automatic detection of version mismatches
- **Multiple Resolution Strategies**: Latest-wins, keep-mine, or manual resolution
- **Complete Audit Trail**: All conflicts and resolutions are logged

#### Tournament Scheduling Algorithm
Shows the sophisticated algorithm for generating round-robin tournaments with court assignments.

**Key Features:**
- **Partnership-Based Model**: All matches are between doubles pairs
- **Round-Robin Algorithm**: Ensures each partnership plays all others exactly once
- **Court Optimization**: Efficient assignment to minimize wait times
- **Scalable Design**: Handles 4-16 players with 1-4 courts

#### Enter Scores Workflow
Details the complete score entry process including validation, optimistic updates, and real-time propagation.

**Key Features:**
- **Two Win Conditions**: First-to-target and win-by-2 modes
- **Optimistic UI**: Immediate feedback with database confirmation
- **Real-time Updates**: Sub-second propagation to all connected users
- **Complete Audit Trail**: Every score change is logged for dispute resolution

### Tier 2 (Important)

#### Play Date Create/Update Workflow
Shows the tournament creation process and the restrictions on modifications after play begins.

**Key Features:**
- **Comprehensive Validation**: Players, settings, and schedule integrity
- **Schedule Locking**: Prevents modifications after first score is entered
- **Global Player Management**: Players can participate in multiple tournaments
- **Permission Hierarchy**: Role-based editing capabilities

#### Tournament State Transition
Illustrates how tournament states are managed and how they control available operations.

**Key Features:**
- **Implicit State Management**: System uses score presence rather than explicit states
- **UI-Enforced Restrictions**: Frontend controls what operations are allowed
- **Progress Tracking**: Real-time completion percentage calculation
- **Missing Automation**: Database state fields exist but aren't automatically updated

#### Player Management & Partnership Assignment
Shows the rigid player management system where all participants must be determined before play begins.

**Key Features:**
- **Rigid Design**: All participants must be determined before play begins
- **Pure Combinatorial**: No skill-based or manual partnership assignment
- **Global Players**: Player entities are shared across tournaments
- **Destructive Regeneration**: Complete rebuild required for any changes

### Tier 3 (Supporting)

#### Real-time Subscription Management
Details the sophisticated WebSocket connection management and real-time event processing system.

**Key Features:**
- **Intelligent Reconnection**: Exponential backoff with maximum retry limits
- **Channel Reuse**: Efficient sharing of connections for identical subscriptions
- **Performance Optimization**: Batching, caching, and memory management
- **Sub-1-Second Latency**: Meets real-time requirements for tournament management

#### Rankings Calculation Workflow
Shows the sophisticated ranking algorithm with multi-tier tie-breaking and real-time updates.

**Key Features:**
- **Two Win Conditions**: First-to-target and win-by-2 modes with proper validation
- **Five-Tier Tie-Breaking**: Comprehensive algorithm for fair rankings
- **Materialized Views**: Sub-500ms response time using pre-calculated statistics
- **Real-time Updates**: Sub-1-second propagation from score entry to rankings display

#### Audit Trail & Dispute Resolution
Shows the comprehensive audit system and dispute resolution workflow for maintaining tournament integrity.

**Key Features:**
- **Complete Audit Trail**: Every score change is logged with full metadata
- **Automatic Dispute Detection**: Pattern recognition for suspicious activity
- **Immutable Logging**: Tamper-proof audit records for legal compliance
- **Role-Based Access**: Granular permissions for viewing and investigating disputes

#### Data Export/Archive Workflow
Shows the data export system for tournament statistics and archival purposes.

**Key Features:**
- **Multiple Export Formats**: CSV for spreadsheets, JSON for data analysis
- **Privacy Protection**: Email addresses and sensitive data excluded from exports
- **Data Validation**: Integrity checks before export generation
- **Client-Side Processing**: All export generation happens in the browser

**Current Limitations:**
- **No Import Capability**: Exports are one-way only for statistics
- **Limited Scale**: Designed for small tournaments (4-16 players)
- **No Audit Trail Export**: Score change history not included in exports
- **Basic Privacy Filtering**: Limited PII sanitization options

## Summary

These sequence diagrams provide a comprehensive view of all major workflows in the Pickleball Tracker application. Each diagram was created based on detailed analysis of the actual codebase implementation, ensuring accuracy and completeness.

### Key Architectural Patterns:

1. **Partnership-Based Model**: All matches are between doubles pairs, enabling rich analytics
2. **Optimistic Locking**: Version fields prevent concurrent update conflicts
3. **Real-time Architecture**: Sub-1-second updates using Supabase Realtime
4. **Immutable Audit Trail**: Complete change history for dispute resolution
5. **Role-Based Security**: Granular permissions enforced at database level

### Technology Stack:

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: Zustand + React Context
- **Real-time**: WebSocket subscriptions with automatic reconnection
- **Security**: Row Level Security (RLS) policies

These diagrams serve as both documentation and implementation reference for understanding the complete system architecture and workflow interactions.