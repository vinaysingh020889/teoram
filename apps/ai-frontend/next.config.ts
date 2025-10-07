/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/www/:path*',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
