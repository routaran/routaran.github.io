# Development Guide

This guide covers everything you need to know to set up your development environment and start contributing to the Pickleball Tracker project.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Workflow](#development-workflow)
- [Code Style and Standards](#code-style-and-standards)
- [Project Structure](#project-structure)
- [Common Development Tasks](#common-development-tasks)
- [Debugging](#debugging)
- [Contributing](#contributing)

## Prerequisites

### Required Software

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher
- **Git**: Latest version
- **Code Editor**: VS Code recommended (with extensions)

### Recommended VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features
- GitLens
- Error Lens

### Supabase Account

You'll need a Supabase account to run the backend services:

1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Save your project URL and anon key

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/routaran/routaran.github.io.git
cd routaran.github.io
```

### 2. Install Dependencies

```bash
cd app
npm install
```

### 3. Environment Configuration

Create a local environment file:

```bash
cp .env.example .env.local
```

Update `.env.local` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Database Setup

#### Option A: Use Existing Supabase Project

If connecting to an existing Supabase project, ensure you have:
- Read access to all tables
- Appropriate RLS policies configured

#### Option B: Set Up New Database

1. Run the migration scripts in order:

```bash
cd supabase
# Apply migrations in numerical order
psql -h your-project.supabase.co -U postgres -d postgres -f migrations/001_initial_schema.sql
psql -h your-project.supabase.co -U postgres -d postgres -f migrations/002_add_partnerships.sql
# ... continue for all migrations
```

2. Seed the database with test data:

```bash
psql -h your-project.supabase.co -U postgres -d postgres -f seed.sql
```

### 5. Verify Setup

Start the development server:

```bash
npm run dev
```

Visit http://localhost:5173 - you should see the login page.

## Development Workflow

### Branch Strategy

We follow a feature branch workflow:

1. **main**: Production-ready code
2. **Feature branches**: Named `feature/description`
3. **Bug fixes**: Named `fix/description`

### Starting New Work

1. Update your local main branch:
   ```bash
   git checkout main
   git pull origin main
   ```

2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes and commit regularly:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

### Commit Message Convention

We follow conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Build process or auxiliary tool changes

### Running Development Server

```bash
# Start development server with hot reload
npm run dev

# Start with specific port
npm run dev -- --port 3000

# Start with network exposure
npm run dev -- --host
```

## Code Style and Standards

### TypeScript Guidelines

1. **Strict Mode**: Always use strict TypeScript settings
2. **Type Imports**: Use type imports when importing only types
   ```typescript
   import type { User } from '@/types/user'
   ```

3. **Interface vs Type**: Use interfaces for object shapes, types for unions/aliases
   ```typescript
   interface Player {
     id: string
     name: string
   }
   
   type Role = 'owner' | 'organizer' | 'player' | 'visitor'
   ```

### React Best Practices

1. **Functional Components**: Always use functional components with hooks
   ```typescript
   const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
     // Component logic
   }
   ```

2. **Custom Hooks**: Extract logic into custom hooks
   ```typescript
   function usePlayDates() {
     // Hook logic
   }
   ```

3. **Memoization**: Use React.memo, useMemo, and useCallback appropriately

### Tailwind CSS

1. **Mobile-First**: Start with mobile styles, add responsive modifiers
   ```jsx
   <div className="p-4 md:p-6 lg:p-8">
   ```

2. **Component Classes**: Extract repeated patterns
   ```css
   @layer components {
     .btn-primary {
       @apply px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600;
     }
   }
   ```

### File Organization

1. **Component Files**: One component per file
2. **Index Exports**: Use index.ts for clean imports
3. **Co-location**: Keep related files together

## Project Structure

### Key Directories

```
app/src/
├── components/          # React components
│   ├── auth/           # Authentication related
│   ├── common/         # Shared UI components
│   └── [feature]/      # Feature-specific components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and helpers
│   ├── supabase.ts    # Supabase client
│   └── utils.ts       # Utility functions
├── pages/             # Page components
├── stores/            # Zustand stores
├── types/             # TypeScript types
└── styles/            # Global styles
```

### Import Aliases

The project uses path aliases for cleaner imports:

```typescript
import { Button } from '@/components/common/Button'
import { useAuth } from '@/hooks/useAuth'
import type { Player } from '@/types/database'
```

## Common Development Tasks

### Adding a New Component

1. Create component file:
   ```bash
   touch src/components/feature/NewComponent.tsx
   ```

2. Implement component:
   ```typescript
   interface NewComponentProps {
     // Props
   }
   
   export const NewComponent: React.FC<NewComponentProps> = (props) => {
     return <div>Component content</div>
   }
   ```

3. Add tests:
   ```bash
   touch src/components/feature/NewComponent.test.tsx
   ```

### Adding a New Page

1. Create page component in `src/pages/`
2. Add route in `App.tsx`
3. Update navigation if needed

### Working with Supabase

1. **Queries**: Use the Supabase client
   ```typescript
   const { data, error } = await supabase
     .from('players')
     .select('*')
     .order('name')
   ```

2. **Real-time**: Subscribe to changes
   ```typescript
   const subscription = supabase
     .channel('matches')
     .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, 
       (payload) => {
         // Handle change
       }
     )
     .subscribe()
   ```

### Working with State

1. **Zustand Store**: For global state
   ```typescript
   const user = useAuthStore((state) => state.user)
   ```

2. **Local State**: For component-specific state
   ```typescript
   const [isLoading, setIsLoading] = useState(false)
   ```

## Debugging

### Browser DevTools

1. **React DevTools**: Inspect component tree and props
2. **Network Tab**: Monitor API calls
3. **Console**: Check for errors and logs

### VS Code Debugging

1. Create `.vscode/launch.json`:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "chrome",
         "request": "launch",
         "name": "Launch Chrome",
         "url": "http://localhost:5173",
         "webRoot": "${workspaceFolder}/app"
       }
     ]
   }
   ```

2. Set breakpoints in VS Code
3. Press F5 to start debugging

### Common Issues

1. **Supabase Connection**: Check environment variables
2. **TypeScript Errors**: Run `npm run type-check`
3. **Build Errors**: Clear cache with `rm -rf node_modules/.vite`

## Contributing

### Before Submitting a PR

1. **Run Tests**:
   ```bash
   npm test
   npm run test:coverage
   ```

2. **Check Types**:
   ```bash
   npm run type-check
   ```

3. **Lint Code**:
   ```bash
   npm run lint
   npm run lint:fix
   ```

4. **Format Code**:
   ```bash
   npm run format
   ```

### Pull Request Process

1. Push your feature branch
2. Create PR against `main`
3. Fill out PR template
4. Ensure CI passes
5. Request review
6. Address feedback
7. Merge when approved

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass and coverage maintained
- [ ] No console.logs or debug code
- [ ] TypeScript types are proper
- [ ] Mobile-responsive design
- [ ] Accessibility considered
- [ ] Performance impact assessed
- [ ] Documentation updated if needed