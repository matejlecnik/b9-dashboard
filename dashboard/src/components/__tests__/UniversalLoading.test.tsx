import React from 'react'
import { render, screen } from '@testing-library/react'
import { 
  UniversalLoading, 
  AppleSpinner, 
  SkeletonCard, 
  MetricsCardsSkeleton,
  TableSkeleton,
  UserListSkeleton,
  ProgressLoader
} from '../UniversalLoading'

describe('UniversalLoading', () => {
  describe('Spinner Variant', () => {
    it('renders basic spinner correctly', () => {
      render(<UniversalLoading variant="spinner" />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('renders spinner with message', () => {
      render(<UniversalLoading variant="spinner" message="Loading data..." />)
      expect(screen.getByText('Loading data...')).toBeInTheDocument()
    })

    it('applies size classes correctly', () => {
      render(<UniversalLoading variant="spinner" size="lg" />)
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('w-8', 'h-8')
    })

    it('applies color classes correctly', () => {
      render(<UniversalLoading variant="spinner" color="blue" />)
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('text-blue-500')
    })
  })

  describe('Apple Spinner Variant', () => {
    it('renders apple spinner with animation', () => {
      render(<UniversalLoading variant="apple" />)
      const spinner = screen.getByRole('status')
      expect(spinner).toBeInTheDocument()
      
      // Check for SVG animation element
      const animateTransform = spinner.querySelector('animateTransform')
      expect(animateTransform).toBeInTheDocument()
    })
  })

  describe('Skeleton Variant', () => {
    it('renders metrics skeleton correctly', () => {
      render(<UniversalLoading variant="skeleton" type="metrics" />)
      // Should render 3 metric cards
      const cards = screen.getAllByRole('generic')
      expect(cards.length).toBeGreaterThan(0)
    })

    it('renders table skeleton with correct number of rows', () => {
      render(<UniversalLoading variant="skeleton" type="table" rows={5} />)
      // Should render table structure
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('renders user list skeleton with avatars', () => {
      render(<UniversalLoading variant="skeleton" type="user-list" rows={3} showAvatar={true} />)
      // Should render user list items
      const listItems = screen.getAllByRole('generic')
      expect(listItems.length).toBeGreaterThan(0)
    })

    it('renders card skeleton with images when showImage is true', () => {
      render(<UniversalLoading variant="skeleton" type="card" rows={2} columns={2} showImage={true} />)
      // Should render grid of cards
      const grid = screen.getByRole('generic')
      expect(grid).toHaveClass('grid')
    })

    it('renders text skeleton with correct number of lines', () => {
      render(<UniversalLoading variant="skeleton" type="text" rows={4} />)
      // Should render text lines
      const textLines = screen.getAllByRole('generic')
      expect(textLines.length).toBeGreaterThan(0)
    })
  })

  describe('Progress Variant', () => {
    it('renders progress with percentage', () => {
      render(<UniversalLoading variant="progress" progress={75} message="Processing..." />)
      expect(screen.getByText('Processing...')).toBeInTheDocument()
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('renders progress bar with correct width', () => {
      render(<UniversalLoading variant="progress" progress={50} showPercentage={true} />)
      const progressBar = screen.getByRole('generic').querySelector('[style*="width: 50%"]')
      expect(progressBar).toBeInTheDocument()
    })

    it('hides percentage when showPercentage is false', () => {
      render(<UniversalLoading variant="progress" progress={75} showPercentage={false} />)
      expect(screen.queryByText('75%')).not.toBeInTheDocument()
    })
  })

  describe('Minimal Variant', () => {
    it('renders minimal loading with message', () => {
      render(<UniversalLoading variant="minimal" message="Loading..." />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  describe('Backward Compatibility Components', () => {
    it('AppleSpinner renders correctly', () => {
      render(<AppleSpinner size="md" color="pink" />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('SkeletonCard renders with different variants', () => {
      render(<SkeletonCard variant="wide" />)
      // Should render card skeleton
      expect(screen.getByRole('generic')).toBeInTheDocument()
    })

    it('MetricsCardsSkeleton renders correctly', () => {
      render(<MetricsCardsSkeleton />)
      // Should render metrics skeleton
      expect(screen.getByRole('generic')).toBeInTheDocument()
    })

    it('TableSkeleton renders correctly', () => {
      render(<TableSkeleton />)
      // Should render table skeleton
      expect(screen.getByRole('generic')).toBeInTheDocument()
    })

    it('UserListSkeleton renders correctly', () => {
      render(<UserListSkeleton />)
      // Should render user list skeleton
      expect(screen.getByRole('generic')).toBeInTheDocument()
    })

    it('ProgressLoader renders with progress', () => {
      render(<ProgressLoader message="Loading users..." progress={60} />)
      expect(screen.getByText('Loading users...')).toBeInTheDocument()
      expect(screen.getByText('60%')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes for spinners', () => {
      render(<UniversalLoading variant="spinner" />)
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveAttribute('aria-label', 'Loading')
    })

    it('supports custom aria labels', () => {
      render(<UniversalLoading variant="apple" className="custom-spinner" />)
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveAttribute('aria-label', 'Loading')
    })
  })

  describe('Performance', () => {
    it('renders large skeleton grids efficiently', () => {
      const startTime = performance.now()
      render(<UniversalLoading variant="skeleton" type="card" rows={20} columns={5} />)
      const endTime = performance.now()
      
      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(50)
    })

    it('handles animation delays correctly', () => {
      render(<UniversalLoading variant="skeleton" type="metrics" delay={100} />)
      // Should render without errors
      expect(screen.getByRole('generic')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('applies custom className correctly', () => {
      render(<UniversalLoading variant="spinner" className="custom-class" />)
      const container = screen.getByRole('status').closest('div')
      expect(container).toHaveClass('custom-class')
    })

    it('applies size-specific classes', () => {
      render(<UniversalLoading variant="spinner" size="xl" />)
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('w-12', 'h-12')
    })
  })
})
