import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { 
  UniversalErrorBoundary, 
  ErrorBoundary, 
  SimpleErrorBoundary, 
  AppleErrorBoundary,
  ComponentErrorBoundary
} from '../UniversalErrorBoundary'

// Test component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>Working component</div>
}

describe('UniversalErrorBoundary', () => {
  // Suppress console.error during tests
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  describe('Basic Error Handling', () => {
    it('renders children when no error occurs', () => {
      render(
        <UniversalErrorBoundary variant="full">
          <ThrowError shouldThrow={false} />
        </UniversalErrorBoundary>
      )
      expect(screen.getByText('Working component')).toBeInTheDocument()
    })

    it('catches and displays errors', () => {
      render(
        <UniversalErrorBoundary variant="full" componentName="TestComponent">
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      expect(screen.getByText('Application Error')).toBeInTheDocument()
      expect(screen.getByText(/TestComponent.*encountered an error/)).toBeInTheDocument()
    })

    it('calls onError callback when error occurs', () => {
      const onError = jest.fn()
      render(
        <UniversalErrorBoundary variant="full" onError={onError}>
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      )
    })
  })

  describe('Variant Rendering', () => {
    it('renders full variant correctly', () => {
      render(
        <UniversalErrorBoundary variant="full">
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      expect(screen.getByText('Application Error')).toBeInTheDocument()
      expect(screen.getByText('Retry Component')).toBeInTheDocument()
      expect(screen.getByText('Reload Page')).toBeInTheDocument()
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
    })

    it('renders simple variant correctly', () => {
      render(
        <UniversalErrorBoundary variant="simple" componentName="TestComponent">
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      expect(screen.getByText('TestComponent Error')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
      expect(screen.getByText('Go Home')).toBeInTheDocument()
    })

    it('renders apple variant correctly', () => {
      render(
        <UniversalErrorBoundary variant="apple">
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    it('renders minimal variant correctly', () => {
      render(
        <UniversalErrorBoundary variant="minimal">
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  describe('Retry Functionality', () => {
    it('retries component when retry button is clicked', async () => {
      const user = userEvent.setup()
      
      const { rerender } = render(
        <UniversalErrorBoundary variant="simple">
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      
      expect(screen.getByText('Try Again')).toBeInTheDocument()
      
      // Click retry button
      await user.click(screen.getByText('Try Again'))
      
      // Re-render with working component
      rerender(
        <UniversalErrorBoundary variant="simple">
          <ThrowError shouldThrow={false} />
        </UniversalErrorBoundary>
      )
      
      expect(screen.getByText('Working component')).toBeInTheDocument()
    })

    it('tracks retry count correctly', async () => {
      const user = userEvent.setup()
      
      render(
        <UniversalErrorBoundary variant="full">
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      
      // Click retry button
      await user.click(screen.getByText('Retry Component'))
      
      // Should show retry attempt counter
      expect(screen.getByText('Retry attempts: 1')).toBeInTheDocument()
    })
  })

  describe('Copy Functionality', () => {
    // Mock clipboard API
    const mockClipboard = {
      writeText: jest.fn(() => Promise.resolve())
    }
    
    beforeAll(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true
      })
    })

    it('copies error details when copy button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <UniversalErrorBoundary variant="full" componentName="TestComponent">
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      
      const copyButton = screen.getByText('Copy error details for support')
      await user.click(copyButton)
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Component: TestComponent')
      )
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Error: Test error message')
      )
    })

    it('shows copied confirmation', async () => {
      const user = userEvent.setup()
      
      render(
        <UniversalErrorBoundary variant="apple">
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      
      const copyButton = screen.getByText('Copy Details')
      await user.click(copyButton)
      
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })
  })

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div>Custom error fallback</div>
      
      render(
        <UniversalErrorBoundary variant="full" fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      
      expect(screen.getByText('Custom error fallback')).toBeInTheDocument()
      expect(screen.queryByText('Application Error')).not.toBeInTheDocument()
    })
  })

  describe('Backward Compatibility Components', () => {
    it('ErrorBoundary renders as full variant', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      expect(screen.getByText('Application Error')).toBeInTheDocument()
    })

    it('SimpleErrorBoundary renders as simple variant', () => {
      render(
        <SimpleErrorBoundary componentName="TestComponent">
          <ThrowError shouldThrow={true} />
        </SimpleErrorBoundary>
      )
      expect(screen.getByText('TestComponent Error')).toBeInTheDocument()
    })

    it('AppleErrorBoundary renders as apple variant', () => {
      render(
        <AppleErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AppleErrorBoundary>
      )
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument()
    })

    it('ComponentErrorBoundary renders with component name', () => {
      render(
        <ComponentErrorBoundary componentName="TestComponent">
          <ThrowError shouldThrow={true} />
        </ComponentErrorBoundary>
      )
      expect(screen.getByText('TestComponent Error')).toBeInTheDocument()
    })
  })

  describe('Error Details', () => {
    it('shows error message in full variant', () => {
      render(
        <UniversalErrorBoundary variant="full" showDetails={true}>
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('hides error details when showDetails is false', () => {
      render(
        <UniversalErrorBoundary variant="full" showDetails={false}>
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      expect(screen.queryByText('Test error message')).not.toBeInTheDocument()
    })
  })

  describe('Navigation Actions', () => {
    // Mock window.location
    const mockLocation = {
      href: '',
      reload: jest.fn()
    }
    
    beforeAll(() => {
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      })
    })

    it('navigates to dashboard when Go to Dashboard is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <UniversalErrorBoundary variant="full">
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      
      const dashboardButton = screen.getByText('Go to Dashboard')
      await user.click(dashboardButton)
      
      expect(mockLocation.href).toBe('/')
    })

    it('reloads page when Reload Page is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <UniversalErrorBoundary variant="full">
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      
      const reloadButton = screen.getByText('Reload Page')
      await user.click(reloadButton)
      
      expect(mockLocation.reload).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(
        <UniversalErrorBoundary variant="full">
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('Application Error')
    })

    it('has accessible button labels', () => {
      render(
        <UniversalErrorBoundary variant="simple">
          <ThrowError shouldThrow={true} />
        </UniversalErrorBoundary>
      )
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName()
      })
    })
  })
})
