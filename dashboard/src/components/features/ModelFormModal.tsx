'use client'

import { UserCircle2, X } from 'lucide-react'
import { ModelForm } from './ModelForm'

interface ModelFormModalProps {
  isOpen: boolean
  onClose: () => void
  model?: {
    id?: number
    stage_name: string
    status: 'active' | 'inactive' | 'onboarding'
    description: string | null
    assigned_tags: string[]
    platform_accounts?: Record<string, string[]>
    notes?: string | null
    commission_rate?: number | null
    onboarding_date?: string | null
  }
  onSave: (data: {
    stage_name: string
    status: 'active' | 'inactive' | 'onboarding'
    description?: string
    assigned_tags: string[]
    platform_accounts?: Record<string, string[]>
    commission_rate?: number | null
    payment_type?: 'bank' | 'crypto'
  }) => Promise<void>
  saving: boolean
}

export function ModelFormModal({
  isOpen,
  onClose,
  model,
  onSave,
  saving
}: ModelFormModalProps) {
  if (!isOpen) return null

  const handleSave = async (data: {
    stage_name: string
    status: 'active' | 'inactive' | 'onboarding'
    description?: string
    assigned_tags: string[]
    platform_accounts?: Record<string, string[]>
    commission_rate?: number | null
    payment_type?: 'bank' | 'crypto'
  }) => {
    await onSave(data)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/20 backdrop-blur-md z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(243, 244, 246, 0.98), rgba(229, 231, 235, 0.95), rgba(209, 213, 219, 0.92))',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 25px 70px -10px rgba(0, 0, 0, 0.2), 0 10px 25px -5px rgba(0, 0, 0, 0.08), inset 0 2px 4px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 2px 0 rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-5 py-3 border-b border-purple-200/30 bg-gradient-to-r from-purple-50/30 to-pink-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 shadow-sm">
                  <UserCircle2 className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {model ? 'Edit Model' : 'Create New Model'}
                  </h2>
                  <p className="text-[10px] text-gray-500">
                    {model ? `Editing: ${model.stage_name}` : 'Set up model profile and tag preferences'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={saving}
                className="p-1 rounded-lg hover:bg-gray-200/50 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(85vh-60px)] px-6 py-6">
            <ModelForm
              model={model}
              onSave={handleSave}
              saving={saving}
              onCancel={onClose}
            />
          </div>
        </div>
      </div>

    </>
  )
}