import { useState } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { useLanguage } from "../i18n/LanguageProvider";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useLanguage();

  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await register(form);
      setSuccess(t("registerPage.success"));
      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      setError(err.message || t("registerPage.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper sx={{ p: 4, borderRadius: 4, maxWidth: 520, mx: "auto" }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t("registerPage.title")}
      </Typography>
      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
          <TextField
            label={t("registerPage.username")}
            value={form.username}
            onChange={(e) => setForm((v) => ({ ...v, username: e.target.value }))}
            required
          />
          <TextField
            label={t("registerPage.email")}
            type="email"
            value={form.email}
            onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
            required
          />
          <TextField
            label={t("registerPage.password")}
            type="password"
            value={form.password}
            onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
            required
            helperText={t("registerPage.passwordHint")}
          />
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? t("registerPage.submitting") : t("registerPage.submit")}
          </Button>
          <Button component={RouterLink} to="/login" variant="text">
            {t("registerPage.backToLogin")}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
