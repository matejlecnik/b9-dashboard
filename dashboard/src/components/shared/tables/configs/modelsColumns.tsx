import { Edit, Trash2 } from 'lucide-react'
import { type ColumnDefinition } from '../types'
import { type ActionButton } from '../fields/ActionsField'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  onUpdateStatus?: (id: number, status: string) => void
}

export function createModelsColumns(config: ModelsColumnConfig): ColumnDefinition<Model>[] {
  return [
    {
      id: 'image',
      header: 'Image',
      accessor: 'id',
      width: 'w-16 flex-shrink-0',
      align: 'center',
      field: {
        type: 'custom',
        render: () => (
          <div className="flex justify-center items-center">
            <span className="text-3xl">👩</span>
          </div>
        )
      }
    },
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
      width: 'w-40 flex-shrink-0',
      align: 'center',
      field: {
        type: 'custom',
        render: (model) => (
          <Select
            value={model.status}
            onValueChange={(value) => config.onUpdateStatus?.(model.id, value)}
          >
            <SelectTrigger
              size="sm"
              className="border-0"
              style={{
                background: 'linear-gradient(180deg, var(--gray-100-alpha-90) 0%, var(--gray-200-alpha-85) 100%)',
                backdropFilter: 'blur(24px) saturate(150%)',
                WebkitBackdropFilter: 'blur(24px) saturate(150%)',
                boxShadow: '0 8px 20px var(--black-alpha-08), inset 0 1px 0 var(--white-alpha-60)',
                border: '1px solid var(--slate-400-alpha-60)'
              }}
            >
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent
              className="border-0 backdrop-blur-xl backdrop-saturate-150"
              style={{
                background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
                border: '1px solid var(--slate-400-alpha-60)',
                boxShadow: '0 12px 32px var(--black-alpha-15)'
              }}
            >
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
            </SelectContent>
          </Select>
        )
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
