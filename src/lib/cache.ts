import { Redis } from "@upstash/redis";
import { logger } from "./logger";

// Initialize Redis client
const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  compress?: boolean; // Whether to compress data
}

export class CacheManager {
  private static instance: CacheManager;
  private redis: Redis;
  private memoryCache = new Map<string, { data: unknown; expires: number }>();
  private readonly MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.redis = redis;
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Get data from cache (memory first, then Redis)
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      const memoryData = this.memoryCache.get(key);
      if (memoryData && memoryData.expires > Date.now()) {
        logger.debug(`Cache hit (memory): ${key}`);
        return memoryData.data as T;
      }

      // Check Redis cache
      const redisData = await this.redis.get(key);
      if (redisData) {
        logger.debug(`Cache hit (Redis): ${key}`);
        // Store in memory cache for faster access
        this.memoryCache.set(key, {
          data: redisData,
          expires: Date.now() + this.MEMORY_CACHE_TTL,
        });
        return redisData as T;
      }

      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error("Cache get error", { key, error });
      return null;
    }
  }

  // Set data in cache (both memory and Redis)
  async set(key: string, data: unknown, options: CacheOptions = {}): Promise<void> {
    try {
      const { ttl = 3600, tags = [] } = options; // Default 1 hour TTL

      // Store in memory cache
      this.memoryCache.set(key, {
        data,
        expires: Date.now() + this.MEMORY_CACHE_TTL,
      });

      // Store in Redis
      await this.redis.setex(key, ttl, data);

      // Store cache tags for invalidation
      if (tags.length > 0) {
        for (const tag of tags) {
          await this.redis.sadd(`cache:tags:${tag}`, key);
          await this.redis.expire(`cache:tags:${tag}`, ttl);
        }
      }

      logger.debug(`Cache set: ${key}`, { ttl, tags });
    } catch (error) {
      logger.error("Cache set error", { key, error });
    }
  }

  // Delete specific cache key
  async delete(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      await this.redis.del(key);
      logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      logger.error("Cache delete error", { key, error });
    }
  }

  // Invalidate cache by tags
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const keys = await this.redis.smembers(`cache:tags:${tag}`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          await this.redis.del(`cache:tags:${tag}`);
          
          // Remove from memory cache
          keys.forEach(key => this.memoryCache.delete(key));
          
          logger.debug(`Cache invalidated by tag: ${tag}`, { keys });
        }
      }
    } catch (error) {
      logger.error("Cache invalidation error", { tags, error });
    }
  }

  // Clear all cache
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      await this.redis.flushdb();
      logger.info("All cache cleared");
    } catch (error) {
      logger.error("Cache clear error", { error });
    }
  }

  // Get cache statistics
  async getStats(): Promise<{
    memoryKeys: number;
    redisKeys: number;
    memorySize: number;
  }> {
    try {
      const memoryKeys = this.memoryCache.size;
      const redisKeys = await this.redis.dbsize();
      
      // Calculate approximate memory usage
      let memorySize = 0;
      for (const [key, value] of this.memoryCache.entries()) {
        memorySize += key.length + JSON.stringify(value).length;
      }

      return {
        memoryKeys,
        redisKeys,
        memorySize,
      };
    } catch (error) {
      logger.error("Cache stats error", { error });
      return { memoryKeys: 0, redisKeys: 0, memorySize: 0 };
    }
  }
}

// Cache decorator for functions
export function cache(options: CacheOptions = {}) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cacheManager = CacheManager.getInstance();

    descriptor.value = async function (...args: unknown[]) {
      const cacheKey = `${(target as { constructor: { name: string } }).constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      // Try to get from cache
      const cached = await cacheManager.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute method and cache result
      const result = await method.apply(this, args);
      await cacheManager.set(cacheKey, result, options);
      
      return result;
    };
  };
}

// Predefined cache keys
export const CacheKeys = {
  // General info
  GENERAL_INFO: "general_info",
  
  // Reviews
  REVIEWS: "reviews",
  REVIEWS_BY_SERVICE: (serviceType: string) => `reviews:service:${serviceType}`,
  REVIEW_STATS: "reviews:stats",
  
  // Portfolio
  PORTFOLIO: "portfolio",
  PORTFOLIO_PAGE: (page: number) => `portfolio:page:${page}`,
  
  // Quotations
  QUOTATIONS: "quotations",
  QUOTATION: (id: string) => `quotation:${id}`,
  
  // Projects
  PROJECTS: "projects",
  PROJECT: (id: string) => `project:${id}`,
  
  // Invoices
  INVOICES: "invoices",
  INVOICE: (id: string) => `invoice:${id}`,
  
  // Contact messages
  CONTACT_MESSAGES: "contact:messages",
  CONTACT_STATS: "contact:stats",
} as const;

// Cache TTL constants
export const CacheTTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

// Helper functions
export const cacheManager = CacheManager.getInstance();

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const cached = await cacheManager.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  await cacheManager.set(key, data, options);
  return data;
}

export async function invalidateCache(keys: string[]): Promise<void> {
  await Promise.all(keys.map(key => cacheManager.delete(key)));
}

export async function invalidateCacheByTags(tags: string[]): Promise<void> {
  await cacheManager.invalidateByTags(tags);
}
