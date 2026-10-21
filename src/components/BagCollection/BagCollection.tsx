import { useRef, useState } from 'react'
import type { BagColor } from '@/content/home'
import { addToCart, CART_MAX_QTY, setCartQty, useCart } from '@/hooks/useCart'
import styles from './BagCollection.module.css'

type BagCollectionProps = {
  title: string
  intro: string
  promoLabel?: string
  colors: BagColor[]
}

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n % 1 ? 2 : 0,
  }).format(n)

export function BagCollection({ title, intro, promoLabel, colors }: BagCollectionProps) {
  // On phones the list becomes a swipeable carousel; track which card is in view for the dots
  const listRef = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  const onScroll = () => {
    const list = listRef.current
    if (!list) return
    const first = list.firstElementChild as HTMLElement | null
    if (!first) return
    const step = first.offsetWidth + parseFloat(getComputedStyle(list).columnGap || '0')
    setActive(Math.min(colors.length - 1, Math.max(0, Math.round(list.scrollLeft / step))))
  }

  const goTo = (index: number) => {
    const item = listRef.current?.children[index] as HTMLElement | undefined
    item?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
  }

  return (
    <section id="bags" className={styles.section} aria-labelledby="bags-title">
      <div className={styles.head}>
        <h2 id="bags-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.intro}>{intro}</p>
      </div>

      <ul ref={listRef} className={styles.grid} onScroll={onScroll}>
        {colors.map((color) => (
          <li key={color.id} className={styles.item}>
            <ProductCard color={color} promoLabel={promoLabel} />
          </li>
        ))}
      </ul>

      <div className={styles.dots} aria-label="Choose a colour">
        {colors.map((color, i) => (
          <button
            key={color.id}
            type="button"
            className={`${styles.dot} ${i === active ? styles.dotActive : ''}`}
            aria-label={`Show ${color.name}`}
            aria-current={i === active}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </section>
  )
}

function ProductCard({ color, promoLabel }: { color: BagColor; promoLabel?: string }) {
  // Until the real photo is added, the color tint fills the frame
  const [imageMissing, setImageMissing] = useState(false)
  const { qtyOf } = useCart()
  const inCart = qtyOf(color.id)
  // Quantity picked before adding; once the bag is in the cart the stepper edits the cart itself
  const [pending, setPending] = useState(1)
  const qty = inCart > 0 ? inCart : pending

  const change = (delta: number) => {
    if (inCart > 0) setCartQty(color.id, inCart + delta) // down to 0 removes it
    else setPending((q) => Math.max(1, Math.min(CART_MAX_QTY, q + delta)))
  }

  const onSale = color.compareAtPrice !== undefined && color.compareAtPrice > color.price
  const titleId = `bag-${color.id}-title`

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.media} style={{ backgroundColor: color.tint }}>
        {!imageMissing && (
          <img
            className={styles.image}
            src={color.image}
            alt={color.alt}
            loading="lazy"
            decoding="async"
            onError={() => setImageMissing(true)}
          />
        )}
        {onSale && promoLabel && <span className={styles.badge}>{promoLabel}</span>}
      </div>

      <div className={styles.body}>
        <div className={styles.meta}>
          <h3 id={titleId} className={styles.name}>
            {color.name}
          </h3>
          <p className={styles.prices}>
            <span className={styles.price}>{usd(color.price)}</span>
            {onSale && (
              <s className={styles.compare}>
                <span className={styles.srOnly}>Regular price </span>
                {usd(color.compareAtPrice ?? 0)}
              </s>
            )}
          </p>
        </div>

        <div className={styles.actions}>
          <div className={styles.stepper} role="group" aria-label={`Quantity of ${color.name}`}>
            <button
              type="button"
              className={styles.stepBtn}
              onClick={() => change(-1)}
              disabled={inCart === 0 && pending <= 1}
              aria-label={inCart === 1 ? `Remove ${color.name} from cart` : 'Decrease quantity'}
            >
              −
            </button>
            <span className={styles.qty} aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              className={styles.stepBtn}
              onClick={() => change(1)}
              disabled={qty >= CART_MAX_QTY}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {inCart > 0 ? (
            <span className={`${styles.cartBtn} ${styles.added}`} role="status">
              <CheckIcon />
              Added to cart
            </span>
          ) : (
            <button
              type="button"
              className={styles.cartBtn}
              onClick={() => {
                addToCart(color.id, pending)
                setPending(1)
              }}
            >
              Add to cart
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function CheckIcon() {
  return (
    <svg className={styles.check} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M3.5 8.5l3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
