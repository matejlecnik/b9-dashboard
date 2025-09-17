# RapidAPI Instagram-Looter2 API Examples

This directory contains example requests and responses for the Instagram-Looter2 API from RapidAPI.

## API Endpoints

### 1. User Info (`/profile`)
- **Purpose**: Fetch Instagram user profile information
- **Request**: `user-info/request.json`
- **Response**: `user-info/response.json`
- **API Calls**: 1

### 2. Reels (`/reels`)
- **Purpose**: Fetch Instagram reels for a user
- **Request**: `reels/request.json`
- **Response**: `reels/response.json`
- **API Calls**: 1 per page (12 reels per page)

### 3. Posts (`/posts`)
- **Purpose**: Fetch Instagram posts (photos, videos, carousels)
- **Request**: `posts/request.json`
- **Response**: `posts/response.json`
- **API Calls**: 1 per page (12 posts per page)

## Request Headers

All requests require these headers:
```json
{
  "x-rapidapi-key": "YOUR_RAPIDAPI_KEY",
  "x-rapidapi-host": "instagram-looter2.p.rapidapi.com",
  "accept": "application/json"
}
```

## Rate Limits

- **Requests per second**: 60
- **Monthly limit**: Based on plan (1M for $200 long-term plan)

## Usage in Code

The `unified_scraper.py` uses these endpoints to:
1. Check if creator is new (0 content) → Fetch profile
2. Fetch reels (90 for new, 30 for existing)
3. Fetch posts (30 for new, 10 for existing)
4. Average: 2.4 API calls per creator

## Notes

- Replace example data with actual responses from your API testing
- Keep sensitive information (API keys, user IDs) redacted
- Use these examples to understand data structure for parsing