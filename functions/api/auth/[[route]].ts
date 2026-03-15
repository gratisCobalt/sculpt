/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, generateUUID, nowISO } from '../../lib/db'
import { createToken, verifyPassword, getUserIdFromRequest, hashPassword } from '../../lib/auth'
import { verifyGoogleIdToken } from '../../lib/google'

// Auth API Routes for Cloudflare Pages Functions
// Handles: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
// Google OAuth: POST /api/auth/google, POST /api/auth/google/link, POST /api/auth/google/unlink

interface RequestContext {
  request: Request
  env: Env
  params: Record<string, string>
}

// POST /api/auth/register
async function handleRegister(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx
  
  try {
    const body = await request.json() as { email: string; password: string; displayName?: string }
    const { email, password, displayName } = body
    
    if (!email || !password) {
      return errorResponse('Email and password are required', 400)
    }
    
    // Check if user exists
    const existing = await env.database.prepare(
      'SELECT id FROM app_user WHERE email = ?'
    ).bind(email).first()
    
    if (existing) {
      return errorResponse('User already exists', 400)
    }
    
    // Hash password and create user
    const passwordHash = await hashPassword(password)
    const userId = generateUUID()
    const now = nowISO()
    
    await env.database.prepare(`
      INSERT INTO app_user (id, email, password_hash, display_name, auth_provider, onboarding_completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'email', 0, ?, ?)
    `).bind(userId, email, passwordHash, displayName || null, now, now).run()
    
    // Get the created user
    const user = await env.database.prepare(
      'SELECT id, email, display_name, onboarding_completed FROM app_user WHERE id = ?'
    ).bind(userId).first()
    
    // Create JWT token
    const token = await createToken(userId, env.JWT_SECRET)
    
    return jsonResponse({ user, token })
  } catch (error) {
    console.error('Register error:', error)
    return errorResponse('Registration failed', 500)
  }
}

// POST /api/auth/login
async function handleLogin(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx
  
  try {
    const body = await request.json() as { email: string; password: string }
    const { email, password } = body
    
    if (!email || !password) {
      return errorResponse('Email and password are required', 400)
    }
    
    // Get user
    const user = await env.database.prepare(
      'SELECT * FROM app_user WHERE email = ?'
    ).bind(email).first<Record<string, unknown>>()
    
    if (!user) {
      return errorResponse('Invalid credentials', 401)
    }
    
    if (!user.password_hash || typeof user.password_hash !== 'string') {
      return errorResponse('Invalid credentials', 401)
    }

    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return errorResponse('Invalid credentials', 401)
    }
    
    // Create JWT token
    const token = await createToken(user.id as string, env.JWT_SECRET)
    
    // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _hash, ...safeUser } = user

    return jsonResponse({ user: safeUser, token })
  } catch (error) {
    console.error('Login error:', error)
    return errorResponse('Login failed', 500)
  }
}

// GET /api/auth/me
async function handleMe(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  try {
    const userId = await getUserIdFromRequest(request, env)
    if (!userId) {
      return errorResponse('Unauthorized', 401)
    }

    const user = await env.database.prepare(`
      SELECT u.*, g.code as gender_code, g.name_de as gender_name
      FROM app_user u
      LEFT JOIN gender g ON u.gender_id = g.id
      WHERE u.id = ?
    `).bind(userId).first<Record<string, unknown>>()

    if (!user) {
      return errorResponse('User not found', 404)
    }

    // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _hash, ...safeUser } = user
    
    return jsonResponse(safeUser)
  } catch (error) {
    console.error('Get user error:', error)
    return errorResponse('Failed to get user', 500)
  }
}

// =====================================================
// GOOGLE OAUTH HANDLERS
// =====================================================

// Helper to create safe user response
function createSafeUserResponse(user: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _pw, ...safeUser } = user
  return safeUser
}

// POST /api/auth/google - Login or Register with Google
async function handleGoogleAuth(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx
  
  try {
    const body = await request.json() as { idToken: string }
    const { idToken } = body
    
    if (!idToken) {
      return errorResponse('Google ID token is required', 400)
    }
    
    // Verify the Google token
    const googleUser = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID)
    if (!googleUser) {
      return errorResponse('Invalid Google token', 401)
    }
    
    if (!googleUser.email_verified) {
      return errorResponse('Google email not verified', 400)
    }
    
    // Check if user exists by google_id
    let user = await env.database.prepare(
      'SELECT * FROM app_user WHERE google_id = ?'
    ).bind(googleUser.sub).first<Record<string, unknown>>()
    
    if (user) {
      // Existing Google user - login
      const token = await createToken(user.id as string, env.JWT_SECRET)
      return jsonResponse({ user: createSafeUserResponse(user), token, isNewUser: false })
    }
    
    // Check if user exists by email (for auto-linking)
    user = await env.database.prepare(
      'SELECT * FROM app_user WHERE email = ?'
    ).bind(googleUser.email).first<Record<string, unknown>>()
    
    if (user) {
      // Existing email user - auto-link Google account
      const now = nowISO()
      const newAuthProvider = user.auth_provider === 'email' ? 'both' : user.auth_provider
      
      await env.database.prepare(`
        UPDATE app_user 
        SET google_id = ?, auth_provider = ?, avatar_url = COALESCE(avatar_url, ?), updated_at = ?
        WHERE id = ?
      `).bind(googleUser.sub, newAuthProvider, googleUser.picture || null, now, user.id).run()
      
      // Fetch updated user
      user = await env.database.prepare(
        'SELECT * FROM app_user WHERE id = ?'
      ).bind(user.id).first<Record<string, unknown>>()
      
      const token = await createToken(user!.id as string, env.JWT_SECRET)
      return jsonResponse({ user: createSafeUserResponse(user!), token, isNewUser: false, linked: true })
    }
    
    // New user - register with Google
    const userId = generateUUID()
    const now = nowISO()
    const displayName = googleUser.name || googleUser.given_name || googleUser.email.split('@')[0]
    
    await env.database.prepare(`
      INSERT INTO app_user (id, email, google_id, display_name, full_name, avatar_url, auth_provider, onboarding_completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'google', 0, ?, ?)
    `).bind(
      userId, 
      googleUser.email, 
      googleUser.sub, 
      displayName,
      googleUser.name || null,
      googleUser.picture || null,
      now, 
      now
    ).run()
    
    // Get the created user
    user = await env.database.prepare(
      'SELECT * FROM app_user WHERE id = ?'
    ).bind(userId).first<Record<string, unknown>>()
    
    const token = await createToken(userId, env.JWT_SECRET)
    
    return jsonResponse({ user: createSafeUserResponse(user!), token, isNewUser: true })
  } catch (error) {
    console.error('Google auth error:', error)
    return errorResponse('Google authentication failed', 500)
  }
}

