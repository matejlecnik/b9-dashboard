// Simple test to check Supabase connection
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Environment check:')
console.log('URL:', supabaseUrl ? 'Present' : 'MISSING')
console.log('Key:', supabaseAnonKey ? 'Present' : 'MISSING')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    console.log('\nTesting Supabase connection...')
    
    // Test 1: Basic connection
    const { data, error } = await supabase
      .from('subreddits')
      .select('id, name')
      .limit(5)
    
    if (error) {
      console.error('Query error:', error)
      return
    }
    
    console.log('✅ Connection successful!')
    console.log('Sample data:', data)
    console.log('Record count:', data?.length || 0)
    
    // Test 2: Count total records
    const { count, error: countError } = await supabase
      .from('subreddits')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('Count error:', countError)
    } else {
      console.log('Total subreddits:', count)
    }
    
  } catch (err) {
    console.error('Connection test failed:', err)
  }
}

testConnection()
