'use client'

import { useState, useEffect, useCallback } from 'react'
import { ModelsDashboardLayout } from '@/components/ModelsDashboardLayout'
import { ModelFormModal } from '@/components/ModelFormModal'
import ModelsTable from '@/components/ModelsTable'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Plus, Loader2 } from 'lucide-react'

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
      console.error('Error fetching models:', error)
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

  const handleSaveModel = async (data: any) => {
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
      console.error('Error saving model:', error)
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

  const handleDelete = async (modelId: number) => {
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
      console.error('Error deleting model:', error)
      addToast({
        type: 'error',
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete model',
        duration: 5000
      })
    } finally {
      setDeletingModel(null)
    }
  }

  const filteredModels = models.filter(model => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      model.stage_name.toLowerCase().includes(query) ||
      model.description?.toLowerCase().includes(query) ||
      model.assigned_tags.some(tag => tag.toLowerCase().includes(query))
    )
  })


  return (
    <ModelsDashboardLayout>
      <div className="flex flex-col h-full p-6">
        {/* Combined Toolbar: Search on left, Add button on right - Slim Design */}
        <div className="flex items-stretch justify-between gap-3 mb-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
          {/* Search Section - Left Side - Compact */}
          <div className="flex items-center flex-1 min-w-0 max-w-xs">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none z-10">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search models..."
                title="Search models by name, stage, or description"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent transition-all duration-200 h-8 relative"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Action Button - Right Side */}
          <div className="flex items-center">
            <Button
              onClick={() => handleOpenModal()}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white border-0 h-8 px-3 text-sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Model
            </Button>
          </div>
        </div>

        {/* Table Content - Flex grow to fill remaining space */}
        <div className="flex-1 flex flex-col min-h-0">
          <ModelsTable
            models={filteredModels}
            loading={loading}
            selectedModels={selectedModels}
            setSelectedModels={setSelectedModels}
            onEdit={handleOpenModal}
            onDelete={handleDelete}
            deletingModel={deletingModel}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {/* Model Form Modal */}
      <ModelFormModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        model={modalState.model || undefined}
        onSave={handleSaveModel}
        saving={modalState.saving}
      />
    </ModelsDashboardLayout>
  )
}