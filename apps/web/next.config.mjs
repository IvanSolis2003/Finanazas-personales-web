/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma necesita ejecutarse en el runtime de Node (no Edge).
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
};

export default nextConfig;
