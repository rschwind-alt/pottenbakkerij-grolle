import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageProvider";
import { apiFetch } from "../lib/api";
import { bookingButtonSx } from "../lib/buttonStyles";
import { animateFlyToCart } from "../lib/cartAnimation";
import { addToCart, formatPrice, readCart, writeCart } from "../lib/webshopCart";

export default function WebshopProductPage() {
  const { slug } = useParams();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);
  const [cartMessage, setCartMessage] = useState("");
  const [cartMessageSeverity, setCartMessageSeverity] = useState("success");
  const [currentCartQuantity, setCurrentCartQuantity] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      setLoading(true);
      setError("");

      try {
        const response = await apiFetch(`/api/products/${slug}/`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (!active) {
          return;
        }
        setProduct(payload);

        const currentCart = readCart();
        const existing = currentCart.find((item) => item.id === payload.id);
        setCurrentCartQuantity(Number(existing?.quantity || 0));
      } catch {
        if (!active) {
          return;
        }
        setError(language === "de" ? "Produkt nicht gefunden." : "Product niet gevonden.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [slug, language]);

  const handleAdd = (sourceElement = null) => {
    if (!product) {
      return;
    }

    const availableStock = Number(product.stock_quantity || 0);
    const current = readCart();
    const existing = current.find((item) => item.id === product.id);
    const existingQuantity = Number(existing?.quantity || 0);

    if (existingQuantity >= availableStock) {
      setCartMessageSeverity("warning");
      setCartMessage(
        language === "de"
          ? `Maximum voorraad bereikt voor ${product.name}.`
          : `Maximum voorraad bereikt voor ${product.name}.`
      );
      return;
    }

    const next = addToCart(current, product, availableStock);
    writeCart(next);
    animateFlyToCart(sourceElement, product.image_url);
    const updated = next.find((item) => item.id === product.id);
    setCurrentCartQuantity(Number(updated?.quantity || 0));
    setCartMessageSeverity("success");
    setCartMessage(
      language === "de"
        ? `${product.name} zum Warenkorb hinzugefuegt.`
        : `${product.name} toegevoegd aan je winkelmand.`
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Paper
        sx={{
          p: { xs: 2.5, md: 3.5 },
          borderRadius: 4,
          border: "1px solid rgba(140, 124, 104, 0.22)",
          background: "linear-gradient(180deg, rgba(251,248,243,0.95) 0%, rgba(240,232,222,0.95) 100%)",
          maxWidth: 920,
          ml: { xs: -0.5, md: -0.5 },
        }}
        elevation={3}
      >
        {loading && (
          <Stack direction="row" spacing={1.2} alignItems="center">
            <CircularProgress size={20} />
            <Typography color="text.secondary">{language === "de" ? "Produkt wird geladen..." : "Product laden..."}</Typography>
          </Stack>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && product && (
          <Stack spacing={2.2}>
            <Typography variant="h3" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}>
              {product.name}
            </Typography>

            <Box
              data-fly-card
              component="img"
              src={product.image_url || "/menuicon5.png"}
              alt={product.name}
              sx={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 3, backgroundColor: "rgba(255,255,255,0.72)" }}
            />

            <Typography color="text.secondary">
              {product.long_description || product.description}
            </Typography>

            <Typography sx={{ fontWeight: 700, fontSize: "1.2rem" }}>
              {formatPrice(product.price, language)}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {language === "de" ? "Op voorraad" : "Op voorraad"}: {Math.max(0, Number(product.stock_quantity || 0) - currentCartQuantity)}
            </Typography>

            {cartMessage && <Alert severity={cartMessageSeverity}>{cartMessage}</Alert>}

            <Stack direction="row" spacing={1.2} flexWrap="wrap">
              <Button
                variant="contained"
                onClick={(event) => handleAdd(document.querySelector("[data-fly-card]") || event.currentTarget)}
                sx={bookingButtonSx}
                disabled={
                  Number(product.stock_quantity || 0) <= 0
                  || currentCartQuantity >= Number(product.stock_quantity || 0)
                }
              >
                {Number(product.stock_quantity || 0) <= 0
                  || currentCartQuantity >= Number(product.stock_quantity || 0)
                  ? (language === "de" ? "Ausverkauft" : "Uitverkocht")
                  : (language === "de" ? "In den Warenkorb" : "In winkelmand")}
              </Button>
              <Button
                component={RouterLink}
                to={product.group_slug ? `/landing/webshop/group/${product.group_slug}` : "/landing/webshop"}
                variant="outlined"
              >
                {language === "de" ? "Zurueck zum Webshop" : "Terug naar webshop"}
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
