import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FrontAg Burkina',
    short_name: 'FrontAg',
    description: 'Commerce agricole résilient et hors-ligne pour le Sahel.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F5F5F5',
    theme_color: '#166534',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/file.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/icons/globe.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
