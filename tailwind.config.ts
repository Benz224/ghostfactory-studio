import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        studioBg: "#F8FAFC",
        studioCard: "#FFFFFF",
        studioPrimary: "#2563EB",
        studioPrimaryHover: "#3B82F6",
        studioText: "#0F172A",
        studioMuted: "#64748B",
        studioBorder: "#E2E8F0",
        studioSoftBlue: "#EFF6FF"
      }
    }
  },
  plugins: []
};

export default config;
