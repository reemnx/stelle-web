import { Outlet } from 'react-router-dom'

/**
 * Shared shell for every page. Header and footer will live here later.
 */
export function RootLayout() {
  return (
    <main>
      <Outlet />
    </main>
  )
}
