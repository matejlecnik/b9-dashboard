# Standard Component Library

A collection of standardized, reusable components for the B9 Dashboard. These components ensure consistency across all dashboard pages with unified styles, shadows, spacing, and interactions.

## 🚨 MANDATORY: Dashboard Sidebar Requirement

**ALL dashboards in the B9 platform MUST implement a sidebar for navigation.** This is a non-negotiable requirement to ensure consistent user experience across all dashboard modules.

### Sidebar Implementation Guidelines

1. **Create a dedicated sidebar component** for each dashboard module (e.g., `InstagramSidebar`, `RedditMonitorSidebar`)
2. **Use the `SidebarTemplate` component** as the base for all sidebars
3. **Include all relevant navigation items** specific to that dashboard
4. **Maintain consistent styling** using the design system tokens
5. **Add proper badges and status indicators** where applicable

### Example Implementation

```tsx
// src/components/InstagramSidebar.tsx
import { SidebarTemplate } from '@/components/SidebarTemplate'
import { Users, Hash, TrendingUp, BarChart } from 'lucide-react'

export function InstagramSidebar() {
  const navigationItems = [
    {
      title: 'Creator Review',
      href: '/instagram/creator-review',
      icon: Users,
      badge: { type: 'count', value: '85', variant: 'default' }
    },
    // ... more navigation items
  ]

  return (
    <SidebarTemplate
      title="Instagram Dashboard"
      icon={InstagramIcon}
      backHref="/dashboards"
      navigationItems={navigationItems}
      showTeamSection={true}
      showLogout={true}
    />
  )
}
```

### Page Layout with Sidebar

Every dashboard page MUST include the sidebar in its layout:

```tsx
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex relative">
      {/* Background texture */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" />

      {/* Sidebar - REQUIRED */}
      <div className="relative z-50">
        <YourDashboardSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-hidden bg-transparent flex flex-col">
          {/* Page content */}
        </main>
      </div>
    </div>
  )
}
```

## 🎨 Design System

