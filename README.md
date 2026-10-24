# STELLÉ — website

React 19 + TypeScript + Vite, routing with React Router.

## Requirements

- Node.js 20.19 or newer (`node -v` to check)

## Getting started

```bash
npm install
npm run dev
```

The site opens at http://localhost:5173.

### Installing from a work computer (private npm registry)

CI and Cloudflare Pages install with `npm ci` from the public registry, so
`package-lock.json` must only point at `https://registry.npmjs.org/`. If your
computer is set up to use a company registry (Artifactory, Nexus, etc.), a plain
`npm install <package>` writes that company URL into the lockfile and the deploy
fails, because Cloudflare can't reach it.

When adding packages on such a computer, point npm at the public registry for
this repo only:

```bash
npm install <package> --registry=https://registry.npmjs.org/
```

If the lockfile already has company URLs, fix them and commit:

```bash
npm run fix:lockfile
```

CI checks this before installing and fails with a clear message if it finds any.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check only |
| `npm run fix:lockfile` | Point every package in `package-lock.json` back to the public npm registry |

## Structure

```
src/
  main.tsx              entry point
  router/router.tsx     all routes (only "/" for now)
  components/           shared components (RootLayout)
  pages/Home/           homepage
  styles/global.css     brand tokens and base styles
public/
  images/               site images, served at /images/...
```

Imports can use the `@/` alias for `src/`, e.g. `import { HomePage } from '@/pages/Home/HomePage'`.

## Checkout leads (Mailjet + Cloudflare Pages)

Checkout sends a same-origin `POST /api/leads` request. The Pages Function in
`functions/api/leads.ts` validates the lead and calls Mailjet's Send API v3.1.
Credentials are read only on the server. The visitor's email is the Reply-To;
the sender and recipient always come from your configuration.

Copy `.env.example` to `.env` for `npm run dev`, fill the values, and restart the
dev server after changing them. The local API uses the same handler as Pages.

In Cloudflare Pages, open **Settings → Variables and Secrets** and add:

| Variable | Value |
| --- | --- |
| `MAILJET_API_KEY` | Mailjet API key; encrypt as a secret |
| `MAILJET_API_SECRET` | Mailjet secret key; encrypt as a secret |
| `MAILJET_FROM_EMAIL` | A sender email verified in Mailjet |
| `MAILJET_FROM_NAME` | Optional sender name; defaults to STELLÉ |
| `MAILJET_TO_EMAIL` | Your lead notification inbox (one address) |

Set values for each environment that should send email (production and/or
preview), then redeploy. Never add a `VITE_` prefix to these names.

Keep the Pages build command as `npm run build`, the output directory as `dist`,
and the project root at this repository root so Cloudflare detects `functions/`.
Deploy through Pages Git integration or Wrangler; dashboard drag-and-drop uploads
do not deploy Pages Functions. Static assets remain static via `public/_routes.json`.
See [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/)
and [Mailjet sender requirements](https://dev.mailjet.com/docs/email-api/send-api-v31/send-basic-email).

The email contains the shopper's name, email, optional international phone number,
and selected phone country. It does not place an order or clear the cart. The UI
shows success after Mailjet accepts the message, and keeps entered details on
failure. No lead data or credentials are written to application logs.

The endpoint limits request size, rejects cross-origin submissions, and throttles
repeated attempts per IP within each running function isolate. For a shared limit
across Cloudflare isolates, configure an edge rate-limit rule for `/api/leads`.

Run `npm run test:leads` to test the API with mocked Mailjet responses; it never
sends real email. `npm run preview` previews static assets only; use `npm run dev`
or the deployed Pages site to exercise the API.
