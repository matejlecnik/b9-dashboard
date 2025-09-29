# Testing Guidelines

┌─ TESTING STANDARDS ─────────────────────────────────────┐
│ ● DOCUMENTED  │ ████████████████████ 100% COMPLETE     │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../../CLAUDE.md",
  "current": "TESTING_GUIDELINES.md",
  "siblings": [
    {"path": "COMPONENT_GUIDE.md", "desc": "Component patterns", "status": "ACTIVE"},
    {"path": "API_INTEGRATION_GUIDE.md", "desc": "API integration", "status": "ACTIVE"},
    {"path": "TESTING_GUIDE.md", "desc": "Detailed testing reference", "status": "COMPLETE"}
  ]
}
```

## Testing Strategy

```json
{
  "framework": "Jest + React Testing Library",
  "coverage_target": 85,
  "current_coverage": 87,
  "priority": [
    "Critical user flows",
    "Data mutations",
    "Error handling",
    "Component interactions"
  ],
  "excluded": [
    "UI primitives (shadcn/ui)",
    "Type definitions",
    "Configuration files"
  ]
}
```

## Test Structure

### File Organization

```
dashboard/
├── src/
│   ├── components/
│   │   └── features/
│   │       ├── UserTable.tsx
│   │       └── UserTable.test.tsx      ← Co-located tests
│   ├── hooks/
│   │   └── queries/
│   │       ├── useSubreddits.ts
│   │       └── useSubreddits.test.ts
│   └── lib/
│       ├── utils.ts
│       └── utils.test.ts
└── __tests__/
    ├── integration/
    │   └── reddit-flow.test.tsx         ← Integration tests
    └── e2e/
        └── categorization.test.tsx      ← E2E tests
```

## Unit Testing

### Component Tests

```tsx
// src/components/features/SubredditTable.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils'
import { SubredditTable } from './SubredditTable'

describe('SubredditTable', () => {
  const mockSubreddits = [
    { id: 1, name: 'technology', subscribers: 10000, category: 'Tech' },
    { id: 2, name: 'science', subscribers: 5000, category: 'Science' }
  ]

  it('renders subreddit data correctly', () => {
    render(<SubredditTable subreddits={mockSubreddits} loading={false} />)

    expect(screen.getByText('technology')).toBeInTheDocument()
    expect(screen.getByText('10,000')).toBeInTheDocument()
  })

  it('handles selection state', () => {
    const onSelect = jest.fn()

    render(
      <SubredditTable
        subreddits={mockSubreddits}
        loading={false}
        onSelect={onSelect}
      />
    )

    const checkbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(checkbox)

    expect(onSelect).toHaveBeenCalledWith(new Set([1]))
  })

  it('shows loading state', () => {
    render(<SubredditTable subreddits={[]} loading={true} />)

    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument()
  })

  it('handles empty state', () => {
    render(<SubredditTable subreddits={[]} loading={false} />)

    expect(screen.getByText(/no subreddits found/i)).toBeInTheDocument()
  })
})
```

### Hook Tests

```tsx
// src/hooks/queries/useSubreddits.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSubreddits } from './useSubreddits'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase')

describe('useSubreddits', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  it('fetches subreddits successfully', async () => {
    const mockData = [
      { id: 1, name: 'test', subscribers: 1000 }
    ]

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockData,
          error: null
        })
      })
    })

    const { result } = renderHook(() => useSubreddits(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockData)
  })

  it('handles errors correctly', async () => {
    const mockError = new Error('Database connection failed')

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      })
    })

    const { result } = renderHook(() => useSubreddits(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe(mockError)
  })
})
```

### Utility Function Tests

```tsx
// src/lib/utils.test.ts
import { formatNumber, cn, calculateEngagement } from './utils'

describe('formatNumber', () => {
  it('formats thousands with K', () => {
    expect(formatNumber(1500)).toBe('1.5K')
  })

  it('formats millions with M', () => {
    expect(formatNumber(2500000)).toBe('2.5M')
  })

  it('handles small numbers', () => {
    expect(formatNumber(999)).toBe('999')
  })
})

describe('calculateEngagement', () => {
  it('calculates engagement ratio correctly', () => {
    const result = calculateEngagement(100, 1000)
    expect(result).toBe(0.1)
  })

  it('handles zero upvotes', () => {
    const result = calculateEngagement(10, 0)
    expect(result).toBe(0)
  })
})
```

## Integration Testing

### Page Flow Tests

```tsx
// __tests__/integration/categorization-flow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils'
import CategorizationPage from '@/app/reddit/categorization/page'
import { server } from '@/tests/mocks/server'
import { rest } from 'msw'

