import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageProvider";

export default function ClayCafePage() {
  const { t } = useLanguage();
  const highlights = t("clayCafePage.highlights");
  const categoryCards = t("clayCafePage.categoryCards");
  const momentCards = t("clayCafePage.momentCards");
  const clayList = t("clayCafePage.clayList");
  const workshopList = t("clayCafePage.workshopList");
  const products = t("clayCafePage.products");
  const availabilitySlots = t("clayCafePage.availabilitySlots");

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
        minHeight: { xs: "calc(100vh - 120px)", md: "calc(100vh - 140px)" },
      }}
    >
      <Stack spacing={{ xs: 1.5, md: 2 }}>
        <Paper
          elevation={5}
          sx={{
            overflow: "hidden",
            borderRadius: 4,
            border: "1px solid rgba(140, 124, 104, 0.2)",
            backgroundColor: "rgba(252, 248, 242, 0.97)",
          }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.9fr 1.1fr" } }}>
            <Box sx={{ p: { xs: 3, md: 4.5 }, display: "flex", alignItems: "center" }}>
              <Stack spacing={2} sx={{ maxWidth: 520 }}>
                <Typography variant="overline" sx={{ letterSpacing: "0.2em", color: "secondary.main" }}>
                  {t("clayCafePage.eyebrow")}
                </Typography>
                <Typography
                  variant="h1"
                  sx={{
                    fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
                    fontWeight: 600,
                    fontSize: { xs: "2.55rem", md: "4rem" },
                    lineHeight: 0.97,
                    maxWidth: 420,
                  }}
                >
                  {t("clayCafePage.title")}
                </Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.75, fontSize: { xs: "1rem", md: "1.1rem" }, maxWidth: 430 }}>
                  {t("clayCafePage.body")}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2.25, width: "100%", maxWidth: 430, mt: 0.6 }}>
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
                minHeight: { xs: 300, md: 500 },
                backgroundImage: "url('/keramiek schilderen.png')",
                backgroundPosition: "center",
                backgroundSize: "cover",
                position: "relative",
                // Fade the image out toward the left edge.
                WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,1) 64%, rgba(0,0,0,0) 100%)",
                maskImage: "linear-gradient(to left, rgba(0,0,0,1) 64%, rgba(0,0,0,0) 100%)",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(90deg, rgba(255,251,245,0.18) 0%, rgba(255,251,245,0.02) 40%, rgba(255,251,245,0.08) 100%)",
                }}
              />
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: { xs: 1.4, md: 1.6 }, borderRadius: 4, backgroundColor: "rgba(255,251,246,0.93)", border: "1px solid rgba(191, 175, 152, 0.22)" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 0.8 }}>
            {highlights.map((item) => (
              <Stack key={item} direction="row" spacing={1} alignItems="center" sx={{ px: { xs: 0.35, md: 1.1 }, py: 0.45 }}>
                <Box component="img" src="/menuiconback.png" alt="" aria-hidden="true" sx={{ width: 16, height: 16, opacity: 0.7 }} />
                <Typography sx={{ fontSize: { xs: "0.72rem", md: "0.78rem" }, letterSpacing: "0.05em", color: "#5a4b3c" }}>{item}</Typography>
              </Stack>
            ))}
          </Box>
        </Paper>

        <Paper sx={{ borderRadius: 4, overflow: "hidden", backgroundColor: "rgba(255,252,248,0.95)", border: "1px solid rgba(191, 175, 152, 0.22)" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" } }}>
            {categoryCards.map((item, index) => (
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
                  borderRight: { md: index < categoryCards.length - 1 ? "1px solid rgba(191, 175, 152, 0.16)" : "none" },
                  backgroundColor: item.active ? "rgba(211, 203, 184, 0.55)" : "transparent",
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

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.34fr 0.66fr" }, gap: 1.4 }}>
          <Paper sx={{ p: { xs: 2.2, md: 2.8 }, borderRadius: 4, backgroundColor: "rgba(255,251,247,0.9)", border: "1px solid rgba(191, 175, 152, 0.2)" }}>
            <Stack spacing={1.6}>
              <Typography variant="overline" sx={{ letterSpacing: "0.16em", color: "secondary.main" }}>
                {t("clayCafePage.momentsEyebrow")}
              </Typography>
              <Typography variant="h3" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600, lineHeight: 1.06 }}>
                {t("clayCafePage.momentsTitle")}
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
                {t("clayCafePage.momentsBody")}
              </Typography>
              <Button component={RouterLink} to="/bookings?activity=1" variant="contained" sx={{ alignSelf: "flex-start" }}>
                {t("clayCafePage.momentsCta")}
              </Button>
            </Stack>
          </Paper>

          <Paper sx={{ overflow: "hidden", borderRadius: 4, backgroundColor: "rgba(255,251,247,0.92)", border: "1px solid rgba(191, 175, 152, 0.2)" }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, minmax(0, 1fr))" } }}>
              {momentCards.map((card, index) => (
                <Box
                  key={card.title}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    borderRight: { lg: index < momentCards.length - 1 ? "1px solid rgba(191, 175, 152, 0.22)" : "none" },
                    borderBottom: { xs: index < momentCards.length - 1 ? "1px solid rgba(191, 175, 152, 0.22)" : "none", lg: "none" },
                    minHeight: "100%",
                  }}
                >
                  <Box component="img" src={card.image} alt={card.title} sx={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
                  <Stack spacing={1.2} sx={{ p: 2.2 }}>
                    <Typography variant="h5" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600, lineHeight: 1.1 }}>
                      {card.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {card.body}
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        <Paper sx={{ p: { xs: 1.4, md: 1.8 }, borderRadius: 4, backgroundColor: "rgba(255,252,249,0.94)", border: "1px solid rgba(191, 175, 152, 0.22)" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.28fr 0.72fr" }, gap: 1.2 }}>
            <Paper sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid rgba(191, 175, 152, 0.18)", backgroundColor: "rgba(255,255,255,0.72)" }}>
              <Box component="img" src="/home-background%205.jpg" alt={t("clayCafePage.differenceTitle")} sx={{ width: "100%", height: 124, objectFit: "cover" }} />
              <Stack spacing={0.8} sx={{ p: 1.2 }}>
                <Typography sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontSize: "1.5rem", fontWeight: 600 }}>
                  {t("clayCafePage.differenceTitle")}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, fontSize: "1rem" }}>
                  {t("clayCafePage.differenceBody")}
                </Typography>
              </Stack>
            </Paper>

            <Paper sx={{ p: { xs: 1.2, md: 1.4 }, borderRadius: 2, border: "1px solid rgba(191, 175, 152, 0.18)", backgroundColor: "rgba(255,255,255,0.72)" }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.45fr 0.45fr 0.1fr" }, gap: 1.4, alignItems: "stretch" }}>
                <Box sx={{ pr: { md: 2 }, borderRight: { md: "1px solid rgba(191, 175, 152, 0.35)" } }}>
                  <Typography
                    variant="overline"
                    sx={{ letterSpacing: "0.1em", color: "secondary.main", fontSize: { xs: "0.95rem", md: "1rem" } }}
                  >
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
                  <Typography
                    variant="overline"
                    sx={{ letterSpacing: "0.1em", color: "secondary.main", fontSize: { xs: "0.95rem", md: "1rem" } }}
                  >
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
                <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", justifyContent: "center" }}>
                  <Box component="img" src="/Gallery%20Icon.png" alt="" aria-hidden="true" sx={{ width: 66, height: 66, opacity: 0.6 }} />
                </Box>
              </Box>
            </Paper>
          </Box>
        </Paper>

        <Paper sx={{ p: { xs: 1.4, md: 1.8 }, borderRadius: 4, backgroundColor: "rgba(255,252,249,0.94)", border: "1px solid rgba(191, 175, 152, 0.22)" }}>
          <Stack spacing={1.2}>
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: "0.16em", color: "secondary.main" }}>
                {t("clayCafePage.productEyebrow")}
              </Typography>
              <Typography variant="h3" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600, lineHeight: 1.05 }}>
                {t("clayCafePage.productTitle")}
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {t("clayCafePage.productBody")}
              </Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1 }}>
              {products.map((item) => (
                <Paper key={item.name} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid rgba(191, 175, 152, 0.2)", backgroundColor: "rgba(255,255,255,0.75)" }}>
                  <Box component="img" src={item.image} alt={item.name} sx={{ width: "100%", height: 126, objectFit: "cover" }} />
                  <Stack spacing={0.15} sx={{ p: 1 }}>
                    <Typography sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600, fontSize: "1.12rem" }}>
                      {item.name}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {item.price}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ p: { xs: 1.4, md: 1.8 }, borderRadius: 4, backgroundColor: "rgba(235,231,221,0.86)", border: "1px solid rgba(191, 175, 152, 0.24)" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.36fr 0.64fr" }, gap: 1.2 }}>
            <Paper sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid rgba(191, 175, 152, 0.18)", backgroundColor: "rgba(255,255,255,0.72)" }}>
              <Box component="img" src="/bommelwereld.jpg" alt={t("clayCafePage.availabilityTitle")} sx={{ width: "100%", height: 120, objectFit: "cover" }} />
              <Stack spacing={0.8} sx={{ p: 1.2 }}>
                <Typography variant="overline" sx={{ letterSpacing: "0.14em", color: "secondary.main" }}>
                  {t("clayCafePage.availabilityEyebrow")}
                </Typography>
                <Typography sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600, fontSize: "1.55rem" }}>
                  {t("clayCafePage.availabilityTitle")}
                </Typography>
                <Typography sx={{ fontSize: "1rem", color: "text.secondary", lineHeight: 1.7 }}>
                  {t("clayCafePage.availabilityBody")}
                </Typography>
                <Button
                  component={RouterLink}
                  to="/bookings?activity=1"
                  variant="contained"
                  size="small"
                  startIcon={<Box component="img" src="/button-flower.svg" alt="" aria-hidden="true" sx={{ width: 15, height: 15, opacity: 0.9 }} />}
                  sx={{ alignSelf: "flex-start", "&::before": { display: "none" }, pl: 2, "& .MuiButton-startIcon": { ml: 0.35, mr: 0.9 } }}
                >
                  {t("clayCafePage.availabilityCta")}
                </Button>
              </Stack>
            </Paper>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)", xl: "repeat(5, 1fr)" }, gap: 0.8 }}>
              {availabilitySlots.map((slot) => (
                <Paper
                  key={`${slot.day}-${slot.date}-${slot.time}`}
                  sx={{
                    p: 1.15,
                    borderRadius: 2,
                    border: "1px solid rgba(191, 175, 152, 0.2)",
                    backgroundColor: "rgba(255,255,255,0.77)",
                    minHeight: 148,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 0.65,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: "0.9rem", letterSpacing: "0.12em", color: "text.secondary", lineHeight: 1.2, fontWeight: 500 }}>
                      {slot.day}
                    </Typography>
                    <Stack direction="row" spacing={0.8} alignItems="baseline">
                      <Typography sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600, fontSize: "2.35rem", lineHeight: 1.02 }}>
                        {slot.date}
                      </Typography>
                      <Typography sx={{ fontSize: "1.22rem", color: "text.secondary", lineHeight: 1.2, textTransform: "lowercase", fontWeight: 500 }}>
                        {slot.month}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.65, alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap" }}>
                      <Typography sx={{ fontSize: "1.18rem", color: "text.secondary", lineHeight: 1.4, fontWeight: 700 }}>{slot.time}</Typography>
                      <Typography sx={{ fontSize: "1.16rem", color: "text.secondary", lineHeight: 1.4 }}>{slot.spots}</Typography>
                    </Stack>
                  </Box>
                  <Button
                    component={RouterLink}
                    to="/bookings?activity=1"
                    variant="text"
                    size="medium"
                    startIcon={<Box component="img" src="/button-flower.svg" alt="" aria-hidden="true" sx={{ width: 14, height: 14, opacity: 0.9 }} />}
                    sx={{ px: 0, minWidth: 0, mt: 0.35, alignSelf: "flex-start", fontSize: "0.95rem", "&::before": { display: "none" }, pl: 0.6, "& .MuiButton-startIcon": { ml: 0.25, mr: 0.85 } }}
                  >
                    {t("clayCafePage.availabilitySlotCta")}
                  </Button>
                </Paper>
              ))}
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid rgba(191, 175, 152, 0.22)", backgroundColor: "rgba(255,251,246,0.94)" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.78fr 0.22fr" }, alignItems: "stretch" }}>
            <Stack spacing={1} sx={{ p: { xs: 2, md: 2.6 }, justifyContent: "center" }}>
              <Typography sx={{ fontSize: "1.7rem", lineHeight: 1, color: "#433527" }}>"</Typography>
              <Typography sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontSize: { xs: "1.18rem", md: "1.35rem" }, lineHeight: 1.4, textAlign: "center" }}>
                {t("clayCafePage.testimonial")}
              </Typography>
            </Stack>
            <Box component="img" src="/calypsokerk.jpg" alt="Clay Cafe" sx={{ width: "100%", height: "100%", minHeight: { xs: 170, md: 210 }, objectFit: "cover" }} />
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}
