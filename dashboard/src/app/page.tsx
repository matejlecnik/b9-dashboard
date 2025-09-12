export default function HomePage() {
  // This page should not be reached due to middleware redirects
  // Middleware will redirect:
  // - Unauthenticated users to /login
  // - Authenticated users to /dashboards
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-b9-pink mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}