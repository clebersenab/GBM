import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A plataforma é servida em /plataforma/ no mesmo site da landing.
// Imagens e catálogo vêm da raiz do repositório (/images, /data).
export default defineConfig({
  base: '/plataforma/',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
  // iPads com iPadOS 15 (Safari 15) ainda estão em uso: sem este alvo, o build reescreve
  // "@media (max-width: 900px)" como "@media (width <= 900px)", que o Safari 15 não entende,
  // e todas as regras de tela pequena e de tablet param de valer nesses aparelhos.
  build: { cssTarget: ['safari14', 'chrome87', 'firefox78', 'edge88'] },
})
