import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { LanguageProvider } from "./i18n/LanguageProvider";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#8a4f22",
    },
    secondary: {
      main: "#006d77",
    },
    background: {
      default: "#f3eee8",
      paper: "#fff8f0",
    },
  },
  typography: {
    fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
    fontSize: 16,
    h1: {
      fontWeight: 700,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          position: "relative",
          overflow: "hidden",
          isolation: "isolate",
          borderRadius: 18,
          border: "1px solid rgba(170, 165, 156, 0.95)",
          padding: "10px 22px 10px 48px",
          minHeight: 44,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
          fontWeight: 600,
          fontSize: "0.88rem",
          color: "#232a31",
          backgroundImage: "linear-gradient(180deg, rgba(249, 247, 243, 0.96) 0%, rgba(240, 236, 230, 0.97) 100%)",
          boxShadow: "0 3px 12px rgba(60, 56, 50, 0.08)",
          transition: "transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease",
          "&::before": {
            content: '""',
            position: "absolute",
            top: "50%",
            left: 16,
            width: 16,
            height: 16,
            transform: "translateY(-50%)",
            pointerEvents: "none",
            backgroundImage: "url('/button-flower.svg')",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "16px 16px",
            opacity: 0.92,
            zIndex: 1,
          },
          "&:hover": {
            border: "1px solid rgba(150, 145, 137, 0.98)",
            backgroundImage: "linear-gradient(180deg, rgba(252, 250, 246, 0.98) 0%, rgba(238, 232, 224, 0.98) 100%)",
            boxShadow: "0 6px 16px rgba(60, 56, 50, 0.13)",
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(0)",
            boxShadow: "0 2px 8px rgba(60, 56, 50, 0.11)",
          },
          "&.Mui-disabled": {
            color: "rgba(35, 42, 49, 0.38)",
            borderColor: "rgba(170, 165, 156, 0.45)",
            background: "rgba(244, 240, 233, 0.75)",
          },
        },
        contained: {
          color: "#232a31",
          border: "1px solid rgba(170, 165, 156, 0.95)",
          backgroundColor: "transparent",
          backgroundImage: "linear-gradient(180deg, rgba(249, 247, 243, 0.96) 0%, rgba(240, 236, 230, 0.97) 100%)",
          "&:hover": {
            border: "1px solid rgba(150, 145, 137, 0.98)",
            backgroundColor: "transparent",
            backgroundImage: "linear-gradient(180deg, rgba(252, 250, 246, 0.98) 0%, rgba(238, 232, 224, 0.98) 100%)",
          },
        },
        outlined: {
          color: "#232a31",
          backgroundImage: "linear-gradient(180deg, rgba(249, 247, 243, 0.96) 0%, rgba(240, 236, 230, 0.97) 100%)",
        },
        text: {
          color: "#232a31",
          border: "1px solid rgba(170, 165, 156, 0.95)",
          backgroundImage: "linear-gradient(180deg, rgba(248, 245, 240, 0.9) 0%, rgba(248, 245, 240, 0.9) 100%)",
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          position: "relative",
          overflow: "hidden",
          isolation: "isolate",
          borderRadius: 14,
          border: "1px solid rgba(170, 165, 156, 0.9)",
          padding: "6px 14px",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
          fontWeight: 600,
          color: "#232a31",
          background: "rgba(248, 245, 240, 0.9)",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            opacity: 0.08,
            backgroundImage: "url('/button-flower.svg')",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "18px 18px",
          },
          "& > *": {
            position: "relative",
            zIndex: 1,
          },
          "&.Mui-selected": {
            color: "#232a31",
            borderColor: "rgba(120, 114, 105, 0.98)",
            background: "linear-gradient(180deg, rgba(248, 245, 239, 0.98) 0%, rgba(233, 226, 215, 0.98) 100%)",
          },
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
