/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'float-delay': 'float 3s ease-in-out 1s infinite',
        'shake': 'shake 0.5s ease-in-out',
        'glow-pulse': 'glowPulse 1.5s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'explode': 'explode 0.8s ease-out forwards',
        'spawn': 'spawn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'dream': 'dream 2s ease-in-out infinite',
        'skill-up': 'skillUp 1s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slash': 'slash 0.4s ease-out',
        'hit': 'hit 0.3s ease-out',
        'fork-left': 'forkLeft 0.8s ease-out forwards',
        'fork-right': 'forkRight 0.8s ease-out forwards',
        'merge': 'mergeAnim 0.8s ease-in forwards',
        'prune': 'pruneAnim 1s ease-in forwards',
        'genesis': 'genesisAnim 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-8px)' },
          '75%': { transform: 'translateX(8px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px currentColor' },
          '50%': { boxShadow: '0 0 25px currentColor, 0 0 50px currentColor' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        explode: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.5)', opacity: '0.5' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        spawn: {
          '0%': { transform: 'scale(0) rotate(-180deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        dream: {
          '0%, 100%': { transform: 'translateY(0) scale(1)', opacity: '0.8' },
          '50%': { transform: 'translateY(-12px) scale(1.05)', opacity: '1' },
        },
        skillUp: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)', color: '#fbbf24' },
          '100%': { transform: 'scale(1)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slash: {
          '0%': { transform: 'translateX(-20px) rotate(-45deg)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateX(20px) rotate(45deg)', opacity: '0' },
        },
        hit: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.85)', filter: 'brightness(2)' },
          '100%': { transform: 'scale(1)' },
        },
        forkLeft: {
          '0%': { transform: 'translateX(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateX(-60px) scale(0.9)', opacity: '1' },
        },
        forkRight: {
          '0%': { transform: 'translateX(0) scale(0)', opacity: '0' },
          '100%': { transform: 'translateX(60px) scale(0.9)', opacity: '1' },
        },
        mergeAnim: {
          '0%': { transform: 'translateX(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateX(30px) scale(0)', opacity: '0' },
        },
        pruneAnim: {
          '0%': { transform: 'scale(1) rotate(0)', opacity: '1', filter: 'grayscale(0)' },
          '100%': { transform: 'scale(0) rotate(180deg)', opacity: '0', filter: 'grayscale(1)' },
        },
        genesisAnim: {
          '0%': { transform: 'scale(0)', opacity: '0', filter: 'brightness(3)' },
          '100%': { transform: 'scale(1)', opacity: '1', filter: 'brightness(1)' },
        },
      },
    },
  },
  plugins: [],
}
