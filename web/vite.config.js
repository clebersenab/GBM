import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A plataforma é servida em /plataforma/ no mesmo site da landing.
// Imagens e catálogo vêm da raiz do repositório (/images, /data).
export default defineConfig({
  base: '/plataforma/',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
})
