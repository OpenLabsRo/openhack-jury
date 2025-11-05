import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import * as path from 'path'
import fs from 'fs'

export default defineConfig(({ command }) => {
  const isDev = command === 'serve'
  return {
    plugins: [svelte()],
    server: isDev
      ? {
          port: 5173,
          https: {
            key: fs.readFileSync('./localhost+2-key.pem'),
            cert: fs.readFileSync('./localhost+2.pem'),
          },
        }
      : {
          port: 5173,
        },
    resolve: {
      alias: {
        $lib: path.resolve('./src/lib'),
        $components: path.resolve('./src/lib/components'),
        $runes: path.resolve('./src/runes'),
        $routes: path.resolve('./src/routes'),
        $api: path.resolve('./src/lib/api'),
        $types: path.resolve('./src/types'),
        $img: path.resolve('./img'),
      },
    },
    css: {
      postcss: './postcss.config.js',
    },
    optimizeDeps: {
      include: [
        'svelte',
        'svelte/internal',
        'svelte/internal/disclose-version',
        'svelte/internal/flags/legacy',
        'svelte/internal/client',
        'svelte/store',
        'svelte5-router',
        'qr-code-styling',
      ],
    },
  }
})
