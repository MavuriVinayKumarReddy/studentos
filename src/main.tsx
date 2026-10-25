import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

void import('virtual:pwa-register')
  .then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
  .catch(() => {
    /* PWA plugin unavailable in some test environments */
  })
