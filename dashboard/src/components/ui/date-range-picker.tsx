'use client'

// Placeholder DateRangePicker component
// See: https://github.com/matejlecnik/b9-dashboard/issues - date range picker implementation

import React from 'react'

export interface DateRangePickerProps {
  value?: { from: Date; to: Date }
  onChange?: (value: { from: Date; to: Date } | undefined) => void
  className?: string
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  return (
    <div className={className}>
      <input
        type="date"
        value={value?.from.toISOString().split('T')[0] || ''}
        onChange={(e) => {
          const newFrom = new Date(e.target.value)
          if (value && onChange) {
            onChange({ ...value, from: newFrom })
          }
        }}
        className="border rounded px-2 py-1 mr-2"
      />
      <span className="text-gray-500 mx-2">to</span>
      <input
        type="date"
        value={value?.to.toISOString().split('T')[0] || ''}
        onChange={(e) => {
          const newTo = new Date(e.target.value)
          if (value && onChange) {
            onChange({ ...value, to: newTo })
          }
        }}
        className="border rounded px-2 py-1"
      />
    </div>
  )
}
