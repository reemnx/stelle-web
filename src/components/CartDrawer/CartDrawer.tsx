import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { CART_MAX_QTY, onCartAdd, removeFromCart, setCartQty, useCart } from '@/hooks/useCart'
import styles from './CartDrawer.module.css'

export type CartProduct = {
  id: string
  name: string
  image: string
  price: number
  compareAtPrice?: number
  detail?: string
}

type CartDrawerProps = {
  /** Everything that can be in the cart, looked up by id */
  products: CartProduct[]
}

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n % 1 ? 2 : 0,
  }).format(n)

/**
 * Floating cart button (shown once something is in the cart) that opens the cart:
 * a side panel on desktop, a bottom sheet on phones (same markup, CSS decides).
 */
export function CartDrawer({ products }: CartDrawerProps) {
  const { lines, count } = useCart()
  const [open, setOpen] = useState(false)
  const fabRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; dy: number } | null>(null)
  // Where focus was when the cart opened, so closing returns there (e.g. the card's button)
  const opener = useRef<HTMLElement | null>(null)

  const openCart = () => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setOpen(true)
  }

  // Adding a bag opens the cart right away
  useEffect(
    () =>
      onCartAdd(() => {
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        setOpen(true)
      }),
    [],
  )

  const items = lines
    .map((l) => ({
      line: l,
      product: l.custom ? { id: l.id, ...l.custom } : products.find((p) => p.id === l.id),
    }))
    .filter((x): x is { line: typeof x.line; product: CartProduct } => Boolean(x.product))
  const total = items.reduce((sum, { line, product }) => sum + line.qty * product.price, 0)
  const savings = items.reduce(
    (sum, { line, product }) =>
      sum + line.qty * Math.max(0, (product.compareAtPrice ?? product.price) - product.price),
    0,
  )

  // Esc closes, the page behind doesn't scroll, focus moves in and comes back out
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus({ preventScroll: true })
    const back = opener.current ?? fabRef.current
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      back?.focus({ preventScroll: true })
    }
  }, [open])

  // Bottom sheet: drag the handle down to close
  const onDragStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!window.matchMedia('(max-width: 767px)').matches) return
    drag.current = { startY: e.clientY, dy: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }
  const onDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || !sheetRef.current) return
    drag.current.dy = Math.max(0, e.clientY - drag.current.startY)
    sheetRef.current.style.transform = `translateY(${drag.current.dy}px)`
  }
  const onDragEnd = () => {
    if (!drag.current || !sheetRef.current) return
    const { dy } = drag.current
    drag.current = null
    sheetRef.current.style.transition = ''
    sheetRef.current.style.transform = ''
    if (dy > 90) setOpen(false)
  }

  const visible = count > 0 || open

  // While the bar is on screen, pad the page bottom (phones) so it never hides content
  useEffect(() => {
    document.documentElement.classList.toggle('has-cart-bar', count > 0)
    return () => document.documentElement.classList.remove('has-cart-bar')
  }, [count])

  return createPortal(
    <>
      <button
        ref={fabRef}
        type="button"
        className={`${styles.fab} ${visible && !open ? styles.fabShown : ''}`}
        onClick={openCart}
        aria-label={`Open cart, ${count} ${count === 1 ? 'item' : 'items'}, ${usd(total)}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        tabIndex={visible && !open ? 0 : -1}
      >
        <span className={styles.fabIcon}>
          <BagIcon />
        </span>
        <span className={styles.fabText}>
          <span className={styles.fabLabel}>View bag</span>
          <span className={styles.fabTotal}>{usd(total)}</span>
        </span>
        {/* phones only: the full-width bar gets an explicit call to action */}
        <span className={styles.fabCta} aria-hidden="true">
          {count} {count === 1 ? 'item' : 'items'}
          <ArrowIcon />
        </span>
        {/* re-keyed on every change so the count pops */}
        <span key={count} className={styles.badge} aria-hidden="true">
          {count}
        </span>
      </button>

      <div
        className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        aria-hidden={!open}
        inert={!open}
      >
        <div
          className={styles.head}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <span className={styles.handle} aria-hidden="true" />
          <h2 id="cart-title" className={styles.title}>
            Your bag <span className={styles.count}>({count})</span>
          </h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={() => setOpen(false)}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close cart"
          >
            <CloseIcon />
          </button>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <p>Your bag is empty.</p>
            <button type="button" className={styles.secondary} onClick={() => setOpen(false)}>
              Keep browsing
            </button>
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {items.map(({ line, product }) => (
                <li key={product.id} className={styles.line}>
                  <img className={styles.thumb} src={product.image} alt="" width={72} height={90} />
                  <div className={styles.info}>
                    <div className={styles.row}>
                      <span className={styles.name}>{product.name}</span>
                      <span className={styles.lineTotal}>{usd(line.qty * product.price)}</span>
                    </div>
                    {product.detail && <span className={styles.detail}>{product.detail}</span>}
                    <span className={styles.unit}>
                      {usd(product.price)}
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <s>{usd(product.compareAtPrice)}</s>
                      )}
                    </span>
                    <div className={styles.row}>
                      <div className={styles.stepper} role="group" aria-label={`Quantity of ${product.name}`}>
                        <button
                          type="button"
                          onClick={() => setCartQty(product.id, line.qty - 1)}
                          aria-label={line.qty === 1 ? `Remove ${product.name}` : 'Decrease quantity'}
                        >
                          −
                        </button>
                        <span aria-live="polite">{line.qty}</span>
                        <button
                          type="button"
                          onClick={() => setCartQty(product.id, line.qty + 1)}
                          disabled={line.qty >= CART_MAX_QTY}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button type="button" className={styles.remove} onClick={() => removeFromCart(product.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className={styles.foot}>
              {savings > 0 && (
                <p className={styles.savings}>
                  <span>Early-bird savings</span>
                  <span>−{usd(savings)}</span>
                </p>
              )}
              <p className={styles.total}>
                <span>Total</span>
                <span>{usd(total)}</span>
              </p>
              <p className={styles.note}>Each bag ships with Polaris, Vega and Comet. Free shipping.</p>
              <button type="button" className={styles.checkout}>
                Checkout · {usd(total)}
              </button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body,
  )
}

function BagIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <circle cx="12" cy="7.5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 10.5h14l-1.2 9.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3L5 10.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
