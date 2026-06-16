import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Grid, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageProvider";
import { apiFetch } from "../lib/api";
import { bookingButtonSx } from "../lib/buttonStyles";
import { animateFlyToCart } from "../lib/cartAnimation";
import { addToCart, formatPrice, getCartSummary, readCart, writeCart } from "../lib/webshopCart";

export default function WebshopPage() {
  const { groupSlug } = useParams();
  const { language, t } = useLanguage();

  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState("");

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");

  const [cartItems, setCartItems] = useState([]);
  const [cartNotice, setCartNotice] = useState("");
  const [cartNoticeSeverity, setCartNoticeSeverity] = useState("success");

  useEffect(() => {
    setCartItems(readCart());
  }, []);

  useEffect(() => {
    setCartNotice("");
    setCartNoticeSeverity("success");
  }, [groupSlug]);

  useEffect(() => {
    let active = true;

    async function loadGroups() {
      setGroupsLoading(true);
      setGroupsError("");

      try {
        const response = await apiFetch("/api/product-groups/");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (!active) {
          return;
        }
        setGroups(payload);
      } catch {
        if (!active) {
          return;
        }
        setGroupsError(
          language === "de"
            ? "Produktgruppen konnten nicht geladen werden. Bitte versuche es spaeter erneut."
            : "Productgroepen konden niet worden geladen. Probeer het later opnieuw."
        );
      } finally {
        if (active) {
          setGroupsLoading(false);
        }
      }
    }

    loadGroups();

    return () => {
      active = false;
    };
  }, [language]);

  useEffect(() => {
    if (!groupSlug) {
      setProducts([]);
      setProductsError("");
      setProductsLoading(false);
      return;
    }

    let active = true;

    async function loadProducts() {
      setProductsLoading(true);
      setProductsError("");

      try {
        const response = await apiFetch(`/api/products/?group=${encodeURIComponent(groupSlug)}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (!active) {
          return;
        }
        setProducts(payload);
      } catch {
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
  }, [groupSlug, language]);

  const cartSummary = useMemo(() => getCartSummary(cartItems), [cartItems]);
  const selectedGroup = useMemo(() => groups.find((group) => group.slug === groupSlug), [groups, groupSlug]);
  const cartQuantityByProduct = useMemo(
    () => cartItems.reduce((acc, item) => ({ ...acc, [item.id]: Number(item.quantity || 0) }), {}),
    [cartItems]
  );

  const handleAddToCart = (product, sourceElement = null) => {
    const availableStock = Number(product.stock_quantity || 0);

    setCartItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      const existingQuantity = Number(existing?.quantity || 0);
      if (existingQuantity >= availableStock) {
        setCartNoticeSeverity("warning");
        setCartNotice(
          language === "de"
            ? `Maximum voorraad bereikt voor ${product.name}.`
            : `Maximum voorraad bereikt voor ${product.name}.`
        );
        return current;
      }

      const next = addToCart(current, product, availableStock);
      writeCart(next);
      animateFlyToCart(sourceElement, product.image_url);

      setCartNoticeSeverity("success");
      setCartNotice(
        language === "de"
          ? `${product.name} zum Warenkorb hinzugefuegt.`
          : `${product.name} toegevoegd aan je winkelmand.`
      );

      return next;
    });
  };

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

            <Typography variant="h3" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}>
              {groupSlug ? (selectedGroup?.name || (language === "de" ? "Produktgruppe" : "Productgroep")) : (language === "de" ? "Webshop" : "Webshop")}
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 900 }}>
              {groupSlug
                ? (language === "de"
                  ? "Kies hieronder een product uit deze groep."
                  : "Kies hieronder een product uit deze groep.")
                : (language === "de"
                  ? "Waehle eerst eine Produktgruppe. Danach siehst du die dazugehoerigen Produkte."
                  : "Kies eerst een productgroep. Daarna zie je de bijbehorende producten.")}
            </Typography>

            <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap" sx={{ rowGap: 1 }}>
              <Button component={RouterLink} to="/landing/webshop/cart" variant="outlined" sx={bookingButtonSx}>
                {language === "de" ? `Warenkorb ansehen (${cartSummary.totalItems})` : `Bekijk winkelmand (${cartSummary.totalItems})`}
              </Button>
              {groupSlug && (
                <Button component={RouterLink} to="/landing/webshop" variant="outlined">
                  {language === "de" ? "Produktgruppen" : "Productgroepen"}
                </Button>
              )}
              {cartNotice && <Alert severity={cartNoticeSeverity}>{cartNotice}</Alert>}
            </Stack>

            {!groupSlug && groupsLoading && (
              <Stack direction="row" spacing={1.2} alignItems="center">
                <CircularProgress size={20} />
                <Typography color="text.secondary">
                  {language === "de" ? "Produktgruppen werden geladen..." : "Productgroepen laden..."}
                </Typography>
              </Stack>
            )}

            {!groupSlug && groupsError && <Alert severity="error">{groupsError}</Alert>}

            {!groupSlug && !groupsLoading && !groupsError && groups.length === 0 && (
              <Alert severity="info">
                {language === "de" ? "Er zijn nog geen actieve productgroepen." : "Er zijn nog geen actieve productgroepen."}
              </Alert>
            )}

            {!groupSlug && (
              <Grid container spacing={1.5}>
                {groups.map((group) => (
                  <Grid item xs={12} sm={6} md={4} key={group.id}>
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
                      {group.image_url && (
                        <Box
                          component="img"
                          src={group.image_url}
                          alt={group.name}
                          sx={{
                            width: "100%",
                            height: 190,
                            objectFit: "cover",
                            borderRadius: "3px 3px 0 0",
                          }}
                        />
                      )}
                      <CardContent>
                        <Stack spacing={1}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {group.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ minHeight: 44 }}>
                            {group.description || (language === "de" ? "Unieke selectie." : "Unieke selectie.")}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {language === "de" ? "Aantal producten" : "Aantal producten"}: {group.product_count || 0}
                          </Typography>
                          <Button component={RouterLink} to={`/landing/webshop/group/${group.slug}`} variant="contained" sx={{ alignSelf: "flex-start" }}>
                            {language === "de" ? "Openen" : "Openen"}
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {groupSlug && productsLoading && (
              <Stack direction="row" spacing={1.2} alignItems="center">
                <CircularProgress size={20} />
                <Typography color="text.secondary">
                  {language === "de" ? "Produkte werden geladen..." : "Producten laden..."}
                </Typography>
              </Stack>
            )}

            {groupSlug && productsError && <Alert severity="error">{productsError}</Alert>}

            {groupSlug && !productsLoading && !productsError && products.length === 0 && (
              <Alert severity="info">
                {language === "de"
                  ? "Er zijn nog geen actieve producten in deze groep."
                  : "Er zijn nog geen actieve producten in deze groep."}
              </Alert>
            )}

            {groupSlug && (
              <Grid container spacing={1.5}>
                {products.map((product) => (
                  <Grid item xs={12} sm={6} md={4} key={product.id}>
                    <Card
                      data-fly-card
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
                          <Typography variant="caption" color="text.secondary">
                            {language === "de" ? "Op voorraad" : "Op voorraad"}: {Math.max(0, Number(product.stock_quantity || 0) - Number(cartQuantityByProduct[product.id] || 0))}
                          </Typography>
                          <Stack direction="column" spacing={1} alignItems="flex-start">
                            <Button
                              variant="contained"
                              size="small"
                              onClick={(event) => handleAddToCart(product, event.currentTarget.closest("[data-fly-card]") || event.currentTarget)}
                              sx={[bookingButtonSx, { width: "50%" }]}
                              disabled={
                                Number(product.stock_quantity || 0) <= 0
                                || Number(cartQuantityByProduct[product.id] || 0) >= Number(product.stock_quantity || 0)
                              }
                            >
                              {Number(product.stock_quantity || 0) <= 0
                                || Number(cartQuantityByProduct[product.id] || 0) >= Number(product.stock_quantity || 0)
                                ? (language === "de" ? "Ausverkauft" : "Uitverkocht")
                                : (language === "de" ? "In den Warenkorb" : "Koop")}
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
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
