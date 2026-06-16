import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageProvider";
import { apiFetch } from "../lib/api";
import { bookingButtonSx } from "../lib/buttonStyles";

export default function PaymentReturnPage() {
  const { t, locale } = useLanguage();
  const [searchParams] = useSearchParams();
  const paymentRef = searchParams.get("ref");
  const [loading, setLoading] = useState(Boolean(paymentRef));
  const [error, setError] = useState("");
  const [statusData, setStatusData] = useState(null);

  useEffect(() => {
    if (!paymentRef) {
      setLoading(false);
      setError(t("paymentPage.missingReference"));
      return undefined;
    }

    let active = true;
    let intervalId = null;

    const loadStatus = async () => {
      try {
        const response = await apiFetch(`/api/payments/status/${paymentRef}/`);
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const payload = await response.json();
        if (!active) {
          return;
        }
        setStatusData(payload);
        setLoading(false);
        if (payload.payment_status === "betaald" || payload.payment_status === "geannuleerd" || payload.payment_status === "mislukt") {
          if (intervalId) {
            window.clearInterval(intervalId);
          }
        }
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError.message || t("paymentPage.loadFailed"));
        setLoading(false);
      }
    };

    loadStatus();
    intervalId = window.setInterval(loadStatus, 3000);

    return () => {
      active = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [paymentRef, t]);

  const paymentStatus = statusData?.payment_status;
  const bookingStatus = statusData?.booking_status;
  const isPaid = paymentStatus === "betaald" || bookingStatus === "betaald";
  const isFailed = paymentStatus === "geannuleerd" || paymentStatus === "mislukt" || bookingStatus === "geannuleerd";

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 860, mx: "auto" }}>
      <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.92)" }}>
        <Stack spacing={2.25} alignItems="flex-start">
          <Typography variant="overline" color="secondary.main">
            {t("paymentPage.eyebrow")}
          </Typography>

          {loading && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CircularProgress size={20} />
              <Typography>{t("paymentPage.loading")}</Typography>
            </Stack>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {!loading && !error && (
            <>
              <Typography variant="h4">{isPaid ? t("paymentPage.paidTitle") : isFailed ? t("paymentPage.failedTitle") : t("paymentPage.title")}</Typography>
              <Typography color="text.secondary">
                {isPaid
                  ? t("paymentPage.paidBody")
                  : isFailed
                    ? t("paymentPage.failedBody")
                    : t("paymentPage.pendingBody")}
              </Typography>

              {statusData && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4, width: "100%", backgroundColor: "rgba(255,255,255,0.82)" }}>
                  <Stack spacing={0.8}>
                    <Typography fontWeight={700}>{statusData.booking?.id ? t("bookingsPage.bookingNumber", { id: statusData.booking.id }) : ""}</Typography>
                    <Typography>{statusData.activity_name}</Typography>
                    <Typography color="text.secondary">
                      {statusData.slot_title} · {statusData.starts_at ? new Date(statusData.starts_at).toLocaleString(locale) : ""}
                    </Typography>
                    <Typography color="text.secondary">
                      {t("bookingsPage.participantsChosen", { count: statusData.participants })}
                    </Typography>
                    <Typography color="text.secondary">
                      {t("common.status")}: {statusData.booking_status}
                    </Typography>
                  </Stack>
                </Paper>
              )}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button component={RouterLink} to="/bookings" variant="contained" sx={bookingButtonSx}>
                  {t("paymentPage.backToBookings")}
                </Button>
                <Button component={RouterLink} to="/" variant="outlined">
                  {t("paymentPage.backToHome")}
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}