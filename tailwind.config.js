/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['ui-serif', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
        notion: ['ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        paper: ['ui-serif', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
      },
      letterSpacing: {
        tighter: '-0.02em',
        tight: '-0.01em',
        normal: '0em',
        wide: '0.01em',
        wider: '0.02em',
        widest: '0.05em',
        notion: '-0.015em',
      },
      lineHeight: {
        notion: '1.5',
        paper: '1.65',
      },
      colors: {
        bg: {
          main: 'var(--color-bg-main)',
          card: 'var(--color-bg-card)',
          subtle: 'var(--color-bg-subtle)',
          hover: 'var(--color-bg-hover)',
          sidebar: 'var(--color-bg-sidebar)',
          header: 'var(--color-bg-header)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          interactive: 'var(--color-border-interactive)',
          subtle: 'var(--color-border-subtle)',
          focus: 'var(--color-border-focus)',
        },
        txt: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)',
        },
        nav: {
          activeBg: 'var(--color-nav-active-bg)',
          activeText: 'var(--color-nav-active-text)',
        },
      },
      borderRadius: {
        'control': '8px',
        'card': '16px',
        'modal': '20px',
        'notion': '4px',
        'notion-card': '6px',
      },
      boxShadow: {
        'card': 'var(--color-card-shadow, 0 1px 3px 0 rgba(0, 0, 0, 0.04))',
        'card-hover': '0 4px 12px -2px rgba(0, 0, 0, 0.06), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        'modal': '0 12px 32px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.06)',
        'popover': '0 8px 24px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
      },
      transitionTimingFunction: {
        'unslop': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      scale: {
        'press': '0.98',
      }
    },
  },
  plugins: [],
}
