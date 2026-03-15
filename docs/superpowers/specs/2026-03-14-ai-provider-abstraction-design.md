# AI Provider Abstraction Layer — Design Spec

## Overview

Central AI integration for the Sculpt fitness app with a provider-agnostic abstraction layer. Initial provider: Ollama Cloud (Qwen 3.5 397B). The system powers two features: KI-Coach Chat and AI Training Plan Generation.

**Current state:** Neither AI feature is implemented. `ChatPage.tsx` returns a hardcoded placeholder. `OnboardingPage.tsx` calls `api.generateTrainingPlan()` which hits `POST /api/training-plans/generate` — this endpoint does not exist on the backend (returns 404). Both features are built from scratch.

## Architecture

```
Client (React)
  → POST /api/ai/chat           (streaming)
  → GET/DELETE /api/ai/conversations
  → Cloudflare Pages Function (functions/api/ai/[[route]].ts)
    → AI Provider Layer (functions/lib/ai/)
      → Ollama Cloud (qwen3.5:397b-cloud)
```

All AI requests flow through the Cloudflare backend (no direct client-to-provider calls). API keys stay server-side.

## Provider Abstraction

### File Structure

```
functions/lib/ai/
  ├── types.ts              # AIProvider interface, Message types, Config
  ├── provider.ts           # Factory: getProvider() returns active provider based on config
  ├── encryption.ts         # AES-256-GCM encrypt/decrypt for message storage
  └── providers/
      └── ollama.ts         # Ollama Cloud implementation
```

### Interface

```typescript
interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIStreamOptions {
  model?: string;
  temperature?: number;
  systemPrompt?: string;
}

interface AIProvider {
  chat(messages: AIMessage[], options?: AIStreamOptions): Promise<ReadableStream>;
}
```

The `chat()` method returns a **raw NDJSON stream from the provider**. The endpoint handler (`functions/api/ai/[[route]].ts`) is responsible for transforming this into SSE format for the client. This keeps providers simple and the SSE formatting in one place.

### Factory

`getProvider(env)` reads `AI_PROVIDER` from environment and returns the matching provider instance. Adding a new provider = new file in `providers/`, register in factory.

### Ollama Cloud Provider

- **Base URL:** `https://ollama.com/api/chat`
- **Auth:** `Authorization: Bearer {OLLAMA_API_KEY}`
- **Request:** `{ model, messages, stream: true }`
- **Response:** NDJSON stream, each line is a JSON object with `{ message: { content: "..." } }`

## Environment Variables

| Variable | Description | Storage | Example |
|----------|-------------|---------|---------|
| `AI_PROVIDER` | Active provider ID | `wrangler.toml` `[vars]` | `ollama` |
| `OLLAMA_BASE_URL` | Ollama Cloud API base | `wrangler.toml` `[vars]` | `https://ollama.com` |
| `OLLAMA_MODEL` | Default model ID | `wrangler.toml` `[vars]` | `qwen3.5:397b-cloud` |
| `OLLAMA_API_KEY` | Ollama Cloud API key | Cloudflare secret | `olk_...` |
| `AI_CHAT_ENCRYPTION_KEY` | AES-256 key (64 hex chars) | Cloudflare secret | `a1b2c3...` |

Secrets are set via `wrangler secret put` for both Dev and Prod environments. Non-secrets go in `wrangler.toml` under `[vars]`.

The `Env` interface in `functions/lib/types.ts` must be updated to include all five new variables.

## Route Handler

**File:** `functions/api/ai/[[route]].ts`

Follows the existing catch-all route pattern used by all other endpoints (e.g. `functions/api/users/[[route]].ts`). Internal routing via URL path matching.

## API Endpoints

### `POST /api/ai/chat`

Main AI endpoint. Auth-protected (JWT). Returns SSE stream.

**Request:**
```json
{
  "conversationId": "uuid-optional",
  "messages": [
    { "role": "user", "content": "Wie kann ich meine Bankdrücken-Technik verbessern?" }
  ],
  "systemPrompt": "optional-override",
  "temperature": 0.7
}
```

**Response:** SSE stream with custom headers:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

Each SSE event: `data: {"content": "token text"}\n\n`
Final event: `data: [DONE]\n\n`

Cannot use existing `jsonResponse()` helper — needs a custom `sseResponse()` helper in `functions/lib/db.ts` or inline in the route handler.

