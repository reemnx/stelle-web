import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { createLeadHandler, type MailjetEnv } from './server/leads'
import react from '@vitejs/plugin-react'

function localLeadApi(env: MailjetEnv): Plugin {
  const handler = createLeadHandler()
  return {
    name: 'local-lead-api',
    configureServer(server) {
      server.middlewares.use('/api/leads', async (req, res) => {
        try {
          const chunks: Buffer[] = []
          let size = 0
          for await (const chunk of req) {
            size += chunk.length
            if (size > 4096) {
              res.writeHead(413, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
              res.end(JSON.stringify({ error: 'Request too large.' }))
              return
            }
            chunks.push(Buffer.from(chunk))
          }
          const headers = new Headers()
          for (const [name, value] of Object.entries(req.headers)) {
            if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
          }
          headers.set('cf-connecting-ip', req.socket.remoteAddress || 'local')
          const request = new Request(`http://${req.headers.host}/api/leads`, {
            method: req.method,
            headers,
            ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: Buffer.concat(chunks).toString('utf8') } : {}),
          })
          const response = await handler(request, env)
          res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
          res.end(await response.text())
        } catch {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
          res.end(JSON.stringify({ error: 'We couldn’t send your request. Please try again.' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), localLeadApi({ ...loadEnv(mode, process.cwd(), ''), ...process.env })],
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
}))
