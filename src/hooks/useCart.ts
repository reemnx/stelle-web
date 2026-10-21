import { useSyncExternalStore } from 'react'

/** A one-off item built on the site (e.g. a bag with its charms), stored with the line itself */
export type CartCustomItem = {
  name: string
  image: string
  price: number
  compareAtPrice?: number
  /** Short description shown under the name */
  detail?: string
  /** What it is, for promotions ('charm' pins can be free with a bag) */
  kind?: 'bag' | 'charm'
}

/** One line in the cart: a product id and how many of it (plus the item itself for custom builds) */
export type CartLine = { id: string; qty: number; custom?: CartCustomItem }

const isCustom = (c: unknown): c is CartCustomItem =>
  !!c &&
  typeof c === 'object' &&
  typeof (c as CartCustomItem).name === 'string' &&
  typeof (c as CartCustomItem).image === 'string' &&
  typeof (c as CartCustomItem).price === 'number'

const STORAGE_KEY = 'stelle:cart:v1'
const MAX_QTY = 10
const EMPTY: CartLine[] = []

/* ---------- a tiny store shared by every component, persisted in localStorage ---------- */

let lines: CartLine[] = read()
const listeners = new Set<() => void>()
const addListeners = new Set<(id: string, qty: number) => void>()

/** Called whenever something is added with addToCart (e.g. to open the cart) */
export function onCartAdd(fn: (id: string, qty: number) => void) {
  addListeners.add(fn)
  return () => {
    addListeners.delete(fn)
  }
}

function read(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (l): l is CartLine =>
          typeof l?.id === 'string' && Number.isInteger(l?.qty) && l.qty > 0,
      )
      .map((l) => ({
        id: l.id,
        qty: Math.min(l.qty, MAX_QTY),
        ...(isCustom(l.custom) ? { custom: l.custom } : {}),
      }))
  } catch {
    return []
  }
}

function write(next: CartLine[]) {
  lines = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private mode or storage full: the cart still works for this visit
  }
  listeners.forEach((l) => l())
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  // Keep tabs in sync: another tab changed the cart
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      lines = read()
      onChange()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

const clamp = (qty: number) => Math.max(0, Math.min(MAX_QTY, Math.round(qty)))

/** Add qty of a product (adds to what is already there). Pass `custom` for a one-off build */
export function addToCart(id: string, qty = 1, custom?: CartCustomItem) {
  const existing = lines.find((l) => l.id === id)
  writeLine(id, (existing?.qty ?? 0) + qty, custom ?? existing?.custom)
  addListeners.forEach((fn) => fn(id, qty))
}

/** Set the exact quantity of a product; 0 removes it */
export function setCartQty(id: string, qty: number) {
  writeLine(id, qty, lines.find((l) => l.id === id)?.custom)
}

function writeLine(id: string, qty: number, custom?: CartCustomItem) {
  const q = clamp(qty)
  const index = lines.findIndex((l) => l.id === id)
  const next = lines.filter((l) => l.id !== id)
  if (q > 0) {
    // keep the line where it was so the cart list doesn't reshuffle
    next.splice(index < 0 ? next.length : index, 0, { id, qty: q, ...(custom ? { custom } : {}) })
  }
  write(next)
}

export function removeFromCart(id: string) {
  setCartQty(id, 0)
}

/** Current cart lines; re-renders when the cart changes (here or in another tab) */
export function useCart() {
  const cart = useSyncExternalStore(
    subscribe,
    () => lines,
    () => EMPTY,
  )
  const count = cart.reduce((n, l) => n + l.qty, 0)
  const qtyOf = (id: string) => cart.find((l) => l.id === id)?.qty ?? 0
  return { lines: cart, count, qtyOf }
}

export const CART_MAX_QTY = MAX_QTY
