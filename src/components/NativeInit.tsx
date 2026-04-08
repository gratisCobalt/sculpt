import { useEffect } from 'react'
import { isNative } from '@/lib/platform'

export function NativeInit() {
  useEffect(() => {
    if (!isNative) return

    async function init() {
      const { StatusBar, Style } = await import('@capacitor/status-bar')
      const { SplashScreen } = await import('@capacitor/splash-screen')

      await StatusBar.setStyle({ style: Style.Dark })
      await SplashScreen.hide()
    }
    init()
  }, [])

  return null
}
