import { redirect } from 'next/navigation'

export default function DashboardRoot() {
  // Perform a server-side redirect to the main dashboard page.
  redirect('/subreddit-review')
}
