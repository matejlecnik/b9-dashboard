import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

interface RedditUserData {
  id: string
  name: string
  created_utc: number
  comment_karma: number
  link_karma: number
  total_karma?: number
  awardee_karma?: number
  awarder_karma?: number
  is_employee?: boolean
  is_mod?: boolean
  is_gold?: boolean
  verified?: boolean
  has_verified_email?: boolean
  icon_img?: string
  subreddit?: {
    display_name?: string
    title?: string
    subscribers?: number
    over_18?: boolean
    icon_img?: string
    banner_img?: string
    public_description?: string
  }
}

interface RedditPostData {
  id: string
  title: string
  selftext: string
  url: string
  author: string
  subreddit: string
  score: number
  upvote_ratio: number
  num_comments: number
  created_utc: number
  is_self: boolean
  is_video: boolean
  over_18: boolean
  spoiler: boolean
  stickied: boolean
  locked: boolean
  gilded: number
  distinguished?: string
  domain: string
  thumbnail?: string
  content_type?: string
}

// Proxy configurations loaded from environment variables
const PROXY_CONFIGS = [
  {
    service: 'beyondproxy',
    proxy: process.env.BEYONDPROXY_CREDENTIALS || '',
    display_name: 'BeyondProxy'
  },
  {
    service: 'nyronproxy', 
    proxy: process.env.NYRONPROXY_CREDENTIALS || '',
    display_name: 'NyronProxy'
  },
  {
    service: 'rapidproxy',
    proxy: process.env.RAPIDPROXY_CREDENTIALS || '',
    display_name: 'RapidProxy'
  }
].filter(config => config.proxy) // Only include configs with valid credentials


function generateUserAgent(): string {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15"
  ]
  return userAgents[Math.floor(Math.random() * userAgents.length)]
}

