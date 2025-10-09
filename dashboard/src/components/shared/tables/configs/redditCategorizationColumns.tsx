import { type ColumnDefinition } from '../types'
import { type Subreddit } from '@/types/subreddit'
import { BadgePresetConfigs } from '../fields/BadgesField'
import { PercentagePresets } from '../fields/PercentageField'
import { SelectOptionPresets, MultiSelectButtonsField } from '../fields/MultiSelectButtonsField'
import { RulesButtonField } from '../fields/RulesButtonField'
import { AvatarField } from '../fields/AvatarField'
import { TagsDisplay } from '@/components/shared/TagsDisplay'

export interface RedditCategorizationColumnConfig {
  onUpdateReview: (id: number, review: string) => void
  onShowRules?: (subreddit: Subreddit) => void
  onUpdateSingleTag?: (id: number, oldTag: string, newTag: string) => void
  onRemoveTag?: (id: number, tag: string) => void
  onAddTag?: (id: number, tag: string) => void
}

export function createRedditCategorizationColumns(config: RedditCategorizationColumnConfig): ColumnDefinition<Subreddit>[] {
  return [
    // Avatar column
    {
      id: 'avatar',
      header: 'Icon',
      accessor: (subreddit) => ({
        src: subreddit.community_icon || subreddit.icon_img || null,
        alt: subreddit.display_name_prefixed || subreddit.name
      }),
      width: 'w-14 flex-shrink-0',
      align: 'center',
      field: {
        type: 'custom',
        render: (subreddit) => {
          const src = subreddit.community_icon || subreddit.icon_img || null
          const alt = subreddit.display_name_prefixed || subreddit.name

          return (
            <div className="flex justify-center">
              <AvatarField
                src={src}
                alt={alt}
                size="md"
                fallback="R"
              />
            </div>
          )
        }
      }
    },

    // Subreddit name and title
    {
      id: 'subreddit',
      header: 'Subreddit',
      accessor: 'display_name_prefixed',
      width: 'w-72 flex-shrink-0',
      field: {
        type: 'text',
        bold: true,
        color: 'primary',
        subtitle: (subreddit) => subreddit.title || undefined,
        subtitleColor: 'tertiary',
        badges: (subreddit) => [
          BadgePresetConfigs.reddit.verified(subreddit.verification_required || false),
          {
            show: typeof subreddit.is_nsfw === 'boolean' || typeof subreddit.over18 === 'boolean',
            title: (subreddit.is_nsfw ?? subreddit.over18) ? 'NSFW' : 'SFW',
            className: (subreddit.is_nsfw ?? subreddit.over18)
              ? 'inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-pink-50/50 text-pink-600 border border-pink-200/40'
              : 'inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-gray-50 text-gray-600 border border-gray-200/40'
          }
        ].filter(b => b.show)
      }
    },

    // Rules button
    {
      id: 'rules',
      header: 'Rules',
      accessor: 'rules_data',
      width: 'w-14 flex-shrink-0',
      align: 'center',
      field: {
        type: 'custom',
        render: (subreddit) => (
          <RulesButtonField
            rulesData={subreddit.rules_data}
            displayName={subreddit.display_name_prefixed || subreddit.name}
            onShowRules={config.onShowRules ? () => config.onShowRules!(subreddit) : undefined}
            size="sm"
          />
        )
      }
    },

    // Members
    {
      id: 'subscribers',
      header: 'Members',
      accessor: 'subscribers',
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
      accessor: (subreddit) => subreddit.engagement !== null && subreddit.engagement !== undefined
        ? subreddit.engagement * 100
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

    // Average upvotes
    {
      id: 'avg_upvotes',
      header: 'Avg Upvotes',
      accessor: (subreddit) => subreddit.avg_upvotes_per_post
        ? Math.round(subreddit.avg_upvotes_per_post)
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

    // Review status buttons
    {
      id: 'review',
      header: 'Review',
      accessor: 'review',
      width: 'w-52 flex-shrink-0',
      field: {
        type: 'custom',
        render: (subreddit) => (
          <MultiSelectButtonsField
            options={SelectOptionPresets.reddit.review}
            value={subreddit.review || null}
            onChange={(newValue: string) => config.onUpdateReview(subreddit.id, newValue)}
            size="sm"
          />
        )
      }
    },

    // Tags column (editable)
    {
      id: 'tags',
      header: 'Tags',
      accessor: 'tags',
      width: 'flex-1',
      field: {
        type: 'custom',
        render: (subreddit) => (
          <TagsDisplay
            tags={Array.isArray(subreddit.tags) ? subreddit.tags : []}
            compactMode={false}
            onTagUpdate={config.onUpdateSingleTag ? (oldTag: string, newTag: string) => config.onUpdateSingleTag!(subreddit.id, oldTag, newTag) : undefined}
            onTagRemove={config.onRemoveTag ? (tag: string) => config.onRemoveTag!(subreddit.id, tag) : undefined}
            onAddTag={config.onAddTag ? (tag: string) => config.onAddTag!(subreddit.id, tag) : undefined}
          />
        )
      }
    }
  ]
}
