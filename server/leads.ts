/** Server-only code shared by Cloudflare Pages and the local Vite API. */
export type MailjetEnv = {
  MAILJET_API_KEY?: string
  MAILJET_API_SECRET?: string
  MAILJET_FROM_EMAIL?: string
  MAILJET_FROM_NAME?: string
  MAILJET_TO_EMAIL?: string
}

type Lead = { fullName: string; email: string; phone: string; country: string }
type HandlerOptions = { fetchImpl?: typeof fetch; now?: () => number }

const MAX_BYTES = 4096
const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

function json(status: number, body: Record<string, unknown>, headers?: HeadersInit) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

function cleanText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength && Array.from(value).every((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
}

function parseLead(value: unknown): Lead | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  if (!cleanText(data.fullName, 120) || !data.fullName.trim()) return null
  if (!cleanText(data.email, 254) || !emailPattern.test(data.email.trim())) return null
  if (data.phone !== undefined && (typeof data.phone !== 'string' || (data.phone !== '' && !/^\+[1-9]\d{6,14}$/.test(data.phone)))) return null
  if (typeof data.country !== 'string' || !/^[A-Z]{2}$/.test(data.country)) return null
  return { fullName: data.fullName.trim(), email: data.email.trim(), phone: data.phone as string || '', country: data.country }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

async function readJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > MAX_BYTES) throw new RangeError('Body too large')
  const reader = request.body?.getReader()
  if (!reader) throw new SyntaxError('Empty body')
  let size = 0
  const chunks: Uint8Array[] = []
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BYTES) {
        await reader.cancel()
        throw new RangeError('Body too large')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder().decode(body))
}

export function createLeadHandler({ fetchImpl = fetch, now = Date.now }: HandlerOptions = {}) {
  // Best-effort per-isolate throttling. Cloudflare edge rate-limit rules can add
  // a global limit across isolates without trusting visitor-supplied headers.
  const attempts = new Map<string, { count: number; expires: number }>()

  return async (request: Request, env: MailjetEnv): Promise<Response> => {
    if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' }, { Allow: 'POST' })
    if (request.headers.get('origin') !== new URL(request.url).origin) return json(403, { error: 'Request not allowed.' })
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return json(415, { error: 'Expected JSON.' })

    const time = now()
    for (const [key, entry] of attempts) if (entry.expires <= time) attempts.delete(key)
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
    const attempt = attempts.get(ip) ?? { count: 0, expires: time + WINDOW_MS }
    if (attempt.count >= MAX_ATTEMPTS || (!attempts.has(ip) && attempts.size >= 10000)) {
      return json(429, { error: 'Too many attempts. Please try again in a few minutes.' }, { 'Retry-After': String(Math.ceil((attempt.expires - time) / 1000)) })
    }
    attempt.count++
    attempts.set(ip, attempt)

    let lead: Lead | null
    try {
      lead = parseLead(await readJson(request))
    } catch (error) {
      return json(error instanceof RangeError ? 413 : 400, { error: 'Please check your details and try again.' })
    }
    if (!lead) return json(400, { error: 'Please enter your name, a valid email, and a valid phone number if provided.' })

    const key = env.MAILJET_API_KEY?.trim()
    const secret = env.MAILJET_API_SECRET?.trim()
    const from = env.MAILJET_FROM_EMAIL?.trim()
    const to = env.MAILJET_TO_EMAIL?.trim()
    if (!key || !secret || !from || !to || !emailPattern.test(from) || !emailPattern.test(to)) {
      return json(503, { error: 'Checkout requests are temporarily unavailable. Please try again later.' })
    }

    const fields = [['Full name', lead.fullName], ['Email', lead.email], ['Phone', lead.phone || 'Not provided'], ['Country', lead.country]]
    try {
      const response = await fetchImpl('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${btoa(`${key}:${secret}`)}` },
        body: JSON.stringify({ Messages: [{
          From: { Email: from, Name: env.MAILJET_FROM_NAME?.trim() || 'STELLÉ' },
          To: [{ Email: to }],
          ReplyTo: { Email: lead.email, Name: lead.fullName },
          Subject: 'New STELLÉ checkout lead',
          TextPart: `New checkout lead\n\n${fields.map(([label, value]) => `${label}: ${value}`).join('\n')}`,
          HTMLPart: `<div style="font-family:Arial,sans-serif;color:#1e2230"><h2>New STELLÉ checkout lead</h2><table>${fields.map(([label, value]) => `<tr><th style="text-align:left;padding:8px 16px 8px 0">${label}</th><td>${escapeHtml(value)}</td></tr>`).join('')}</table></div>`,
        }] }),
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) {
        console.error('Mailjet lead request failed with HTTP status', response.status)
        return json(502, { error: 'We couldn’t send your request. Please try again.' })
      }
      const result = await response.json() as { Messages?: { Status?: string }[] }
      if (result.Messages?.length !== 1 || result.Messages[0].Status !== 'success') {
        console.error('Mailjet did not accept the lead message')
        return json(502, { error: 'We couldn’t send your request. Please try again.' })
      }
      return json(200, { ok: true })
    } catch {
      // Never return provider responses, credentials or lead details to the browser/logs.
      return json(502, { error: 'We couldn’t send your request. Please try again.' })
    }
  }
}
