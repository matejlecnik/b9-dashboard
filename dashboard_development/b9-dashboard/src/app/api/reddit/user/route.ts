import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

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

// Proxy configurations (same as scraper)
const PROXY_CONFIGS = [
  {
    service: 'beyondproxy',
    proxy: '9b1a4c15700a:654fa0b97850@proxy.beyondproxy.io:12321',
    display_name: 'BeyondProxy'
  },
  {
    service: 'nyronproxy',
    proxy: 'uxJNWsLXw3XnJE-zone-resi:cjB3tG2ij@residential-ww.nyronproxies.com:16666',
    display_name: 'NyronProxy'
  },
  {
    service: 'rapidproxy',
    proxy: 'admin123-residential-GLOBAL:admin123@us.rapidproxy.io:5001',
    display_name: 'RapidProxy'
  }
]

function getRandomProxy() {
  return PROXY_CONFIGS[Math.floor(Math.random() * PROXY_CONFIGS.length)]
}

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

async function fetchWithProxy(url: string, maxRetries = 3): Promise<unknown> {
  const proxy = getRandomProxy()
  const userAgent = generateUserAgent()
  
  console.log(`🌐 Fetching ${url} via ${proxy.display_name}`)
  console.log(`📋 User-Agent: ${userAgent}`)
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
        },
        // Note: Vercel Edge Functions don't support proxy configuration
        // In production, you'd need to use a proxy service or external API
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User not found')
        }
        if (response.status === 403) {
          throw new Error('User is suspended or private')
        }
        throw new Error(`Reddit API returned ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error)
      if (attempt === maxRetries) {
        throw error
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
}

function calculateUserQualityScores(username: string, accountAgeDays: number, postKarma: number, commentKarma: number) {
  // Username quality (0-10): Shorter, natural usernames preferred
  const usernameScore = Math.max(0, 10 - username.length * 0.3) * (username.slice(-4).match(/\d/) ? 0.5 : 1)
  
  // Age quality (0-10): Sweet spot 1-3 years
  let ageScore: number
  if (accountAgeDays < 1095) { // Less than 3 years
    ageScore = Math.min(10, accountAgeDays / 365 * 3)
  } else {
    ageScore = Math.max(5, 10 - (accountAgeDays - 1095) / 365 * 0.5)
  }
  
  // Karma quality (0-10): Balanced comment/post ratio preferred
  const totalKarma = postKarma + commentKarma
  const karmaRatio = commentKarma / Math.max(1, totalKarma)
  const karmaScore = Math.min(10, totalKarma / 1000) * (1 + karmaRatio * 0.5)
  
  // Final weighted score (0-10)
  const overallScore = (usernameScore * 0.2 + ageScore * 0.3 + karmaScore * 0.5)
  
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
    } catch (error) {
      console.warn('Failed to fetch user posts:', error)
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
      our_creator: true, // Mark as our creator by default
      last_scraped_at: new Date().toISOString(),
    }

    // Save to database
    const supabase = await createClient()
    const { error } = await supabase
      .from('users')
      .upsert(userPayload, { onConflict: 'username' })

    if (error) {
      console.error('Database error:', error)
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
    console.error('Error fetching Reddit user:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
