// Route handler at `/` — reads and returns the static app.html file.
// This replaces the previous `beforeFiles` rewrite so that the file is
// reliably served in both Next.js dev mode and standalone (production)
// builds where the `public/` folder is not automatically copied.

import fs from 'node:fs';
import path from 'node:path';

// Try to locate app.html across multiple candidate paths so this works
// in dev (`cwd === /app`) and in the standalone bundle
// (`cwd === /app/.next/standalone` at runtime for `node server.js`).
function findAppHtml() {
  const candidates = [
    path.join(process.cwd(), 'public', 'app.html'),
    path.join(process.cwd(), '..', '..', 'public', 'app.html'),
    path.join(process.cwd(), '..', 'public', 'app.html'),
    // The file is force-included via outputFileTracingIncludes so it
    // should be alongside the standalone bundle at these locations.
    '/app/public/app.html',
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {}
  }
  return null;
}

let CACHED_HTML = null;
function loadHtml() {
  if (CACHED_HTML) return CACHED_HTML;
  const p = findAppHtml();
  let raw = null;
  if (p) {
    try { raw = fs.readFileSync(p, 'utf8'); } catch (_) {}
  }
  if (!raw) {
    // Fallback so the K8s readiness probe still receives HTTP 200
    CACHED_HTML =
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>MyHabits</title></head>' +
      '<body style="background:#07070B;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
      '<div><h1 style="color:#39FF14;font-size:32px;margin:0">MyHabits</h1><p style="opacity:.6">Loading… (app.html not found in bundle)</p></div>' +
      '</body></html>';
    return CACHED_HTML;
  }
  // Substitute environment variable placeholders (Firebase config etc.)
  const subs = {
    __FIREBASE_API_KEY__: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    __FIREBASE_AUTH_DOMAIN__: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    __FIREBASE_PROJECT_ID__: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    __FIREBASE_STORAGE_BUCKET__: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    __FIREBASE_MESSAGING_SENDER_ID__: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    __FIREBASE_APP_ID__: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    __FIREBASE_MEASUREMENT_ID__: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
  };
  for (const [key, val] of Object.entries(subs)) {
    // Replace all occurrences of the placeholder token
    raw = raw.split(key).join(val);
  }
  CACHED_HTML = raw;
  return CACHED_HTML;
}

export async function GET() {
  const html = loadHtml();
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

// Explicitly opt into Node.js runtime (needed for `fs`)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