The design system (`/lib/design-system.ts`) provides consistent tokens for:
- **Shadows**: xs, sm, md, lg, xl, card, hover
- **Border Radius**: sm (8px), md (12px), lg (16px), full
- **Spacing**: page, card, compact, section
- **Typography**: h1-h4, body, subtitle, label
- **Glass Effects**: light, medium, heavy, pink
- **Colors**: Using B9 pink (#FF8395) as primary

## 📦 Components

### Layout Components

#### `PageContainer`
Main wrapper for dashboard pages with sidebar and header.

```tsx
import { PageContainer } from '@/components/standard'

<PageContainer
  title="Dashboard Title"
  subtitle="Optional subtitle"
  showSidebar={true}
  showBackButton={false}
>
  {/* Page content */}
</PageContainer>
```

#### `SimplePageContainer`
Wrapper for pages without sidebar (login, etc).

```tsx
<SimplePageContainer center>
  {/* Centered content */}
</SimplePageContainer>
```

### Card Components

#### `Card`
Versatile container with multiple variants.

```tsx
<Card variant="glass" onClick={handleClick}>
  <CardHeader>
    <CardTitle subtitle="Optional subtitle">Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
  <CardFooter>
    {/* Footer content */}
  </CardFooter>
</Card>
```

Variants: `default`, `glass`, `elevated`, `flat`, `interactive`

### Data Display

#### `DataCard`
Metrics card with icon, value, and trend.

```tsx
<DataCard
  icon={Users}
  title="Total Users"
  value={1234}
  subtitle="Active this month"
  trend={{ value: 12.5, isPositive: true }}
/>
```

#### `MetricGrid`
Grid layout for multiple DataCards.

```tsx
<MetricGrid columns={4}>
  <DataCard {...} />
  <DataCard {...} />
  <DataCard {...} />
  <DataCard {...} />
</MetricGrid>
```

### Search & Filters

#### `SearchBar`
Unified search input with debounce.

```tsx
<SearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Search..."
  debounce={300}
  variant="glass"
/>
```

#### `FilterPills`
Pill-style filter buttons.

```tsx
<FilterPills
  options={[
    { id: 'all', label: 'All', count: 100 },
    { id: 'active', label: 'Active', count: 75, color: 'green' },
    { id: 'inactive', label: 'Inactive', count: 25, color: 'gray' }
  ]}
  selected="all"
  onChange={setFilter}
  showCount
/>
```

#### `ActiveFilters`
Display and manage active filters.

```tsx
<ActiveFilters
  filters={[
    { id: '1', label: 'Status', value: 'Active' },
    { id: '2', label: 'Category', value: 'Premium' }
  ]}
  onRemove={handleRemoveFilter}
  onClearAll={handleClearAll}
/>
```

### Empty & Loading States

#### `EmptyState`
Placeholder for empty content.

```tsx
<EmptyState
  icon={Inbox}
  title="No data found"
  message="Try adjusting your filters or add new items"
  action={{
    label: 'Add Item',
    onClick: handleAddItem
  }}
/>
```

#### `LoadingCard`
Skeleton loader for cards.

```tsx
<LoadingCard rows={3} showHeader showImage />
```

#### `LoadingTable`
Skeleton loader for tables.

```tsx
<LoadingTable rows={5} columns={4} showHeader />
```

#### `LoadingGrid`
Skeleton loader for grids.

```tsx
<LoadingGrid items={6} columns={3} />
```

#### `Spinner`
Simple loading spinner.

```tsx
<Spinner size="md" color="pink" />
```

## 🚀 Usage Examples

### Complete Dashboard Page

```tsx
import {
  PageContainer,
  PageSection,
  MetricGrid,
  DataCard,
  SearchBar,
  FilterPills,
  Card,
  EmptyState,
  LoadingTable
} from '@/components/standard'
import { Users, DollarSign, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])

  return (
    <PageContainer title="Analytics Dashboard" subtitle="Real-time metrics">
      {/* Metrics Section */}
      <PageSection title="Key Metrics">
        <MetricGrid columns={3}>
          <DataCard
            icon={Users}
            title="Total Users"
            value={12453}
            trend={{ value: 8.2, isPositive: true }}
          />
          <DataCard
            icon={DollarSign}
            title="Revenue"
            value="$48,293"
            trend={{ value: -2.4, isPositive: false }}
          />
          <DataCard
            icon={TrendingUp}
            title="Growth Rate"
            value="23.5%"
            subtitle="This quarter"
          />
        </MetricGrid>
      </PageSection>

      {/* Filters Section */}
      <PageSection>
        <div className="flex gap-4 mb-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            className="flex-1 max-w-md"
          />
          <FilterPills
            options={[
              { id: 'all', label: 'All', count: 245 },
              { id: 'active', label: 'Active', count: 189 },
              { id: 'pending', label: 'Pending', count: 56 }
            ]}
            selected={filter}
            onChange={setFilter}
          />
        </div>
      </PageSection>

      {/* Data Table */}
      <PageSection title="Recent Activity">
        <Card variant="glass">
          {loading ? (
            <LoadingTable rows={5} columns={4} />
          ) : data.length > 0 ? (
            <YourTableComponent data={data} />
          ) : (
            <EmptyState
              message="No activity to display"
              action={{
                label: 'Refresh',
                onClick: () => fetchData()
              }}
            />
          )}
        </Card>
      </PageSection>
    </PageContainer>
  )
}
```

### Simple Placeholder Page

```tsx
import { SimplePageContainer, Card, CardContent, DataCard } from '@/components/standard'
import { Instagram } from 'lucide-react'

export default function InstagramDashboard() {
  return (
    <SimplePageContainer center>
      <Card variant="glass" className="max-w-2xl mx-auto">
        <CardContent className="text-center py-12">
          <Instagram className="h-16 w-16 text-pink-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Instagram Analytics</h2>
          <p className="text-gray-600 mb-6">Coming Soon - Q2 2025</p>

          <div className="grid grid-cols-3 gap-4">
            <DataCard title="Launch" value="Q2" subtitle="2025" />
            <DataCard title="Status" value="AI" subtitle="Powered" />
            <DataCard title="Monitoring" value="24/7" subtitle="Real-time" />
          </div>
        </CardContent>
      </Card>
    </SimplePageContainer>
  )
}
```

## 🎯 Best Practices

1. **Use the design system tokens** instead of custom values:
   ```tsx
   // ❌ Don't
   className="shadow-lg rounded-xl p-6"

   // ✅ Do
   className={cn(designSystem.shadows.lg, designSystem.radius.lg, designSystem.spacing.card)}
   ```

2. **Leverage component variants** instead of custom styles:
   ```tsx
   // ❌ Don't
   <div className="bg-white/80 backdrop-blur border rounded-lg p-4">

   // ✅ Do
   <Card variant="glass">
   ```

3. **Compose components** for complex layouts:
   ```tsx
   <PageContainer>
     <PageSection>
       <MetricGrid>
         <DataCard />
       </MetricGrid>
     </PageSection>
   </PageContainer>
   ```

4. **Use loading states** consistently:
   ```tsx
   {loading ? <LoadingTable /> : <ActualTable />}
   ```

## 📐 Component Props Reference

### Common Props
Most components accept these common props:
- `className`: Additional CSS classes
- `variant`: Visual variant of the component
- `loading`: Show loading state
- `onClick`: Click handler

### Size Props
- `size`: 'sm' | 'md' | 'lg'

### Color Props
- `color`: 'gray' | 'pink' | 'green' | 'blue' | 'red'

## 🔄 Migration Guide

To migrate existing pages to use standard components:

1. Replace custom cards with `<Card>` component
2. Replace metrics sections with `<MetricGrid>` and `<DataCard>`
3. Replace search inputs with `<SearchBar>`
4. Replace filter buttons with `<FilterPills>`
5. Replace empty states with `<EmptyState>`
6. Replace loading skeletons with `<LoadingCard>`, `<LoadingTable>`, etc.

## 📝 TODO

- [ ] Add DataTable wrapper component
- [ ] Add Modal/Dialog component
- [ ] Add Notification/Toast component
- [ ] Add Form components (Input, Select, etc.)
- [ ] Add Navigation components (Tabs, Breadcrumbs)