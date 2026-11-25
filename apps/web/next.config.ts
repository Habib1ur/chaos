import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@chaos/shared'],
  reactStrictMode: true,
};

export default nextConfig;
