import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- Thêm dòng này

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- Khai báo plugin tại đây
  ],
  build: {
    outDir: '../dist', 
    emptyOutDir: true, 
  },
  server: {
    port: 3000
  }
})