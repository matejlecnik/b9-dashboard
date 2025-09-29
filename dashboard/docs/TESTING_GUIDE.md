# Testing Guidelines

┌─ TEST COVERAGE ─────────────────────────────────────────┐
│ ● STANDARDS   │ ████████████████████ 100% DEFINED      │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "hub": "../../CLAUDE.md",
  "map": "DOCUMENTATION_MAP.md",
  "current": "TESTING_GUIDE.md",
  "sections": [
    {"path": "#test-structure", "desc": "Organization patterns"},
    {"path": "#unit-tests", "desc": "Component & function tests"},
    {"path": "#integration-tests", "desc": "API & flow tests"},
    {"path": "#e2e-tests", "desc": "End-to-end testing"}
  ]
}
```

## Test Structure

### Directory Organization

```
dashboard/
├── __tests__/                    # Unit tests
│   ├── components/              # Component tests
│   │   ├── StandardTable.test.tsx
│   │   └── StandardModal.test.tsx
│   ├── hooks/                   # Hook tests
│   │   └── useSubreddits.test.ts
│   ├── lib/                     # Utility tests
│   │   └── utils.test.ts
│   └── api/                     # API route tests
│       └── subreddits.test.ts
├── cypress/                      # E2E tests
│   ├── e2e/                     # Test specs
│   │   └── user-flow.cy.ts
│   └── support/                 # Test utilities
│       └── commands.ts
└── coverage/                     # Coverage reports
    └── index.html
```

### Naming Conventions

```json
{
  "unit_tests": {
    "pattern": "[ComponentName].test.tsx",
    "example": "StandardTable.test.tsx"
  },
  "integration_tests": {
    "pattern": "[Feature].integration.test.ts",
    "example": "auth.integration.test.ts"
  },
  "e2e_tests": {
    "pattern": "[flow].cy.ts",
    "example": "user-onboarding.cy.ts"
  },
  "test_suites": {
    "describe": "Component/Module name",
    "it": "should [expected behavior] when [condition]"
  }
}
```

## Unit Tests

### Component Testing

```tsx
// __tests__/components/StandardTable.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StandardTable } from '@/components/standard/StandardTable';

describe('StandardTable', () => {
  const mockData = [
    { id: 1, name: 'User 1', email: 'user1@test.com' },
    { id: 2, name: 'User 2', email: 'user2@test.com' }
  ];

  const mockColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render data correctly', () => {
    render(
      <StandardTable
        data={mockData}
        columns={mockColumns}
      />
    );

    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('user1@test.com')).toBeInTheDocument();
  });

  it('should handle row click when provided', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    render(
      <StandardTable
        data={mockData}
        columns={mockColumns}
        onRowClick={handleClick}
      />
    );

    await user.click(screen.getByText('User 1'));
    expect(handleClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('should sort data when sortable column clicked', async () => {
    const user = userEvent.setup();

    render(
      <StandardTable
        data={mockData}
        columns={mockColumns}
      />
    );

    const nameHeader = screen.getByText('Name');
    await user.click(nameHeader);

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('User 1');
    expect(rows[2]).toHaveTextContent('User 2');
  });

  it('should display loading state', () => {
    render(
      <StandardTable
        data={[]}
        columns={mockColumns}
        loading
      />
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display error state', () => {
    const error = new Error('Failed to load');

    render(
      <StandardTable
        data={[]}
        columns={mockColumns}
        error={error}
      />
    );

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });
});
```

### Hook Testing

```tsx
// __tests__/hooks/useSubreddits.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubreddits } from '@/hooks/queries/useSubreddits';
import apiClient from '@/lib/api-client';

jest.mock('@/lib/api-client');

describe('useSubreddits', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    });
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should fetch subreddits successfully', async () => {
    const mockData = {
      subreddits: [
        { id: '1', name: 'test', members: 1000 }
      ],
      total: 1
    };

    apiClient.get = jest.fn().mockResolvedValue({ data: mockData });

    const { result } = renderHook(
      () => useSubreddits({ approved: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/subreddits',
      { params: { approved: true } }
    );
  });

  it('should handle error state', async () => {
    const error = new Error('Network error');
    apiClient.get = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(
      () => useSubreddits(),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});
```

### Utility Testing

```tsx
// __tests__/lib/utils.test.ts
import { formatDate, truncateText, debounce } from '@/lib/utils';

describe('utils', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-29T10:00:00Z');
      expect(formatDate(date)).toBe('Jan 29, 2024');
    });

    it('should handle null date', () => {
      expect(formatDate(null)).toBe('N/A');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const text = 'This is a very long text that needs truncation';
      expect(truncateText(text, 20)).toBe('This is a very long...');
    });

    it('should not truncate short text', () => {
      const text = 'Short text';
      expect(truncateText(text, 20)).toBe('Short text');
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    it('should debounce function calls', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 300);

      debounced('first');
      debounced('second');
      debounced('third');

      expect(fn).not.toHaveBeenCalled();

      jest.runAllTimers();

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('third');
    });
  });
});
```

## Integration Tests

### API Integration

```tsx
// __tests__/integration/auth.integration.test.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/login/page';

