/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Proxy all /api/v1/* requests to the NestJS backend so the browser never
  // makes a cross-origin request — eliminates CORS entirely.
  // Backend URL is controlled by BACKEND_URL (server-side only, not NEXT_PUBLIC_).
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3002';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