// POST /api/auth/google/link - Link Google to existing account
async function handleGoogleLink(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx
  
  try {
    const userId = await getUserIdFromRequest(request, env)
    if (!userId) {
      return errorResponse('Unauthorized', 401)
    }
    
    const body = await request.json() as { idToken: string }
    const { idToken } = body
    
    if (!idToken) {
      return errorResponse('Google ID token is required', 400)
    }
    
    // Verify the Google token
    const googleUser = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID)
    if (!googleUser) {
      return errorResponse('Invalid Google token', 401)
    }
    
    // Check if this google_id is already linked to another account
    const existingGoogleUser = await env.database.prepare(
      'SELECT id FROM app_user WHERE google_id = ? AND id != ?'
    ).bind(googleUser.sub, userId).first()
    
    if (existingGoogleUser) {
      return errorResponse('This Google account is already linked to another user', 400)
    }
    
    // Get current user
    const user = await env.database.prepare(
      'SELECT * FROM app_user WHERE id = ?'
    ).bind(userId).first<Record<string, unknown>>()
    
    if (!user) {
      return errorResponse('User not found', 404)
    }
    
    // Link Google account
    const now = nowISO()
    const newAuthProvider = user.auth_provider === 'email' || !user.auth_provider ? 'both' : user.auth_provider
    
    await env.database.prepare(`
      UPDATE app_user 
      SET google_id = ?, auth_provider = ?, avatar_url = COALESCE(avatar_url, ?), updated_at = ?
      WHERE id = ?
    `).bind(googleUser.sub, newAuthProvider, googleUser.picture || null, now, userId).run()
    
    // Fetch updated user
    const updatedUser = await env.database.prepare(
      'SELECT * FROM app_user WHERE id = ?'
    ).bind(userId).first<Record<string, unknown>>()
    
    return jsonResponse({ success: true, user: createSafeUserResponse(updatedUser!) })
  } catch (error) {
    console.error('Google link error:', error)
    return errorResponse('Failed to link Google account', 500)
  }
}

// POST /api/auth/google/unlink - Unlink Google from account
async function handleGoogleUnlink(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx
  
  try {
    const userId = await getUserIdFromRequest(request, env)
    if (!userId) {
      return errorResponse('Unauthorized', 401)
    }
    
    // Get current user
    const user = await env.database.prepare(
      'SELECT * FROM app_user WHERE id = ?'
    ).bind(userId).first<Record<string, unknown>>()
    
    if (!user) {
      return errorResponse('User not found', 404)
    }
    
    // Cannot unlink if Google is the only auth method
    if (user.auth_provider === 'google' && !user.password_hash) {
      return errorResponse('Cannot unlink Google - it is your only login method. Add a password first.', 400)
    }
    
    // Unlink Google account
    const now = nowISO()
    const newAuthProvider = user.password_hash ? 'email' : 'google'
    
    await env.database.prepare(`
      UPDATE app_user 
      SET google_id = NULL, auth_provider = ?, updated_at = ?
      WHERE id = ?
    `).bind(newAuthProvider, now, userId).run()
    
    // Fetch updated user
    const updatedUser = await env.database.prepare(
      'SELECT * FROM app_user WHERE id = ?'
    ).bind(userId).first<Record<string, unknown>>()
    
    return jsonResponse({ success: true, user: createSafeUserResponse(updatedUser!) })
  } catch (error) {
    console.error('Google unlink error:', error)
    return errorResponse('Failed to unlink Google account', 500)
  }
}

// Main request handler
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context
  const url = new URL(request.url)
  const path = url.pathname.replace('/api/auth', '')
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return corsResponse()
  }
  
  const ctx: RequestContext = { request, env, params: params as Record<string, string> }
  
  // Route matching
  if (request.method === 'POST' && path === '/register') {
    return handleRegister(ctx)
  }
  
  if (request.method === 'POST' && path === '/login') {
    return handleLogin(ctx)
  }
  
  if (request.method === 'GET' && path === '/me') {
    return handleMe(ctx)
  }
  
  // Google OAuth routes
  if (request.method === 'POST' && path === '/google') {
    return handleGoogleAuth(ctx)
  }
  
  if (request.method === 'POST' && path === '/google/link') {
    return handleGoogleLink(ctx)
  }
  
  if (request.method === 'POST' && path === '/google/unlink') {
    return handleGoogleUnlink(ctx)
  }
  
  return errorResponse('Not found', 404)
}
