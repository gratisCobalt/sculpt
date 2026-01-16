import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

// VAPID public key - in production, generate your own key pair
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray as Uint8Array<ArrayBuffer>
}

async function checkSubscriptionStatus(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}

export function usePushNotifications() {
  // Check support synchronously during render (safe since it's browser globals)
  const isSupported = typeof window !== 'undefined' && 
    'serviceWorker' in navigator && 
    'PushManager' in window && 
    'Notification' in window

  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isSupported) {
      checkSubscriptionStatus().then(setIsSubscribed)
    }
  }, [isSupported])

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
    
    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready
    
    return registration
  }

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push-Benachrichtigungen werden nicht unterstützt')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      // Request permission
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        setError('Benachrichtigungen wurden nicht erlaubt')
        setIsLoading(false)
        return false
      }

      // Register service worker
      const registration = await registerServiceWorker()

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      // Send subscription to backend
      const subscriptionJson = subscription.toJSON()
      await api.registerPushToken({
        endpoint: subscriptionJson.endpoint!,
        keys: {
          p256dh: subscriptionJson.keys?.p256dh || '',
          auth: subscriptionJson.keys?.auth || ''
        }
      })

      setIsSubscribed(true)
      setIsLoading(false)
      return true
    } catch (e) {
      console.error('Push subscription error:', e)
      setError('Fehler beim Aktivieren der Benachrichtigungen')
      setIsLoading(false)
      return false
    }
  }, [isSupported])

  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Unregister from backend
        await api.unregisterPushToken(subscription.endpoint)
        
        // Unsubscribe locally
        await subscription.unsubscribe()
      }

      setIsSubscribed(false)
      setIsLoading(false)
      return true
    } catch (e) {
      console.error('Push unsubscribe error:', e)
      setError('Fehler beim Deaktivieren der Benachrichtigungen')
      setIsLoading(false)
      return false
    }
  }, [])

  const sendTestNotification = useCallback(() => {
    if (permission === 'granted') {
      new Notification('Sculpt Test', {
        body: 'Push-Benachrichtigungen funktionieren! 💪',
        icon: '/icons/icon-192.png',
        tag: 'test-notification'
      })
    }
  }, [permission])

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification
  }
}
