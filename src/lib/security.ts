import { NextRequest } from "next/server";
import { logger } from "./logger";

// Security headers middleware
export function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.cloudinary.com https://maps.googleapis.com",
      "frame-src 'none'",
    ].join("; "),
  };
}

// Request sanitization
export function sanitizeRequest(request: NextRequest): NextRequest {
  const url = new URL(request.url);
  
  // Remove potentially dangerous query parameters
  const dangerousParams = ["javascript:", "data:", "vbscript:", "onload", "onerror"];
  const searchParams = url.searchParams;
  
  for (const [key, value] of searchParams.entries()) {
    const lowerValue = value.toLowerCase();
    if (dangerousParams.some(param => lowerValue.includes(param))) {
      logger.security("Potentially dangerous query parameter detected", {
        parameter: key,
        value: value,
        url: request.url,
        ip: getClientIP(request),
      });
      searchParams.delete(key);
    }
  }
  
  return request;
}

// Get client IP address
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(",")[0].trim();
  
  return "unknown";
}

// Rate limiting by IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimitByIP(
  request: NextRequest,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  const ip = getClientIP(request);
  const now = Date.now();
  
  const current = rateLimitMap.get(ip);
  
  if (!current || current.resetTime < now) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    logger.security("Rate limit exceeded", {
      ip,
      count: current.count,
      maxRequests,
      windowMs,
      url: request.url,
    });
    return false;
  }
  
  current.count++;
  return true;
}

// Clean up old rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (data.resetTime < now) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

// Input sanitization
export type SanitizedInput = string | number | boolean | null | undefined | SanitizedInput[] | Record<string, unknown>;

export function sanitizeInput(input: unknown): SanitizedInput {
  if (typeof input === "string") {
    return sanitizeHtml(input, {
      allowedTags: [],
      allowedAttributes: {},
    });
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (typeof input === "object" && input !== null) {
    const sanitized: Record<string, SanitizedInput> = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key as keyof typeof input]);
    }
    return sanitized;
  }
  return input as SanitizedInput; // Handle null, undefined, numbers, booleans, etc.
}

// File upload security
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): boolean {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"],
  } = options;

  // Check file size
  if (file.size > maxSize) {
    throw new Error(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type must be one of: ${allowedTypes.join(", ")}`);
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
  if (!hasValidExtension) {
    throw new Error(`File extension must be one of: ${allowedExtensions.join(", ")}`);
  }

  // Check for potentially dangerous file names
  const dangerousPatterns = [
    /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|aspx|jsp)$/i,
    /\.(sh|bash|zsh|fish|ps1|psm1)$/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(fileName)) {
      throw new Error("File type not allowed for security reasons");
    }
  }

  return true;
}

// Generate secure random tokens
export function generateAccessToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

// Password hashing (if needed for future features)
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

// CSRF token generation and validation
const csrfTokens = new Map<string, { token: string; expires: number }>();

export function generateCSRFToken(sessionId: string): string {
  const token = generateSecureToken(32);
  const expires = Date.now() + 60 * 60 * 1000; // 1 hour
  
  csrfTokens.set(sessionId, { token, expires });
  
  // Clean up expired tokens
  for (const [id, data] of csrfTokens.entries()) {
    if (data.expires < Date.now()) {
      csrfTokens.delete(id);
    }
  }
  
  return token;
}

export function validateCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);
  
  if (!stored || stored.expires < Date.now()) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  return stored.token === token;
}

// SQL injection prevention (for MongoDB, this is less relevant but good practice)
export function sanitizeMongoQuery(query: unknown): unknown {
  if (typeof query === "string") {
    // Remove potentially dangerous characters
    return query.replace(/[;'"\\]/g, "");
  }
  
  if (Array.isArray(query)) {
    return query.map(sanitizeMongoQuery);
  }
  
  if (typeof query === "object" && query !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(query)) {
      sanitized[key] = sanitizeMongoQuery(value);
    }
    return sanitized;
  }
  
  return query;
}

// Security audit logging
export function logSecurityEvent(
  event: string,
  details: Record<string, unknown>,
  request?: NextRequest
): void {
  logger.security(event, {
    ...details,
    ...(request && {
      ip: getClientIP(request),
      userAgent: request.headers.get("user-agent"),
      url: request.url,
      method: request.method,
    }),
    timestamp: new Date().toISOString(),
  });
}

// Import required modules
import { randomBytes } from "crypto";
import sanitizeHtml from "sanitize-html";