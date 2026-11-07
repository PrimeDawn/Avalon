import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// SPEC-001 writer/plan.html §3.1–3.2: development serves only loopback; built app is local.
export default defineConfig(({ command }) => {
  const csp = command === 'serve'
    ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://127.0.0.1:5178; object-src 'none'; base-uri 'none'"
    : "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'";
  return {
    main: {
      build: {
        outDir: 'out/main',
        rolldownOptions: {
          input: resolve('src/main/index.ts'),
          output: { format: 'cjs', entryFileNames: 'index.cjs', codeSplitting: false },
        },
      },
    },
    preload: {
      build: {
        outDir: 'out/preload',
        externalizeDeps: false,
        rolldownOptions: {
          input: resolve('src/preload/index.ts'),
          external: ['electron'],
          output: { format: 'cjs', entryFileNames: 'index.cjs', codeSplitting: false },
        },
      },
    },
    renderer: {
      root: 'src/renderer',
      server: { host: '127.0.0.1', port: 5178, strictPort: true },
      plugins: [react(), {
        name: 'avalon-csp',
        transformIndexHtml: (html: string) => html.replace('__AVALON_CSP__', csp),
      }],
      build: { outDir: resolve('out/renderer') },
    },
  };
});
