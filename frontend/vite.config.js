import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Asegúrate que coincida con tu puerto
        changeOrigin: true,
        secure: false
      }
    }
  }
});