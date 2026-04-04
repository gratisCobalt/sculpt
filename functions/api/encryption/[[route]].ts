/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, nowISO } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// Encryption Key API Routes (E2E Chat)
// Handles: GET /api/encryption/keys, POST /api/encryption/keys

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname

  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  if (path !== '/api/encryption/keys') {
    return errorResponse('Not found', 404)
  }

  // GET /api/encryption/keys - Get user's own keys
  if (request.method === 'GET') {
    try {
      const keys = await env.database.prepare(
        'SELECT identity_public_key, signed_prekey_public, signed_prekey_signature FROM user_encryption_key WHERE user_id = ?'
      ).bind(userId).first()

      return jsonResponse(keys || null)
    } catch (error) {
      console.error('Get encryption keys error:', error)
      return errorResponse('Failed to get encryption keys', 500)
    }
  }

  // POST /api/encryption/keys - Upload keys
  if (request.method === 'POST') {
    try {
      const body = await request.json() as {
        identityPublicKey: string
        signedPrekeyPublic: string
        signedPrekeySignature: string
        prekeys: Array<{ id: number; publicKey: string }>
      }

      const now = nowISO()

      // Upsert identity + signed prekey
      await env.database.prepare(`
        INSERT INTO user_encryption_key (user_id, identity_public_key, signed_prekey_public, signed_prekey_signature, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id)
        DO UPDATE SET identity_public_key = ?, signed_prekey_public = ?, signed_prekey_signature = ?, updated_at = ?
      `).bind(
        userId,
        body.identityPublicKey,
        body.signedPrekeyPublic,
        body.signedPrekeySignature,
        now, now,
        body.identityPublicKey,
        body.signedPrekeyPublic,
        body.signedPrekeySignature,
        now
      ).run()

      // Upload one-time prekeys
      if (body.prekeys && body.prekeys.length > 0) {
        for (const prekey of body.prekeys) {
          await env.database.prepare(`
            INSERT INTO user_prekey (user_id, prekey_id, public_key, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, prekey_id) DO UPDATE SET public_key = ?, is_used = 0
          `).bind(userId, prekey.id, prekey.publicKey, now, prekey.publicKey).run()
        }
      }

      return jsonResponse({ success: true })
    } catch (error) {
      console.error('Upload encryption keys error:', error)
      return errorResponse('Failed to upload encryption keys', 500)
    }
  }

  return errorResponse('Method not allowed', 405)
}
