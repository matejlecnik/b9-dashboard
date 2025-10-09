import { type ColumnDefinition } from '../types'
import { BadgePresetConfigs } from '../fields/IconBadgesField'
import { SelectOptionPresets, MultiSelectButtonsField } from '../fields/MultiSelectButtonsField'

// Instagram creator type (matches the transformed structure from creator-review page)
export interface InstagramCreator {
  id: number
  ig_user_id: string
  username: string
  full_name: string | null
  biography: string | null
  profile_pic_url: string | null
  followers: number
  following: number
  posts_count: number
  review_status: 'ok' | 'non_related' | null
  is_private: boolean
  is_verified: boolean
  is_business_account: boolean
  external_url: string | null
  [key: string]: any
}

export interface InstagramReviewColumnConfig {
  onUpdateReview: (id: number, review: string) => void
}

export function createInstagramReviewColumns(config: InstagramReviewColumnConfig): ColumnDefinition<InstagramCreator>[] {
  return [
    // Avatar column
    {
      id: 'avatar',
      header: 'PFP',
      accessor: (creator) => creator.profile_pic_url,
      width: 'w-16 flex-shrink-0',
      align: 'center',
      field: {
        type: 'avatar',
        size: 'lg',
        fallback: '@'
      }
    },

    // Creator name and username
    {
      id: 'creator',
      header: 'Creator',
      accessor: (creator) => creator.full_name || creator.username,
      width: 'w-56 flex-shrink-0',
      field: {
        type: 'text',
        bold: true,
        color: 'primary',
        subtitle: (creator) => creator.username,
        subtitleColor: 'subtle',
        badges: (creator) => [
          BadgePresetConfigs.instagram.verified(creator.is_verified),
          BadgePresetConfigs.instagram.business(creator.is_business_account),
          BadgePresetConfigs.instagram.private(creator.is_private)
        ]
      }
    },

    // Bio + Link
    {
      id: 'bio',
      header: 'Bio + Link',
      accessor: 'biography',
      width: 'w-64 flex-shrink-0',
      field: {
        type: 'text',
        color: 'secondary',
        maxLength: 100,
        placeholder: 'No bio',
        subtitle: (creator) => creator.external_url ? {
          type: 'link',
          url: creator.external_url,
          showHostname: true
        } : undefined
      }
    },

    // Followers
    {
      id: 'followers',
      header: 'Followers',
      accessor: 'followers',
      width: 'w-28 flex-shrink-0',
      align: 'center',
      field: {
        type: 'number',
        format: 'abbreviated',
        color: 'secondary',
        bold: true
      }
    },

    // Review status buttons
    {
      id: 'review',
      header: 'Review',
      accessor: 'review_status',
      width: 'w-52 flex-shrink-0',
      field: {
        type: 'custom',
        render: (creator) => (
          <MultiSelectButtonsField
            options={SelectOptionPresets.instagram.review}
            value={creator.review_status || 'pending'}
            onChange={(newValue: string) => config.onUpdateReview(creator.id, newValue)}
            size="sm"
          />
        )
      }
    }
  ]
}
