'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  HelpCircle,
  X,
  Keyboard,
  Search,
  Filter,
  Download,
  RefreshCw,
  Home,
  Tags
} from 'lucide-react'
import { formatShortcut, getModifierKey, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts'

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[]
}

export function KeyboardShortcutsHelp({ shortcuts }: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General'
    if (!acc[category]) acc[category] = []
    acc[category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  const getIconForCategory = (category: string) => {
    switch (category.toLowerCase()) {
      case 'navigation':
        return <Home className="h-4 w-4 text-blue-600" />
      case 'search':
        return <Search className="h-4 w-4 text-green-600" />
      case 'filtering':
        return <Filter className="h-4 w-4 text-purple-600" />
      case 'actions':
        return <Tags className="h-4 w-4 text-orange-600" />
      case 'export':
        return <Download className="h-4 w-4 text-red-600" />
      case 'system':
        return <RefreshCw className="h-4 w-4 text-gray-600" />
      default:
        return <Keyboard className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <>
      {/* Help Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-white shadow-lg hover:shadow-xl border-2 hover:border-b9-pink"
        title="Keyboard Shortcuts (? to toggle)"
      >
        <Keyboard className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Shortcuts</span>
        <Badge variant="secondary" className="ml-1 sm:ml-2 bg-b9-pink text-white text-xs">
          ?
        </Badge>
      </Button>

      {/* Shortcuts Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-black flex items-center">
                    <Keyboard className="h-5 w-5 mr-2 text-b9-pink" />
                    Keyboard Shortcuts
                  </CardTitle>
                  <CardDescription>
                    Power user shortcuts to navigate and manage efficiently
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="p-2 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[60vh]">
              <div className="p-6 space-y-6">
                {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      {getIconForCategory(category)}
                      <h3 className="text-lg font-semibold text-black">
                        {category}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {categoryShortcuts.length} shortcuts
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {categoryShortcuts.map((shortcut, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm text-black">
                              {shortcut.description}
                            </div>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className="ml-2 font-mono text-xs bg-gray-100 text-gray-700 border"
                          >
                            {formatShortcut(shortcut)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">Pro Tips:</p>
                    <p>• Shortcuts work from anywhere in the dashboard</p>
                    <p>• Press <Badge variant="outline" className="mx-1 text-xs">?</Badge> anytime to view this help</p>
                    <p>• Using {getModifierKey()} key for compatibility across platforms</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      B9 Agency Dashboard v1.0
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
