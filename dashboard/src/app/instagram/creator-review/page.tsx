'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, CheckCircle2, XCircle, Clock, ExternalLink, Users, Eye, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface InstagramCreator {
  id: number
  ig_user_id: string
  username: string
  full_name: string | null
  biography: string | null
  profile_pic_url: string | null
  followers: number
  following: number
  posts_count: number
  media_count: number
  review_status: 'pending' | 'ok' | 'non_related' | null
  reviewed_at: string | null
  reviewed_by: string | null
  discovery_source: string | null
  is_private: boolean
  is_verified: boolean
  avg_views_per_reel_cached: number | null
  engagement_rate_cached: number | null
  viral_content_count_cached: number | null
}

const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

const getReviewStatusConfig = (status: string | null) => {
  switch (status) {
    case 'ok':
      return { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle2 }
    case 'non_related':
      return { label: 'Non Related', color: 'bg-red-100 text-red-800', icon: XCircle }
    case 'pending':
      return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock }
    default:
      return { label: 'Unreviewed', color: 'bg-gray-100 text-gray-800', icon: Clock }
  }
}

export default function CreatorReviewPage() {
  const [creators, setCreators] = useState<InstagramCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [minFollowers, setMinFollowers] = useState<number>(10000)
  const [selectedCreators, setSelectedCreators] = useState<Set<number>>(new Set())
  const [bulkAction, setBulkAction] = useState<string>('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchCreators = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('instagram_creators')
        .select('*')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        if (statusFilter === 'unreviewed') {
          query = query.or('review_status.is.null,review_status.eq.pending')
        } else {
          query = query.eq('review_status', statusFilter)
        }
      }

      if (minFollowers > 0) {
        query = query.gte('followers', minFollowers)
      }

      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,biography.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching creators:', error)
        toast.error('Failed to fetch creators')
      } else {
        setCreators(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred while fetching creators')
    } finally {
      setLoading(false)
    }
  }, [supabase, statusFilter, minFollowers, searchQuery])

  useEffect(() => {
    fetchCreators()
  }, [fetchCreators])

  const updateCreatorStatus = async (creatorId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('instagram_creators')
        .update({
          review_status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin'
        })
        .eq('id', creatorId)

      if (error) {
        toast.error('Failed to update status')
      } else {
        toast.success('Status updated successfully')
        fetchCreators()
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred while updating status')
    }
  }

  const handleBulkAction = async () => {
    if (!bulkAction || selectedCreators.size === 0) {
      toast.error('Please select creators and an action')
      return
    }

    try {
      const { error } = await supabase
        .from('instagram_creators')
        .update({
          review_status: bulkAction,
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin'
        })
        .in('id', Array.from(selectedCreators))

      if (error) {
        toast.error('Failed to update creators')
      } else {
        toast.success(`Updated ${selectedCreators.size} creators`)
        setSelectedCreators(new Set())
        setBulkAction('')
        fetchCreators()
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred during bulk update')
    }
  }

  const toggleSelectCreator = (creatorId: number) => {
    const newSelected = new Set(selectedCreators)
    if (newSelected.has(creatorId)) {
      newSelected.delete(creatorId)
    } else {
      newSelected.add(creatorId)
    }
    setSelectedCreators(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedCreators.size === creators.length) {
      setSelectedCreators(new Set())
    } else {
      setSelectedCreators(new Set(creators.map(c => c.id)))
    }
  }

  const stats = {
    total: creators.length,
    pending: creators.filter(c => c.review_status === 'pending' || !c.review_status).length,
    approved: creators.filter(c => c.review_status === 'ok').length,
    rejected: creators.filter(c => c.review_status === 'non_related').length,
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Creators</p>
                <p className="text-2xl font-bold">{formatNumber(stats.total)}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold">{formatNumber(stats.pending)}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold">{formatNumber(stats.approved)}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Non Related</p>
                <p className="text-2xl font-bold">{formatNumber(stats.rejected)}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters & Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by username, name, or bio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unreviewed">Unreviewed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ok">Approved</SelectItem>
                <SelectItem value="non_related">Non Related</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Min Followers:</span>
              <Input
                type="number"
                value={minFollowers}
                onChange={(e) => setMinFollowers(parseInt(e.target.value) || 0)}
                className="w-24"
              />
            </div>
            <Button onClick={fetchCreators} variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>

          {selectedCreators.size > 0 && (
            <div className="mt-4 flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium">{selectedCreators.size} selected</span>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Bulk action..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ok">Mark as Approved</SelectItem>
                  <SelectItem value="non_related">Mark as Non Related</SelectItem>
                  <SelectItem value="pending">Mark as Pending</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleBulkAction} disabled={!bulkAction}>
                Apply to Selected
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Creators ({creators.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">Loading creators...</div>
          ) : creators.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No creators found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedCreators.size === creators.length && creators.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Followers</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creators.map((creator) => {
                    const statusConfig = getReviewStatusConfig(creator.review_status)
                    const StatusIcon = statusConfig.icon

                    return (
                      <TableRow key={creator.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedCreators.has(creator.id)}
                            onChange={() => toggleSelectCreator(creator.id)}
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={creator.profile_pic_url || ''} alt={creator.username} />
                              <AvatarFallback>{creator.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">@{creator.username}</p>
                                {creator.is_verified && (
                                  <Badge variant="secondary" className="text-xs">Verified</Badge>
                                )}
                                {creator.is_private && (
                                  <Badge variant="outline" className="text-xs">Private</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 truncate">{creator.full_name || 'No name'}</p>
                              {creator.biography && (
                                <p className="text-xs text-gray-400 line-clamp-2 mt-1">{creator.biography}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-gray-400" />
                              <span className="font-medium">{formatNumber(creator.followers)}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Following: {formatNumber(creator.following)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            <div>{formatNumber(creator.posts_count || creator.media_count)} posts</div>
                            {creator.viral_content_count_cached && creator.viral_content_count_cached > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {creator.viral_content_count_cached} viral
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {creator.avg_views_per_reel_cached && (
                              <div className="flex items-center gap-1 text-sm">
                                <Eye className="h-3 w-3 text-gray-400" />
                                <span>{formatNumber(Math.round(creator.avg_views_per_reel_cached))}</span>
                              </div>
                            )}
                            {creator.engagement_rate_cached && (
                              <div className="flex items-center gap-1 text-sm">
                                <Heart className="h-3 w-3 text-gray-400" />
                                <span>{(creator.engagement_rate_cached * 100).toFixed(1)}%</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("flex items-center gap-1", statusConfig.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={creator.review_status || 'pending'}
                              onValueChange={(value) => updateCreatorStatus(creator.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="ok">Approve</SelectItem>
                                <SelectItem value="non_related">Non Related</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                            >
                              <a
                                href={`https://instagram.com/${creator.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}