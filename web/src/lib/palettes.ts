/**
 * Les couleurs de l'admin que chacun choisit dans Mon compte (ADMIN § 7, « Les couleurs de
 * chacun ») : une couleur de base, qui teinte les gris, et une couleur d'accent, qui colore le
 * bouton principal et l'élément choisi du menu. Les valeurs sont celles des thèmes de shadcn
 * (apps/v4/registry/themes.ts du dépôt shadcn-ui/ui, relevées le 06/10/2026). Sans React.
 */

type Vars = Readonly<Record<string, string>>
type Pair = { light: Vars; dark: Vars }

const baseColors = [
  "neutral",
  "stone",
  "zinc",
  "mauve",
  "olive",
  "mist",
  "taupe",
] as const
export type BaseColor = (typeof baseColors)[number]

const accentColors = [
  "none",
  "amber",
  "blue",
  "cyan",
  "emerald",
  "fuchsia",
  "green",
  "indigo",
  "lime",
  "orange",
  "pink",
  "purple",
  "red",
  "rose",
  "sky",
  "teal",
  "violet",
  "yellow",
] as const
export type AccentColor = (typeof accentColors)[number]

// Tous les jetons de chaque couleur de base, comme shadcn les pose (sauf le rayon et le fond du
// menu, une carte sombre de la base) ; Neutre, la couleur de départ, est celle d'index.css.
const basePalettes: Record<BaseColor, Pair> = {
  stone: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.147 0.004 49.25)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.147 0.004 49.25)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.147 0.004 49.25)",
      primary: "oklch(0.216 0.006 56.043)",
      "primary-foreground": "oklch(0.985 0.001 106.423)",
      secondary: "oklch(0.97 0.001 106.424)",
      "secondary-foreground": "oklch(0.216 0.006 56.043)",
      muted: "oklch(0.97 0.001 106.424)",
      "muted-foreground": "oklch(0.553 0.013 58.071)",
      accent: "oklch(0.97 0.001 106.424)",
      "accent-foreground": "oklch(0.216 0.006 56.043)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.923 0.003 48.717)",
      input: "oklch(0.923 0.003 48.717)",
      ring: "oklch(0.709 0.01 56.259)",
      "chart-1": "oklch(0.869 0.005 56.366)",
      "chart-2": "oklch(0.553 0.013 58.071)",
      "chart-3": "oklch(0.444 0.011 73.639)",
      "chart-4": "oklch(0.374 0.01 67.558)",
      "chart-5": "oklch(0.268 0.007 34.298)",
      "sidebar-foreground": "oklch(0.147 0.004 49.25)",
      "sidebar-primary": "oklch(0.216 0.006 56.043)",
      "sidebar-primary-foreground": "oklch(0.985 0.001 106.423)",
      "sidebar-border": "oklch(0.923 0.003 48.717)",
      "sidebar-ring": "oklch(0.709 0.01 56.259)",
    },
    dark: {
      background: "oklch(0.147 0.004 49.25)",
      foreground: "oklch(0.985 0.001 106.423)",
      card: "oklch(0.216 0.006 56.043)",
      "card-foreground": "oklch(0.985 0.001 106.423)",
      popover: "oklch(0.216 0.006 56.043)",
      "popover-foreground": "oklch(0.985 0.001 106.423)",
      primary: "oklch(0.923 0.003 48.717)",
      "primary-foreground": "oklch(0.216 0.006 56.043)",
      secondary: "oklch(0.268 0.007 34.298)",
      "secondary-foreground": "oklch(0.985 0.001 106.423)",
      muted: "oklch(0.268 0.007 34.298)",
      "muted-foreground": "oklch(0.709 0.01 56.259)",
      accent: "oklch(0.268 0.007 34.298)",
      "accent-foreground": "oklch(0.985 0.001 106.423)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.553 0.013 58.071)",
      "chart-1": "oklch(0.869 0.005 56.366)",
      "chart-2": "oklch(0.553 0.013 58.071)",
      "chart-3": "oklch(0.444 0.011 73.639)",
      "chart-4": "oklch(0.374 0.01 67.558)",
      "chart-5": "oklch(0.268 0.007 34.298)",
      "sidebar-foreground": "oklch(0.985 0.001 106.423)",
      "sidebar-primary": "oklch(0.488 0.243 264.376)",
      "sidebar-primary-foreground": "oklch(0.985 0.001 106.423)",
      "sidebar-border": "oklch(1 0 0 / 10%)",
      "sidebar-ring": "oklch(0.553 0.013 58.071)",
    },
  },
  neutral: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.145 0 0)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.145 0 0)",
      primary: "oklch(0.205 0 0)",
      "primary-foreground": "oklch(0.985 0 0)",
      secondary: "oklch(0.97 0 0)",
      "secondary-foreground": "oklch(0.205 0 0)",
      muted: "oklch(0.97 0 0)",
      "muted-foreground": "oklch(0.556 0 0)",
      accent: "oklch(0.97 0 0)",
      "accent-foreground": "oklch(0.205 0 0)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.922 0 0)",
      input: "oklch(0.922 0 0)",
      ring: "oklch(0.708 0 0)",
      "chart-1": "oklch(0.87 0 0)",
      "chart-2": "oklch(0.556 0 0)",
      "chart-3": "oklch(0.439 0 0)",
      "chart-4": "oklch(0.371 0 0)",
      "chart-5": "oklch(0.269 0 0)",
      "sidebar-foreground": "oklch(0.145 0 0)",
      "sidebar-primary": "oklch(0.205 0 0)",
      "sidebar-primary-foreground": "oklch(0.985 0 0)",
      "sidebar-border": "oklch(0.922 0 0)",
      "sidebar-ring": "oklch(0.708 0 0)",
    },
    dark: {
      background: "oklch(0.145 0 0)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.205 0 0)",
      "card-foreground": "oklch(0.985 0 0)",
      popover: "oklch(0.205 0 0)",
      "popover-foreground": "oklch(0.985 0 0)",
      primary: "oklch(0.922 0 0)",
      "primary-foreground": "oklch(0.205 0 0)",
      secondary: "oklch(0.269 0 0)",
      "secondary-foreground": "oklch(0.985 0 0)",
      muted: "oklch(0.269 0 0)",
      "muted-foreground": "oklch(0.708 0 0)",
      accent: "oklch(0.269 0 0)",
      "accent-foreground": "oklch(0.985 0 0)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.556 0 0)",
      "chart-1": "oklch(0.87 0 0)",
      "chart-2": "oklch(0.556 0 0)",
      "chart-3": "oklch(0.439 0 0)",
      "chart-4": "oklch(0.371 0 0)",
      "chart-5": "oklch(0.269 0 0)",
      "sidebar-foreground": "oklch(0.985 0 0)",
      "sidebar-primary": "oklch(0.488 0.243 264.376)",
      "sidebar-primary-foreground": "oklch(0.985 0 0)",
      "sidebar-border": "oklch(1 0 0 / 10%)",
      "sidebar-ring": "oklch(0.556 0 0)",
    },
  },
  zinc: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.141 0.005 285.823)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.141 0.005 285.823)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.141 0.005 285.823)",
      primary: "oklch(0.21 0.006 285.885)",
      "primary-foreground": "oklch(0.985 0 0)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      muted: "oklch(0.967 0.001 286.375)",
      "muted-foreground": "oklch(0.552 0.016 285.938)",
      accent: "oklch(0.967 0.001 286.375)",
      "accent-foreground": "oklch(0.21 0.006 285.885)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.92 0.004 286.32)",
      input: "oklch(0.92 0.004 286.32)",
      ring: "oklch(0.705 0.015 286.067)",
      "chart-1": "oklch(0.871 0.006 286.286)",
      "chart-2": "oklch(0.552 0.016 285.938)",
      "chart-3": "oklch(0.442 0.017 285.786)",
      "chart-4": "oklch(0.37 0.013 285.805)",
      "chart-5": "oklch(0.274 0.006 286.033)",
      "sidebar-foreground": "oklch(0.141 0.005 285.823)",
      "sidebar-primary": "oklch(0.21 0.006 285.885)",
      "sidebar-primary-foreground": "oklch(0.985 0 0)",
      "sidebar-border": "oklch(0.92 0.004 286.32)",
      "sidebar-ring": "oklch(0.705 0.015 286.067)",
    },
    dark: {
      background: "oklch(0.141 0.005 285.823)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.21 0.006 285.885)",
      "card-foreground": "oklch(0.985 0 0)",
      popover: "oklch(0.21 0.006 285.885)",
      "popover-foreground": "oklch(0.985 0 0)",
      primary: "oklch(0.92 0.004 286.32)",
      "primary-foreground": "oklch(0.21 0.006 285.885)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      muted: "oklch(0.274 0.006 286.033)",
      "muted-foreground": "oklch(0.705 0.015 286.067)",
      accent: "oklch(0.274 0.006 286.033)",
      "accent-foreground": "oklch(0.985 0 0)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.552 0.016 285.938)",
      "chart-1": "oklch(0.871 0.006 286.286)",
      "chart-2": "oklch(0.552 0.016 285.938)",
      "chart-3": "oklch(0.442 0.017 285.786)",
      "chart-4": "oklch(0.37 0.013 285.805)",
      "chart-5": "oklch(0.274 0.006 286.033)",
      "sidebar-foreground": "oklch(0.985 0 0)",
      "sidebar-primary": "oklch(0.488 0.243 264.376)",
      "sidebar-primary-foreground": "oklch(0.985 0 0)",
      "sidebar-border": "oklch(1 0 0 / 10%)",
      "sidebar-ring": "oklch(0.552 0.016 285.938)",
    },
  },
  mauve: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0.008 326)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.145 0.008 326)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.145 0.008 326)",
      primary: "oklch(0.212 0.019 322.12)",
      "primary-foreground": "oklch(0.985 0 0)",
      secondary: "oklch(0.96 0.003 325.6)",
      "secondary-foreground": "oklch(0.212 0.019 322.12)",
      muted: "oklch(0.96 0.003 325.6)",
      "muted-foreground": "oklch(0.542 0.034 322.5)",
      accent: "oklch(0.96 0.003 325.6)",
      "accent-foreground": "oklch(0.212 0.019 322.12)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.922 0.005 325.62)",
      input: "oklch(0.922 0.005 325.62)",
      ring: "oklch(0.711 0.019 323.02)",
      "chart-1": "oklch(0.865 0.012 325.68)",
      "chart-2": "oklch(0.542 0.034 322.5)",
      "chart-3": "oklch(0.435 0.029 321.78)",
      "chart-4": "oklch(0.364 0.029 323.89)",
      "chart-5": "oklch(0.263 0.024 320.12)",
      "sidebar-foreground": "oklch(0.145 0.008 326)",
      "sidebar-primary": "oklch(0.212 0.019 322.12)",
      "sidebar-primary-foreground": "oklch(0.985 0 0)",
      "sidebar-border": "oklch(0.922 0.005 325.62)",
      "sidebar-ring": "oklch(0.711 0.019 323.02)",
    },
    dark: {
      background: "oklch(0.145 0.008 326)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.212 0.019 322.12)",
      "card-foreground": "oklch(0.985 0 0)",
      popover: "oklch(0.212 0.019 322.12)",
      "popover-foreground": "oklch(0.985 0 0)",
      primary: "oklch(0.922 0.005 325.62)",
      "primary-foreground": "oklch(0.212 0.019 322.12)",
      secondary: "oklch(0.263 0.024 320.12)",
      "secondary-foreground": "oklch(0.985 0 0)",
      muted: "oklch(0.263 0.024 320.12)",
      "muted-foreground": "oklch(0.711 0.019 323.02)",
      accent: "oklch(0.263 0.024 320.12)",
      "accent-foreground": "oklch(0.985 0 0)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.542 0.034 322.5)",
      "chart-1": "oklch(0.865 0.012 325.68)",
      "chart-2": "oklch(0.542 0.034 322.5)",
      "chart-3": "oklch(0.435 0.029 321.78)",
      "chart-4": "oklch(0.364 0.029 323.89)",
      "chart-5": "oklch(0.263 0.024 320.12)",
      "sidebar-foreground": "oklch(0.985 0 0)",
      "sidebar-primary": "oklch(0.488 0.243 264.376)",
      "sidebar-primary-foreground": "oklch(0.985 0 0)",
      "sidebar-border": "oklch(1 0 0 / 10%)",
      "sidebar-ring": "oklch(0.542 0.034 322.5)",
    },
  },
  olive: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.153 0.006 107.1)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.153 0.006 107.1)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.153 0.006 107.1)",
      primary: "oklch(0.228 0.013 107.4)",
      "primary-foreground": "oklch(0.988 0.003 106.5)",
      secondary: "oklch(0.966 0.005 106.5)",
      "secondary-foreground": "oklch(0.228 0.013 107.4)",
      muted: "oklch(0.966 0.005 106.5)",
      "muted-foreground": "oklch(0.58 0.031 107.3)",
      accent: "oklch(0.966 0.005 106.5)",
      "accent-foreground": "oklch(0.228 0.013 107.4)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.93 0.007 106.5)",
      input: "oklch(0.93 0.007 106.5)",
      ring: "oklch(0.737 0.021 106.9)",
      "chart-1": "oklch(0.88 0.011 106.6)",
      "chart-2": "oklch(0.58 0.031 107.3)",
      "chart-3": "oklch(0.466 0.025 107.3)",
      "chart-4": "oklch(0.394 0.023 107.4)",
      "chart-5": "oklch(0.286 0.016 107.4)",
      "sidebar-foreground": "oklch(0.153 0.006 107.1)",
      "sidebar-primary": "oklch(0.228 0.013 107.4)",
      "sidebar-primary-foreground": "oklch(0.988 0.003 106.5)",
      "sidebar-border": "oklch(0.93 0.007 106.5)",
      "sidebar-ring": "oklch(0.737 0.021 106.9)",
    },
    dark: {
      background: "oklch(0.153 0.006 107.1)",
      foreground: "oklch(0.988 0.003 106.5)",
      card: "oklch(0.228 0.013 107.4)",
      "card-foreground": "oklch(0.988 0.003 106.5)",
      popover: "oklch(0.228 0.013 107.4)",
      "popover-foreground": "oklch(0.988 0.003 106.5)",
      primary: "oklch(0.93 0.007 106.5)",
      "primary-foreground": "oklch(0.228 0.013 107.4)",
      secondary: "oklch(0.286 0.016 107.4)",
      "secondary-foreground": "oklch(0.988 0.003 106.5)",
      muted: "oklch(0.286 0.016 107.4)",
      "muted-foreground": "oklch(0.737 0.021 106.9)",
      accent: "oklch(0.286 0.016 107.4)",
      "accent-foreground": "oklch(0.988 0.003 106.5)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.58 0.031 107.3)",
      "chart-1": "oklch(0.88 0.011 106.6)",
      "chart-2": "oklch(0.58 0.031 107.3)",
      "chart-3": "oklch(0.466 0.025 107.3)",
      "chart-4": "oklch(0.394 0.023 107.4)",
      "chart-5": "oklch(0.286 0.016 107.4)",
      "sidebar-foreground": "oklch(0.988 0.003 106.5)",
      "sidebar-primary": "oklch(0.488 0.243 264.376)",
      "sidebar-primary-foreground": "oklch(0.988 0.003 106.5)",
      "sidebar-border": "oklch(1 0 0 / 10%)",
      "sidebar-ring": "oklch(0.58 0.031 107.3)",
    },
  },
  mist: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.148 0.004 228.8)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.148 0.004 228.8)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.148 0.004 228.8)",
      primary: "oklch(0.218 0.008 223.9)",
      "primary-foreground": "oklch(0.987 0.002 197.1)",
      secondary: "oklch(0.963 0.002 197.1)",
      "secondary-foreground": "oklch(0.218 0.008 223.9)",
      muted: "oklch(0.963 0.002 197.1)",
      "muted-foreground": "oklch(0.56 0.021 213.5)",
      accent: "oklch(0.963 0.002 197.1)",
      "accent-foreground": "oklch(0.218 0.008 223.9)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.925 0.005 214.3)",
      input: "oklch(0.925 0.005 214.3)",
      ring: "oklch(0.723 0.014 214.4)",
      "chart-1": "oklch(0.872 0.007 219.6)",
      "chart-2": "oklch(0.56 0.021 213.5)",
      "chart-3": "oklch(0.45 0.017 213.2)",
      "chart-4": "oklch(0.378 0.015 216)",
      "chart-5": "oklch(0.275 0.011 216.9)",
      "sidebar-foreground": "oklch(0.148 0.004 228.8)",
      "sidebar-primary": "oklch(0.218 0.008 223.9)",
      "sidebar-primary-foreground": "oklch(0.987 0.002 197.1)",
      "sidebar-border": "oklch(0.925 0.005 214.3)",
      "sidebar-ring": "oklch(0.723 0.014 214.4)",
    },
    dark: {
      background: "oklch(0.148 0.004 228.8)",
      foreground: "oklch(0.987 0.002 197.1)",
      card: "oklch(0.218 0.008 223.9)",
      "card-foreground": "oklch(0.987 0.002 197.1)",
      popover: "oklch(0.218 0.008 223.9)",
      "popover-foreground": "oklch(0.987 0.002 197.1)",
      primary: "oklch(0.925 0.005 214.3)",
      "primary-foreground": "oklch(0.218 0.008 223.9)",
      secondary: "oklch(0.275 0.011 216.9)",
      "secondary-foreground": "oklch(0.987 0.002 197.1)",
      muted: "oklch(0.275 0.011 216.9)",
      "muted-foreground": "oklch(0.723 0.014 214.4)",
      accent: "oklch(0.275 0.011 216.9)",
      "accent-foreground": "oklch(0.987 0.002 197.1)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.56 0.021 213.5)",
      "chart-1": "oklch(0.872 0.007 219.6)",
      "chart-2": "oklch(0.56 0.021 213.5)",
      "chart-3": "oklch(0.45 0.017 213.2)",
      "chart-4": "oklch(0.378 0.015 216)",
      "chart-5": "oklch(0.275 0.011 216.9)",
      "sidebar-foreground": "oklch(0.987 0.002 197.1)",
      "sidebar-primary": "oklch(0.488 0.243 264.376)",
      "sidebar-primary-foreground": "oklch(0.987 0.002 197.1)",
      "sidebar-border": "oklch(1 0 0 / 10%)",
      "sidebar-ring": "oklch(0.56 0.021 213.5)",
    },
  },
  taupe: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.147 0.004 49.3)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.147 0.004 49.3)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.147 0.004 49.3)",
      primary: "oklch(0.214 0.009 43.1)",
      "primary-foreground": "oklch(0.986 0.002 67.8)",
      secondary: "oklch(0.96 0.002 17.2)",
      "secondary-foreground": "oklch(0.214 0.009 43.1)",
      muted: "oklch(0.96 0.002 17.2)",
      "muted-foreground": "oklch(0.547 0.021 43.1)",
      accent: "oklch(0.96 0.002 17.2)",
      "accent-foreground": "oklch(0.214 0.009 43.1)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.922 0.005 34.3)",
      input: "oklch(0.922 0.005 34.3)",
      ring: "oklch(0.714 0.014 41.2)",
      "chart-1": "oklch(0.868 0.007 39.5)",
      "chart-2": "oklch(0.547 0.021 43.1)",
      "chart-3": "oklch(0.438 0.017 39.3)",
      "chart-4": "oklch(0.367 0.016 35.7)",
      "chart-5": "oklch(0.268 0.011 36.5)",
      "sidebar-foreground": "oklch(0.147 0.004 49.3)",
      "sidebar-primary": "oklch(0.214 0.009 43.1)",
      "sidebar-primary-foreground": "oklch(0.986 0.002 67.8)",
      "sidebar-border": "oklch(0.922 0.005 34.3)",
      "sidebar-ring": "oklch(0.714 0.014 41.2)",
    },
    dark: {
      background: "oklch(0.147 0.004 49.3)",
      foreground: "oklch(0.986 0.002 67.8)",
      card: "oklch(0.214 0.009 43.1)",
      "card-foreground": "oklch(0.986 0.002 67.8)",
      popover: "oklch(0.214 0.009 43.1)",
      "popover-foreground": "oklch(0.986 0.002 67.8)",
      primary: "oklch(0.922 0.005 34.3)",
      "primary-foreground": "oklch(0.214 0.009 43.1)",
      secondary: "oklch(0.268 0.011 36.5)",
      "secondary-foreground": "oklch(0.986 0.002 67.8)",
      muted: "oklch(0.268 0.011 36.5)",
      "muted-foreground": "oklch(0.714 0.014 41.2)",
      accent: "oklch(0.268 0.011 36.5)",
      "accent-foreground": "oklch(0.986 0.002 67.8)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.547 0.021 43.1)",
      "chart-1": "oklch(0.868 0.007 39.5)",
      "chart-2": "oklch(0.547 0.021 43.1)",
      "chart-3": "oklch(0.438 0.017 39.3)",
      "chart-4": "oklch(0.367 0.016 35.7)",
      "chart-5": "oklch(0.268 0.011 36.5)",
      "sidebar-foreground": "oklch(0.986 0.002 67.8)",
      "sidebar-primary": "oklch(0.488 0.243 264.376)",
      "sidebar-primary-foreground": "oklch(0.986 0.002 67.8)",
      "sidebar-border": "oklch(1 0 0 / 10%)",
      "sidebar-ring": "oklch(0.547 0.021 43.1)",
    },
  },
}

