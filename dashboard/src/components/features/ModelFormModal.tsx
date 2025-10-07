'use client'

import { UserCircle2 } from 'lucide-react'
import { ModelForm } from './ModelForm'
import { StandardModal } from '@/components/shared/modals/StandardModal'

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
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title={model ? 'Edit Model' : 'Create New Model'}
      subtitle={model ? `Editing: ${model.stage_name}` : 'Set up model profile and tag preferences'}
      icon={<UserCircle2 className="h-4 w-4" />}
      variant="default"
      loading={saving}
      maxWidth="4xl"
      maxHeight="85vh"
    >
      <ModelForm
        model={model}
        onSave={handleSave}
        saving={saving}
        onCancel={onClose}
      />
    </StandardModal>
  )
}