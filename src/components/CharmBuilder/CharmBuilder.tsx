import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { gsap } from 'gsap'
import type { Charm } from '@/content/home'
import { cartPromo, FREE_PINS_PER_BAG } from '@/hooks/cartPromo'
import { addToCart, useCart } from '@/hooks/useCart'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import styles from './CharmBuilder.module.css'

type Bag = { id: string; name: string; swatch: string; image: string }

type CharmBuilderProps = {
  eyebrow: string
  title: string
  intro: string
  introTouch: string
  charmPrice: number
  bagPrice: number
  bagRegularPrice?: number
  charms: Charm[]
  bags: Bag[]
  bagPhoto: { width: number; height: number }
  eyelets: [number, number][]
  fillOrder: Record<Charm['kind'], number[]>
}

/** One charm screwed into one eyelet. Array order = the order they were added */
type Placed = { eyelet: number; charmId: string }

type Drag = {
  charm: Charm
  /** Eyelet the charm is being moved from, or null when dragged in from a card */
  from: number | null
  pointerId: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  active: boolean
  ghost: HTMLImageElement | null
  moveX: ((v: number) => void) | null
  moveY: ((v: number) => void) | null
  /** Offset from the pointer to the charm's eyelet point, so it doesn't jump under the finger */
  offX: number
  offY: number
  target: number | null
  timer: number | null
}

const STORAGE_KEY = 'stelle-sky'
const SNAP_RADIUS = 70 // px on screen: how close a drop must be to an eyelet
const LONG_PRESS_MS = 350 // hold time before a charm on the bag lifts off (touch)
const MOVE_THRESHOLD = 6 // px of movement that starts a mouse drag

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/* ---------- save / share helpers: "#sky=<colour>.<eyelet>-<charm>_<eyelet>-<charm>" ---------- */

function encodeSky(color: number, placed: Placed[], charms: Charm[]) {
  const pairs = placed.map((p) => `${p.eyelet}-${charms.findIndex((c) => c.id === p.charmId)}`)
  return `${color}.${pairs.join('_')}`
}

function decodeSky(raw: string, charms: Charm[], eyeletCount: number, bagCount: number) {
  const [c, rest = ''] = raw.split('.')
  const color = Number(c)
  if (!Number.isInteger(color) || color < 0 || color >= bagCount) return null
  const seen = new Set<number>()
  const placed: Placed[] = []
  for (const pair of rest.split('_').filter(Boolean)) {
    const [e, ch] = pair.split('-').map(Number)
    const charm = charms[ch]
    if (!charm || !Number.isInteger(e) || e < 0 || e >= eyeletCount || seen.has(e)) continue
    seen.add(e)
    placed.push({ eyelet: e, charmId: charm.id })
  }
  return { color, placed }
}

function readSavedSky(charms: Charm[], eyeletCount: number, bagCount: number) {
  try {
    const fromLink = window.location.hash.match(/sky=([\d._-]+)/)?.[1]
    const raw = fromLink ?? window.localStorage.getItem(STORAGE_KEY)
    return raw ? decodeSky(raw, charms, eyeletCount, bagCount) : null
  } catch {
    return null
  }
}

/* ---------------------------------------------------------------------------------------------- */

