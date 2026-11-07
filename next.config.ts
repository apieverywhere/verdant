import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The games were renamed; keep links to the old addresses working.
  async redirects() {
    return [
      { source: '/tic-tac-toe', destination: '/lantern-line', permanent: true },
      { source: '/fire-and-water', destination: '/ember-and-tide', permanent: true },
    ];
  },
};

export default nextConfig;
