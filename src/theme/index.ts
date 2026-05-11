/**
 * AquaSmart MUI Theme
 * Design tokens mapped from globals.css CSS variables.
 */
import { createTheme, type PaletteOptions } from "@mui/material/styles"

const fontSans = '"DM Sans", sans-serif'
const fontMono = '"IBM Plex Mono", monospace'
const borderRadius = 6

const lightPalette: PaletteOptions = {
  mode: "light",
  primary: {
    main: "var(--color-primary)",
    contrastText: "var(--color-on-primary)",
  },
  secondary: {
    main: "var(--color-secondary)",
    contrastText: "var(--color-on-secondary)",
  },
  error: {
    main: "var(--color-destructive)",
    contrastText: "var(--color-on-destructive)",
  },
  warning: {
    main: "var(--color-warning)",
    contrastText: "var(--color-on-warning)",
  },
  info: {
    main: "var(--color-info)",
    contrastText: "var(--color-on-info)",
  },
  success: {
    main: "var(--color-success)",
    contrastText: "var(--color-on-success)",
  },
  background: {
    default: "var(--color-background)",
    paper: "var(--color-surface)",
  },
  text: {
    primary: "var(--color-foreground)",
    secondary: "var(--color-muted-foreground)",
  },
  divider: "var(--color-border)",
}

export const lightTheme = createTheme({
  cssVariables: { nativeColor: true },
  palette: lightPalette,
  shape: { borderRadius },
  typography: {
    fontFamily: fontSans,
    fontWeightRegular: "var(--font-weight-regular)",
    fontWeightMedium: "var(--font-weight-medium)",
    fontWeightBold: "var(--font-weight-bold)",
    h1: { fontFamily: fontSans, fontWeight: "var(--font-weight-bold)" },
    h2: { fontFamily: fontSans, fontWeight: "var(--font-weight-bold)" },
    h3: { fontFamily: fontSans, fontWeight: "var(--font-weight-semibold)" },
    h4: { fontFamily: fontSans, fontWeight: "var(--font-weight-semibold)" },
    h5: { fontFamily: fontSans, fontWeight: "var(--font-weight-semibold)" },
    h6: { fontFamily: fontSans, fontWeight: "var(--font-weight-semibold)" },
    body1: { fontFamily: fontSans, fontSize: "var(--font-size-body1)" },
    body2: { fontFamily: fontSans, fontSize: "var(--font-size-body2)" },
    caption: { fontFamily: fontSans, fontSize: "var(--font-size-caption)" },
    button: { fontFamily: fontSans, fontWeight: "var(--font-weight-medium)", textTransform: "none" },
    overline: { fontFamily: fontMono, fontSize: "var(--font-size-caption)", letterSpacing: "0.08em" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        body { font-family: ${fontSans}; }
        code, pre, kbd, samp { font-family: ${fontMono}; }
      `,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius,
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
        contained: { fontWeight: "var(--font-weight-semibold)" },
      },
      defaultProps: { disableElevation: true },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius,
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          boxShadow: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius, backgroundImage: "none" },
        outlined: { borderColor: "var(--color-border)" },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: "var(--color-border)",
          fontSize: "var(--font-size-body2)",
          padding: "10px 16px",
        },
        head: {
          fontWeight: "var(--font-weight-semibold)",
          fontSize: "var(--font-size-caption)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "var(--color-accent)",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-title)" } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { paddingTop: "12px !important" } },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: "var(--font-weight-medium)", minWidth: 80 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: "var(--font-weight-medium)", fontSize: "var(--font-size-caption)" },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { fontSize: "var(--font-size-body2)" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: { borderColor: "var(--color-border)" },
        root: { borderRadius },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: "var(--font-size-caption)",
          backgroundColor: "var(--chart-tooltip-bg)",
          color: "var(--chart-tooltip-foreground)",
        },
      },
    },
  },
})