// Tous les jetons de chaque accent : couleur principale, secondaire, graphiques, menu.
const accentPalettes: Record<Exclude<AccentColor, "none">, Pair> = {
  amber: {
    light: {
      primary: "oklch(0.555 0.163 48.998)",
      "primary-foreground": "oklch(0.987 0.022 95.277)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.879 0.169 91.605)",
      "chart-2": "oklch(0.769 0.188 70.08)",
      "chart-3": "oklch(0.666 0.179 58.318)",
      "chart-4": "oklch(0.555 0.163 48.998)",
      "chart-5": "oklch(0.473 0.137 46.201)",
      "sidebar-primary": "oklch(0.666 0.179 58.318)",
      "sidebar-primary-foreground": "oklch(0.987 0.022 95.277)",
    },
    dark: {
      primary: "oklch(0.473 0.137 46.201)",
      "primary-foreground": "oklch(0.987 0.022 95.277)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.879 0.169 91.605)",
      "chart-2": "oklch(0.769 0.188 70.08)",
      "chart-3": "oklch(0.666 0.179 58.318)",
      "chart-4": "oklch(0.555 0.163 48.998)",
      "chart-5": "oklch(0.473 0.137 46.201)",
      "sidebar-primary": "oklch(0.769 0.188 70.08)",
      "sidebar-primary-foreground": "oklch(0.279 0.077 45.635)",
    },
  },
  blue: {
    light: {
      primary: "oklch(0.488 0.243 264.376)",
      "primary-foreground": "oklch(0.97 0.014 254.604)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.809 0.105 251.813)",
      "chart-2": "oklch(0.623 0.214 259.815)",
      "chart-3": "oklch(0.546 0.245 262.881)",
      "chart-4": "oklch(0.488 0.243 264.376)",
      "chart-5": "oklch(0.424 0.199 265.638)",
      "sidebar-primary": "oklch(0.546 0.245 262.881)",
      "sidebar-primary-foreground": "oklch(0.97 0.014 254.604)",
    },
    dark: {
      primary: "oklch(0.424 0.199 265.638)",
      "primary-foreground": "oklch(0.97 0.014 254.604)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.809 0.105 251.813)",
      "chart-2": "oklch(0.623 0.214 259.815)",
      "chart-3": "oklch(0.546 0.245 262.881)",
      "chart-4": "oklch(0.488 0.243 264.376)",
      "chart-5": "oklch(0.424 0.199 265.638)",
      "sidebar-primary": "oklch(0.623 0.214 259.815)",
      "sidebar-primary-foreground": "oklch(0.97 0.014 254.604)",
    },
  },
  cyan: {
    light: {
      primary: "oklch(0.52 0.105 223.128)",
      "primary-foreground": "oklch(0.984 0.019 200.873)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.865 0.127 207.078)",
      "chart-2": "oklch(0.715 0.143 215.221)",
      "chart-3": "oklch(0.609 0.126 221.723)",
      "chart-4": "oklch(0.52 0.105 223.128)",
      "chart-5": "oklch(0.45 0.085 224.283)",
      "sidebar-primary": "oklch(0.609 0.126 221.723)",
      "sidebar-primary-foreground": "oklch(0.984 0.019 200.873)",
    },
    dark: {
      primary: "oklch(0.45 0.085 224.283)",
      "primary-foreground": "oklch(0.984 0.019 200.873)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.865 0.127 207.078)",
      "chart-2": "oklch(0.715 0.143 215.221)",
      "chart-3": "oklch(0.609 0.126 221.723)",
      "chart-4": "oklch(0.52 0.105 223.128)",
      "chart-5": "oklch(0.45 0.085 224.283)",
      "sidebar-primary": "oklch(0.715 0.143 215.221)",
      "sidebar-primary-foreground": "oklch(0.302 0.056 229.695)",
    },
  },
  emerald: {
    light: {
      primary: "oklch(0.508 0.118 165.612)",
      "primary-foreground": "oklch(0.979 0.021 166.113)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.845 0.143 164.978)",
      "chart-2": "oklch(0.696 0.17 162.48)",
      "chart-3": "oklch(0.596 0.145 163.225)",
      "chart-4": "oklch(0.508 0.118 165.612)",
      "chart-5": "oklch(0.432 0.095 166.913)",
      "sidebar-primary": "oklch(0.596 0.145 163.225)",
      "sidebar-primary-foreground": "oklch(0.979 0.021 166.113)",
    },
    dark: {
      primary: "oklch(0.432 0.095 166.913)",
      "primary-foreground": "oklch(0.979 0.021 166.113)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.845 0.143 164.978)",
      "chart-2": "oklch(0.696 0.17 162.48)",
      "chart-3": "oklch(0.596 0.145 163.225)",
      "chart-4": "oklch(0.508 0.118 165.612)",
      "chart-5": "oklch(0.432 0.095 166.913)",
      "sidebar-primary": "oklch(0.696 0.17 162.48)",
      "sidebar-primary-foreground": "oklch(0.262 0.051 172.552)",
    },
  },
  fuchsia: {
    light: {
      primary: "oklch(0.518 0.253 323.949)",
      "primary-foreground": "oklch(0.977 0.017 320.058)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.833 0.145 321.434)",
      "chart-2": "oklch(0.667 0.295 322.15)",
      "chart-3": "oklch(0.591 0.293 322.896)",
      "chart-4": "oklch(0.518 0.253 323.949)",
      "chart-5": "oklch(0.452 0.211 324.591)",
      "sidebar-primary": "oklch(0.591 0.293 322.896)",
      "sidebar-primary-foreground": "oklch(0.977 0.017 320.058)",
    },
    dark: {
      primary: "oklch(0.452 0.211 324.591)",
      "primary-foreground": "oklch(0.977 0.017 320.058)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.833 0.145 321.434)",
      "chart-2": "oklch(0.667 0.295 322.15)",
      "chart-3": "oklch(0.591 0.293 322.896)",
      "chart-4": "oklch(0.518 0.253 323.949)",
      "chart-5": "oklch(0.452 0.211 324.591)",
      "sidebar-primary": "oklch(0.667 0.295 322.15)",
      "sidebar-primary-foreground": "oklch(0.977 0.017 320.058)",
    },
  },
  green: {
    light: {
      primary: "oklch(0.527 0.154 150.069)",
      "primary-foreground": "oklch(0.982 0.018 155.826)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.871 0.15 154.449)",
      "chart-2": "oklch(0.723 0.219 149.579)",
      "chart-3": "oklch(0.627 0.194 149.214)",
      "chart-4": "oklch(0.527 0.154 150.069)",
      "chart-5": "oklch(0.448 0.119 151.328)",
      "sidebar-primary": "oklch(0.627 0.194 149.214)",
      "sidebar-primary-foreground": "oklch(0.982 0.018 155.826)",
    },
    dark: {
      primary: "oklch(0.448 0.119 151.328)",
      "primary-foreground": "oklch(0.982 0.018 155.826)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.871 0.15 154.449)",
      "chart-2": "oklch(0.723 0.219 149.579)",
      "chart-3": "oklch(0.627 0.194 149.214)",
      "chart-4": "oklch(0.527 0.154 150.069)",
      "chart-5": "oklch(0.448 0.119 151.328)",
      "sidebar-primary": "oklch(0.723 0.219 149.579)",
      "sidebar-primary-foreground": "oklch(0.982 0.018 155.826)",
    },
  },
  indigo: {
    light: {
      primary: "oklch(0.457 0.24 277.023)",
      "primary-foreground": "oklch(0.962 0.018 272.314)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.785 0.115 274.713)",
      "chart-2": "oklch(0.585 0.233 277.117)",
      "chart-3": "oklch(0.511 0.262 276.966)",
      "chart-4": "oklch(0.457 0.24 277.023)",
      "chart-5": "oklch(0.398 0.195 277.366)",
      "sidebar-primary": "oklch(0.511 0.262 276.966)",
      "sidebar-primary-foreground": "oklch(0.962 0.018 272.314)",
    },
    dark: {
      primary: "oklch(0.398 0.195 277.366)",
      "primary-foreground": "oklch(0.962 0.018 272.314)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.785 0.115 274.713)",
      "chart-2": "oklch(0.585 0.233 277.117)",
      "chart-3": "oklch(0.511 0.262 276.966)",
      "chart-4": "oklch(0.457 0.24 277.023)",
      "chart-5": "oklch(0.398 0.195 277.366)",
      "sidebar-primary": "oklch(0.585 0.233 277.117)",
      "sidebar-primary-foreground": "oklch(0.962 0.018 272.314)",
    },
  },
  lime: {
    light: {
      primary: "oklch(0.841 0.238 128.85)",
      "primary-foreground": "oklch(0.405 0.101 131.063)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.897 0.196 126.665)",
      "chart-2": "oklch(0.768 0.233 130.85)",
      "chart-3": "oklch(0.648 0.2 131.684)",
      "chart-4": "oklch(0.532 0.157 131.589)",
      "chart-5": "oklch(0.453 0.124 130.933)",
      "sidebar-primary": "oklch(0.648 0.2 131.684)",
      "sidebar-primary-foreground": "oklch(0.986 0.031 120.757)",
    },
    dark: {
      primary: "oklch(0.768 0.233 130.85)",
      "primary-foreground": "oklch(0.405 0.101 131.063)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.897 0.196 126.665)",
      "chart-2": "oklch(0.768 0.233 130.85)",
      "chart-3": "oklch(0.648 0.2 131.684)",
      "chart-4": "oklch(0.532 0.157 131.589)",
      "chart-5": "oklch(0.453 0.124 130.933)",
      "sidebar-primary": "oklch(0.768 0.233 130.85)",
      "sidebar-primary-foreground": "oklch(0.274 0.072 132.109)",
    },
  },
  orange: {
    light: {
      primary: "oklch(0.553 0.195 38.402)",
      "primary-foreground": "oklch(0.98 0.016 73.684)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.837 0.128 66.29)",
      "chart-2": "oklch(0.705 0.213 47.604)",
      "chart-3": "oklch(0.646 0.222 41.116)",
      "chart-4": "oklch(0.553 0.195 38.402)",
      "chart-5": "oklch(0.47 0.157 37.304)",
      "sidebar-primary": "oklch(0.646 0.222 41.116)",
      "sidebar-primary-foreground": "oklch(0.98 0.016 73.684)",
    },
    dark: {
      primary: "oklch(0.47 0.157 37.304)",
      "primary-foreground": "oklch(0.98 0.016 73.684)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.837 0.128 66.29)",
      "chart-2": "oklch(0.705 0.213 47.604)",
      "chart-3": "oklch(0.646 0.222 41.116)",
      "chart-4": "oklch(0.553 0.195 38.402)",
      "chart-5": "oklch(0.47 0.157 37.304)",
      "sidebar-primary": "oklch(0.705 0.213 47.604)",
      "sidebar-primary-foreground": "oklch(0.98 0.016 73.684)",
    },
  },
  pink: {
    light: {
      primary: "oklch(0.525 0.223 3.958)",
      "primary-foreground": "oklch(0.971 0.014 343.198)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.823 0.12 346.018)",
      "chart-2": "oklch(0.656 0.241 354.308)",
      "chart-3": "oklch(0.592 0.249 0.584)",
      "chart-4": "oklch(0.525 0.223 3.958)",
      "chart-5": "oklch(0.459 0.187 3.815)",
      "sidebar-primary": "oklch(0.592 0.249 0.584)",
      "sidebar-primary-foreground": "oklch(0.971 0.014 343.198)",
    },
    dark: {
      primary: "oklch(0.459 0.187 3.815)",
      "primary-foreground": "oklch(0.971 0.014 343.198)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.823 0.12 346.018)",
      "chart-2": "oklch(0.656 0.241 354.308)",
      "chart-3": "oklch(0.592 0.249 0.584)",
      "chart-4": "oklch(0.525 0.223 3.958)",
      "chart-5": "oklch(0.459 0.187 3.815)",
      "sidebar-primary": "oklch(0.656 0.241 354.308)",
      "sidebar-primary-foreground": "oklch(0.971 0.014 343.198)",
    },
  },
  purple: {
    light: {
      primary: "oklch(0.496 0.265 301.924)",
      "primary-foreground": "oklch(0.977 0.014 308.299)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.827 0.119 306.383)",
      "chart-2": "oklch(0.627 0.265 303.9)",
      "chart-3": "oklch(0.558 0.288 302.321)",
      "chart-4": "oklch(0.496 0.265 301.924)",
      "chart-5": "oklch(0.438 0.218 303.724)",
      "sidebar-primary": "oklch(0.558 0.288 302.321)",
      "sidebar-primary-foreground": "oklch(0.977 0.014 308.299)",
    },
    dark: {
      primary: "oklch(0.438 0.218 303.724)",
      "primary-foreground": "oklch(0.977 0.014 308.299)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.827 0.119 306.383)",
      "chart-2": "oklch(0.627 0.265 303.9)",
      "chart-3": "oklch(0.558 0.288 302.321)",
      "chart-4": "oklch(0.496 0.265 301.924)",
      "chart-5": "oklch(0.438 0.218 303.724)",
      "sidebar-primary": "oklch(0.627 0.265 303.9)",
      "sidebar-primary-foreground": "oklch(0.977 0.014 308.299)",
    },
  },
  red: {
    light: {
      primary: "oklch(0.505 0.213 27.518)",
      "primary-foreground": "oklch(0.971 0.013 17.38)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.808 0.114 19.571)",
      "chart-2": "oklch(0.637 0.237 25.331)",
      "chart-3": "oklch(0.577 0.245 27.325)",
      "chart-4": "oklch(0.505 0.213 27.518)",
      "chart-5": "oklch(0.444 0.177 26.899)",
      "sidebar-primary": "oklch(0.577 0.245 27.325)",
      "sidebar-primary-foreground": "oklch(0.971 0.013 17.38)",
    },
    dark: {
      primary: "oklch(0.444 0.177 26.899)",
      "primary-foreground": "oklch(0.971 0.013 17.38)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.808 0.114 19.571)",
      "chart-2": "oklch(0.637 0.237 25.331)",
      "chart-3": "oklch(0.577 0.245 27.325)",
      "chart-4": "oklch(0.505 0.213 27.518)",
      "chart-5": "oklch(0.444 0.177 26.899)",
      "sidebar-primary": "oklch(0.637 0.237 25.331)",
      "sidebar-primary-foreground": "oklch(0.971 0.013 17.38)",
    },
  },
  rose: {
    light: {
      primary: "oklch(0.514 0.222 16.935)",
      "primary-foreground": "oklch(0.969 0.015 12.422)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.81 0.117 11.638)",
      "chart-2": "oklch(0.645 0.246 16.439)",
      "chart-3": "oklch(0.586 0.253 17.585)",
      "chart-4": "oklch(0.514 0.222 16.935)",
      "chart-5": "oklch(0.455 0.188 13.697)",
      "sidebar-primary": "oklch(0.586 0.253 17.585)",
      "sidebar-primary-foreground": "oklch(0.969 0.015 12.422)",
    },
    dark: {
      primary: "oklch(0.455 0.188 13.697)",
      "primary-foreground": "oklch(0.969 0.015 12.422)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.81 0.117 11.638)",
      "chart-2": "oklch(0.645 0.246 16.439)",
      "chart-3": "oklch(0.586 0.253 17.585)",
      "chart-4": "oklch(0.514 0.222 16.935)",
      "chart-5": "oklch(0.455 0.188 13.697)",
      "sidebar-primary": "oklch(0.645 0.246 16.439)",
      "sidebar-primary-foreground": "oklch(0.969 0.015 12.422)",
    },
  },
  sky: {
    light: {
      primary: "oklch(0.5 0.134 242.749)",
      "primary-foreground": "oklch(0.977 0.013 236.62)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.828 0.111 230.318)",
      "chart-2": "oklch(0.685 0.169 237.323)",
      "chart-3": "oklch(0.588 0.158 241.966)",
      "chart-4": "oklch(0.5 0.134 242.749)",
      "chart-5": "oklch(0.443 0.11 240.79)",
      "sidebar-primary": "oklch(0.588 0.158 241.966)",
      "sidebar-primary-foreground": "oklch(0.977 0.013 236.62)",
    },
    dark: {
      primary: "oklch(0.443 0.11 240.79)",
      "primary-foreground": "oklch(0.977 0.013 236.62)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.828 0.111 230.318)",
      "chart-2": "oklch(0.685 0.169 237.323)",
      "chart-3": "oklch(0.588 0.158 241.966)",
      "chart-4": "oklch(0.5 0.134 242.749)",
      "chart-5": "oklch(0.443 0.11 240.79)",
      "sidebar-primary": "oklch(0.685 0.169 237.323)",
      "sidebar-primary-foreground": "oklch(0.293 0.066 243.157)",
    },
  },
  teal: {
    light: {
      primary: "oklch(0.511 0.096 186.391)",
      "primary-foreground": "oklch(0.984 0.014 180.72)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.855 0.138 181.071)",
      "chart-2": "oklch(0.704 0.14 182.503)",
      "chart-3": "oklch(0.6 0.118 184.704)",
      "chart-4": "oklch(0.511 0.096 186.391)",
      "chart-5": "oklch(0.437 0.078 188.216)",
      "sidebar-primary": "oklch(0.6 0.118 184.704)",
      "sidebar-primary-foreground": "oklch(0.984 0.014 180.72)",
    },
    dark: {
      primary: "oklch(0.437 0.078 188.216)",
      "primary-foreground": "oklch(0.984 0.014 180.72)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.855 0.138 181.071)",
      "chart-2": "oklch(0.704 0.14 182.503)",
      "chart-3": "oklch(0.6 0.118 184.704)",
      "chart-4": "oklch(0.511 0.096 186.391)",
      "chart-5": "oklch(0.437 0.078 188.216)",
      "sidebar-primary": "oklch(0.704 0.14 182.503)",
      "sidebar-primary-foreground": "oklch(0.277 0.046 192.524)",
    },
  },
  violet: {
    light: {
      primary: "oklch(0.491 0.27 292.581)",
      "primary-foreground": "oklch(0.969 0.016 293.756)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.811 0.111 293.571)",
      "chart-2": "oklch(0.606 0.25 292.717)",
      "chart-3": "oklch(0.541 0.281 293.009)",
      "chart-4": "oklch(0.491 0.27 292.581)",
      "chart-5": "oklch(0.432 0.232 292.759)",
      "sidebar-primary": "oklch(0.541 0.281 293.009)",
      "sidebar-primary-foreground": "oklch(0.969 0.016 293.756)",
    },
    dark: {
      primary: "oklch(0.432 0.232 292.759)",
      "primary-foreground": "oklch(0.969 0.016 293.756)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.811 0.111 293.571)",
      "chart-2": "oklch(0.606 0.25 292.717)",
      "chart-3": "oklch(0.541 0.281 293.009)",
      "chart-4": "oklch(0.491 0.27 292.581)",
      "chart-5": "oklch(0.432 0.232 292.759)",
      "sidebar-primary": "oklch(0.606 0.25 292.717)",
      "sidebar-primary-foreground": "oklch(0.969 0.016 293.756)",
    },
  },
  yellow: {
    light: {
      primary: "oklch(0.852 0.199 91.936)",
      "primary-foreground": "oklch(0.421 0.095 57.708)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.905 0.182 98.111)",
      "chart-2": "oklch(0.795 0.184 86.047)",
      "chart-3": "oklch(0.681 0.162 75.834)",
      "chart-4": "oklch(0.554 0.135 66.442)",
      "chart-5": "oklch(0.476 0.114 61.907)",
      "sidebar-primary": "oklch(0.681 0.162 75.834)",
      "sidebar-primary-foreground": "oklch(0.987 0.026 102.212)",
    },
    dark: {
      primary: "oklch(0.795 0.184 86.047)",
      "primary-foreground": "oklch(0.421 0.095 57.708)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.905 0.182 98.111)",
      "chart-2": "oklch(0.795 0.184 86.047)",
      "chart-3": "oklch(0.681 0.162 75.834)",
      "chart-4": "oklch(0.554 0.135 66.442)",
      "chart-5": "oklch(0.476 0.114 61.907)",
      "sidebar-primary": "oklch(0.795 0.184 86.047)",
      "sidebar-primary-foreground": "oklch(0.987 0.026 102.212)",
    },
  },
}

