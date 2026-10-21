import type { HeroVideoSource } from '@/components/HeroBanner'

/**
 * Homepage content. Swap the demo videos for the real STELLÉ hero films by
 * putting the files in public/videos/ and pointing to them, e.g.
 *   src: '/videos/hero-desktop.mp4'
 */
export const heroVideos: { desktop: HeroVideoSource; mobile: HeroVideoSource } = {
  // "Day to night" FW26-style edit, 16:9 (480p preview; swap for the 1080p finalize later)
  desktop: {
    src: '/videos/hero-fw26-desktop.mp4',
  },
  // Same edit, 9:16
  mobile: {
    src: '/videos/hero-fw26-mobile.mp4',
  },
}

export type BagColor = {
  /** Product id, used as the cart key */
  id: string
  name: string
  /** Shown behind the photo, and instead of it until the photo exists */
  tint: string
  /** Put the photo in public/images/bags/ and keep this path in sync */
  image: string
  alt: string
  /** Price in USD */
  price: number
  /** Regular price shown struck through while the promotion runs; leave out to hide */
  compareAtPrice?: number
}

/** Early-bird bag price and the regular price shown struck through (USD) */
const BAG_PRICE = 179
const BAG_REGULAR_PRICE = 250

/** "One bag. Three skies." section */
export const bagCollection = {
  title: 'One bag. Three skies.',
  intro:
    'Full-grain calfskin, 24 × 18 × 9 cm, a single ring handle. Each bag ships with Polaris, Vega and Comet.',
  /** Small label on each card while the early-bird price runs; empty string hides it */
  promoLabel: 'Early bird',
  colors: [
    {
      id: 'bag-chocolate',
      name: 'Chocolate',
      tint: '#4A3428',
      image: '/images/bags/chocolate.jpg',
      alt: 'The STELLÉ bag in chocolate leather, empty gold eyelets ready for charms',
      price: BAG_PRICE,
      compareAtPrice: BAG_REGULAR_PRICE,
    },
    {
      id: 'bag-pistachio',
      name: 'Pistachio',
      tint: '#B9C4A0',
      image: '/images/bags/pistachio.jpg',
      alt: 'The STELLÉ bag in pistachio leather, empty gold eyelets ready for charms',
      price: BAG_PRICE,
      compareAtPrice: BAG_REGULAR_PRICE,
    },
    {
      id: 'bag-off-white',
      name: 'Off-white',
      tint: '#E4DACB',
      image: '/images/bags/off-white.jpg',
      alt: 'The STELLÉ bag in off-white leather, empty gold eyelets ready for charms',
      price: BAG_PRICE,
      compareAtPrice: BAG_REGULAR_PRICE,
    },
  ] satisfies BagColor[],
}

export type Charm = {
  id: string
  name: string
  /** Flush sits on the eyelet; Drop hangs from it on a chain */
  kind: 'Flush' | 'Drop'
  description: string
  /** Card photo in public/images/charms/ (640 × 800, cut from the FIRST LIGHT flat lay) */
  image: string
  /** Transparent cut-out shown on the bag, public/images/charms/onbag/ */
  cutout: string
  /** Size on the bag in bag-photo pixels (photo is 1200 × 1490) and the point that sits on the eyelet (0–1) */
  onBag: { w: number; h: number; anchorX: number; anchorY: number }
}

const charm = (
  id: string,
  name: string,
  kind: Charm['kind'],
  description: string,
  w: number,
  h: number,
  anchorY: number,
): Charm => ({
  id,
  name,
  kind,
  description,
  image: `/images/charms/${id}.jpg`,
  cutout: `/images/charms/onbag/${id}.webp`,
  onBag: { w, h, anchorX: 0.5, anchorY },
})

