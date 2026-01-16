// @ts-expect-error Deno types
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  message: string
  context: {
    userName?: string
    fitnessGoal?: string
    experience?: string
    frequency?: string
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, context } = (await req.json()) as ChatRequest

    const VERTEX_API_KEY = Deno.env.get('VERTEX_API_KEY')
    if (!VERTEX_API_KEY) {
      throw new Error('Missing Vertex AI API key')
    }

    // Build system prompt with user context
    const systemPrompt = `Du bist ein freundlicher und motivierender KI-Fitness-Coach namens "Sculpt Coach". 
Du hilfst Nutzern bei allen Fragen rund um Fitness, Training, Ernährung und Gesundheit.

Nutzer-Kontext:
- Name: ${context.userName || 'Athlet'}
- Fitnessziel: ${context.fitnessGoal || 'nicht angegeben'}
- Erfahrung: ${context.experience || 'nicht angegeben'}
- Trainingsfrequenz: ${context.frequency || 'nicht angegeben'} Mal pro Woche

Richtlinien:
1. Antworte immer auf Deutsch
2. Sei motivierend und positiv
3. Gib konkrete, umsetzbare Tipps
4. Passe deine Empfehlungen an das Fitnessziel und die Erfahrung an
5. Halte Antworten prägnant (max. 3-4 kurze Absätze)
6. Verwende gelegentlich passende Emojis
7. Bei medizinischen Fragen empfehle einen Arztbesuch`

    // Call Vertex AI (Gemini) API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${VERTEX_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${systemPrompt}\n\nNutzer-Frage: ${message}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Vertex AI error:', error)
      throw new Error('Vertex AI API error')
    }

    const data = await response.json()
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Keine Antwort generiert.'

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Chat function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
