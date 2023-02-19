import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // the default entry point
        app: './index.html',

        // 1️⃣
        'sw': './src/sw/sw.ts',
      },
      output: {
        // 2️⃣
        entryFileNames: assetInfo => {
          return assetInfo.name === 'sw'
             ? 'sw/[name].js'                  // put service worker in root
             : '[name]-[hash].js' // others in `assets/js/`
        }
      },
    },
  },
})