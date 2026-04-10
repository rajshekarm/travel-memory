import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#040912",
          900: "#08121d",
          850: "#0b1825",
          800: "#102132",
          700: "#173046"
        },
        signal: {
          cyan: "#7ae7ff",
          mint: "#5dd6b0",
          gold: "#f4cc72",
          coral: "#ff876a",
          blue: "#85a5ff",
          orange: "#f7a654"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(122, 231, 255, 0.18), 0 24px 60px rgba(0, 0, 0, 0.35)"
      },
      backgroundImage: {
        "page-grid":
          "radial-gradient(circle at top left, rgba(122, 231, 255, 0.14), transparent 24%), radial-gradient(circle at bottom right, rgba(247, 166, 84, 0.16), transparent 20%)"
      },
      fontFamily: {
        display: ["Aptos", "Bahnschrift", "Segoe UI Variable Display", "sans-serif"],
        body: ["Aptos", "Bahnschrift", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
