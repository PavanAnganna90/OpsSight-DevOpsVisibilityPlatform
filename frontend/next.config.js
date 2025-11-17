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
  
  // Skip generating 404 page during build
  generateStaticParams: async () => {
    return [];
  },
  
  // No rewrites
  async rewrites() {
    return [];
  },
}

module.exports = nextConfig;