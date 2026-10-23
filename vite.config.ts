import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Fail loudly instead of hopping to 5174 when an old server is still running
    strictPort: true,
    host: true,
    // In Codespaces the auto-opened tab races the port forward and shows an error page
    open: !process.env.CODESPACES,
  },
})
