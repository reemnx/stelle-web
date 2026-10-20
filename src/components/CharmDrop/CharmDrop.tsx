import type { Charm } from '@/content/home'
import styles from './CharmDrop.module.css'

type CharmDropProps = {
  eyebrow: string
  title: string
  intro: string
  charms: Charm[]
}

export function CharmDrop({ eyebrow, title, intro, charms }: CharmDropProps) {
  return (
    <section id="sky" className={styles.section} aria-labelledby="sky-title">
      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.titleBlock}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h2 id="sky-title" className={styles.title}>
              {title}
            </h2>
          </div>
          <p className={styles.intro}>{intro}</p>
        </div>

        <ul className={styles.grid}>
          {charms.map((charm) => (
            <li key={charm.name} className={styles.card}>
              <div className={styles.media}>
                <img
                  className={styles.image}
                  src={charm.image}
                  alt={`${charm.name} charm — ${charm.description.toLowerCase()}`}
                  width={640}
                  height={800}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className={styles.meta}>
                <div className={styles.nameRow}>
                  <h3 className={styles.name}>{charm.name}</h3>
                  <span className={styles.price}>{charm.price}</span>
                </div>
                <p className={styles.description}>{charm.description}</p>
                <span className={styles.kind}>{charm.kind}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
