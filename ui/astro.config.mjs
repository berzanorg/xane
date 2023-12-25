import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'
import solidJs from '@astrojs/solid-js'

// https://astro.build/config
export default defineConfig({
    integrations: [tailwind(), solidJs()],
    vite: {
        plugins: [
            {
                configureServer: (server) => {
                    server.middlewares.use((_req, res, next) => {
                        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
                        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
                        next()
                    })
                },
            },
        ],
        build: {
            target: 'esnext',
        },
        worker: {
            format: 'es',
        },
        optimizeDeps: { esbuildOptions: { target: 'esnext' } },
    },
})
