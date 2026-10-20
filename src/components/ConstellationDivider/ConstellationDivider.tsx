import styles from './ConstellationDivider.module.css'

/**
 * Decorative gold "constellation" line between sections.
 * Coordinates are in a 1280 × 60 space. Stars are positioned in % so they
 * stay round and the same size at any width; only the lines stretch.
 */
const VIEW_W = 1280
const VIEW_H = 60

type Star = { x: number; y: number; r: number }

const STARS: Star[] = [
  { x: 40, y: 30, r: 3 },
  { x: 210, y: 14, r: 2 },
  { x: 380, y: 40, r: 3 },
  { x: 560, y: 22, r: 2 },
  { x: 740, y: 44, r: 3 },
  { x: 900, y: 16, r: 2 },
  { x: 1080, y: 36, r: 3 },
  { x: 1240, y: 20, r: 2 },
]

/** Each line connects stars by their index in STARS */
const LINES: number[][] = [
  [0, 1, 2, 3],
  [5, 6, 7],
]

export function ConstellationDivider() {
  return (
    <div className={styles.divider} aria-hidden="true">
      <div className={styles.field}>
        <svg
          className={styles.lines}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
        >
          {LINES.map((line) => (
            <polyline
              key={line.join('-')}
              points={line.map((i) => `${STARS[i].x},${STARS[i].y}`).join(' ')}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {STARS.map((s) => (
          <span
            key={`${s.x}-${s.y}`}
            className={styles.star}
            style={{
              left: `${(s.x / VIEW_W) * 100}%`,
              top: `${(s.y / VIEW_H) * 100}%`,
              width: s.r * 2,
              height: s.r * 2,
            }}
          />
        ))}
      </div>
    </div>
  )
}
