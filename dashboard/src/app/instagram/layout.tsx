'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Hash, TrendingUp, BarChart } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  {
    name: 'Creator Review',
    href: '/instagram/creator-review',
    icon: Users,
    description: 'Review and approve creators'
  },
  {
    name: 'Niching',
    href: '/instagram/niching',
    icon: Hash,
    description: 'Categorize creators into niches'
  },
  {
    name: 'Viral Content',
    href: '/instagram/viral-content',
    icon: TrendingUp,
    description: 'Track high-performing content'
  },
  {
    name: 'Analytics',
    href: '/instagram/analytics',
    icon: BarChart,
    description: 'Creator performance metrics'
  },
]

export default function InstagramLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Instagram Dashboard</h1>
          </div>

          <nav className="flex gap-2 border-b border-gray-200 pb-4">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg'
                      : 'bg-white/80 hover:bg-white text-gray-700 hover:shadow-md'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <main>{children}</main>
        </div>
      </div>
    </div>
  )
}