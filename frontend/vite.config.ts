import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: [
      'code-validator-36.preview.emergentagent.com',
      '.preview.emergentagent.com',
      'localhost',
    ],
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  }
})
