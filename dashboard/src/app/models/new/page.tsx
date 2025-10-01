'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { ModelForm } from '@/components/features/ModelForm'
import { useToast } from '@/components/ui/toast'
import { logger } from '@/lib/logger'

export default function NewModelPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [saving, setSaving] = useState(false)

  const handleSave = async (data: unknown) => {
    const formData = data as {
      name: string
      stage_name?: string
      description?: string
      assigned_tags: string[]
    }
    setSaving(true)
    try {
      const response = await fetch('/api/models/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        addToast({
          type: 'success',
          title: 'Model Created',
          description: `${formData.name} has been created successfully`,
          duration: 3000
        })
        router.push('/models')
      } else {
        throw new Error(result.error || 'Failed to create model')
      }
    } catch (error) {
      logger.error('Error creating model:', error)
      addToast({
        type: 'error',
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create model',
        duration: 5000
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout
      title="Create New Model"
      subtitle="Set up a new model profile with tag preferences"
      showSearch={false}
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/models">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Models
            </Button>
          </Link>
        </div>

        <ModelForm
          onSave={handleSave}
          saving={saving}
          onCancel={() => router.push('/models')}
        />
      </div>
    </DashboardLayout>
  )
}