import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()
export const isIOS = Capacitor.getPlatform() === 'ios'
export const isWeb = !isNative
