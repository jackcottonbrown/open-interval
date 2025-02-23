module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Disable specific rules that might be causing issues
    'react/no-unescaped-entities': 'off',
    '@next/next/no-page-custom-font': 'off',
    // Add more rule overrides as needed
  },
  settings: {
    next: {
      rootDir: './',
    },
  },
}; 