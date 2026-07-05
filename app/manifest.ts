import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aadhcode Employee Portal',
    short_name: 'HR Portal',
    description: 'Official HR Management Portal for Aadhcode employees. Manage leaves, equipment, handbooks, and more.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f1a2e',
    theme_color: '#0f1a2e',
    orientation: 'portrait',
    icons: [
      {
        src: '/aadhcode-favicon.webp',
        sizes: 'any',
        type: 'image/webp',
        purpose: 'maskable',
      },
    ],
  };
}
