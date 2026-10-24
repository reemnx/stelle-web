import { createLeadHandler, type MailjetEnv } from '../../server/leads'

const handleLead = createLeadHandler()

// Cloudflare Pages supplies secrets through context.env at runtime.
export function onRequest(context: { request: Request; env: MailjetEnv }) {
  return handleLead(context.request, context.env)
}
