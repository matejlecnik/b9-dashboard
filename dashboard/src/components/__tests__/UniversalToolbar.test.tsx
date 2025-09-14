import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UniversalToolbar, createBulkActionsToolbar, createUserBulkActionsToolbar } from '../UniversalToolbar'

describe('UniversalToolbar', () => {
  const mockSearchConfig = {
    id: 'test-search',
    placeholder: 'Search test...',
    value: '',
    onChange: jest.fn()
  }

  const mockFilters = [
    {
      id: 'filter1',
      label: 'Filter 1',
      isActive: false,
      onClick: jest.fn(),
      count: 10
    },
    {
      id: 'filter2',
      label: 'Filter 2',
      isActive: true,
      onClick: jest.fn(),
      count: 5
    }
  ]

  const mockActions = [
    {
      id: 'action1',
      label: 'Action 1',
      onClick: jest.fn()
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      render(<UniversalToolbar variant="unified" testId="test-toolbar" />)
      expect(screen.getByTestId('test-toolbar')).toBeInTheDocument()
    })

    it('renders search component when search config provided', () => {
      render(
        <UniversalToolbar 
          variant="unified" 
          search={mockSearchConfig}
          testId="test-toolbar"
        />
      )
      expect(screen.getByPlaceholderText('Search test...')).toBeInTheDocument()
    })

    it('renders filter buttons when filters provided', () => {
      render(
        <UniversalToolbar 
          variant="unified" 
          filters={mockFilters}
          testId="test-toolbar"
        />
      )
      expect(screen.getByText('Filter 1')).toBeInTheDocument()
      expect(screen.getByText('Filter 2')).toBeInTheDocument()
    })

    it('renders action buttons when actions provided', () => {
      render(
        <UniversalToolbar 
          variant="unified" 
          actions={mockActions}
          testId="test-toolbar"
        />
      )
      expect(screen.getByText('Action 1')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('calls onChange when search input changes', async () => {
      const user = userEvent.setup()
      render(
        <UniversalToolbar 
          variant="unified" 
          search={mockSearchConfig}
          testId="test-toolbar"
        />
      )
      
      const searchInput = screen.getByPlaceholderText('Search test...')
      await user.type(searchInput, 'test query')
      
      expect(mockSearchConfig.onChange).toHaveBeenCalledWith('test query')
    })

    it('shows clear button when search has value', () => {
      const searchWithValue = { ...mockSearchConfig, value: 'test' }
      render(
        <UniversalToolbar 
          variant="unified" 
          search={searchWithValue}
          testId="test-toolbar"
        />
      )
      
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
    })

    it('clears search when clear button is clicked', async () => {
      const user = userEvent.setup()
      const searchWithValue = { ...mockSearchConfig, value: 'test' }
      
      render(
        <UniversalToolbar 
          variant="unified" 
          search={searchWithValue}
          testId="test-toolbar"
        />
      )
      
      const clearButton = screen.getByLabelText('Clear search')
      await user.click(clearButton)
      
      expect(mockSearchConfig.onChange).toHaveBeenCalledWith('')
    })
  })

  describe('Filter Functionality', () => {
    it('shows active state for active filters', () => {
      render(
        <UniversalToolbar 
          variant="unified" 
          filters={mockFilters}
          testId="test-toolbar"
        />
      )
      
      const activeFilter = screen.getByText('Filter 2')
      expect(activeFilter).toHaveAttribute('aria-pressed', 'true')
    })

    it('shows inactive state for inactive filters', () => {
      render(
        <UniversalToolbar 
          variant="unified" 
          filters={mockFilters}
          testId="test-toolbar"
        />
      )
      
      const inactiveFilter = screen.getByText('Filter 1')
      expect(inactiveFilter).toHaveAttribute('aria-pressed', 'false')
    })

    it('calls onClick when filter is clicked', async () => {
      const user = userEvent.setup()
      render(
        <UniversalToolbar 
          variant="unified" 
          filters={mockFilters}
          testId="test-toolbar"
        />
      )
      
      const filter1 = screen.getByText('Filter 1')
      await user.click(filter1)
      
      expect(mockFilters[0].onClick).toHaveBeenCalled()
    })

    it('displays filter counts correctly', () => {
      render(
        <UniversalToolbar 
          variant="unified" 
          filters={mockFilters}
          testId="test-toolbar"
        />
      )
      
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  describe('Bulk Actions Variant', () => {
    const bulkProps = createBulkActionsToolbar({
      selectedCount: 5,
      onBulkOk: jest.fn(),
      onBulkNoSeller: jest.fn(),
      onBulkNonRelated: jest.fn(),
      onClearSelection: jest.fn()
    })

    it('renders bulk actions toolbar correctly', () => {
      render(<UniversalToolbar {...bulkProps} testId="bulk-toolbar" />)
      expect(screen.getByText('5 selected')).toBeInTheDocument()
      expect(screen.getByText('Ok')).toBeInTheDocument()
      expect(screen.getByText('No Seller')).toBeInTheDocument()
      expect(screen.getByText('Non Related')).toBeInTheDocument()
    })

    it('calls bulk action handlers when buttons are clicked', async () => {
      const user = userEvent.setup()
      render(<UniversalToolbar {...bulkProps} testId="bulk-toolbar" />)
      
      const okButton = screen.getByText('Ok')
      await user.click(okButton)
      
      expect(bulkProps.actions[0].onClick).toHaveBeenCalled()
    })

    it('does not render when selectedCount is 0', () => {
      const emptyBulkProps = createBulkActionsToolbar({
        selectedCount: 0,
        onBulkOk: jest.fn(),
        onBulkNoSeller: jest.fn(),
        onBulkNonRelated: jest.fn(),
        onClearSelection: jest.fn()
      })
      
      const { container } = render(<UniversalToolbar {...emptyBulkProps} testId="bulk-toolbar" />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('User Bulk Actions Variant', () => {
    const userBulkProps = createUserBulkActionsToolbar({
      selectedCount: 3,
      totalCount: 10,
      onSelectAll: jest.fn(),
      onSelectNone: jest.fn(),
      onBulkToggleCreator: jest.fn(),
      onBulkExport: jest.fn()
    })

    it('renders user bulk actions correctly', () => {
      render(<UniversalToolbar {...userBulkProps} testId="user-bulk-toolbar" />)
      expect(screen.getByText('3 selected')).toBeInTheDocument()
      expect(screen.getByText('Toggle Creator')).toBeInTheDocument()
      expect(screen.getByText('Export CSV')).toBeInTheDocument()
    })

    it('calls selection handlers correctly', async () => {
      const user = userEvent.setup()
      render(<UniversalToolbar {...userBulkProps} testId="user-bulk-toolbar" />)
      
      // Test select all/none toggle
      const selectToggle = screen.getByTitle('Select all visible')
      await user.click(selectToggle)
      
      expect(userBulkProps.onSelectAll).toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('focuses search on "/" key press', async () => {
      render(
        <UniversalToolbar 
          variant="unified" 
          search={mockSearchConfig}
          keyboard={{ enabled: true }}
          testId="test-toolbar"
        />
      )
      
      const searchInput = screen.getByPlaceholderText('Search test...')
      
      // Simulate "/" key press
      fireEvent.keyDown(document, { key: '/' })
      
      await waitFor(() => {
        expect(searchInput).toHaveFocus()
      })
    })

    it('clears search on Escape key press', async () => {
      const searchWithValue = { ...mockSearchConfig, value: 'test' }
      render(
        <UniversalToolbar 
          variant="unified" 
          search={searchWithValue}
          keyboard={{ enabled: true }}
          testId="test-toolbar"
        />
      )
      
      const searchInput = screen.getByPlaceholderText('Search test...')
      searchInput.focus()
      
      // Simulate Escape key press
      fireEvent.keyDown(document, { key: 'Escape' })
      
      expect(mockSearchConfig.onChange).toHaveBeenCalledWith('')
    })
  })

  describe('Responsive Layout', () => {
    it('applies responsive classes correctly', () => {
      render(
        <UniversalToolbar 
          variant="unified" 
          layout="responsive"
          search={mockSearchConfig}
          filters={mockFilters}
          testId="test-toolbar"
        />
      )
      
      const toolbar = screen.getByTestId('test-toolbar')
      expect(toolbar).toBeInTheDocument()
      
      // Check that responsive layout classes are applied
      const searchContainer = screen.getByPlaceholderText('Search test...').closest('div')
      expect(searchContainer).toHaveClass('lg:flex-1')
    })
  })

  describe('Loading States', () => {
    it('disables interactions when loading', () => {
      render(
        <UniversalToolbar 
          variant="unified" 
          search={mockSearchConfig}
          filters={mockFilters}
          actions={mockActions}
          loading={true}
          testId="test-toolbar"
        />
      )
      
      const searchInput = screen.getByPlaceholderText('Search test...')
      const filterButton = screen.getByText('Filter 1')
      const actionButton = screen.getByText('Action 1')
      
      expect(searchInput).toBeDisabled()
      expect(filterButton).toBeDisabled()
      expect(actionButton).toBeDisabled()
    })
  })
})
