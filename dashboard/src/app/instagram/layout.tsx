import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

export default function InstagramLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Instagram Dashboard Error</h2>
            <p className="text-gray-600">Something went wrong. Please refresh the page.</p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}