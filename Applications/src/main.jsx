import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const baseUrl = import.meta.env.BASE_URL || '/'
const pwaDisabledForBuild = import.meta.env.MODE === 'ghpages'

if (pwaDisabledForBuild && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        if (registration.scope.includes(baseUrl)) {
          registration.unregister().catch(() => {})
        }
      })
    }).catch(() => {})
  })
}

// Apply theme class before React mounts to avoid light flash on refresh/load.
try {
  const saved = localStorage.getItem('darkMode')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const shouldUseDark = saved !== null ? JSON.parse(saved) : prefersDark

  if (shouldUseDark) {
    document.documentElement.classList.add('dark')
    document.body.classList.add('dark-mode')
  } else {
    document.documentElement.classList.remove('dark')
    document.body.classList.remove('dark-mode')
  }
} catch {
  // Ignore storage/matchMedia issues and continue rendering.
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
