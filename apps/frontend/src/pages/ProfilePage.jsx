import { useEffect, useState } from "react";
import { Alert, Paper, Stack, Typography } from "@mui/material";

import { useAuth } from "../auth/AuthProvider";
import { useLanguage } from "../i18n/LanguageProvider";

export default function ProfilePage() {
  const { fetchProfile, user } = useAuth();
  const { t } = useLanguage();
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile().catch((err) => setError(err.message || t("profilePage.failed")));
  }, []);

  return (
    <Paper sx={{ p: 4, borderRadius: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t("profilePage.title")}
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {!error && user && (
        <Stack spacing={1}>
          <Typography>{t("profilePage.username")}: {user.username}</Typography>
          <Typography>{t("profilePage.email")}: {user.email}</Typography>
          <Typography>{t("profilePage.role")}: {t(`roles.${user.role}`)}</Typography>
        </Stack>
      )}
    </Paper>
  );
}
