/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(147, 51, 234)',
        secondary: 'rgb(71, 85, 105)',
        'primary-foreground': 'rgb(250, 250, 250)',
        'secondary-foreground': 'rgb(250, 250, 250)',
      },
    },
  },
  plugins: [],
};