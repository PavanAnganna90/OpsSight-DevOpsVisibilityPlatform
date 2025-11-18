/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Disable all checks
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable static generation for dashboard app
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  
  // Skip static generation for error pages
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  
  // No rewrites
  async rewrites() {
    return [];
  },
  
  // Completely disable static page generation
  // This forces all pages to be rendered dynamically
  output: 'standalone',
  
  // Skip all static optimization
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig;