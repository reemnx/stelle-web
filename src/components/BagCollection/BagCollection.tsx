import { useRef, useState } from 'react'
import type { BagColor } from '@/content/home'
import styles from './BagCollection.module.css'

type BagCollectionProps = {
  title: string
  intro: string
  colors: BagColor[]
}

export function BagCollection({ title, intro, colors }: BagCollectionProps) {
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
          <li key={color.name} className={styles.item}>
            <BagCard color={color} />
          </li>
        ))}
      </ul>

      <div className={styles.dots} aria-label="Choose a colour">
        {colors.map((color, i) => (
          <button
            key={color.name}
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

function BagCard({ color }: { color: BagColor }) {
  // Until the real photo is added, the color tint fills the frame
  const [imageMissing, setImageMissing] = useState(false)

  return (
    <article className={styles.card}>
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
      </div>
      <div className={styles.meta}>
        <h3 className={styles.name}>{color.name}</h3>
        {color.price && <span className={styles.price}>{color.price}</span>}
      </div>
    </article>
  )
}
