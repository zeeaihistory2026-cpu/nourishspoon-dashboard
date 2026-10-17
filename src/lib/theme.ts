"use client";

import { createTheme } from "@mui/material/styles";

export const pine = {
  950: "#122619",
  900: "#1b3a28",
  800: "#24492f",
  700: "#2f5c3d",
  600: "#3d734d",
};

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: pine[900], dark: pine[950], light: pine[700], contrastText: "#fffdf7" },
    secondary: { main: "#b08a2e", dark: "#8f6b1f", light: "#d9b95c", contrastText: "#fffdf7" },
    success: { main: "#2e7d4f" },
    warning: { main: "#b8860b" },
    error: { main: "#c0392b" },
    info: { main: "#2f6f8f" },
    background: { default: "#f8f4e8", paper: "#fffdf7" },
    text: { primary: "#2c2a21", secondary: "#8d8670" },
    divider: "#e7ddc2",
  },
  typography: {
    fontFamily: 'var(--font-sans)',
    h1: { fontFamily: 'var(--font-display)', fontWeight: 700 },
    h2: { fontFamily: 'var(--font-display)', fontWeight: 700 },
    h3: { fontFamily: 'var(--font-display)', fontWeight: 700 },
    h4: { fontFamily: 'var(--font-display)', fontWeight: 600 },
    h5: { fontFamily: 'var(--font-display)', fontWeight: 600 },
    h6: { fontFamily: 'var(--font-display)', fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: "#f8f4e8" },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "8px 18px",
          boxShadow: "none",
          "&.MuiButton-containedPrimary": {
            backgroundColor: pine[900],
            "&:hover": { backgroundColor: pine[950], boxShadow: "none" },
          },
          "&.MuiButton-outlinedPrimary": {
            borderColor: "#cfc49e",
            color: pine[900],
            "&:hover": { borderColor: pine[900], backgroundColor: "rgba(27,58,40,0.04)" },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: "#fffdf7",
          border: "1px solid #ece4cb",
          boxShadow:
            "0 1px 2px rgba(60,50,20,0.05), 0 6px 18px -8px rgba(60,50,20,0.12)",
        },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 700, borderRadius: 999 } } },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 12,
            backgroundColor: "#fffdf7",
            "& fieldset": { borderColor: "#ddd2b2" },
            "&:hover fieldset": { borderColor: pine[700] },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 800,
          fontSize: 12.5,
          color: "#8d8670",
          textTransform: "none",
          borderBottom: "1px solid #ece4cb",
          backgroundColor: "#fffdf7",
        },
        body: { fontSize: 13.5, borderBottom: "1px solid #f1ebD6" },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 18, backgroundColor: "#fffdf7" } },
    },
    MuiDrawer: {
      styleOverrides: { paper: { backgroundColor: "#fffdf7", borderRadius: "18px 0 0 18px" } },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          "&.Mui-checked": { color: pine[900] },
          "&.Mui-checked + .MuiSwitch-track": { backgroundColor: pine[900] },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: pine[950], fontSize: 12, borderRadius: 8 },
      },
    },
  },
});
