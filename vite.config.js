import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' — GitHub Pages/Vercel 등 어떤 하위 경로에서도 정적 배포 가능
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
