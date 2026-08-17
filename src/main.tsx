import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LocationsProvider } from './locations/LocationsContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocationsProvider><App /></LocationsProvider>
  </StrictMode>,
)
