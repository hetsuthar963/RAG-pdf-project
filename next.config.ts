/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@aws-sdk/client-s3',
    'pdfjs-dist' // Add this
  ],
  transpilePackages: [
    '@react-pdf-viewer/core',
    '@react-pdf-viewer/default-layout'
  ],
  webpack: (config: { resolve: { alias: { canvas: boolean; encoding: boolean; }; }; }) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  }
};

module.exports = nextConfig;