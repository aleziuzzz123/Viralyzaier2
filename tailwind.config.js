/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        animation: {
            'fade-in': 'fadeIn 0.5s ease-out forwards',
            'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
            'fade-in-down': 'fadeInDown 0.2s ease-out forwards',
            'progress-bar': 'progressBar 5s linear forwards',
        },
        keyframes: {
            fadeIn: {
                '0%': { opacity: '0' },
                '100%': { opacity: '1' },
            },
            fadeInUp: {
                '0%': { opacity: '0', transform: 'translateY(10px)' },
                '100%': { opacity: '1', transform: 'translateY(0)' },
            },
            fadeInDown: {
                '0%': { opacity: '0', transform: 'translateY(-10px)' },
                '100%': { opacity: '1', transform: 'translateY(0)' },
            },
            progressBar: {
                '0%': { width: '100%' },
                '100%': { width: '0%' },
            },
        }
    },
  },
  plugins: [],
}
