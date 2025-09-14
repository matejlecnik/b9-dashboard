#!/bin/bash

# Script to update all table names from simple names to reddit_ prefixed names
# and update imports from redditClient to supabase

echo "🔄 Starting migration to single Supabase with namespaced tables..."

# Function to update table names and imports in a file
update_file() {
  file=$1
  echo "  Updating: $file"

  # Update imports from redditClient to supabase
  sed -i '' "s/import { redditClient/import { supabase/g" "$file"
  sed -i '' "s/import { redditClient as supabaseClient/import { supabase/g" "$file"
  sed -i '' "s/redditClient as supabaseClient/supabase/g" "$file"
  sed -i '' "s/redditClient\./supabase\./g" "$file"
  sed -i '' "s/await redditClient/await supabase/g" "$file"
  sed -i '' "s/if (!redditClient)/if (!supabase)/g" "$file"
  sed -i '' "s/redditClient ||/supabase ||/g" "$file"
  sed -i '' "s/redditClient)/supabase)/g" "$file"
  sed -i '' "s/ redditClient,/ supabase,/g" "$file"
  sed -i '' "s/{redditClient}/{supabase}/g" "$file"

  # Also update any supabaseClient references
  sed -i '' "s/supabaseClient\./supabase\./g" "$file"
  sed -i '' "s/await supabaseClient/await supabase/g" "$file"
  sed -i '' "s/if (!supabaseClient)/if (!supabase)/g" "$file"

  # Update table names to use reddit_ prefix
  # Using word boundaries to avoid replacing parts of variable names
  sed -i '' "s/from('subreddits')/from('reddit_subreddits')/g" "$file"
  sed -i '' "s/from('posts')/from('reddit_posts')/g" "$file"
  sed -i '' "s/from('users')/from('reddit_users')/g" "$file"
  sed -i '' "s/from('categories')/from('reddit_categories')/g" "$file"
  sed -i '' "s/from('filters')/from('reddit_filters')/g" "$file"
  sed -i '' "s/from('scraper_logs')/from('reddit_scraper_logs')/g" "$file"

  # Update table names with quotes
  sed -i '' 's/from("subreddits")/from("reddit_subreddits")/g' "$file"
  sed -i '' 's/from("posts")/from("reddit_posts")/g' "$file"
  sed -i '' 's/from("users")/from("reddit_users")/g' "$file"
  sed -i '' 's/from("categories")/from("reddit_categories")/g' "$file"
  sed -i '' 's/from("filters")/from("reddit_filters")/g' "$file"
  sed -i '' 's/from("scraper_logs")/from("reddit_scraper_logs")/g' "$file"

  # Update table names in variables
  sed -i '' "s/table: 'subreddits'/table: 'reddit_subreddits'/g" "$file"
  sed -i '' "s/table: 'posts'/table: 'reddit_posts'/g" "$file"
  sed -i '' "s/table: 'users'/table: 'reddit_users'/g" "$file"
  sed -i '' "s/table: 'categories'/table: 'reddit_categories'/g" "$file"
  sed -i '' "s/table: 'filters'/table: 'reddit_filters'/g" "$file"
  sed -i '' "s/table: 'scraper_logs'/table: 'reddit_scraper_logs'/g" "$file"

  # Update table names with double quotes
  sed -i '' 's/table: "subreddits"/table: "reddit_subreddits"/g' "$file"
  sed -i '' 's/table: "posts"/table: "reddit_posts"/g' "$file"
  sed -i '' 's/table: "users"/table: "reddit_users"/g' "$file"
  sed -i '' 's/table: "categories"/table: "reddit_categories"/g' "$file"
  sed -i '' 's/table: "filters"/table: "reddit_filters"/g' "$file"
  sed -i '' 's/table: "scraper_logs"/table: "reddit_scraper_logs"/g' "$file"

  # Update .table() calls
  sed -i '' "s/\.table('subreddits')/.table('reddit_subreddits')/g" "$file"
  sed -i '' "s/\.table('posts')/.table('reddit_posts')/g" "$file"
  sed -i '' "s/\.table('users')/.table('reddit_users')/g" "$file"
  sed -i '' "s/\.table('categories')/.table('reddit_categories')/g" "$file"
  sed -i '' "s/\.table('filters')/.table('reddit_filters')/g" "$file"
  sed -i '' "s/\.table('scraper_logs')/.table('reddit_scraper_logs')/g" "$file"
}

# Find and update all TypeScript/JavaScript files
echo "📝 Updating TypeScript/JavaScript files..."
find ./src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
  update_file "$file"
done

echo "✅ Migration script complete!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run build' to check for any errors"
echo "2. Update Python files separately"
echo "3. Test the application"