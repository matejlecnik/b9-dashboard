'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StandardActionButton } from '@/components/shared/buttons/StandardActionButton'
import { Sparkles, UserPlus, AlertCircle, X } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface Creator {
  id: number
  username: string
  link_karma: number
  comment_karma: number
  total_karma: number
  account_age_days: number | null
  icon_img: string | null
  model_id: number | null
  status: string
  verified?: boolean
  is_gold?: boolean
  has_verified_email?: boolean
  created_utc?: string | null
  model?: {
    id: number
    stage_name: string
    status: string
    assigned_tags: string[]
  }
}

interface ActiveAccountsSectionProps {
  creators: Creator[]
  selectedAccount: Creator | null
  onSelectAccount: (account: Creator | null) => void
  loadingCreators: boolean
  onAddUser?: () => void
  onRemoveCreator?: (id: number, makeCreator: boolean, username?: string) => void
  removingCreator?: number | null
  showAddButton?: boolean
}

export function ActiveAccountsSection({
  creators,
  selectedAccount,
  onSelectAccount,
  loadingCreators,
  onAddUser,
  onRemoveCreator,
  removingCreator,
  showAddButton = true
}: ActiveAccountsSectionProps) {
  const getRedditProfileUrl = (username: string) => {
    return `https://www.reddit.com/user/${username}`
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-0",
        "backdrop-blur-xl backdrop-saturate-150"
      )}
      style={{
        background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
        border: '1px solid var(--slate-400-alpha-60)',
        boxShadow: '0 20px 50px var(--black-alpha-12)'
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className={cn("text-lg", designSystem.typography.color.primary)}>Posting Accounts</CardTitle>
            <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
              {creators.length} {creators.length === 1 ? 'account' : 'accounts'}
            </Badge>
          </div>
          {showAddButton && onAddUser && (
            <StandardActionButton
              onClick={onAddUser}
              label="Add User"
              icon={Sparkles}
              variant="primary"
              size="small"
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loadingCreators ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn(designSystem.borders.radius.sm, "p-4 animate-pulse", designSystem.background.surface.light)}>
                <div className="flex items-center space-x-3">
                  <div className={cn("w-12 h-12", designSystem.borders.radius.full, designSystem.background.surface.neutral)}></div>
                  <div className="flex-1 space-y-2">
                    <div className={cn("h-4 rounded w-3/4", designSystem.background.surface.neutral)}></div>
                    <div className={cn("h-3 rounded w-1/2", designSystem.background.surface.neutral)}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className={cn("h-12 w-12 mx-auto mb-3", designSystem.typography.color.disabled)} />
            <p className={cn("font-medium mb-2", designSystem.typography.color.tertiary)}>No active posting accounts</p>
            <p className={cn("text-sm mb-4", designSystem.typography.color.subtle)}>Add active Reddit accounts linked to models</p>
            {showAddButton && onAddUser && (
              <button
                onClick={onAddUser}
                className={cn(
                  "group relative px-4 py-2.5 overflow-hidden transition-all duration-300 hover:scale-[1.02] inline-flex items-center justify-center text-sm font-medium",
                  designSystem.borders.radius.sm
                )}
                style={{
                  background: 'linear-gradient(135deg, var(--pink-alpha-50) 0%, var(--pink-alpha-40) 100%)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid var(--pink-600)',
                  boxShadow: '0 8px 32px var(--pink-alpha-40)'
                }}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-pink-100/30 via-transparent to-rose-100/20" />

                {/* Shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Content */}
                <div className="relative flex items-center">
                  <UserPlus className="h-4 w-4 mr-2 text-pink-600" />
                  <span className="text-pink-600 font-semibold">
                    Add Your First Account
                  </span>
                </div>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
            {creators.map((creator) => {
              const accountAge = creator.account_age_days ?
                creator.account_age_days > 365 ?
                  `${Math.floor(creator.account_age_days / 365)}y` :
                  `${creator.account_age_days}d`
                : 'New'

              const isSelected = selectedAccount?.id === creator.id

              return (
                <div
                  key={creator.id}
                  className={cn(
                    "relative border-2 shadow-sm hover:shadow-md transition-all group cursor-pointer",
                    designSystem.borders.radius.sm,
                    isSelected
                      ? 'border-pink-500 bg-pink-50/50'
                      : 'border-gray-200/60 bg-gradient-to-br from-gray-50/80 to-slate-50/60 hover:border-pink-400/60 hover:bg-gradient-to-br hover:from-pink-50/30 hover:to-rose-50/20'
                  )}
                  onClick={(e) => {
                    // Don't select if clicking on remove button, avatar or username
                    if (!(e.target as HTMLElement).closest('.no-select')) {
                      onSelectAccount(isSelected ? null : creator)
                    }
                  }}
                >
                  {onRemoveCreator && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "no-select absolute -top-1 -right-1 h-3.5 w-3.5 p-0 bg-white shadow-md hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                        designSystem.borders.radius.full,
                        designSystem.typography.color.disabled
                      )}
                      onClick={() => onRemoveCreator(creator.id, false, creator.username)}
                      disabled={removingCreator === creator.id}
                    >
                      {removingCreator === creator.id ? (
                        <div className={cn("animate-spin h-2 w-2 border-b border-strong", designSystem.borders.radius.full)} />
                      ) : (
                        <X className="h-2 w-2" />
                      )}
                    </Button>
                  )}

                  <div className="p-1">
                    {/* Avatar and Name */}
                    <div className="flex flex-col items-center text-center">
                      <a
                        href={getRedditProfileUrl(creator.username)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-select relative mb-1"
                        title={`u/${creator.username}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {creator.icon_img ? (
                          <Image
                            src={creator.icon_img}
                            alt={`${creator.username} avatar`}
                            width={24}
                            height={24}
                            className={cn("w-6 h-6 object-cover border border-default hover:border-pink-500 transition-colors", designSystem.borders.radius.full)}
                            unoptimized
                          />
                        ) : (
                          <div className={cn("w-6 h-6 bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 flex items-center justify-center text-white font-bold text-[8px] shadow-sm", designSystem.borders.radius.full)}>
                            {creator.username.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </a>
                      <a
                        href={getRedditProfileUrl(creator.username)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-select hover:text-pink-600"
                        title={`u/${creator.username}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className={cn("text-[9px] font-semibold hover:text-pink-600 truncate block w-full px-0.5", designSystem.typography.color.primary)}>
                          {creator.username}
                        </span>
                      </a>

                      {/* Model name */}
                      {creator.model && (
                        <span className="text-[8px] text-purple-600 font-medium truncate block w-full px-0.5">
                          {creator.model.stage_name}
                        </span>
                      )}

                      {/* Minimal badges */}
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <span className={cn("text-[8px] px-0.5 py-0 rounded", designSystem.background.surface.light, designSystem.typography.color.tertiary)}>
                          {accountAge}
                        </span>
                        {creator.verified && (
                          <span className="text-[8px] text-blue-500" title="Verified">✓</span>
                        )}
                      </div>
                    </div>

                    {/* Compact Karma */}
                    <div className="mt-1 text-center space-y-0.5">
                      <div className={cn("text-[8px]", designSystem.typography.color.tertiary)}>
                        <span className={cn(designSystem.typography.color.subtle)}>PK</span> <span className="font-medium">{creator.link_karma > 1000 ? `${(creator.link_karma / 1000).toFixed(0)}k` : creator.link_karma}</span>
                      </div>
                      <div className={cn("text-[8px]", designSystem.typography.color.tertiary)}>
                        <span className={cn(designSystem.typography.color.subtle)}>CK</span> <span className="font-medium">{creator.comment_karma > 1000 ? `${(creator.comment_karma / 1000).toFixed(0)}k` : creator.comment_karma}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}