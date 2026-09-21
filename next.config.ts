/** @type {import('next').NextConfig} */
const path = require('path');

// Identifiant de build DETERMINISTE (meme valeur dans tous les processus de `next build`) : SHA fourni par l'hebergeur/la CI, sinon
// `git rev-parse`, sinon "unknown" (les controles de version sont alors neutres : jamais de faux positif).
const BUILD_ID = (() => {
  const fromEnv = process.env.NEXT_PUBLIC_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_SHA;
  if (fromEnv) return String(fromEnv).slice(0, 12);
  try { return require('child_process').execSync('git rev-parse --short=12 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'unknown'; }
  catch { return 'unknown'; }
})();

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
    handler: 'NetworkFirst', // reseau d'abord : jamais de donnees d'un ancien format servies alors que le serveur repond
    options: {
      networkTimeoutSeconds: 4,
      cacheName: `api-products-${BUILD_ID}`, // le cache change a chaque build
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
    urlPattern: /\/fonts\/.*\.woff2$/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'self-hosted-fonts',
      expiration: { maxEntries: 8, maxAgeSeconds: 365 * 24 * 60 * 60 },
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
  // Desactives : ils gardaient les pages/payloads RSC d'une ancienne version alors que le backend et la base avaient change.
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,

  // Gestion élégante des erreurs réseau (fallback offline)
  fallbacks: {
    document: '/offline.html',
  },

  // NB : pas de navigateFallback — il enregistre une NavigationRoute qui sert
  // /offline.html pour TOUTE navigation, même en ligne. Le fallback hors-ligne
  // est déjà géré par `fallbacks.document` (uniquement en cas d'échec réseau).
  // Workbox: options de génération SW
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    runtimeCaching,
  },
});

const nextConfig = {
  reactStrictMode: true,
  generateBuildId: async () => BUILD_ID,
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  // Dossier de sortie isolable : `next build` et `next dev` écrivaient dans le MÊME `.next`. Lancer un build pendant que le serveur de
  // dev tourne corrompt ses manifestes (« Invariant: Expected clientReferenceManifest to be defined », pages en 500, rechargements
  // en boucle). `npm run build:verify` construit dans `.next-verify`, sans jamais toucher au dossier du serveur de dev.
  distDir: process.env.NEXT_DIST_DIR || '.next',
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
      {
        // Photos produits/producteurs stockées sur Supabase Storage — nécessaire
        // pour que next/image puisse redimensionner/optimiser ces images au lieu
        // de servir les fichiers originaux (souvent plusieurs Mo, photos de tel.).
        protocol: 'https',
        hostname: 'zcnkjlvhegyykoeuckwv.supabase.co',
        pathname: '/storage/v1/object/public/**',
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
    // Filet anti-indexation : même si une URL privée fuite dans un lien, Google ne l'indexe pas.
    // (robots.txt seul n'empêche pas l'indexation d'une URL connue.)
    const privateRoutes = [
      'admin', 'dashboard', 'buyer-dashboard', 'checkout', 'cart', 'orders', 'tracking',
      'conversations', 'market', 'products', 'sales', 'inventory', 'production', 'clients',
      'settings', 'agents', 'agent', 'org', 'onboarding', 'select-org', 'login', 'signup', 'preorders',
    ];
    return [
      {
        // Polices auto-hébergées : noms de fichiers versionnés → cache navigateur/CDN d'un an, immuable.
        source: '/fonts/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: `/:route(${privateRoutes.join('|')})/:path*`,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: `/:route(${privateRoutes.join('|')})`,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'x-app-build', value: BUILD_ID }, // lu par VersionWatcher : detecte un client reste sur une ancienne version
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