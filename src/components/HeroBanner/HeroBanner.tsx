import { useEffect, useRef, type ReactNode } from 'react'
import { useMediaQuery, usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import styles from './HeroBanner.module.css'

export type HeroVideoSource = {
  /** Video file URL, e.g. "/videos/hero-fw26-desktop.mp4" */
  src: string
  /** Optional MIME type (currently unused; the browser detects it) */
  type?: string
  /** Still image shown before the video loads, and instead of it for reduced motion */
  poster?: string
}

export type HeroBannerProps = {
  /** Landscape video for wide screens */
  desktop: HeroVideoSource
  /** Portrait video for phones */
  mobile: HeroVideoSource
  /** Screens narrower than this (px) get the mobile video. Default 768 */
  mobileBreakpoint?: number
  /** Describe the video if it carries meaning; leave empty if purely decorative */
  ariaLabel?: string
  /** Optional overlay content (headline, buttons) */
  children?: ReactNode
}

export function HeroBanner({
  desktop,
  mobile,
  mobileBreakpoint = 768,
  ariaLabel,
  children,
}: HeroBannerProps) {
  const isMobile = useMediaQuery(`(max-width: ${mobileBreakpoint - 1}px)`)
  const prefersReducedMotion = usePrefersReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  const scrollToNext = () => {
    const next = sectionRef.current?.nextElementSibling
    next?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' })
  }

  const source = isMobile ? mobile : desktop

  // Browsers only autoplay muted video. React sets `muted` as a property,
  // which some mobile browsers ignore for autoplay, so enforce it and start
  // playback explicitly whenever the source changes.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = true
    if (prefersReducedMotion) {
      video.pause()
      return
    }
    video.play().catch(() => {
      // Autoplay can still be blocked (e.g. low-power mode); the poster stays visible.
    })
  }, [source.src, prefersReducedMotion])

  return (
    <section ref={sectionRef} className={styles.hero}>
      <video
        // A new key remounts the element so the browser loads the new file
        key={source.src}
        ref={videoRef}
        className={styles.video}
        poster={source.poster}
        autoPlay={!prefersReducedMotion}
        muted
        loop
        playsInline
        preload="auto"
        aria-label={ariaLabel}
        aria-hidden={ariaLabel ? undefined : true}
        // src directly on <video>: no MIME-type guess that could make the
        // browser skip a .mov/.webm file
        src={source.src}
        onError={(e) => {
          const err = e.currentTarget.error
          console.error(
            `[HeroBanner] Video failed to load: ${source.src}`,
            err ? `(code ${err.code}: ${err.message || 'see MediaError codes'})` : '',
          )
        }}
      />

      {children ? <div className={styles.content}>{children}</div> : null}

      {/* Mobile only (hidden by CSS on desktop): hints there is more below */}
      <button
        type="button"
        className={styles.scrollCue}
        onClick={scrollToNext}
        aria-label="Scroll to the next section"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 4v15M5.5 12.5 12 19l6.5-6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </section>
  )
}
