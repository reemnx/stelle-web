import type { CSSProperties } from 'react'
import type { GalleryPhoto } from '@/content/home'
import styles from './SocialGallery.module.css'

type SocialGalleryProps = {
  eyebrow: string
  title: string
  intro: string
  /** Each inner array is one row; rows alternate direction */
  rows: GalleryPhoto[][]
  /** Seconds for one full loop of a row. Higher = slower */
  speed?: number
}

export function SocialGallery({ eyebrow, title, intro, rows, speed = 55 }: SocialGalleryProps) {
  return (
    <section className={styles.section} aria-labelledby="gallery-title">
      <div className={styles.head}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 id="gallery-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.intro}>{intro}</p>
      </div>

      <div className={styles.rows}>
        {rows.map((row, i) => (
          <MarqueeRow
            key={i}
            photos={row}
            direction={i % 2 === 0 ? 'left' : 'right'}
            // Slightly different speeds so the rows never line up
            duration={speed + i * 8}
          />
        ))}
      </div>
    </section>
  )
}

type MarqueeRowProps = {
  photos: GalleryPhoto[]
  direction: 'left' | 'right'
  duration: number
}

function MarqueeRow({ photos, direction, duration }: MarqueeRowProps) {
  // The set is rendered 4×; the track slides by half its width (2 sets) and loops
  // seamlessly. Two sets per half keep the strip wider than even very wide screens.
  const loop = [...photos, ...photos, ...photos, ...photos]

  return (
    <div className={styles.row}>
      <ul
        className={`${styles.track} ${direction === 'right' ? styles.toRight : styles.toLeft}`}
        style={{ '--duration': `${duration}s` } as CSSProperties}
      >
        {loop.map((p, i) => {
          const isCopy = i >= photos.length
          return (
            <li key={i} className={styles.item} aria-hidden={isCopy || undefined}>
              <figure className={styles.figure}>
                <img
                  className={styles.image}
                  src={p.src}
                  width={p.width}
                  height={p.height}
                  alt={isCopy ? '' : p.alt}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
                <figcaption className={styles.caption}>{p.caption}</figcaption>
              </figure>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
