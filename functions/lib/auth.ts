/// <reference types="@cloudflare/workers-types" />
import type { Env } from './types'
import { errorResponse } from './db'

// =====================================================
// AUTHENTICATION WITH PBKDF2
// =====================================================
// Uses Web Crypto API for secure password hashing
// PBKDF2 with SHA-256, 100,000 iterations (OWASP recommended)

const PBKDF2_ITERATIONS = 100000
const SALT_LENGTH = 16
const KEY_LENGTH = 32

// =====================================================
// PASSWORD HASHING (PBKDF2)
// =====================================================

/**
 * Hash a password using PBKDF2-SHA256
 * Returns format: base64(salt):base64(hash)
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  
  // Derive key using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8
  )
  
  // Convert to base64
  const hashArray = new Uint8Array(derivedBits)
  const saltB64 = btoa(String.fromCharCode(...salt))
  const hashB64 = btoa(String.fromCharCode(...hashArray))
  
  return `${saltB64}:${hashB64}`
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [saltB64, hashB64] = storedHash.split(':')
    if (!saltB64 || !hashB64) return false
    
    // Decode salt from base64
    const saltString = atob(saltB64)
    const salt = new Uint8Array(saltString.length)
    for (let i = 0; i < saltString.length; i++) {
      salt[i] = saltString.charCodeAt(i)
    }
    
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    )
    
    // Derive key using PBKDF2 with same salt
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      KEY_LENGTH * 8
    )
    
    // Convert to base64 and compare
    const hashArray = new Uint8Array(derivedBits)
    const computedHashB64 = btoa(String.fromCharCode(...hashArray))
    
    return computedHashB64 === hashB64
  } catch {
    return false
  }
}

// =====================================================
// JWT TOKENS (Web Crypto HMAC-SHA256)
// =====================================================

interface JWTPayload {
  userId: string
  exp: number
  iat: number
}

/**
 * Create a JWT token using HMAC-SHA256
 */
export async function createToken(userId: string, secret: string, expiresInDays = 7): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload: JWTPayload = {
    userId,
    iat: now,
    exp: now + (expiresInDays * 24 * 60 * 60),
  }

  const headerB64 = base64UrlEncode(JSON.stringify(header))
  const payloadB64 = base64UrlEncode(JSON.stringify(payload))
  const data = `${headerB64}.${payloadB64}`

  // Sign using Web Crypto API
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const signatureB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))

  return `${data}.${signatureB64}`
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, signatureB64] = parts
    const data = `${headerB64}.${payloadB64}`

    // Verify signature
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Decode signature from base64url
    const signatureStr = base64UrlDecode(signatureB64)
    const signature = new Uint8Array(signatureStr.length)
    for (let i = 0; i < signatureStr.length; i++) {
      signature[i] = signatureStr.charCodeAt(i)
    }

    const valid = await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(data))
    if (!valid) return null

    // Decode payload
    const payload: JWTPayload = JSON.parse(base64UrlDecode(payloadB64))

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null

    return payload
  } catch {
    return null
  }
}

// =====================================================
// AUTH HELPERS
// =====================================================

/**
 * Extract user ID from Authorization header
 */
export async function getUserIdFromRequest(request: Request, env: Env): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const payload = await verifyToken(token, env.JWT_SECRET)
  return payload?.userId ?? null
}

/**
 * Middleware helper that requires authentication
 */
export async function withAuth(
  request: Request,
  env: Env,
  handler: (userId: string) => Promise<Response>
): Promise<Response> {
  const userId = await getUserIdFromRequest(request, env)
  if (!userId) {
    return errorResponse('Unauthorized', 401)
  }
  return handler(userId)
}

// =====================================================
// BASE64URL HELPERS
// =====================================================

function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = str.length % 4
  if (pad) {
    str += '='.repeat(4 - pad)
  }
  return atob(str)
}
