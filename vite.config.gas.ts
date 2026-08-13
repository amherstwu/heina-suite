import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const rootDir = dirname(fileURLToPath(import.meta.url))

/** GAS 單檔：輸出 gas-web/index.html（內嵌 JS/CSS），與主站相同 Tailwind 建置 */
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  base: './',
  build: {
    outDir: 'gas-web',
    emptyOutDir: true,
    rollupOptions: {
      input: { index: resolve(rootDir, 'gas-app-entry.html') },
    },
  },
})
