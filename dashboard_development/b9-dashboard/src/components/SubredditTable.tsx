'use client'

import { useState, memo } from 'react'
import Image from 'next/image'
import { type Subreddit } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { CategorySelector } from '@/components/CategorySelector'
import { ChevronUp, ChevronDown, ChevronsUpDown, BookOpen, X } from 'lucide-react'

interface SubredditTableProps {
  subreddits: Subreddit[]
  selectedSubreddits: Set<number>
  setSelectedSubreddits: (selected: Set<number>) => void
  onUpdateCategory: (id: number, categoryText: string) => void
  onBulkUpdateCategory: (categoryText: string) => void
  loading: boolean
  mode?: 'review' | 'category' // Add mode to distinguish between review and category pages
}

const SubredditTable = memo(function SubredditTable({
  subreddits,
  selectedSubreddits,
  setSelectedSubreddits,
  onUpdateCategory,
  onBulkUpdateCategory,
  loading,
  mode = 'category'
}: SubredditTableProps) {
  const [sortField, setSortField] = useState<keyof Subreddit>('avg_upvotes_per_post')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [rulesModal, setRulesModal] = useState<{ isOpen: boolean; subreddit: Subreddit | null }>({
    isOpen: false,
    subreddit: null
  })
  const [brokenIcons, setBrokenIcons] = useState<Set<number>>(new Set())

  const parseRulesDataSafely = (rulesData?: unknown): Array<{ short_name?: string; description?: string; description_html?: string }> => {
    if (!rulesData) return []
    try {
      if (Array.isArray(rulesData)) return rulesData
      if (typeof rulesData === 'object' && rulesData !== null) {
        const maybeRules = (rulesData as { rules?: unknown }).rules
        if (Array.isArray(maybeRules)) return maybeRules as Array<{ short_name?: string; description?: string; description_html?: string }>
      }
      if (typeof rulesData === 'string') {
        const parsed = JSON.parse(rulesData)
        if (Array.isArray(parsed)) return parsed
        const maybeParsedRules = (parsed as { rules?: unknown }).rules
        if (parsed && Array.isArray(maybeParsedRules)) return maybeParsedRules as Array<{ short_name?: string; description?: string; description_html?: string }>
        return []
      }
    } catch {
      return []
    }
    return []
  }

  // Handle individual checkbox selection
  const handleSelect = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedSubreddits)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedSubreddits(newSelected)
  }

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSubreddits(new Set(subreddits.map(sub => sub.id)))
    } else {
      setSelectedSubreddits(new Set())
    }
  }

  // Handle sorting
  const handleSort = (field: keyof Subreddit) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Sort subreddits
  const sortedSubreddits = [...subreddits].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    
    // Handle null/undefined values
    if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1
    if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1
    
    let comparison = 0
    if (aVal < bVal) comparison = -1
    if (aVal > bVal) comparison = 1
    
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const formatPercentage = (ratio: number | null) => {
    if (ratio === null || ratio === undefined) return 'N/A'
    return `${(ratio * 100).toFixed(2)}%`
  }

  // Generate a color based on subreddit name for consistent placeholder avatars
  const getSubredditColor = (name: string) => {
    const colors = [
      '#FF8395', // B9 Pink
      '#6366F1', // Indigo
      '#8B5CF6', // Violet  
      '#EC4899', // Pink
      '#F59E0B', // Amber
      '#10B981', // Emerald
      '#3B82F6', // Blue
      '#EF4444', // Red
      '#84CC16', // Lime
      '#F97316'  // Orange
    ]
    
    // Simple hash function to get consistent color
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  // Get initials from subreddit name for placeholder
  const getSubredditInitials = (name: string) => {
    // Remove r/ prefix and get first 2 characters
    const cleanName = name.replace(/^r\//, '').replace(/^u\//, '')
    return cleanName.substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-b9-pink"></div>
        <span className="ml-2 text-muted-foreground">Loading subreddits...</span>
      </div>
    )
  }

  if (subreddits.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          All subreddits categorized!
        </h3>
        <p className="text-muted-foreground">
          Great job! All discovered subreddits have been reviewed and categorized.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Action Controls */}
      {selectedSubreddits.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-b9-pink text-white">
                {selectedSubreddits.size} selected
              </Badge>
              {mode === 'review' ? (
                <div className="flex items-center space-x-2">
                  <Button size="sm" onClick={() => onBulkUpdateCategory('Ok')} className="bg-green-600 hover:bg-green-700 text-white">
                    Mark as Ok
                  </Button>
                  <Button size="sm" onClick={() => onBulkUpdateCategory('No Seller')} className="bg-red-600 hover:bg-red-700 text-white">
                    No Seller
                  </Button>
                  <Button size="sm" onClick={() => onBulkUpdateCategory('Non Related')} className="bg-gray-600 hover:bg-gray-700 text-white">
                    Non Related
                  </Button>
                </div>
              ) : (
                <CategorySelector
                  subredditId={0}
                  currentCategory={null}
                  onUpdateCategory={(_, categoryText) => onBulkUpdateCategory(categoryText)}
                  compact={true}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto max-h-[calc(100vh-400px)] -mx-6 sm:mx-0">
        <div className="min-w-full px-6 sm:px-0">
          <table className="w-full min-w-[700px] border-collapse bg-white" role="table" aria-label="Subreddits table">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 px-3 w-12 bg-white" scope="col">
                                  <div className="scale-125">
                    <Checkbox
                      checked={selectedSubreddits.size === subreddits.length && subreddits.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="data-[state=checked]:bg-b9-pink data-[state=checked]:border-b9-pink data-[state=checked]:text-white border-gray-300 hover:border-b9-pink/50"
                    />
                  </div>
              </th>
              <th className="text-left py-2 px-3 w-16 font-medium text-gray-900 text-sm bg-white" scope="col">
                Logo
              </th>
              <th
                className="text-left py-2 px-2 font-medium text-gray-900 text-sm bg-white w-[220px]"
                scope="col"
                aria-sort={sortField === 'name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-1 hover:text-b9-pink transition-colors group"
                  aria-label="Sort by subreddit name"
                >
                  <span>Subreddit</span>
                  <div className="w-4 h-4 flex items-center justify-center">
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="h-3 w-3 text-b9-pink" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-b9-pink" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 text-gray-300 group-hover:text-gray-400 opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                </button>
              </th>
              <th
                className="text-left py-2 px-3 font-medium text-gray-900 text-sm bg-white"
                scope="col"
                aria-sort={sortField === 'subscribers' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <button
                  onClick={() => handleSort('subscribers')}
                  className="flex items-center space-x-1 hover:text-b9-pink transition-colors group"
                  aria-label="Sort by subscribers"
                >
                  <span>Subscribers</span>
                  <div className="w-4 h-4 flex items-center justify-center">
                    {sortField === 'subscribers' ? (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="h-3 w-3 text-b9-pink" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-b9-pink" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 text-gray-300 group-hover:text-gray-400 opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                </button>
              </th>
              <th
                className="text-left py-2 px-3 font-medium text-gray-900 text-sm bg-white"
                scope="col"
                aria-sort={sortField === 'subscriber_engagement_ratio' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <button
                  onClick={() => handleSort('subscriber_engagement_ratio')}
                  className="flex items-center space-x-1 hover:text-b9-pink transition-colors group"
                  aria-label="Sort by engagement"
                >
                  <span>Engagement</span>
                  <div className="w-4 h-4 flex items-center justify-center">
                    {sortField === 'subscriber_engagement_ratio' ? (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="h-3 w-3 text-b9-pink" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-b9-pink" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 text-gray-300 group-hover:text-gray-400 opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                </button>
              </th>
              <th
                className="text-left py-2 px-3 font-medium text-gray-900 text-sm bg-white"
                scope="col"
                aria-sort={sortField === 'avg_upvotes_per_post' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <button
                  onClick={() => handleSort('avg_upvotes_per_post')}
                  className="flex items-center space-x-1 hover:text-b9-pink transition-colors group"
                  aria-label="Sort by average upvotes"
                >
                  <span>Avg Upvotes</span>
                  <div className="w-4 h-4 flex items-center justify-center">
                    {sortField === 'avg_upvotes_per_post' ? (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="h-3 w-3 text-b9-pink" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-b9-pink" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 text-gray-300 group-hover:text-gray-400 opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                </button>
              </th>
              <th className="text-left py-2 px-3 font-medium text-gray-900 text-sm w-64 bg-white">
                Review
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedSubreddits.map((subreddit) => (
              <tr
                key={subreddit.id}
                className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selectedSubreddits.has(subreddit.id) ? 'bg-b9-pink/5' : ''
                }`}
              >
                <td className="py-2 px-3">
                  <div className="scale-125">
                    <Checkbox
                      checked={selectedSubreddits.has(subreddit.id)}
                      onCheckedChange={(checked) => handleSelect(subreddit.id, checked as boolean)}
                      className="data-[state=checked]:bg-b9-pink data-[state=checked]:border-b9-pink data-[state=checked]:text-white border-gray-300 hover:border-b9-pink/50"
                    />
                  </div>
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center justify-center">
                    <a 
                      href={`https://reddit.com/${subreddit.display_name_prefixed}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-80 transition-opacity"
                      title={`Open ${subreddit.display_name_prefixed} in new tab`}
                    >
                      {(subreddit.icon_img || subreddit.community_icon) && !brokenIcons.has(subreddit.id) ? (
                        <Image
                          src={(subreddit.icon_img || subreddit.community_icon) as string}
                          alt={`${subreddit.name} icon`}
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-full object-cover border border-gray-200"
                          onError={() => {
                            setBrokenIcons((prev) => {
                              const next = new Set(prev)
                              next.add(subreddit.id)
                              return next
                            })
                          }}
                        />
                      ) : (
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold border border-gray-200"
                          style={{ 
                            backgroundColor: getSubredditColor(subreddit.name)
                          }}
                        >
                          {getSubredditInitials(subreddit.name)}
                        </div>
                      )}
                    </a>
                  </div>
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <a 
                          href={`https://reddit.com/${subreddit.display_name_prefixed}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-foreground hover:text-b9-pink transition-colors"
                          title={`Open ${subreddit.display_name_prefixed} in new tab`}
                        >
                          {subreddit.display_name_prefixed}
                        </a>
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-1.5 py-0.5 font-semibold border ${
                            subreddit.over18 
                              ? 'bg-red-50 text-red-700 border-red-300' 
                              : 'bg-green-50 text-green-700 border-green-300'
                          }`}
                        >
                          {subreddit.over18 ? 'NSFW' : 'SFW'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                        {subreddit.title}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="p-1.5 h-7 w-7 hover:bg-b9-pink hover:text-white hover:border-b9-pink"
                      onClick={() => setRulesModal({ isOpen: true, subreddit })}
                      title={`View ${subreddit.display_name_prefixed} rules`}
                    >
                      <BookOpen className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
                <td className="py-2 px-3 text-foreground font-medium text-sm">
                  {formatNumber(subreddit.subscribers)}
                </td>
                <td className="py-2 px-3">
                  <Badge variant="outline" className="font-mono text-xs">
                    {formatPercentage(subreddit.subscriber_engagement_ratio)}
                  </Badge>
                </td>
                <td className="py-2 px-3 text-foreground text-sm">
                  {formatNumber(subreddit.avg_upvotes_per_post ? Math.round(subreddit.avg_upvotes_per_post) : null)}
                </td>
                <td className="py-2 px-3">
                  {mode === 'review' ? (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant={subreddit.review === 'Ok' ? 'default' : 'outline'} onClick={() => onUpdateCategory(subreddit.id, 'Ok')} className="px-2 py-1 text-xs">Ok</Button>
                      <Button size="sm" variant={subreddit.review === 'No Seller' ? 'default' : 'outline'} onClick={() => onUpdateCategory(subreddit.id, 'No Seller')} className="px-2 py-1 text-xs">No Seller</Button>
                      <Button size="sm" variant={subreddit.review === 'Non Related' ? 'default' : 'outline'} onClick={() => onUpdateCategory(subreddit.id, 'Non Related')} className="px-2 py-1 text-xs">Non Related</Button>
                    </div>
                  ) : (
                    <CategorySelector
                      subredditId={subreddit.id}
                      currentCategory={subreddit.category_text || null}
                      onUpdateCategory={onUpdateCategory}
                      compact={true}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Rules Modal */}
      {rulesModal.isOpen && rulesModal.subreddit && (
        <div 
          className="fixed inset-0 z-50 p-4 flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.25)',
            backdropFilter: 'blur(6px) saturate(140%)',
            WebkitBackdropFilter: 'blur(6px) saturate(140%)'
          }}
          onClick={() => setRulesModal({ isOpen: false, subreddit: null })}
        >
          <div 
            className="bg-white/95 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: getSubredditColor(rulesModal.subreddit.name) }}
                >
                  {getSubredditInitials(rulesModal.subreddit.name)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black">
                    {rulesModal.subreddit.display_name_prefixed} Rules
                  </h2>
                  <p className="text-sm text-gray-600">{rulesModal.subreddit.title}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRulesModal({ isOpen: false, subreddit: null })}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {(() => {
                const rulesArray = parseRulesDataSafely(rulesModal.subreddit?.rules_data as unknown)
                if (rulesArray.length > 0) {
                  return (
                    <div className="space-y-4">
                      {rulesArray.map((rule: { short_name?: string; description?: string; description_html?: string }, index: number) => (
                        <div key={index} className="border-l-4 border-b9-pink pl-4 py-2">
                          <h3 className="font-semibold text-black mb-1">
                            {rule.short_name || `Rule ${index + 1}`}
                          </h3>
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {(rule.description && String(rule.description).trim())
                              || (rule.description_html && String(rule.description_html).replace(/<[^>]*>/g, '').trim())
                              || 'No description available'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )
                }
                const subredditPath = rulesModal.subreddit?.display_name_prefixed?.replace(/^\//, '') || ''
                const rulesUrl = `https://www.reddit.com/${subredditPath}/about/rules`
                return (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No rules data available for this subreddit.</p>
                    <a
                      href={rulesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-4 text-b9-pink hover:underline"
                      title="Open rules on reddit.com"
                    >
                      Open rules on Reddit
                    </a>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export { SubredditTable }
