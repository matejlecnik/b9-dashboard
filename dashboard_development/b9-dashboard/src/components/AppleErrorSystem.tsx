import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCw, X, Info, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Inline Error Component
interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
  variant?: 'error' | 'warning' | 'info';
}

export function InlineError({ 
  message, 
  onRetry, 
  className = '',
  variant = 'error' 
}: InlineErrorProps) {
  const variantClasses = {
    error: 'bg-red-50/80 border-red-200 text-red-800',
    warning: 'bg-yellow-50/80 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50/80 border-blue-200 text-blue-800',
  };

  const iconMap = {
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const Icon = iconMap[variant];

  return (
    <div className={cn(
      'glass-card flex items-center gap-3 p-4 rounded-lg border',
      variantClasses[variant],
      className
    )}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="ml-auto hover:bg-white/80"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Retry
        </Button>
      )}
    </div>
  );
}

// Toast Notification System
export interface ToastProps {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onDismiss: (id: string) => void;
}

export function Toast({ 
  id, 
  title, 
  message, 
  type, 
  onDismiss 
}: ToastProps) {
  const typeClasses = {
    success: 'bg-green-50/90 border-green-200 text-green-800',
    error: 'bg-red-50/90 border-red-200 text-red-800',
    warning: 'bg-yellow-50/90 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50/90 border-blue-200 text-blue-800',
  };

  const iconMap = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const Icon = iconMap[type];

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className={cn(
      'glass-card-strong max-w-sm p-4 rounded-lg border shadow-apple-strong',
      'transform transition-all duration-300 ease-in-out',
      'animate-in slide-in-from-right-full',
      typeClasses[type]
    )}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          {title && (
            <p className="font-medium text-sm mb-1">{title}</p>
          )}
          <p className="text-sm">{message}</p>
        </div>
        <button
          onClick={() => onDismiss(id)}
          className="flex-shrink-0 p-1 hover:bg-white/50 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Toast Container
interface ToastContainerProps {
  toasts: ToastProps[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

// Modal Dialog Error
interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: string;
  onRetry?: () => void;
}

export function ErrorModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  details, 
  onRetry 
}: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card-strong w-full max-w-md rounded-2xl shadow-apple-strong border border-white/20">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600 mb-4">{message}</p>
              {details && (
                <details className="mb-4">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    Technical Details
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-50/80 rounded-lg text-xs text-gray-600 overflow-auto">
                    {details}
                  </pre>
                </details>
              )}
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 glass-button"
            >
              Close
            </Button>
            {onRetry && (
              <Button
                onClick={onRetry}
                className="flex-1 bg-b9-pink hover:bg-b9-pink/90 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastProps, 'id' | 'onDismiss'>) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id, onDismiss: () => {} }]);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const toastProps = React.useMemo(() => 
    toasts.map(toast => ({ ...toast, onDismiss: dismissToast })),
    [toasts, dismissToast]
  );

  return {
    toasts: toastProps,
    addToast,
    dismissToast,
  };
}

// Error Boundary with Apple Styling
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class AppleErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ComponentType<{error?: Error, retry: () => void}> }>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{ fallback?: React.ComponentType<{error?: Error, retry: () => void}> }>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const retry = () => this.setState({ hasError: false, error: undefined });
      
      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return <Fallback error={this.state.error} retry={retry} />;
      }

      return (
        <div className="glass-card p-8 rounded-2xl max-w-md mx-auto mt-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-600 mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <Button
              onClick={retry}
              className="bg-b9-pink hover:bg-b9-pink/90 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}