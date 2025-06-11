// tailwind.config.js
module.exports = {
  content: ["./*.html", "./*.js"],
  theme: {
    extend: {
      animation: {
        fadeIn: "fadeIn 1s ease-in forwards",
        fadeInUp: "fadeInUp 1s ease-in forwards",
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
