# AI Provider Abstraction Layer — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a central AI provider layer with Ollama Cloud (Qwen 3.5 397B), powering KI-Coach chat with streaming and AI training plan generation, with encrypted server-side chat persistence.

**Architecture:** Provider abstraction in `functions/lib/ai/` with factory pattern. Single route handler `functions/api/ai/[[route]].ts` for all AI endpoints. Frontend streams SSE responses for chat, uses non-streaming for plan generation.

**Tech Stack:** Cloudflare Pages Functions, D1 SQLite, Web Crypto API (AES-256-GCM), Ollama Cloud API, React, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-14-ai-provider-abstraction-design.md`

---

## Chunk 1: Backend Foundation (Provider Layer + Encryption + DB)

### Task 1: Database Migration

**Files:**
- Create: `db/d1/009_ai_conversations.sql`
- Create: `db/init/008_ai_conversations.sql`

- [ ] **Step 1: Create D1 migration file**

Create `db/d1/009_ai_conversations.sql`:

```sql
-- AI Conversation Storage (encrypted)
CREATE TABLE IF NOT EXISTS ai_conversation (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_user ON ai_conversation(user_id);

CREATE TABLE IF NOT EXISTS ai_message (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES ai_conversation(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content_encrypted TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_message_conversation ON ai_message(conversation_id);
```

- [ ] **Step 2: Create init migration file**

Create `db/init/008_ai_conversations.sql` with identical content.

- [ ] **Step 3: Apply migration to dev database**

Run: `npx wrangler d1 execute sculpt-dev --local --file=db/d1/009_ai_conversations.sql`
Expected: Tables created successfully

- [ ] **Step 4: Commit**

```bash
git add db/d1/009_ai_conversations.sql db/init/008_ai_conversations.sql
git commit -m "feat: add ai_conversation and ai_message tables"
```

---

### Task 2: Update Env Types + wrangler.toml

**Files:**
- Modify: `functions/lib/types.ts`
- Modify: `wrangler.toml`

- [ ] **Step 1: Add AI env vars to Env interface**

In `functions/lib/types.ts`, add to the `Env` interface:

```typescript
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
```

- [ ] **Step 2: Add non-secret vars to wrangler.toml**

Add to `[vars]` section:

```toml
[vars]
AI_PROVIDER = "ollama"
OLLAMA_BASE_URL = "https://ollama.com"
OLLAMA_MODEL = "qwen3.5:397b-cloud"
```

And to `[env.production.vars]`:

```toml
[env.production.vars]
AI_PROVIDER = "ollama"
OLLAMA_BASE_URL = "https://ollama.com"
OLLAMA_MODEL = "qwen3.5:397b-cloud"
```

- [ ] **Step 3: Create .dev.vars entries for local dev**

Check if `.dev.vars` exists (it should, for JWT_SECRET). Add:

```
OLLAMA_API_KEY=your-key-here
AI_CHAT_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
```

(Placeholder encryption key for dev — 64 hex zeros.)

- [ ] **Step 4: Commit**

```bash
git add functions/lib/types.ts wrangler.toml
git commit -m "feat: add AI environment variables to Env interface and wrangler.toml"
```

---

### Task 3: Encryption Utility

**Files:**
- Create: `functions/lib/ai/encryption.ts`

- [ ] **Step 1: Create encryption module**

Create `functions/lib/ai/encryption.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add functions/lib/ai/encryption.ts
git commit -m "feat: add AES-256-GCM encryption utility for AI chat messages"
```

---

### Task 4: AI Provider Types + Interface

**Files:**
- Create: `functions/lib/ai/types.ts`

- [ ] **Step 1: Create types file**

Create `functions/lib/ai/types.ts`:

```typescript
export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIStreamOptions {
  model?: string
  temperature?: number
  systemPrompt?: string
}

export interface AIProvider {
  chat(messages: AIMessage[], options?: AIStreamOptions): Promise<ReadableStream>
  chatSync(messages: AIMessage[], options?: AIStreamOptions): Promise<string>
}

export interface AIProviderConfig {
  provider: string
  ollamaBaseUrl: string
  ollamaApiKey: string
  ollamaModel: string
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/lib/ai/types.ts
git commit -m "feat: add AI provider interface and types"
```

---

### Task 5: Ollama Cloud Provider

**Files:**
- Create: `functions/lib/ai/providers/ollama.ts`

- [ ] **Step 1: Create Ollama provider**

Create `functions/lib/ai/providers/ollama.ts`:

```typescript
import type { AIProvider, AIMessage, AIStreamOptions } from '../types'

export class OllamaProvider implements AIProvider {
  private baseUrl: string
  private apiKey: string
  private defaultModel: string

  constructor(baseUrl: string, apiKey: string, defaultModel: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.defaultModel = defaultModel
  }

  async chat(messages: AIMessage[], options?: AIStreamOptions): Promise<ReadableStream> {
    const allMessages = options?.systemPrompt
      ? [{ role: 'system' as const, content: options.systemPrompt }, ...messages]
      : messages

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || this.defaultModel,
        messages: allMessages,
        stream: true,
        ...(options?.temperature !== undefined && {
          options: { temperature: options.temperature },
        }),
      }),
    })

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error')
      throw new Error(`Ollama API error (${response.status}): ${error}`)
    }

    if (!response.body) {
      throw new Error('Ollama API returned no body')
    }

    return response.body
  }

  async chatSync(messages: AIMessage[], options?: AIStreamOptions): Promise<string> {
    const allMessages = options?.systemPrompt
      ? [{ role: 'system' as const, content: options.systemPrompt }, ...messages]
      : messages

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || this.defaultModel,
        messages: allMessages,
        stream: false,
        ...(options?.temperature !== undefined && {
          options: { temperature: options.temperature },
        }),
      }),
    })

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error')
      throw new Error(`Ollama API error (${response.status}): ${error}`)
    }

    const data = await response.json() as { message: { content: string } }
    return data.message.content
  }
}
```

Note: `chatSync` is for non-streaming use cases like training plan generation.

- [ ] **Step 2: Commit**

```bash
git add functions/lib/ai/providers/ollama.ts
git commit -m "feat: add Ollama Cloud provider implementation"
```

---

### Task 6: Provider Factory

**Files:**
- Create: `functions/lib/ai/provider.ts`

- [ ] **Step 1: Create factory**

Create `functions/lib/ai/provider.ts`:

```typescript
import type { Env } from '../types'
import type { AIProvider } from './types'
import { OllamaProvider } from './providers/ollama'

