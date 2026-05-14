/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@jetdale/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Map EXPO_PUBLIC_* env vars to NEXT_PUBLIC_* so the admin app
  // uses the same .env as the rest of the monorepo.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.EXPO_PUBLIC_APP_URL,
  },
};

module.exports = nextConfig;
