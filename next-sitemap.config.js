/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://ladini.tech', 
  
  generateRobotsTxt: true, // Génère automatiquement le fichier robots.txt
  generateIndexSitemap: true, // Génère un index sitemap si le site devient très grand
  
  // Exclure certaines pages (ex: dashboard, pages admin, tunnels d'achat privés)
  exclude: ['/admin*', '/dashboard*', '/checkout*'],

  // Configuration optionnelle pour les robots.txt générés
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/dashboard', '/checkout'],
      },
    ],
  },
  
  // Transformation dynamique des URLs si besoin (ex: priorités)
  transform: async (config, path) => {
    // Personnalisation des priorités pour le SEO
    let priority = 0.7;
    let changefreq = 'daily';

    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    } else if (path.startsWith('/products/')) {
      priority = 0.8;
      changefreq = 'hourly'; // Utile pour une marketplace où les stocks/produits bougent
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },
};