export function getProvider(env: Env): AIProvider {
  switch (env.AI_PROVIDER) {
    case 'ollama':
      return new OllamaProvider(
        env.OLLAMA_BASE_URL,
        env.OLLAMA_API_KEY,
        env.OLLAMA_MODEL
      )
    default:
      throw new Error(`Unknown AI provider: ${env.AI_PROVIDER}`)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/lib/ai/provider.ts
git commit -m "feat: add AI provider factory"
```

---

## Chunk 2: Backend API Endpoints

### Task 7: AI Route Handler — Chat Streaming

**Files:**
- Create: `functions/api/ai/[[route]].ts`

- [ ] **Step 1: Create the route handler with chat endpoint**

Create `functions/api/ai/[[route]].ts`:

```typescript
/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, generateUUID, nowISO } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'
import { getProvider } from '../../lib/ai/provider'
import { encrypt, decrypt } from '../../lib/ai/encryption'
import type { AIMessage } from '../../lib/ai/types'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const CHAT_SYSTEM_PROMPT = `Du bist ein erfahrener Fitness-Coach in der Sculpt App. Du hilfst Nutzern mit Trainingstipps, Ernährungsberatung und Motivation. Antworte auf Deutsch, freundlich und motivierend. Halte Antworten kompakt und praxisnah. Wenn du dir bei medizinischen Fragen unsicher bist, empfehle den Besuch eines Arztes.`

const MAX_MESSAGE_LENGTH = 2000
const MAX_MESSAGES_PER_CONVERSATION = 100
const MAX_CONVERSATIONS_PER_USER = 50

interface RequestContext {
  request: Request
  env: Env
  url: URL
}

// POST /api/ai/chat — Streaming AI chat
async function handleChat(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const body = await request.json() as {
    conversationId?: string
    messages: { role: string; content: string }[]
    systemPrompt?: string
    temperature?: number
  }

  if (!body.messages?.length || body.messages.length !== 1) {
    return errorResponse('Exactly one message is required', 400)
  }

  const userMessage = body.messages[0]
  if (userMessage.role !== 'user' || !userMessage.content?.trim()) {
    return errorResponse('Message must be a non-empty user message', 400)
  }
  if (userMessage.content.length > MAX_MESSAGE_LENGTH) {
    return errorResponse(`Message must be ${MAX_MESSAGE_LENGTH} characters or less`, 400)
  }

  try {
    // Rate limiting: 20 requests per minute per user
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
    const recentCount = await env.database.prepare(
      `SELECT COUNT(*) as count FROM ai_message
       WHERE conversation_id IN (SELECT id FROM ai_conversation WHERE user_id = ?)
       AND role = 'user' AND created_at > ?`
    ).bind(userId, oneMinuteAgo).first<{ count: number }>()

    if (recentCount && recentCount.count >= 20) {
      return errorResponse('Rate limit exceeded. Please wait a moment.', 429)
    }

    // Get or create conversation
    let conversationId = body.conversationId
    let existingMessages: AIMessage[] = []

    if (conversationId) {
      // Verify ownership
      const conv = await env.database.prepare(
        'SELECT id FROM ai_conversation WHERE id = ? AND user_id = ?'
      ).bind(conversationId, userId).first()
      if (!conv) return errorResponse('Conversation not found', 404)

      // Load history (last N messages for context, ordered chronologically)
      const history = await env.database.prepare(
        `SELECT role, content_encrypted, iv FROM (
           SELECT * FROM ai_message WHERE conversation_id = ?
           ORDER BY created_at DESC LIMIT ?
         ) ORDER BY created_at ASC`
      ).bind(conversationId, MAX_MESSAGES_PER_CONVERSATION).all()

      for (const row of (history.results || []) as Record<string, unknown>[]) {
        const content = await decrypt(
          row.content_encrypted as string,
          row.iv as string,
          env.AI_CHAT_ENCRYPTION_KEY
        )
        existingMessages.push({ role: row.role as AIMessage['role'], content })
      }
    } else {
      // Enforce conversation limit
      const countResult = await env.database.prepare(
        'SELECT COUNT(*) as count FROM ai_conversation WHERE user_id = ?'
      ).bind(userId).first<{ count: number }>()

      if (countResult && countResult.count >= MAX_CONVERSATIONS_PER_USER) {
        // Delete oldest conversation
        const oldest = await env.database.prepare(
          'SELECT id FROM ai_conversation WHERE user_id = ? ORDER BY updated_at ASC LIMIT 1'
        ).bind(userId).first<{ id: string }>()
        if (oldest) {
          await env.database.prepare('DELETE FROM ai_conversation WHERE id = ?').bind(oldest.id).run()
        }
      }

      conversationId = generateUUID()
      const title = userMessage.content.substring(0, 100)
      const now = nowISO()
      await env.database.prepare(
        'INSERT INTO ai_conversation (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(conversationId, userId, title, now, now).run()
    }

    // Persist user message
    const userMsgEncrypted = await encrypt(userMessage.content, env.AI_CHAT_ENCRYPTION_KEY)
    await env.database.prepare(
      'INSERT INTO ai_message (id, conversation_id, role, content_encrypted, iv, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(generateUUID(), conversationId, 'user', userMsgEncrypted.ciphertext, userMsgEncrypted.iv, nowISO()).run()

    // Build messages for AI: history + new user message
    const aiMessages: AIMessage[] = [
      ...existingMessages,
      { role: 'user' as const, content: userMessage.content },
    ]

    const systemPrompt = body.systemPrompt || CHAT_SYSTEM_PROMPT
    const provider = getProvider(env)
    const providerStream = await provider.chat(aiMessages, {
      systemPrompt,
      temperature: body.temperature ?? 0.7,
    })

    // Transform NDJSON from Ollama → SSE for client
    // Also buffer the full response for DB persistence
    let fullResponse = ''
    const finalConvId = conversationId
    const encKey = env.AI_CHAT_ENCRYPTION_KEY
    const db = env.database

    const sseStream = new ReadableStream({
      async start(controller) {
        // Send conversation ID as first event
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ conversationId: finalConvId })}\n\n`)
        )

        const reader = providerStream.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.trim()) continue
              try {
                const parsed = JSON.parse(line)
                const content = parsed.message?.content || ''
                if (content) {
                  fullResponse += content
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
                  )
                }
              } catch {
                // Skip unparseable lines
              }
            }
          }

          // Process remaining buffer
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer)
              const content = parsed.message?.content || ''
              if (content) {
                fullResponse += content
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
                )
              }
            } catch {
              // Skip
            }
          }

          // Send done event
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))

          // Persist assistant response
          const assistantEncrypted = await encrypt(fullResponse, encKey)
          await db.prepare(
            'INSERT INTO ai_message (id, conversation_id, role, content_encrypted, iv, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(generateUUID(), finalConvId, 'assistant', assistantEncrypted.ciphertext, assistantEncrypted.iv, nowISO()).run()

          // Update conversation timestamp
          await db.prepare(
            'UPDATE ai_conversation SET updated_at = ? WHERE id = ?'
          ).bind(nowISO(), finalConvId).run()

          controller.close()
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Stream error'
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
          )
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))

          // Persist partial response if any
          if (fullResponse) {
            const partialEncrypted = await encrypt(fullResponse, encKey)
            await db.prepare(
              'INSERT INTO ai_message (id, conversation_id, role, content_encrypted, iv, created_at) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(generateUUID(), finalConvId, 'assistant', partialEncrypted.ciphertext, partialEncrypted.iv, nowISO()).run()
          }

          controller.close()
        }
      },
    })

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...CORS_HEADERS,
      },
    })
  } catch (error) {
    console.error('AI chat error:', error)
    return errorResponse('AI chat failed', 500)
  }
}

// GET /api/ai/conversations — List conversations
async function handleListConversations(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const result = await env.database.prepare(
    'SELECT id, title, created_at, updated_at FROM ai_conversation WHERE user_id = ? ORDER BY updated_at DESC'
  ).bind(userId).all()

  return jsonResponse(result.results || [])
}

// GET /api/ai/conversations/:id — Get conversation messages
async function handleGetConversation(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/ai\/conversations\/([^/]+)$/)
  if (!match) return errorResponse('Invalid path', 400)
  const conversationId = match[1]

  // Verify ownership
  const conv = await env.database.prepare(
    'SELECT id, title, created_at, updated_at FROM ai_conversation WHERE id = ? AND user_id = ?'
  ).bind(conversationId, userId).first()
  if (!conv) return errorResponse('Conversation not found', 404)

  // Load messages
  const messagesResult = await env.database.prepare(
    'SELECT id, role, content_encrypted, iv, created_at FROM ai_message WHERE conversation_id = ? ORDER BY created_at ASC'
  ).bind(conversationId).all()

  const messages = []
  for (const row of (messagesResult.results || []) as Record<string, unknown>[]) {
    const content = await decrypt(
      row.content_encrypted as string,
      row.iv as string,
      env.AI_CHAT_ENCRYPTION_KEY
    )
    messages.push({
      id: row.id,
      role: row.role,
      content,
      created_at: row.created_at,
    })
  }

  return jsonResponse({
    ...(conv as Record<string, unknown>),
    messages,
  })
}

// DELETE /api/ai/conversations/:id — Delete conversation
async function handleDeleteConversation(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/ai\/conversations\/([^/]+)$/)
  if (!match) return errorResponse('Invalid path', 400)
  const conversationId = match[1]

  // Verify ownership
  const conv = await env.database.prepare(
    'SELECT id FROM ai_conversation WHERE id = ? AND user_id = ?'
  ).bind(conversationId, userId).first()
  if (!conv) return errorResponse('Conversation not found', 404)

  await env.database.prepare('DELETE FROM ai_conversation WHERE id = ?').bind(conversationId).run()
  return jsonResponse({ success: true })
}

// POST /api/ai/generate-plan — AI training plan generation
async function handleGeneratePlan(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const body = await request.json() as {
    fitness_goal: string
    experience_level: string
    training_frequency: number
    focus_areas: string[]
    body_weight_kg?: number
    available_exercises?: number[]
  }

  if (!body.fitness_goal || !body.experience_level || !body.training_frequency) {
    return errorResponse('fitness_goal, experience_level, and training_frequency are required', 400)
  }

  try {
    // Load available exercises from DB
    let exerciseQuery = 'SELECT id, name FROM exercise'
    const params: unknown[] = []

    if (body.available_exercises?.length) {
      const placeholders = body.available_exercises.map(() => '?').join(',')
      exerciseQuery += ` WHERE id IN (${placeholders})`
      params.push(...body.available_exercises)
    } else {
      // Limit to representative subset grouped by body part
      exerciseQuery += ' ORDER BY name LIMIT 200'
    }

    const exercisesResult = await env.database.prepare(exerciseQuery).bind(...params).all()
    const exercises = (exercisesResult.results || []) as { id: number; name: string }[]
    const exerciseNames = exercises.map(e => e.name)
    const exerciseMap = new Map(exercises.map(e => [e.name.toLowerCase(), e.id]))

    // Build system prompt
    const systemPrompt = `Du bist ein Fitness-Experte. Erstelle einen personalisierten Trainingsplan als JSON.
Der Plan soll zum Fitnessziel, den Fokus-Bereichen und dem Erfahrungslevel des Nutzers passen.
Du DARFST NUR Übungen aus der folgenden Liste verwenden (exakte Namen!): ${exerciseNames.join(', ')}
Antworte NUR mit validem JSON im folgenden Format:
{
  "name": "Plan Name",
  "name_de": "Plan Name DE",
  "description": "English description",
  "description_de": "Deutsche Beschreibung",
  "days": [{
    "day_number": 1,
    "name": "Push Day",
    "name_de": "Drück-Tag",
    "focus_description": "Brust, Schultern, Trizeps",
    "exercises": [{
      "exercise_name": "Bench Press",
      "sets": 4,
      "min_reps": 8,
      "max_reps": 12,
      "rest_seconds": 90,
      "notes": "Kontrollierte Bewegung"
    }]
  }]
}`

    const userPrompt = `Erstelle einen Trainingsplan mit folgenden Anforderungen:
- Fitnessziel: ${body.fitness_goal}
- Erfahrungslevel: ${body.experience_level}
- Trainingsfrequenz: ${body.training_frequency} Tage pro Woche
- Fokus-Bereiche: ${body.focus_areas.join(', ')}
${body.body_weight_kg ? `- Körpergewicht: ${body.body_weight_kg} kg` : ''}`

    // Call AI (non-streaming)
    const provider = getProvider(env)
    const aiResponse = await provider.chatSync(
      [{ role: 'user', content: userPrompt }],
      { systemPrompt, temperature: 0.7 }
    )

    // Parse JSON from AI response (handle markdown code blocks)
    let jsonStr = aiResponse.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }
    const plan = JSON.parse(jsonStr) as {
      name: string
      name_de: string
      description: string
      description_de: string
      days: {
        day_number: number
        name: string
        name_de: string
        focus_description: string
        exercises: {
          exercise_name: string
          sets: number
          min_reps: number
          max_reps: number
          rest_seconds: number
          notes: string
        }[]
      }[]
    }

    // Insert training plan
    const now = nowISO()
    const planResult = await env.database.prepare(
      `INSERT INTO training_plan (name, name_de, description, description_de, created_by_id, is_system_plan, days_per_week, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`
    ).bind(
      plan.name, plan.name_de, plan.description, plan.description_de,
      userId, body.training_frequency, now, now
    ).run()

    const planId = planResult.meta.last_row_id

    // Insert days and exercises
    for (const day of plan.days) {
      const dayResult = await env.database.prepare(
        'INSERT INTO training_plan_day (training_plan_id, day_number, name, name_de, focus_description) VALUES (?, ?, ?, ?, ?)'
      ).bind(planId, day.day_number, day.name, day.name_de, day.focus_description).run()

      const dayId = dayResult.meta.last_row_id

      for (let i = 0; i < day.exercises.length; i++) {
        const ex = day.exercises[i]
        const exerciseId = exerciseMap.get(ex.exercise_name.toLowerCase())

        if (!exerciseId) {
          console.warn(`Exercise not found in DB: "${ex.exercise_name}" — skipping`)
          continue
        }

        await env.database.prepare(
          `INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps, rest_seconds, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(dayId, exerciseId, i + 1, ex.sets, ex.min_reps, ex.max_reps, ex.rest_seconds, ex.notes || null).run()
      }
    }

    // Assign plan to user
    await env.database.prepare(
      'UPDATE user_training_plan SET is_active = 0 WHERE user_id = ?'
    ).bind(userId).run()

    await env.database.prepare(
      `INSERT INTO user_training_plan (user_id, training_plan_id, current_day, started_at, is_active)
       VALUES (?, ?, 1, ?, 1)
       ON CONFLICT(user_id, training_plan_id)
       DO UPDATE SET is_active = 1, current_day = 1, started_at = ?`
    ).bind(userId, planId, now, now).run()

    return jsonResponse({
      success: true,
      plan_id: planId,
      plan_name: plan.name_de || plan.name,
    })
  } catch (error) {
    console.error('AI plan generation error:', error)
    const message = error instanceof SyntaxError
      ? 'AI returned invalid JSON. Please try again.'
      : 'Failed to generate training plan'
    return errorResponse(message, 500)
  }
}

// Main request handler
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname

  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  const ctx: RequestContext = { request, env, url }

  // POST /api/ai/chat
  if (request.method === 'POST' && path === '/api/ai/chat') {
    return handleChat(ctx)
  }

  // POST /api/ai/generate-plan
  if (request.method === 'POST' && path === '/api/ai/generate-plan') {
    return handleGeneratePlan(ctx)
  }

  // GET /api/ai/conversations
  if (request.method === 'GET' && path === '/api/ai/conversations') {
    return handleListConversations(ctx)
  }

  // GET /api/ai/conversations/:id
  if (request.method === 'GET' && path.match(/^\/api\/ai\/conversations\/[^/]+$/)) {
    return handleGetConversation(ctx)
  }

  // DELETE /api/ai/conversations/:id
  if (request.method === 'DELETE' && path.match(/^\/api\/ai\/conversations\/[^/]+$/)) {
    return handleDeleteConversation(ctx)
  }

  return errorResponse('Not found', 404)
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | head -20`
Fix any type errors.

- [ ] **Step 3: Commit**

```bash
git add functions/api/ai/[[route]].ts
git commit -m "feat: add AI route handler with chat streaming, conversations CRUD, and plan generation"
```

---

## Chunk 3: Frontend — API Client + ChatPage

### Task 8: API Client Methods

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Add AI methods to ApiClient**

In `src/lib/api.ts`, add a new section after the existing CHAT (E2E Encrypted) section, before PUSH NOTIFICATIONS:

```typescript
  // =====================================================
  // AI COACH
  // =====================================================

  async chatStream(params: {
    conversationId?: string
    messages: { role: string; content: string }[]
    systemPrompt?: string
    temperature?: number
  }): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const res = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || 'Chat request failed')
    }

    return res
  }

  async getConversations() {
    return this.request<{
      id: string
      title: string
      created_at: string
      updated_at: string
    }[]>('/api/ai/conversations')
  }

  async getConversation(id: string) {
    return this.request<{
      id: string
      title: string
      created_at: string
      updated_at: string
      messages: {
        id: string
        role: 'user' | 'assistant'
        content: string
        created_at: string
      }[]
    }>(`/api/ai/conversations/${id}`)
  }

  async deleteConversation(id: string) {
    return this.request<{ success: boolean }>(`/api/ai/conversations/${id}`, {
      method: 'DELETE',
    })
  }
