import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LadiNi Burkina',
    short_name: 'LadiNi',
    description: 'Commerce agricole résilient et hors-ligne pour le Sahel.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F5F5F5',
    theme_color: '#166534',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/images/logo.jpeg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/images/logo.jpeg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
  };
}
