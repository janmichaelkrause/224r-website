import { Redis } from '@upstash/redis'

// Check if Redis credentials are available
const hasRedisCredentials = 
  !!process.env.UPSTASH_REDIS_REST_URL && 
  !!process.env.UPSTASH_REDIS_REST_TOKEN

// Create Redis client with Upstash
export const redis = hasRedisCredentials 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || '',
      token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    })
  : null

// Check Redis connection on initialization
if (redis) {
  console.log('Initialized Redis client with URL:', process.env.UPSTASH_REDIS_REST_URL);
  
  // Test connection
  redis.set('test_connection', 'connected')
    .then(() => redis.get('test_connection'))
    .then(result => {
      if (result === 'connected') {
        console.log('✅ Redis connection successful');
      } else {
        console.error('❌ Redis connection test failed - unexpected result:', result);
      }
    })
    .catch(error => {
      console.error('❌ Redis connection test failed:', error);
    });
} else {
  console.warn('⚠️ Redis not configured - missing credentials');
}

// Helper functions for common Redis operations
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  
  try {
    return await redis.get(key);
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  expireInSeconds?: number
): Promise<boolean> {
  if (!redis) return false;
  
  try {
    if (expireInSeconds) {
      await redis.set(key, value, { ex: expireInSeconds });
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (error) {
    console.error('Redis set error:', error);
    return false;
  }
}

export async function deleteCache(key: string): Promise<boolean> {
  if (!redis) return false;
  
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Redis delete error:', error);
    return false;
  }
}