export function CharmBuilder({
  eyebrow,
  title,
  intro,
  introTouch,
  charmPrice,
  bagPrice,
  bagRegularPrice,
  charms,
  bags,
  bagPhoto,
  eyelets,
  fillOrder,
}: CharmBuilderProps) {
  const reducedMotion = usePrefersReducedMotion()

  const [color, setColor] = useState(0)
  const [placed, setPlaced] = useState<Placed[]>([])
  const [dragging, setDragging] = useState(false)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const [movingFrom, setMovingFrom] = useState<number | null>(null)
  const [status, setStatus] = useState('')

  const sectionRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef(new Map<string, HTMLButtonElement>())
  const pieceRefs = useRef(new Map<number, HTMLImageElement>())
  const justPlaced = useRef<number | null>(null)
  const removing = useRef(new Set<number>())
  const drag = useRef<Drag | null>(null)
  /** Ignore the click that follows a drag (until this time) */
  const suppressClickUntil = useRef(0)
  const loaded = useRef(false)
  /** Eyelets a charm is currently flying to (not yet in state) */
  const reserved = useRef(new Set<number>())

  const charmById = useMemo(() => new Map(charms.map((c) => [c.id, c])), [charms])
  const taken = useMemo(() => new Set(placed.map((p) => p.eyelet)), [placed])

  /* ----- restore a shared link or the last design on this device ----- */
  useEffect(() => {
    const saved = readSavedSky(charms, eyelets.length, bags.length)
    if (saved) {
      setColor(saved.color)
      setPlaced(saved.placed)
    }
    loaded.current = true
  }, [charms, eyelets.length, bags.length])

  useEffect(() => {
    if (!loaded.current) return
    try {
      window.localStorage.setItem(STORAGE_KEY, encodeSky(color, placed, charms))
    } catch {
      // Storage unavailable (private mode): the design just isn't remembered
    }
  }, [color, placed, charms])

  /* ----- geometry: eyelet centre on screen, and on-bag size in CSS px ----- */
  const eyeletOnScreen = useCallback(
    (i: number) => {
      const r = layerRef.current?.getBoundingClientRect()
      if (!r) return null
      const [x, y] = eyelets[i]
      return { x: r.left + (x / bagPhoto.width) * r.width, y: r.top + (y / bagPhoto.height) * r.height, scale: r.width / bagPhoto.width }
    },
    [eyelets, bagPhoto.width, bagPhoto.height],
  )

  const isFree = useCallback((i: number) => !taken.has(i) && !reserved.current.has(i), [taken])
  const nextFreeEyelet = useCallback((kind: Charm['kind']) => fillOrder[kind].find(isFree) ?? null, [fillOrder, isFree])

  /* ----- the "screw in" moment, right after a charm lands ----- */
  useLayoutEffect(() => {
    const eyelet = justPlaced.current
    if (eyelet === null) return
    justPlaced.current = null
    const el = pieceRefs.current.get(eyelet)
    if (!el || reducedMotion) return
    const tl = gsap.timeline()
    tl.fromTo(el, { rotation: -220, scale: 1.25 }, { rotation: 0, scale: 1, duration: 0.75, ease: 'back.out(1.7)' })
    const spark = layerRef.current?.querySelector<HTMLElement>(`[data-spark="${eyelet}"]`)
    if (spark) tl.fromTo(spark, { scale: 0.4, opacity: 0.9 }, { scale: 2.2, opacity: 0, duration: 0.7, ease: 'power2.out' }, 0.25)
    return () => {
      tl.progress(1).kill() // never leave a charm half-turned
    }
  }, [placed, reducedMotion])

  /* ----- cards drift in the first time the section is seen ----- */
  useEffect(() => {
    const section = sectionRef.current
    if (!section || reducedMotion) return
    const cards = Array.from(cardRefs.current.values())
    gsap.set(cards, { opacity: 0, y: 24 })
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        gsap.to(cards, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out' })
        io.disconnect()
      },
      { threshold: 0.15 },
    )
    io.observe(section)
    return () => {
      io.disconnect()
      gsap.set(cards, { clearProps: 'opacity,transform' })
    }
  }, [reducedMotion])

  /* ----- place / remove ----- */
  const commit = useCallback((charmId: string, eyelet: number) => {
    reserved.current.delete(eyelet)
    justPlaced.current = eyelet
    setPlaced((prev) => (prev.some((p) => p.eyelet === eyelet) ? prev : [...prev, { eyelet, charmId }]))
  }, [])

  const makeGhost = (charm: Charm, x: number, y: number, width: number) => {
    const g = document.createElement('img')
    g.src = charm.cutout
    g.alt = ''
    g.className = styles.ghost
    g.style.width = `${width}px`
    document.body.appendChild(g)
    gsap.set(g, { x, y, xPercent: -charm.onBag.anchorX * 100, yPercent: -charm.onBag.anchorY * 100 })
    return g
  }

  /** Fly a charm from its card to an eyelet, then screw it in */
  const flyTo = (charm: Charm, eyelet: number, from: DOMRect | null) => {
    const to = eyeletOnScreen(eyelet)
    if (!to || !from || reducedMotion) {
      commit(charm.id, eyelet)
      return
    }
    reserved.current.add(eyelet)
    const width = charm.onBag.w * to.scale
    const ghost = makeGhost(charm, from.left + from.width / 2, from.top + from.height / 2, width)
    const tl = gsap.timeline({
      onComplete: () => {
        ghost.remove()
        commit(charm.id, eyelet)
      },
    })
    tl.fromTo(ghost, { scale: 1.6, rotation: -25, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.65, ease: 'power2.inOut' }, 0)
      .to(ghost, { x: to.x, duration: 0.65, ease: 'power1.inOut' }, 0)
      .to(ghost, { y: to.y, duration: 0.65, ease: 'back.in(1.2)' }, 0) // the slight dip gives an arc
  }

  const clickSuppressed = () => performance.now() < suppressClickUntil.current

  const addCharm = (charm: Charm) => {
    if (clickSuppressed()) return
    const eyelet = nextFreeEyelet(charm.kind)
    if (eyelet === null) {
      setStatus('All 16 eyelets are full. Tap a charm on the bag to take it off.')
      return
    }
    setStatus(`${charm.name} added.`)
    flyTo(charm, eyelet, cardRefs.current.get(charm.id)?.getBoundingClientRect() ?? null)
  }

  const removeAt = (eyelet: number) => {
    if (clickSuppressed() || removing.current.has(eyelet)) return
    const el = pieceRefs.current.get(eyelet)
    const name = charmById.get(placed.find((p) => p.eyelet === eyelet)?.charmId ?? '')?.name
    const drop = () => {
      removing.current.delete(eyelet)
      setPlaced((prev) => prev.filter((p) => p.eyelet !== eyelet))
      if (name) setStatus(`${name} removed.`)
    }
    if (!el || reducedMotion) return drop()
    removing.current.add(eyelet)
    // unscrew: spin back out and lift off
    gsap.to(el, { rotation: 200, y: -40, scale: 0.6, opacity: 0, duration: 0.45, ease: 'power2.in', onComplete: drop })
  }

  const clearAll = () => {
    if (!placed.length) return
    const els = placed.map((p) => pieceRefs.current.get(p.eyelet)).filter(Boolean) as HTMLImageElement[]
    const done = () => {
      setPlaced([])
      setStatus('All charms cleared.')
    }
    if (reducedMotion || !els.length) return done()
    gsap.to(els, { y: -30, opacity: 0, rotation: 120, scale: 0.7, duration: 0.35, stagger: 0.04, ease: 'power2.in', onComplete: done })
  }

  const pickColor = (i: number) => {
    if (i === color) return
    setColor(i)
    if (!reducedMotion && layerRef.current) {
      gsap.fromTo(layerRef.current, { scale: 0.97 }, { scale: 1, duration: 0.7, ease: 'power3.out' })
    }
  }

  /* ----- drag & drop -----
   * Cards: drag with a mouse/pen (on touch screens a tap adds, so the page keeps scrolling).
   * Charms on the bag: long-press (touch or mouse) or just drag (mouse) to move to another eyelet.
   */
  const nearestFreeEyelet = (x: number, y: number, allow: number | null) => {
    let best: number | null = null
    let bestD = SNAP_RADIUS
    for (let i = 0; i < eyelets.length; i++) {
      if (!isFree(i) && i !== allow) continue
      const p = eyeletOnScreen(i)
      if (!p) continue
      const d = Math.hypot(p.x - x, p.y - y)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return best
  }

  const activateDrag = (d: Drag) => {
    d.active = true
    setDragging(true)
    const scale = eyeletOnScreen(0)?.scale ?? 0.4
    let x = d.lastX
    let y = d.lastY
    if (d.from !== null) {
      // Lift the charm from its eyelet: start exactly where it sits
      const at = eyeletOnScreen(d.from)
      if (at) {
        d.offX = at.x - d.lastX
        d.offY = at.y - d.lastY
        x = at.x
        y = at.y
      }
      setMovingFrom(d.from)
      const piece = pieceRefs.current.get(d.from)
      if (piece) gsap.set(piece, { opacity: 0 })
      navigator.vibrate?.(12)
    }
    d.ghost = makeGhost(d.charm, x, y, d.charm.onBag.w * scale)
    d.ghost.classList.add(styles.ghostLifted)
    if (!reducedMotion) gsap.fromTo(d.ghost, { scale: 1 }, { scale: 1.18, duration: 0.2, ease: 'power2.out' })
    d.moveX = gsap.quickTo(d.ghost, 'x', { duration: 0.16, ease: 'power3' })
    d.moveY = gsap.quickTo(d.ghost, 'y', { duration: 0.16, ease: 'power3' })
  }

  const startDrag = (e: ReactPointerEvent<HTMLElement>, charm: Charm, from: number | null) => {
    if (e.button !== 0 || drag.current) return
    const isTouch = e.pointerType === 'touch'
    if (from === null && isTouch) return // cards: tap to add on touch screens
    const d: Drag = {
      charm,
      from,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      active: false,
      ghost: null,
      moveX: null,
      moveY: null,
      offX: 0,
      offY: 0,
      target: from,
      timer: null,
    }
    drag.current = d
    if (from !== null) {
      // long press lifts a charm off the bag
      d.timer = window.setTimeout(() => {
        d.timer = null
        if (drag.current === d && !d.active) activateDrag(d)
      }, LONG_PRESS_MS)
    }

    const cleanup = () => {
      if (d.timer !== null) window.clearTimeout(d.timer)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      drag.current = null
    }

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== d.pointerId) return
      d.lastX = ev.clientX
      d.lastY = ev.clientY
      if (!d.active) {
        const moved = Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY)
        if (isTouch) {
          if (moved > 10) cleanup() // finger slid before the long press: not a move
          return
        }
        if (moved < MOVE_THRESHOLD) return
        activateDrag(d)
      }
      ev.preventDefault()
      const x = ev.clientX + d.offX
      const y = ev.clientY + d.offY
      d.moveX?.(x)
      d.moveY?.(y)
      const t = nearestFreeEyelet(x, y, d.from)
      if (t !== d.target) {
        d.target = t
        setDropTarget(t)
      }
    }

    const finish = (dropped: boolean) => {
      cleanup()
      if (!d.active || !d.ghost) return // a plain click/tap: onClick handles it
      suppressClickUntil.current = performance.now() + 450
      setDragging(false)
      setDropTarget(null)
      setMovingFrom(null)
      const ghost = d.ghost
      const target = dropped ? d.target : null
      const showPieceAgain = () => {
        const piece = d.from !== null ? pieceRefs.current.get(d.from) : null
        if (piece) gsap.set(piece, { opacity: 1 })
      }

      // Dropped on an eyelet
      if (target !== null) {
        const to = eyeletOnScreen(target)
        if (d.from === null) reserved.current.add(target)
        gsap.to(ghost, {
          x: to?.x ?? d.lastX,
          y: to?.y ?? d.lastY,
          scale: 1,
          duration: 0.22,
          ease: 'power3.out',
          onComplete: () => {
            ghost.remove()
            if (d.from === null) {
              setStatus(`${d.charm.name} added.`)
              commit(d.charm.id, target)
            } else if (target === d.from) {
              showPieceAgain() // put back where it was
            } else {
              const from = d.from
              setStatus(`${d.charm.name} moved.`)
              justPlaced.current = target
              setPlaced((prev) => prev.map((p) => (p.eyelet === from ? { ...p, eyelet: target } : p)))
            }
          },
        })
        return
      }

      // Missed: a new charm floats back to its card, a moved one returns to its eyelet
      if (d.from === null) {
        const home = cardRefs.current.get(d.charm.id)?.getBoundingClientRect()
        gsap.to(ghost, {
          x: home ? home.left + home.width / 2 : d.lastX,
          y: home ? home.top + home.height / 2 : d.lastY,
          opacity: 0,
          scale: 0.6,
          duration: 0.4,
          ease: 'power2.in',
          onComplete: () => ghost.remove(),
        })
      } else {
        const at = eyeletOnScreen(d.from)
        gsap.to(ghost, {
          x: at?.x ?? d.lastX,
          y: at?.y ?? d.lastY,
          scale: 1,
          duration: 0.35,
          ease: 'power3.inOut',
          onComplete: () => {
            ghost.remove()
            showPieceAgain()
          },
        })
      }
    }

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId === d.pointerId) finish(true)
    }
    const onCancel = (ev: PointerEvent) => {
      if (ev.pointerId === d.pointerId) finish(false)
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
  }

  // Clean up a ghost if the section unmounts mid-drag
  useEffect(() => () => drag.current?.ghost?.remove(), [])

  /* ----- totals: the pins on the bag, with the "buy a bag, get 3 pins free" promotion ----- */
  const count = placed.length
  const { lines } = useCart()
  const bagIds = bags.map((b) => b.id)
  const promo = cartPromo(lines, (l) => bagIds.includes(l.id) || l.custom?.kind === 'bag')
  const promoOn = promo.bags > 0
  const freeHere = Math.min(count, promo.freePinsLeft)
  const subtotal = count * charmPrice
  const discount = freeHere * charmPrice
  const total = subtotal - discount

  /* ----- add the pins (not the bag) to the cart ----- */
  const addPins = () => {
    if (!count) return
    const perCharm = new Map<string, number>()
    placed.forEach((p) => perCharm.set(p.charmId, (perCharm.get(p.charmId) ?? 0) + 1))
    perCharm.forEach((qty, id) => {
      const c = charms.find((x) => x.id === id)
      if (!c) return
      addToCart(`charm-${c.id}`, qty, {
        name: `${c.name} pin`,
        image: c.image,
        price: charmPrice,
        detail: c.description,
        kind: 'charm',
      })
    })
    setStatus(`${count} ${count === 1 ? 'pin' : 'pins'} added to your cart.`)
  }

  /* ----- the promotion banner can add the bag shown in the builder ----- */
  const addBag = () => {
    addToCart(bags[color].id)
    setStatus(`${bags[color].name} bag added. ${FREE_PINS_PER_BAG} pins are now free.`)
  }

  return (
    <section id="sky" className={styles.section} aria-labelledby="builder-title">
      {/* ===== Heading: on the page background, outside the dark builder (same style as #MyStelle) ===== */}
      <div className={styles.head}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 id="builder-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.intro}>
          <span className={styles.introPointer}>{intro}</span>
          <span className={styles.introTouch}>{introTouch}</span>
        </p>
      </div>

      <div ref={sectionRef} className={styles.builder}>
        {/* ===== Stage: the real bag photo with charms on its eyelets ===== */}
        <div className={styles.stageCol}>
          <div className={styles.stage}>
            <div
              ref={layerRef}
              className={`${styles.layer} ${dragging ? styles.isDragging : ''}`}
              style={{ aspectRatio: `${bagPhoto.width} / ${bagPhoto.height}` } as CSSProperties}
            >
              {bags.map((b, i) => (
                <img
                  key={b.name}
                  className={`${styles.bagPhoto} ${i === color ? styles.bagActive : ''}`}
                  src={b.image}
                  alt={i === color ? `${b.name} STELLÉ bag` : ''}
                  aria-hidden={i === color ? undefined : true}
                  width={bagPhoto.width}
                  height={bagPhoto.height}
                  draggable={false}
                />
              ))}

              {/* eyelet hotspots: glow while dragging, sparkle when a charm lands */}
              {eyelets.map(([x, y], i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={`${styles.hotspot} ${!taken.has(i) || movingFrom === i ? styles.hotspotFree : ''} ${dropTarget === i ? styles.hotspotTarget : ''}`}
                  style={{ left: `${(x / bagPhoto.width) * 100}%`, top: `${(y / bagPhoto.height) * 100}%` }}
                >
                  <span className={styles.spark} data-spark={i} />
                </span>
              ))}

              {placed.map((p) => {
                const c = charmById.get(p.charmId)
                if (!c) return null
                const [x, y] = eyelets[p.eyelet]
                return (
                  <button
                    key={p.eyelet}
                    type="button"
                    className={`${styles.piece} ${c.kind === 'Drop' ? styles.pieceDrop : ''}`}
                    style={{
                      left: `${(x / bagPhoto.width) * 100}%`,
                      top: `${(y / bagPhoto.height) * 100}%`,
                      width: `${(c.onBag.w / bagPhoto.width) * 100}%`,
                      transform: `translate(${-c.onBag.anchorX * 100}%, ${-c.onBag.anchorY * 100}%)`,
                    }}
                    onClick={() => removeAt(p.eyelet)}
                    onPointerDown={(e) => startDrag(e, c, p.eyelet)}
                    onContextMenu={(e) => e.preventDefault()}
                    aria-label={`${c.name} on eyelet ${p.eyelet + 1}. Press to remove; long-press and drag to move.`}
                  >
                    <img
                      ref={(el) => {
                        if (el) pieceRefs.current.set(p.eyelet, el)
                        else pieceRefs.current.delete(p.eyelet)
                      }}
                      className={styles.pieceImg}
                      src={c.cutout}
                      alt=""
                      draggable={false}
                      style={{ transformOrigin: `${c.onBag.anchorX * 100}% ${c.onBag.anchorY * 100}%` }}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <div className={styles.swatches} role="radiogroup" aria-label="Bag colour">
            {bags.map((b, i) => (
              <button
                key={b.name}
                type="button"
                role="radio"
                aria-checked={i === color}
                className={`${styles.swatch} ${i === color ? styles.swatchOn : ''}`}
                onClick={() => pickColor(i)}
              >
                <span className={styles.swatchDot} style={{ background: b.swatch }} />
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* ===== Panel: the charm grid + summary ===== */}
        <div className={styles.panel}>
          <ul className={styles.grid}>
            {charms.map((c) => {
              // Eyelets this charm is on, oldest first; Remove takes off the most recent one
              const onBag = placed.filter((p) => p.charmId === c.id)
              const lastEyelet = onBag.length ? onBag[onBag.length - 1].eyelet : null
              return (
                <li key={c.id} className={onBag.length ? styles.slotOn : undefined}>
                  <button
                    ref={(el) => {
                      if (el) cardRefs.current.set(c.id, el)
                      else cardRefs.current.delete(c.id)
                    }}
                    type="button"
                    className={styles.card}
                    onClick={() => addCharm(c)}
                    onPointerDown={(e) => startDrag(e, c, null)}
                    aria-label={`Add ${c.name}, ${usd.format(charmPrice)}`}
                  >
                    <span className={styles.media}>
                      <img className={styles.image} src={c.image} alt="" width={640} height={800} loading="lazy" decoding="async" draggable={false} />
                      <span className={styles.plus} aria-hidden="true">
                        +
                      </span>
                    </span>
                    <span className={styles.meta}>
                      <span className={styles.name}>{c.name}</span>
                      <span className={styles.price}>{usd.format(charmPrice)}</span>
                    </span>
                    <span className={styles.kind}>{c.kind}</span>
                  </button>
                  {lastEyelet !== null ? (
                    <button
                      type="button"
                      className={styles.remove}
                      onClick={() => removeAt(lastEyelet)}
                      aria-label={`Remove ${c.name} from the bag${onBag.length > 1 ? ` (${onBag.length} on the bag)` : ''}`}
                    >
                      <span aria-hidden="true">×</span> Remove
                      {onBag.length > 1 ? <span className={styles.removeCount}>{onBag.length}</span> : null}
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>

          <div className={styles.summary}>
            {promoOn ? (
              <div key="on" className={`${styles.promo} ${styles.promoOn}`} role="status">
                <span className={styles.promoStar} aria-hidden="true">
                  <StarIcon />
                </span>
                <span className={styles.promoText}>
                  <strong>Promotion applies</strong>
                  <span>
                    Your bag unlocks {FREE_PINS_PER_BAG * promo.bags} free pins
                    {promo.freePinsLeft > 0
                      ? ` · ${promo.freePinsLeft} still free to pick`
                      : ' · all used'}
                  </span>
                </span>
              </div>
            ) : (
              <div key="off" className={`${styles.promo} ${styles.promoOff}`}>
                <span className={styles.promoGift} aria-hidden="true">
                  <GiftIcon />
                </span>
                <span className={styles.promoText}>
                  <strong>Buy a bag, get {FREE_PINS_PER_BAG} pins free</strong>
                  <span>Add a bag to your cart and your first {FREE_PINS_PER_BAG} pins cost nothing.</span>
                </span>
                <button type="button" className={styles.promoBtn} onClick={addBag}>
                  Add {bags[color].name} bag · {usd.format(bagPrice)}
                  {bagRegularPrice && bagRegularPrice > bagPrice && <s>{usd.format(bagRegularPrice)}</s>}
                </button>
              </div>
            )}

            <div className={styles.row}>
              <span>
                {count} {count === 1 ? 'pin' : 'pins'} × {usd.format(charmPrice)}
              </span>
              <span className={styles.amount}>{usd.format(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className={`${styles.row} ${styles.discountRow}`}>
                <span>
                  {freeHere} free {freeHere === 1 ? 'pin' : 'pins'} with your bag
                </span>
                <span className={styles.amount}>−{usd.format(discount)}</span>
              </div>
            )}
            <div className={`${styles.row} ${styles.totalRow}`}>
              <span>Pins total</span>
              <span className={styles.amount}>{usd.format(total)}</span>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={addPins} disabled={!count}>
                {count
                  ? `Add ${count} ${count === 1 ? 'pin' : 'pins'} to cart · ${usd.format(total)}`
                  : 'Pick pins to add them to your cart'}
              </button>
            </div>
            <div className={styles.footer}>
              <button type="button" className={styles.clear} onClick={clearAll} disabled={!count}>
                Clear all charms
              </button>
              <p className={styles.status} role="status" aria-live="polite">
                {status}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M12 2.5l2.2 6.6 6.8.4-5.3 4.3 1.8 6.7L12 16.7l-5.5 3.8 1.8-6.7L3 9.5l6.8-.4z"
        fill="currentColor"
      />
    </svg>
  )
}

function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <rect x="3.5" y="9" width="17" height="11.5" rx="1.5" />
        <path d="M2.5 9h19M12 9v11.5" />
        <path d="M12 9c-1.5-3.5-5.5-4-5.5-1.5S10 9 12 9zm0 0c1.5-3.5 5.5-4 5.5-1.5S14 9 12 9z" />
      </g>
    </svg>
  )
}
