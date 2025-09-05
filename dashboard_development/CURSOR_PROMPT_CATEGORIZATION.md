# B9 Agency Reddit Dashboard - Subreddit Categorization Page

## 🎯 PROJECT CONTEXT
You are building a subreddit categorization dashboard for B9 Agency (OnlyFans marketing agency). The dashboard will help the team categorize Reddit communities discovered by their scraper for marketing strategy.

## 🎨 BRANDING REQUIREMENTS
**B9 Agency Color Scheme:**
- **Primary Pink:** #FF69B4 (or similar pink from b9-agency.com)
- **Black:** #000000 (text and accents)
- **White:** #FFFFFF (backgrounds)
- **Grey:** #6B7280 (secondary text and borders)

**Design Style:**
- Clean, professional, modern
- Match the aesthetic of b9-agency.com
- Minimalist interface focused on functionality

## 🗄️ DATABASE SCHEMA
**Supabase Table: `subreddits`**
```sql
- id: number
- name: string (e.g., "SFWAmIHot")
- display_name_prefixed: string (e.g., "r/SFWAmIHot") 
- title: string
- subscribers: number
- category: 'Ok' | 'No Seller' | 'Non Related' | null
- subscriber_engagement_ratio: number (decimal)
- avg_upvotes_per_post: number
- best_posting_day: string
- best_posting_hour: number
- top_content_type: string
- last_scraped_at: string | null
- created_at: string
```

**Supabase Configuration:**
```
URL: https://cetrhongdrjztsrsffuh.supabase.co
ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldHJob25nZHJqenRzcnNmZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTU4MTMsImV4cCI6MjA3MjM5MTgxM30.DjuEhcfDpdd7gmHFVaqcZP838FXls9-HiXJg-QF-vew
```

## 🎯 SPECIFIC REQUIREMENTS

### **Page Layout:**
1. **Header Section:**
   - B9 Agency branding (logo/title)
   - Real-time metrics: Total subreddits, uncategorized count, processing status
   - Last updated timestamp with 30-second auto-refresh

2. **Main Categorization Interface:**
   - **Table/List View** of uncategorized subreddits (category IS NULL)
   - **Sorting:** Highest `subscriber_engagement_ratio` first, then by `subscribers`
   - **Columns to Display:**
     - Checkbox for selection
     - Subreddit name (r/SubredditName format)
     - Subscriber count (formatted with commas)
     - Engagement ratio (as percentage)
     - Average upvotes per post
     - Category dropdown/buttons
   - **Batch Operations:**
     - Select all checkbox
     - Bulk categorization buttons (Ok, No Seller, Non Related)
   - **Individual Operations:**
     - Dropdown or button group for each subreddit
     - Immediate update on category selection

### **Functionality Requirements:**
1. **Real-time Data:**
   - Auto-refresh every 30 seconds
   - Supabase real-time subscriptions for instant updates
   - Loading states during updates

2. **Categorization Logic:**
   - **"Ok"** = Good for OnlyFans marketing (will be processed)
   - **"No Seller"** = Doesn't allow selling content (excluded)
   - **"Non Related"** = Completely irrelevant (excluded)
   - Update database immediately on category change

3. **User Experience:**
   - Smooth animations for updates
   - Clear visual feedback on actions
   - Responsive design (desktop-optimized)
   - Professional, efficient workflow

### **Technical Implementation:**
- **Framework:** Next.js 14 with TypeScript
- **Styling:** Tailwind CSS with B9 Agency colors
- **Components:** shadcn/ui components (already installed)
- **Database:** Supabase with real-time subscriptions
- **State Management:** React hooks with optimistic updates

### **Color Usage Guidelines:**
- **Pink (#FF69B4):** Primary buttons, active states, brand accents
- **Black (#000000):** Main text, headers, important elements
- **White (#FFFFFF):** Backgrounds, cards, clean spaces
- **Grey (#6B7280):** Secondary text, borders, inactive states

### **Component Structure:**
```typescript
// Main page component
app/categorization/page.tsx

// Subreddit table component
components/SubredditTable.tsx

// Category selector component
components/CategorySelector.tsx

// Metrics cards component
components/MetricsCards.tsx

// Supabase client setup
lib/supabase.ts (already created)
```

## 🚀 SPECIFIC TASKS

### **1. Create the Main Categorization Page:**
- Fetch uncategorized subreddits (WHERE category IS NULL)
- Display in sortable table format
- Implement real-time subscriptions
- Add 30-second refresh timer

### **2. Build Category Selection Interface:**
- Individual dropdown selectors per subreddit
- Bulk selection checkboxes
- Bulk action buttons with B9 Agency pink styling
- Immediate database updates

### **3. Add Real-time Metrics:**
- Live count of uncategorized subreddits
- Total subreddits processed
- Scraper performance indicators
- Last update timestamp

### **4. Implement B9 Agency Branding:**
- Pink primary buttons and accents
- Professional typography
- Clean, modern layout
- Consistent with b9-agency.com aesthetic

## 🎯 SUCCESS CRITERIA
- [ ] Page loads uncategorized subreddits from Supabase
- [ ] Real-time updates work (30-second refresh + WebSocket)
- [ ] Individual categorization updates database immediately
- [ ] Bulk categorization works for multiple selections
- [ ] B9 Agency branding implemented correctly
- [ ] Professional, efficient user experience
- [ ] Sorting by engagement score works properly

## 📝 EXAMPLE DATA
The database currently has ~120 subreddits, with some having NULL categories that need manual review. Each subreddit has engagement metrics, subscriber counts, and performance data that should inform categorization decisions.

## 🚀 DELIVERABLE
A fully functional subreddit categorization page that the B9 Agency team can use to efficiently review and categorize Reddit communities discovered by their scraper, with real-time updates and professional branding that matches their website aesthetic.
