import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vibrant Tech Color Palette
        primary: {
          50: '#e6f0ff',   // Electric blue tint
          100: '#cce0ff',  // Light electric
          200: '#99c2ff',  // Soft electric
          300: '#66a3ff',  // Medium electric
          400: '#3385ff',  // Bright electric
          500: '#0066ff',  // Electric Blue (base)
          600: '#0052cc',  // Deep electric
          700: '#003d99',  // Darker electric
          800: '#002966',  // Navy electric
          900: '#001433',  // Deep navy
          950: '#000a1a',  // Midnight
        },
        secondary: {
          50: '#e0fcff',   // Vivid cyan tint
          100: '#bef8fd',  // Light cyan
          200: '#87eaf2',  // Aqua
          300: '#54d1db',  // Bright aqua
          400: '#38bec9',  // Vivid cyan
          500: '#00b4d8',  // Electric Cyan (base)
          600: '#0096b4',  // Deep cyan
          700: '#007a94',  // Teal
          800: '#005e73',  // Dark teal
          900: '#004152',  // Deep teal
          950: '#002836',  // Midnight teal
        },
        tertiary: {
          50: '#f3e8ff',   // Vivid violet tint
          100: '#e9d5ff',  // Light violet
          200: '#d8b4fe',  // Soft violet
          300: '#c084fc',  // Medium violet
          400: '#a855f7',  // Bright violet
          500: '#8b5cf6',  // Electric Violet (base)
          600: '#7c3aed',  // Deep violet
          700: '#6d28d9',  // Purple
          800: '#5b21b6',  // Deep purple
          900: '#4c1d95',  // Dark purple
          950: '#2e1065',  // Midnight purple
        },
        accent: {
          /* Unified scale based on Electric Green (#22c55e)
           * 50-400 are progressively lighter tints, 600-950 are darker shades
           * HSL base: hsl(142, 71%, 45%) */
          50: '#ecfdf5',   // Very light mint
          100: '#d1fae5',  // Light mint
          200: '#a7f3d0',  // Pale green
          300: '#6ee7b7',  // Soft green
          400: '#34d399',  // Medium green
          500: '#22c55e',  // Electric Green (base)
          600: '#16a34a',  // Deep green
          700: '#15803d',  // Forest
          800: '#166534',  // Dark forest
          900: '#14532d',  // Deep forest
          950: '#052e16',  // Midnight green
        },
        danger: {
          50: '#fff1f2',   // Coral tint
          100: '#ffe4e6',  // Light coral
          200: '#fecdd3',  // Soft coral
          300: '#fda4af',  // Medium coral
          400: '#fb7185',  // Bright coral
          500: '#f43f5e',  // Electric Rose (base)
          600: '#e11d48',  // Deep rose
          700: '#be123c',  // Ruby
          800: '#9f1239',  // Dark ruby
          900: '#881337',  // Deep ruby
          950: '#4c0519',  // Midnight ruby
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
} satisfies Config
