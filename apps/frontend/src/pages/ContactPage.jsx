import { Box, Paper, Stack, Typography } from "@mui/material";

import { useLanguage } from "../i18n/LanguageProvider";

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        position: "relative",
        overflow: "hidden",
        backgroundImage:
          "linear-gradient(180deg, rgba(248,244,237,0.34), rgba(244,236,226,0.46)), url('/home-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        minHeight: { xs: "calc(100vh - 120px)", md: "calc(100vh - 140px)" },
      }}
    >
      <Box
        sx={{
          width: { xs: "100%", md: "66.6667%" },
          ml: { xs: -0.5, md: -0.5 },
        }}
      >
        <Paper
          sx={{
            p: 4,
            borderRadius: 4,
            minHeight: "100%",
            backdropFilter: "blur(2px)",
            background:
              "linear-gradient(160deg, rgba(255,250,245,0.92) 0%, rgba(232,220,205,0.88) 100%)",
          }}
          elevation={3}
        >
          <Stack spacing={2.5}>
            <Typography variant="overline" color="secondary.main">
              {t("contactPage.eyebrow")}
            </Typography>
            <Typography variant="h4">{t("contactPage.title")}</Typography>
            <Typography variant="body1" color="text.secondary">
              {t("contactPage.body")}
            </Typography>

            <Stack spacing={0.5}>
              <Typography variant="subtitle2" color="text.secondary">
                {t("contactPage.addressLabel")}
              </Typography>
              <Typography variant="body1">{t("contactPage.addressLine1")}</Typography>
              <Typography variant="body1">{t("contactPage.addressLine2")}</Typography>
            </Stack>

            <Stack spacing={0.5}>
              <Typography variant="subtitle2" color="text.secondary">
                {t("contactPage.phoneLabel")}
              </Typography>
              <Typography variant="body1">{t("contactPage.phone")}</Typography>
            </Stack>

            <Stack spacing={0.5}>
              <Typography variant="subtitle2" color="text.secondary">
                {t("contactPage.emailLabel")}
              </Typography>
              <Typography variant="body1">{t("contactPage.email")}</Typography>
            </Stack>

            <Stack spacing={0.5}>
              <Typography variant="subtitle2" color="text.secondary">
                {t("contactPage.hoursLabel")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("contactPage.hoursWeek")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("contactPage.hoursSat")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("contactPage.hoursSun")}
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