```

- [ ] **Step 2: Update generateTrainingPlan to use new endpoint**

Replace the existing `generateTrainingPlan` method (around line 223) to point to the new endpoint:

```typescript
  async generateTrainingPlan(data: {
    fitness_goal: string
    experience_level: string
    training_frequency: number
    focus_areas: string[]
    body_weight_kg?: number
  }) {
    return this.request<{
      success: boolean
      plan_id: number
      plan_name: string
    }>('/api/ai/generate-plan', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: add AI chat and conversation API client methods, update generateTrainingPlan endpoint"
```

---

### Task 9: ChatPage — Full Implementation with Streaming

**Files:**
- Modify: `src/pages/ChatPage.tsx`

- [ ] **Step 1: Rewrite ChatPage with streaming chat and conversation management**

Replace the entire content of `src/pages/ChatPage.tsx`:

```tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Loader2, Plus, Trash2, MessageSquare, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export default function ChatPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    try {
      const convs = await api.getConversations()
      setConversations(convs)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  async function loadConversation(id: string) {
    try {
      const conv = await api.getConversation(id)
      setActiveConversationId(id)
      setMessages(conv.messages.map(m => ({
        ...m,
        created_at: m.created_at,
      })))
      setShowSidebar(false)
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }

  async function deleteConversation(id: string) {
    try {
      await api.deleteConversation(id)
      setConversations(prev => prev.filter(c => c.id !== id))
      if (activeConversationId === id) {
        setActiveConversationId(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  function startNewConversation() {
    setActiveConversationId(null)
    setMessages([])
    setShowSidebar(false)
  }

  async function handleSend() {
    if (!input.trim() || isStreaming) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)

    // Add placeholder for assistant message
    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    }])

    try {
      const response = await api.chatStream({
        conversationId: activeConversationId || undefined,
        messages: [{ role: 'user', content: userMessage.content }],
      })

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)

          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            if (parsed.conversationId) {
              setActiveConversationId(parsed.conversationId)
              continue
            }
            if (parsed.error) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + `\n\n[Fehler: ${parsed.error}]` }
                  : m
              ))
              continue
            }
            if (parsed.content) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + parsed.content }
                  : m
              ))
            }
          } catch {
            // Skip unparseable
          }
        }
      }

      // Refresh conversations list
      await loadConversations()
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'Entschuldigung, es gab ein Problem bei der Verarbeitung. Bitte versuche es erneut.' }
          : m
      ))
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen flex flex-col pb-24 safe-top">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[hsl(var(--border))]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-1">
              <MessageSquare className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            </button>
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <h1 className="font-semibold">KI-Coach</h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Immer für dich da
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={startNewConversation}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Sidebar overlay */}
      {showSidebar && (
        <div className="absolute inset-0 z-50 flex">
          <div className="w-72 bg-[hsl(var(--background))] border-r border-[hsl(var(--border))] p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Chats</h2>
              <button onClick={() => setShowSidebar(false)}>
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={startNewConversation}
              className="w-full flex items-center gap-2 p-3 rounded-lg glass mb-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Neuer Chat
            </button>
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg mb-1 cursor-pointer text-sm',
                  activeConversationId === conv.id ? 'glass' : 'hover:bg-[hsl(var(--surface))]'
                )}
              >
                <span
                  className="truncate flex-1"
                  onClick={() => loadConversation(conv.id)}
                >
                  {conv.title || 'Neuer Chat'}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                  className="p-1 opacity-50 hover:opacity-100"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setShowSidebar(false)} />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
            <Bot className="w-12 h-12 mb-4 text-[hsl(var(--primary))]" />
            <p className="text-sm">
              Hallo {user?.display_name || 'Athlet'}! Wie kann ich dir helfen?
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 animate-fade-in',
              message.role === 'user' && 'flex-row-reverse'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                message.role === 'assistant'
                  ? 'gradient-primary'
                  : 'bg-[hsl(var(--surface-strong))]'
              )}
            >
              {message.role === 'assistant' ? (
                <Bot className="w-4 h-4 text-gray-900" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3',
                message.role === 'assistant'
                  ? 'glass'
                  : 'gradient-primary text-gray-900'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content || '\u200B'}</p>
            </div>
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-gray-900" />
            </div>
            <div className="glass rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--primary))]" />
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  Denkt nach...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]">
        <div className="flex gap-3">
          <Input
            type="text"
            placeholder="Schreibe eine Nachricht..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/pages/ChatPage.tsx
