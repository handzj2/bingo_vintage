/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Image optimization
  images: {
    domains: ['localhost'],
    // Add production domains later
    // domains: ['your-app.vercel.app', 'your-domain.com'],
  },
  
  // API rewrites - works for both dev and production
  async rewrites() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    // If we have an API URL, use it
    if (apiUrl) {
      return [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/:path*`,
        },
      ];
    }
    
    // Default to localhost in development
    if (isDevelopment) {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:5000/api/:path*',
        },
      ];
    }
    
    // No rewrites in production without API_URL
    return [];
  },
  
  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig