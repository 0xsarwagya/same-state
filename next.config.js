/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Serialize typedRoutes so the CI-only next typegen step succeeds
    // without a full build.
    typedRoutes: false,
  },
};

export default nextConfig;
