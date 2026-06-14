import { Alert, Box, CircularProgress } from "@mui/material";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { useLanguage } from "../i18n/LanguageProvider";

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const { isAuthenticated, isBootstrapping, user, hasAnyRole } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {t("protectedRoute.denied", { role: user?.role ? t(`roles.${user.role}`) : t("roles.unknown") })}
      </Alert>
    );
  }

  return children;
}