**Behavior:**
- If `conversationId` is provided, loads conversation history from DB and prepends to messages
- If no `conversationId`, creates a new conversation
- Persists both user message and assistant response (encrypted) to DB
- The full assistant response is buffered during streaming for persistence after completion
- Streams assistant response to client in real-time

**Error handling during streaming:**
- If the provider errors before streaming starts: return a normal JSON error response
- If the provider errors mid-stream: send `data: {"error": "..."}\n\n` followed by `data: [DONE]\n\n`
- Partially streamed messages are still persisted (marked as incomplete if needed)

**Conversation title:** Auto-generated from the first user message (truncated to 100 chars). No AI-generated titles to keep it simple.

### `GET /api/ai/conversations`

List user's conversations. Auth-protected.

**Response:**
```json
[
  { "id": "uuid", "title": "Bankdrücken Technik", "created_at": "...", "updated_at": "..." }
]
```

### `GET /api/ai/conversations/:id`

Get all messages for a conversation. Auth-protected (only own conversations).

**Response:**
```json
{
  "id": "uuid",
  "title": "...",
  "messages": [
    { "id": "uuid", "role": "user", "content": "decrypted content", "created_at": "..." }
  ]
}
```

### `DELETE /api/ai/conversations/:id`

Delete a conversation and all its messages. Auth-protected.

### `POST /api/ai/generate-plan`

Dedicated training plan generation endpoint. Auth-protected. **Not streaming** — returns JSON.

**Request:**
```json
{
  "fitness_goal": "muscle_gain",
  "experience_level": "intermediate",
  "training_frequency": 4,
  "focus_areas": ["chest", "back"],
  "body_weight_kg": 80,
  "available_exercises": [123, 456]  // optional, not implemented yet — for future use
}
```

**Backend logic:**
1. Query the `exercise` table to build a list of available exercise names + IDs (filtered by `available_exercises` if provided, otherwise all)
2. Send the exercise list + user profile to the AI via the provider layer with a system prompt instructing structured JSON output
3. AI returns a plan referencing exercise names from the provided list
4. Backend matches exercise names back to `exercise.id` (fuzzy match / best effort)
5. Backend inserts into three tables:
   - `training_plan` — `name`, `name_de`, `description`, `description_de`, `days_per_week`, `created_by_id` = user ID, `is_system_plan` = 0
   - `training_plan_day` — one row per day with `day_number`, `name`, `name_de`, `focus_description`
   - `training_plan_exercise` — one row per exercise with `exercise_id` (FK), `order_index`, `sets`, `min_reps`, `max_reps`, `rest_seconds`, `notes`
6. Assign plan to user via `user_training_plan`

**Response:**
```json
{
  "success": true,
  "plan_id": 42,
  "plan_name": "Muskelaufbau 4-Tage Split"
}
```

**AI output format** (internal, not exposed to client):
```json
{
  "name": "Muskelaufbau 4-Tage Split",
  "name_de": "Muskelaufbau 4-Tage Split",
  "description": "...",
  "description_de": "...",
  "days": [
    {
      "day_number": 1,
      "name": "Push Day",
      "name_de": "Drück-Tag",
      "focus_description": "Brust, Schultern, Trizeps",
      "exercises": [
        {
          "exercise_name": "Bench Press",
          "sets": 4,
          "min_reps": 8,
          "max_reps": 12,
          "rest_seconds": 90,
          "notes": "Kontrollierte Bewegung"
        }
      ]
    }
  ]
}
```

The `exercise_name` field must match names from the exercise list provided to the AI. The backend does a case-insensitive lookup against `exercise.name` to resolve `exercise_id`. Unmatched exercises are skipped with a warning log.

**Future: `available_exercises` parameter.** The request schema already includes this optional field. When provided, only exercises with these IDs are sent to the AI. Implementation deferred — for now, a representative subset of exercises is sent (e.g. top 100 most common, grouped by body part) to stay within token limits.

## Database Schema

### Migration Files

- `db/d1/009_ai_conversations.sql` — for D1 migrations (Dev + Prod)
- `db/init/008_ai_conversations.sql` — for init scripts

Both files contain the same SQL. Apply to both D1 instances (`sculpt-db` for Prod, `sculpt-dev` for Dev).

```sql
CREATE TABLE ai_conversation (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_ai_conversation_user ON ai_conversation(user_id);

CREATE TABLE ai_message (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES ai_conversation(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content_encrypted TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_ai_message_conversation ON ai_message(conversation_id);
```

