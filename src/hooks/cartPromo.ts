import type { CartLine } from './useCart'

/** "Buy a bag, get 3 pins free": free pins unlocked by each bag in the cart */
export const FREE_PINS_PER_BAG = 3

export type CartPromo = {
  bags: number
  pins: number
  /** Pins made free by the bags in the cart */
  freePins: number
  /** Free pins the shopper can still add */
  freePinsLeft: number
  /** Money taken off the pins */
  discount: number
}

/**
 * Works out the bag promotion for a cart.
 * `isBag` says which lines are bags; pins are custom lines of kind 'charm'.
 */
export function cartPromo(lines: CartLine[], isBag: (line: CartLine) => boolean): CartPromo {
  const bags = lines.filter(isBag).reduce((n, l) => n + l.qty, 0)
  const pinLines = lines.filter((l) => l.custom?.kind === 'charm')
  const pins = pinLines.reduce((n, l) => n + l.qty, 0)
  const allowance = bags * FREE_PINS_PER_BAG

  // Cheapest pins go free first (all pins cost the same today, but stay fair if that changes)
  const unitPrices = pinLines
    .flatMap((l) => Array.from({ length: l.qty }, () => l.custom?.price ?? 0))
    .sort((a, b) => a - b)
  const freePins = Math.min(pins, allowance)
  const discount = unitPrices.slice(0, freePins).reduce((s, p) => s + p, 0)

  return { bags, pins, freePins, freePinsLeft: Math.max(0, allowance - pins), discount }
}
