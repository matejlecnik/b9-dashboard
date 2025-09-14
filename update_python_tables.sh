#!/bin/bash

# Script to update all Python files to use reddit_ prefixed table names

echo "🔄 Updating Python files to use reddit_ prefixed tables..."

# Function to update table names in Python files
update_python_file() {
  file=$1
  echo "  Updating: $file"

  # Update table names with single quotes
  sed -i '' "s/\.table('subreddits')/.table('reddit_subreddits')/g" "$file"
  sed -i '' "s/\.table('posts')/.table('reddit_posts')/g" "$file"
  sed -i '' "s/\.table('users')/.table('reddit_users')/g" "$file"
  sed -i '' "s/\.table('categories')/.table('reddit_categories')/g" "$file"
  sed -i '' "s/\.table('filters')/.table('reddit_filters')/g" "$file"
  sed -i '' "s/\.table('scraper_logs')/.table('reddit_scraper_logs')/g" "$file"

  # Update table names with double quotes
  sed -i '' 's/\.table("subreddits")/.table("reddit_subreddits")/g' "$file"
  sed -i '' 's/\.table("posts")/.table("reddit_posts")/g' "$file"
  sed -i '' 's/\.table("users")/.table("reddit_users")/g' "$file"
  sed -i '' 's/\.table("categories")/.table("reddit_categories")/g' "$file"
  sed -i '' 's/\.table("filters")/.table("reddit_filters")/g' "$file"
  sed -i '' 's/\.table("scraper_logs")/.table("reddit_scraper_logs")/g' "$file"

  # Update in string references (for dynamic queries)
  sed -i '' "s/'subreddits'/'reddit_subreddits'/g" "$file"
  sed -i '' "s/'posts'/'reddit_posts'/g" "$file"
  sed -i '' "s/'users'/'reddit_users'/g" "$file"
  sed -i '' "s/'categories'/'reddit_categories'/g" "$file"
  sed -i '' "s/'filters'/'reddit_filters'/g" "$file"
  sed -i '' "s/'scraper_logs'/'reddit_scraper_logs'/g" "$file"

  sed -i '' 's/"subreddits"/"reddit_subreddits"/g' "$file"
  sed -i '' 's/"posts"/"reddit_posts"/g' "$file"
  sed -i '' 's/"users"/"reddit_users"/g' "$file"
  sed -i '' 's/"categories"/"reddit_categories"/g' "$file"
  sed -i '' 's/"filters"/"reddit_filters"/g' "$file"
  sed -i '' 's/"scraper_logs"/"reddit_scraper_logs"/g' "$file"
}

# Update API files
echo "📝 Updating API files..."
update_python_file "../api/main.py"
update_python_file "../api/worker.py"
update_python_file "../api/services/categorization_service.py"
update_python_file "../api/services/user_service.py"
update_python_file "../api/services/scraper_service.py"
update_python_file "../api/utils/monitoring.py"

# Update scraper files
echo "📝 Updating scraper files..."
update_python_file "../scraper/reddit_scraper.py"

# Find and update any other Python files
echo "📝 Searching for other Python files..."
find ../api -name "*.py" -type f | while read file; do
  if grep -q "\.table(['\"]subreddits\|posts\|users\|categories\|filters\|scraper_logs['\"])" "$file" 2>/dev/null; then
    update_python_file "$file"
  fi
done

find ../scraper -name "*.py" -type f | while read file; do
  if grep -q "\.table(['\"]subreddits\|posts\|users\|categories\|filters\|scraper_logs['\"])" "$file" 2>/dev/null; then
    update_python_file "$file"
  fi
done

echo "✅ Python files updated!"
echo ""
echo "Next steps:"
echo "1. Review the changes in Python files"
echo "2. Test the API endpoints"
echo "3. Restart the Python backend services"