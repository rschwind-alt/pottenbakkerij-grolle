import { Suspense, lazy, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  SvgIcon,
  Toolbar,
  Typography,
} from "@mui/material";
import { Link as RouterLink, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { useAuth } from "./auth/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import { useLanguage } from "./i18n/LanguageProvider";

const BookingsPage = lazy(() => import("./pages/BookingsPage"));
const CategoryLandingPage = lazy(() => import("./pages/CategoryLandingPage"));
const ClayCafePage = lazy(() => import("./pages/ClayCafePage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const GrolleStoryPage = lazy(() => import("./pages/GrolleStoryPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const PlanningPage = lazy(() => import("./pages/PlanningPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const WorkshopPage = lazy(() => import("./pages/WorkshopPage"));

export default function App() {
  const { isAuthenticated, user, logout, hasAnyRole } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const isHomeRoute = location.pathname === "/";
  const isLandingRoute = location.pathname.startsWith("/landing/");
  const isContactRoute = location.pathname === "/contact";
  const isBookingsRoute = location.pathname === "/bookings";
  const isGrolleRoute = location.pathname === "/over-grolle";
  const isWideLayoutRoute = isHomeRoute || isLandingRoute || isContactRoute || isBookingsRoute || isGrolleRoute;
  const isHamburgerOpen = Boolean(menuAnchorEl);

  const handleOpenHamburger = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleCloseHamburger = () => {
    setMenuAnchorEl(null);
  };

  const roleLabel = user?.role ? t(`roles.${user.role}`) : t("roles.unknown");
  const headerNavItems = [
    { label: t("categoryNav.claycafe"), to: "/landing/claycafe" },
    { label: t("categoryNav.keramiek"), to: "/landing/keramiek" },
    { label: t("categoryNav.workshop"), to: "/landing/workshop" },
    { label: t("categoryNav.sieraden"), to: "/landing/sieraden" },
    { label: t("categoryNav.webshop"), to: "/landing/webshop" },
    { label: "Over Grolle", to: "/over-grolle" },
    { label: t("common.contact"), to: "/contact" },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 20%, #e6d4be 0%, transparent 35%), linear-gradient(180deg, #f3eee8 0%, #e7dfd6 100%)",
        py: 4,
      }}
    >
      <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 4 }}>
        <Toolbar
          sx={{
            justifyContent: "space-between",
            gap: { xs: 1.5, md: 2 },
            flexWrap: { xs: "wrap", md: "nowrap" },
          }}
        >
          <Box
            component={RouterLink}
            to="/"
            aria-label={t("common.home")}
            title={t("common.home")}
            sx={{
              display: "block",
              lineHeight: 0,
              textDecoration: "none",
            }}
          >
            <Box
              component="img"
            src="/naam%20webiste%20home.jpg"
            alt={t("appName")}
            sx={{
              width: { xs: "min(46.08vw, 264px)", md: "min(22.1184vw, 307px)" },
              maxHeight: { xs: 66, md: 74 },
              objectFit: "contain",
              display: "block",
              ml: { xs: -0.5, md: -0.5 },
              opacity: 0.95,
              mixBlendMode: "multiply",
              flexShrink: 0,
            }}
          />
          </Box>
          <Stack
            direction="row"
            spacing={{ md: 1.4, lg: 2.1 }}
            alignItems="center"
            sx={{
              display: { xs: "none", lg: "flex" },
              ml: 1.5,
              mr: "auto",
            }}
          >
            {headerNavItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Box
                  key={item.to}
                  component={RouterLink}
                  to={item.to}
                  sx={{
                    textDecoration: "none",
                    color: isActive ? "#2f5b46" : "#3d342b",
                    px: 0.3,
                    py: 0.4,
                    borderBottom: isActive ? "1px solid rgba(47, 91, 70, 0.52)" : "1px solid transparent",
                    transition: "color 150ms ease, border-color 150ms ease, opacity 150ms ease",
                    "&:hover": {
                      color: "#2f5b46",
                      borderBottomColor: "rgba(47, 91, 70, 0.28)",
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
                      fontSize: { lg: "1.02rem", xl: "1.08rem" },
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            sx={{ ml: { md: "auto" }, justifyContent: { md: "flex-end" } }}
          >
            <ToggleButtonGroup
              size="small"
              exclusive
              value={language}
              onChange={(_, value) => value && setLanguage(value)}
              color="secondary"
            >
              <ToggleButton value="nl">NL</ToggleButton>
              <ToggleButton value="de">DE</ToggleButton>
            </ToggleButtonGroup>
            {isAuthenticated && (
              <>
                <Button component={RouterLink} to="/account" variant="text">
                  {t("common.profile")}
                </Button>
                <Button component={RouterLink} to="/bookings" variant="text">
                  {t("common.bookings")}
                </Button>
              </>
            )}
            {isAuthenticated && hasAnyRole(["admin", "medewerker"]) && (
              <Button component={RouterLink} to="/planning" variant="text">
                {t("common.planning")}
              </Button>
            )}
            {isAuthenticated && (
              <>
                <Chip label={`${t("common.role")}: ${roleLabel}`} color="secondary" size="small" />
                <Button onClick={logout} variant="outlined">
                  {t("common.logout")}
                </Button>
              </>
            )}
            <IconButton
              color="secondary"
              aria-label="Menu"
              aria-controls={isHamburgerOpen ? "header-hamburger-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={isHamburgerOpen ? "true" : undefined}
              onClick={handleOpenHamburger}
            >
              <SvgIcon viewBox="0 0 24 24">
                <path d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z" />
              </SvgIcon>
            </IconButton>
            <Menu
              id="header-hamburger-menu"
              anchorEl={menuAnchorEl}
              open={isHamburgerOpen}
              onClose={handleCloseHamburger}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem component={RouterLink} to="/" onClick={handleCloseHamburger}>
                {t("common.home")}
              </MenuItem>
              <MenuItem component={RouterLink} to="/landing/webshop" onClick={handleCloseHamburger}>
                {t("common.webshop")}
              </MenuItem>
              <MenuItem component={RouterLink} to="/contact" onClick={handleCloseHamburger}>
                {t("common.contact")}
              </MenuItem>
              <MenuItem component={RouterLink} to="/over-grolle" onClick={handleCloseHamburger}>
                Over Grolle
              </MenuItem>
              {isAuthenticated && (
                <MenuItem component={RouterLink} to="/account" onClick={handleCloseHamburger}>
                  {t("common.profile")}
                </MenuItem>
              )}
              {isAuthenticated && (
                <MenuItem component={RouterLink} to="/bookings" onClick={handleCloseHamburger}>
                  {t("common.bookings")}
                </MenuItem>
              )}
              {isAuthenticated && hasAnyRole(["admin", "medewerker"]) && (
                <MenuItem component={RouterLink} to="/planning" onClick={handleCloseHamburger}>
                  {t("common.planning")}
                </MenuItem>
              )}
              {!isAuthenticated && (
                <MenuItem component={RouterLink} to="/login" onClick={handleCloseHamburger}>
                  {t("common.login")}
                </MenuItem>
              )}
              {!isAuthenticated && (
                <MenuItem component={RouterLink} to="/register" onClick={handleCloseHamburger}>
                  {t("common.register")}
                </MenuItem>
              )}
              {isAuthenticated && <Divider />}
              {isAuthenticated && (
                <MenuItem
                  onClick={() => {
                    logout();
                    handleCloseHamburger();
                  }}
                >
                  {t("common.logout")}
                </MenuItem>
              )}
            </Menu>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container
        maxWidth={isWideLayoutRoute ? false : "lg"}
        disableGutters={isWideLayoutRoute}
        sx={{ px: isWideLayoutRoute ? 0 : undefined }}
      >
        <Suspense fallback={<Box sx={{ px: 3, py: 6 }}><Typography>{t("common.loading")}</Typography></Box>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/landing/claycafe" element={<ClayCafePage />} />
            <Route path="/over-grolle" element={<GrolleStoryPage />} />
            <Route path="/landing/workshop" element={<WorkshopPage />} />
            <Route path="/landing/:categoryKey" element={<CategoryLandingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planning"
              element={
                <ProtectedRoute allowedRoles={["admin", "medewerker"]}>
                  <PlanningPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={<BookingsPage />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Container>
    </Box>
  );
}
