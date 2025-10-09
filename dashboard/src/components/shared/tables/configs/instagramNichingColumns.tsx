import { type ColumnDefinition } from '../types'
import { BadgePresetConfigs } from '../fields/IconBadgesField'
import { PercentagePresets } from '../fields/PercentageField'
import { DatePresets } from '../fields/DateField'
import { SelectOptionPresets, MultiSelectButtonsField } from '../fields/MultiSelectButtonsField'

// Instagram creator type (matches the transformed structure from Instagram pages)
export interface InstagramCreator {
  id: number
  ig_user_id: string
  username: string
  full_name: string | null
  biography: string | null
  profile_pic_url: string | null
  followers: number
  posts_count: number
  review_status: 'ok' | 'non_related' | null
  is_private: boolean
  is_verified: boolean
  is_business_account: boolean
  niche: string | null
  viral_content_count_cached: number | null
  avg_views_per_reel_cached: number | null
  posting_frequency_per_week: number | null
  follower_growth_rate_weekly: number | null
  save_to_like_ratio: number | null
  last_post_days_ago: number | null
  engagement_rate_cached: number | null
  avg_likes_per_post: number | null
  [key: string]: any
}

export interface InstagramNichingColumnConfig {
  onUpdateReview: (id: number, review: string) => void
}

export function createInstagramNichingColumns(config: InstagramNichingColumnConfig): ColumnDefinition<InstagramCreator>[] {
  return [
    // Avatar column
    {
      id: 'avatar',
      header: 'Icon',
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

    // Members/Followers
    {
      id: 'subscribers',
      header: 'Members',
      accessor: 'followers',
      width: 'w-24 flex-shrink-0',
      align: 'center',
      field: {
        type: 'number',
        format: 'abbreviated',
        color: 'secondary',
        bold: true
      }
    },

    // Engagement rate
    {
      id: 'engagement',
      header: 'Engagement',
      accessor: (creator) => creator.engagement_rate_cached !== null && creator.engagement_rate_cached !== undefined
        ? creator.engagement_rate_cached * 100
        : null,
      width: 'w-24 flex-shrink-0',
      align: 'center',
      field: {
        type: 'percentage',
        decimals: 1,
        colorThresholds: PercentagePresets.engagement,
        bold: true
      }
    },

    // Average likes
    {
      id: 'avg_likes',
      header: 'Avg Likes',
      accessor: (creator) => creator.avg_likes_per_post
        ? Math.round(creator.avg_likes_per_post)
        : null,
      width: 'w-24 flex-shrink-0',
      align: 'center',
      field: {
        type: 'number',
        format: 'abbreviated',
        color: 'secondary',
        bold: true
      }
    },

    // Niche badge
    {
      id: 'niche',
      header: 'Niche',
      accessor: 'niche',
      width: 'w-28 flex-shrink-0',
      field: {
        type: 'badge',
        variant: 'gradient',
        classNameMap: {
          // Empty map - will use default gradient styling
        }
      }
    },

    // Viral content count
    {
      id: 'viral',
      header: 'Viral',
      accessor: 'viral_content_count_cached',
      width: 'w-20 flex-shrink-0',
      align: 'center',
      field: {
        type: 'number',
        format: 'number',
        color: 'pink',
        bold: true,
        placeholder: '—'
      }
    },

    // Average reel views
    {
      id: 'avg_views',
      header: 'Avg Views',
      accessor: 'avg_views_per_reel_cached',
      width: 'w-24 flex-shrink-0',
      align: 'center',
      field: {
        type: 'number',
        format: 'abbreviated',
        color: 'secondary',
        bold: true
      }
    },

    // Posting frequency per week
    {
      id: 'posting_freq',
      header: 'Posting Freq',
      accessor: 'posting_frequency_per_week',
      width: 'w-24 flex-shrink-0',
      align: 'center',
      field: {
        type: 'custom',
        render: (value) => value !== null && value !== undefined
          ? {
              type: 'text',
              text: `${value.toFixed(1)}/wk`,
              color: value > 7 ? 'pink' : value > 3 ? 'secondary' : 'tertiary',
              bold: true
            }
          : { type: 'text', text: '—', color: 'disabled' }
      }
    },

    // Growth rate
    {
      id: 'growth_rate',
      header: 'Growth',
      accessor: 'follower_growth_rate_weekly',
      width: 'w-24 flex-shrink-0',
      align: 'center',
      field: {
        type: 'custom',
        render: (value) => value !== null && value !== undefined
          ? {
              type: 'text',
              text: `${value > 0 ? '↑' : '↓'} ${Math.abs(value).toFixed(1)}%`,
              color: value > 0 ? 'pink' : 'tertiary',
              bold: true
            }
          : { type: 'text', text: '—', color: 'disabled' }
      }
    },

    // Save/Like ratio
    {
      id: 'save_ratio',
      header: 'Save/Like',
      accessor: (creator) => creator.save_to_like_ratio !== null && creator.save_to_like_ratio !== undefined
        ? creator.save_to_like_ratio * 100
        : null,
      width: 'w-20 flex-shrink-0',
      align: 'center',
      field: {
        type: 'percentage',
        decimals: 1,
        colorThresholds: PercentagePresets.saveRatio,
        bold: true
      }
    },

    // Last posted
    {
      id: 'last_posted',
      header: 'Last Posted',
      accessor: 'last_post_days_ago',
      width: 'w-24 flex-shrink-0',
      align: 'center',
      field: {
        type: 'date',
        colorThresholds: DatePresets.lastPosted,
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
