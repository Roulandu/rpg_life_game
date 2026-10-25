import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.pitchlife.game',
  appName: '绿茵人生',
  webDir: 'dist',
  backgroundColor: '#0a0d0b',
  android: {
    backgroundColor: '#0a0d0b',
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0a0d0b',
      showSpinner: false,
      launchAutoHide: true,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0d0b',
    },
  },
}

export default config
