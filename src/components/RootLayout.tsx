import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'

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
    </>
  )
}
