// src/main.tsx
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// 1) import the Analytics component
import { Analytics } from '@vercel/analytics/react'

createRoot(document.getElementById('root')!).render(
  <>
    <App />
    {/* 2) mount it here, once at the very root */}
    <Analytics />
  </>
)
