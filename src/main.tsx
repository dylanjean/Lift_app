import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts: precached by the service worker, no Google Fonts request
import '@fontsource-variable/archivo'
import '@fontsource-variable/public-sans'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
