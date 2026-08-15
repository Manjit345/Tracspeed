// Tracspeed design tokens — centralized so every page/component pulls
// from the same palette and typography scale rather than hardcoding values

export const colors = {
    bg: "#151312",
    surface: "#1f1c1a",
    surfaceRaised: "#282422",
    border: "#3a3532",
    borderStrong: "#4a4441",

    textPrimary: "#f5f0ec",
    textSecondary: "#a89e96",
    textMuted: "#6b625c",

    accent: "#e2662d",
    accentHover: "#f07840",
    accentMuted: "#3d2418",

    success: "#5fa870",
    successBg: "#1c2e1f",
    warning: "#d69b3f",
    warningBg: "#332615",
    danger: "#d95c5c",
    dangerBg: "#331c1c",
}

export const fonts = {
    heading: "'Fraunces', Georgia, serif",
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
}

export const radius = {
    card: "14px",
    sm: "8px",
    pill: "999px",
}

export const avatarPalette = [
    "#e2662d", // coral (default)
    "#5b8dee", // blue
    "#5fa870", // green
    "#d69b3f", // amber
    "#a86fd6", // violet
    "#d95c5c", // red
]