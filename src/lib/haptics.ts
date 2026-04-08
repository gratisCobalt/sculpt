import { isNative } from './platform'

let HapticsModule: typeof import('@capacitor/haptics') | null = null

if (isNative) {
  import('@capacitor/haptics').then((m) => {
    HapticsModule = m
  })
}

export const haptics = {
  light: () => HapticsModule?.Haptics.impact({ style: HapticsModule.ImpactStyle.Light }),
  medium: () => HapticsModule?.Haptics.impact({ style: HapticsModule.ImpactStyle.Medium }),
  heavy: () => HapticsModule?.Haptics.impact({ style: HapticsModule.ImpactStyle.Heavy }),
  success: () => HapticsModule?.Haptics.notification({ type: HapticsModule.NotificationType.Success }),
  warning: () => HapticsModule?.Haptics.notification({ type: HapticsModule.NotificationType.Warning }),
  error: () => HapticsModule?.Haptics.notification({ type: HapticsModule.NotificationType.Error }),
  selection: () => HapticsModule?.Haptics.selectionStart().then(() => HapticsModule?.Haptics.selectionChanged()),
}
