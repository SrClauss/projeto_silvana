import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from '@mui/material'
import CssBaseline from '@mui/material/CssBaseline'
import theme from './theme'
import axios from 'axios'

// Use Vite env VITE_API_BASE or default to '/api' so requests are same-origin and avoid CORS/PNA issues
axios.defaults.baseURL = import.meta.env.VITE_API_BASE ?? '/api'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
