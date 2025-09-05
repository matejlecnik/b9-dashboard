import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Auth error:', error)
      redirect('/login')
      return
    }

    if (!user) {
      redirect('/login')
    } else {
      redirect('/categorization')
    }
  } catch (error) {
    console.error('HomePage error:', error)
    redirect('/login')
  }
}