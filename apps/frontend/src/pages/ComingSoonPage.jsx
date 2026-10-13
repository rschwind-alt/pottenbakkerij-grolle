import { Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageProvider";

export default function ComingSoonPage() {
  const { language } = useLanguage();
  const isGerman = language === "de";

  return (
    <Box
      sx={{
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        px: { xs: 3, sm: 6, md: 10, lg: 14 },
        py: { xs: 5, md: 8 },
        backgroundImage:
          {
            xs: "linear-gradient(90deg, rgba(246,241,233,0.91) 0%, rgba(246,241,233,0.84) 100%), url('/home-background%205.jpg')",
            md: "linear-gradient(90deg, rgba(246,241,233,0.96) 0%, rgba(246,241,233,0.9) 33%, rgba(246,241,233,0.35) 57%, rgba(27,33,27,0.06) 100%), url('/home-background%205.jpg')",
          },
        backgroundSize: "cover",
        backgroundPosition: { xs: "62% center", md: "center" },
        color: "#342b24",
      }}
    >
      <Stack
        spacing={2.5}
        sx={{
          width: "min(100%, 600px)",
          animation: "come-in 700ms ease-out both",
          "@keyframes come-in": {
            from: { opacity: 0, transform: "translateY(16px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        <Box
          component="img"
          src="/naam%20webiste%20home.jpg"
          alt="Pottenbakkerij Grolle"
          sx={{ width: { xs: 220, sm: 280 }, maxWidth: "80%", objectFit: "contain", objectPosition: "left center" }}
        />
        <Typography
          variant="overline"
          sx={{ color: "#557360", fontWeight: 700, letterSpacing: { xs: "0.1em", sm: "0.16em" } }}
        >
          {isGerman ? "WEBSITE IM UMBAU" : "WEBSITE IN VERBOUWING"}
        </Typography>
        <Typography
          component="h1"
          sx={{
            maxWidth: 560,
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: { xs: "2.8rem", sm: "3.6rem", md: "4.25rem" },
            lineHeight: 0.98,
            fontWeight: 600,
          }}
        >
          {isGerman ? "Unsere Website wird erneuert" : "Onze website wordt vernieuwd"}
        </Typography>
        <Typography sx={{ maxWidth: 430, fontSize: "1.1rem", lineHeight: 1.7, color: "#5d5147" }}>
          {isGerman
            ? "Wir arbeiten an einer neuen Website. Bis dahin kannst du dir hier schon die Vorschau ansehen."
            : "We werken aan een vernieuwde website. Tot die tijd kun je alvast een kijkje nemen in de preview."}
        </Typography>
        <Box>
          <Button
            component={RouterLink}
            to="/preview"
            variant="contained"
            sx={{ mt: 1, px: 3.5, minHeight: 50 }}
          >
            {isGerman ? "Website-Vorschau ansehen" : "Bekijk de website-preview"}
          </Button>
        </Box>
        <Typography variant="body2" sx={{ pt: 2, color: "#65594f" }}>
          Pottenbakkerij Grolle · Groenlo
        </Typography>
      </Stack>
    </Box>
  );
}