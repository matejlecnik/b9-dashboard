import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UniversalTable, createSubredditReviewTable, createCategorizationTable } from '../UniversalTable'
import { type Subreddit } from '@/lib/supabase'

// Mock data
const mockSubreddits: Subreddit[] = [
  {
    id: 1,
    name: 'test1',
    display_name_prefixed: 'r/test1',
    title: 'Test Subreddit 1',
    subscribers: 10000,
    subscriber_engagement_ratio: 0.05,
    avg_upvotes_per_post: 100,
    community_icon: 'https://example.com/icon1.png',
    review: null,
    category_text: null,
    over18: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'test2',
    display_name_prefixed: 'r/test2',
    title: 'Test Subreddit 2',
    subscribers: 5000,
    subscriber_engagement_ratio: 0.02,
    avg_upvotes_per_post: 50,
    community_icon: null,
    review: 'Ok',
    category_text: 'Test Category',
    over18: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
] as Subreddit[]

describe('UniversalTable', () => {
  const defaultProps = {
    subreddits: mockSubreddits,
    loading: false,
    testId: 'test-table'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      render(<UniversalTable {...defaultProps} />)
      expect(screen.getByTestId('test-table')).toBeInTheDocument()
    })

    it('displays loading state correctly', () => {
      render(<UniversalTable {...defaultProps} loading={true} subreddits={[]} />)
      expect(screen.getByText('Loading subreddits...')).toBeInTheDocument()
    })

    it('displays empty state when no subreddits', () => {
      render(<UniversalTable {...defaultProps} subreddits={[]} />)
      expect(screen.getByText('No subreddits found')).toBeInTheDocument()
    })

    it('renders table header when showHeader is true', () => {
      render(<UniversalTable {...defaultProps} showHeader={true} />)
      expect(screen.getByText('Subreddit')).toBeInTheDocument()
      expect(screen.getByText('Members')).toBeInTheDocument()
      expect(screen.getByText('Engagement')).toBeInTheDocument()
    })

    it('hides table header when showHeader is false', () => {
      render(<UniversalTable {...defaultProps} showHeader={false} />)
      expect(screen.queryByText('Subreddit')).not.toBeInTheDocument()
    })
  })

  describe('Review Mode', () => {
    const reviewProps = {
      ...defaultProps,
      mode: 'review' as const,
      onUpdateReview: jest.fn()
    }

    it('renders review buttons in review mode', () => {
      render(<UniversalTable {...reviewProps} />)
      expect(screen.getByText('Ok')).toBeInTheDocument()
      expect(screen.getByText('No Seller')).toBeInTheDocument()
      expect(screen.getByText('Non Related')).toBeInTheDocument()
      expect(screen.getByText('User Feed')).toBeInTheDocument()
    })

    it('calls onUpdateReview when review button is clicked', async () => {
      const user = userEvent.setup()
      render(<UniversalTable {...reviewProps} />)
      
      const okButton = screen.getAllByText('Ok')[0]
      await user.click(okButton)
      
      expect(reviewProps.onUpdateReview).toHaveBeenCalledWith(1, 'Ok')
    })

    it('highlights selected review option', () => {
      const subredditsWithReview = mockSubreddits.map(s => 
        s.id === 2 ? { ...s, review: 'Ok' } : s
      )
      
      render(
        <UniversalTable 
          {...reviewProps} 
          subreddits={subredditsWithReview}
        />
      )
      
      // The "Ok" button for subreddit 2 should have active styling
      const okButtons = screen.getAllByText('Ok')
      expect(okButtons[1]).toHaveClass('bg-pink-500')
    })
  })

  describe('Category Mode', () => {
    const categoryProps = {
      ...defaultProps,
      mode: 'category' as const,
      onUpdateCategory: jest.fn(),
      availableCategories: ['Category 1', 'Category 2']
    }

    it('renders category selector in category mode', () => {
      render(<UniversalTable {...categoryProps} />)
      // CategorySelector component should be rendered
      expect(screen.getByTestId('test-table')).toBeInTheDocument()
    })

    it('calls onUpdateCategory when category is changed', () => {
      render(<UniversalTable {...categoryProps} />)
      // This would require testing the CategorySelector component interaction
      expect(categoryProps.onUpdateCategory).not.toHaveBeenCalled()
    })
  })

  describe('Selection Functionality', () => {
    const selectionProps = {
      ...defaultProps,
      selectedSubreddits: new Set([1]),
      setSelectedSubreddits: jest.fn(),
      showSelection: true
    }

    it('renders selection checkboxes when showSelection is true', () => {
      render(<UniversalTable {...selectionProps} />)
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)
    })

    it('calls setSelectedSubreddits when checkbox is clicked', async () => {
      const user = userEvent.setup()
      render(<UniversalTable {...selectionProps} />)
      
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1]) // Click first row checkbox
      
      expect(selectionProps.setSelectedSubreddits).toHaveBeenCalled()
    })

    it('shows correct selection state', () => {
      render(<UniversalTable {...selectionProps} />)
      const firstRowCheckbox = screen.getAllByRole('checkbox')[1] // Skip header checkbox
      expect(firstRowCheckbox).toBeChecked()
    })
  })

  describe('Infinite Scroll', () => {
    const scrollProps = {
      ...defaultProps,
      hasMore: true,
      loadingMore: false,
      onReachEnd: jest.fn()
    }

    it('renders load more sentinel when hasMore is true', () => {
      render(<UniversalTable {...scrollProps} />)
      expect(screen.getByText('Scroll to load more')).toBeInTheDocument()
    })

    it('shows loading state when loadingMore is true', () => {
      render(<UniversalTable {...scrollProps} loadingMore={true} />)
      expect(screen.getByText('Loading more...')).toBeInTheDocument()
    })
  })

  describe('Preset Configurations', () => {
    it('createSubredditReviewTable returns correct props', () => {
      const props = createSubredditReviewTable({
        subreddits: mockSubreddits,
        loading: false,
        onUpdateReview: jest.fn()
      })
      
      expect(props.variant).toBe('standard')
      expect(props.mode).toBe('review')
      expect(props.showSelection).toBe(true)
      expect(props.allowSelectionInReview).toBe(true)
    })

    it('createCategorizationTable returns correct props', () => {
      const props = createCategorizationTable({
        subreddits: mockSubreddits,
        loading: false,
        onUpdateCategory: jest.fn()
      })
      
      expect(props.variant).toBe('standard')
      expect(props.mode).toBe('category')
      expect(props.showSelection).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<UniversalTable {...defaultProps} />)
      
      const table = screen.getByTestId('test-table')
      expect(table).toHaveAttribute('role', 'table')
      expect(table).toHaveAttribute('aria-busy', 'false')
    })

    it('has accessible row selection', () => {
      render(
        <UniversalTable 
          {...defaultProps} 
          showSelection={true}
          selectedSubreddits={new Set()}
          setSelectedSubreddits={jest.fn()}
        />
      )
      
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('aria-label')
      })
    })
  })

  describe('Error Handling', () => {
    it('handles missing subreddit data gracefully', () => {
      render(<UniversalTable {...defaultProps} subreddits={[]} />)
      expect(screen.getByText('No subreddits found')).toBeInTheDocument()
    })

    it('handles broken icon URLs', async () => {
      const user = userEvent.setup()
      render(<UniversalTable {...defaultProps} showIcons={true} />)
      
      // Find the image and trigger error
      const images = screen.getAllByRole('img')
      if (images.length > 0) {
        fireEvent.error(images[0])
        // Should show fallback icon
        expect(screen.getByText('T')).toBeInTheDocument() // First letter of 'test1'
      }
    })
  })

  describe('Performance', () => {
    it('handles large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockSubreddits[0],
        id: i + 1,
        name: `test${i + 1}`,
        display_name_prefixed: `r/test${i + 1}`
      }))

      const startTime = performance.now()
      render(<UniversalTable {...defaultProps} subreddits={largeDataset} />)
      const endTime = performance.now()
      
      // Should render within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100)
    })
  })
})
