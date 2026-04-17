/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@kitz/config', '@kitz/i18n', '@kitz/types', '@kitz/ui'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
