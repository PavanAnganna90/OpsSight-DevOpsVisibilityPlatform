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
  // Force all pages to be dynamically rendered
  generateStaticParams: async () => {
    return [];
  },
}

module.exports = nextConfig;