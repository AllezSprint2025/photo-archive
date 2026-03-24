import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: '#c9a96e', light: '#e8c98a', dark: '#a07840' },
      },
    },
  },
  plugins: [],
};
export default config;