// Les pastilles des palettes (classes écrites en entier pour que Tailwind les produise) : la
// couleur du bouton principal d'une base (sans accent) et celle de chaque accent.
export const baseInkSwatches: Record<BaseColor, string> = {
  stone: "bg-[oklch(0.216_0.006_56.043)]",
  neutral: "bg-[oklch(0.205_0_0)]",
  zinc: "bg-[oklch(0.21_0.006_285.885)]",
  mauve: "bg-[oklch(0.212_0.019_322.12)]",
  olive: "bg-[oklch(0.228_0.013_107.4)]",
  mist: "bg-[oklch(0.218_0.008_223.9)]",
  taupe: "bg-[oklch(0.214_0.009_43.1)]",
}

export const accentSwatches: Record<Exclude<AccentColor, "none">, string> = {
  amber: "bg-[oklch(0.555_0.163_48.998)]",
  blue: "bg-[oklch(0.488_0.243_264.376)]",
  cyan: "bg-[oklch(0.52_0.105_223.128)]",
  emerald: "bg-[oklch(0.508_0.118_165.612)]",
  fuchsia: "bg-[oklch(0.518_0.253_323.949)]",
  green: "bg-[oklch(0.527_0.154_150.069)]",
  indigo: "bg-[oklch(0.457_0.24_277.023)]",
  lime: "bg-[oklch(0.841_0.238_128.85)]",
  orange: "bg-[oklch(0.553_0.195_38.402)]",
  pink: "bg-[oklch(0.525_0.223_3.958)]",
  purple: "bg-[oklch(0.496_0.265_301.924)]",
  red: "bg-[oklch(0.505_0.213_27.518)]",
  rose: "bg-[oklch(0.514_0.222_16.935)]",
  sky: "bg-[oklch(0.5_0.134_242.749)]",
  teal: "bg-[oklch(0.511_0.096_186.391)]",
  violet: "bg-[oklch(0.491_0.27_292.581)]",
  yellow: "bg-[oklch(0.852_0.199_91.936)]",
}

