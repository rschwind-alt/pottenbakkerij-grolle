import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageProvider";

export default function WorkshopPage() {
  const { t } = useLanguage();

  return (
    <Box
      sx={{
        position: "relative",
        p: { xs: 2, md: 3 },
        overflow: "hidden",
        backgroundImage:
          "linear-gradient(180deg, rgba(248,244,237,0.34), rgba(244,236,226,0.46)), url('/achtergrond%20workshop.png')",
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
          elevation={4}
          sx={{
            overflow: "hidden",
            borderRadius: 5,
            border: "1px solid rgba(140, 124, 104, 0.22)",
            backgroundColor: "rgba(249, 244, 237, 0.98)",
            boxShadow: "0 18px 40px rgba(92, 69, 48, 0.14)",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "0.95fr 1.05fr" },
              minHeight: { xs: 0, md: 640 },
            }}
          >
            <Box
              sx={{
                p: { xs: 3, sm: 4, md: 6 },
                display: "flex",
                alignItems: "center",
                background: "linear-gradient(180deg, rgba(255,250,245,0.98) 0%, rgba(241,232,221,0.98) 100%)",
              }}
            >
              <Stack spacing={3} sx={{ width: "100%" }}>
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: "0.3em",
                    fontSize: "0.85rem",
                    color: "#2d2620",
                    fontWeight: 600,
                  }}
                >
                  {t("workshopPage.eyebrow")}
                </Typography>

                <Box>
                  <Typography
                    variant="h2"
                    sx={{
                      fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
                      fontWeight: 600,
                      lineHeight: 1.05,
                      fontSize: { xs: "2.75rem", md: "4rem" },
                    }}
                  >
                    {t("workshopPage.title")}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      mt: 1.4,
                      fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
                      fontWeight: 500,
                      color: "#34291f",
                      fontSize: { xs: "1.2rem", md: "1.55rem" },
                    }}
                  >
                    {t("workshopPage.meta")}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ flex: 1, height: 1, backgroundColor: "rgba(128, 104, 80, 0.28)" }} />
                  <Box
                    component="img"
                    src="/button-flower.svg"
                    alt=""
                    aria-hidden="true"
                    sx={{ width: 24, height: 24, opacity: 0.75, flexShrink: 0 }}
                  />
                  <Box sx={{ flex: 1, height: 1, backgroundColor: "rgba(128, 104, 80, 0.28)" }} />
                </Box>

                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, fontSize: "1.15rem" }}>
                  {t("workshopPage.body")}
                </Typography>

                <Stack spacing={1.2}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      backgroundColor: "rgba(255,255,255,0.72)",
                    }}
                  >
                    <Typography variant="h6" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600 }}>
                      {t("workshopPage.price")}
                    </Typography>
                  </Paper>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      backgroundColor: "rgba(255,255,255,0.72)",
                    }}
                  >
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600 }}
                    >
                      {t("workshopPage.groupSize")}
                    </Typography>
                  </Paper>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} pt={1}>
                  <Button component={RouterLink} to="/bookings" variant="contained" size="large">
                    {t("workshopPage.ctaPrimary")}
                  </Button>
                  <Button component={RouterLink} to="/contact" variant="outlined" size="large">
                    {t("workshopPage.ctaSecondary")}
                  </Button>
                </Stack>
              </Stack>
            </Box>

            <Box
              sx={{
                position: "relative",
                minHeight: { xs: 340, md: 640 },
                background:
                  "linear-gradient(180deg, rgba(197, 170, 138, 0.42) 0%, rgba(232, 214, 194, 0.72) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: { xs: 4, md: 5 },
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(circle at 28% 22%, rgba(255, 247, 237, 0.38) 0%, transparent 34%), radial-gradient(circle at 76% 74%, rgba(127, 94, 65, 0.12) 0%, transparent 28%)",
                }}
              />
              <Stack spacing={2.25} sx={{ position: "relative", width: "100%", alignItems: "center" }}>
                <Box
                  component="img"
                  src="/draaien_pottenbakkersschijf_foto_los.jpg"
                  alt={t("workshopPage.title")}
                  sx={{
                    width: { xs: "min(72vw, 300px)", md: "min(100%, 440px)" },
                    height: "auto",
                    objectFit: "cover",
                    aspectRatio: "1 / 1",
                    borderRadius: 3,
                    boxShadow: "0 10px 24px rgba(77, 54, 35, 0.14)",
                  }}
                />
                <Box sx={{ width: { xs: "min(72vw, 300px)", md: "min(100%, 440px)" } }}>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mb: 1,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "#5d4b3a",
                      fontWeight: 600,
                    }}
                  >
                    {t("workshopPage.galleryTitle")}
                  </Typography>
                  <Box
                    component="img"
                    src="/boetseren paardje.png"
                    alt={t("workshopPage.galleryTitle")}
                    sx={{
                      width: "100%",
                      height: "auto",
                      objectFit: "contain",
                      backgroundColor: "rgba(255,255,255,0.86)",
                      borderRadius: 3,
                      boxShadow: "0 10px 24px rgba(77, 54, 35, 0.14)",
                    }}
                  />
                </Box>
              </Stack>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
