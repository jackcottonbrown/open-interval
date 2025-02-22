import type { Config } from "tailwindcss";
import { colors } from './src/styles/theme';

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors,
      backgroundColor: {
        dark: colors.dark.background,
        'dark-card': colors.dark.card,
      },
      textColor: {
        'dark-primary': colors.dark.text.primary,
        'dark-secondary': colors.dark.text.secondary,
        'dark-tertiary': colors.dark.text.tertiary,
      },
      borderColor: {
        dark: colors.dark.border,
      },
    },
  },
  darkMode: 'class',
  plugins: [],
};

export default config;
