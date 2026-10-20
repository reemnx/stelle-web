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
  // move the first charm on the bag to another eyelet: long-press, then drag
  const piece = page.getByRole('button', { name: /^Polaris on eyelet/ })
  const box = await piece.boundingBox()
  if (box) {
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    if (isMobile) {
      const cdp = await page.context().newCDPSession(page)
      const touch = (type, px, py) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: px, y: py }] })
      await touch('touchStart', x, y)
      await page.waitForTimeout(500)
      for (let i = 1; i <= 10; i++) await touch('touchMove', x - i * 6, y + i * 6)
      await page.waitForTimeout(150)
      await touch('touchEnd')
    } else {
      await page.mouse.move(x, y)
      await page.mouse.down()
      for (let i = 1; i <= 10; i++) await page.mouse.move(x - i * 13, y + i * 11)
      await page.mouse.up()
    }
    await page.waitForTimeout(1100)
    await page.screenshot({ path: `shots/${name}-035-moved.png` })
    console.log(name, 'status:', await page.locator('[role=status]').innerText())
  }
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
