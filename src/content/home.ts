import type { HeroVideoSource } from '@/components/HeroBanner'

/**
 * Homepage content. Swap the demo videos for the real STELLÉ hero films by
 * putting the files in public/videos/ and pointing to them, e.g.
 *   src: '/videos/hero-desktop.mp4'
 */
export const heroVideos: { desktop: HeroVideoSource; mobile: HeroVideoSource } = {
  // DEMO — replace with the 16:9 STELLÉ hero film
  desktop: {
    src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  },
  // DEMO — replace with the 9:16 STELLÉ hero film
  mobile: {
    src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
}
