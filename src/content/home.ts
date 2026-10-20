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

export type BagColor = {
  name: string
  /** Shown behind the photo, and instead of it until the photo exists */
  tint: string
  /** Put the photo in public/images/bags/ and keep this path in sync */
  image: string
  alt: string
  /** Leave empty to hide the price */
  price: string
}

/** "One bag. Three skies." section */
export const bagCollection = {
  title: 'One bag. Three skies.',
  intro:
    'Full-grain calfskin, 24 × 18 × 9 cm, a single ring handle. Each bag ships with Polaris, Vega and Comet.',
  colors: [
    {
      name: 'Chocolate',
      tint: '#4A3428',
      image: '/images/bags/chocolate.jpg',
      alt: 'The STELLÉ bag in chocolate leather with gold charms',
      price: '',
    },
    {
      name: 'Pistachio',
      tint: '#B9C4A0',
      image: '/images/bags/pistachio.jpg',
      alt: 'The STELLÉ bag in pistachio leather with gold charms',
      price: '',
    },
    {
      name: 'Off-white',
      tint: '#E4DACB',
      image: '/images/bags/off-white.jpg',
      alt: 'The STELLÉ bag in off-white leather with gold charms',
      price: '',
    },
  ] satisfies BagColor[],
}