async function fetchWithProxy(url: string, maxRetries = 5): Promise<unknown> {
  const userAgent = generateUserAgent()
  const proxyPool = [...PROXY_CONFIGS]

  if (proxyPool.length === 0) {
    throw new Error('No proxy configurations available. Please check environment variables.')
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const _proxy = proxyPool[(attempt - 1) % proxyPool.length]
    try {

      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Connection': 'keep-alive',
          'Referer': 'https://www.reddit.com/',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        
        // Specific error handling
        if (response.status === 404) {
          throw new Error('User not found on Reddit')
        }
        if (response.status === 403) {
          throw new Error('Access forbidden - user may be suspended or private')
        }
        if (response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
          continue
        }
        if ([500, 502, 503, 504].includes(response.status)) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          continue
        }
        throw new Error(`Reddit API error ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      return data

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxRetries) {
        break
      }
      
      // Wait before next attempt, with exponential backoff
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  // All attempts failed
  throw new Error(`All proxy attempts failed. Last error: ${lastError?.message || 'Unknown error'}`)
}

function calculateUserQualityScores(username: string, accountAgeDays: number, postKarma: number, commentKarma: number) {
  // Username quality (0-10): Natural, shorter usernames preferred
  // Penalize usernames with many numbers or symbols, reward shorter lengths
  const hasNumbers = /\d/.test(username)
  const hasSpecialChars = /[^a-zA-Z0-9_]/.test(username)
  const lengthPenalty = Math.max(0, (username.length - 6) * 0.2) // Start penalizing after 6 chars
  
  let usernameScore = 10 - lengthPenalty
  if (hasNumbers) usernameScore *= 0.8  // 20% penalty for numbers
  if (hasSpecialChars) usernameScore *= 0.7  // 30% penalty for special chars
  usernameScore = Math.max(2, Math.min(10, usernameScore)) // Keep between 2-10
  
  // Age quality (0-10): Accounts 30 days to 5 years are ideal
  let ageScore: number
  if (accountAgeDays < 30) {
    // Very new accounts are suspicious
    ageScore = accountAgeDays / 30 * 3
  } else if (accountAgeDays <= 1825) { // 30 days to 5 years
    // Peak scoring period - established but not ancient
    ageScore = 8 + (accountAgeDays - 30) / 1795 * 2  // 8-10 range
  } else {
    // Very old accounts gradually decrease but stay decent
    ageScore = Math.max(6, 10 - (accountAgeDays - 1825) / 1825)  // 6-10 range
  }
  
  // Karma quality (0-10): More realistic karma thresholds
  const totalKarma = postKarma + commentKarma
  const karmaRatio = totalKarma > 0 ? commentKarma / totalKarma : 0
  
  // Base karma score - more achievable thresholds
  let karmaScore: number
  if (totalKarma <= 0) {
    karmaScore = 1  // Very low for no karma
  } else if (totalKarma < 100) {
    karmaScore = 2 + (totalKarma / 100) * 3  // 2-5 for under 100 karma
  } else if (totalKarma < 1000) {
    karmaScore = 5 + ((totalKarma - 100) / 900) * 3  // 5-8 for 100-1000 karma
  } else {
    karmaScore = 8 + Math.min(2, (totalKarma - 1000) / 10000 * 2)  // 8-10 for 1000+ karma
  }
  
  // Bonus/penalty for karma distribution
  // Prefer balanced users (both post and comment karma)
  if (totalKarma > 50) {
    if (karmaRatio > 0.8) {
      // Too comment-heavy
      karmaScore *= 0.95
    } else if (karmaRatio < 0.2) {
      // Too post-heavy 
      karmaScore *= 0.95
    } else {
      // Good balance - small bonus
      karmaScore *= 1.05
    }
  }
  
  karmaScore = Math.max(1, Math.min(10, karmaScore))
  
  // Final weighted score (0-10) - adjusted weights for better distribution
  const overallScore = (usernameScore * 0.15 + ageScore * 0.35 + karmaScore * 0.5)
  
  return {
    username_score: Math.round(usernameScore * 100) / 100,
    age_score: Math.round(ageScore * 100) / 100,
    karma_score: Math.round(karmaScore * 100) / 100,
    overall_score: Math.round(overallScore * 100) / 100
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()
    
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ 
        success: false, 
        error: 'Username is required' 
      }, { status: 400 })
    }

    const cleanUsername = username.trim().replace(/^u\//, '')
    
    // Fetch user data from Reddit
    const userUrl = `https://www.reddit.com/user/${cleanUsername}/about.json`
    const userResponse = await fetchWithProxy(userUrl)
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(userResponse as any)?.data) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch user data from Reddit' 
      }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userData: RedditUserData = (userResponse as any).data
    
    // Calculate account age
    const createdDate = new Date(userData.created_utc * 1000)
    const accountAgeDays = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Calculate quality scores
    const qualityScores = calculateUserQualityScores(
      userData.name, 
      accountAgeDays, 
      userData.link_karma || 0, 
      userData.comment_karma || 0
    )

    // Fetch user posts for analysis
    const postsUrl = `https://www.reddit.com/user/${cleanUsername}/submitted.json?limit=30`
    let userPosts: RedditPostData[] = []
    try {
      const postsResponse = await fetchWithProxy(postsUrl)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((postsResponse as any)?.data?.children) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userPosts = (postsResponse as any).data.children.map((child: { data: unknown }) => child.data)
      }
    } catch (_error) {
    }

    // Analyze posts for patterns
    const contentTypes = { image: 0, video: 0, text: 0, link: 0 }
    const postingHours = new Map<number, number>()
    const postingDays = new Map<string, number>()
    let totalScore = 0
    let totalComments = 0

    userPosts.forEach(post => {
      // Content type analysis
      if (post.is_video || ['v.redd.it', 'youtube.com', 'youtu.be'].includes(post.domain)) {
        contentTypes.video++
      } else if (['i.redd.it', 'imgur.com'].includes(post.domain) || 
                 ['.jpg', '.png', '.gif', '.jpeg'].some(ext => post.url?.endsWith(ext))) {
        contentTypes.image++
      } else if (post.is_self) {
        contentTypes.text++
      } else {
        contentTypes.link++
      }

      // Timing analysis
      const postDate = new Date(post.created_utc * 1000)
      const hour = postDate.getHours()
      const day = postDate.toLocaleDateString('en-US', { weekday: 'long' })
      
      postingHours.set(hour, (postingHours.get(hour) || 0) + 1)
      postingDays.set(day, (postingDays.get(day) || 0) + 1)

      // Engagement totals
      totalScore += post.score || 0
      totalComments += post.num_comments || 0
    })

    // Determine most common patterns
    const preferredContentType = Object.entries(contentTypes)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null
    const mostActiveHour = Array.from(postingHours.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null
    const mostActiveDay = Array.from(postingDays.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null

    // Prepare user data for database
    // Extract bio and first URL + banner image from user subreddit if available
    const bio: string | undefined = userData.subreddit?.public_description || undefined
    let bioUrl: string | undefined
    if (bio) {
      const match = bio.match(/https?:\/\/\S+/)
      if (match) bioUrl = match[0]
    }

    const bannerImg: string | undefined = userData.subreddit?.banner_img || undefined

    const userPayload = {
      username: userData.name,
      reddit_id: userData.id,
      created_utc: createdDate.toISOString(),
      account_age_days: accountAgeDays,
      comment_karma: userData.comment_karma || 0,
      link_karma: userData.link_karma || 0,
      total_karma: (userData.link_karma || 0) + (userData.comment_karma || 0),
      awardee_karma: userData.awardee_karma || 0,
      awarder_karma: userData.awarder_karma || 0,
      is_employee: userData.is_employee || false,
      is_mod: userData.is_mod || false,
      is_gold: userData.is_gold || false,
      verified: userData.verified || false,
      has_verified_email: userData.has_verified_email || false,
      is_suspended: false,
      icon_img: userData.icon_img,
      subreddit_display_name: userData.subreddit?.display_name,
      subreddit_title: userData.subreddit?.title,
      subreddit_subscribers: userData.subreddit?.subscribers || 0,
      subreddit_over_18: userData.subreddit?.over_18 || false,
      subreddit_banner_img: bannerImg,
      bio: bio,
      bio_url: bioUrl,
      username_quality_score: qualityScores.username_score,
      age_quality_score: qualityScores.age_score,
      karma_quality_score: qualityScores.karma_score,
      overall_user_score: qualityScores.overall_score,
      avg_post_score: userPosts.length > 0 ? Math.round((totalScore / userPosts.length) * 100) / 100 : 0,
      avg_post_comments: userPosts.length > 0 ? Math.round((totalComments / userPosts.length) * 100) / 100 : 0,
      total_posts_analyzed: userPosts.length,
      karma_per_day: accountAgeDays > 0 ? Math.round(((userData.link_karma || 0) + (userData.comment_karma || 0)) / accountAgeDays * 100) / 100 : 0,
      preferred_content_type: preferredContentType,
      most_active_posting_hour: mostActiveHour,
      most_active_posting_day: mostActiveDay,
      our_creator: false, // Default to false - manually mark creators as needed
      last_scraped_at: new Date().toISOString(),
    }

    // Save to database
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    const { error } = await supabase
      .from('users')
      .upsert(userPayload, { onConflict: 'username' })

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to save user to database' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      user: userPayload 
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
