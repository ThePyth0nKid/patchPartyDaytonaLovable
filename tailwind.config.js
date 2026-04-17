/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Linear-inspired neutrals (overrides Tailwind slate darks so existing
        // slate-800/900/950 classes auto-upgrade to the Linear palette)
        slate: {
          50: '#f7f8f8',
          100: '#e5e5e6',
          200: '#d0d1d3',
          300: '#8a8f98',
          400: '#62666d',
          500: '#4a4d52',
          600: '#323334',
          700: '#23252a',
          800: '#1a1b1d',
          900: '#121414',
          950: '#08090a',
        },
        // v0/Vercel-inspired persona accents — sharper, more saturated
        hackfix: '#FF6B35',       // Heat Orange — speed / ship it
        craftsman: '#14B8A6',     // Teal — stable, technical
        'ux-king': '#E879F9',     // Fuchsia — delight
        defender: '#60A5FA',      // Sky Blue — shield / trust
        innovator: '#A78BFA',     // Violet — vision
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '7px',
      },
      transitionTimingFunction: {
        linear: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      boxShadow: {
        'linear-xl': 'rgba(8, 9, 10, 0.6) 0px 4px 32px 0px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
