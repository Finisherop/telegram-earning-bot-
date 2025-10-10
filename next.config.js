/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['t.me', 'cdn.telegram.org'],
  },
  trailingSlash: true,
  output: 'export',
  distDir: 'out',
  // Disable server-side features for static export
  experimental: {
    appDir: true
  }
}

module.exports = nextConfig