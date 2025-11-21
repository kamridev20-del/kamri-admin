/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@kamri/ui', '@kamri/lib'],
  env: {
    NEXT_PUBLIC_API_URL: 'http://localhost:3001/api',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig