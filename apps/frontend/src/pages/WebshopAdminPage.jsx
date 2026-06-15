import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useAuth } from "../auth/AuthProvider";
import { useLanguage } from "../i18n/LanguageProvider";
import { apiFetch, parseApiError } from "../lib/api";

const emptyForm = {
  group: "",
  name: "",
  slug: "",
  description: "",
  long_description: "",
  price: "",
  stock_quantity: "",
  is_active: true,
};

const MAX_IMAGE_SIDE = 2000;
const TARGET_IMAGE_BYTES = 1_500_000;

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Kon afbeelding niet lezen."));
      image.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("Kon bestand niet lezen."));
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

async function compressImageFile(file) {
  if (!file || !String(file.type || "").startsWith("image/")) {
    return { file, compressed: false };
  }

  if (file.size <= TARGET_IMAGE_BYTES) {
    return { file, compressed: false };
  }

  const image = await loadImageFromFile(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return { file, compressed: false };
  }
  context.drawImage(image, 0, 0, width, height);

  const qualitySteps = [0.86, 0.78, 0.7, 0.62, 0.55];
  let bestBlob = null;

  for (const quality of qualitySteps) {
    const blob = await canvasToBlob(canvas, quality);
    if (!blob) {
      continue;
    }
    bestBlob = blob;
    if (blob.size <= TARGET_IMAGE_BYTES) {
      break;
    }
  }

  if (!bestBlob) {
    return { file, compressed: false };
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
  const compressedFile = new File([bestBlob], `${baseName}.jpg`, { type: "image/jpeg" });
  return { file: compressedFile, compressed: compressedFile.size < file.size };
}

export default function WebshopAdminPage() {
  const { authFetch } = useAuth();
  const { language } = useLanguage();

  const [groups, setGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageNotice, setImageNotice] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const groupsById = useMemo(() => {
    return groups.reduce((acc, group) => {
      acc[group.id] = group;
      return acc;
    }, {});
  }, [groups]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const [groupsResponse, productsResponse] = await Promise.all([
          apiFetch("/api/product-groups/"),
          authFetch("/api/admin/webshop/products/"),
        ]);

        if (!groupsResponse.ok) {
          throw new Error(await parseApiError(groupsResponse));
        }
        if (!productsResponse.ok) {
          throw new Error(await parseApiError(productsResponse));
        }

        const [groupsPayload, productsPayload] = await Promise.all([
          groupsResponse.json(),
          productsResponse.json(),
        ]);

        if (!active) {
          return;
        }

        setGroups(groupsPayload);
        setProducts(productsPayload);

        if (!form.group && groupsPayload.length > 0) {
          setForm((current) => ({ ...current, group: String(groupsPayload[0].id) }));
        }
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err.message || (language === "de" ? "Laden fehlgeschlagen." : "Laden mislukt."));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [authFetch, language]);

  useEffect(() => {
    if (!imageFile) {
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  const resetForm = () => {
    setEditingProductId(null);
    setForm((current) => ({
      ...emptyForm,
      group: current.group || (groups[0] ? String(groups[0].id) : ""),
    }));
    setImageFile(null);
    setImagePreviewUrl("");
    setImageNotice("");
  };

  const startEdit = (product) => {
    setError("");
    setSuccess("");
    setEditingProductId(product.id);
    setForm({
      group: String(product.group || ""),
      name: product.name || "",
      slug: product.slug || "",
      description: product.description || "",
      long_description: product.long_description || "",
      price: String(product.price || ""),
      stock_quantity: String(product.stock_quantity || "0"),
      is_active: Boolean(product.is_active),
    });
    setImageFile(null);
    setImagePreviewUrl(product.image_url || "");
    setImageNotice("");
  };

  const handleImageSelection = async (event) => {
    const selected = event.target.files?.[0] || null;
    if (!selected) {
      setImageFile(null);
      setImageNotice("");
      return;
    }

    setImageNotice("");
    try {
      const { file: preparedFile, compressed } = await compressImageFile(selected);
      setImageFile(preparedFile);
      if (compressed) {
        setImageNotice(
          language === "de"
            ? `Foto gecomprimeerd van ${(selected.size / 1024 / 1024).toFixed(1)} MB naar ${(preparedFile.size / 1024 / 1024).toFixed(1)} MB.`
            : `Foto gecomprimeerd van ${(selected.size / 1024 / 1024).toFixed(1)} MB naar ${(preparedFile.size / 1024 / 1024).toFixed(1)} MB.`
        );
      }
    } catch {
      setImageFile(selected);
      setImageNotice("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.group || !form.price) {
      setError(language === "de" ? "Vul minimaal naam, groep en prijs in." : "Vul minimaal naam, groep en prijs in.");
      return;
    }

    const payload = new FormData();
    payload.append("group", form.group);
    payload.append("name", form.name.trim());
    payload.append("slug", form.slug.trim());
    payload.append("description", form.description);
    payload.append("long_description", form.long_description);
    payload.append("price", form.price);
    payload.append("stock_quantity", form.stock_quantity || "0");
    payload.append("is_active", String(form.is_active));
    if (imageFile) {
      payload.append("image_file", imageFile);
    }

    setSaving(true);
    try {
      const isEditing = Boolean(editingProductId);
      const url = isEditing ? `/api/admin/webshop/products/${editingProductId}/` : "/api/admin/webshop/products/";
      const response = await authFetch(url, {
        method: isEditing ? "PATCH" : "POST",
        body: payload,
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const saved = await response.json();
      setProducts((current) => {
        if (isEditing) {
          return current.map((product) => (product.id === saved.id ? saved : product));
        }
        return [saved, ...current];
      });
      setSuccess(
        isEditing
          ? (language === "de" ? "Product succesvol bijgewerkt." : "Product succesvol bijgewerkt.")
          : (language === "de" ? "Product succesvol toegevoegd." : "Product succesvol toegevoegd.")
      );
      resetForm();
    } catch (err) {
      setError(err.message || (language === "de" ? "Opslaan mislukt." : "Opslaan mislukt."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      language === "de"
        ? `Weet je zeker dat je \"${product.name}\" wilt verwijderen?`
        : `Weet je zeker dat je \"${product.name}\" wilt verwijderen?`
    );
    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setDeletingProductId(product.id);
    try {
      const response = await authFetch(`/api/admin/webshop/products/${product.id}/`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      setProducts((current) => current.filter((entry) => entry.id !== product.id));
      if (editingProductId === product.id) {
        resetForm();
      }
      setSuccess(language === "de" ? "Product verwijderd." : "Product verwijderd.");
    } catch (err) {
      setError(err.message || (language === "de" ? "Verwijderen mislukt." : "Verwijderen mislukt."));
    } finally {
      setDeletingProductId(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ width: { xs: "100%", md: "92%" }, ml: { xs: -0.5, md: -0.5 } }}>
        <Paper
          sx={{
            p: { xs: 2.5, md: 3.5 },
            borderRadius: 4,
            border: "1px solid rgba(140, 124, 104, 0.22)",
            background: "linear-gradient(180deg, rgba(251,248,243,0.95) 0%, rgba(240,232,222,0.95) 100%)",
          }}
          elevation={3}
        >
          <Stack spacing={2}>
            <Typography variant="h3" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}>
              {language === "de" ? "Webshop Verwaltung" : "Webshop beheer"}
            </Typography>
            <Typography color="text.secondary">
              {language === "de"
                ? "Voeg eenvoudig producten toe met voorraad, groep en foto."
                : "Voeg eenvoudig producten toe met voorraad, groep en foto."}
            </Typography>

            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.78)" }}>
              <Stack component="form" spacing={1.2} onSubmit={handleSubmit}>
                {editingProductId && (
                  <Alert severity="info">
                    {language === "de" ? "Je bewerkt nu een bestaand product." : "Je bewerkt nu een bestaand product."}
                  </Alert>
                )}
                <Grid container spacing={1.2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      label={language === "de" ? "Productgroep" : "Productgroep"}
                      value={form.group}
                      fullWidth
                      onChange={(event) => setForm((current) => ({ ...current, group: event.target.value }))}
                    >
                      {groups.map((group) => (
                        <MenuItem key={group.id} value={String(group.id)}>
                          {group.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label={language === "de" ? "Naam" : "Naam"}
                      value={form.name}
                      fullWidth
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Slug (optioneel)"
                      value={form.slug}
                      fullWidth
                      onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label={language === "de" ? "Prijs (EUR)" : "Prijs (EUR)"}
                      type="number"
                      inputProps={{ step: "0.01", min: "0" }}
                      value={form.price}
                      fullWidth
                      onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label={language === "de" ? "Voorraad" : "Voorraad"}
                      type="number"
                      inputProps={{ min: "0" }}
                      value={form.stock_quantity}
                      fullWidth
                      onChange={(event) => setForm((current) => ({ ...current, stock_quantity: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      label={language === "de" ? "Actief" : "Actief"}
                      value={String(form.is_active)}
                      fullWidth
                      onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.value === "true" }))}
                    >
                      <MenuItem value="true">{language === "de" ? "Ja" : "Ja"}</MenuItem>
                      <MenuItem value="false">{language === "de" ? "Nee" : "Nee"}</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label={language === "de" ? "Korte beschrijving" : "Korte beschrijving"}
                      value={form.description}
                      fullWidth
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label={language === "de" ? "Lange beschrijving" : "Lange beschrijving"}
                      value={form.long_description}
                      multiline
                      minRows={3}
                      fullWidth
                      onChange={(event) => setForm((current) => ({ ...current, long_description: event.target.value }))}
                    />
                  </Grid>
                </Grid>

                <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap">
                  <Button variant="outlined" component="label">
                    {language === "de" ? "Foto kiezen" : "Foto kiezen"}
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelection}
                    />
                  </Button>
                  {imageFile && <Typography variant="body2">{imageFile.name}</Typography>}
                </Stack>

                {imageNotice && <Alert severity="info">{imageNotice}</Alert>}

                {imagePreviewUrl && (
                  <Box
                    component="img"
                    src={imagePreviewUrl}
                    alt="Preview"
                    sx={{ width: 200, height: 140, objectFit: "cover", borderRadius: 2, border: "1px solid rgba(0,0,0,0.12)" }}
                  />
                )}

                <Button type="submit" variant="contained" disabled={saving || loading} sx={{ alignSelf: "flex-start" }}>
                  {saving
                    ? (language === "de" ? "Wird gespeichert..." : "Opslaan...")
                    : editingProductId
                      ? (language === "de" ? "Product bijwerken" : "Product bijwerken")
                      : (language === "de" ? "Product toevoegen" : "Product toevoegen")}
                </Button>

                {editingProductId && (
                  <Button variant="text" onClick={resetForm} sx={{ alignSelf: "flex-start" }}>
                    {language === "de" ? "Bewerken annuleren" : "Bewerken annuleren"}
                  </Button>
                )}
              </Stack>
            </Paper>

            <Typography variant="h5" sx={{ mt: 1 }}>
              {language === "de" ? "Bestaande producten" : "Bestaande producten"}
            </Typography>

            {loading && <Alert severity="info">{language === "de" ? "Laden..." : "Laden..."}</Alert>}

            {!loading && (
              <Grid container spacing={1.2}>
                {products.map((product) => (
                  <Grid item xs={12} md={6} lg={4} key={product.id}>
                    <Card variant="outlined" sx={{ borderRadius: 3, backgroundColor: "rgba(255,255,255,0.82)", height: "100%" }}>
                      {product.image_url && (
                        <Box component="img" src={product.image_url} alt={product.name} sx={{ width: "100%", height: 150, objectFit: "cover" }} />
                      )}
                      <CardContent>
                        <Stack spacing={0.6}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>{product.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {groupsById[product.group]?.name || product.group_name || "-"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">{product.description}</Typography>
                          <Typography variant="body2">
                            {language === "de" ? "Prijs" : "Prijs"}: {product.price}
                          </Typography>
                          <Typography variant="body2">
                            {language === "de" ? "Voorraad" : "Voorraad"}: {product.stock_quantity}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
                            <Button size="small" variant="outlined" onClick={() => startEdit(product)}>
                              {language === "de" ? "Bewerken" : "Bewerken"}
                            </Button>
                            <Button
                              size="small"
                              variant="text"
                              color="error"
                              onClick={() => handleDelete(product)}
                              disabled={deletingProductId === product.id}
                            >
                              {deletingProductId === product.id
                                ? (language === "de" ? "Verwijderen..." : "Verwijderen...")
                                : (language === "de" ? "Verwijderen" : "Verwijderen")}
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
