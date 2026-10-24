import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

// Exercise exactly the server code deployed to Pages, with no credentials or mail.
const source = await readFile(new URL('../server/leads.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { createLeadHandler } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const env = {
  MAILJET_API_KEY: 'test-key', MAILJET_API_SECRET: 'test-secret',
  MAILJET_FROM_EMAIL: 'sender@example.com', MAILJET_TO_EMAIL: 'owner@example.com',
}
const lead = { fullName: 'Test Shopper', email: 'shopper@example.com', phone: '+972501234567', country: 'IL' }
const accepted = () => Response.json({ Messages: [{ Status: 'success' }] })
function request(body = lead, { method = 'POST', origin = 'https://stelle.example', contentType = 'application/json', ip = '192.0.2.1', raw = false } = {}) {
  return new Request('https://stelle.example/api/leads', {
    method,
    headers: { Origin: origin, 'Content-Type': contentType, 'CF-Connecting-IP': ip },
    ...(method === 'GET' ? {} : { body: raw ? body : JSON.stringify(body) }),
  })
}

test('sends the lead to the configured owner, with a fixed sender and customer ReplyTo', async () => {
  let calls = 0
  const handler = createLeadHandler({ fetchImpl: async (url, options) => {
    calls++
    assert.equal(url, 'https://api.mailjet.com/v3.1/send')
    assert.equal(options.headers.Authorization, `Basic ${btoa('test-key:test-secret')}`)
    const message = JSON.parse(options.body).Messages[0]
    assert.deepEqual(message.To, [{ Email: env.MAILJET_TO_EMAIL }])
    assert.equal(message.From.Email, env.MAILJET_FROM_EMAIL)
    assert.deepEqual(message.ReplyTo, { Email: lead.email, Name: lead.fullName })
    assert.match(message.TextPart, /\+972501234567/)
    return accepted()
  } })
  const response = await handler(request(), env)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), { ok: true })
  assert.equal(calls, 1)
})

test('phone is optional and customer HTML is escaped', async () => {
  const handler = createLeadHandler({ fetchImpl: async (_, options) => {
    const message = JSON.parse(options.body).Messages[0]
    assert.match(message.HTMLPart, /&lt;Shopper&gt;/)
    assert.doesNotMatch(message.HTMLPart, /<Shopper>/)
    assert.match(message.TextPart, /Phone: Not provided/)
    return accepted()
  } })
  const { phone: _phone, ...withoutPhone } = lead
  assert.equal((await handler(request({ ...withoutPhone, fullName: '<Shopper>' }), env)).status, 200)
})

for (const [label, body] of [
  ['blank name', { ...lead, fullName: '   ' }],
  ['invalid email', { ...lead, email: 'bad' }],
  ['email header injection', { ...lead, email: 'x@example.com\r\nBcc:other@example.com' }],
  ['name control characters', { ...lead, fullName: 'Name\nOther' }],
  ['invalid phone', { ...lead, phone: '0501234567' }],
  ['invalid country', { ...lead, country: 'Israel' }],
]) test(`rejects ${label} before calling Mailjet`, async () => {
  const handler = createLeadHandler({ fetchImpl: () => assert.fail('Must not send invalid data') })
  assert.equal((await handler(request(body), env)).status, 400)
})

test('rejects wrong methods, foreign origins, non-JSON, malformed JSON and oversized streamed bodies', async () => {
  const handler = createLeadHandler({ fetchImpl: () => assert.fail('Must not send') })
  assert.equal((await handler(request(lead, { method: 'GET' }), env)).status, 405)
  assert.equal((await handler(request(lead, { origin: 'https://other.example' }), env)).status, 403)
  assert.equal((await handler(request(lead, { contentType: 'text/plain' }), env)).status, 415)
  assert.equal((await handler(request('{broken', { raw: true }), env)).status, 400)
  assert.equal((await handler(request('x'.repeat(4097), { raw: true }), env)).status, 413)
})

test('missing server configuration returns an actionable error without sending', async () => {
  const handler = createLeadHandler({ fetchImpl: () => assert.fail('Must not send without secrets') })
  const response = await handler(request(), {})
  assert.equal(response.status, 503)
  assert.match((await response.json()).error, /temporarily unavailable/)
})

test('provider rejection and network failures never produce success or leak provider details', async () => {
  for (const fetchImpl of [
    async () => Response.json({ secret: 'private-provider-data' }, { status: 401 }),
    async () => Response.json({ Messages: [{ Status: 'error', Errors: ['private-provider-data'] }] }),
    async () => Response.json({}),
    async () => new Response('not JSON'),
    async () => { throw new Error('private-provider-data') },
  ]) {
    const handler = createLeadHandler({ fetchImpl })
    const response = await handler(request(), env)
    assert.equal(response.status, 502)
    const body = await response.text()
    assert.doesNotMatch(body, /private-provider-data|test-secret/)
    assert.doesNotMatch(body, /"ok":true/)
  }
})

test('throttles repeated attempts, isolates clients and allows retry after the window', async () => {
  let time = 1000000
  const handler = createLeadHandler({ fetchImpl: async () => accepted(), now: () => time })
  for (let i = 0; i < 5; i++) assert.equal((await handler(request(), env)).status, 200)
  const blocked = await handler(request(), env)
  assert.equal(blocked.status, 429)
  assert.equal(blocked.headers.get('retry-after'), '600')
  assert.equal((await handler(request(lead, { ip: '192.0.2.2' }), env)).status, 200)
  time += 600001
  assert.equal((await handler(request(), env)).status, 200)
})
