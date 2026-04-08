/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com', 'nenas-admin.firebasestorage.app'],
  },
};

module.exports = nextConfig;
