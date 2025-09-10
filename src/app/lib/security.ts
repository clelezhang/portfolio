/**
 * Security utilities for API protection
 * Based on RYO's implementation with strict origin validation
 */

import { NextRequest } from 'next/server';

// Allowed origins for CORS - very restrictive like RYO
const ALLOWED_ORIGINS = [
  'https://lelezhang.design', // Production domain
  'https://lele-portfolio.vercel.app', // Vercel deployment
  'https://portfolio-ftmyik8j9-clelezhangs-projects.vercel.app', // Previous Vercel deployment
  'https://portfolio-2yfkjssxh-clelezhangs-projects.vercel.app', // Current Vercel deployment
  'http://localhost:3000', // Local development
  'http://localhost:3001', // Local development alternate
  'http://localhost:3002', // Local development alternate
];

/**
 * Validate request origin against allowlist
 * Returns true if origin is allowed, false otherwise
 */
export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  
  // For same-origin requests (no origin header), check referer
  if (!origin) {
    if (!referer) return false;
    
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      return ALLOWED_ORIGINS.includes(refererOrigin);
    } catch {
      return false;
    }
  }
  
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Create CORS headers for allowed origins
 */
export function createCORSHeaders(req: NextRequest): HeadersInit {
  const origin = req.headers.get('origin');
  
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  
  // Only set Access-Control-Allow-Origin if origin is in allowlist
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  return headers;
}

/**
 * Get client IP address with fallbacks
 */
export function getClientIP(req: NextRequest): string {
  // Check various headers in order of preference
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) return realIP;
  if (cfConnectingIP) return cfConnectingIP;
  
  // Fallback to unknown if no IP headers available
  return 'unknown';
}

/**
 * Generate visitor ID based on IP and user agent for rate limiting
 */
export async function generateVisitorId(req: NextRequest): Promise<string> {
  const ip = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || '';
  
  // Create a hash of IP + user agent for anonymous tracking using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(`${ip}:${userAgent}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex.substring(0, 16);
}
