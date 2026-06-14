import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageProvider";

const CATEGORY_IMAGES = {
  keramiek: "/menuicon1.png",
  claycafe: "/menuicon2.png",
  workshop: "/menuicon3.png",
  sieraden: "/menuicon4.png",
  webshop: "/menuicon5.png",
};

const CONTENT = {
  keramiek: {
    nl: {
      title: "Atelier",
      body: "Ontdek handgemaakte keramiek met rustige vormen en natuurlijke tinten. Bekijk onze selectie en kies een moment dat bij je past.",
    },
    de: {
      title: "Atelier",
      body: "Entdecke handgemachte Keramik mit ruhigen Formen und natürlichen Farbtönen. Wähle danach einen passenden Termin.",
    },
  },
  claycafe: {
    nl: {
      title: "Clay Café",
      body: "Neem plaats in ons Clay Café en werk in alle rust aan je eigen creatie. Ideaal voor een ontspannen creatieve pauze.",
    },
    de: {
      title: "Clay Café",
      body: "Nimm Platz in unserem Clay Café und arbeite entspannt an deiner eigenen Kreation. Perfekt für eine kreative Auszeit.",
    },
  },
  workshop: {
    nl: {
      title: "Workshop",
      body: "Ga actief aan de slag met klei tijdens onze workshops. We begeleiden je stap voor stap van idee tot resultaat.",
    },
    de: {
      title: "Workshop",
      body: "Arbeite aktiv mit Ton in unseren Workshops. Wir begleiten dich Schritt für Schritt von der Idee bis zum Ergebnis.",
    },
  },
  sieraden: {
    nl: {
      title: "Sieraden",
      body: "Bekijk verfijnde sieraden met een ambachtelijke uitstraling. Kies je favoriet en plan direct je bezoek of reservering.",
    },
    de: {
      title: "Schmuck",
      body: "Entdecke feinen Schmuck mit handwerklichem Charakter. Wähle deinen Favoriten und plane anschließend deinen Besuch.",
    },
  },
  webshop: {
    nl: {
      title: "Webshop",
      body: "Bekijk onze online collectie met handgemaakt keramiek, sieraden en cadeausets. Bestel eenvoudig en haal op in het atelier of laat bezorgen.",
    },
    de: {
      title: "Webshop",
      body: "Entdecke unsere Online-Kollektion mit handgemachter Keramik, Schmuck und Geschenksets. Bestelle einfach und hole im Atelier ab oder lass liefern.",
    },
  },
};

export default function CategoryLandingPage() {
  const { categoryKey } = useParams();
  const { language, t } = useLanguage();

  const safeKey = CONTENT[categoryKey] ? categoryKey : "workshop";
  const copy = CONTENT[safeKey][language] || CONTENT[safeKey].nl;
  const iconSrc = CATEGORY_IMAGES[safeKey];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
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
            border: "1px solid rgba(140, 124, 104, 0.22)",
            background: "linear-gradient(180deg, rgba(251,248,243,0.95) 0%, rgba(240,232,222,0.95) 100%)",
          }}
          elevation={3}
        >
          <Stack spacing={2.5}>
            <Typography variant="overline" color="secondary.main" sx={{ letterSpacing: "0.2em" }}>
              {t("appName")}
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {iconSrc && (
                <Box
                  component="img"
                  src={iconSrc}
                  alt={copy.title}
                  sx={{
                    width: { xs: 78, md: 94 },
                    height: { xs: 78, md: 94 },
                    objectFit: "contain",
                    mixBlendMode: "multiply",
                    flexShrink: 0,
                  }}
                />
              )}
              <Typography variant="h3" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}>
                {copy.title}
              </Typography>
            </Stack>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 760 }}>
              {copy.body}
            </Typography>
            <Stack direction="row" spacing={1.25} flexWrap="wrap">
              <Button component={RouterLink} to="/bookings" variant="contained">
                {t("common.bookings")}
              </Button>
              <Button component={RouterLink} to="/" variant="outlined">
                {t("common.home")}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
