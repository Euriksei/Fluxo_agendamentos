import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => 
{
    const env = loadEnv(mode, '.', '');
    return {
        base: '/',
        server: {
            port: 3000,
            host: '0.0.0.0',
            proxy: {
                '/api': { target: 'http://localhost:3001', changeOrigin: true },
                '/uploads': { target: 'http://localhost:3001', changeOrigin: true }
            }
        },
        plugins: [
            react(),
            tailwindcss(),
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: ['favicon.ico'],
                //includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
                manifest: {
                    name: 'Fluxo - Gestão de Barbearias',
                    short_name: 'Fluxo',
                    description: 'Aplicativo de gestão de barbearias com agendamento e finanças.',
                    theme_color: '#ffffff',
                    background_color: '#ffffff',
                    display: 'standalone',
                    icons: [
                        {
                            src: 'pwa/pwa-1000x1000.png',
                            sizes: '1000x1000',
                            type: 'image/png'
                        },
                    ]
                }
            }),
        ],
        define: {
            'process.env.API_KEY': JSON.stringify(env.API_KEY),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            }
        }
    };
});
