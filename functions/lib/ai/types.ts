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
