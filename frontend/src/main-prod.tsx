import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppProd from './AppProd.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProd />
  </StrictMode>,
)