/** Constellation Builder: the First Light charms + the bag they go on */
export const charmBuilder = {
  eyebrow: 'First Light · 10 charms',
  title: 'Build your constellation',
  /** Desktop (mouse) and touch-screen versions of the how-to line */
  intro: 'Click a charm to add it, or drag it onto any eyelet. On the bag, drag a charm to move it or click it to take it off.',
  introTouch: 'Tap a charm to add it. On the bag, long-press a charm to move it, or tap it to take it off.',
  /** Price of each charm, in USD */
  charmPrice: 19.9,
  /** Charms that come free with every bag */
  includedCharms: 3,
  charms: [
    charm('polaris', 'Polaris', 'Flush', 'Eight-point star, pavé centre', 126, 130, 0.5),
    charm('luna', 'Luna', 'Flush', 'Crescent, mother-of-pearl', 100, 125, 0.5),
    charm('vega', 'Vega', 'Flush', 'Baroque pearl in prongs', 80, 101, 0.5),
    charm('sol', 'Sol', 'Flush', 'Hand-hammered sun disc', 114, 120, 0.5),
    charm('coeur', 'Coeur', 'Flush', 'Puffed heart, cream enamel', 110, 98, 0.5),
    charm('initial', 'Initial', 'Flush', 'Serif letter, A to Z', 95, 101, 0.5),
    charm('comet', 'Comet', 'Drop', 'Two falling stars on a chain', 66, 283, 0.0182),
    charm('pearl-drop', 'Pearl Drop', 'Drop', 'Freshwater pearl, fine chain', 42, 216, 0.0239),
    charm('cle', 'Clé', 'Drop', 'Vintage key, the next chapter', 66, 243, 0.0212),
    charm('coin', 'Constellation Coin', 'Drop', 'Engraved medallion', 112, 228, 0.0226),
  ] satisfies Charm[],
  /** Bag price in the builder (same early-bird price as the bag cards) */
  bagPrice: BAG_PRICE,
  bagRegularPrice: BAG_REGULAR_PRICE,
  bags: [
    { name: 'Chocolate', swatch: '#4A3428', image: '/images/bags/chocolate.jpg' },
    { name: 'Pistachio', swatch: '#B9C4A0', image: '/images/bags/pistachio.jpg' },
    { name: 'Off-white', swatch: '#E4DACB', image: '/images/bags/off-white.jpg' },
  ],
  /** Bag photo size and the centre of each of the 16 eyelets on it (same on all three colours) */
  bagPhoto: { width: 1200, height: 1490 },
  eyelets: [
    [296, 628], [929, 630],
    [354, 743], [486, 743], [744, 743], [871, 743],
    [353, 851], [486, 851], [616, 851], [746, 851], [870, 851],
    [355, 959], [485, 959], [615, 959], [743, 959], [871, 959],
  ] as [number, number][],
  /**
   * Order eyelets fill in when a charm is tapped. Flush charms start in the middle rows;
   * drops start on the bottom row and corners so their chains don't cover other charms.
   */
  fillOrder: {
    Flush: [8, 3, 4, 7, 9, 2, 5, 6, 10, 13, 12, 14, 11, 15, 0, 1],
    Drop: [13, 12, 14, 11, 15, 0, 1, 8, 7, 9, 6, 10, 3, 4, 2, 5],
  },
}

export type GalleryPhoto = {
  src: string
  /** Pixel size of the file, so the browser reserves the right space */
  width: number
  height: number
  alt: string
  /** Short label shown on hover */
  caption: string
}

const photo = (file: string, square: boolean, alt: string, caption: string): GalleryPhoto => ({
  src: `/images/gallery/${file}.jpg`,
  width: square ? 800 : 447,
  height: 800,
  alt,
  caption,
})

/** "#MyStelle" social-proof gallery: two rows that drift in opposite directions */
export const socialGallery = {
  eyebrow: 'Seen on you',
  title: '#MyStelle',
  intro: 'How the first owners carry their sky. Tag #MyStelle to be featured.',
  rows: [
    [
      photo('g01-glove-tray', false, 'A white-gloved hand presents the chocolate bag on a tray against green velvet', 'Glove & tray · Chocolate'),
      photo('g02-legs-asphalt', true, 'Loafer, white sock and the chocolate bag on magazines with a coffee', 'Asphalt · Chocolate'),
      photo('g03-stacked-trio', false, 'Chocolate, pistachio and off-white bags stacked into a tower', 'The trio'),
      photo('g04-stone-steps', true, 'The pistachio bag on stone steps beside sunglasses and earphones', 'Stone steps · Pistachio'),
      photo('g05-under-arm', false, 'The off-white bag tucked under the arm with a leopard skirt', 'Under the arm · Off-white'),
    ],
    [
      photo('g06-leather-gloves', true, 'Cognac leather opera gloves lift the pistachio bag', 'Leather gloves · Pistachio'),
      photo('g07-paris-cafe', false, 'The chocolate bag on a Paris café table', 'Paris café · Chocolate'),
      photo('g08-macro-pin', true, 'Close-up of the Polaris charm being screwed into an off-white bag', 'Polaris, up close'),
      photo('g09-alley-steps', false, 'A woman walks down old alley steps carrying the pistachio bag', 'Alley steps · Pistachio'),
      photo('g10-rooftop-night', true, 'The off-white bag beside a glass of wine on a rooftop at night', 'Rooftop night · Off-white'),
    ],
  ] satisfies GalleryPhoto[][],
}
