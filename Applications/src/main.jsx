import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

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
