import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

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
            <h2 className={cn("text-2xl font-bold mb-2", designSystem.typography.color.primary)}>Instagram Dashboard Error</h2>
            <p className={cn(designSystem.typography.color.tertiary)}>Something went wrong. Please refresh the page.</p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}