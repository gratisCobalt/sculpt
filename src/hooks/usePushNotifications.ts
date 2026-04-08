import { useState, useEffect, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
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
  const isNative = Capacitor.isNativePlatform()

  // Native always supports push; web needs serviceWorker + PushManager + Notification
  const isSupported = isNative || (typeof window !== 'undefined' &&
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window)

  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isNative && isSupported) {
      checkSubscriptionStatus().then(setIsSubscribed)
    }
  }, [isNative, isSupported])

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
    await navigator.serviceWorker.ready
    return registration
  }

  const subscribeNative = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications')

      const permResult = await PushNotifications.requestPermissions()
      if (permResult.receive !== 'granted') {
        setError('Benachrichtigungen wurden nicht erlaubt')
        setIsLoading(false)
        return false
      }
      setPermission('granted')

      await PushNotifications.register()

      // Listen for registration success — fires with the APNs device token
      PushNotifications.addListener('registration', async (token) => {
        await api.registerPushToken({ token: token.value, platform: 'ios' })
        setIsSubscribed(true)
        setIsLoading(false)
      })

      // Registration failure
      PushNotifications.addListener('registrationError', (err) => {
        console.error('Push registration error:', err)
        setError('Fehler beim Registrieren für Benachrichtigungen')
        setIsLoading(false)
      })

      // Foreground notification received
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received in foreground:', notification)
      })

      // User tapped a notification
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('Push action performed:', action)
      })

      return true
    } catch (e) {
      console.error('Native push subscription error:', e)
      setError('Fehler beim Aktivieren der Benachrichtigungen')
      setIsLoading(false)
      return false
    }
  }, [])

  const subscribeWeb = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push-Benachrichtigungen werden nicht unterstützt')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        setError('Benachrichtigungen wurden nicht erlaubt')
        setIsLoading(false)
        return false
      }

      const registration = await registerServiceWorker()

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      const subscriptionJson = subscription.toJSON()
      await api.registerPushToken({
        token: subscriptionJson.endpoint!,
        platform: 'web',
        subscription: {
          endpoint: subscriptionJson.endpoint!,
          keys: {
            p256dh: subscriptionJson.keys?.p256dh || '',
            auth: subscriptionJson.keys?.auth || '',
          },
        },
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

  const subscribe = useCallback(async () => {
    return isNative ? subscribeNative() : subscribeWeb()
  }, [isNative, subscribeNative, subscribeWeb])

  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (isNative) {
        const { PushNotifications } = await import('@capacitor/push-notifications')
        await PushNotifications.removeAllListeners()
        // Note: APNs token unregistration is handled server-side
      } else {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()

        if (subscription) {
          await api.unregisterPushToken(subscription.endpoint)
          await subscription.unsubscribe()
        }
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
  }, [isNative])

  const sendTestNotification = useCallback(() => {
    if (permission === 'granted' && !isNative) {
      new Notification('Sculpt Test', {
        body: 'Push-Benachrichtigungen funktionieren!',
        icon: '/icons/icon-192.png',
        tag: 'test-notification'
      })
    }
  }, [permission, isNative])

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
