import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.js',
            injectManifest: {
                globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
            },
            includeAssets: ['icons/favicon-32.png'],
            manifest: {
                name: 'AscendAI - Progress Tracker',
                short_name: 'AscendAI',
                description: 'Gamified productivity tracker — tasks, streaks, seasons and leagues.',
                theme_color: '#4f46e5',
                background_color: '#ffffff',
                display: 'standalone',
                start_url: '/',
                scope: '/',
                icons: [
                    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
        }),
    ],
})
