export const colors = {
  // Base colors
  primary: {
    DEFAULT: '#2D5A27',  // Dark forest green
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#2D5A27',  // Main primary
    600: '#1B4332',  // Darker green
    700: '#081C15',  // Darkest green
    800: '#051B11',
    900: '#040F0F',
  },
  accent: {
    DEFAULT: '#FF5722',  // Vibrant orange
    50: '#FBE9E7',
    100: '#FFCCBC',
    200: '#FFAB91',
    300: '#FF8A65',
    400: '#FF7043',
    500: '#FF5722',  // Main accent
    600: '#F4511E',
    700: '#E64A19',
    800: '#D84315',
    900: '#BF360C',
  },
  // Dark mode specific colors
  dark: {
    background: '#1A1A1A',
    card: '#242424',
    border: '#333333',
    text: {
      primary: '#FFFFFF',
      secondary: '#A0A0A0',
      tertiary: '#666666',
    }
  }
};

export const theme = {
  colors,
  // You can extend this with other theme properties like
  spacing: {},
  borderRadius: {
    sm: '0.25rem',
    DEFAULT: '0.375rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '1.5rem',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  },
} as const; 