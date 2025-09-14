# Categorization

> Assign marketing categories to approved subreddits for strategic campaign planning

## 🎯 Business Purpose

This page organizes approved ("Ok") subreddits into marketing categories for targeted OnlyFans campaigns. It enables strategic content planning by grouping subreddits with similar audiences and content preferences.

Categories include: "Ass & Booty", "Boobs & Chest", "Lingerie & Underwear", "Feet & Foot Fetish", etc.

## 📊 Key Features

- [x] Single-select category dropdown with existing categories
- [x] Add new category functionality
- [x] Filter: All, Uncategorized, Categorized subreddits
- [x] Only shows subreddits with `review = 'Ok'`
- [x] Real-time category statistics
- [ ] AI-powered categorization suggestions
- [x] Bulk category assignment (apply to selected)
- [ ] Category performance analytics
- [ ] Custom category colors and descriptions

## 🔄 Data Flow

```
Approved subreddits → Category assignment → API endpoint /api/categories
Category updates → Database storage → Real-time dashboard refresh
AI analysis → Category suggestions → Manual approval → Assignment
```

## 🏗️ Component Structure

```
categorization/
├── page.tsx                    # Main categorization interface
├── README.md                   # This documentation
└── components/
    └── CategorySelector.tsx    # Shared component for category selection
```

## 🔌 API Endpoints Used

- `GET /api/categories` - Fetch available categories with usage counts
- `POST /api/categories` - Create new marketing categories
- `PATCH /api/subreddits/{id}` - Update `category_text` field

## 💾 Database Tables

- `subreddits` - Updates `category_text` field for approved subreddits
  - Filter: `WHERE review = 'Ok'` to show only approved subreddits
- `categories` table (future) - Dedicated category management

## 🎨 UI/UX Specifications

- **Category Dropdown**: Searchable dropdown with existing categories
- **Add New Category**: Inline category creation with validation
- **Filter Tabs**: Quick switching between All/Uncategorized/Categorized
- **Progress Indicator**: Shows categorization completion percentage
- **Bulk Selection**: Multi-select for batch operations (planned)

## 🐛 Known Issues

- No validation for duplicate category names with different casing
- Category dropdown can become slow with 50+ categories (mitigated with caching and parent-provided list)
- No category merging or renaming functionality

## 🚀 Future Enhancements

- **AI Categorization**: Analyze subreddit content for automatic suggestions
- **Category Templates**: Pre-defined category sets for different marketing strategies  
- **Performance Analytics**: Track which categories perform best
- **Category Hierarchy**: Sub-categories and parent-child relationships
- **Bulk Operations**: Assign categories to multiple subreddits at once
- **Category Management**: Edit, merge, and organize categories

## 📈 Business Impact

- **Strategic Planning**: Enables targeted marketing campaigns by category
- **Content Optimization**: Helps creators focus on high-performing niches
- **Campaign ROI**: Improves targeting accuracy and engagement rates
- **Workflow Efficiency**: Reduces time spent on manual subreddit selection

## 🏷️ Standard Categories

1. **Body-focused**: Ass & Booty, Boobs & Chest, Feet & Foot Fetish
2. **Clothing**: Lingerie & Underwear, Clothed & Dressed, Gym & Fitness
3. **Style**: Goth & Alternative, Cosplay & Fantasy
4. **Demographics**: Age Demographics, Ethnic & Cultural, Body Types & Features
5. **Content Type**: Selfie & Amateur, Full Body & Nude
6. **Promotional**: OnlyFans Promotion, Interactive & Personalized

## 🔗 Related Pages

- [Subreddit Review](../subreddit-review/README.md) - Previous step to approve subreddits
- [Posting](../posting/README.md) - Uses categories for targeted recommendations
- [Analytics](../analytics/README.md) - Category performance tracking