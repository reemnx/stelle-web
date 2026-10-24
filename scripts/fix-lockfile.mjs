// Rewrites package URLs in package-lock.json from a private/company npm registry
// (e.g. Artifactory) back to the public registry, so CI and Cloudflare can install.
// Usage: node scripts/fix-lockfile.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs'

const PUBLIC = 'https://registry.npmjs.org/'
const file = new URL('../package-lock.json', import.meta.url)
const lock = JSON.parse(readFileSync(file, 'utf8'))
const check = process.argv.includes('--check')

const bad = []
for (const [path, pkg] of Object.entries(lock.packages ?? {})) {
  const url = pkg.resolved
  if (!url || url.startsWith(PUBLIC) || !url.startsWith('http')) continue
  // ".../<name>/-/<file>.tgz" → "https://registry.npmjs.org/<name>/-/<file>.tgz"
  const name = path.replace(/^.*node_modules\//, '')
  const tail = url.slice(url.lastIndexOf('/-/'))
  bad.push(path)
  if (!check) pkg.resolved = `${PUBLIC}${name}${tail}`
}

if (check) {
  if (bad.length) {
    console.error(`package-lock.json points ${bad.length} package(s) at a private registry:`)
    bad.forEach((p) => console.error(`  ${p}`))
    console.error('Run "npm run fix:lockfile" and commit package-lock.json (see README).')
    process.exit(1)
  }
  console.log('package-lock.json uses the public npm registry.')
} else {
  writeFileSync(file, JSON.stringify(lock, null, 2) + '\n')
  console.log(bad.length ? `Fixed ${bad.length} package URL(s).` : 'Nothing to fix.')
}
