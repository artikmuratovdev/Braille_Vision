import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({mode}) => {
  return {
    // `npm run phone`: self-signed HTTPS so the phone's browser allows the camera over Wi-Fi.
    plugins: [react(), mode === 'phone' && basicSsl()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // USB bridge (server/bridge.py) talks to the Arduino; the phone reaches it through this proxy too.
      proxy: { '/api': 'http://127.0.0.1:3001' },
    },
  };
});
