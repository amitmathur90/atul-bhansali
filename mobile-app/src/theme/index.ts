export const colors = {
  navy: "#F5821F",
  navyDark: "#C25E00",
  saffron: "#1D4ED8",
  saffronDark: "#1739A6",
  background: "#F8F9FA",
  surface: "#FFFFFF",
  border: "#E5E7EB",
  text: "#1F2933",
  textMuted: "#6B7280",
  textFaint: "#9CA3AF",
  danger: "#DC2626",
  success: "#16A34A",
  warning: "#D97706",
  info: "#2563EB",
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;
