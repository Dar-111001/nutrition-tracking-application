import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    // Same origin in dev too: /api goes to the Node API, /_ to the PocketBase admin UI
    proxy: {
      '/api': process.env.API_URL || 'http://localhost:4000',
      '/_': process.env.POCKETBASE_URL || 'http://localhost:8090',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
}) 