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

// Apply style theme before React mounts to avoid a flash on refresh/load.
try {
  const themeStyles = new Set(['ocean', 'sakura', 'forest', 'studio'])
  const savedStyle = localStorage.getItem('themeStyle')
  const themeStyle = themeStyles.has(savedStyle) ? savedStyle : 'ocean'

  if (localStorage.getItem('darkMode') !== null) {
    localStorage.removeItem('darkMode')
  }

  document.documentElement.dataset.themeStyle = themeStyle
  document.documentElement.classList.remove('dark')
  document.body.classList.remove('dark-mode')
} catch {
  document.documentElement.dataset.themeStyle = 'ocean'
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
