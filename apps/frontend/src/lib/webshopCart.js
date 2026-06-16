const CART_STORAGE_KEY = "grolle_webshop_cart";

export function formatPrice(value, language) {
  const locale = language === "de" ? "de-DE" : "nl-NL";
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(Number(value || 0));
}

export function readCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCart(items) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("cart-updated"));
  } catch {
    // Ignore storage errors and keep in-memory state.
  }
}

export function addToCart(items, product, maxQuantity = null) {
  const parsedMax = Number(maxQuantity);
  const hasMax = Number.isFinite(parsedMax) && parsedMax >= 0;
  const existing = items.find((item) => item.id === product.id);

  if (existing) {
    const nextQuantity = Number(existing.quantity || 0) + 1;
    if (hasMax && nextQuantity > parsedMax) {
      return items;
    }

    return items.map((item) =>
      item.id === product.id
        ? {
            ...item,
            quantity: nextQuantity,
            stock_quantity: Number(product.stock_quantity ?? item.stock_quantity ?? 0),
          }
        : item
    );
  }

  if (hasMax && parsedMax <= 0) {
    return items;
  }

  return [
    ...items,
    {
      id: product.id,
      name: product.name,
      price: product.price,
      stock_quantity: Number(product.stock_quantity || 0),
      quantity: 1,
    },
  ];
}

export function updateCartQuantity(items, productId, nextQuantity, maxQuantity = null) {
  const parsedMax = Number(maxQuantity);
  const hasMax = Number.isFinite(parsedMax) && parsedMax >= 0;

  if (nextQuantity <= 0) {
    return items.filter((item) => item.id !== productId);
  }

  const boundedQuantity = hasMax ? Math.min(nextQuantity, parsedMax) : nextQuantity;

  return items.map((item) =>
    item.id === productId ? { ...item, quantity: boundedQuantity } : item
  );
}

export function removeFromCart(items, productId) {
  return items.filter((item) => item.id !== productId);
}

export function getCartSummary(items) {
  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalAmount = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  return { totalItems, totalAmount };
}
