import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const defaultKeyGenerator = (req: NextRequest) => {
  // Use IP address as default key
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : "unknown";
  return `rate_limit:${ip}`;
};

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
  } = options;

  return async function rateLimiter(req: NextRequest) {
    const key = keyGenerator(req);
    const window = Math.floor(Date.now() / windowMs);
    const redisKey = `${key}:${window}`;

    try {
      // Get current request count
      const current = await redis.get(redisKey) as number || 0;

      if (current >= maxRequests) {
        return NextResponse.json(
          { 
            error: "Too many requests", 
            message: `Rate limit exceeded. Try again in ${Math.ceil(windowMs / 1000)} seconds.`,
            retryAfter: Math.ceil(windowMs / 1000)
          },
          { 
            status: 429,
            headers: {
              "Retry-After": Math.ceil(windowMs / 1000).toString(),
              "X-RateLimit-Limit": maxRequests.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": new Date(Date.now() + windowMs).toISOString(),
            }
          }
        );
      }

      // Increment counter
      await redis.incr(redisKey);
      await redis.expire(redisKey, Math.ceil(windowMs / 1000));

      // Add rate limit headers
      const remaining = Math.max(0, maxRequests - current - 1);
      const resetTime = new Date(Date.now() + windowMs);

      return NextResponse.next({
        headers: {
          "X-RateLimit-Limit": maxRequests.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": resetTime.toISOString(),
        },
      });
    } catch (error) {
      console.error("Rate limiter error:", error);
      // If Redis fails, allow the request but log the error
      return NextResponse.next();
    }
  };
}

// Predefined rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  keyGenerator: (req) => {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "unknown";
    return `auth_rate_limit:${ip}`;
  },
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
});

export const contactFormRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 contact form submissions per hour
});

export const reviewRateLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 1, // 1 review per day per IP
});
