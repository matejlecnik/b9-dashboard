'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ModelForm } from '@/components/ModelForm'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Model {
  id: number
  stage_name: string
  status: 'active' | 'inactive' | 'onboarding'
  description: string | null
  assigned_tags: string[]
  platform_accounts: Record<string, string[]>
  commission_rate: number | null
  payment_type?: 'bank' | 'crypto'
  notes: string | null
  onboarding_date: string | null
  created_at: string
  updated_at: string
}

export default function EditModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { addToast } = useToast()
  const [model, setModel] = useState<Model | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchModel()
  }, [id])

  const fetchModel = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/models/list')
      const data = await response.json()

      if (data.success) {
        const foundModel = data.models.find((m: Model) => m.id === parseInt(id))
        if (foundModel) {
          setModel(foundModel)
        } else {
          throw new Error('Model not found')
        }
      } else {
        throw new Error(data.error || 'Failed to fetch model')
      }
    } catch (error) {
      console.error('Error fetching model:', error)
      addToast({
        type: 'error',
        title: 'Error Loading Model',
        description: error instanceof Error ? error.message : 'Failed to load model',
        duration: 5000
      })
      router.push('/models')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: {
    stage_name: string
    status: 'active' | 'inactive' | 'onboarding'
    description?: string
    assigned_tags: string[]
    platform_accounts?: Record<string, string[]>
    commission_rate?: number | null
    payment_type?: 'bank' | 'crypto'
  }) => {
    setSaving(true)
    try {
      const response = await fetch('/api/models/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(id),
          ...data
        })
      })

      const result = await response.json()

      if (result.success) {
        addToast({
          type: 'success',
          title: 'Model Updated',
          description: `${data.stage_name} has been updated successfully`,
          duration: 3000
        })
        router.push('/models')
      } else {
        throw new Error(result.error || 'Failed to update model')
      }
    } catch (error) {
      console.error('Error updating model:', error)
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update model',
        duration: 5000
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout
        title="Edit Model"
        subtitle=""
        showSearch={false}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    )
  }

  if (!model) {
    return null
  }

  return (
    <DashboardLayout
      title={`Edit Model: ${model.stage_name}`}
      subtitle="Update model profile and tag preferences"
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
          model={model}
          onSave={handleSave}
          saving={saving}
          onCancel={() => router.push('/models')}
        />
      </div>
    </DashboardLayout>
  )
}