// Les cartes des palettes : le gris sombre de chaque base (celui du menu), et les cinq couleurs
// des graphiques de chaque accent.
export const baseMenuSwatches: Record<BaseColor, string> = {
  stone: "bg-[oklch(0.216_0.006_56.043)]",
  neutral: "bg-[oklch(0.205_0_0)]",
  zinc: "bg-[oklch(0.21_0.006_285.885)]",
  mauve: "bg-[oklch(0.212_0.019_322.12)]",
  olive: "bg-[oklch(0.228_0.013_107.4)]",
  mist: "bg-[oklch(0.218_0.008_223.9)]",
  taupe: "bg-[oklch(0.214_0.009_43.1)]",
}

export const baseChartSwatches: Record<BaseColor, string[]> = {
  stone: [
    "bg-[oklch(0.869_0.005_56.366)]",
    "bg-[oklch(0.553_0.013_58.071)]",
    "bg-[oklch(0.444_0.011_73.639)]",
    "bg-[oklch(0.374_0.01_67.558)]",
    "bg-[oklch(0.268_0.007_34.298)]",
  ],
  neutral: [
    "bg-[oklch(0.87_0_0)]",
    "bg-[oklch(0.556_0_0)]",
    "bg-[oklch(0.439_0_0)]",
    "bg-[oklch(0.371_0_0)]",
    "bg-[oklch(0.269_0_0)]",
  ],
  zinc: [
    "bg-[oklch(0.871_0.006_286.286)]",
    "bg-[oklch(0.552_0.016_285.938)]",
    "bg-[oklch(0.442_0.017_285.786)]",
    "bg-[oklch(0.37_0.013_285.805)]",
    "bg-[oklch(0.274_0.006_286.033)]",
  ],
  mauve: [
    "bg-[oklch(0.865_0.012_325.68)]",
    "bg-[oklch(0.542_0.034_322.5)]",
    "bg-[oklch(0.435_0.029_321.78)]",
    "bg-[oklch(0.364_0.029_323.89)]",
    "bg-[oklch(0.263_0.024_320.12)]",
  ],
  olive: [
    "bg-[oklch(0.88_0.011_106.6)]",
    "bg-[oklch(0.58_0.031_107.3)]",
    "bg-[oklch(0.466_0.025_107.3)]",
    "bg-[oklch(0.394_0.023_107.4)]",
    "bg-[oklch(0.286_0.016_107.4)]",
  ],
  mist: [
    "bg-[oklch(0.872_0.007_219.6)]",
    "bg-[oklch(0.56_0.021_213.5)]",
    "bg-[oklch(0.45_0.017_213.2)]",
    "bg-[oklch(0.378_0.015_216)]",
    "bg-[oklch(0.275_0.011_216.9)]",
  ],
  taupe: [
    "bg-[oklch(0.868_0.007_39.5)]",
    "bg-[oklch(0.547_0.021_43.1)]",
    "bg-[oklch(0.438_0.017_39.3)]",
    "bg-[oklch(0.367_0.016_35.7)]",
    "bg-[oklch(0.268_0.011_36.5)]",
  ],
}

