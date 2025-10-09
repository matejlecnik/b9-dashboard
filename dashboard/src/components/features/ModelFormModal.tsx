'use client'

import { useState } from 'react'
import { UserCircle2, Loader2, Save } from 'lucide-react'
import { ModelForm } from './ModelForm'
import { Button } from '@/components/ui/button'
import { StandardModal } from '@/components/shared/modals/StandardModal'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

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
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null)

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
  }

  const handleSubmit = () => {
    if (formRef) {
      formRef.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    }
  }

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title={model ? 'Edit Model' : 'Create New Model'}
      subtitle={model ? `Editing: ${model.stage_name}` : 'Set up model profile and tag preferences'}
      icon={<UserCircle2 className="h-4 w-4" />}
      loading={saving}
      maxWidth="4xl"
      maxHeight="85vh"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className={cn("text-xs h-8 px-3 border-strong", `hover:${designSystem.background.hover.subtle} hover:border-strong`)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="text-xs h-8 px-3 bg-gradient-to-r from-primary via-primary-hover to-platform-accent text-white shadow-primary-lg hover:shadow-primary-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className={cn("h-3 w-3 mr-1.5 animate-spin", designSystem.borders.radius.full)} />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3 w-3 mr-1.5" />
                {model ? 'Update Model' : 'Create Model'}
              </>
            )}
          </Button>
        </div>
      }
    >
      <div ref={(ref) => {
        if (ref) {
          const form = ref.querySelector('form')
          if (form) setFormRef(form)
        }
      }}>
        <ModelForm
          model={model}
          onSave={handleSave}
          saving={saving}
          onCancel={onClose}
        />
      </div>
    </StandardModal>
  )
}