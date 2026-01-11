import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@mui/material'
import CssBaseline from '@mui/material/CssBaseline'
import theme from './theme'
import axios from 'axios'

// Use Vite env VITE_API_BASE or default to '/api' so requests are same-origin and avoid CORS/PNA issues
axios.defaults.baseURL = import.meta.env.VITE_API_BASE ?? '/api'

// Remover atributos injetados por extensões/artefatos externos (ex.: bis_register, bis_skin_checked, __processed_*)
// e observar alterações futuras para manter o DOM limpo.
try {
  if (typeof document !== 'undefined' && document.documentElement) {
    const removeAttrsFrom = (el: Element) => {
      for (const attr of Array.from(el.attributes)) {
        if (attr.name === 'bis_register' || attr.name === 'bis_skin_checked' || attr.name.startsWith('__processed_')) {
          try { el.removeAttribute(attr.name); } catch (e) { /* ignore */ }
        }
      }
    }

    // Limpeza inicial
    removeAttrsFrom(document.documentElement)
    if (document.body) {
      removeAttrsFrom(document.body)
      document.body.querySelectorAll('*').forEach(removeAttrsFrom)
    }

    // Observar futuras modificações
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.target instanceof Element && (m as any).attributeName) {
          const name = (m as any).attributeName as string
          if (name === 'bis_register' || name === 'bis_skin_checked' || name.startsWith('__processed_')) {
            try { (m.target as Element).removeAttribute(name) } catch (e) { /* ignore */ }
          }
        } else if (m.type === 'childList') {
          m.addedNodes.forEach(n => {
            if (n instanceof Element) {
              removeAttrsFrom(n)
              n.querySelectorAll('*').forEach(removeAttrsFrom)
            }
          })
        }
      }
    })

    mo.observe(document.documentElement, { attributes: true, childList: true, subtree: true })

    // Se existir o atributo bis_register, opcionalmente logar seu conteúdo decodificado (útil para debug)
    try {
      const raw = document.documentElement.getAttribute('bis_register') || document.body?.getAttribute('bis_register')
      if (raw) {
        try {
          const parsed = JSON.parse(atob(raw))
          console.info('bis_register:', parsed)
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
  }
} catch (e) { }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
