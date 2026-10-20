import type { HeroVideoSource } from '@/components/HeroBanner'

/**
 * Homepage content. Swap the demo videos for the real STELLÉ hero films by
 * putting the files in public/videos/ and pointing to them, e.g.
 *   src: '/videos/hero-desktop.mp4'
 */
export const heroVideos: { desktop: HeroVideoSource; mobile: HeroVideoSource } = {
  // DEMO — replace with the 16:9 STELLÉ hero film
  desktop: {
    src: '/videos/hero-desktop.mp4',
  },
  // DEMO — replace with the 9:16 STELLÉ hero film
  mobile: {
    src: '/videos/hero-mobile.mp4',
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
      alt: 'The STELLÉ bag in chocolate leather, empty gold eyelets ready for charms',
      price: '',
    },
    {
      name: 'Pistachio',
      tint: '#B9C4A0',
      image: '/images/bags/pistachio.jpg',
      alt: 'The STELLÉ bag in pistachio leather, empty gold eyelets ready for charms',
      price: '',
    },
    {
      name: 'Off-white',
      tint: '#E4DACB',
      image: '/images/bags/off-white.jpg',
      alt: 'The STELLÉ bag in off-white leather, empty gold eyelets ready for charms',
      price: '',
    },
  ] satisfies BagColor[],
}

export type Charm = {
  name: string
  /** Flush sits in the eyelet; Drop hangs on a chain */
  kind: 'Flush' | 'Drop'
  description: string
  /** Photo in public/images/charms/ (640 × 800, cut from the FIRST LIGHT flat lay) */
  image: string
  price: string
}

const CHARM_PRICE = '$19.90'

/** "First Light" charm drop section */
export const charmDrop = {
  eyebrow: 'The Sky · Drop 01',
  title: 'First Light',
  intro:
    'Ten charms named for the first stars of the evening. Six sit flush in the eyelet, four fall on a fine chain.',
  charms: [
    { name: 'Polaris', kind: 'Flush', description: 'Eight-point star, pavé centre', image: '/images/charms/polaris.jpg', price: CHARM_PRICE },
    { name: 'Luna', kind: 'Flush', description: 'Crescent, mother-of-pearl', image: '/images/charms/luna.jpg', price: CHARM_PRICE },
    { name: 'Vega', kind: 'Flush', description: 'Baroque pearl in prongs', image: '/images/charms/vega.jpg', price: CHARM_PRICE },
    { name: 'Sol', kind: 'Flush', description: 'Hand-hammered sun disc', image: '/images/charms/sol.jpg', price: CHARM_PRICE },
    { name: 'Coeur', kind: 'Flush', description: 'Puffed heart, cream enamel', image: '/images/charms/coeur.jpg', price: CHARM_PRICE },
    { name: 'Initial', kind: 'Flush', description: 'Serif letter, A to Z', image: '/images/charms/initial.jpg', price: CHARM_PRICE },
    { name: 'Comet', kind: 'Drop', description: 'Two falling stars on a chain', image: '/images/charms/comet.jpg', price: CHARM_PRICE },
    { name: 'Pearl Drop', kind: 'Drop', description: 'Freshwater pearl, fine chain', image: '/images/charms/pearl-drop.jpg', price: CHARM_PRICE },
    { name: 'Clé', kind: 'Drop', description: 'Vintage key, the next chapter', image: '/images/charms/cle.jpg', price: CHARM_PRICE },
    { name: 'Constellation Coin', kind: 'Drop', description: 'Engraved medallion', image: '/images/charms/coin.jpg', price: CHARM_PRICE },
  ] satisfies Charm[],
}
