import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageProvider";

const CATEGORIES = [
  { key: "claycafe", icon: "/menuicon2.png", to: "/landing/claycafe" },
  { key: "keramiek", icon: "/menuicon1.png", to: "/landing/keramiek" },
  { key: "workshop", icon: "/menuicon3.png", to: "/landing/workshop" },
  { key: "sieraden", icon: "/menuicon4.png", to: "/landing/sieraden" },
  { key: "webshop", icon: "/menuicon5.png", to: "/landing/webshop" },
];

export default function CategoryNav() {
  const { t } = useLanguage();

  return (
    <Box
      component="nav"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1100,
        background: "linear-gradient(180deg, rgba(248,244,238,0.97) 0%, rgba(240,232,221,0.97) 100%)",
        backdropFilter: "blur(6px)",
        borderBottom: "1px solid rgba(170,160,145,0.28)",
        borderTop: "1px solid rgba(170,160,145,0.18)",
        py: { xs: 1.5, md: 2 },
      }}
    >
      <Box sx={{ px: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            width: { xs: "min(90vw, 430px)", md: "min(36vw, 500px)" },
            ml: { xs: -0.5, md: -0.5 },
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            spacing={0.5}
            flexWrap="nowrap"
          >
            {CATEGORIES.map(({ key, icon, to }) => (
              <ButtonBase
                key={key}
                component={RouterLink}
                to={to}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.75,
                  px: { xs: 0.35, md: 0.75 },
                  py: 0.5,
                  borderRadius: 2,
                  transition: "opacity 150ms ease, transform 150ms ease",
                  "&:hover": {
                    opacity: 0.7,
                    transform: "translateY(-2px)",
                  },
                  "&:active": {
                    transform: "translateY(0)",
                  },
                }}
              >
                <Box
                  component="img"
                  src={icon}
                  alt={key}
                  sx={{
                    width: { xs: 44, md: 56 },
                    height: { xs: 44, md: 56 },
                    objectFit: "contain",
                    mixBlendMode: "multiply",
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
                    fontWeight: 600,
                    fontSize: "0.72rem",
                    color: "#2c2c2c",
                  }}
                >
                  {t(`categoryNav.${key}`)}
                </Typography>
              </ButtonBase>
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
