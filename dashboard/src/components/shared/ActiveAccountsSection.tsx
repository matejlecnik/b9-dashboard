'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StandardActionButton } from '@/components/shared/buttons/StandardActionButton'
import { Sparkles, UserPlus, AlertCircle, X } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'


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
    <Card className="bg-white/70 backdrop-blur-md border-0 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className="text-lg text-gray-900">Posting Accounts</CardTitle>
            <Badge variant="outline" className="text-xs bg-pink-50 border-pink-200">
              {creators.length} {creators.length === 1 ? 'account' : 'accounts'}
            </Badge>
          </div>
          {showAddButton && onAddUser && (
            <StandardActionButton
              onClick={onAddUser}
              label="Add User"
              icon={Sparkles}
              variant="primary"
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loadingCreators ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-2">No active posting accounts</p>
            <p className="text-sm text-gray-500 mb-4">Add active Reddit accounts linked to models</p>
            {showAddButton && onAddUser && (
              <button
                onClick={onAddUser}
                className="group relative px-4 py-2.5 overflow-hidden rounded-md transition-all duration-300 hover:scale-[1.02] inline-flex items-center justify-center text-sm font-medium"
                style={{
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1))',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 8px 32px 0 rgba(236, 72, 153, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                }}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-pink-400/20 via-purple-400/20 to-blue-400/20" />

                {/* Shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Content */}
                <div className="relative flex items-center">
                  <UserPlus className="h-4 w-4 mr-2 text-pink-500" />
                  <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent font-semibold">
                    Add Your First Account
                  </span>
                </div>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
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
                  className={`relative bg-white rounded-md border-2 shadow-sm hover:shadow-md transition-all group cursor-pointer ${
                    isSelected
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
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
                      className="no-select absolute -top-1.5 -right-1.5 h-4 w-4 p-0 bg-white rounded-full shadow-md text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={() => onRemoveCreator(creator.id, false, creator.username)}
                      disabled={removingCreator === creator.id}
                    >
                      {removingCreator === creator.id ? (
                        <div className="animate-spin rounded-full h-2.5 w-2.5 border-b border-gray-400" />
                      ) : (
                        <X className="h-2.5 w-2.5" />
                      )}
                    </Button>
                  )}

                  <div className="p-2">
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
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover border border-gray-200 hover:border-pink-500 transition-colors"
                            unoptimized
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
                            {creator.username.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </a>
                      <a
                        href={getRedditProfileUrl(creator.username)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-select hover:text-pink-500"
                        title={`u/${creator.username}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] font-semibold text-gray-900 hover:text-pink-500 truncate block max-w-[60px]">
                          {creator.username}
                        </span>
                      </a>

                      {/* Model name */}
                      {creator.model && (
                        <span className="text-[9px] text-purple-600 font-medium truncate block max-w-[60px]">
                          {creator.model.stage_name}
                        </span>
                      )}

                      {/* Minimal badges */}
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <span className="text-[9px] px-1 py-0 bg-gray-100 text-gray-600 rounded">
                          {accountAge}
                        </span>
                        {creator.verified && (
                          <span className="text-[9px] text-blue-500" title="Verified">✓</span>
                        )}
                      </div>
                    </div>

                    {/* Compact Karma */}
                    <div className="mt-1.5 text-center space-y-0.5">
                      <div className="text-[9px] text-gray-600">
                        <span className="text-gray-500">PK</span> <span className="font-medium">{creator.link_karma > 1000 ? `${(creator.link_karma / 1000).toFixed(0)}k` : creator.link_karma}</span>
                      </div>
                      <div className="text-[9px] text-gray-600">
                        <span className="text-gray-500">CK</span> <span className="font-medium">{creator.comment_karma > 1000 ? `${(creator.comment_karma / 1000).toFixed(0)}k` : creator.comment_karma}</span>
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