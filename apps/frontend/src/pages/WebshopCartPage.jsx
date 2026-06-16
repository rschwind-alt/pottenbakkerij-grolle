import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageProvider";
import { apiFetch, parseApiError } from "../lib/api";
import { bookingButtonSx } from "../lib/buttonStyles";
import { formatPrice, getCartSummary, readCart, removeFromCart, updateCartQuantity, writeCart } from "../lib/webshopCart";

export default function WebshopCartPage() {
  const { language } = useLanguage();
  const [cartItems, setCartItems] = useState(() => readCart());
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    notes: "",
  });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState("");
  const [stockByProduct, setStockByProduct] = useState({});
  const [stockNotice, setStockNotice] = useState("");

  const cartSummary = useMemo(() => getCartSummary(cartItems), [cartItems]);
  const cartProductKey = useMemo(
    () => cartItems.map((item) => item.id).sort((a, b) => a - b).join(","),
    [cartItems]
  );

  useEffect(() => {
    if (!cartProductKey) {
      setStockByProduct({});
      return;
    }

    let active = true;

    async function syncStock() {
      try {
        const response = await apiFetch("/api/products/");
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        if (!active || !Array.isArray(payload)) {
          return;
        }

        const nextStock = {};
        payload.forEach((product) => {
          nextStock[product.id] = Number(product.stock_quantity || 0);
        });

        setStockByProduct(nextStock);

        setCartItems((current) => {
          let changed = false;
          const adjusted = current
            .map((item) => {
              const available = Number(nextStock[item.id] ?? item.stock_quantity ?? 0);
              const currentQuantity = Number(item.quantity || 0);
              const boundedQuantity = Math.min(currentQuantity, available);
              if (boundedQuantity !== currentQuantity) {
                changed = true;
              }
              return {
                ...item,
                stock_quantity: available,
                quantity: boundedQuantity,
              };
            })
            .filter((item) => Number(item.quantity || 0) > 0);

          if (changed) {
            writeCart(adjusted);
            setStockNotice(
              language === "de"
                ? "Een of meer aantallen zijn aangepast aan de actuele voorraad."
                : "Een of meer aantallen zijn aangepast aan de actuele voorraad."
            );
            return adjusted;
          }

          return current;
        });
      } catch {
        // Keep existing cart if stock refresh fails.
      }
    }

    syncStock();

    return () => {
      active = false;
    };
  }, [cartProductKey, language]);

  const handleQuantityChange = (productId, delta) => {
    setCartItems((current) => {
      const item = current.find((entry) => entry.id === productId);
      if (!item) {
        return current;
      }

      const available = Number(stockByProduct[productId] ?? item.stock_quantity ?? 0);
      const desiredQuantity = Number(item.quantity || 0) + delta;
      if (delta > 0 && desiredQuantity > available) {
        setStockNotice(
          language === "de"
            ? `Maximum voorraad bereikt voor ${item.name}.`
            : `Maximum voorraad bereikt voor ${item.name}.`
        );
        return current;
      }

      const next = updateCartQuantity(current, productId, desiredQuantity, available);
      writeCart(next);
      setStockNotice("");
      return next;
    });
  };

  const handleRemove = (productId) => {
    setCartItems((current) => {
      const next = removeFromCart(current, productId);
      writeCart(next);
      return next;
    });
  };

  const handleCheckout = async () => {
    setCheckoutError("");
    setCheckoutSuccess("");

    if (!checkoutForm.customerName.trim() || !checkoutForm.customerEmail.trim()) {
      setCheckoutError(language === "de" ? "Naam en e-mail zijn verplicht." : "Naam en e-mail zijn verplicht.");
      return;
    }
    if (cartItems.length === 0) {
      setCheckoutError(language === "de" ? "Je winkelmand is leeg." : "Je winkelmand is leeg.");
      return;
    }

    setCheckoutLoading(true);
    try {
      const response = await apiFetch("/api/webshop/orders/", {
        method: "POST",
        body: JSON.stringify({
          customer_name: checkoutForm.customerName,
          customer_email: checkoutForm.customerEmail,
          customer_phone: checkoutForm.customerPhone,
          notes: checkoutForm.notes,
          items: cartItems.map((item) => ({ product_id: item.id, quantity: item.quantity })),
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const payload = await response.json();
      const orderId = payload?.order?.id;

      setCartItems([]);
      writeCart([]);
      setCheckoutSuccess(
        language === "de"
          ? `Bestellung erfolgreich gesendet${orderId ? ` (Nr. ${orderId})` : ""}.`
          : `Bestelling succesvol verzonden${orderId ? ` (nr. ${orderId})` : ""}.`
      );
    } catch (error) {
      setCheckoutError(error.message || (language === "de" ? "Bestelling kon niet worden verzonden." : "Bestelling kon niet worden verzonden."));
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box
        sx={{
          width: { xs: "100%", md: "72%" },
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
          <Stack spacing={1.4}>
            <Typography variant="h3" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}>
              {language === "de" ? "Warenkorb" : "Winkelmand"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {language === "de"
                ? "Pas aantallen aan en verstuur daarna je bestelling."
                : "Pas aantallen aan en verstuur daarna je bestelling."}
            </Typography>

            {cartItems.length === 0 && (
              <Alert severity="info">
                {language === "de" ? "Je winkelmand is leeg." : "Je winkelmand is leeg."}
              </Alert>
            )}

            {stockNotice && <Alert severity="warning">{stockNotice}</Alert>}

            <Stack spacing={0.8}>
              {cartItems.map((item) => (
                <Paper key={item.id} variant="outlined" sx={{ p: 1, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.7)" }}>
                  <Stack spacing={0.6}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatPrice(item.price, language)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {language === "de" ? "Op voorraad" : "Op voorraad"}: {Number(stockByProduct[item.id] ?? item.stock_quantity ?? 0)}
                    </Typography>
                    <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" sx={{ rowGap: 0.8 }}>
                      <Button size="small" variant="outlined" onClick={() => handleQuantityChange(item.id, -1)}>-</Button>
                      <Typography variant="body2" sx={{ minWidth: 16, textAlign: "center" }}>{item.quantity}</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleQuantityChange(item.id, 1)}
                        disabled={Number(item.quantity || 0) >= Number(stockByProduct[item.id] ?? item.stock_quantity ?? 0)}
                      >
                        +
                      </Button>
                      <Button size="small" variant="text" color="error" onClick={() => handleRemove(item.id)}>
                        {language === "de" ? "Entfernen" : "Verwijder"}
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>

            <Typography variant="body2">
              {language === "de" ? "Artikel" : "Artikelen"}: <strong>{cartSummary.totalItems}</strong>
            </Typography>
            <Typography variant="body2">
              {language === "de" ? "Zwischensumme" : "Subtotaal"}: <strong>{formatPrice(cartSummary.totalAmount, language)}</strong>
            </Typography>

            <TextField
              label={language === "de" ? "Naam" : "Naam"}
              size="small"
              value={checkoutForm.customerName}
              onChange={(event) => setCheckoutForm((current) => ({ ...current, customerName: event.target.value }))}
            />
            <TextField
              label="E-mail"
              size="small"
              value={checkoutForm.customerEmail}
              onChange={(event) => setCheckoutForm((current) => ({ ...current, customerEmail: event.target.value }))}
            />
            <TextField
              label={language === "de" ? "Telefon (optional)" : "Telefoon (optioneel)"}
              size="small"
              value={checkoutForm.customerPhone}
              onChange={(event) => setCheckoutForm((current) => ({ ...current, customerPhone: event.target.value }))}
            />
            <TextField
              label={language === "de" ? "Opmerking" : "Opmerking"}
              size="small"
              multiline
              minRows={2}
              value={checkoutForm.notes}
              onChange={(event) => setCheckoutForm((current) => ({ ...current, notes: event.target.value }))}
            />

            {checkoutError && <Alert severity="error">{checkoutError}</Alert>}
            {checkoutSuccess && <Alert severity="success">{checkoutSuccess}</Alert>}

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ rowGap: 1 }}>
              <Button variant="contained" onClick={handleCheckout} disabled={checkoutLoading || cartItems.length === 0} sx={bookingButtonSx}>
                {checkoutLoading
                  ? (language === "de" ? "Wird gesendet..." : "Verzenden...")
                  : (language === "de" ? "Bestellung senden" : "Bestelling versturen")}
              </Button>
              <Button component={RouterLink} to="/landing/webshop" variant="outlined">
                {language === "de" ? "Zurueck zum Webshop" : "Terug naar webshop"}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
