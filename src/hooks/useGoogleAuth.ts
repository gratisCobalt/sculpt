import { useState, useEffect, useCallback, useRef } from 'react'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

interface UseGoogleAuthOptions {
  onCredential: (credential: string) => void
  onError?: (error: string) => void
}

export function useGoogleAuth({ onCredential, onError }: UseGoogleAuthOptions) {
  const [isReady, setIsReady] = useState(false)
  const callbackRef = useRef(onCredential)
  const errorRef = useRef(onError)

  useEffect(() => {
    callbackRef.current = onCredential
    errorRef.current = onError
  }, [onCredential, onError])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      errorRef.current?.('Google Client ID not configured')
      return
    }

    const initialize = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => callbackRef.current(response.credential),
        })
        setIsReady(true)
      }
    }

    if (window.google?.accounts?.id) {
      initialize()
    } else {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initialize
      script.onerror = () => errorRef.current?.('Failed to load Google script')
      document.body.appendChild(script)
    }
  }, [])

  const prompt = useCallback(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
    }
  }, [])

  const renderButton = useCallback((element: HTMLElement, options: any) => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.renderButton(element, options)
    }
  }, [])

  return { isReady, prompt, renderButton }
}
