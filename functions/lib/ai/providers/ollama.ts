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
