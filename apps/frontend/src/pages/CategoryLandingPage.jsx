import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Grid, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageProvider";
import { apiFetch } from "../lib/api";
import { addToCart, formatPrice, getCartSummary, readCart, writeCart } from "../lib/webshopCart";

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
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [cartNotice, setCartNotice] = useState("");

  const safeKey = CONTENT[categoryKey] ? categoryKey : "workshop";
  const copy = CONTENT[safeKey][language] || CONTENT[safeKey].nl;
  const iconSrc = CATEGORY_IMAGES[safeKey];
  const isWebshop = safeKey === "webshop";

  useEffect(() => {
    if (!isWebshop) {
      return;
    }

    setCartItems(readCart());
  }, [isWebshop]);

  useEffect(() => {
    if (!isWebshop) {
      return;
    }

    let active = true;

    async function loadProducts() {
      setProductsLoading(true);
      setProductsError("");

      try {
        const response = await apiFetch("/api/products/");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (!active) {
          return;
        }

        setProducts(payload);
      } catch (error) {
        if (!active) {
          return;
        }

        setProductsError(
          language === "de"
            ? "Produkte konnten nicht geladen werden. Bitte versuche es spaeter erneut."
            : "Producten konden niet worden geladen. Probeer het later opnieuw."
        );
      } finally {
        if (active) {
          setProductsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, [isWebshop, language]);

  const cartSummary = useMemo(() => getCartSummary(cartItems), [cartItems]);

  const handleAddToCart = (product) => {
    setCartItems((current) => {
      const next = addToCart(current, product);
      writeCart(next);
      return next;
    });
  };

  if (isWebshop) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box
          sx={{
            width: { xs: "100%", md: "90%" },
            ml: { xs: -0.5, md: -0.5 },
          }}
        >
          <Paper
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: 4,
              border: "1px solid rgba(140, 124, 104, 0.22)",
              background: "linear-gradient(180deg, rgba(251,248,243,0.95) 0%, rgba(240,232,222,0.95) 100%)",
            }}
            elevation={3}
          >
            <Stack spacing={2.2}>
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
                      width: { xs: 66, md: 82 },
                      height: { xs: 66, md: 82 },
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
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 900 }}>
                {copy.body}
              </Typography>

              <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap">
                <Button component={RouterLink} to="/landing/webshop/cart" variant="outlined">
                  {language === "de" ? `Warenkorb ansehen (${cartSummary.totalItems})` : `Bekijk winkelmand (${cartSummary.totalItems})`}
                </Button>
                {cartNotice && <Alert severity="success">{cartNotice}</Alert>}
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Stack spacing={1.2}>
                    {productsLoading && (
                      <Stack direction="row" spacing={1.2} alignItems="center">
                        <CircularProgress size={20} />
                        <Typography color="text.secondary">
                          {language === "de" ? "Produkte werden geladen..." : "Producten laden..."}
                        </Typography>
                      </Stack>
                    )}

                    {productsError && <Alert severity="error">{productsError}</Alert>}

                    {!productsLoading && !productsError && products.length === 0 && (
                      <Alert severity="info">
                        {language === "de"
                          ? "Er zijn nog geen actieve producten."
                          : "Er zijn nog geen actieve producten."}
                      </Alert>
                    )}

                    <Grid container spacing={1.5}>
                      {products.map((product) => (
                        <Grid item xs={12} sm={6} md={4} key={product.id}>
                          <Card
                            variant="outlined"
                            sx={{
                              borderRadius: 3,
                              backgroundColor: "rgba(255,255,255,0.82)",
                              minHeight: "100%",
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            {product.image_url && (
                              <Box
                                component="img"
                                src={product.image_url}
                                alt={product.name}
                                sx={{
                                  width: "100%",
                                  height: 180,
                                  objectFit: "cover",
                                  borderRadius: "3px 3px 0 0",
                                }}
                              />
                            )}
                            <CardContent>
                              <Stack spacing={1}>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                  {product.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ minHeight: 48 }}>
                                  {product.description || (language === "de" ? "Handgemacht und einzigartig." : "Handgemaakt en uniek.")}
                                </Typography>
                                <Typography sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
                                  {formatPrice(product.price, language)}
                                </Typography>
                                <Stack direction="column" spacing={1} alignItems="flex-start">
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => {
                                      handleAddToCart(product);
                                      setCartNotice(
                                        language === "de"
                                          ? `${product.name} zum Warenkorb hinzugefuegt.`
                                          : `${product.name} toegevoegd aan je winkelmand.`
                                      );
                                    }}
                                    sx={{ width: "50%" }}
                                  >
                                    {language === "de" ? "In den Warenkorb" : "Koop"}
                                  </Button>
                                  <Button component={RouterLink} to={`/landing/webshop/product/${product.slug}`} variant="outlined" size="small" sx={{ width: "50%" }}>
                                    {language === "de" ? "Details" : "Details"}
                                  </Button>
                                </Stack>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Stack>
                </Grid>
              </Grid>
            </Stack>
          </Paper>
        </Box>
      </Box>
    );
  }

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
