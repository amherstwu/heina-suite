import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * GitHub project Pages is served at /heina-suite/.
 * Local dev and `vite preview` stay at `/` unless VITE_BASE is set.
 * Hash routes must NOT use this path as React Router basename.
 */
function pagesBase(): string {
  const fromEnv = (process.env.VITE_BASE || '').trim()
  if (!fromEnv) return '/'
  return fromEnv.endsWith('/') ? fromEnv : `${fromEnv}/`
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: pagesBase(),
  server: {
    host: '127.0.0.1',
    /** 避開 MCurator 常用的 5173 */
    port: 5280,
    strictPort: true,
    /** 由 open-local-preview.bat 等就緒後再開瀏覽器，避免 -102 */
    open: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('xlsx')) return 'vendor-xlsx'
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react'
          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
})
