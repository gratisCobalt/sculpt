/// <reference types="@cloudflare/workers-types" />

// Cloudflare Pages Function Environment Types
export interface Env {
  database: D1Database
  JWT_SECRET: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  // AI Provider
  AI_PROVIDER: string
  OLLAMA_BASE_URL: string
  OLLAMA_API_KEY: string
  OLLAMA_MODEL: string
  AI_CHAT_ENCRYPTION_KEY: string
}

// Request context with user info
export interface AuthenticatedRequest {
  userId: string
}