export const accentChartSwatches: Record<
  Exclude<AccentColor, "none">,
  string[]
> = {
  amber: [
    "bg-[oklch(0.879_0.169_91.605)]",
    "bg-[oklch(0.769_0.188_70.08)]",
    "bg-[oklch(0.666_0.179_58.318)]",
    "bg-[oklch(0.555_0.163_48.998)]",
    "bg-[oklch(0.473_0.137_46.201)]",
  ],
  blue: [
    "bg-[oklch(0.809_0.105_251.813)]",
    "bg-[oklch(0.623_0.214_259.815)]",
    "bg-[oklch(0.546_0.245_262.881)]",
    "bg-[oklch(0.488_0.243_264.376)]",
    "bg-[oklch(0.424_0.199_265.638)]",
  ],
  cyan: [
    "bg-[oklch(0.865_0.127_207.078)]",
    "bg-[oklch(0.715_0.143_215.221)]",
    "bg-[oklch(0.609_0.126_221.723)]",
    "bg-[oklch(0.52_0.105_223.128)]",
    "bg-[oklch(0.45_0.085_224.283)]",
  ],
  emerald: [
    "bg-[oklch(0.845_0.143_164.978)]",
    "bg-[oklch(0.696_0.17_162.48)]",
    "bg-[oklch(0.596_0.145_163.225)]",
    "bg-[oklch(0.508_0.118_165.612)]",
    "bg-[oklch(0.432_0.095_166.913)]",
  ],
  fuchsia: [
    "bg-[oklch(0.833_0.145_321.434)]",
    "bg-[oklch(0.667_0.295_322.15)]",
    "bg-[oklch(0.591_0.293_322.896)]",
    "bg-[oklch(0.518_0.253_323.949)]",
    "bg-[oklch(0.452_0.211_324.591)]",
  ],
  green: [
    "bg-[oklch(0.871_0.15_154.449)]",
    "bg-[oklch(0.723_0.219_149.579)]",
    "bg-[oklch(0.627_0.194_149.214)]",
    "bg-[oklch(0.527_0.154_150.069)]",
    "bg-[oklch(0.448_0.119_151.328)]",
  ],
  indigo: [
    "bg-[oklch(0.785_0.115_274.713)]",
    "bg-[oklch(0.585_0.233_277.117)]",
    "bg-[oklch(0.511_0.262_276.966)]",
    "bg-[oklch(0.457_0.24_277.023)]",
    "bg-[oklch(0.398_0.195_277.366)]",
  ],
  lime: [
    "bg-[oklch(0.897_0.196_126.665)]",
    "bg-[oklch(0.768_0.233_130.85)]",
    "bg-[oklch(0.648_0.2_131.684)]",
    "bg-[oklch(0.532_0.157_131.589)]",
    "bg-[oklch(0.453_0.124_130.933)]",
  ],
  orange: [
    "bg-[oklch(0.837_0.128_66.29)]",
    "bg-[oklch(0.705_0.213_47.604)]",
    "bg-[oklch(0.646_0.222_41.116)]",
    "bg-[oklch(0.553_0.195_38.402)]",
    "bg-[oklch(0.47_0.157_37.304)]",
  ],
  pink: [
    "bg-[oklch(0.823_0.12_346.018)]",
    "bg-[oklch(0.656_0.241_354.308)]",
    "bg-[oklch(0.592_0.249_0.584)]",
    "bg-[oklch(0.525_0.223_3.958)]",
    "bg-[oklch(0.459_0.187_3.815)]",
  ],
  purple: [
    "bg-[oklch(0.827_0.119_306.383)]",
    "bg-[oklch(0.627_0.265_303.9)]",
    "bg-[oklch(0.558_0.288_302.321)]",
    "bg-[oklch(0.496_0.265_301.924)]",
    "bg-[oklch(0.438_0.218_303.724)]",
  ],
  red: [
    "bg-[oklch(0.808_0.114_19.571)]",
    "bg-[oklch(0.637_0.237_25.331)]",
    "bg-[oklch(0.577_0.245_27.325)]",
    "bg-[oklch(0.505_0.213_27.518)]",
    "bg-[oklch(0.444_0.177_26.899)]",
  ],
  rose: [
    "bg-[oklch(0.81_0.117_11.638)]",
    "bg-[oklch(0.645_0.246_16.439)]",
    "bg-[oklch(0.586_0.253_17.585)]",
    "bg-[oklch(0.514_0.222_16.935)]",
    "bg-[oklch(0.455_0.188_13.697)]",
  ],
  sky: [
    "bg-[oklch(0.828_0.111_230.318)]",
    "bg-[oklch(0.685_0.169_237.323)]",
    "bg-[oklch(0.588_0.158_241.966)]",
    "bg-[oklch(0.5_0.134_242.749)]",
    "bg-[oklch(0.443_0.11_240.79)]",
  ],
  teal: [
    "bg-[oklch(0.855_0.138_181.071)]",
    "bg-[oklch(0.704_0.14_182.503)]",
    "bg-[oklch(0.6_0.118_184.704)]",
    "bg-[oklch(0.511_0.096_186.391)]",
    "bg-[oklch(0.437_0.078_188.216)]",
  ],
  violet: [
    "bg-[oklch(0.811_0.111_293.571)]",
    "bg-[oklch(0.606_0.25_292.717)]",
    "bg-[oklch(0.541_0.281_293.009)]",
    "bg-[oklch(0.491_0.27_292.581)]",
    "bg-[oklch(0.432_0.232_292.759)]",
  ],
  yellow: [
    "bg-[oklch(0.905_0.182_98.111)]",
    "bg-[oklch(0.795_0.184_86.047)]",
    "bg-[oklch(0.681_0.162_75.834)]",
    "bg-[oklch(0.554_0.135_66.442)]",
    "bg-[oklch(0.476_0.114_61.907)]",
  ],
}

