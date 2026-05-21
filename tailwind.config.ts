import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f0f0f',
        foreground: '#e8e8e8',
        muted: '#2a2a2a',
        'muted-foreground': '#888888',
        border: '#2a2a2a',
        card: '#1a1a1a',
        'card-foreground': '#e8e8e8',
        primary: '#6366f1',
        'primary-foreground': '#ffffff',
        accent: '#1e1e2e',
        destructive: '#ef4444',
        success: '#22c55e',
        'success-foreground': '#052e16',
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
    },
  },
  plugins: [],
}

export default config
