import type { Config } from "tailwindcss";

/**
 * Color tokens are stored as RGB-triplet CSS variables in globals.css.
 * `<alpha-value>` lets utilities like `text-white/80` and `bg-primary/10`
 * keep working unchanged — opacity is applied at the CSS layer.
 *
 * Crucially `white` is mapped to `--color-foreground` so existing
 * `text-white` usages flip to a dark slate when light mode is active —
 * we don't have to migrate ~120 call-sites.
 */
const cssVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class", '[class~="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:         cssVar("--color-bg"),
        surface:    cssVar("--color-surface"),
        border:     cssVar("--color-border"),
        muted:      cssVar("--color-muted"),
        foreground: cssVar("--color-foreground"),

        // `white` is intentionally remapped to the foreground token so existing
        // `text-white`, `bg-white/5`, `border-white/10` adapt to the theme.
        white:      cssVar("--color-foreground"),

        primary:    cssVar("--color-primary"),
        "on-primary": cssVar("--color-on-primary"),
        accent:     cssVar("--color-accent"),
        danger:     cssVar("--color-danger"),
        warning:    cssVar("--color-warning"),
        success:    cssVar("--color-success"),
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(20,184,166,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
