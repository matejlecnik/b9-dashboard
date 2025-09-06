'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Tags, 
  PenTool, 
  Users, 
  ChevronLeft,
  ChevronRight,
  Activity,
  FileText,
  FolderTree
} from 'lucide-react'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  const navigationItems = [
    { title: 'Subreddit Review', href: '/subreddit-review', icon: Tags },
    { title: 'Categorization', href: '/categorization', icon: FolderTree },
    { title: 'Posting', href: '/posting', icon: PenTool },
    { title: 'User Analysis', href: '/user-analysis', icon: Users },
    { title: 'Post Analysis', href: '/post-analysis', icon: FileText },
    { title: 'Scraper', href: '/scraper', icon: Activity }
  ]

  const isActive = (href: string) => {
    if (href === '/subreddit-review') {
      return pathname === '/' || pathname === '/subreddit-review'
    }
    return pathname.startsWith(href)
  }

  return (
    <div 
      className={`glass-sidebar sticky top-3 my-3 ml-3 transition-all duration-500 ease-in-out flex flex-col overflow-hidden rounded-2xl z-30 ${
        isCollapsed ? 'w-16 lg:w-20' : 'w-64 lg:w-72'
      } md:block ${isCollapsed ? 'hidden sm:flex' : ''}`}
      style={{
        height: 'calc(100vh - 1.5rem)',
        background: 'linear-gradient(180deg, rgba(248,249,251,0.75) 0%, rgba(232,234,238,0.65) 100%)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.04)',
        border: '1px solid rgba(190, 195, 200, 0.5)'
      }}
    >
      {/* Local Reddit SVG Icon (same as /dashboards) */}
      {null}
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          {isCollapsed ? (
            <div className="w-10 h-10 flex items-center justify-center">
              <div className="w-8 h-8 rounded-xl bg-white/70 backdrop-blur-md ring-1 ring-inset ring-black/10 flex items-center justify-center">
                <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z"/>
                </svg>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/70 backdrop-blur-md ring-1 ring-inset ring-black/10 flex items-center justify-center">
                <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Reddit Dashboard</h1>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="glass-button p-2 h-9 w-9 rounded-lg"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-700" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-700" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2" aria-label="Primary" data-testid="sidebar-nav">
        {/* Links */}
        <div className="space-y-1.5">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} aria-label={item.title}>
                <div className={`
                  relative flex items-center px-3 py-2.5 rounded-xl transition-all duration-300 group cursor-pointer transform hover:scale-105 active:scale-95
                  ${active 
                    ? 'bg-b9-pink/15 text-b9-pink ring-1 ring-inset ring-b9-pink/25 shadow-apple' 
                    : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-apple-strong'
                  }
                  ${isCollapsed ? 'justify-center' : 'justify-start'}
                `} title={isCollapsed ? item.title : undefined}>
                  <div className="flex items-center">
                    <Icon className={`h-5 w-5 ${active ? 'text-b9-pink' : ''} ${isCollapsed ? '' : 'mr-3'}`} aria-hidden="true" />
                    {!isCollapsed && (
                      <div>
                        <div className="font-medium text-sm">{item.title}</div>
                      </div>
                    )}
                  </div>
                  {active && (
                    <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-b9-pink" aria-hidden="true"></span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Back to Dashboards at bottom */}
      <div className="px-3 py-3 border-t border-black/10">
        <Link href="/dashboards" aria-label="Back to Dashboards">
          <div className={`
            flex items-center px-3 py-2.5 rounded-xl transition-all duration-300 group cursor-pointer transform hover:scale-105 active:scale-95
            bg-white/70 hover:bg-white/90 text-gray-600 hover:text-gray-800 ring-1 ring-inset ring-white/30 hover:shadow-apple-strong
            ${isCollapsed ? 'justify-center' : 'justify-start'}
          `} title={isCollapsed ? 'Back to Dashboards' : undefined}>
            <ChevronLeft className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} aria-hidden="true" />
            {!isCollapsed && (
              <div className="font-medium text-sm">Back to Dashboards</div>
            )}
          </div>
        </Link>
      </div>

      {/* Footer removed */}
    </div>
  )
}
