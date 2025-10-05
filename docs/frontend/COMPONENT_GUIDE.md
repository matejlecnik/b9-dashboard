# Component Usage Guide

┌─ COMPONENT LIBRARY ─────────────────────────────────────┐
│ ● DOCUMENTED  │ ████████████████████ 100% READY        │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "hub": "../../CLAUDE.md",
  "map": "DOCUMENTATION_MAP.md",
  "current": "COMPONENT_GUIDE.md",
  "sections": [
    {"path": "#standard-components", "desc": "Core UI patterns"},
    {"path": "#decision-tree", "desc": "Component selection"},
    {"path": "#usage-examples", "desc": "Implementation patterns"},
    {"path": "#best-practices", "desc": "Guidelines"}
  ]
}
```

## Standard Components

### StandardTable

```tsx
// Purpose: Display tabular data with sorting, filtering, pagination
// Location: src/components/standard/StandardTable.tsx

import { StandardTable } from '@/components/standard/StandardTable';

// Basic Usage
<StandardTable
  data={users}
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', render: (val) => <Badge>{val}</Badge> }
  ]}
  pageSize={25}
  onRowClick={(row) => console.log(row)}
/>

// Advanced Features
<StandardTable
  data={posts}
  columns={columns}
  searchable
  searchPlaceholder="Search posts..."
  filters={[
    { key: 'category', label: 'Category', options: categories }
  ]}
  actions={[
    { label: 'Export', onClick: handleExport },
    { label: 'Refresh', onClick: refetch }
  ]}
  loading={isLoading}
  error={error}
/>
```

### StandardModal

```tsx
// Purpose: Consistent modal dialogs
// Location: src/components/standard/StandardModal.tsx

import { StandardModal } from '@/components/standard/StandardModal';

// Basic Modal
<StandardModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
>
  <p>Are you sure you want to proceed?</p>
  <div className="flex gap-2 mt-4">
    <Button onClick={handleConfirm}>Confirm</Button>
    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
  </div>
</StandardModal>

// Form Modal
<StandardModal
  isOpen={isEditOpen}
  onClose={handleClose}
  title="Edit Category"
  size="lg"
>
  <form onSubmit={handleSubmit}>
    <Input label="Name" {...register('name')} />
    <Textarea label="Description" {...register('description')} />
    <Button type="submit" loading={isSubmitting}>
      Save Changes
    </Button>
  </form>
</StandardModal>
```

### StandardError

```tsx
// Purpose: Consistent error display
// Location: src/components/standard/StandardError.tsx

import { StandardError } from '@/components/standard/StandardError';

// Basic Error
<StandardError message="Failed to load data" />

// With Retry
<StandardError
  message="Connection failed"
  onRetry={refetch}
  showDetails
  details={error?.stack}
/>

// Custom Actions
<StandardError
  title="Permission Denied"
  message="You don't have access to this resource"
  actions={[
    { label: 'Request Access', onClick: requestAccess },
    { label: 'Go Back', onClick: () => router.back() }
  ]}
/>
```

### StandardPlaceholder

```tsx
// Purpose: Loading and empty states
// Location: src/components/standard/StandardPlaceholder.tsx

import { StandardPlaceholder } from '@/components/standard/StandardPlaceholder';

// Loading State
<StandardPlaceholder type="loading" message="Fetching data..." />

// Empty State
<StandardPlaceholder
  type="empty"
  title="No Results"
  message="Try adjusting your filters"
  action={{
    label: 'Clear Filters',
    onClick: clearFilters
  }}
/>

// Custom Icon
<StandardPlaceholder
  type="custom"
  icon={<SearchIcon />}
  title="Search for creators"
  message="Enter a username to get started"
/>
```

### StandardToast

```tsx
// Purpose: Notification system
// Location: src/components/standard/StandardToast.tsx

import { useToast } from '@/components/standard/StandardToast';

// Usage in component
const { showToast } = useToast();

// Success Toast
showToast({
  type: 'success',
  message: 'Changes saved successfully'
});

