'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Plus, UserCircle2 } from 'lucide-react'
import { DashboardLayout } from '@/components/shared'
import { StandardToolbar } from '@/components/shared/toolbars/StandardToolbar'
import { StandardActionButton } from '@/components/shared/buttons/StandardActionButton'
import { useToast } from '@/components/ui/toast'
import { logger } from '@/lib/logger'
import { createModelsColumns } from '@/components/shared/tables/configs/modelsColumns'
import { UniversalTableV2 } from '@/components/shared/tables/UniversalTableV2'
import type { TableConfig } from '@/components/shared/tables/types'

// Lazy load heavy components
const ModelFormModal = dynamic(
  () => import('@/components/features/ModelFormModal').then(mod => ({ default: mod.ModelFormModal })),
  { ssr: false }
)

interface Model {
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
  // Computed fields
  account_count?: number
  reddit_account_count?: number
}

export default function ModelsPage() {
  const { addToast } = useToast()
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModels, setSelectedModels] = useState<Set<number>>(new Set())
  const [deletingModel, setDeletingModel] = useState<number | null>(null)
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    model?: Model | null
    saving: boolean
  }>({
    isOpen: false,
    model: null,
    saving: false
  })

  const fetchModels = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/models/list')
      const data = await response.json()

      if (data.success) {
        setModels(data.models)
      } else {
        throw new Error(data.error || 'Failed to fetch models')
      }
    } catch (error) {
      logger.error('Error fetching models:', error)
      addToast({
        type: 'error',
        title: 'Error Loading Models',
        description: error instanceof Error ? error.message : 'Failed to load models',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  const handleOpenModal = (model?: Model) => {
    setModalState({
      isOpen: true,
      model: model || null,
      saving: false
    })
  }

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      model: null,
      saving: false
    })
  }

  const handleSaveModel = async (data: {
    stage_name: string
    status: 'active' | 'inactive' | 'onboarding'
    description?: string
    assigned_tags: string[]
    platform_accounts?: Record<string, string[]>
    commission_rate?: number | null
    payment_type?: 'bank' | 'crypto'
  }) => {
    setModalState(prev => ({ ...prev, saving: true }))
    try {
      const url = modalState.model
        ? '/api/models/update'
        : '/api/models/create'

      const body = modalState.model
        ? { id: modalState.model.id, ...data }
        : data

      const response = await fetch(url, {
        method: modalState.model ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result = await response.json()

      if (result.success) {
        addToast({
          type: 'success',
          title: modalState.model ? 'Model Updated' : 'Model Created',
          description: `${data.stage_name || 'Model'} has been ${modalState.model ? 'updated' : 'created'} successfully`,
          duration: 3000
        })
        await fetchModels()
        handleCloseModal()
      } else {
        throw new Error(result.error || 'Failed to save model')
      }
    } catch (error) {
      logger.error('Error saving model:', error)
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save model',
        duration: 5000
      })
    } finally {
      setModalState(prev => ({ ...prev, saving: false }))
    }
  }

  const handleDelete = useCallback(async (modelId: number) => {
    if (!window.confirm('Are you sure you want to delete this model?')) {
      return
    }

    setDeletingModel(modelId)
    try {
      const response = await fetch(`/api/models/delete?id=${modelId}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        addToast({
          type: 'success',
          title: 'Model Deleted',
          description: data.message,
          duration: 3000
        })
        await fetchModels()
      } else {
        throw new Error(data.error || 'Failed to delete model')
      }
    } catch (error) {
      logger.error('Error deleting model:', error)
      addToast({
        type: 'error',
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete model',
        duration: 5000
      })
    } finally {
      setDeletingModel(null)
    }
  }, [addToast, fetchModels])

  const handleUpdateStatus = useCallback(async (id: number, status: string) => {
    try {
      const response = await fetch('/api/models/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })

      const data = await response.json()

      if (data.success) {
        addToast({
          type: 'success',
          title: 'Status Updated',
          description: 'Model status has been updated successfully',
          duration: 2000
        })
        await fetchModels()
      } else {
        throw new Error(data.error || 'Failed to update status')
      }
    } catch (error) {
      logger.error('Error updating status:', error)
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update status',
        duration: 5000
      })
    }
  }, [addToast, fetchModels])

  const filteredModels = models.filter(model => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      model.stage_name.toLowerCase().includes(query) ||
      model.description?.toLowerCase().includes(query) ||
      model.assigned_tags.some(tag => tag.toLowerCase().includes(query))
    )
  })

  // Create table configuration with column definitions
  const tableConfig: TableConfig<Model> = useMemo(() => ({
    columns: createModelsColumns({
      onEdit: handleOpenModal,
      onDelete: handleDelete,
      deletingModel,
      onUpdateStatus: handleUpdateStatus
    }),
    showCheckbox: true,
    onRowClick: handleOpenModal,
    emptyState: {
      icon: <UserCircle2 className="h-12 w-12 mb-4 text-gray-400" />,
      title: searchQuery ? 'No models found matching your search' : 'No models created yet',
      description: searchQuery ? 'Try adjusting your search query' : undefined
    }
  }), [deletingModel, searchQuery, handleDelete, handleUpdateStatus])

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Action Button */}
        <div className="flex items-center justify-end">
          <StandardActionButton
            onClick={() => handleOpenModal()}
            label="Add Model"
            icon={Plus}
            variant="primary"
            size="small"
          />
        </div>

        {/* StandardToolbar with Search */}
        <StandardToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          loading={loading}
        />

        {/* Table Content using UniversalTableV2 */}
        <UniversalTableV2
          data={filteredModels}
          config={tableConfig}
          loading={loading}
          selectedItems={selectedModels}
          onSelectionChange={(ids) => setSelectedModels(ids as Set<number>)}
          getItemId={(model: Model) => model.id}
          searchQuery={searchQuery}
        />
      </div>

      {/* Model Form Modal */}
      <ModelFormModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        model={modalState.model || undefined}
        onSave={handleSaveModel}
        saving={modalState.saving}
      />
    </DashboardLayout>
  )
}