/**
 * Les palettes toutes prêtes : d'abord le preset d'origine de l'admin (Nova, tout en Neutral :
 * base, thème et graphiques), puis dix palettes d'une base et d'un accent de la même famille de
 * teinte (06/10/2026).
 */
export const palettePresets = [
  { id: "neutral-none", base: "neutral", accent: "none" },
  { id: "stone-orange", base: "stone", accent: "orange" },
  { id: "taupe-amber", base: "taupe", accent: "amber" },
  { id: "olive-green", base: "olive", accent: "green" },
  { id: "mist-teal", base: "mist", accent: "teal" },
  { id: "mist-sky", base: "mist", accent: "sky" },
  { id: "zinc-indigo", base: "zinc", accent: "indigo" },
  { id: "zinc-blue", base: "zinc", accent: "blue" },
  { id: "mauve-violet", base: "mauve", accent: "violet" },
  { id: "mauve-rose", base: "mauve", accent: "rose" },
  { id: "neutral-red", base: "neutral", accent: "red" },
] as const satisfies readonly {
  id: string
  base: BaseColor
  accent: AccentColor
}[]

export type PresetId = (typeof palettePresets)[number]["id"]

/** Les couleurs d'un logo décliné pour une palette (lib/brand-colors.ts), par fond. */
export type LogoColors = Record<
  "light" | "dark",
  { main: string; accent: string }
