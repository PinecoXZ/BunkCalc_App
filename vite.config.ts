import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@capacitor/') || id.includes('node_modules/@aparajita/')) {
            return 'vendor-capacitor';
          }
          if (id.includes('node_modules/html2canvas/')) {
            return 'vendor-html2canvas';
          }
        },
      },
    },
  },
})
