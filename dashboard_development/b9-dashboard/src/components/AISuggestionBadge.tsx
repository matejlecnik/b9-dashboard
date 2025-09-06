'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Brain, Check, X, RefreshCw, AlertCircle } from 'lucide-react'

interface AISuggestion {
  category: string
  confidence: number
  reasoning: string
  cached?: boolean
}

interface AISuggestionBadgeProps {
  subredditId: number
  subredditName: string
  currentCategory?: string | null
  onApplySuggestion: (category: string, subredditId: number) => void
  onFeedback: (subredditId: number, feedback: 'accepted' | 'rejected' | 'modified', actualCategory?: string) => void
  compact?: boolean
}

export function AISuggestionBadge({ 
  subredditId, 
  subredditName,
  currentCategory,
  onApplySuggestion, 
  onFeedback,
  compact = false 
}: AISuggestionBadgeProps) {
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [hasProvided, setHasProvided] = useState(false)

  const fetchSuggestion = async (force = false) => {
    if (loading) return
    setLoading(true)

    try {
      // First check if we already have a cached suggestion
      const checkResponse = await fetch(`/api/ai/categorize?subredditId=${subredditId}`)
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json()
        if (checkData.success && !force) {
          setSuggestion({
            ...checkData.suggestion,
            cached: true
          })
          setLoading(false)
          return
        }
      }

      // Get new AI suggestion
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subredditId,
          force: force 
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setSuggestion({
          ...data.suggestion,
          cached: data.suggestion.cached || false
        })
      } else {
        console.error('Failed to get AI suggestion:', data.error)
      }
    } catch (error) {
      console.error('Error fetching AI suggestion:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!suggestion) return
    
    onApplySuggestion(suggestion.category, subredditId)
    
    // Send positive feedback
    await fetch('/api/ai/categorize', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subredditId,
        feedback: 'accepted',
        actualCategory: suggestion.category
      })
    })
    
    onFeedback(subredditId, 'accepted', suggestion.category)
    setHasProvided(true)
  }

  const handleReject = async () => {
    if (!suggestion) return
    
    await fetch('/api/ai/categorize', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subredditId,
        feedback: 'rejected'
      })
    })
    
    onFeedback(subredditId, 'rejected')
    setHasProvided(true)
  }

  // Check if current category matches AI suggestion (for modified feedback)
  const handleCurrentCategoryFeedback = async () => {
    if (!suggestion || !currentCategory) return
    
    const feedback = currentCategory === suggestion.category ? 'accepted' : 'modified'
    
    await fetch('/api/ai/categorize', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subredditId,
        feedback,
        actualCategory: currentCategory
      })
    })
    
    onFeedback(subredditId, feedback, currentCategory)
    setHasProvided(true)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50 border-green-200'
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <Check className="h-3 w-3" />
    if (confidence >= 60) return <AlertCircle className="h-3 w-3" />
    return <X className="h-3 w-3" />
  }

  if (!suggestion && !loading) {
    return (
      <Button
        onClick={() => fetchSuggestion(false)}
        variant="outline"
        size="sm"
        className="flex items-center gap-1 text-xs"
        disabled={loading}
      >
        <Brain className="h-3 w-3" />
        {compact ? 'AI' : 'Get AI Suggestion'}
      </Button>
    )
  }

  if (loading) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Loading...
      </Badge>
    )
  }

  if (!suggestion) return null

  return (
    <div className="space-y-2">
      <div 
        className={`flex items-center gap-2 ${compact ? 'flex-wrap' : ''}`}
        onClick={() => !compact && setExpanded(!expanded)}
        role={compact ? undefined : "button"}
        tabIndex={compact ? undefined : 0}
      >
        <Badge 
          className={`flex items-center gap-1 cursor-pointer ${getConfidenceColor(suggestion.confidence)}`}
          variant="outline"
        >
          <Brain className="h-3 w-3" />
          {suggestion.category}
          {getConfidenceIcon(suggestion.confidence)}
          <span className="text-xs">
            {suggestion.confidence}%
          </span>
          {suggestion.cached && <span className="text-xs opacity-60">(cached)</span>}
        </Badge>

        {!compact && (
          <div className="flex gap-1">
            <Button
              onClick={(e) => { e.stopPropagation(); handleApply() }}
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              onClick={(e) => { e.stopPropagation(); handleReject() }}
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
            >
              <X className="h-3 w-3" />
            </Button>
            <Button
              onClick={(e) => { e.stopPropagation(); fetchSuggestion(true) }}
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {expanded && !compact && (
        <div className="bg-gray-50 p-3 rounded-lg border text-sm">
          <div className="font-medium mb-1">AI Reasoning:</div>
          <div className="text-gray-600 mb-3">{suggestion.reasoning}</div>
          
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={handleApply}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Apply Suggestion
            </Button>
            <Button 
              onClick={handleReject}
              size="sm"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              Reject
            </Button>
            {currentCategory && currentCategory !== suggestion.category && (
              <Button 
                onClick={handleCurrentCategoryFeedback}
                size="sm"
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                Use Current ({currentCategory})
              </Button>
            )}
          </div>
          
          {hasProvided && (
            <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Feedback provided
            </div>
          )}
        </div>
      )}

      {compact && expanded && (
        <div className="text-xs text-gray-600 italic">
          {suggestion.reasoning}
        </div>
      )}
    </div>
  )
}