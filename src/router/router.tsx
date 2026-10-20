import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '@/components/RootLayout'
import { HomePage } from '@/pages/Home/HomePage'

/**
 * App routes. Only the homepage for now.
 * Add new pages as children of the root layout, e.g.:
 *   { path: 'builder', element: <BuilderPage /> }
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [{ index: true, element: <HomePage /> }],
  },
])
