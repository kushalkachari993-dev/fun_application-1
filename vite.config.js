import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          const normalizedId = id.replaceAll('\\', '/')

          if (
            normalizedId.includes('/@firebase/firestore')
            || normalizedId.includes('/firebase/firestore')
            || normalizedId.includes('/@firebase/webchannel-wrapper')
          ) {
            return 'firebase-firestore'
          }
          if (
            normalizedId.includes('/@firebase/auth')
            || normalizedId.includes('/firebase/auth')
          ) {
            return 'firebase-auth'
          }
          if (
            normalizedId.includes('/@firebase/app')
            || normalizedId.includes('/firebase/app')
            || normalizedId.includes('/@firebase/component')
            || normalizedId.includes('/@firebase/logger')
            || normalizedId.includes('/@firebase/util')
          ) {
            return 'firebase-core'
          }
          if (normalizedId.includes('/@firebase/') || normalizedId.includes('/firebase/')) {
            return 'firebase-shared'
          }
          if (
            normalizedId.includes('/chess.js/')
            || normalizedId.includes('/@ayshrj/')
            || normalizedId.includes('/qrcode/')
          ) {
            return 'games'
          }
          if (
            normalizedId.includes('/react/')
            || normalizedId.includes('/react-dom/')
            || normalizedId.includes('/react-router-dom/')
          ) {
            return 'react'
          }
          if (normalizedId.includes('/lucide-react/')) return 'icons'

          return 'vendor'
        },
      },
    },
  },
})
