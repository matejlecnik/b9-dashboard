# Posting Recommendations

## Overview
Provides data-driven subreddit recommendations for OnlyFans marketing campaigns based on engagement analysis and category performance. Transforms 425+ approved and categorized subreddits into actionable marketing insights, ranking them by engagement velocity, subscriber quality, and content type optimization.

**Core Features**: Engagement scoring, content type filters, SFW toggle, category-based targeting, search and sorting, visual recommendation cards.

## TODO List
- [ ] Add optimal posting time recommendations based on subreddit activity patterns
- [ ] Implement content type optimization suggestions for each subreddit
- [ ] Build competition analysis showing creator density and market saturation
- [ ] Add success tracking for individual creator performance per subreddit
- [ ] Create A/B testing framework to compare posting strategies
- [ ] Implement trend analysis to identify rising and declining opportunities
- [ ] Add cross-posting strategy recommendations for campaign sequences

## Current Errors
- Engagement calculations may not account for subreddit activity fluctuations
- Missing real-time posting time optimization based on peak activity hours
- Limited historical performance tracking per creator affects recommendation accuracy
- Competition analysis not available to assess market saturation

## Potential Improvements
- AI-powered posting time recommendations with machine learning analysis
- Advanced content inspiration based on top-performing posts in each subreddit
- Integration with campaign performance data to improve recommendation accuracy
- Real-time market saturation alerts when subreddits become overcrowded
- Creator collaboration scoring to identify partnership opportunities
- Enhanced mobile optimization for on-the-go campaign management

## Technical Notes
- **API Endpoints**: `GET /api/subreddits/recommendations`, `GET /api/categories`
- **Data Source**: `subreddits` table where `review = 'Ok'` AND `category_text IS NOT NULL`
- **Ranking Algorithm**: 6-factor scoring (engagement velocity, subscriber quality, content match, requirements, category performance, market saturation)
- **Performance**: Target <200ms response time, paginated results for large datasets

**Related Pages**: [Categorization](../categorization/README.md) → Posting → [User Analysis](../user-analysis/README.md)