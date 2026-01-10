import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@mui/icons-material', '@mui/material']
  },
  ssr: {
    noExternal: ['@mui/icons-material']
  },
})
