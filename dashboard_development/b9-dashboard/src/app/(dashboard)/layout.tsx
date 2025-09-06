import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const supabase = await createClient()

    // Check if Supabase client is available
    if (!supabase) {
      console.error('Supabase client not available in dashboard layout')
      redirect('/login')
      return <>{children}</>
    }

    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Dashboard auth error:', error)
      redirect('/login')
      return <>{children}</>
    }

    if (!user) {
      redirect('/login')
      return <>{children}</>
    }

    return <>{children}</>
  } catch (error) {
    console.error('Dashboard layout error:', error)
    redirect('/login')
    return <>{children}</>
  }
}