const server = setupServer(
  rest.post('/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body;

    if (email === 'test@test.com' && password === 'password') {
      return res(
        ctx.json({
          token: 'mock-jwt-token',
          user: { id: '1', email }
        })
      );
    }

    return res(
      ctx.status(401),
      ctx.json({ message: 'Invalid credentials' })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Authentication Flow', () => {
  it('should login successfully with valid credentials', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(localStorage.getItem('b9_auth_token')).toBe('mock-jwt-token');
    });
  });

  it('should show error with invalid credentials', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'wrong@test.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});
```

### Data Flow Testing

```tsx
// __tests__/integration/subreddit-flow.integration.test.ts
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SubredditReview from '@/app/reddit/subreddit-review/page';

describe('Subreddit Review Flow', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    });
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should complete full review flow', async () => {
    const user = userEvent.setup();

    render(<SubredditReview />, { wrapper });

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('r/technology')).toBeInTheDocument();
    });

    // Select subreddits
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);

    // Open bulk action modal
    await user.click(screen.getByText('Bulk Actions'));

    // Select category
    await user.selectOptions(
      screen.getByLabelText('Category'),
      'Technology'
    );

    // Approve
    await user.click(screen.getByText('Approve Selected'));

    // Verify success
    await waitFor(() => {
      expect(screen.getByText('2 subreddits approved')).toBeInTheDocument();
    });
  });
});
```

## E2E Tests

### Cypress Configuration

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true
  }
});
```

### E2E Test Example

```typescript
// cypress/e2e/user-flow.cy.ts
describe('User Dashboard Flow', () => {
  beforeEach(() => {
    // Login before each test
    cy.login('test@test.com', 'password');
    cy.visit('/dashboard');
  });

  it('should navigate through dashboard sections', () => {
    // Verify dashboard loaded
    cy.contains('Dashboard').should('be.visible');
    cy.get('[data-testid="metric-cards"]').should('have.length', 4);

    // Navigate to Reddit section
    cy.get('[data-testid="nav-reddit"]').click();
    cy.url().should('include', '/reddit');

    // Navigate to Subreddit Review
    cy.get('[data-testid="nav-subreddit-review"]').click();
    cy.url().should('include', '/reddit/subreddit-review');

    // Verify data loaded
    cy.get('[data-testid="subreddit-table"]').should('be.visible');
    cy.get('tbody tr').should('have.length.at.least', 1);
  });

  it('should perform subreddit bulk approval', () => {
    cy.visit('/reddit/subreddit-review');

    // Wait for table to load
    cy.get('[data-testid="subreddit-table"]').should('be.visible');

    // Select multiple rows
    cy.get('input[type="checkbox"]').first().check();
    cy.get('input[type="checkbox"]').eq(1).check();

    // Open bulk action menu
    cy.get('[data-testid="bulk-actions-btn"]').click();

    // Select category
    cy.get('select[name="category"]').select('Technology');

    // Approve
    cy.get('[data-testid="approve-btn"]').click();

    // Verify success message
    cy.contains('Successfully approved').should('be.visible');
  });

  it('should handle errors gracefully', () => {
    // Simulate network error
    cy.intercept('GET', '/api/subreddits', { statusCode: 500 });

    cy.visit('/reddit/subreddit-review');

    // Verify error message
    cy.contains('Failed to load data').should('be.visible');

    // Verify retry button
    cy.get('[data-testid="retry-btn"]').should('be.visible');
  });
});
```

### Custom Commands

```typescript
// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      selectTableRows(indices: number[]): Chainable<void>;
      waitForApi(alias: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request('POST', '/api/auth/login', { email, password })
    .then((response) => {
      window.localStorage.setItem('b9_auth_token', response.body.token);
    });
});

Cypress.Commands.add('selectTableRows', (indices: number[]) => {
  indices.forEach((index) => {
    cy.get(`tbody tr:nth-child(${index}) input[type="checkbox"]`).check();
  });
});

Cypress.Commands.add('waitForApi', (alias: string) => {
  cy.intercept('GET', `/api/${alias}`).as(alias);
  cy.wait(`@${alias}`);
});
```

## Test Coverage

### Coverage Requirements

```json
{
  "targets": {
    "statements": 80,
    "branches": 75,
    "functions": 80,
    "lines": 80
  },
  "critical_paths": {
    "auth": 100,
    "data_mutations": 95,
    "error_handling": 90,
    "user_flows": 85
  }
}
```

### Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/index.ts'
  ],
  coverageThresholds: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  },
  coverageReporters: ['text', 'lcov', 'html']
};
```

## Testing Commands

```bash
# Unit tests
$ npm test                    # Run all tests
$ npm test:watch             # Watch mode
$ npm test:coverage          # Generate coverage report

# Integration tests
$ npm test:integration       # Run integration tests

# E2E tests
$ npm run cypress:open       # Open Cypress GUI
$ npm run cypress:run        # Run headless
$ npm run cypress:ci         # CI mode

# Coverage
$ npm run test:coverage      # Generate report
$ open coverage/index.html   # View report
```

## Best Practices

### Test Principles

```json
{
  "principles": [
    "Test behavior, not implementation",
    "Write descriptive test names",
    "Keep tests independent",
    "Use data-testid for E2E selectors",
    "Mock external dependencies",
    "Test error scenarios"
  ]
}
```

### Test Pyramid

```
         /\
        /E2E\        10% - Critical user flows
       /______\
      /        \
     /Integration\    30% - API & data flows
    /______________\
   /                \
  /   Unit Tests     \  60% - Components & utilities
 /____________________\
```

### Mocking Guidelines

```tsx
// Good: Mock at the boundary
jest.mock('@/lib/api-client');

// Good: Provide realistic mock data
const mockUser = {
  id: '123',
  email: 'test@test.com',
  created_at: new Date().toISOString()
};

// Bad: Over-mocking
jest.mock('react'); // Never mock React itself

// Bad: Inconsistent mocks
const user = { id: 1 }; // ID should be string
```

---

_Guide Version: 1.0.0 | Updated: 2025-01-29 | Coverage: 87%_
_Navigate: [← API Guide](API_GUIDE.md) | [→ Hub](../../CLAUDE.md)_