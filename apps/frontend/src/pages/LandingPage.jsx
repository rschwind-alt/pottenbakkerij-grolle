import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageProvider";

const CATEGORY_IMAGES = {
  keramiek: "/menuicon1.png",
  claycafe:  "/menuicon2.png",
  workshop:  "/menuicon3.png",
  sieraden:  "/menuicon4.png",
};

export default function LandingPage() {
  const { category } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const data = t(`landing.${category}`);
  const iconSrc = CATEGORY_IMAGES[category] || null;

  if (!data || typeof data !== "object") {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: "80vh",
        position: "relative",
        overflow: "hidden",
        backgroundImage:
          `linear-gradient(180deg, rgba(248,244,237,0.42), rgba(244,236,226,0.58)), url('/${category}-bg.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "flex-start",
        p: { xs: 2, md: 3 },
      }}
    >
      <Paper
        elevation={4}
        sx={{
          maxWidth: 600,
          p: { xs: 4, md: 6 },
          borderRadius: 5,
          backdropFilter: "blur(4px)",
          background:
            "linear-gradient(160deg, rgba(255,250,245,0.94) 0%, rgba(236,225,210,0.92) 100%)",
          border: "1px solid rgba(170,160,145,0.28)",
        }}
      >
        <Stack spacing={3}>
          {iconSrc && (
            <Box
              component="img"
              src={iconSrc}
              alt={category}
              sx={{
                width: { xs: 64, md: 80 },
                height: { xs: 64, md: 80 },
                objectFit: "contain",
                mixBlendMode: "multiply",
              }}
            />
          )}

          <Typography
            variant="overline"
            sx={{
              letterSpacing: "0.28em",
              fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
              fontSize: "0.78rem",
              color: "secondary.main",
            }}
          >
            {data.eyebrow}
          </Typography>

          <Typography
            variant="h3"
            sx={{
              fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
              fontWeight: 600,
              lineHeight: 1.15,
            }}
          >
            {data.title}
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
            {data.body}
          </Typography>

          {data.highlights && (
            <Stack spacing={1}>
              {data.highlights.map((line, index) => (
                <Stack key={index} direction="row" spacing={1} alignItems="center">
                  <Box
                    component="img"
                    src="/button-flower.svg"
                    sx={{ width: 14, height: 14, mixBlendMode: "multiply", opacity: 0.7 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {line}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} pt={1}>
            <Button
              component={RouterLink}
              to="/bookings"
              variant="contained"
              size="large"
            >
              {data.cta}
            </Button>
            <Button
              component={RouterLink}
              to="/"
              variant="outlined"
            >
              {t("common.back")}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