>

/**
 * Les couleurs d'une palette pour un logo : sur fond clair, la couleur principale prend l'encre de
 * la base (celle des boutons sans accent) et l'accent la couleur des boutons de l'accent ; sur fond
 * sombre, le texte clair de la base et l'accent plus clair du menu sombre. Sans accent : l'encre de
 * la base.
 */
export function presetLogoColors(id: PresetId): LogoColors {
  const preset = palettePresets.find((one) => one.id === id)!
  const base = basePalettes[preset.base]
  const accent = preset.accent === "none" ? base : accentPalettes[preset.accent]
  return {
    light: { main: base.light.primary, accent: accent.light.primary },
    // Sur fond sombre, l'accent plus clair du menu sombre de shadcn (sidebar-primary) : celui des
    // boutons sombres se lirait mal sur un fond presque noir.
    dark: {
      main: base.dark.foreground,
      accent: accent.dark["sidebar-primary"] ?? accent.dark.primary,
    },
  }
}

/** La palette prête à l'emploi qui correspond à ce choix, ou null (une association libre). */
export function presetOf(palette: Palette): PresetId | null {
  return (
    palettePresets.find(
      (one) => one.base === palette.base && one.accent === palette.accent
    )?.id ?? null
  )
}

/** Les couleurs choisies par un membre (sur ce navigateur). */
export type Palette = { base: BaseColor; accent: AccentColor }

