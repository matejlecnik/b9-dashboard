
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

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
  try {
    const { user, error } = await getAuthenticatedUser()

    if (error || !user) {
      redirect('/login')
      return null
    }

    return <>{children}</>
  } catch (authError) {
    logger.error('Authentication layout error:', authError)
    redirect('/login')
    return null
  }
}