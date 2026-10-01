import type { NextConfig } from 'next';
const config: NextConfig = {
  transpilePackages: ['@mitti/ui', '@mitti/types', '@mitti/validation', '@mitti/commerce'],
  images: {
    // Local development serves media from MinIO on localhost, which Next refuses to optimise unless opted in.
    dangerouslyAllowLocalIP: process.env.IMAGES_ALLOW_LOCAL === 'true',
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'http', hostname: 'localhost', port: '9006' },
    ],
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: (process.env.API_URL || 'http://localhost:4000') + '/:path*' },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
export default config;
