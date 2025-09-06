'use client'

import React, { useState } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppleSpinner, AppleSpinnerOverlay, AppleSpinnerFullScreen } from '@/components/AppleSpinner'
import { 
  InlineError, 
  Toast, 
  ToastContainer, 
  ErrorModal, 
  useToast,
  AppleErrorBoundary 
} from '@/components/AppleErrorSystem'
import { 
  Palette, 
  Sparkles, 
  Zap, 
  Heart,
  Star,
  Loader,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Play,
  Pause,
  Settings,
  Eye
} from 'lucide-react'

export default function AppleShowcasePage() {
  const [showSpinner, setShowSpinner] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [selectedValue, setSelectedValue] = useState('')
  const [checkboxes, setCheckboxes] = useState({
    option1: false,
    option2: true,
    option3: false,
  })
  
  const { toasts, addToast, dismissToast } = useToast()

  const handleAddToast = (type: 'success' | 'error' | 'warning' | 'info') => {
    const messages = {
      success: 'Operation completed successfully!',
      error: 'Something went wrong. Please try again.',
      warning: 'Please review your settings before continuing.',
      info: 'Your data has been automatically saved.',
    }
    
    addToast({
      type,
      message: messages[type],
      title: type.charAt(0).toUpperCase() + type.slice(1),
    })
  }

  const demoContent = (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center apple-slide-down">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Apple Design System</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A comprehensive showcase of Apple-inspired UI components with frosted glass effects, 
          smooth animations, and the B9 Agency pink accent color.
        </p>
      </div>

      {/* Color Palette */}
      <Card className="apple-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-b9-pink" />
            Color Palette
          </CardTitle>
          <CardDescription>
            Our brand colors with Apple-style implementation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-b9-pink rounded-2xl shadow-apple mx-auto mb-2 apple-interactive"></div>
              <p className="text-sm font-medium">B9 Pink</p>
              <p className="text-xs text-gray-500">#FF8395</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-2xl shadow-apple mx-auto mb-2 apple-interactive"></div>
              <p className="text-sm font-medium">B9 Black</p>
              <p className="text-xs text-gray-500">#000000</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white border-2 border-gray-200 rounded-2xl shadow-apple mx-auto mb-2 apple-interactive"></div>
              <p className="text-sm font-medium">B9 White</p>
              <p className="text-xs text-gray-500">#FFFFFF</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-500 rounded-2xl shadow-apple mx-auto mb-2 apple-interactive"></div>
              <p className="text-sm font-medium">B9 Grey</p>
              <p className="text-xs text-gray-500">#6B7280</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Button Variations */}
      <Card className="apple-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Button Variations
          </CardTitle>
          <CardDescription>
            All button variants with Apple-style animations and effects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Button>Default</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="glass">Glass</Button>
            <Button variant="destructive">Destructive</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
            <Button>
              <Play className="w-4 h-4 mr-2" />
              With Icon
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Badge Showcase */}
      <Card className="apple-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Badge Showcase
          </CardTitle>
          <CardDescription>
            Status indicators with Apple-style pill design
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Error</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="glass">Glass</Badge>
            <Badge>
              <Heart className="w-3 h-3 mr-1" />
              With Icon
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Form Elements */}
      <Card className="apple-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            Form Elements
          </CardTitle>
          <CardDescription>
            Interactive form components with frosted glass styling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Checkboxes */}
          <div>
            <h4 className="font-semibold mb-3">Checkboxes</h4>
            <div className="space-y-3">
              {Object.entries(checkboxes).map(([key, checked]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox 
                    checked={checked}
                    onCheckedChange={(checked) => 
                      setCheckboxes(prev => ({ ...prev, [key]: !!checked }))
                    }
                  />
                  <label className="text-sm font-medium">
                    Option {key.slice(-1)} {checked && '(Selected)'}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Select */}
          <div>
            <h4 className="font-semibold mb-3">Select Dropdown</h4>
            <Select value={selectedValue} onValueChange={setSelectedValue}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Choose an option..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">First Option</SelectItem>
                <SelectItem value="option2">Second Option</SelectItem>
                <SelectItem value="option3">Third Option</SelectItem>
                <SelectItem value="option4">Fourth Option</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading States */}
      <Card className="apple-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader className="w-5 h-5 text-b9-pink animate-spin" />
            Loading States
          </CardTitle>
          <CardDescription>
            Apple-style loading spinners and overlays
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="space-y-2">
              <p className="text-sm font-medium">Spinner Sizes</p>
              <div className="flex items-center gap-4">
                <AppleSpinner size="sm" />
                <AppleSpinner size="md" />
                <AppleSpinner size="lg" />
                <AppleSpinner size="xl" />
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Color Variants</p>
              <div className="flex items-center gap-4">
                <AppleSpinner color="pink" />
                <AppleSpinner color="gray" />
                <div className="bg-gray-800 p-2 rounded-lg">
                  <AppleSpinner color="white" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => {
                setShowSpinner(true)
                setTimeout(() => setShowSpinner(false), 2000)
              }}
              variant="outline"
            >
              {showSpinner ? <AppleSpinner size="sm" className="mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Button Spinner
            </Button>

            <AppleSpinnerOverlay isLoading={showOverlay}>
              <Button 
                onClick={() => {
                  setShowOverlay(true)
                  setTimeout(() => setShowOverlay(false), 3000)
                }}
                variant="outline"
                disabled={showOverlay}
              >
                <Eye className="w-4 h-4 mr-2" />
                Overlay Demo
              </Button>
            </AppleSpinnerOverlay>

            <Button 
              onClick={() => {
                setShowFullscreen(true)
                setTimeout(() => setShowFullscreen(false), 2000)
              }}
              variant="outline"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Fullscreen Loading
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Handling */}
      <Card className="apple-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Error Handling
          </CardTitle>
          <CardDescription>
            Comprehensive error states with retry functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Inline Errors */}
          <div className="space-y-3">
            <InlineError 
              message="This is an error message with retry option" 
              onRetry={() => alert('Retrying operation...')}
              variant="error"
            />
            <InlineError 
              message="This is a warning message" 
              variant="warning"
            />
            <InlineError 
              message="This is an informational message" 
              variant="info"
            />
          </div>

          {/* Toast Demos */}
          <div>
            <h4 className="font-semibold mb-3">Toast Notifications</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button 
                variant="outline" 
                onClick={() => handleAddToast('success')}
                size="sm"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Success
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleAddToast('error')}
                size="sm"
              >
                <X className="w-4 h-4 mr-1" />
                Error
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleAddToast('warning')}
                size="sm"
              >
                <AlertTriangle className="w-4 h-4 mr-1" />
                Warning
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleAddToast('info')}
                size="sm"
              >
                <Info className="w-4 h-4 mr-1" />
                Info
              </Button>
            </div>
          </div>

          {/* Modal Demo */}
          <div>
            <Button 
              variant="destructive" 
              onClick={() => setShowErrorModal(true)}
            >
              Show Error Modal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Indicators */}
      <Card className="apple-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="status-dot status-online"></div>
            Status Indicators
          </CardTitle>
          <CardDescription>
            System status with animated indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3 p-3 glass-card rounded-lg">
              <div className="status-dot status-online"></div>
              <div>
                <p className="font-medium text-sm">Online</p>
                <p className="text-xs text-gray-500">All systems operational</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 glass-card rounded-lg">
              <div className="status-dot status-warning"></div>
              <div>
                <p className="font-medium text-sm">Warning</p>
                <p className="text-xs text-gray-500">Minor issues detected</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 glass-card rounded-lg">
              <div className="status-dot status-error"></div>
              <div>
                <p className="font-medium text-sm">Error</p>
                <p className="text-xs text-gray-500">Service unavailable</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 glass-card rounded-lg">
              <div className="status-dot status-offline"></div>
              <div>
                <p className="font-medium text-sm">Offline</p>
                <p className="text-xs text-gray-500">Connection lost</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <>
      <DashboardLayout
        title="Apple Design System"
        subtitle="Comprehensive showcase of Apple-inspired UI components"
        showSearch={false}
      >
        <AppleErrorBoundary>
          {demoContent}
        </AppleErrorBoundary>
      </DashboardLayout>

      {/* Fullscreen Loading */}
      {showFullscreen && <AppleSpinnerFullScreen message="Loading design system..." />}

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="System Error"
        message="An unexpected error occurred while processing your request. Please try again or contact support if the problem persists."
        details="NetworkError: Failed to fetch data from API endpoint. Status: 500 Internal Server Error"
        onRetry={() => {
          setShowErrorModal(false)
          alert('Retrying operation...')
        }}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}