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
        ":root": {
          backgroundColor: "#f3eee8",
        },
        html: {
          backgroundColor: "#f3eee8",
        },
        body: {
          fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
          backgroundColor: "#f3eee8",
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
          border: "1px solid rgba(106, 132, 112, 0.95)",
          padding: "10px 22px 10px 48px",
          minHeight: 44,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
          fontWeight: 600,
          fontSize: "0.88rem",
          color: "#f6fbf7",
          backgroundImage: "linear-gradient(180deg, rgba(120, 149, 130, 0.98) 0%, rgba(108, 136, 118, 0.98) 100%)",
          boxShadow: "0 3px 12px rgba(54, 79, 63, 0.16)",
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
            border: "1px solid rgba(90, 113, 98, 0.98)",
            backgroundImage: "linear-gradient(180deg, rgba(98, 125, 107, 0.98) 0%, rgba(89, 116, 98, 0.98) 100%)",
            boxShadow: "0 6px 16px rgba(54, 79, 63, 0.22)",
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(0)",
            boxShadow: "0 2px 8px rgba(54, 79, 63, 0.18)",
          },
          "&.Mui-disabled": {
            color: "rgba(246, 251, 247, 0.6)",
            borderColor: "rgba(106, 132, 112, 0.45)",
            background: "linear-gradient(180deg, rgba(155, 177, 162, 0.78) 0%, rgba(141, 164, 149, 0.78) 100%)",
          },
        },
        contained: {
          color: "#f6fbf7",
          border: "1px solid rgba(106, 132, 112, 0.95)",
          backgroundColor: "transparent",
          backgroundImage: "linear-gradient(180deg, rgba(120, 149, 130, 0.98) 0%, rgba(108, 136, 118, 0.98) 100%)",
          "&:hover": {
            border: "1px solid rgba(90, 113, 98, 0.98)",
            backgroundColor: "transparent",
            backgroundImage: "linear-gradient(180deg, rgba(98, 125, 107, 0.98) 0%, rgba(89, 116, 98, 0.98) 100%)",
          },
        },
        outlined: {
          color: "#f6fbf7",
          border: "1px solid rgba(106, 132, 112, 0.95)",
          backgroundImage: "linear-gradient(180deg, rgba(120, 149, 130, 0.98) 0%, rgba(108, 136, 118, 0.98) 100%)",
          "&:hover": {
            border: "1px solid rgba(90, 113, 98, 0.98)",
            backgroundImage: "linear-gradient(180deg, rgba(98, 125, 107, 0.98) 0%, rgba(89, 116, 98, 0.98) 100%)",
          },
        },
        text: {
          color: "#f6fbf7",
          border: "1px solid rgba(106, 132, 112, 0.95)",
          backgroundImage: "linear-gradient(180deg, rgba(120, 149, 130, 0.98) 0%, rgba(108, 136, 118, 0.98) 100%)",
          "&:hover": {
            border: "1px solid rgba(90, 113, 98, 0.98)",
            backgroundImage: "linear-gradient(180deg, rgba(98, 125, 107, 0.98) 0%, rgba(89, 116, 98, 0.98) 100%)",
          },
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
          border: "1px solid rgba(106, 132, 112, 0.95)",
          padding: "6px 14px",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
          fontWeight: 600,
          color: "#f6fbf7",
          background: "linear-gradient(180deg, rgba(120, 149, 130, 0.98) 0%, rgba(108, 136, 118, 0.98) 100%)",
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
            color: "#f6fbf7",
            borderColor: "rgba(90, 113, 98, 0.98)",
            background: "linear-gradient(180deg, rgba(98, 125, 107, 0.98) 0%, rgba(89, 116, 98, 0.98) 100%)",
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
