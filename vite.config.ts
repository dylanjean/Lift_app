import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PPL Tracker',
        short_name: 'PPL',
        description: 'Push/Pull/Legs workout, water, and fasting tracker',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1B1A18',
        theme_color: '#1B1A18',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          // Placeholder art doubles as maskable for now; replace with
          // proper safe-zone art alongside the Milestone 1 design pass.
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
