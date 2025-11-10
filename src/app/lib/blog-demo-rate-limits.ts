/**
 * Rate limit configurations for blog demo API endpoints
 */

export const BLOG_DEMO_RATE_LIMITS = {
  claude: {
    maxRequests: 15,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'blog_demo_claude'
  },
  explore: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'blog_demo_explore'
  },
  index: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'blog_demo_index'
  },
  summarize: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'blog_demo_summarize'
  }
} as const;
