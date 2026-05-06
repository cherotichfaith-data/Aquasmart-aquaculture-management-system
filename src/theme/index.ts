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
    main: "#22c55e",
    contrastText: "#f4fffe",
  },
  secondary: {
    main: "#0F4C81",
    contrastText: "#f8fbff",
  },
  error: {
    main: "#ef4444",
    contrastText: "#ffffff",
  },
  warning: {
    main: "#d18a14",
    contrastText: "#ffffff",
  },
  info: {
    main: "#0ea5e9",
    contrastText: "#f8fbff",
  },
  success: {
    main: "#22c55e",
    contrastText: "#166534",
  },
  background: {
    default: "#f6fbfc",
    paper: "#ffffff",
  },
  text: {
    primary: "#16313d",
    secondary: "#5e7a86",
  },
  divider: "#d7e7ec",
}

export const lightTheme = createTheme({
  cssVariables: true,
  palette: lightPalette,
  shape: { borderRadius },
  typography: {
    fontFamily: fontSans,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: { fontFamily: fontSans, fontWeight: 700 },
    h2: { fontFamily: fontSans, fontWeight: 700 },
    h3: { fontFamily: fontSans, fontWeight: 600 },
    h4: { fontFamily: fontSans, fontWeight: 600 },
    h5: { fontFamily: fontSans, fontWeight: 600 },
    h6: { fontFamily: fontSans, fontWeight: 600 },
    body1: { fontFamily: fontSans, fontSize: "0.9375rem" },
    body2: { fontFamily: fontSans, fontSize: "0.875rem" },
    caption: { fontFamily: fontSans, fontSize: "0.75rem" },
    button: { fontFamily: fontSans, fontWeight: 500, textTransform: "none" },
    overline: { fontFamily: fontMono, fontSize: "0.6875rem", letterSpacing: "0.08em" },
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
        contained: { fontWeight: 600 },
      },
      defaultProps: { disableElevation: true },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius,
          border: "1px solid #d7e7ec",
          backgroundColor: "#ffffff",
          boxShadow: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius, backgroundImage: "none" },
        outlined: { borderColor: "#d7e7ec" },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: "#d7e7ec",
          fontSize: "0.875rem",
          padding: "10px 16px",
        },
        head: {
          fontWeight: 600,
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#eaf4fb",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: 600, fontSize: "1rem" } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { paddingTop: "12px !important" } },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 500, minWidth: 80 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500, fontSize: "0.75rem" },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { fontSize: "0.875rem" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: { borderColor: "#d7e7ec" },
        root: { borderRadius },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: "0.75rem",
          backgroundColor: "rgba(15, 76, 129, 0.96)",
          color: "#f8fbff",
        },
      },
    },
  },
})
