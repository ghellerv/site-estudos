import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// O site fica em https://<usuario>.github.io/site-estudos/
export default defineConfig({
  plugins: [react()],
  base: '/site-estudos/',
})
