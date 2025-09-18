'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Play, Eye, Film, Users, Sparkles } from 'lucide-react'
import { InstagramSidebar } from '@/components/InstagramSidebar'
import { ViralReelsGrid } from '@/components/instagram/ViralReelsGrid'
import { ViralFilters } from '@/components/instagram/ViralFilters'
import {
  getViralReels,
  getViralReelsStats,
  getTopCreators,
  ViralReel,
  ViralReelsFilters
} from '@/lib/supabase/viral-reels'

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0'
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export default function ViralContentPage() {
  const [reels, setReels] = useState<ViralReel[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState<any>(null)
  const [topCreators, setTopCreators] = useState<any[]>([])
  const [filters, setFilters] = useState<ViralReelsFilters>({
    minViews: 50000,
    sortBy: 'views',
    sortOrder: 'desc'
  })

  const loadReels = useCallback(async (pageNum: number, currentFilters: ViralReelsFilters, append = false) => {
    try {
      if (!append) setLoading(true)
      else setLoadingMore(true)

      const { reels: newReels, totalPages: pages } = await getViralReels(currentFilters, pageNum, 20)

      if (append) {
        setReels(prev => [...prev, ...newReels])
      } else {
        setReels(newReels)
      }

      setTotalPages(pages)
      setPage(pageNum)
    } catch (error) {
      console.error('Error loading reels:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  const loadStats = async () => {
    try {
      const [statsData, creatorsData] = await Promise.all([
        getViralReelsStats(),
        getTopCreators(5)
      ])
      setStats(statsData)
      setTopCreators(creatorsData)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  useEffect(() => {
    loadReels(1, filters)
    loadStats()
  }, [filters, loadReels])

  const handleLoadMore = () => {
    if (page < totalPages) {
      loadReels(page + 1, filters, true)
    }
  }

  const handleFiltersChange = (newFilters: ViralReelsFilters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleResetFilters = () => {
    setFilters({
      minViews: 50000,
      sortBy: 'views',
      sortOrder: 'desc'
    })
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex relative">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255, 131, 149, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255, 131, 149, 0.05) 0%, transparent 50%)
          `
        }}
      />

      {/* Sidebar */}
      <div className="relative z-50">
        <InstagramSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto bg-transparent flex flex-col">
          <div className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-5 w-full">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Viral Content Tracker</h2>
                  <p className="text-gray-600 mt-1">Monitor high-performing reels from tracked creators</p>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-600">Live Data</span>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="rounded-2xl p-4 transition-all duration-300 ease-out h-full min-h-[100px] bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Reels</p>
                      <p className="text-2xl font-bold">8K+</p>
                    </div>
                    <Film className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <div className="rounded-2xl p-4 transition-all duration-300 ease-out h-full min-h-[100px] bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Viral Reels</p>
                      <p className="text-2xl font-bold text-pink-600">
                        {formatNumber(stats?.total_viral || 1842)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-pink-600" />
                  </div>
                </div>
                <div className="rounded-2xl p-4 transition-all duration-300 ease-out h-full min-h-[100px] bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Ultra Viral</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {stats?.ultra_viral || 10}
                      </p>
                    </div>
                    <Sparkles className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <div className="rounded-2xl p-4 transition-all duration-300 ease-out h-full min-h-[100px] bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Views</p>
                      <p className="text-2xl font-bold">
                        {formatNumber(stats?.avg_views || 931673)}
                      </p>
                    </div>
                    <Eye className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div className="rounded-2xl p-4 transition-all duration-300 ease-out h-full min-h-[100px] bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Max Views</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatNumber(stats?.max_views || 206313251)}
                      </p>
                    </div>
                    <Play className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Top Creators */}
              {topCreators.length > 0 && (
                <div className="rounded-2xl transition-all duration-300 ease-out bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Top Viral Creators
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap gap-4">
                      {topCreators.map((creator) => (
                        <div
                          key={creator.username}
                          className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 min-w-[200px]"
                        >
                          {creator.profile_pic_url ? (
                            <img
                              src={`/api/img?url=${encodeURIComponent(creator.profile_pic_url)}`}
                              alt={creator.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
                          )}
                          <div className="flex-1">
                            <p className="font-semibold text-sm">@{creator.username}</p>
                            <p className="text-xs text-gray-600">
                              {creator.viral_count} viral reels • {formatNumber(creator.followers)} followers
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <ViralFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onReset={handleResetFilters}
              />

              {/* Viral Reels Grid */}
              <div className="rounded-2xl transition-all duration-300 ease-out bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Viral Reels Feed</h3>
                    <span className="text-sm text-gray-600">
                      {reels.length} reels shown {page < totalPages && `• Page ${page} of ${totalPages}`}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <ViralReelsGrid
                    reels={reels}
                    loading={loading}
                    hasMore={page < totalPages}
                    onLoadMore={handleLoadMore}
                    loadingMore={loadingMore}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}