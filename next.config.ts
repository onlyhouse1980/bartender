import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' http://localhost:3000 https://ryan-portfolio-bay.vercel.app",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
