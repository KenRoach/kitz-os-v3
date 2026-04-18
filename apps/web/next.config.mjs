/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@kitz/agents',
    '@kitz/config',
    '@kitz/db',
    '@kitz/i18n',
    '@kitz/types',
    '@kitz/ui',
  ],
  // typedRoutes disabled until all nav destinations exist (revisit in later phases).
};

export default nextConfig;
