import { useState, useEffect, useCallback, useRef } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'

const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const GOOGLE_IOS_CLIENT_ID = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID || ''
const GOOGLE_CLIENT_ID = Capacitor.isNativePlatform() ? GOOGLE_IOS_CLIENT_ID : GOOGLE_WEB_CLIENT_ID

// Register the native GoogleAuth plugin (defined in GoogleAuthPlugin.swift)
interface GoogleAuthPlugin {
  initialize(options: { clientId: string; serverClientId?: string; scopes?: string[] }): Promise<void>
  signIn(options: { scopes: string[] }): Promise<{
    authentication?: { idToken?: string; accessToken?: string }
    email?: string
    name?: string
    id?: string
  }>
  signOut(): Promise<void>
}

const NativeGoogleAuth = registerPlugin<GoogleAuthPlugin>('GoogleAuth')

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

    // Native: use our custom Capacitor GoogleAuth plugin
    if (Capacitor.isNativePlatform()) {
      NativeGoogleAuth.initialize({
        clientId: GOOGLE_CLIENT_ID,
        serverClientId: GOOGLE_WEB_CLIENT_ID,
        scopes: ['email', 'profile'],
      }).then(() => {
        setIsReady(true)
      }).catch((err) => {
        errorRef.current?.(`Failed to initialize native Google Auth: ${err}`)
      })
      return
    }

    // Web: use Google Identity Services (GSI) script
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

  const signIn = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await NativeGoogleAuth.signIn({ scopes: ['email', 'profile'] })
        if (result.authentication?.idToken) {
          callbackRef.current(result.authentication.idToken)
        } else {
          errorRef.current?.('No ID token received from Google')
        }
      } catch (err) {
        errorRef.current?.(err instanceof Error ? err.message : 'Google sign-in failed')
      }
      return
    }
    // Web: trigger One Tap prompt
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
    }
  }, [])

  const prompt = useCallback(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
    }
  }, [])

  const renderButton = useCallback((element: HTMLElement, options: Record<string, unknown>) => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.renderButton(element, options)
    }
  }, [])

  return { isReady, signIn, prompt, renderButton }
}