git commit -m "feat: implement KI-Coach chat with streaming, conversation history, and sidebar"
```

---

### Task 10: OnboardingPage — Update generateTrainingPlan Call

**Files:**
- Modify: `src/pages/OnboardingPage.tsx`

- [ ] **Step 1: Update the endpoint call**

The `OnboardingPage.tsx` already calls `api.generateTrainingPlan()` with the correct signature. Since we updated the method in `api.ts` (Task 8) to point to `/api/ai/generate-plan`, no changes are needed in `OnboardingPage.tsx` — the method signature is the same. The only change is removing the `days_count` from the expected response type, which the onboarding page doesn't use anyway.

Verify by reading the file and confirming the call at line ~170 still works with the updated method.

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | head -20`

- [ ] **Step 2: Commit if changes needed**

Only commit if any adjustments were required.

---

## Chunk 4: Testing + Final Verification

### Task 11: Local Dev Testing

- [ ] **Step 1: Start local dev server**

Run: `npm run dev`

Verify: Server starts without errors.

- [ ] **Step 2: Test the AI chat endpoint manually**

Run (in another terminal):
```bash
curl -X POST http://localhost:8788/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-dev-jwt-token>" \
  -d '{"messages": [{"role": "user", "content": "Hi, was ist ein gutes Aufwärmtraining?"}]}'
```

