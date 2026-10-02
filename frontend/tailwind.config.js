/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#071841',
          50: '#e8f0fe',
          100: '#c5d9fc',
          200: '#9ec1f9',
          300: '#6ea4f6',
          400: '#4287f3',
          500: '#1b64df',
          600: '#0f4ab5',
          700: '#0b3b8f',
          800: '#071841',
          900: '#040d24',
          950: '#020713',
        },
        secondary: {
          DEFAULT: '#0B3B60',
          50: '#ebf5fb',
          100: '#cde6f6',
          200: '#9ed0f0',
          300: '#64b2e6',
          400: '#3192dc',
          500: '#1575c4',
          600: '#0b3b60',
          700: '#092f4e',
          800: '#07243c',
          900: '#051b2d',
        },
        accent: {
          cyan: '#00F0FF',
          blue: '#0099FF',
          indigo: '#6366F1',
          purple: '#A855F7',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
        },
        navy: {
          950: '#030917',
          900: '#071841',
          850: '#092054',
          800: '#0B296B',
          750: '#0D3282',
          700: '#0F3C9E',
        }
      },
      fontFamily: {
        sans: ['"Google Sans"', '"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 240, 255, 0.35)',
        'glow-blue': '0 0 25px -5px rgba(0, 153, 255, 0.4)',
        'glow-purple': '0 0 25px -5px rgba(168, 85, 247, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
