// Takes review screenshots of the homepage builder (used by .github/workflows/screenshots.yml)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const URL = 'http://localhost:4173/'
mkdirSync('shots', { recursive: true })
const browser = await chromium.launch()

async function run(name, viewport, isMobile) {
  const page = await browser.newPage({ viewport, isMobile, hasTouch: isMobile, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.screenshot({ path: `shots/${name}-01-top.png` })
  const sky = page.locator('#sky')
  await sky.scrollIntoViewIfNeeded()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `shots/${name}-02-builder-empty.png` })
  for (const label of ['Polaris', 'Luna', 'Comet', 'Sol', 'Coeur', 'Clé']) {
    const card = page.getByRole('button', { name: new RegExp(`^Add ${label},`) })
    // keep the card just below the sticky bag, like a person scrolling would
    await card.evaluate((el) => el.scrollIntoView({ block: 'end', inline: 'nearest' }))
    await card.click()
    await page.waitForTimeout(1100)
  }
  await sky.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `shots/${name}-03-builder-six.png` })
  await page.getByRole('radio', { name: /Pistachio/ }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `shots/${name}-04-pistachio.png` })
  await page.screenshot({ path: `shots/${name}-05-full.png`, fullPage: true })
  console.log(name, 'errors:', errors.length ? errors : 'none')
  await page.close()
}

await run('desktop', { width: 1440, height: 900 }, false)
await run('mobile', { width: 390, height: 844 }, true)
await browser.close()
