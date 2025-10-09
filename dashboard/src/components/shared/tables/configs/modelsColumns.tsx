import { Edit, Trash2 } from 'lucide-react'
import { type ColumnDefinition } from '../types'
import { type ActionButton } from '../fields/ActionsField'

export interface Model {
  id: number
  stage_name: string
  status: 'active' | 'inactive' | 'onboarding'
  description: string | null
  assigned_tags: string[]
  platform_accounts: Record<string, string[]>
  metrics: {
    total_posts?: number
    avg_engagement?: number
    last_active?: string
  }
  onboarding_date: string | null
  commission_rate: number | null
  payment_type?: 'bank' | 'crypto'
  notes: string | null
  created_at: string
  updated_at: string
  account_count?: number
  reddit_account_count?: number
}

export interface ModelsColumnConfig {
  onEdit: (model: Model) => void
  onDelete: (id: number) => void
  deletingModel?: number | null
}

export function createModelsColumns(config: ModelsColumnConfig): ColumnDefinition<Model>[] {
  return [
    {
      id: 'stage_name',
      header: 'Model',
      accessor: 'stage_name',
      width: 'w-48 flex-shrink-0',
      field: {
        type: 'text',
        bold: true,
        color: 'primary',
        dangerouslySetHTML: false
      }
    },
    {
      id: 'description',
      header: 'Description',
      accessor: 'description',
      width: 'w-48 flex-shrink-0',
      field: {
        type: 'text',
        color: 'tertiary',
        placeholder: '—'
      }
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      width: 'w-24 flex-shrink-0',
      align: 'center',
      field: {
        type: 'badge',
        classNameMap: {
          'active': 'bg-green-100 text-green-700 border-green-200',
          'inactive': 'bg-gray-100 text-gray-700 border-gray-200',
          'onboarding': 'bg-blue-100 text-blue-700 border-blue-200'
        }
      }
    },
    {
      id: 'accounts',
      header: 'Accounts',
      accessor: (model) => Object.values(model.platform_accounts || {}).flat().length,
      width: 'w-20 flex-shrink-0',
      align: 'center',
      field: {
        type: 'number',
        format: 'number',
        color: 'secondary',
        bold: true
      }
    },
    {
      id: 'tags',
      header: 'Tags',
      accessor: 'assigned_tags',
      width: 'w-48 flex-shrink-0',
      field: {
        type: 'tags',
        maxVisible: 2,
        showCount: true,
        extractCategories: true,
        variant: 'secondary',
        size: 'sm'
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: 'id',
      width: 'w-32 flex-shrink-0',
      align: 'right',
      field: {
        type: 'actions',
        size: 'sm',
        getActions: (model: Model): ActionButton[] => [
          {
            icon: Edit,
            label: 'Edit',
            onClick: (e) => {
              e.stopPropagation()
              config.onEdit(model)
            },
            variant: 'ghost'
          },
          {
            icon: Trash2,
            label: 'Delete',
            onClick: (e) => {
              e.stopPropagation()
              config.onDelete(model.id)
            },
            variant: 'ghost',
            className: 'text-red-500 hover:text-red-700',
            disabled: config.deletingModel === model.id,
            loading: config.deletingModel === model.id
          }
        ]
      }
    }
  ]
}
