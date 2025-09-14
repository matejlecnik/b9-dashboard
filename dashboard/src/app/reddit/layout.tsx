import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reddit Dashboard - B9 Agency',
  description: 'Reddit marketing analytics platform for OnlyFans creator audience discovery',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function RedditDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Temporary bypass for development - remove once authentication is fixed
  const isDevelopment = process.env.NODE_ENV === 'development'
  const bypassAuth = process.env.BYPASS_AUTH === 'true'
  
  if (isDevelopment || bypassAuth) {
    console.log('⚠️ DEVELOPMENT MODE: Bypassing authentication for testing data loading')
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
