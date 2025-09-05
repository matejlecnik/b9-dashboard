// import { createClient } from '@/utils/supabase/server'
// import { redirect } from 'next/navigation'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TEMPORARY: Bypass authentication for development/testing
  // TODO: Re-enable authentication once testing is complete
  console.log('Dashboard layout: Authentication bypassed for development')
  return <>{children}</>
  
  /* ORIGINAL AUTH CODE - COMMENTED OUT FOR TESTING
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Dashboard auth error:', error)
      redirect('/login')
      return
    }

    if (!user) {
      redirect('/login')
      return
    }

    return <>{children}</>
  } catch (error) {
    console.error('Dashboard layout error:', error)
    redirect('/login')
  }
  */
}
