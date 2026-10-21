import { Outlet } from 'react-router-dom'
import { CartDrawer } from '@/components/CartDrawer'
import { Header } from '@/components/Header'
import { bagCollection } from '@/content/home'

/**
 * Shared shell for every page. Footer will live here later.
 */
export function RootLayout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <CartDrawer products={bagCollection.colors} />
    </>
  )
}
