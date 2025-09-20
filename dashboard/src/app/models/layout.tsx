import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Models Dashboard - B9 Agency',
  description: 'Manage model profiles and tag preferences across platforms',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ModelsDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Temporary bypass for development - remove once authentication is fixed
  const isDevelopment = process.env.NODE_ENV === 'development'
  const bypassAuth = process.env.BYPASS_AUTH === 'true'

  if (isDevelopment || bypassAuth) {
    console.log('⚠️ DEVELOPMENT MODE: Bypassing authentication for models dashboard')
    return <>{children}</>
  }

  try {
    const { user, error } = await getAuthenticatedUser()

    if (error || !user) {
      redirect('/login')
      return null
    }

    return <>{children}</>
  } catch (authError) {
    console.error('Authentication layout error:', authError)
    redirect('/login')
    return null
  }
}