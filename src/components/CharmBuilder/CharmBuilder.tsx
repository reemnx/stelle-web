import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { gsap } from 'gsap'
import type { Charm } from '@/content/home'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import styles from './CharmBuilder.module.css'

type Bag = { name: string; swatch: string; image: string }

type CharmBuilderProps = {
  eyebrow: string
  title: string
  intro: string
  charmPrice: number
  includedCharms: number
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
  pointerId: number
  startX: number
  startY: number
  active: boolean
  ghost: HTMLImageElement | null
  moveX: ((v: number) => void) | null
  moveY: ((v: number) => void) | null
  target: number | null
}

const STORAGE_KEY = 'stelle-sky'
const SNAP_RADIUS = 70 // px on screen: how close a drop must be to an eyelet

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
  charmPrice,
  includedCharms,
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
  const [status, setStatus] = useState('')

  const sectionRef = useRef<HTMLElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef(new Map<string, HTMLButtonElement>())
  const pieceRefs = useRef(new Map<number, HTMLImageElement>())
  const justPlaced = useRef<number | null>(null)
  const removing = useRef(new Set<number>())
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const loaded = useRef(false)
  /** Eyelets a charm is currently flying to (not yet in state) */
  const reserved = useRef(new Set<number>())
  const prevCount = useRef(0)

  const charmById = useMemo(() => new Map(charms.map((c) => [c.id, c])), [charms])
  const taken = useMemo(() => new Set(placed.map((p) => p.eyelet)), [placed])

  /** Constellation lines: each charm links to the nearest charm placed before it */
  const links = useMemo(
    () =>
      placed.slice(1).map((p, k) => {
        const [x, y] = eyelets[p.eyelet]
        let best = placed[0].eyelet
        let bestD = Infinity
        for (const q of placed.slice(0, k + 1)) {
          const [qx, qy] = eyelets[q.eyelet]
          const d = Math.hypot(qx - x, qy - y)
          if (d < bestD) {
            bestD = d
            best = q.eyelet
          }
        }
        return { from: best, to: p.eyelet }
      }),
    [placed, eyelets],
  )

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

  /* ----- new constellation line draws itself in ----- */
  useLayoutEffect(() => {
    const grew = placed.length > prevCount.current
    prevCount.current = placed.length
    if (!grew || reducedMotion || placed.length < 2) return
    const line = layerRef.current?.querySelector<SVGLineElement>(`[data-line="${placed.length - 1}"]`)
    if (!line) return
    const len = Math.hypot(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1')), Number(line.getAttribute('y2')) - Number(line.getAttribute('y1')))
    const tw = gsap.fromTo(line, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.6, delay: 0.35, ease: 'power2.out' })
    return () => {
      tw.progress(1).kill()
    }
  }, [placed.length, reducedMotion])

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

  const addCharm = (charm: Charm) => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    const eyelet = nextFreeEyelet(charm.kind)
    if (eyelet === null) {
      setStatus('All 16 eyelets are full. Tap a charm on the bag to take it off.')
      return
    }
    setStatus(`${charm.name} added.`)
    flyTo(charm, eyelet, cardRefs.current.get(charm.id)?.getBoundingClientRect() ?? null)
  }

  const removeAt = (eyelet: number) => {
    if (removing.current.has(eyelet)) return
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

  /* ----- drag & drop (mouse / pen; touch uses tap-to-add so the page still scrolls) ----- */
  const nearestFreeEyelet = (x: number, y: number) => {
    let best: number | null = null
    let bestD = SNAP_RADIUS
    for (let i = 0; i < eyelets.length; i++) {
      if (!isFree(i)) continue
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

  const onCardPointerDown = (e: ReactPointerEvent<HTMLButtonElement>, charm: Charm) => {
    if (e.pointerType === 'touch' || e.button !== 0) return
    drag.current = { charm, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, active: false, ghost: null, moveX: null, moveY: null, target: null }

    const onMove = (ev: PointerEvent) => {
      const d = drag.current
      if (!d || ev.pointerId !== d.pointerId) return
      if (!d.active) {
        if (Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY) < 6) return
        d.active = true
        setDragging(true)
        const scale = eyeletOnScreen(0)?.scale ?? 0.4
        d.ghost = makeGhost(d.charm, ev.clientX, ev.clientY, d.charm.onBag.w * scale)
        d.ghost.classList.add(styles.ghostLifted)
        d.moveX = gsap.quickTo(d.ghost, 'x', { duration: 0.18, ease: 'power3' })
        d.moveY = gsap.quickTo(d.ghost, 'y', { duration: 0.18, ease: 'power3' })
      }
      d.moveX?.(ev.clientX)
      d.moveY?.(ev.clientY)
      const t = nearestFreeEyelet(ev.clientX, ev.clientY)
      if (t !== d.target) {
        d.target = t
        setDropTarget(t)
      }
    }

    const onUp = (ev: PointerEvent) => {
      const d = drag.current
      if (!d || ev.pointerId !== d.pointerId) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      drag.current = null
      if (!d.active || !d.ghost) return // a plain click: onClick adds it
      suppressClick.current = true
      window.setTimeout(() => (suppressClick.current = false), 0)
      setDragging(false)
      setDropTarget(null)
      const ghost = d.ghost
      const target = d.target
      const to = target !== null ? eyeletOnScreen(target) : null
      if (target !== null && to) {
        reserved.current.add(target)
        setStatus(`${d.charm.name} added.`)
        gsap.to(ghost, {
          x: to.x,
          y: to.y,
          scale: 1,
          duration: 0.22,
          ease: 'power3.out',
          onComplete: () => {
            ghost.remove()
            commit(d.charm.id, target)
          },
        })
      } else {
        // missed the bag: float back to the card
        const home = cardRefs.current.get(d.charm.id)?.getBoundingClientRect()
        gsap.to(ghost, {
          x: home ? home.left + home.width / 2 : ev.clientX,
          y: home ? home.top + home.height / 2 : ev.clientY,
          opacity: 0,
          scale: 0.6,
          duration: 0.4,
          ease: 'power2.in',
          onComplete: () => ghost.remove(),
        })
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // Clean up a ghost if the section unmounts mid-drag
  useEffect(() => () => drag.current?.ghost?.remove(), [])

  /* ----- share ----- */
  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#sky=${encodeSky(color, placed, charms)}`
    const text = `My STELLÉ constellation: ${bags[color].name} bag with ${placed.length} ${placed.length === 1 ? 'charm' : 'charms'}.`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My STELLÉ constellation', text, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setStatus('Link copied. Anyone who opens it sees your exact bag.')
    } catch {
      // Share sheet closed or clipboard blocked: nothing to do
    }
  }

  /* ----- totals ----- */
  const count = placed.length
  const extra = Math.max(0, count - includedCharms)

  return (
    <section id="sky" ref={sectionRef} className={styles.section} aria-labelledby="builder-title">
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

            {/* gold lines joining the charms in the order they were added */}
            <svg className={styles.lines} viewBox={`0 0 ${bagPhoto.width} ${bagPhoto.height}`} aria-hidden="true">
              {links.map((l, i) => {
                const [x1, y1] = eyelets[l.from]
                const [x2, y2] = eyelets[l.to]
                return <line key={`${l.from}-${l.to}`} data-line={i + 1} x1={x1} y1={y1} x2={x2} y2={y2} />
              })}
            </svg>

            {/* eyelet hotspots: glow while dragging, sparkle when a charm lands */}
            {eyelets.map(([x, y], i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`${styles.hotspot} ${!taken.has(i) ? styles.hotspotFree : ''} ${dropTarget === i ? styles.hotspotTarget : ''}`}
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
                  aria-label={`Remove ${c.name} from eyelet ${p.eyelet + 1}`}
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
        <div className={styles.head}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 id="builder-title" className={styles.title}>
            {title}
          </h2>
          <p className={styles.intro}>{intro}</p>
        </div>

        <ul className={styles.grid}>
          {charms.map((c) => (
            <li key={c.id}>
              <button
                ref={(el) => {
                  if (el) cardRefs.current.set(c.id, el)
                  else cardRefs.current.delete(c.id)
                }}
                type="button"
                className={styles.card}
                onClick={() => addCharm(c)}
                onPointerDown={(e) => onCardPointerDown(e, c)}
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
            </li>
          ))}
        </ul>

        <div className={styles.summary}>
          <div className={styles.row}>
            <span>{bags[color].name} bag</span>
            <span>{count} / {eyelets.length} eyelets</span>
          </div>
          <div className={styles.row}>
            <span>
              {count} {count === 1 ? 'charm' : 'charms'} · {Math.min(count, includedCharms)} of {includedCharms} included
            </span>
            <span>{extra ? `+ ${usd.format(extra * charmPrice)}` : 'Included'}</span>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => setStatus('Pre-sale opens soon. Your design is saved on this device.')}>
              Reserve this bag
            </button>
            <button type="button" className={styles.secondary} onClick={share} disabled={!count}>
              Share my sky
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
    </section>
  )
}
