import { Link } from 'react-router-dom'
import styles from './Header.module.css'

/**
 * Top site header. For now: the STELLÉ wordmark only, centered.
 * Navigation, search and bag links will be added on either side later.
 */
export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo} aria-label="STELLÉ — home">
          STELLÉ
        </Link>
      </div>
    </header>
  )
}
