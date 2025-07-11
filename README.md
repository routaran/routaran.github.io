# Pickleball Tracker

A mobile-first single-page application (SPA) for managing pickleball tournaments with round-robin scheduling, live score tracking, and real-time rankings. Deployed as a static site on GitHub Pages with a Supabase backend.

## Overview

Pickleball Tracker simplifies tournament management by automating round-robin scheduling, enabling real-time score updates, and providing instant rankings. The application is designed with a mobile-first approach to ensure excellent usability on smartphones and tablets during tournaments.

### Key Features

- **Round-Robin Tournament Scheduling**: Automatically generates fair schedules where each partnership plays all others exactly once
- **Real-Time Score Updates**: Live score tracking with sub-second updates across all connected devices
- **Dynamic Rankings**: Instant calculation of standings based on wins, points, and head-to-head results
- **Mobile-First Design**: Optimized for touch devices with large tap targets (≥44px)
- **Role-Based Access**: Project owners, organizers, players, and visitors with appropriate permissions
- **Audit Trail**: Complete history of score edits for dispute resolution
- **Offline-Capable Export**: JSON export/import for archival and offline viewing

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 5
- **Styling**: Tailwind CSS v3 + shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **State Management**: Zustand + React Context
- **Deployment**: GitHub Pages (static hosting)
- **CI/CD**: GitHub Actions

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Supabase account and project
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/routaran/routaran.github.io.git
   cd routaran.github.io
   ```

2. Install dependencies:
   ```bash
   cd app
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Update `.env.local` with your Supabase project URL and anon key.

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173 in your browser.

## Project Structure

```
routaran.github.io/
├── app/                    # React application
│   ├── src/
│   │   ├── components/     # React components organized by feature
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── stores/        # Zustand state stores
│   │   ├── contexts/      # React contexts
│   │   ├── lib/           # Utility functions and services
│   │   └── types/         # TypeScript type definitions
│   ├── public/            # Static assets
│   └── tests/             # Test files
├── supabase/              # Database schema and migrations
├── docs/                  # Project documentation
├── .github/               # GitHub Actions workflows
└── scripts/               # Build and deployment scripts
```

## Documentation

Comprehensive documentation is available in the [`docs/`](./docs) directory:

- [Architecture Overview](./docs/architecture.md) - System design and component architecture
- [Development Guide](./docs/development-guide.md) - Setting up your development environment
- [API Reference](./docs/api-reference.md) - Database schema and API documentation
- [Deployment Guide](./docs/deployment-guide.md) - Production deployment instructions
- [Testing Guide](./docs/testing-guide.md) - Running and writing tests
- [Troubleshooting](./docs/troubleshooting.md) - Common issues and solutions

## Core Concepts

### User Roles

1. **Project Owner**: Full administrative access to all Play Dates
2. **Organizer**: Creates and manages their own Play Dates
3. **Player**: Updates scores for their own matches
4. **Visitor**: Read-only access without authentication

### Database Design

The application uses a partnership-based model for rich analytics:
- Players are paired into partnerships for doubles play
- Matches are between partnerships, not individual players
- Comprehensive stats tracking at both player and partnership levels
- Optimistic locking prevents concurrent score conflicts

### Real-Time Features

- Supabase Realtime broadcasts all database changes
- Automatic reconnection on network issues
- Visual indicators for connection status
- Sub-second updates across all clients

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Run TypeScript type checking
npm run type-check

# Format code with Prettier
npm run format
```

### Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

## Contributing

We welcome contributions! Please see our [Development Guide](./docs/development-guide.md) for details on:

- Setting up your development environment
- Code style and conventions
- Submitting pull requests
- Running tests

## Security

- All data access is controlled by Supabase Row Level Security (RLS)
- Authentication uses magic links (passwordless)
- No sensitive data is stored in browser storage
- HTTPS enforced for all production traffic

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Support

For issues, feature requests, or questions:
- Open an issue on [GitHub](https://github.com/routaran/routaran.github.io/issues)
- Check the [Troubleshooting Guide](./docs/troubleshooting.md)
- Review the [Support Guide](./docs/support-guide.md)