// Error Toast
showToast({
  type: 'error',
  message: 'Failed to save',
  description: error.message,
  duration: 5000
});

// Action Toast
showToast({
  type: 'info',
  message: 'New update available',
  action: {
    label: 'Refresh',
    onClick: () => window.location.reload()
  }
});
```

## Component Decision Tree

```json
{
  "need_to_display": {
    "tabular_data": "StandardTable",
    "cards": "DataCard or StatCard",
    "metrics": "MetricCard",
    "progress": "ProgressCard",
    "error": "StandardError",
    "loading": "StandardPlaceholder",
    "empty": "EmptyState"
  },
  "need_user_input": {
    "simple_form": "Input + Button",
    "complex_form": "StandardModal with form",
    "confirmation": "StandardModal with actions",
    "selection": "Select or Dropdown",
    "multi_select": "CheckboxGroup",
    "text": "Textarea"
  },
  "need_feedback": {
    "success": "StandardToast success",
    "error": "StandardToast error",
    "warning": "StandardToast warning",
    "info": "StandardToast info",
    "progress": "LoadingSpinner",
    "validation": "Inline error text"
  },
  "need_navigation": {
    "tabs": "Tabs component",
    "breadcrumbs": "Breadcrumbs",
    "pagination": "Built into StandardTable",
    "menu": "DropdownMenu"
  }
}
```

## Usage Examples

### Data Display Pattern

```tsx
// Pattern: Loading -> Error -> Empty -> Data
function UserList() {
  const { data, isLoading, error } = useQuery(['users']);

  if (isLoading) {
    return <StandardPlaceholder type="loading" />;
  }

  if (error) {
    return <StandardError message={error.message} onRetry={refetch} />;
  }

  if (!data?.length) {
    return <EmptyState message="No users found" />;
  }

  return (
    <StandardTable
      data={data}
      columns={columns}
      searchable
    />
  );
}
```

### Form Pattern

```tsx
// Pattern: Modal form with validation
function CategoryForm({ category, onClose }) {
  const { register, handleSubmit, errors } = useForm({
    defaultValues: category
  });

  const mutation = useMutation(saveCategory, {
    onSuccess: () => {
      showToast({ type: 'success', message: 'Saved!' });
      onClose();
    },
    onError: (error) => {
      showToast({ type: 'error', message: error.message });
    }
  });

  return (
    <StandardModal
      isOpen
      onClose={onClose}
      title={category ? 'Edit Category' : 'New Category'}
    >
      <form onSubmit={handleSubmit(mutation.mutate)}>
        <Input
          label="Name"
          error={errors.name?.message}
          {...register('name', { required: 'Name is required' })}
        />
        <Button
          type="submit"
          loading={mutation.isLoading}
        >
          Save
        </Button>
      </form>
    </StandardModal>
  );
}
```

### Dashboard Card Pattern

```tsx
// Pattern: Metric cards with live updates
function DashboardMetrics() {
  const { data } = useQuery(['metrics'], fetchMetrics, {
    refetchInterval: 30000 // Update every 30s
  });

  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        title="Total Users"
        value={data?.users || 0}
        change={data?.userChange}
        trend={data?.userTrend}
      />
      <StatCard
        title="Active Now"
        value={data?.active || 0}
        icon={<UsersIcon />}
        color="green"
      />
      <ProgressCard
        title="Storage"
        current={data?.storage?.used}
        total={data?.storage?.total}
        unit="GB"
      />
      <DataCard
        title="Recent Activity"
        data={data?.recentActivity}
        renderItem={(item) => <ActivityItem {...item} />}
      />
    </div>
  );
}
```

## Best Practices

### 1. Component Selection

```json
{
  "rules": [
    "Use Standard* components for consistency",
    "Prefer composition over props drilling",
    "Keep components focused on single responsibility",
    "Use UI primitives for custom needs"
  ]
}
```

### 2. Layout & Navigation

```json
{
  "rules": [
    "❌ NEVER use page headers - navigation via sidebar only",
    "All page titles should be in the sidebar, not as page headers",
    "DashboardLayout title/subtitle are for metadata only (not displayed)",
    "Maximize vertical space for content"
  ]
}
```

**Rationale:**
- Page headers waste valuable vertical space
- Navigation is handled by the sidebar - headers are redundant
- Modern dashboard UX avoids duplicate navigation elements
- More content visible = better user experience

```tsx
// ✅ Good: No header, content starts immediately
<DashboardTemplate title="Creator Review">
  <MetricsCards />
  <Toolbar />
  <DataTable />