Expected: SSE stream with `data: {"content": "..."}` events followed by `data: [DONE]`.

- [ ] **Step 3: Test conversations CRUD**

```bash
# List conversations
curl http://localhost:8788/api/ai/conversations \
  -H "Authorization: Bearer <token>"

# Get conversation (use ID from list)
curl http://localhost:8788/api/ai/conversations/<id> \
  -H "Authorization: Bearer <token>"

# Delete conversation
curl -X DELETE http://localhost:8788/api/ai/conversations/<id> \
  -H "Authorization: Bearer <token>"
```

- [ ] **Step 4: Test plan generation**

```bash
curl -X POST http://localhost:8788/api/ai/generate-plan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"fitness_goal": "muscle_gain", "experience_level": "intermediate", "training_frequency": 4, "focus_areas": ["chest", "back"]}'
```

Expected: `{"success": true, "plan_id": ..., "plan_name": "..."}`

- [ ] **Step 5: Test ChatPage in browser**

Navigate to the chat page. Send a message. Verify:
- Streaming response appears token by token
- Message persists (refresh page, click conversation in sidebar)
- Sidebar shows conversation list
- Can create new conversation
- Can delete conversation

### Task 12: Final Commit

- [ ] **Step 1: Verify everything compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json`
Expected: No errors

- [ ] **Step 2: Run any existing tests**

Run: `npx vitest run`
Expected: All existing tests pass (no regressions)

- [ ] **Step 3: Final cleanup commit if needed**

```bash
git add -A
git commit -m "chore: cleanup and final adjustments for AI provider integration"
```