### Encryption

- Algorithm: AES-256-GCM (via Web Crypto API, available in Cloudflare Workers)
- Key: `AI_CHAT_ENCRYPTION_KEY` is a 64-character hex string representing 32 bytes. Decoded directly via hex→ArrayBuffer (no KDF). Imported as a CryptoKey with `crypto.subtle.importKey('raw', ...)`.
- Each message gets a unique 12-byte random IV (stored as hex alongside base64-encoded ciphertext)
- Encryption/decryption in `functions/lib/ai/encryption.ts`

## Frontend Integration

### ChatPage.tsx

Replace the current stub with:
- Real API calls to `POST /api/ai/chat` with streaming
- Read the response body as a ReadableStream, parse SSE events, append tokens to current message in real-time
- Conversation management: list, load, create, delete conversations
- System prompt: German-speaking fitness coach persona (motivierend, fachkundig, freundlich)
- Conversation history sent with each request for context

### OnboardingPage.tsx

Replace the broken `generateTrainingPlan()` call (currently hits non-existent endpoint) with:
- Call to new `POST /api/ai/generate-plan` endpoint (see below)
- No streaming display needed — show a loading indicator, parse result when complete

### API Client (src/lib/api.ts)

Add methods:
- `chatStream(params)` — POST to `/api/ai/chat`, returns `Response` (not parsed JSON). This method **cannot use the existing `private request<T>()`** helper since that calls `res.json()`. It must implement its own `fetch()` call with manual Authorization header injection, returning the raw Response for stream reading.
- `getConversations()` — GET conversations list (uses existing `request<T>()`)
- `getConversation(id)` — GET conversation messages (uses existing `request<T>()`)
- `deleteConversation(id)` — DELETE conversation (uses existing `request<T>()`)
- `generateTrainingPlan(data)` — POST to `/api/ai/generate-plan`, replaces the existing broken method (same signature, new endpoint)

## System Prompts

### KI-Coach Chat
```
Du bist ein erfahrener Fitness-Coach in der Sculpt App. Du hilfst Nutzern mit Trainingstipps, Ernährungsberatung und Motivation. Antworte auf Deutsch, freundlich und motivierend. Halte Antworten kompakt und praxisnah. Wenn du dir bei medizinischen Fragen unsicher bist, empfehle den Besuch eines Arztes.
```

### Trainingsplan-Generierung
```
Du bist ein Fitness-Experte. Erstelle einen personalisierten Trainingsplan als JSON.
Der Plan soll zum Fitnessziel, den Fokus-Bereichen und dem Erfahrungslevel des Nutzers passen.
Du DARFST NUR Übungen aus der folgenden Liste verwenden (exakte Namen!): {exercise_list}
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
}
```
`{exercise_list}` is dynamically replaced with exercise names from the DB at request time.

## Security

- All endpoints require JWT authentication
- Users can only access their own conversations
- Messages encrypted at rest (AES-256-GCM)
- API keys stored as Cloudflare secrets, never exposed to client
- Rate limiting: 20 requests per minute per user on `POST /api/ai/chat` (enforced server-side via in-memory counter or D1 query)
- Max input message length: 2000 characters
- Max messages per conversation: 100 (oldest messages excluded from AI context but kept in DB)
- Max conversations per user: 50 (oldest auto-deleted when limit reached)

## Cloudflare Workers Constraints

**This project uses the free Cloudflare Pages plan.** Free plan limits: 10ms CPU time per invocation, no wall-clock limit for streaming (subrequest time is excluded from CPU time). Since most time is spent waiting on the Ollama API (I/O, not CPU), streaming responses should work. The CPU-bound work (JSON parsing, encryption, DB queries) is minimal.

**Risk:** If the free plan enforces unexpected limits on streaming duration, the fallback is to use a non-streaming approach (buffer full response, then return). The `POST /api/ai/generate-plan` endpoint already uses non-streaming mode.

**Monitoring:** If users report timeouts, consider upgrading to Workers Paid ($5/month) which gives 30ms CPU time and generous wall-clock limits.

## Adding a New Provider

1. Create `functions/lib/ai/providers/<name>.ts` implementing `AIProvider`
2. Add env vars for the new provider
3. Register in `provider.ts` factory
4. Set `AI_PROVIDER=<name>` in environment
5. No frontend changes needed
