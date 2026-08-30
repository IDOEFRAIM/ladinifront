/** @type {import('next').NextConfig} */
const path = require('path');

const runtimeCaching = [
  // Espace livreur : jamais de cache SW — statuts/positions temps réel, et le
  // catch-all NetworkFirst ci-dessous interceptait ces routes par défaut
  // (2026-08-27, enquête boucle POST /api/delivery/status). NetworkOnly avec
  // un nom de cache dédié pour rester diagnosticable, mais aucune entrée
  // stockée n'est jamais servie.
  {
    urlPattern: /\/api\/delivery\//i,
    handler: 'NetworkOnly',
    options: { cacheName: 'no-cache-delivery' },
  },
  // API produits: Stale-While-Revalidate pour navigation fluide offline-first
  {
    urlPattern: /\/api\/(products|publicProduct)(\/|$)/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'api-products',
      expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  // Images optimisées Next.js (next/image): Cache-First
  {
    urlPattern: /\/_next\/image/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'next-image',
      expiration: { maxEntries: 256, maxAgeSeconds: 30 * 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  // Images statiques du site (public/*)
  {
    urlPattern: /\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'static-images',
      expiration: { maxEntries: 256, maxAgeSeconds: 30 * 24 * 60 * 60 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts',
      expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
    },
  },
  // Filet de sécurité générique : toute route /api/* non listée explicitement
  // ci-dessus ne doit JAMAIS être interceptée par le catch-all NetworkFirst
  // plus bas (même risque que /api/delivery/* — statuts/mutations qui ne
  // doivent jamais être servis depuis un cache SW périmé).
  {
    urlPattern: /\/api\//i,
    handler: 'NetworkOnly',
    options: { cacheName: 'no-cache-api' },
  },
  {
    urlPattern: /.*/i,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'others',
      expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      networkTimeoutSeconds: 10,
    },
  },
];

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching,

  // Optimisation App Router / navigation via next/link
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,

  // Gestion élégante des erreurs réseau (fallback offline)
  fallbacks: {
    document: '/offline.html',
  },

  // Workbox: fallback navigation + options de génération SW
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    navigateFallback: '/offline.html',
    navigateFallbackDenylist: [/^\/api\//, /^\/_next\//],
    runtimeCaching,
  },
});

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  // Ensure Next.js traces output from the correct project root
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  // Increase Server Actions body size limit to allow image uploads in forms
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Sécurité : Headers HTTP
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  // Workaround pour environnements OneDrive sur Windows :
  // désactive les source maps en dev si le repo est dans OneDrive
  webpack(config: any, { dev }: { dev?: boolean }) {
    try {
      const cwd = process.cwd() || '';
      if (dev && typeof cwd === 'string' && cwd.toLowerCase().includes('onedrive')) {
        // Empêche Next/Webpack d'écrire/charger des source maps corrompus par le provider cloud
        config.devtool = false;
      }
    } catch (e) {
      // noop
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);