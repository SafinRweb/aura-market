import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#080810",
        bg2: "#0d0d1a",
        bg3: "#12122a",
        surface: "#1a1a2e",
        surface2: "#1e1e35",
        border: "#2a2a4a",
        border2: "#3a3a6a",
        green: {
          DEFAULT: "#00ff87",
          dim: "#003320",
          dark: "#00cc6a",
        },
        pink: {
          DEFAULT: "#ff006e",
          dim: "#330015",
        },
        yellow: {
          DEFAULT: "#ffbe0b",
          dim: "#332500",
        },
        blue: {
          DEFAULT: "#00b4ff",
          dim: "#001a33",
        },
        muted: "#aaaacc",
        faint: "#666688",
      },
      fontFamily: {
        pixel: ["'Press Start 2P'", "monospace"],
        mono: ["'Share Tech Mono'", "monospace"],
      },
      fontSize: {
        "2xs": "7px",
        xs: "8px",
        sm: "9px",
        base: "10px",
        lg: "12px",
        xl: "14px",
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "24px",
      },
      borderRadius: {
        none: "0px",
        DEFAULT: "0px",
      },
      boxShadow: {
        green: "0 0 20px rgba(0,255,135,0.3)",
        pink: "0 0 20px rgba(255,0,110,0.3)",
        blue: "0 0 20px rgba(0,180,255,0.25)",
        yellow: "0 0 20px rgba(255,190,11,0.3)",
        "pixel-green": "4px 4px 0px #00cc6a",
        "pixel-pink": "4px 4px 0px #cc0055",
        "pixel-yellow": "4px 4px 0px #cc9800",
        "pixel-gray": "4px 4px 0px #2a2a4a",
      },
      animation: {
        "pulse-green": "pulseGreen 2s infinite",
        "blink": "blink 1s step-end infinite",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "ticker": "ticker 30s linear infinite",
      },
      keyframes: {
        pulseGreen: {
          "0%,100%": { boxShadow: "0 0 10px rgba(0,255,135,0.2)" },
          "50%": { boxShadow: "0 0 30px rgba(0,255,135,0.6)" },
        },
        blink: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        slideUp: {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        ticker: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;