import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Content-Security-Policy for the production build.
// - scripts only from our own origin (no inline scripts, no eval)
// - network calls only to https endpoints (the AI providers)
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "connect-src 'self' https:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');
// (frame-ancestors only works as an HTTP header, so it lives in public/_headers.)

/**
 * Generates dist/sw.js from src/sw-template.js, filling in the list of
 * built files to precache and a version string derived from them.
 * A new deploy => new file hashes => new version => phones pick up the update.
 */
function serviceWorkerPlugin() {
  return {
    name: 'tutor-service-worker',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`
      );
    },
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter(
        (f) => !f.endsWith('.map') && f !== 'sw.js'
      );
      const staticFiles = [
        'manifest.webmanifest',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-512.png',
        'icons/apple-touch-icon.png',
        'icons/icon.svg',
        // The sandboxed playground can't be served by the service worker, but fetching these
        // here also fills the browser's HTTP cache, so the playground works offline.
        'runner.html',
        'runner.js',
      ];
      const precache = ['./', ...[...files, ...staticFiles].map((f) => './' + f)];
      const version = createHash('sha256')
        .update(precache.join('|') + Object.values(bundle).map((c) => c.code || '').join(''))
        .digest('hex')
        .slice(0, 12);
      const template = readFileSync(new URL('./src/sw-template.js', import.meta.url), 'utf8');
      const source = template
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), serviceWorkerPlugin()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
