import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/gastos-personal/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mis Gastos',
        short_name: 'Gastos',
        description: 'Control de gastos personal',
        theme_color: '#1f4d3a',
        background_color: '#d9d4c4',
        display: 'standalone',
        start_url: '/gastos-personal/',
        scope: '/gastos-personal/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})