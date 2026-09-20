#!/usr/bin/env node
/**
 * Audit SEO léger : vérifie <title>, canonical, JSON-LD et Open Graph sur les pages clés.
 *
 * Usage :
 *   npm run build && npm start &        # serveur de production sur :3000
 *   npm run check:seo                   # BASE_URL=http://localhost:3000 par défaut
 *   BASE_URL=https://ladini.tech npm run check:seo
 */
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const PAGES = ['/', '/catalogue'];

const checks = [
  ['<title>', (html) => /<title>[^<]{5,}<\/title>/i.test(html)],
  ['meta description', (html) => /<meta[^>]+name="description"[^>]+content="[^"]{20,}"/i.test(html)],
  ['link canonical', (html) => /<link[^>]+rel="canonical"[^>]+href="https?:\/\/[^"]+"/i.test(html)],
  ['JSON-LD', (html) => /<script[^>]+type="application\/ld\+json"/i.test(html)],
  ['og:title', (html) => /<meta[^>]+property="og:title"/i.test(html)],
  ['og:description', (html) => /<meta[^>]+property="og:description"/i.test(html)],
  ['og:image', (html) => /<meta[^>]+property="og:image"/i.test(html)],
  ['twitter:card', (html) => /<meta[^>]+name="twitter:card"/i.test(html)],
  ['pas de noindex', (html) => !/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html)],
];

let failures = 0;

for (const path of PAGES) {
  const url = `${BASE_URL}${path}`;
  let html;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    console.error(`✗ ${url} — inaccessible (${err.message}). Le serveur tourne-t-il ?`);
    failures++;
    continue;
  }

  console.log(`\n${url}`);
  for (const [label, test] of checks) {
    const passed = test(html);
    if (!passed) failures++;
    console.log(`  ${passed ? '✓' : '✗'} ${label}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} vérification(s) SEO en échec.`);
  process.exit(1);
}
console.log('\nSEO OK');
