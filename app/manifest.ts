import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aadhcode Employee Portal',
    short_name: 'HR Desk',
    description: 'Official HR Management Portal for Aadhcode employees. Manage leaves, equipment, handbooks, and more.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f1a2e',
    theme_color: '#0f1a2e',
    orientation: 'portrait',
    icons: [
      {
        src: '/favicon.jpg',
        sizes: '500x500',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
  };
}