</DashboardTemplate>

// ❌ Bad: Don't add custom headers
<DashboardTemplate title="Creator Review">
  <h1>Creator Review</h1>  {/* ❌ Redundant */}
  <MetricsCards />
</DashboardTemplate>
```

### 3. Error Handling

```tsx
// Always handle loading, error, and empty states
function DataComponent() {
  const { data, isLoading, error } = useQuery();

  // ✅ Good: Handle all states
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <EmptyState />;
  return <DataDisplay data={data} />;

  // ❌ Bad: Only handle success
  return <DataDisplay data={data} />;
}
```

### 4. Performance

```tsx
// Use React.memo for expensive components
const ExpensiveTable = React.memo(StandardTable);

// Use useMemo for computed values
const sortedData = useMemo(
  () => data.sort((a, b) => a.name.localeCompare(b.name)),
  [data]
);

// Use lazy loading for heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));
```

### 5. Accessibility

```tsx
// Always include ARIA labels
<Button aria-label="Delete item">
  <TrashIcon />
</Button>

// Use semantic HTML
<nav aria-label="Main navigation">
  <ul>...</ul>
</nav>

// Keyboard navigation
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
```

### 5. Type Safety

```tsx
// Define props interfaces
interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}

// Use generics for reusability
function DataList<T>({ items }: { items: T[] }) {
  return items.map(item => <Item key={item.id} data={item} />);
}
```

## Component Patterns

### Container/Presenter Pattern

```tsx
// Container: Logic and data
function UserListContainer() {
  const { data, ...props } = useUsers();
  const handleDelete = useDeleteUser();

  return (
    <UserListPresenter
      users={data}
      onDelete={handleDelete}
      {...props}
    />
  );
}

// Presenter: Pure UI
function UserListPresenter({ users, onDelete }) {
  return (
    <StandardTable
      data={users}
      columns={columns}
      actions={[{ label: 'Delete', onClick: onDelete }]}
    />
  );
}
```

### Compound Components

```tsx
// Parent component exports related components
export const DataPanel = {
  Root: DataPanelRoot,
  Header: DataPanelHeader,
  Body: DataPanelBody,
  Footer: DataPanelFooter
};

// Usage
<DataPanel.Root>
  <DataPanel.Header title="Users" />
  <DataPanel.Body>
    <UserList />
  </DataPanel.Body>
  <DataPanel.Footer>
    <Pagination />
  </DataPanel.Footer>
</DataPanel.Root>
```

## Testing Components

```tsx
// Example test for StandardTable
import { render, screen, fireEvent } from '@testing-library/react';

describe('StandardTable', () => {
  it('renders data correctly', () => {
    render(
      <StandardTable
        data={mockData}
        columns={mockColumns}
      />
    );

    expect(screen.getByText('User 1')).toBeInTheDocument();
  });

  it('handles row click', () => {
    const handleClick = jest.fn();
    render(
      <StandardTable
        data={mockData}
        columns={mockColumns}
        onRowClick={handleClick}
      />
    );

    fireEvent.click(screen.getByText('User 1'));
    expect(handleClick).toHaveBeenCalledWith(mockData[0]);
  });
});
```

---

_Guide Version: 1.0.0 | Updated: 2025-01-29 | Components: 45+_
_Navigate: [← Documentation Map](DOCUMENTATION_MAP.md) | [→ API Guide](API_GUIDE.md)_