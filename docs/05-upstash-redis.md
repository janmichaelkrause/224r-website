# Upstash Redis Integration

This document explains how Upstash Redis is used in the application.

## Overview

Upstash Redis is integrated for:

1. Rate limiting
2. Caching frequently accessed data
3. Improving application performance

## Setup

To configure Upstash Redis:

1. Sign up for an account at [upstash.com](https://upstash.com/)
2. Create a new Redis database
3. Add the following environment variables to your `.env` file:

```
UPSTASH_REDIS_REST_URL=your_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

For Vercel deployment, add these variables to your project settings.

## Usage

The implementation includes helper functions in `lib/upstash.ts`:

- `getCache<T>(key: string)`: Retrieve data from cache
- `setCache<T>(key: string, value: T, expireInSeconds?: number)`: Store data in cache with optional expiration
- `deleteCache(key: string)`: Remove data from cache

## Features Implemented

### Rate Limiting

The chat API route implements rate limiting to prevent abuse:

```typescript
// In app/(chat)/api/chat/route.ts
const rateLimitKey = `ratelimit:chat:${userId}`;
const requestCount = await getCache<number>(rateLimitKey) || 0;

// Limit users to 50 requests per hour
if (requestCount >= MAX_REQUESTS_PER_HOUR) {
  return new Response('Rate limit exceeded', { status: 429 });
}

await setCache(rateLimitKey, requestCount + 1, 3600);
```

### Data Caching

Document and suggestion data is cached to reduce database load:

```typescript
// Try to get data from cache first
const cacheKey = `data:${id}`;
const cachedData = await getCache<any>(cacheKey);

if (cachedData) {
  return cachedData;
}

// If not in cache, get from database and cache it
const data = await fetchFromDatabase();
await setCache(cacheKey, data, 300); // Cache for 5 minutes
```

### Cache Invalidation

Cache is invalidated when data is modified:

```typescript
// When data is updated or deleted
await deleteCache(`data:${id}`);
```

## Best Practices

1. Use short-lived cache for frequently changing data
2. Use longer cache durations for static or rarely changing data
3. Always invalidate cache when underlying data changes
4. Include error handling in cache operations
5. Consider using cache namespaces for different data types

## Troubleshooting

If you encounter issues:

1. Check that environment variables are set correctly
2. Verify Redis connection in Upstash dashboard
3. Look for Redis errors in application logs
4. Use the Redis CLI for direct debugging