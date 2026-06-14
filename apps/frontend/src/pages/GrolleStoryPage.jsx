import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function GrolleStoryPage() {
  const pillars = [
    {
      title: "Vestingstad",
      body: "Groenlo ademt historie met straatjes, poorten en verhalen uit vroegere tijden.",
      icon: "/menuicon1.png",
    },
    {
      title: "Ambacht",
      body: "In onze werkplaats geven we traditie en creativiteit elke dag opnieuw vorm.",
      icon: "/menuicon2.png",
    },
    {
      title: "Gastvrijheid",
      body: "Iedereen is welkom om te kijken, te beleven en zelf mee te maken.",
      icon: "/menuicon3.png",
    },
    {
      title: "Keramiek",
      body: "Van clay cafe tot atelier: keramiek verbindt ons verhaal met jouw moment.",
      icon: "/menuicon4.png",
    },
  ];

  const timeline = [
    {
      step: "01",
      title: "Middeleeuwse stad",
      body: "Groenlo ontstond als handelsstad met verdedigingswerken en een sterk karakter.",
    },
    {
      step: "02",
      title: "Vestingwerken",
      body: "Door wallen, grachten en bastions groeide Groenlo uit tot een bekende vestingstad.",
    },
    {
      step: "03",
      title: "Ambacht en traditie",
      body: "Ambacht bleef zichtbaar in de stad en vormt nog steeds een belangrijk fundament.",
    },
    {
      step: "04",
      title: "Grolle vandaag",
      body: "Historie, creativiteit en ontmoeting komen samen in Pottenbakkerij Grolle.",
    },
  ];

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
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "0.88fr 1.12fr" }, minHeight: { xs: 0, lg: 520 } }}>
            <Box sx={{ p: { xs: 3, md: 5 }, display: "flex", alignItems: "center" }}>
              <Stack spacing={2.25} sx={{ maxWidth: 560 }}>
                <Typography variant="overline" sx={{ letterSpacing: "0.22em", color: "secondary.main" }}>
                  Het verhaal van Groenlo
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
                  Groenlo, vestingstad vol verhalen
                </Typography>
                <Stack spacing={1.1} sx={{ maxWidth: 500 }}>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.8, fontSize: { xs: "1rem", md: "1.2rem" } }}>
                    Groenlo is een stad met een rijk verleden. Tijdens de Tachtigjarige Oorlog speelde de vestingstad een belangrijke rol in de strijd om de Achterhoek. De beroemde Slag om Grolle in 1627 bracht prins Frederik Hendrik naar de stad en maakte Groenlo tot een plek waar geschiedenis nog altijd voelbaar is.
                  </Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.8, fontSize: { xs: "1rem", md: "1.2rem" } }}>
                    Maar Groenlo staat niet alleen bekend om haar vestingwerken en verhalen van vroeger. Het is ook de geboorteplek van het bekende Grolsch bier, dat hier zijn oorsprong vond. Die combinatie van historie, vakmanschap en gastvrijheid past prachtig bij Pottenbakkerij Grolle: een plek waar oude verhalen en nieuw ambacht samenkomen.
                  </Typography>
                </Stack>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2.25, width: "100%", maxWidth: 560, mt: 0.6 }}>
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
              <Box
                component="img"
                src="/bommelwereld.jpg"
                alt="Groenlo vestingstad"
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
                }}
              />
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

        <Paper sx={{ p: { xs: 1.4, md: 1.6 }, borderRadius: 4, backgroundColor: "rgba(255,251,246,0.93)", border: "1px solid rgba(191, 175, 152, 0.22)" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 0.8 }}>
            {pillars.map((item) => (
              <Stack key={item.title} spacing={0.8} sx={{ px: { xs: 0.8, md: 1.2 }, py: 0.7 }}>
                <Box component="img" src={item.icon} alt="" aria-hidden="true" sx={{ width: 24, height: 24, opacity: 0.7 }} />
                <Typography variant="overline" sx={{ letterSpacing: "0.12em", color: "#4c3d2f" }}>
                  {item.title}
                </Typography>
                <Typography sx={{ fontSize: "0.86rem", color: "text.secondary", lineHeight: 1.5 }}>{item.body}</Typography>
              </Stack>
            ))}
          </Box>
        </Paper>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.64fr 0.36fr" }, gap: 1.2, alignItems: "stretch" }}>
          <Paper sx={{ p: { xs: 2.2, md: 2.8 }, borderRadius: 4, backgroundColor: "rgba(255,251,247,0.9)", border: "1px solid rgba(191, 175, 152, 0.2)" }}>
            <Stack spacing={1.5}>
              <Typography variant="overline" sx={{ letterSpacing: "0.16em", color: "secondary.main" }}>
                Het verhaal
              </Typography>
              <Typography variant="h3" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600, lineHeight: 1.06 }}>
                Het verhaal van Groenlo en Grolle
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                Groenlo heeft een rijke historie als vestingstad. Die sfeer voel je nog in de straten, gebouwen en verhalen. Pottenbakkerij Grolle laat zich daardoor inspireren in elk detail.
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                In het atelier combineren we traditie met creativiteit. Zo maken we keramiek dat past bij de warmte en het karakter van Groenlo.
              </Typography>
            </Stack>
          </Paper>

          <Paper sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid rgba(191, 175, 152, 0.2)", backgroundColor: "rgba(255,255,255,0.74)" }}>
            <Box component="img" src="/calypsokerk.jpg" alt="Het verhaal van Grolle" sx={{ width: "100%", height: "100%", minHeight: 340, objectFit: "cover", display: "block" }} />
          </Paper>
        </Box>

        <Paper sx={{ p: { xs: 1.4, md: 1.8 }, borderRadius: 4, backgroundColor: "rgba(255,252,249,0.94)", border: "1px solid rgba(191, 175, 152, 0.22)" }}>
          <Stack spacing={1.2}>
            <Typography variant="overline" sx={{ letterSpacing: "0.16em", color: "secondary.main" }}>
              De geschiedenis van Groenlo
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 1 }}>
              {timeline.map((item) => (
                <Paper key={item.step} sx={{ p: 1.3, borderRadius: 2, border: "1px solid rgba(191, 175, 152, 0.2)", backgroundColor: "rgba(255,255,255,0.75)" }}>
                  <Typography variant="overline" sx={{ letterSpacing: "0.2em", color: "secondary.main" }}>
                    {item.step}
                  </Typography>
                  <Typography sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600, fontSize: "1.35rem", lineHeight: 1.15 }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: "0.92rem", lineHeight: 1.65, mt: 0.4 }}>{item.body}</Typography>
                </Paper>
              ))}
            </Box>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
