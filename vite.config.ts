import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 3001 is reserved for reference/
  server: { port: 3002, strictPort: false, host: true },
});
