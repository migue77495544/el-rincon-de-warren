import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// Librerías grandes en archivos propios: el navegador las guarda en caché entre despliegues
const VENDOR_CHUNKS: Record<string, string[]> = {
  'vendor-react': ['react', 'react-dom', 'scheduler'],
  'vendor-charts': ['recharts', 'd3-', 'victory-vendor'],
  'vendor-lightweight': ['lightweight-charts', 'fancy-canvas'],
  'vendor-motion': ['motion', 'framer-motion'],
  'vendor-icons': ['lucide-react']
};

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            for (const [chunk, pkgs] of Object.entries(VENDOR_CHUNKS)) {
              if (pkgs.some(p => id.includes(`/node_modules/${p}`))) return chunk;
            }
            return undefined;
          }
        }
      }
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/python/**', '**/.data/**', '**/cache/**', '**/*.csv', '**/*.xls*', '**/*.log', '**/scratch/**']
      },
    },
  };
});
