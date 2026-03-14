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
