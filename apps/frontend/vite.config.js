import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: { port: 5173, strictPort: true, proxy: { '^/(?:bookings|cleaners|cleaning-sessions|listing-metadata|users|database|documents)(?:/|$)': 'http://127.0.0.1:8000', '^/api(?:/|$)': 'http://127.0.0.1:8000' } },
})
