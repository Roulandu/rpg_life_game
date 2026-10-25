import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ErrorBoundary } from './app/ErrorBoundary'
import { isNativePlatform } from './platform/native'
import { router } from './router'
import './styles.css'

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root element')

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
)

const shouldRegisterServiceWorker =
  import.meta.env.PROD && import.meta.env.MODE !== 'native' && !isNativePlatform()

if (shouldRegisterServiceWorker) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}
