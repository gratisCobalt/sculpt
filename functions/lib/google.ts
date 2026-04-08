/// <reference types="@cloudflare/workers-types" />

// =====================================================
// GOOGLE OAUTH HELPER
// =====================================================
// Verifies Google ID tokens using Google's tokeninfo endpoint

export interface GoogleUser {
  sub: string           // Google user ID
  email: string
  email_verified: boolean
  name?: string
  picture?: string
  given_name?: string
  family_name?: string
}

/**
 * Verify a Google ID token using Google's tokeninfo endpoint
 * This is the recommended approach for server-side verification
 */
export async function verifyGoogleIdToken(idToken: string, clientId: string, additionalClientIds?: string[]): Promise<GoogleUser | null> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    )

    if (!response.ok) {
      console.error('Google token verification failed:', response.status)
      return null
    }

    const payload = await response.json() as Record<string, unknown>

    // Verify the token was issued for one of our clients (web or iOS)
    const validClientIds = [clientId, ...(additionalClientIds ?? [])].filter(Boolean)
    if (!validClientIds.includes(payload.aud as string)) {
      console.error('Token audience mismatch:', payload.aud, 'not in', validClientIds)
      return null
    }
    
    // Check token is not expired (tokeninfo already validates this, but double-check)
    const expiry = Number(payload.exp) * 1000
    if (Date.now() > expiry) {
      console.error('Token expired')
      return null
    }
    
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      email_verified: payload.email_verified === 'true' || payload.email_verified === true,
      name: payload.name as string | undefined,
      picture: payload.picture as string | undefined,
      given_name: payload.given_name as string | undefined,
      family_name: payload.family_name as string | undefined,
    }
  } catch (error) {
    console.error('Error verifying Google token:', error)
    return null
  }
}
