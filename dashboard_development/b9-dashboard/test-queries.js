// Test the specific queries used in the dashboard
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testQueries() {
  console.log('Testing dashboard queries...\n')
  
  // Test 1: Subreddit Review - Uncategorized (review is null or empty)
  console.log('1. Testing Subreddit Review - Uncategorized:')
  const { data: uncategorized, error: uncatError } = await supabase
    .from('subreddits')
    .select('id, name, review')
    .or('review.is.null,review.eq.')
    .not('name', 'ilike', 'u_%')
    .limit(5)
  
  if (uncatError) {
    console.error('Error:', uncatError)
  } else {
    console.log('Results:', uncategorized?.length || 0)
    console.log('Sample:', uncategorized?.slice(0, 2))
  }
  
  // Test 2: Subreddit Review - Categorized (review is not null/empty)
  console.log('\n2. Testing Subreddit Review - Categorized:')
  const { data: categorized, error: catError } = await supabase
    .from('subreddits')
    .select('id, name, review')
    .not('review', 'is', null)
    .neq('review', '')
    .not('name', 'ilike', 'u_%')
    .limit(5)
  
  if (catError) {
    console.error('Error:', catError)
  } else {
    console.log('Results:', categorized?.length || 0)
    console.log('Sample:', categorized?.slice(0, 2))
  }
  
  // Test 3: Categorization - Only 'Ok' reviewed
  console.log('\n3. Testing Categorization - Ok reviewed:')
  const { data: okReviewed, error: okError } = await supabase
    .from('subreddits')
    .select('id, name, review, category_text')
    .eq('review', 'Ok')
    .limit(5)
  
  if (okError) {
    console.error('Error:', okError)
  } else {
    console.log('Results:', okReviewed?.length || 0)
    console.log('Sample:', okReviewed?.slice(0, 2))
  }
  
  // Test 4: Count queries
  console.log('\n4. Testing count queries:')
  const countQueries = await Promise.all([
    supabase.from('subreddits').select('id', { count: 'exact', head: true }).or('review.is.null,review.eq.').not('name', 'ilike', 'u_%'),
    supabase.from('subreddits').select('id', { count: 'exact', head: true }).not('review', 'is', null).neq('review', '').not('name', 'ilike', 'u_%'),
    supabase.from('subreddits').select('id', { count: 'exact', head: true }).eq('review', 'Ok')
  ])
  
  console.log('Uncategorized count:', countQueries[0].count)
  console.log('Categorized count:', countQueries[1].count)
  console.log('Ok reviewed count:', countQueries[2].count)
  
  // Test 5: Check review field values
  console.log('\n5. Checking review field values:')
  const { data: reviewValues } = await supabase
    .from('subreddits')
    .select('review')
    .not('review', 'is', null)
    .neq('review', '')
    .limit(10)
  
  const uniqueReviews = [...new Set(reviewValues?.map(r => r.review))]
  console.log('Unique review values:', uniqueReviews)
}

testQueries().catch(console.error)
