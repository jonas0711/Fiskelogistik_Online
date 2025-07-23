import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Puppeteer konfiguration for PDF generering på Vercel
  serverExternalPackages: ['puppeteer'],
  
  // Turbopack konfiguration for bedre performance
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Sikrer at Puppeteer kan køre på serverless miljø
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('puppeteer');
    }
    return config;
  }
};

export default nextConfig;
