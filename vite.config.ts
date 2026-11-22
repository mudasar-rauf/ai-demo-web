/// <reference types="vitest/config" />
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Vitest loads this file too, but must not run the TanStack Start plugin: the tests
// render screens in a test router (src/test/renderWithRouter.tsx), never the document shell.
const isVitest = process.env.VITEST === 'true';

export default defineConfig({
  plugins: [...(isVitest ? [] : [tanstackStart()]), viteReact()],
  // The contract's CORS rule allows only http://localhost:3000, for the dev server and the preview.
  server: { port: 3000, strictPort: true },
  preview: { port: 3000, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
