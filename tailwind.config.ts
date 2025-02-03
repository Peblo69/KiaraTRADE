import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        vt323: ["VT323", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        slideDown: {
          '0%': { 
            transform: 'translateY(-100%)',
            opacity: '0'
          },
          '100%': { 
            transform: 'translateY(0)',
            opacity: '1'
          }
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "marquee": "marquee 25s linear infinite",
        "slideDown": "slideDown 0.3s ease-out forwards",
        "twinkle": "twinkle 3s ease-in-out infinite"
      },
      fontSize: {
        'xxs': '0.65rem',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    function({ addUtilities }: { addUtilities: Function }) {
      addUtilities({
        '.pause-animation': {
          'animation-play-state': 'paused',
        },
        '.btn-secondary': {
          '@apply px-2 py-1 text-xs font-medium rounded bg-purple-900/20 text-purple-300 hover:bg-purple-900/40 transition-colors': {},
        },
        '.btn-success': {
          '@apply px-3 py-2 text-sm font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors': {},
        },
        '.btn-kiara': {
          '@apply px-3 py-1 text-xs font-medium rounded bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/40 transition-colors': {},
        },
        '.chat-container': {
          '@apply bg-[#0D0B1F] backdrop-blur-sm': {},
        },
        '.chat-message': {
          '@apply p-3 rounded': {},
        },
        '.chat-message.ai': {
          '@apply bg-yellow-900/20 text-yellow-100 text-sm': {},
        },
        '.chat-message.user': {
          '@apply bg-yellow-600/10 text-yellow-200 text-sm': {},
        },
        '.chat-input': {
          '@apply w-full bg-yellow-900/20 border border-yellow-600/20 rounded px-3 py-2 text-sm text-yellow-100 placeholder-yellow-600/50 focus:outline-none focus:ring-1 focus:ring-yellow-600/50': {},
        },
        '.chat-send-btn': {
          '@apply p-2 rounded bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/40 transition-colors': {},
        },
        '.particle': {
          '@apply absolute rounded-full bg-yellow-400/30 pointer-events-none animate-twinkle': {},
        },
      });
    },
  ],
} satisfies Config;