/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
      },
      colors: {
        metal: {
          light: '#FFFFFF',
          medium: '#C0C0C0',
          dark: '#808080',
          darker: '#404040',
          darkest: '#202020',
        },
        space: {
          primary: '#0A0A0F',
          secondary: '#000000',
        },
      },
      animation: {
        'warp': 'warpSpeed 2s linear infinite',
        'metal-shine': 'metallic-shine 2s linear infinite',
      },
    },
  },
  plugins: [],
};