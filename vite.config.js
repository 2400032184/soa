import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// ResolveNow frontend configuration.
// During development all /api requests are proxied to the Spring Cloud
// API Gateway (port 8080), so no CORS configuration is needed on the backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})