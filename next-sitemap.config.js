/** @type {import('next-sitemap').IConfig} */

// Espaces privés / techniques : jamais dans le sitemap, bloqués dans robots.txt.
// Les Route Groups — (public), (buyer), (productor) — n'apparaissent PAS dans les URLs :
// on raisonne donc sur les chemins réels (/cart, /products, /sales…), pas sur les dossiers.
const PRIVATE_PATHS = [
  '/admin', '/dashboard', '/buyer-dashboard', '/checkout', '/cart', '/orders', '/tracking',
  '/conversations', '/market', '/products', '/sales', '/inventory', '/production', '/clients',
  '/settings', '/agents', '/agent', '/org', '/onboarding', '/select-org', '/login', '/signup',
  '/preorders', '/ai', '/api', '/403', '/offline', '/debug',
];

const SITE_URL = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://ladini.tech';

module.exports = {
  siteUrl: SITE_URL,
  generateRobotsTxt: true,
  generateIndexSitemap: false, // < 50 000 URL statiques : un seul sitemap suffit
  // `/x` et `/x/*`
  exclude: [...PRIVATE_PATHS.flatMap((p) => [p, `${p}/*`]), '/product-sitemap.xml', '/apple-icon*', '/icon*', '/manifest.webmanifest'],

  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        // Ne PAS bloquer /_next/ : Google a besoin du CSS/JS pour rendre les pages.
        disallow: PRIVATE_PATHS,
      },
    ],
    // Sitemap des fiches produit (généré dynamiquement depuis la DB).
    additionalSitemaps: [`${SITE_URL}/product-sitemap.xml`],
  },

  // Pages publiques rendues à la demande (absentes du build statique, donc non détectées).
  additionalPaths: async (config) =>
    Promise.all(['/auction', '/distributions'].map((p) => config.transform(config, p))),

  // Google ignore priority/changefreq ; seul un `lastmod` FIABLE compte. On ne l'invente
  // donc plus (l'ancien `new Date()` sur chaque URL apprenait à Google à l'ignorer).
  transform: async (config, path) => ({
    loc: path,
    changefreq: path === '/' || path === '/catalogue' ? 'daily' : 'weekly',
    priority: path === '/' ? 1.0 : path === '/catalogue' ? 0.9 : 0.6,
  }),
};
