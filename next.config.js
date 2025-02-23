/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Only run ESLint on these directories during builds
    dirs: ['src/app', 'src/components', 'src/lib', 'src/hooks'],
    // Still ignore during builds for now until we fix all issues
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 