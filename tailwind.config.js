/** @type {import('tailwindcss').Config} */
export default {
  content: ["./frontend/index.html", "./frontend/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        polarity: {
          positive: "#16a34a",
          neutral: "#64748b",
          negative: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};
