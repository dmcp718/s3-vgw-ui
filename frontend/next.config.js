/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  experimental: {
    esmExternals: false
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:3001/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://backend:3001/socket.io/:path*',
      },
    ];
  },
}

module.exports = nextConfig