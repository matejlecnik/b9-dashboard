import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

export default function HomePage() {
  // This page should not be reached due to middleware redirects
  // Middleware will redirect:
  // - Unauthenticated users to /login
  // - Authenticated users to /dashboards
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className={`animate-spin ${designSystem.borders.radius.full} h-8 w-8 border-b-2 border-b9-pink mx-auto`}></div>
        <p className={cn("mt-4", designSystem.typography.color.tertiary)}>Redirecting...</p>
      </div>
    </div>
  )
}