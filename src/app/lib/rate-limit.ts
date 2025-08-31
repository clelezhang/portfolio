/**
 * Rate limiting implementation using Vercel KV
 * Simplified to 30 messages per hour per visitor
 */

import { kv } from '@vercel/kv';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

// Simple rate limiting: 30 messages per hour per visitor
export const CHAT_RATE_LIMIT = {
  maxRequests: 30,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'chat_hour'
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  total: number;
}

/**
 * Check rate limit for a specific key and configuration
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Skip rate limiting in development if KV is not configured
  if (process.env.NODE_ENV === 'development' && !process.env.KV_REST_API_URL) {
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: Date.now() + config.windowMs,
      total: config.maxRequests,
    };
  }

  try {
    const key = `${config.keyPrefix}:${identifier}`;
    const window = Math.floor(Date.now() / config.windowMs);
    const windowKey = `${key}:${window}`;
    
    // Get current count
    const current = await kv.get<number>(windowKey) || 0;
    
    // Check if limit exceeded
    const allowed = current < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - current - 1);
    const resetTime = (window + 1) * config.windowMs;
    
    if (allowed) {
      // Increment counter with expiration
      const expirationSeconds = Math.ceil(config.windowMs / 1000);
      await kv.set(windowKey, current + 1, { ex: expirationSeconds });
    }
    
    return {
      allowed,
      remaining,
      resetTime,
      total: config.maxRequests,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if rate limiting fails
    return {
      allowed: true,
      remaining: 0,
      resetTime: Date.now() + config.windowMs,
      total: config.maxRequests,
    };
  }
}

/**
 * Check chat rate limit (simplified to just 30/hour)
 */
export async function checkChatRateLimit(visitorId: string): Promise<RateLimitResult> {
  return checkRateLimit(visitorId, CHAT_RATE_LIMIT);
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.total.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
  };
}
