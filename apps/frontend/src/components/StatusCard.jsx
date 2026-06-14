import { useEffect, useState } from "react";
import { Alert, CircularProgress, Paper, Stack, Typography } from "@mui/material";

import { useLanguage } from "../i18n/LanguageProvider";
import { apiFetch } from "../lib/api";

export default function StatusCard() {
  const { t } = useLanguage();
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    async function fetchHealth() {
      try {
        const response = await apiFetch("/api/healthz/");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        setState({ loading: false, error: null, data: payload });
      } catch (error) {
        setState({ loading: false, error: error.message, data: null });
      }
    }

    fetchHealth();
  }, []);

  return (
    <Paper sx={{ p: 4, borderRadius: 4, height: "100%" }} elevation={3}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t("statusCard.title")}
      </Typography>
      {state.loading && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={20} />
          <Typography>{t("statusCard.checking")}</Typography>
        </Stack>
      )}
      {!state.loading && state.error && (
        <Alert severity="error">{t("statusCard.backendUnavailable", { error: state.error })}</Alert>
      )}
      {!state.loading && state.data && (
        <Alert severity="success">
          {t("statusCard.statusLine", { status: state.data.status, service: state.data.service })}
        </Alert>
      )}
    </Paper>
  );
}
