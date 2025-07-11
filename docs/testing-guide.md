# Testing Guide

This guide covers testing strategies, frameworks, and best practices for the Pickleball Tracker application.

## Table of Contents

- [Testing Framework](#testing-framework)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Mocking Strategies](#mocking-strategies)
- [Test Coverage](#test-coverage)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)

## Testing Framework

### Core Technologies

- **Test Runner**: Vitest (faster alternative to Jest)
- **Component Testing**: React Testing Library
- **Assertions**: Vitest built-in matchers + Testing Library
- **Mocking**: Vitest mocks + MSW for API mocking
- **Coverage**: Vitest coverage with v8

### Configuration

Vitest configuration in `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/']
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
```

### Test Setup

Global test setup in `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithOtp: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
      insert: vi.fn(() => ({ data: null, error: null })),
      update: vi.fn(() => ({ data: null, error: null })),
      delete: vi.fn(() => ({ data: null, error: null }))
    }))
  }
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})
```

## Test Structure

### Directory Organization

```
app/src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── LoginForm.test.tsx
│   └── common/
│       ├── Button.tsx
│       └── Button.test.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts
├── lib/
│   ├── utils.ts
│   └── utils.test.ts
└── test/
    ├── setup.ts
    ├── mocks/
    │   ├── supabase.ts
    │   └── handlers.ts
    └── utils/
        ├── render.tsx
        └── test-data.ts
```

### Naming Conventions

- Test files: `Component.test.tsx` or `utility.test.ts`
- Mock files: `__mocks__/module-name.ts`
- Test utilities: `test/utils/`

## Running Tests

### Available Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for specific file
npm test -- LoginForm

# Run tests with UI (Vitest UI)
npm run test:ui
```

### IDE Integration

VS Code test integration:

```json
// .vscode/settings.json
{
  "vitest.enable": true,
  "vitest.commandLine": "npm run test"
}
```

## Writing Tests

### Component Testing

Basic component test structure:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### Hook Testing

Testing custom hooks:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from './useAuth'
import { AuthProvider } from '@/contexts/AuthContext'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('useAuth', () => {
  it('returns user when authenticated', async () => {
    const mockUser = { id: '1', email: 'test@example.com' }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
    })
  })
})
```

### Integration Testing

Testing component interactions:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlayDateForm } from './PlayDateForm'
import { createMockSupabase } from '@/test/mocks/supabase'

vi.mock('@/lib/supabase')

describe('PlayDateForm Integration', () => {
  it('creates play date successfully', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      data: { id: '1', name: 'Test Tournament' },
      error: null
    })
    
    createMockSupabase({
      from: () => ({
        insert: mockCreate,
        select: () => ({ data: [], error: null })
      })
    })

    const user = userEvent.setup()
    render(<PlayDateForm />)

    await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament')
    await user.click(screen.getByRole('button', { name: /create/i }))

    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Test Tournament',
      // ... other expected fields
    })
  })
})
```

## Mocking Strategies

### Supabase Mocking

Create reusable Supabase mock:

```typescript
// test/mocks/supabase.ts
import { vi } from 'vitest'

export const createMockSupabase = (overrides = {}) => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null })
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      data: [],
      error: null
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    })),
    ...overrides
  }

  vi.doMock('@/lib/supabase', () => ({ supabase: mockSupabase }))
  return mockSupabase
}
```

### Real-time Mocking

Mock Supabase Realtime:

```typescript
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnValue('SUBSCRIBED'),
  unsubscribe: vi.fn()
}

const mockSupabase = {
  channel: vi.fn(() => mockChannel)
}
```

### Router Mocking

Mock React Router:

```typescript
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'test-id' }),
  useLocation: () => ({ pathname: '/test' })
}))
```

## Test Coverage

### Coverage Requirements

Maintain minimum coverage thresholds:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
})
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Excluding Files

Files to exclude from coverage:

```typescript
// vitest.config.ts
coverage: {
  exclude: [
    'node_modules/',
    'src/test/',
    '**/*.d.ts',
    'src/vite-env.d.ts',
    'src/main.tsx'
  ]
}
```

## Best Practices

### Test Organization

1. **Group related tests** with `describe` blocks
2. **Use descriptive test names** that explain behavior
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Keep tests isolated** - each test should be independent

### Assertions

```typescript
// Good - specific assertions
expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
expect(mockFunction).toHaveBeenCalledWith({ id: '1', name: 'Test' })

// Bad - vague assertions
expect(screen.getByText('Submit')).toBeTruthy()
expect(mockFunction).toHaveBeenCalled()
```

### Async Testing

```typescript
// Good - wait for async operations
await waitFor(() => {
  expect(screen.getByText('Loading...')).not.toBeInTheDocument()
})

// Bad - testing async without waiting
expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
```

### User Interactions

```typescript
// Good - use userEvent for realistic interactions
const user = userEvent.setup()
await user.click(button)
await user.type(input, 'test value')

// Avoid - fireEvent is less realistic
fireEvent.click(button)
fireEvent.change(input, { target: { value: 'test value' } })
```

## Common Patterns

### Testing Forms

```typescript
describe('LoginForm', () => {
  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
  })

  it('submits with valid data', async () => {
    const mockSubmit = vi.fn()
    const user = userEvent.setup()
    
    render(<LoginForm onSubmit={mockSubmit} />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com'
    })
  })
})
```

### Testing Loading States

```typescript
it('shows loading state during submission', async () => {
  const slowPromise = new Promise(resolve => 
    setTimeout(() => resolve({ data: null, error: null }), 100)
  )
  
  vi.mocked(supabase.from().insert).mockReturnValue(slowPromise)

  const user = userEvent.setup()
  render(<Form />)

  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(screen.getByText(/submitting/i)).toBeInTheDocument()
  
  await waitFor(() => {
    expect(screen.queryByText(/submitting/i)).not.toBeInTheDocument()
  })
})
```

### Testing Error States

```typescript
it('displays error message on submission failure', async () => {
  const errorMessage = 'Something went wrong'
  vi.mocked(supabase.from().insert).mockResolvedValue({
    data: null,
    error: { message: errorMessage }
  })

  const user = userEvent.setup()
  render(<Form />)

  await user.click(screen.getByRole('button', { name: /submit/i }))

  await waitFor(() => {
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })
})
```

### Testing Conditional Rendering

```typescript
describe('Navigation', () => {
  it('shows admin links for project owners', () => {
    const mockUser = { id: '1', isProjectOwner: true }
    render(<Navigation user={mockUser} />)

    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument()
  })

  it('hides admin links for regular users', () => {
    const mockUser = { id: '1', isProjectOwner: false }
    render(<Navigation user={mockUser} />)

    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument()
  })
})
```

### Test Data Factories

Create reusable test data:

```typescript
// test/utils/test-data.ts
export const createMockPlayDate = (overrides = {}) => ({
  id: '1',
  name: 'Test Tournament',
  date: '2024-01-15',
  max_players: 16,
  target_score: 11,
  win_by_two: true,
  ...overrides
})

export const createMockPlayer = (overrides = {}) => ({
  id: '1',
  name: 'Test Player',
  email: 'test@example.com',
  is_project_owner: false,
  ...overrides
})
```

### Custom Render Utility

Create wrapper for providers:

```typescript
// test/utils/render.tsx
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'

export const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </BrowserRouter>
  )
}
```