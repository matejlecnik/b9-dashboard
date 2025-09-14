# Posting Recommendations

> Find optimal subreddits for content marketing based on engagement data

## 🎯 Business Purpose

This page provides data-driven subreddit recommendations for OnlyFans marketing campaigns. It analyzes engagement metrics, posting patterns, and category performance to maximize content reach and conversion rates.

**Core value**: Transforms raw subreddit data into actionable marketing insights.

## 📊 Key Features

- [x] Engagement score ranking based on subscriber-to-activity ratios
- [x] Content type filters (Image, Video, Text, Link posts)
- [x] SFW toggle for content appropriateness
- [x] Category-based filtering for targeted campaigns
- [x] Subreddit search and sorting capabilities
- [ ] Optimal posting time recommendations
- [ ] Content type optimization suggestions
- [ ] Competition analysis and market saturation

## 🔄 Data Flow

```
Approved & categorized subreddits → Engagement analysis → Ranking algorithm
User filters → Query optimization → Sorted recommendations
Post performance data → Success rate calculations → ROI predictions
```

## 🏗️ Component Structure

```
posting/
├── page.tsx                    # Main recommendations interface
├── README.md                   # This documentation  
└── components/
    ├── PostingToolbar.tsx      # Filters and search controls
    ├── SubredditCard.tsx       # Individual subreddit recommendation
    └── EngagementChart.tsx     # Visual performance indicators
```

## 🔌 API Endpoints Used

- `GET /api/subreddits/recommendations` - Filtered and ranked subreddit list
- `GET /api/subreddits/performance` - Engagement metrics and success rates
- `GET /api/categories` - Category filters for targeted campaigns

## 💾 Database Tables

- `subreddits` - Engagement metrics, categories, and posting requirements
  - Key fields: `subscribers`, `avg_upvotes_per_post`, `engagement_velocity`
  - Filters: `review = 'Ok'` AND `category_text IS NOT NULL`
- `posts` - Historical performance data for trend analysis
- `users` - Creator success patterns in different subreddits

## 🎨 UI/UX Specifications

- **Recommendation Cards**: Visual subreddit cards with key metrics
- **Filter Toolbar**: Category, content type, and SFW toggles
- **Sort Options**: Engagement, subscribers, activity level
- **Engagement Indicators**: Visual scores and trend arrows
- **Mobile Optimization**: Touch-friendly interface for mobile marketers

## 🐛 Known Issues

- Engagement calculations may not account for subreddit activity fluctuations
- No real-time posting time optimization
- Missing competition analysis (how many other creators post there)
- Limited historical performance tracking per creator

## 🚀 Future Enhancements

- **Optimal Timing**: AI-powered posting time recommendations per subreddit
- **Content Inspiration**: Suggest content types based on top-performing posts
- **Competition Analysis**: Show creator density and market saturation
- **Success Tracking**: Track individual creator performance per subreddit
- **A/B Testing**: Compare performance across different posting strategies
- **Trend Analysis**: Identify rising and declining subreddit opportunities

## 📈 Ranking Algorithm

The recommendation engine considers:

1. **Engagement Velocity**: Comments and upvotes per hour after posting
2. **Subscriber Quality**: Active user ratio vs. total subscribers  
3. **Content Type Match**: Performance of similar content in subreddit
4. **Posting Requirements**: Account age, karma minimums, verification needs
5. **Category Performance**: Historical success in similar subreddits
6. **Market Saturation**: Competition level from other creators

## 🎯 Content Strategy Integration

- **Category Targeting**: Match content themes to high-performing categories
- **Content Type Optimization**: Recommend best format (image/video) per subreddit
- **Posting Schedule**: Time recommendations based on subreddit activity patterns
- **Cross-posting Strategy**: Identify complementary subreddits for campaign sequences

## 📊 Success Metrics

- **Conversion Rate**: Subreddit recommendations that lead to successful posts
- **Engagement ROI**: Average engagement per recommended subreddit
- **Discovery Efficiency**: Time saved in manual subreddit research
- **Creator Satisfaction**: User ratings of recommendation quality

## 🔗 Related Pages

- [Categorization](../categorization/README.md) - Provides organized subreddit categories
- [User Analysis](../user-analysis/README.md) - Creator performance insights
- [Analytics](../analytics/README.md) - Campaign performance tracking
- [Subreddit Review](../subreddit-review/README.md) - Source of approved subreddits