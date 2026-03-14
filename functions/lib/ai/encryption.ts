/**
 * AES-256-GCM encryption for AI chat messages.
 * Key: 64-char hex string from AI_CHAT_ENCRYPTION_KEY env var.
 * Each message gets a unique 12-byte random IV.
 * Ciphertext stored as base64, IV stored as hex.
 */

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes.buffer
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const str = atob(b64)
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i)
  }
  return bytes.buffer
}

async function importKey(hexKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    hexToBuffer(hexKey),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(
  plaintext: string,
  encryptionKey: string
): Promise<{ ciphertext: string; iv: string }> {
  const key = await importKey(encryptionKey)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToHex(iv.buffer),
  }
}

export async function decrypt(
  ciphertext: string,
  iv: string,
  encryptionKey: string
): Promise<string> {
  const key = await importKey(encryptionKey)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBuffer(iv) },
    key,
    base64ToBuffer(ciphertext)
  )

  return new TextDecoder().decode(decrypted)
}
