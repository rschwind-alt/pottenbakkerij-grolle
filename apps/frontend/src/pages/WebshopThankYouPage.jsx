import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageProvider";
import { bookingButtonSx } from "../lib/buttonStyles";

export default function WebshopThankYouPage() {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order");

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 5,
          maxWidth: 860,
          background: "linear-gradient(180deg, rgba(255,252,248,0.98) 0%, rgba(246,237,227,0.98) 100%)",
          border: "1px solid rgba(140, 124, 104, 0.22)",
        }}
        elevation={3}
      >
        <Stack spacing={2.25} alignItems="flex-start">
          <Typography variant="overline" color="secondary.main">
            {language === "de" ? "Bestellung" : "Bestelling"}
          </Typography>
          <Typography variant="h3" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}>
            {language === "de" ? "Vielen Dank für deine Bestellung" : "Bedankt voor uw bestelling"}
          </Typography>
          <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
            {language === "de"
              ? "Du erhältst eine Bestätigungs-E-Mail und deine Bestellung liegt für dich im Laden bereit."
              : "U krijgt een bevestigingsmail en de bestelling ligt voor u klaar in de winkel."}
          </Typography>
          {orderId && (
            <Typography color="text.secondary">
              {language === "de" ? "Bestellnummer" : "Bestelnummer"}: <strong>#{orderId}</strong>
            </Typography>
          )}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button component={RouterLink} to="/landing/webshop" variant="contained" sx={bookingButtonSx}>
              {language === "de" ? "Zurück zum Webshop" : "Terug naar webshop"}
            </Button>
            <Button component={RouterLink} to="/" variant="outlined">
              {language === "de" ? "Zur Startseite" : "Naar home"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}