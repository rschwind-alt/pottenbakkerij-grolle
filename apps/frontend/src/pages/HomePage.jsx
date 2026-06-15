import { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Grid, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageProvider";
import { apiFetch } from "../lib/api";

const HERO_IMAGES = ["/slideshowfotomain1.jpg", "/slideshowfotomain2.jpg", "/slideshowfotomain3.jpg"];

function todayValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAgendaDate(value, locale) {
  const date = new Date(value);
  return {
    day: date.toLocaleDateString(locale, { day: "2-digit" }),
    month: date.toLocaleDateString(locale, { month: "short" }).toUpperCase(),
  };
}

function formatTimeRange(startValue, endValue, locale) {
  const start = new Date(startValue).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const end = new Date(endValue).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${start} - ${end}`;
}

function formatPricePerPerson(value, locale) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "";
  }
  return `${new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(amount)} p.p.`;
}

export default function HomePage() {
  const { t, locale } = useLanguage();
  const featureCards = t("home.featureCards");
  const workshopCards = t("home.workshopCards");
  const visitLines = t("home.visitLines");
  const hoursLines = t("home.hoursLines");
  const quickLinks = t("home.quickLinks");
  const quickLinkTargets = ["/bookings", "/landing/workshop", "/landing/webshop", "/contact", "/contact"];
  const clayList = t("clayCafePage.clayList");
  const workshopList = t("clayCafePage.workshopList");
  const valeryHighlights = t("home.valeryHighlights");
  const [agendaState, setAgendaState] = useState({ loading: true, error: "", items: [] });
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadAgendaPreview() {
      try {
        const params = new URLSearchParams({
          date_from: todayValue(),
        });
        const response = await apiFetch(`/api/timeslots/available/?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (!active) {
          return;
        }
        setAgendaState({ loading: false, error: "", items: payload.slice(0, 3) });
      } catch (error) {
        if (!active) {
          return;
        }
        setAgendaState({ loading: false, error: error.message || t("agenda.unavailable", { error: "" }), items: [] });
      }
    }

    loadAgendaPreview();

    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setHeroImageIndex((current) => (current + 1) % HERO_IMAGES.length);
    }, 4500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <Box
      sx={{
        position: "relative",
        p: { xs: 2, md: 3 },
        overflow: "hidden",
        backgroundImage:
          "radial-gradient(circle at 12% 18%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0) 42%), linear-gradient(180deg, rgba(248,244,237,0.24), rgba(244,236,226,0.34)), url('/home-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Stack spacing={{ xs: 2.5, md: 4 }}>
        <Paper
          elevation={4}
          sx={{
            overflow: "hidden",
            borderRadius: 5,
            border: "1px solid rgba(191, 175, 152, 0.28)",
            background: "linear-gradient(135deg, rgba(255,251,246,0.96) 0%, rgba(248,242,234,0.88) 44%, rgba(255,255,255,0.15) 100%)",
            boxShadow: "0 24px 60px rgba(89, 62, 34, 0.10)",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "0.88fr 1.12fr" },
              minHeight: { xs: 0, lg: 520 },
            }}
          >
            <Box sx={{ p: { xs: 3, md: 5 }, display: "flex", alignItems: "center" }}>
              <Stack spacing={2.25} sx={{ maxWidth: 560 }}>
                <Typography variant="overline" color="secondary.main" sx={{ letterSpacing: "0.22em" }}>
                  {t("home.eyebrow")}
                </Typography>
                <Typography
                  variant="h1"
                  sx={{
                    fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
                    fontSize: { xs: "3rem", md: "4.3rem" },
                    lineHeight: 0.98,
                    fontWeight: 600,
                    maxWidth: 420,
                  }}
                >
                  {t("home.title")}
                </Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.8, fontSize: { xs: "1rem", md: "1.2rem" }, maxWidth: 500 }}>
                  {t("home.body1")}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2.25, width: "100%", maxWidth: 560, mt: 0.6, ml: { md: -1.5 } }}>
                  <Box sx={{ flex: 1, height: 2, backgroundColor: "rgba(67, 53, 39, 0.42)" }} />
                  <Box
                    component="img"
                    src="/button-flower.svg"
                    alt=""
                    aria-hidden="true"
                    sx={{ width: 28, height: 28, opacity: 0.82, flexShrink: 0 }}
                  />
                  <Box sx={{ flex: 1, height: 2, backgroundColor: "rgba(67, 53, 39, 0.42)" }} />
                </Box>
              </Stack>
            </Box>

            <Box
              sx={{
                position: "relative",
                minHeight: { xs: 320, md: 420, lg: "100%" },
                overflow: "hidden",
              }}
            >
              {HERO_IMAGES.map((src, index) => (
                <Box
                  key={src}
                  component="img"
                  src={src}
                  alt=""
                  aria-hidden="true"
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                    WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)",
                    maskImage: "linear-gradient(to left, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)",
                    opacity: index === heroImageIndex ? 1 : 0,
                    transform: index === heroImageIndex ? "scale(1)" : "scale(1.02)",
                    transition: "opacity 1400ms ease, transform 1400ms ease",
                  }}
                />
              ))}
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 1,
                  background:
                    "linear-gradient(to left, rgba(255,249,242,0) 0%, rgba(255,249,242,0) 54%, rgba(255,249,242,0.1) 74%, rgba(255,249,242,0.78) 100%)",
                }}
              />
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ borderRadius: 4, overflow: "hidden", backgroundColor: "rgba(255,252,248,0.95)", border: "1px solid rgba(191, 175, 152, 0.22)" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" } }}>
            {featureCards.map((item, index) => (
              <Box
                key={item.title}
                component={RouterLink}
                to={item.href}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: { xs: 132, md: 142 },
                  textDecoration: "none",
                  color: "inherit",
                  p: { xs: 1.4, md: 1.8 },
                  textAlign: "center",
                  overflow: "hidden",
                  borderRight: { md: index < featureCards.length - 1 ? "1px solid rgba(191, 175, 152, 0.16)" : "none" },
                  borderBottom: { xs: index < featureCards.length - 2 ? "1px solid rgba(191, 175, 152, 0.16)" : "none", md: "none" },
                }}
              >
                <Box
                  component="img"
                  src={item.icon}
                  alt={item.title}
                  sx={{
                    width: 34,
                    height: 34,
                    opacity: 0.8,
                    mb: 0.95,
                    transform: "translateY(-8px) scale(1.8)",
                    transformOrigin: "center center",
                  }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: "0.8rem",
                    lineHeight: 1,
                    transform: "scale(2)",
                    transformOrigin: "center top",
                    whiteSpace: "nowrap",
                    mt: 0.2,
                  }}
                >
                  {item.subtitle}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        <Paper sx={{ p: { xs: 1.4, md: 1.8 }, borderRadius: 4, backgroundColor: "rgba(255,252,249,0.94)", border: "1px solid rgba(191, 175, 152, 0.22)" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.64fr 0.36fr" }, gap: 1.2, alignItems: "stretch" }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.6fr 0.4fr" }, gap: 1.2, alignItems: "stretch" }}>
              <Paper sx={{ p: { xs: 1.2, md: 1.4 }, borderRadius: 2, border: "1px solid rgba(191, 175, 152, 0.18)", backgroundColor: "rgba(255,255,255,0.72)" }}>
                <Stack spacing={0.8} sx={{ height: "100%", justifyContent: "center" }}>
                  <Typography variant="h3" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600, lineHeight: 1.05 }}>
                    Clay Cafe, keramiek schilderen
                  </Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                    {t("clayCafePage.differenceBody")}
                  </Typography>
                  <Button component={RouterLink} to="/landing/claycafe" variant="contained" sx={{ alignSelf: "flex-start", mt: 0.4 }}>
                    Bekijk Clay Cafe
                  </Button>
                </Stack>
              </Paper>

              <Paper sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid rgba(191, 175, 152, 0.18)", backgroundColor: "rgba(255,255,255,0.72)", minHeight: { xs: 180, md: 220 } }}>
                <Box
                  component="img"
                  src="/keramiek%20schilderen.png"
                  alt={t("clayCafePage.differenceTitle")}
                  sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: { xs: 180, md: 220 } }}
                />
              </Paper>
            </Box>

            <Paper sx={{ p: { xs: 1.2, md: 1.4 }, borderRadius: 2, border: "1px solid rgba(191, 175, 152, 0.18)", backgroundColor: "rgba(255,255,255,0.72)" }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.2, alignItems: "stretch" }}>
                <Box sx={{ pr: { md: 1 }, borderRight: { md: "1px solid rgba(191, 175, 152, 0.35)" } }}>
                  <Typography variant="overline" sx={{ letterSpacing: "0.1em", color: "secondary.main", fontSize: { xs: "0.95rem", md: "1rem" } }}>
                    {t("clayCafePage.clayListTitle")}
                  </Typography>
                  <Stack spacing={0.75} pt={0.6}>
                    {clayList.map((item) => (
                      <Typography key={item} sx={{ fontSize: { xs: "0.98rem", md: "1.04rem" }, color: "text.secondary", lineHeight: 1.55 }}>
                        {item}
                      </Typography>
                    ))}
                  </Stack>
                </Box>

                <Box sx={{ pl: { md: 1 } }}>
                  <Typography variant="overline" sx={{ letterSpacing: "0.1em", color: "secondary.main", fontSize: { xs: "0.95rem", md: "1rem" } }}>
                    {t("clayCafePage.workshopListTitle")}
                  </Typography>
                  <Stack spacing={0.75} pt={0.6}>
                    {workshopList.map((item) => (
                      <Typography key={item} sx={{ fontSize: { xs: "0.98rem", md: "1.04rem" }, color: "text.secondary", lineHeight: 1.55 }}>
                        {item}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: 1.2 }}>
                <Box component="img" src="/Gallery%20Icon.png" alt="" aria-hidden="true" sx={{ width: 66, height: 66, opacity: 0.6 }} />
              </Box>
            </Paper>
          </Box>
        </Paper>

        <Paper
          elevation={4}
          sx={{
            overflow: "hidden",
            borderRadius: 5,
            border: "1px solid rgba(191, 175, 152, 0.24)",
            background: "linear-gradient(135deg, rgba(255,252,247,0.95) 0%, rgba(252,247,240,0.93) 100%)",
          }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "0.45fr 0.95fr 0.35fr" } }}>
            <Box sx={{ minHeight: { xs: 240, md: 320 }, position: "relative" }}>
              <Box component="img" src="/vallerydraaien.jpg" alt="Valery aan de draaischijf" sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to right, rgba(255,248,240,0) 60%, rgba(255,248,240,0.88) 100%)",
                }}
              />
            </Box>

            <Stack spacing={1.5} sx={{ p: { xs: 2.2, md: 3.2 }, justifyContent: "center" }}>
              <Typography variant="overline" sx={{ letterSpacing: "0.18em", color: "#7a6452" }}>
                {t("home.valeryEyebrow")}
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
                  fontWeight: 600,
                  lineHeight: 1.02,
                  fontSize: { xs: "2.1rem", md: "3rem" },
                }}
              >
                {t("home.valeryTitleLine1")}
                <br />
                {t("home.valeryTitleLine2")}
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {t("home.valeryBody1")}
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {t("home.valeryBody2")}
              </Typography>
              <Typography sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontStyle: "italic", fontSize: "2rem", color: "#bf9b8c", lineHeight: 1 }}>
                {t("home.valerySignature")}
              </Typography>
              <Button
                component={RouterLink}
                to="/over-grolle"
                variant="contained"
                sx={{ alignSelf: "flex-start", pl: { xs: 5, md: 5.6 }, pr: 3.2, mt: 0.6 }}
              >
                {t("home.valeryCta")}
              </Button>
            </Stack>

            <Stack spacing={2} sx={{ p: { xs: 2.2, md: 3.2 }, justifyContent: "center", borderLeft: { lg: "1px solid rgba(191, 175, 152, 0.2)" } }}>
              {valeryHighlights.map((item) => (
                <Box key={item.text} sx={{ display: "grid", gridTemplateColumns: "50px 1fr", gap: 1.2, alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      border: "1px solid rgba(191, 175, 152, 0.55)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255,255,255,0.7)",
                    }}
                  >
                    <Box component="img" src={item.icon} alt="" aria-hidden="true" sx={{ width: 24, height: 24, opacity: 0.75 }} />
                  </Box>
                  <Typography sx={{ color: "#5b4b3d", lineHeight: 1.5, fontWeight: 500 }}>{item.text}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </Paper>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "0.34fr 0.66fr" }, gap: 3, alignItems: "start" }}>
          <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, backgroundColor: "rgba(255,251,247,0.86)", border: "1px solid rgba(191, 175, 152, 0.2)" }}>
            <Stack spacing={2}>
              <Typography variant="overline" color="secondary.main" sx={{ letterSpacing: "0.18em" }}>
                {t("home.workshopsEyebrow")}
              </Typography>
              <Typography variant="h3" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600, lineHeight: 1.05 }}>
                {t("home.workshopsTitle")}
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {t("home.workshopsBody")}
              </Typography>
              <Button component={RouterLink} to="/landing/workshop" variant="contained" sx={{ alignSelf: "flex-start" }}>
                {t("home.workshopsCta")}
              </Button>
            </Stack>
          </Paper>

          <Grid container spacing={2}>
            {workshopCards.map((card) => (
              <Grid item xs={12} md={4} key={card.title}>
                <Paper sx={{ height: "100%", borderRadius: 4, overflow: "hidden", backgroundColor: "rgba(255,251,247,0.92)", border: "1px solid rgba(191, 175, 152, 0.2)" }}>
                  <Box sx={{ position: "relative" }}>
                    {card.badge && (
                      <Box sx={{ position: "absolute", left: 12, top: 12, zIndex: 1, px: 1, py: 0.5, borderRadius: 999, backgroundColor: "rgba(95, 87, 73, 0.82)", color: "#fff", fontSize: "0.68rem", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                        {card.badge}
                      </Box>
                    )}
                    <Box component="img" src={card.image} alt={card.title} sx={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
                  </Box>
                  <Stack spacing={1.2} sx={{ p: 2.2 }}>
                    <Typography variant="h5" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600, lineHeight: 1.1 }}>
                      {card.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {card.time}  •  {card.group}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {card.body}
                    </Typography>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" pt={0.6}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {card.price}
                      </Typography>
                      <Button component={RouterLink} to={card.href} variant="text" size="small">
                        {t("home.cardCta")}
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, backgroundColor: "rgba(255,251,247,0.9)", border: "1px solid rgba(191, 175, 152, 0.2)" }}>
          <Grid container spacing={2.5} alignItems="stretch">
            <Grid item xs={12} lg={3.2}>
              <Stack spacing={1.5} sx={{ height: "100%", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="overline" color="secondary.main" sx={{ letterSpacing: "0.18em" }}>
                    {t("home.agendaEyebrow")}
                  </Typography>
                  <Typography variant="h4" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600 }}>
                    {t("home.agendaTitle")}
                  </Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.75, mt: 1 }}>
                    {t("home.agendaBody")}
                  </Typography>
                </Box>
                <Button component={RouterLink} to="/bookings" variant="outlined" sx={{ alignSelf: "flex-start" }}>
                  {t("home.agendaCta")}
                </Button>
              </Stack>
            </Grid>

            <Grid item xs={12} lg={8.8}>
              {agendaState.loading && (
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ height: "100%" }}>
                  <CircularProgress size={20} />
                  <Typography>{t("agenda.loading")}</Typography>
                </Stack>
              )}

              {!agendaState.loading && agendaState.error && (
                <Typography color="text.secondary">{t("agenda.unavailable", { error: agendaState.error })}</Typography>
              )}

              {!agendaState.loading && !agendaState.error && (
                <Grid container spacing={1.5}>
                  {agendaState.items.map((item) => {
                    const date = formatAgendaDate(item.starts_at, locale);
                    const pricePerPerson = formatPricePerPerson(item.activity_price, locale);
                    return (
                      <Grid item xs={12} md={4} key={item.id}>
                        <Paper variant="outlined" sx={{ p: 2.2, borderRadius: 3, height: "100%", backgroundColor: "rgba(255,255,255,0.76)" }}>
                          <Stack spacing={1}>
                            <Typography variant="overline" color="secondary.main" sx={{ lineHeight: 1, fontSize: "1.3125rem" }}>
                              {date.day}
                            </Typography>
                            <Typography variant="caption" sx={{ textTransform: "uppercase", letterSpacing: "0.18em", display: "block", mt: -0.4, fontSize: "1.3125rem" }}>
                              {date.month}
                            </Typography>
                            <Typography variant="h6" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600, lineHeight: 1.15 }}>
                              {item.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "1.3125rem", lineHeight: 1.2 }}>
                              {formatTimeRange(item.starts_at, item.ends_at, locale)}
                            </Typography>
                            <Typography variant="caption" sx={{ alignSelf: "flex-start", px: 1, py: 0.5, borderRadius: 999, backgroundColor: item.available_spots > 0 ? "rgba(219,236,219,0.92)" : "rgba(240,225,225,0.92)" }}>
                              {item.available_spots > 0 ? t("home.agendaSpots", { count: item.available_spots }) : t("home.agendaSoldOut")}
                            </Typography>
                            {pricePerPerson && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: "1.5rem", lineHeight: 1.1 }}>
                                {pricePerPerson}
                              </Typography>
                            )}
                            {item.available_spots > 0 && (
                              <Button
                                component={RouterLink}
                                to={{
                                  pathname: "/bookings",
                                  search: `?activity=${item.activity}&timeslot=${item.id}&date=${item.starts_at.slice(0, 10)}`,
                                }}
                                variant="contained"
                                sx={{
                                  alignSelf: "flex-start",
                                  mt: 0.6,
                                  borderRadius: 999,
                                  backgroundColor: "#cf8475",
                                  color: "#fffaf7",
                                  pl: 5.6,
                                  pr: 2,
                                  py: 0.65,
                                  "&:hover": { backgroundColor: "#bb6b5b" },
                                }}
                              >
                                {t("home.agendaBookNow")}
                              </Button>
                            )}
                          </Stack>
                        </Paper>
                      </Grid>
                    );
                  })}
                  {agendaState.items.length === 0 && <Typography color="text.secondary">{t("agenda.empty")}</Typography>}
                </Grid>
              )}
            </Grid>
          </Grid>
        </Paper>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "0.31fr 0.49fr 0.20fr" }, gap: 3, alignItems: "center" }}>
          <Box component="img" src="/bommelwereld.jpg" alt={t("home.aboutTitle")} sx={{ width: "100%", height: { xs: 260, lg: 300 }, objectFit: "cover", borderRadius: 4, boxShadow: "0 16px 36px rgba(89, 62, 34, 0.10)" }} />

          <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, backgroundColor: "rgba(255,251,247,0.88)", border: "1px solid rgba(191, 175, 152, 0.2)" }}>
            <Stack spacing={1.6}>
              <Typography variant="overline" color="secondary.main" sx={{ letterSpacing: "0.18em" }}>
                {t("home.aboutEyebrow")}
              </Typography>
              <Typography variant="h3" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600, lineHeight: 1.06 }}>
                {t("home.aboutTitle")}
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
                {t("home.aboutBody1")}
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
                {t("home.aboutBody2")}
              </Typography>
              <Button component={RouterLink} to="/over-grolle" variant="contained" sx={{ alignSelf: "flex-start" }}>
                {t("home.aboutCta")}
              </Button>
            </Stack>
          </Paper>

          <Box component="img" src="/slagomgrolle.jpg" alt={t("home.aboutTitle")} sx={{ width: "100%", height: { xs: 220, lg: 300 }, objectFit: "cover", borderRadius: 4, boxShadow: "0 16px 36px rgba(89, 62, 34, 0.10)" }} />
        </Box>

        <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, backgroundColor: "rgba(255,251,247,0.86)", border: "1px solid rgba(191, 175, 152, 0.2)", textAlign: "center" }}>
          <Stack spacing={1.5} alignItems="center">
            <Typography sx={{ fontSize: "2.6rem", lineHeight: 1, color: "rgba(161, 138, 111, 0.72)" }}>“</Typography>
            <Typography sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontSize: { xs: "1.55rem", md: "2rem" }, fontStyle: "italic", maxWidth: 760, lineHeight: 1.45 }}>
              {t("home.quote")}
            </Typography>
            <Typography variant="caption" sx={{ textTransform: "uppercase", letterSpacing: "0.18em", color: "text.secondary" }}>
              {t("home.quoteAuthor")}
            </Typography>
          </Stack>
        </Paper>

        <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, backgroundColor: "rgba(255,251,247,0.92)", border: "1px solid rgba(191, 175, 152, 0.2)" }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Stack spacing={1.2}>
                <Typography variant="h5" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600 }}>{t("appName")}</Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>{t("home.footerTagline")}</Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={3}>
              <Stack spacing={1}>
                <Typography variant="overline" color="secondary.main">{t("home.visitTitle")}</Typography>
                {visitLines.map((line) => (
                  <Typography key={line} color="text.secondary">{line}</Typography>
                ))}
                <Button component={RouterLink} to="/contact" variant="contained" sx={{ alignSelf: "flex-start" }}>{t("home.visitCta")}</Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={2.5}>
              <Stack spacing={1}>
                <Typography variant="overline" color="secondary.main">{t("home.hoursTitle")}</Typography>
                {hoursLines.map((line) => (
                  <Typography key={line} color="text.secondary">{line}</Typography>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={1.8}>
              <Stack spacing={1}>
                <Typography variant="overline" color="secondary.main">{t("home.quickLinksTitle")}</Typography>
                {quickLinks.map((item, index) => (
                  <Typography
                    key={item}
                    component={RouterLink}
                    to={quickLinkTargets[index] || "/"}
                    sx={{
                      alignSelf: "flex-start",
                      textDecoration: "none",
                      color: "text.secondary",
                      fontSize: "0.98rem",
                      lineHeight: 1.45,
                      "&:hover": {
                        color: "#6f4a3d",
                      },
                    }}
                  >
                    {item}
                  </Typography>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={1.7}>
              <Stack spacing={1.2}>
                <Typography variant="overline" color="secondary.main">{t("home.newsletterTitle")}</Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>{t("home.newsletterBody")}</Typography>
                <Paper variant="outlined" sx={{ px: 1.6, py: 1.1, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.84)" }}>
                  <Typography color="text.secondary">{t("home.newsletterPlaceholder")}</Typography>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Stack>
    </Box>
  );
}
