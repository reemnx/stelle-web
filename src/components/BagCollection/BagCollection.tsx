import { useState } from 'react'
import type { BagColor } from '@/content/home'
import styles from './BagCollection.module.css'

type BagCollectionProps = {
  title: string
  intro: string
  colors: BagColor[]
}

export function BagCollection({ title, intro, colors }: BagCollectionProps) {
  return (
    <section id="bags" className={styles.section} aria-labelledby="bags-title">
      <div className={styles.head}>
        <h2 id="bags-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.intro}>{intro}</p>
      </div>

      <ul className={styles.grid}>
        {colors.map((color) => (
          <li key={color.name}>
            <BagCard color={color} />
          </li>
        ))}
      </ul>
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
