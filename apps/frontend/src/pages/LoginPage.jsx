import { useState } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { useLanguage } from "../i18n/LanguageProvider";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useLanguage();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(form);
      navigate(location.state?.from || "/account", { replace: true });
    } catch (err) {
      setError(err.message || t("loginPage.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper sx={{ p: 4, borderRadius: 4, maxWidth: 520, mx: "auto" }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t("loginPage.title")}
      </Typography>
      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t("loginPage.username")}
            value={form.username}
            onChange={(e) => setForm((v) => ({ ...v, username: e.target.value }))}
            required
          />
          <TextField
            label={t("loginPage.password")}
            type="password"
            value={form.password}
            onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
            required
          />
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? t("loginPage.submitting") : t("loginPage.submit")}
          </Button>
          <Button component={RouterLink} to="/register" variant="text">
            {t("loginPage.noAccount")}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
