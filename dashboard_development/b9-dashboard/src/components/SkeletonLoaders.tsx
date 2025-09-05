'use client'

export function MetricsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {[...Array(4)].map((_, index) => (
        <div 
          key={index}
          className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-100 animate-pulse"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gray-100 w-11 h-11"></div>
            {index === 2 && <div className="w-3 h-3 bg-b9-pink/20 rounded-full"></div>}
          </div>
          
          <div className="space-y-2">
            <div className="w-20 h-8 bg-gray-100 rounded"></div>
            <div className="w-24 h-4 bg-gray-100 rounded"></div>
            <div className="w-16 h-3 bg-gray-100 rounded"></div>
          </div>
          
          {index === 3 && (
            <div className="mt-4">
              <div className="w-full bg-gray-100 rounded-full h-2"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-4 px-6 w-12 bg-white">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
              </th>
              <th className="py-4 px-6 w-16 bg-white">
                <div className="w-10 h-3 bg-gray-200 rounded animate-pulse"></div>
              </th>
              <th className="py-4 px-6 bg-white">
                <div className="w-20 h-3 bg-gray-200 rounded animate-pulse"></div>
              </th>
              <th className="py-4 px-6 bg-white">
                <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
              </th>
              <th className="py-4 px-6 bg-white">
                <div className="w-18 h-3 bg-gray-200 rounded animate-pulse"></div>
              </th>
              <th className="py-4 px-6 bg-white">
                <div className="w-20 h-3 bg-gray-200 rounded animate-pulse"></div>
              </th>
              <th className="py-4 px-6 w-80 bg-white">
                <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(8)].map((_, index) => (
              <tr key={index} className="border-b border-gray-50 animate-pulse">
                <td className="py-4 px-6">
                  <div className="w-4 h-4 bg-gray-100 rounded"></div>
                </td>
                <td className="py-4 px-6">
                  <div className="w-7 h-7 bg-gray-100 rounded-full"></div>
                </td>
                <td className="py-4 px-6">
                  <div className="space-y-2">
                    <div className="w-32 h-4 bg-gray-100 rounded"></div>
                    <div className="w-24 h-3 bg-gray-100 rounded"></div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="w-16 h-4 bg-gray-100 rounded"></div>
                </td>
                <td className="py-4 px-6">
                  <div className="w-12 h-6 bg-gray-100 rounded-full"></div>
                </td>
                <td className="py-4 px-6">
                  <div className="w-14 h-4 bg-gray-100 rounded"></div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex space-x-1">
                    <div className="w-12 h-6 bg-gray-100 rounded-lg"></div>
                    <div className="w-16 h-6 bg-gray-100 rounded-lg"></div>
                    <div className="w-20 h-6 bg-gray-100 rounded-lg"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function UnifiedFiltersSkeleton() {
  return (
    <div className="mb-8">
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 animate-pulse">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search skeleton */}
          <div className="flex-1">
            <div className="h-12 bg-gray-100 rounded-xl"></div>
          </div>
          
          {/* Filter buttons skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-12 w-32 bg-gray-100 rounded-xl"></div>
            <div className="h-12 w-20 bg-gray-100 rounded-xl"></div>
            <div className="h-10 w-10 bg-gray-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
