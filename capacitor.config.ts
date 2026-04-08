import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'de.sculpt-app.ios',
  appName: 'Sculpt',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      backgroundColor: '#040404',
      launchAutoHide: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
    },
  },
  ios: {
    contentInset: 'never',
    scheme: 'Sculpt',
    backgroundColor: '#040404',
  },
}

export default config
