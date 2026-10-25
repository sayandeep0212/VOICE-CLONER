/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        elder: {
          bg: "#0B0F19",
          card: "#161E2E",
          cardBorder: "#2A374E",
          primary: "#38BDF8",
          primaryHover: "#0EA5E9",
          warm: "#F59E0B",
          calm: "#10B981",
          alert: "#EF4444",
          textLight: "#F8FAFC",
          textMuted: "#94A3B8"
        }
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "sans-serif"],
        serif: ["Merriweather", "serif"]
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ripple": "ripple 2s linear infinite",
        "wave": "wave 1.5s ease-in-out infinite",
      },
      keyframes: {
        ripple: {
          "0%": { transform: "scale(0.95)", opacity: "0.8" },
          "100%": { transform: "scale(1.4)", opacity: "0" }
        },
        wave: {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" }
        }
      }
    },
  },
  plugins: [],
};