export const DEFAULT_PALETTE: Palette = { base: "neutral", accent: "none" }

// La clé du choix, sur le navigateur de chacun (comme le thème clair ou sombre).
export const PALETTE_STORAGE_KEY = "declikora-couleurs"

function isPalette(value: unknown): value is Palette {
  if (typeof value !== "object" || value === null) return false
  const { base, accent } = value as Record<string, unknown>
  return (
    (baseColors as readonly unknown[]).includes(base) &&
    (accentColors as readonly unknown[]).includes(accent)
  )
}

/**
 * Le CSS qui pose ces couleurs par-dessus index.css, comme shadcn : tous les jetons de la base (rien
 * pour Neutre, la couleur de départ), puis ceux de l'accent (couleur principale, secondaire,
 * graphiques, menu) ; en clair (:root) et en sombre (.dark) ; enfin l'élément choisi du menu de
 * gauche, à la couleur des boutons de la page. Vide pour les couleurs de départ.
 */
export function paletteCss(palette: Palette): string {
  const light: Record<string, string> = {}
  const dark: Record<string, string> = {}
  if (palette.base !== DEFAULT_PALETTE.base) {
    Object.assign(light, basePalettes[palette.base].light)
    Object.assign(dark, basePalettes[palette.base].dark)
  }
  if (palette.accent !== "none") {
    Object.assign(light, accentPalettes[palette.accent].light)
    Object.assign(dark, accentPalettes[palette.accent].dark)
  }
  const block = (selector: string, vars: Record<string, string>) => {
    const lines = Object.entries(vars).map(
      ([name, value]) => `  --${name}: ${value};`
    )
    return lines.length > 0 ? `${selector} {\n${lines.join("\n")}\n}` : ""
  }
  // L'élément choisi du menu (toujours sombre) : la couleur des boutons de la page, en clair comme
  // en sombre (--page-primary d'index.css). Plus précis que .dark, que le menu porte aussi.
  const menu: Record<string, string> = {}
  if (palette.accent !== "none") {
    menu["sidebar-active"] = "var(--page-primary)"
    menu["sidebar-active-foreground"] = "var(--page-primary-foreground)"
  }
  return [
    block(":root", light),
    block(".dark", dark),
    block('.dark[data-slot="sidebar-inner"]', menu),
  ]
    .filter(Boolean)
    .join("\n")
}

/** Le choix gardé sur ce navigateur (les couleurs de départ sinon). */
export function readPalette(): Palette {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(PALETTE_STORAGE_KEY) ?? "null"
    )
    if (isPalette(stored)) return stored
  } catch {
    // Stockage indisponible ou valeur abîmée : les couleurs de départ.
  }
  return DEFAULT_PALETTE
}

/** Garde le choix sur ce navigateur. */
export function savePalette(palette: Palette) {
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palette))
  } catch {
    // Le choix vaut pour cette visite seulement.
  }
}

const STYLE_ID = "declikora-couleurs"

/** Pose les couleurs sur la page : une balise style, après index.css, qu'elle surcharge. */
export function applyPalette(palette: Palette) {
  let style = document.getElementById(STYLE_ID)
  if (!style) {
    style = document.createElement("style")
    style.id = STYLE_ID
    document.head.append(style)
  }
  style.textContent = paletteCss(palette)
}
