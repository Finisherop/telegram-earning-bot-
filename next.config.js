/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['t.me', 'cdn.telegram.org'],
  },
  // Environment variables for client-side access
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Webpack configuration for external modules
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
}

module.exports = nextConfig