describe('Categorization Flow', () => {
  it('completes full categorization workflow', async () => {
    renderWithProviders(<CategorizationPage />)

    // Wait for posts to load
    await waitFor(() => {
      expect(screen.getByText('Uncategorized Posts')).toBeInTheDocument()
    })

    // Select a category
    const categorySelect = screen.getAllByRole('combobox')[0]
    fireEvent.click(categorySelect)
    fireEvent.click(screen.getByText('Technology'))

    // Verify update
    await waitFor(() => {
      expect(screen.getByText('Category updated')).toBeInTheDocument()
    })

    // Verify post moved to categorized
    expect(screen.queryByTestId('post-1')).not.toBeInTheDocument()
  })

  it('handles bulk categorization', async () => {
    renderWithProviders(<CategorizationPage />)

    await waitFor(() => {
      expect(screen.getByText('Uncategorized Posts')).toBeInTheDocument()
    })

    // Select multiple posts
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[1])

    // Bulk categorize
    const bulkButton = screen.getByText('Categorize Selected')
    fireEvent.click(bulkButton)

    // Select category in modal
    fireEvent.click(screen.getByText('Science'))

    // Confirm
    fireEvent.click(screen.getByText('Apply'))

    await waitFor(() => {
      expect(screen.getByText('2 posts categorized')).toBeInTheDocument()
    })
  })
})
```

## Testing Patterns

### Test Utilities

```tsx
// tests/utils.tsx
import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create wrapper with all providers
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity
      },
      mutations: {
        retry: false
      }
    }
  })
}

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions
) {
  const queryClient = createTestQueryClient()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

// Custom render for router testing
export function renderWithRouter(
  ui: ReactElement,
  { route = '/', ...options }: RenderOptions & { route?: string } = {}
) {
  window.history.pushState({}, 'Test page', route)
  return renderWithProviders(ui, options)
}
```

### Mock Server Setup

```tsx
// tests/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

// tests/mocks/handlers.ts
import { rest } from 'msw'

export const handlers = [
  rest.get('/api/subreddits', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: [
          { id: 1, name: 'test', subscribers: 1000, category: 'Tech' }
        ]
      })
    )
  }),

  rest.post('/api/categorization/tags/start', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ success: true, count: 10 })
    )
  })
]

// tests/setup.ts
import { server } from './mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Supabase Mocking

```tsx
// tests/mocks/supabase.ts
export const createMockSupabaseClient = () => ({
  from: jest.fn((table: string) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: mockData[table],
      error: null
    })
  })),
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: { session: mockSession },
      error: null
    })
  }
})
```

## Best Practices

### Test Naming

```json
{
  "pattern": "describe('[Component/Function]', () => { it('[should/when] [behavior]', () => {}) })",
  "examples": {
    "component": "describe('SubredditTable', () => { it('renders subreddit data correctly', ...) })",
    "hook": "describe('useSubreddits', () => { it('fetches subreddits successfully', ...) })",
    "function": "describe('formatNumber', () => { it('formats thousands with K', ...) })",
    "error": "describe('ErrorBoundary', () => { it('catches and displays component errors', ...) })"
  }
}
```

### Arrange-Act-Assert

```tsx
it('updates category on selection', async () => {
  // Arrange: Set up test data and render
  const mockUpdate = jest.fn()
  render(<CategorySelector id={1} onUpdate={mockUpdate} />)

  // Act: Perform user interaction
  const select = screen.getByRole('combobox')
  fireEvent.click(select)
  fireEvent.click(screen.getByText('Technology'))

  // Assert: Verify expected outcome
  await waitFor(() => {
    expect(mockUpdate).toHaveBeenCalledWith(1, 'Technology')
  })
})
```

### Accessibility Testing

```tsx
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

it('has no accessibility violations', async () => {
  const { container } = render(<SubredditTable subreddits={mockData} />)

  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

## Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test SubredditTable.test.tsx

# Update snapshots
npm test -- -u
```

## Coverage Requirements

```json
{
  "global": {
    "branches": 80,
    "functions": 85,
    "lines": 85,
    "statements": 85
  },
  "critical_paths": {
    "mutations": 95,
    "auth_flows": 90,
    "data_transformations": 90
  }
}
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

_Guide Version: 1.0.0 | Updated: 2025-09-29 | Coverage Target: 85%_
_Navigate: [← API Integration](API_INTEGRATION_GUIDE.md) | [→ Testing Guide](TESTING_GUIDE.md)_