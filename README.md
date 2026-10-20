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

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check only |

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
