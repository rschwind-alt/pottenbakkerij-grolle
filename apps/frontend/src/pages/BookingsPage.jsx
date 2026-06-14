import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { useLanguage } from "../i18n/LanguageProvider";
import { apiFetch, parseApiError } from "../lib/api";

const ACTIVE_STATUSES = ["nieuw", "gereserveerd", "betaald"];
const DESKTOP_TIMELINE_START_HOUR = 8.5;
const DESKTOP_TIMELINE_END_HOUR = 21;
const DESKTOP_TIMELINE_HEIGHT = 420;
const DESKTOP_TIMELINE_TOTAL_MINUTES = (DESKTOP_TIMELINE_END_HOUR - DESKTOP_TIMELINE_START_HOUR) * 60;
const TIME_AXIS_LABELS = ["08:30", "10:30", "12:30", "14:30", "16:30", "18:30", "20:30"];

function formatDateTime(value, locale) {
  return new Date(value).toLocaleString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value, locale) {
  return new Date(value).toLocaleDateString(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function minutesFromDayStart(value) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function agendaBlockTop(item) {
  const timelineStart = DESKTOP_TIMELINE_START_HOUR * 60;
  const startMinutes = minutesFromDayStart(item.starts_at);
  const offsetMinutes = Math.max(0, Math.min(DESKTOP_TIMELINE_TOTAL_MINUTES, startMinutes - timelineStart));
  return Math.round((offsetMinutes / DESKTOP_TIMELINE_TOTAL_MINUTES) * DESKTOP_TIMELINE_HEIGHT);
}

function agendaBlockHeight(item) {
  const start = new Date(item.starts_at).getTime();
  const end = new Date(item.ends_at).getTime();
  const durationMinutes = Math.max(Math.round((end - start) / 60000), 30);
  const proportionalHeight = Math.round((durationMinutes / DESKTOP_TIMELINE_TOTAL_MINUTES) * DESKTOP_TIMELINE_HEIGHT);
  return Math.min(140, Math.max(30, proportionalHeight));
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

function todayValue() {
  return toDateKey(new Date());
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function maxDateKey(left, right) {
  return left > right ? left : right;
}

function computeInitialWeekOffset(dateKey) {
  const todayWeek = startOfIsoWeek(new Date());
  const targetDate = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(targetDate.getTime())) {
    return 0;
  }

  const targetWeek = startOfIsoWeek(targetDate);
  const diffMs = targetWeek.getTime() - todayWeek.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return Math.max(0, diffWeeks);
}

function startOfIsoWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function buildWeekDays(now) {
  const weekStart = startOfIsoWeek(now);
  return Array.from({ length: 7 }, (_, index) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + index);
    return {
      key: toDateKey(dayDate),
      date: dayDate,
    };
  });
}

function formatWeekRangeLabel(weekDays, locale) {
  if (!weekDays.length) {
    return "";
  }

  const firstDay = weekDays[0].date;
  const lastDay = weekDays[weekDays.length - 1].date;
  const startLabel = firstDay.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
  });
  const endLabel = lastDay.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
  });

  return `${startLabel} - ${endLabel}`;
}

function composeBookingNotes({ contactName, contactEmail, contactPhone, participants, notes }, t) {
  const lines = [
    `${t("bookingsPage.notes.contactPerson")}: ${contactName}`,
    `${t("bookingsPage.notes.email")}: ${contactEmail}`,
    `${t("bookingsPage.notes.participants")}: ${participants}`,
  ];

  if (contactPhone.trim()) {
    lines.push(`${t("bookingsPage.notes.phone")}: ${contactPhone.trim()}`);
  }

  if (notes.trim()) {
    lines.push(`${t("bookingsPage.notes.remark")}: ${notes.trim()}`);
  }

  return lines.join("\n");
}

function groupSlotsByDate(slots) {
  return slots.reduce((accumulator, slot) => {
    const key = slot.starts_at.slice(0, 10);
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(slot);
    return accumulator;
  }, {});
}

export default function BookingsPage() {
  const [searchParams] = useSearchParams();
  const { authFetch, user, isAuthenticated } = useAuth();
  const { t, locale, language } = useLanguage();
  const initialActivityId = searchParams.get("activity") || "";
  const lockedActivityId = initialActivityId;
  const initialDate = searchParams.get("date") || todayValue();
  const initialTimeslotId = searchParams.get("timeslot") || "";
  const isDirectActivityFlow = Boolean(initialActivityId);
  const initialWeekOffset = isDirectActivityFlow ? computeInitialWeekOffset(initialDate) : 0;
  const autoAdvanceFromQueryRef = useRef(Boolean(initialTimeslotId));
  const [activities, setActivities] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [allPlanningSlots, setAllPlanningSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeStep, setActiveStep] = useState(initialActivityId ? 1 : 0);
  const [weekOffset, setWeekOffset] = useState(initialWeekOffset);
  const [form, setForm] = useState({
    activityId: initialActivityId,
    date: initialDate,
    timeslotId: initialTimeslotId,
    contactName: user?.first_name || user?.username || "",
    contactEmail: user?.email || "",
    contactPhone: "",
    participants: 1,
    notes: "",
  });
  const [error, setError] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [confirmation, setConfirmation] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const bookingEndpoint = isAuthenticated
    ? (user?.role === "klant" ? "/api/bookings/mine/" : "/api/bookings/")
    : null;
  const steps = t("bookingsPage.steps");
  const statusMeta = {
    nieuw: { label: t("bookingsPage.statuses.nieuw"), color: "warning" },
    gereserveerd: { label: t("bookingsPage.statuses.gereserveerd"), color: "info" },
    betaald: { label: t("bookingsPage.statuses.betaald"), color: "success" },
    geannuleerd: { label: t("bookingsPage.statuses.geannuleerd"), color: "default" },
    no_show: { label: t("bookingsPage.statuses.no_show"), color: "error" },
  };

  const selectedActivity = activities.find((activity) => String(activity.id) === String(form.activityId));
  const selectedSlot = availableSlots.find((slot) => String(slot.id) === String(form.timeslotId));
  const planningMap = Object.fromEntries(allPlanningSlots.map((slot) => [slot.id, slot]));
  const groupedSlots = groupSlotsByDate(availableSlots);
  const agendaWeekDays = useMemo(() => {
    const base = startOfIsoWeek(new Date());
    const target = addDays(base, weekOffset * 7);
    return buildWeekDays(target);
  }, [weekOffset]);
  const agendaWeekRangeLabel = useMemo(
    () => formatWeekRangeLabel(agendaWeekDays, locale),
    [agendaWeekDays, locale]
  );
  const agendaWeekColumns = useMemo(
    () =>
      agendaWeekDays.map((day) => ({
        ...day,
        items: [...(groupedSlots[day.key] || [])].sort((left, right) => left.starts_at.localeCompare(right.starts_at)),
      })),
    [agendaWeekDays, groupedSlots]
  );
  const hasAgendaWeekItems = useMemo(
    () => agendaWeekColumns.some((column) => column.items.length > 0),
    [agendaWeekColumns]
  );

  const loadActivities = async () => {
    const response = await apiFetch("/api/timeslots/available/");
    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const payload = await response.json();
    const uniqueActivities = [];
    const seenIds = new Set();

    payload.forEach((slot) => {
      if (!seenIds.has(slot.activity)) {
        seenIds.add(slot.activity);
        uniqueActivities.push({ id: slot.activity, name: slot.activity_name });
      }
    });

    const sorted = uniqueActivities.sort((left, right) => left.name.localeCompare(right.name, language));
    setActivities(
      isDirectActivityFlow
        ? sorted.filter((activity) => String(activity.id) === String(lockedActivityId))
        : sorted
    );
  };

  const loadAvailableSlots = async () => {
    setLoadingSlots(true);
    const params = new URLSearchParams({ available: "1" });

    if (form.activityId) {
      params.set("activity", form.activityId);
    }
    if (isDirectActivityFlow) {
      const weekStart = agendaWeekDays[0]?.key;
      const weekEnd = agendaWeekDays[6]?.key;
      const today = todayValue();
      if (weekStart && weekEnd) {
        params.set("date_from", maxDateKey(weekStart, today));
        params.set("date_to", weekEnd);
      }
    } else if (form.date) {
      params.set("date", form.date);
    }

    const response = await apiFetch(`/api/timeslots/available/?${params.toString()}`);
    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const payload = await response.json();
    setAvailableSlots(payload);
    setLastUpdated(new Date());

    if (form.timeslotId && !payload.some((slot) => String(slot.id) === String(form.timeslotId))) {
      setForm((current) => ({ ...current, timeslotId: "" }));
      setError(t("bookingsPage.slotNoLongerAvailable"));
      setActiveStep(1);
    }
    setLoadingSlots(false);
  };

  const loadDashboard = async () => {
    if (!isAuthenticated || !bookingEndpoint) {
      setAllPlanningSlots([]);
      setBookings([]);
      setLoadingDashboard(false);
      return;
    }

    setLoadingDashboard(true);
    setDashboardError("");

    const [planningResponse, bookingsResponse] = await Promise.all([
      authFetch("/api/planning/"),
      authFetch(bookingEndpoint),
    ]);

    if (!planningResponse.ok) {
      throw new Error(await parseApiError(planningResponse));
    }
    if (!bookingsResponse.ok) {
      throw new Error(await parseApiError(bookingsResponse));
    }

    setAllPlanningSlots(await planningResponse.json());
    setBookings(await bookingsResponse.json());
    setLoadingDashboard(false);
  };

  useEffect(() => {
    setForm((current) => ({
      ...current,
      contactName: current.contactName || user?.first_name || user?.username || "",
      contactEmail: current.contactEmail || user?.email || "",
    }));
  }, [user]);

  useEffect(() => {
    Promise.all([loadActivities(), loadDashboard()]).catch((err) => {
      const message = err.message || t("bookingsPage.loadFailed");
      setError(message);
      if (isAuthenticated) {
        setDashboardError(message);
      }
      setLoadingDashboard(false);
      setLoadingSlots(false);
    });
  }, [isAuthenticated]);

  useEffect(() => {
    loadAvailableSlots().catch((err) => {
      setError(err.message || t("bookingsPage.slotsLoadFailed"));
      setLoadingSlots(false);
    });

    const intervalId = window.setInterval(() => {
      loadAvailableSlots().catch(() => {});
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [form.activityId, form.date, isDirectActivityFlow, agendaWeekDays]);

  useEffect(() => {
    if (!autoAdvanceFromQueryRef.current || loadingSlots) {
      return;
    }

    if (!form.timeslotId) {
      autoAdvanceFromQueryRef.current = false;
      return;
    }

    const hasTimeslot = availableSlots.some((slot) => String(slot.id) === String(form.timeslotId));
    if (hasTimeslot) {
      setActiveStep((current) => Math.max(current, 2));
    }
    autoAdvanceFromQueryRef.current = false;
  }, [availableSlots, form.timeslotId, loadingSlots]);

  useEffect(() => {
    if (!selectedSlot) {
      return;
    }

    const nextParticipants = Math.max(1, Math.min(Number(form.participants || 1), Number(selectedSlot.available_spots || 1)));
    if (nextParticipants !== Number(form.participants || 1)) {
      setForm((current) => ({ ...current, participants: nextParticipants }));
    }
  }, [selectedSlot, form.participants]);

  const goNext = () => {
    setError("");

    if (activeStep === 0 && !form.activityId) {
      setError(t("bookingsPage.selectActivityFirst"));
      return;
    }

    if (activeStep === 1 && (!form.date || !form.timeslotId)) {
      setError(t("bookingsPage.chooseDateAndTime"));
      return;
    }

    if (activeStep === 2) {
      if (!form.contactName.trim()) {
        setError(t("bookingsPage.enterContactName"));
        return;
      }
      if (!form.contactEmail.trim()) {
        setError(t("bookingsPage.enterEmail"));
        return;
      }
      if (!Number.isInteger(Number(form.participants)) || Number(form.participants) < 1) {
        setError(t("bookingsPage.enterParticipants"));
        return;
      }
      if (selectedSlot && Number(form.participants) > Number(selectedSlot.available_spots)) {
        setError(t("bookingsPage.participantsTooMany"));
        return;
      }
    }

    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const goBack = () => {
    setError("");
    setActiveStep((current) => Math.max(current - 1, isDirectActivityFlow ? 1 : 0));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!selectedSlot) {
        throw new Error(t("bookingsPage.selectValidTimeslot"));
      }

      const submissionResponse = isAuthenticated
        ? await authFetch("/api/bookings/", {
            method: "POST",
            body: JSON.stringify({
              timeslot: Number(form.timeslotId),
              participants: Number(form.participants || 1),
              notes: composeBookingNotes(form, t),
            }),
          })
        : await apiFetch("/api/bookings/guest/", {
            method: "POST",
            body: JSON.stringify({
              timeslot: Number(form.timeslotId),
              guest_name: form.contactName,
              guest_email: form.contactEmail,
              guest_phone: form.contactPhone,
              participants: Number(form.participants || 1),
              notes: form.notes,
            }),
          });
      if (!submissionResponse.ok) {
        throw new Error(await parseApiError(submissionResponse));
      }

      const payload = await submissionResponse.json();
      setConfirmation({
        booking: payload,
        slot: selectedSlot,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
      });
      setForm({
        activityId: isDirectActivityFlow ? lockedActivityId : "",
        date: todayValue(),
        timeslotId: "",
        contactName: user?.first_name || user?.username || "",
        contactEmail: user?.email || "",
        contactPhone: "",
        participants: 1,
        notes: "",
      });
      setActiveStep(isDirectActivityFlow ? 1 : 0);
      await Promise.all([loadActivities(), loadAvailableSlots(), ...(isAuthenticated ? [loadDashboard()] : [])]);
      setError("");
    } catch (err) {
      setError(err.message || t("bookingsPage.bookingFailed"));
    } finally {
      setSaving(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    setDashboardError("");

    try {
      const response = await authFetch(`/api/bookings/${bookingId}/cancel/`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      await Promise.all([loadAvailableSlots(), loadDashboard()]);
    } catch (err) {
      setDashboardError(err.message || t("bookingsPage.cancelFailed"));
    }
  };

  const renderActivityStep = () => (
    <Stack spacing={2.5}>
      <Typography variant="h5">{t("bookingsPage.step1Title")}</Typography>
      <Typography color="text.secondary">
        {t("bookingsPage.step1Body")}
      </Typography>
      <Grid container spacing={2}>
        {activities.map((activity) => {
          const isSelected = String(activity.id) === String(form.activityId);
          return (
            <Grid item xs={12} sm={6} key={activity.id}>
              <Card
                variant="outlined"
                onClick={() => {
                  setForm((current) => ({ ...current, activityId: String(activity.id), timeslotId: "" }));
                  setConfirmation(null);
                  setError("");
                }}
                sx={{
                  cursor: "pointer",
                  borderRadius: 4,
                  borderColor: isSelected ? "secondary.main" : "divider",
                  background: isSelected
                    ? "linear-gradient(135deg, rgba(145,97,52,0.10) 0%, rgba(255,255,255,0.95) 100%)"
                    : "rgba(255,255,255,0.82)",
                }}
              >
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="h6">{activity.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t("bookingsPage.livePlanning")}
                    </Typography>
                    <Chip
                      label={isSelected ? t("common.selected") : t("common.clickToChoose")}
                      color={isSelected ? "secondary" : "default"}
                      size="small"
                      sx={{ alignSelf: "flex-start" }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );

  const renderDirectAgendaStep = () => (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5">{t("bookingsPage.step2Title")}</Typography>
          <Typography color="text.secondary">
            {selectedActivity ? selectedActivity.name : t("bookingsPage.chooseDateAndTime")}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Button size="small" variant="outlined" onClick={() => setWeekOffset((current) => Math.max(0, current - 1))} disabled={weekOffset === 0}>
            {t("agenda.prevWeek")}
          </Button>
          <Button size="small" variant="contained" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
            {t("agenda.thisWeek")}
          </Button>
          <Button size="small" variant="outlined" onClick={() => setWeekOffset((current) => current + 1)}>
            {t("agenda.nextWeek")}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            {agendaWeekRangeLabel}
          </Typography>
        </Stack>
      </Stack>

      {loadingSlots && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography>{t("agenda.loading")}</Typography>
        </Stack>
      )}

      {!loadingSlots && availableSlots.length === 0 && <Alert severity="info">{t("agenda.empty")}</Alert>}

      {!loadingSlots && availableSlots.length > 0 && (
        <>
          <Box
            sx={{
              display: { xs: "none", md: "grid" },
              gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))",
              gap: 0,
              borderTop: "1px solid rgba(127, 94, 65, 0.18)",
              minHeight: 420,
            }}
          >
            <Box
              sx={{
                borderRight: "1px solid rgba(127, 94, 65, 0.18)",
                backgroundColor: "rgba(232, 219, 202, 0.48)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  px: 1,
                  py: 1,
                  borderBottom: "1px solid rgba(127, 94, 65, 0.18)",
                  backgroundColor: "rgba(226, 208, 186, 0.75)",
                  textAlign: "center",
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
                  Tijd
                </Typography>
              </Box>
              <Stack justifyContent="space-between" sx={{ p: 1.1, height: DESKTOP_TIMELINE_HEIGHT }}>
                {TIME_AXIS_LABELS.map((label) => (
                  <Typography
                    key={label}
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 600,
                      display: "block",
                      textAlign: "right",
                      pr: 0.3,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {label}
                  </Typography>
                ))}
              </Stack>
            </Box>

            {agendaWeekColumns.map((column, columnIndex) => (
              <Box
                key={column.key}
                sx={{
                  borderLeft: columnIndex === 0 ? "none" : "1px solid rgba(127, 94, 65, 0.18)",
                  backgroundColor: columnIndex % 2 === 0 ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.5)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    px: 1.25,
                    py: 1,
                    borderBottom: "1px solid rgba(127, 94, 65, 0.18)",
                    backgroundColor: "rgba(226, 208, 186, 0.75)",
                  }}
                >
                  <Typography variant="caption" sx={{ display: "block", fontWeight: 700, textTransform: "uppercase" }}>
                    {new Date(column.key).toLocaleDateString(locale, { weekday: "short" })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(column.key).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    position: "relative",
                    height: DESKTOP_TIMELINE_HEIGHT,
                    px: 0.55,
                    py: 0.55,
                    backgroundImage: "linear-gradient(to bottom, rgba(127, 94, 65, 0.14) 1px, transparent 1px)",
                    backgroundSize: `100% ${Math.round(DESKTOP_TIMELINE_HEIGHT / (TIME_AXIS_LABELS.length - 1))}px`,
                  }}
                >
                  {column.items.map((slot) => {
                    const selected = String(slot.id) === String(form.timeslotId);
                    const hasSpots = slot.available_spots > 0;
                    const top = agendaBlockTop(slot);
                    const height = agendaBlockHeight(slot);
                    return (
                      <Card
                        key={slot.id}
                        variant="outlined"
                        onClick={() => {
                          if (!hasSpots) {
                            return;
                          }
                          setForm((current) => ({
                            ...current,
                            date: slot.starts_at.slice(0, 10),
                            timeslotId: String(slot.id),
                            participants: Math.max(
                              1,
                              Math.min(Number(current.participants || 1), Number(slot.available_spots || 1))
                            ),
                          }));
                          setActiveStep(2);
                        }}
                        sx={{
                          position: "absolute",
                          left: 4,
                          right: 4,
                          top,
                          minHeight: height,
                          cursor: hasSpots ? "pointer" : "default",
                          borderRadius: 2,
                          border: selected
                            ? "2px solid rgba(68, 87, 168, 0.95)"
                            : hasSpots
                              ? "1px solid rgba(62, 122, 72, 0.45)"
                              : "1px solid rgba(160, 47, 47, 0.5)",
                          backgroundColor: hasSpots
                            ? "rgba(216, 241, 219, 0.98)"
                            : "rgba(248, 219, 219, 0.98)",
                          boxShadow: "inset 0 0 0 1px rgba(63, 128, 73, 0.08)",
                          overflow: "hidden",
                        }}
                      >
                        <CardContent sx={{ px: 1, py: 0.9, "&:last-child": { pb: 0.9 } }}>
                          <Stack spacing={0.1}>
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                fontWeight: 700,
                                lineHeight: 1.1,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {slot.title}
                            </Typography>
                            <Typography variant="caption" sx={{ display: "block", opacity: 0.84, lineHeight: 1.1 }}>
                              {formatTimeRange(slot.starts_at, slot.ends_at, locale)}
                            </Typography>
                            <Typography variant="caption" sx={{ display: "block", opacity: 0.78, lineHeight: 1.1 }}>
                              {t("agenda.spotsCompact", { available: slot.available_spots, capacity: slot.capacity })}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Box>

          {!hasAgendaWeekItems && <Alert severity="info">{t("agenda.weekEmpty")}</Alert>}

          <Box
            sx={{
              display: { xs: "block", md: "none" },
            }}
          >
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1.25 }}>
              {agendaWeekColumns.map((day) => (
                <Paper key={day.key} variant="outlined" sx={{ p: 1.5, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.82)" }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                    {new Date(day.key).toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "2-digit" })}
                  </Typography>
                  <Stack spacing={1}>
                    {day.items.map((slot) => {
                      const selected = String(slot.id) === String(form.timeslotId);
                      const hasSpots = slot.available_spots > 0;
                      return (
                        <Card
                          key={slot.id}
                          variant="outlined"
                          onClick={() => {
                            if (!hasSpots) {
                              return;
                            }
                            setForm((current) => ({
                              ...current,
                              date: slot.starts_at.slice(0, 10),
                              timeslotId: String(slot.id),
                              participants: Math.max(
                                1,
                                Math.min(Number(current.participants || 1), Number(slot.available_spots || 1))
                              ),
                            }));
                            setActiveStep(2);
                          }}
                          sx={{
                            cursor: hasSpots ? "pointer" : "default",
                            borderRadius: 3,
                            border: selected
                              ? "2px solid rgba(68, 87, 168, 0.95)"
                              : hasSpots
                                ? "1px solid rgba(62, 122, 72, 0.45)"
                                : "1px solid rgba(160, 47, 47, 0.5)",
                            backgroundColor: hasSpots
                              ? "rgba(216, 241, 219, 0.98)"
                              : "rgba(248, 219, 219, 0.98)",
                          }}
                        >
                          <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                            <Stack spacing={0.15}>
                              <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                                {slot.title}
                              </Typography>
                              <Typography variant="caption" sx={{ lineHeight: 1.1, opacity: 0.84 }}>
                                {formatDateTime(slot.starts_at, locale)} {t("bookingsPage.until")} {new Date(slot.ends_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                              </Typography>
                              <Typography variant="caption" sx={{ lineHeight: 1.1, opacity: 0.88 }}>
                                {t("agenda.spotsCompact", { available: slot.available_spots, capacity: slot.capacity })}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </Paper>
              ))}
            </Box>
          </Box>
        </>
      )}
    </Stack>
  );

  const renderTimeslotStep = () => (isDirectActivityFlow ? renderDirectAgendaStep() : (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5">{t("bookingsPage.step2Title")}</Typography>
          <Typography color="text.secondary">
            {t("bookingsPage.lastUpdate", {
              time: lastUpdated ? lastUpdated.toLocaleTimeString(locale) : t("bookingsPage.notLoadedYet"),
            })}
          </Typography>
        </Box>
        <TextField
          label={t("bookingsPage.preferredDate")}
          type="date"
          InputLabelProps={{ shrink: true }}
          value={form.date}
          onChange={(event) =>
            setForm((current) => ({ ...current, date: event.target.value, timeslotId: "" }))
          }
          sx={{ minWidth: { sm: 220 } }}
        />
      </Stack>

      {loadingSlots && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography>{t("bookingsPage.refreshingSlots")}</Typography>
        </Stack>
      )}

      {!loadingSlots && availableSlots.length === 0 && (
        <Alert severity="info">
          {t("bookingsPage.noAvailableSlots")}
        </Alert>
      )}

      <Stack spacing={2}>
        {Object.entries(groupedSlots).map(([date, slots]) => (
          <Paper key={date} variant="outlined" sx={{ p: 2.5, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.78)" }}>
            <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
              {formatDate(date, locale)}
            </Typography>
            <Grid container spacing={2}>
              {slots.map((slot) => {
                const selected = String(slot.id) === String(form.timeslotId);
                const hasSpots = slot.available_spots > 0;
                return (
                  <Grid item xs={12} md={6} key={slot.id}>
                    <Card
                      variant="outlined"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          timeslotId: String(slot.id),
                          participants: Math.max(
                            1,
                            Math.min(Number(current.participants || 1), Number(slot.available_spots || 1))
                          ),
                        }))
                      }
                      sx={{
                        cursor: "pointer",
                        minHeight: "100%",
                        borderRadius: 1.5,
                        border: selected
                          ? "2px solid rgba(68, 87, 168, 0.95)"
                          : hasSpots
                            ? "1px solid rgba(62, 122, 72, 0.45)"
                            : "1px solid rgba(160, 47, 47, 0.5)",
                        backgroundColor: hasSpots
                          ? "rgba(216, 241, 219, 0.98)"
                          : "rgba(248, 219, 219, 0.98)",
                        boxShadow: hasSpots
                          ? "inset 0 0 0 1px rgba(63, 128, 73, 0.1)"
                          : "inset 0 0 0 1px rgba(171, 62, 62, 0.12)",
                      }}
                    >
                      <CardContent>
                        <Stack spacing={0.1}>
                          <Typography
                            variant="caption"
                            sx={{
                              display: "block",
                              fontWeight: 700,
                              lineHeight: 1.1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {slot.title}
                          </Typography>
                          <Typography variant="caption" sx={{ display: "block", mt: 0.1, lineHeight: 1.1, opacity: 0.84 }}>
                            {formatDateTime(slot.starts_at, locale)} {t("bookingsPage.until")} {new Date(slot.ends_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: "block",
                              mt: 0.05,
                              fontWeight: 400,
                              lineHeight: 1.1,
                              opacity: 0.88,
                            }}
                          >
                            {t("agenda.spotsCompact", { available: slot.available_spots, capacity: slot.capacity })}
                          </Typography>
                          <Typography variant="caption" sx={{ display: "block", mt: 0.05, opacity: 0.78 }}>
                            {slot.room_name}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        ))}
      </Stack>
    </Stack>
  ));

  const renderDetailsStep = () => (
    <Stack spacing={2.5}>
      <Typography variant="h5">{t("bookingsPage.step3Title")}</Typography>
      <Typography color="text.secondary">
        {t("bookingsPage.step3Body")}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            label={t("bookingsPage.contactName")}
            fullWidth
            required
            value={form.contactName}
            onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label={t("bookingsPage.contactEmail")}
            type="email"
            fullWidth
            required
            value={form.contactEmail}
            onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label={t("bookingsPage.phoneNumber")}
            fullWidth
            value={form.contactPhone}
            onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label={t("bookingsPage.participantsLabel")}
            type="number"
            fullWidth
            required
            inputProps={{ min: 1, max: selectedSlot?.available_spots || 1, step: 1 }}
            value={form.participants}
            helperText={selectedSlot ? t("bookingsPage.maxParticipants", { count: selectedSlot.available_spots }) : ""}
            onChange={(event) => {
              const raw = Number(event.target.value || 1);
              const max = selectedSlot ? Number(selectedSlot.available_spots || 1) : raw;
              const clamped = Math.max(1, Math.min(raw, max));
              setForm((current) => ({ ...current, participants: clamped }));
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label={t("bookingsPage.notesLabel")}
            fullWidth
            multiline
            minRows={4}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            helperText={t("bookingsPage.notesHint")}
          />
        </Grid>
      </Grid>
    </Stack>
  );

  const renderConfirmStep = () => (
    <Stack spacing={2.5}>
      <Typography variant="h5">{t("bookingsPage.step4Title")}</Typography>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.88)" }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" color="secondary.main">
              {t("common.activity")}
            </Typography>
            <Typography variant="h6">{selectedActivity?.name}</Typography>
          </Box>
          <Divider />
          <Box>
            <Typography variant="overline" color="secondary.main">
              {t("common.timeslot")}
            </Typography>
            <Typography variant="h6">{selectedSlot?.title}</Typography>
            <Typography color="text.secondary">
              {selectedSlot ? formatDateTime(selectedSlot.starts_at, locale) : "-"}
            </Typography>
            {selectedSlot && (
              <Chip
                sx={{ mt: 1 }}
                label={t("bookingsPage.freeSpotsNow", { count: selectedSlot.available_spots })}
                color={selectedSlot.available_spots > 1 ? "success" : "warning"}
                size="small"
              />
            )}
            <Typography color="text.secondary" sx={{ mt: 0.8 }}>
              {t("bookingsPage.participantsChosen", { count: form.participants })}
            </Typography>
          </Box>
          <Divider />
          <Box>
            <Typography variant="overline" color="secondary.main">
              {t("common.contact")}
            </Typography>
            <Typography>{form.contactName}</Typography>
            <Typography color="text.secondary">{form.contactEmail}</Typography>
            {form.contactPhone && <Typography color="text.secondary">{form.contactPhone}</Typography>}
          </Box>
          {form.notes && (
            <>
              <Divider />
              <Box>
                <Typography variant="overline" color="secondary.main">
                  {t("bookingsPage.extraWishes")}
                </Typography>
                <Typography>{form.notes}</Typography>
              </Box>
            </>
          )}
        </Stack>
      </Paper>
    </Stack>
  );

  const flowItems = [
    {
      step: t("bookingsPage.steps.0"),
      title: t("bookingsPage.step1Title"),
      body: t("bookingsPage.step1Body"),
      summary:
        selectedActivity
          ? t("bookingsPage.selectedActivityLine", { value: selectedActivity.name })
          : "",
    },
    {
      step: t("bookingsPage.steps.1"),
      title: t("bookingsPage.step2Title"),
      body: isDirectActivityFlow
        ? t("bookingsPage.chooseDateAndTime")
        : t("bookingsPage.lastUpdate", {
            time: lastUpdated ? lastUpdated.toLocaleTimeString(locale) : t("bookingsPage.notLoadedYet"),
          }),
      summary:
        selectedSlot
          ? t("bookingsPage.selectedTimeslotLine", {
              title: selectedSlot.title,
              date: formatDateTime(selectedSlot.starts_at, locale),
            })
          : "",
    },
    {
      step: t("bookingsPage.steps.2"),
      title: t("bookingsPage.step3Title"),
      body: t("bookingsPage.step3Body"),
      summary:
        form.contactName
          ? t("bookingsPage.selectedContactLine", {
              name: form.contactName,
              participants: form.participants,
            })
          : "",
    },
    {
      step: t("bookingsPage.steps.3"),
      title: t("bookingsPage.step4Title"),
      body: t("bookingsPage.step4Body"),
      summary: "",
    },
  ];

  const renderWizardBody = () => {
    if (confirmation) {
      return (
        <Paper
          sx={{
            p: 4,
            borderRadius: 5,
            background:
              "linear-gradient(180deg, rgba(252,248,242,0.98) 0%, rgba(236,226,212,0.98) 100%)",
          }}
        >
          <Stack spacing={2.5}>
            <Chip label={t("bookingsPage.confirmed")} color="success" sx={{ alignSelf: "flex-start" }} />
            <Typography variant="h4">{t("bookingsPage.bookingReceived")}</Typography>
            <Typography color="text.secondary">
              {t("bookingsPage.bookingReceivedBody")}
            </Typography>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.82)" }}>
              <Stack spacing={1}>
                <Typography fontWeight={700}>{t("bookingsPage.bookingNumber", { id: confirmation.booking.id })}</Typography>
                <Typography>{confirmation.slot.title}</Typography>
                <Typography color="text.secondary">{formatDateTime(confirmation.slot.starts_at, locale)}</Typography>
                <Typography color="text.secondary">
                  {t("bookingsPage.contactLine", { name: confirmation.contactName, email: confirmation.contactEmail })}
                </Typography>
              </Stack>
            </Paper>
            {isAuthenticated && (
              <Button variant="outlined" onClick={() => document.getElementById("booking-dashboard")?.scrollIntoView({ behavior: "smooth" })}>
                {t("bookingsPage.toDashboard")}
              </Button>
            )}
          </Stack>
        </Paper>
      );
    }

    return (
      <>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && renderActivityStep()}
        {activeStep === 1 && renderTimeslotStep()}
        {activeStep === 2 && renderDetailsStep()}
        {activeStep === 3 && renderConfirmStep()}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 4 }}>
          <Button
            variant="outlined"
            onClick={goBack}
            disabled={saving || (isDirectActivityFlow ? activeStep <= 1 : activeStep === 0)}
          >
            {t("common.back")}
          </Button>
          {activeStep < steps.length - 1 ? (
            <Button variant="contained" onClick={goNext} disabled={saving}>
              {t("common.next")}
            </Button>
          ) : (
            <Button variant="contained" onClick={onSubmit} disabled={saving || !selectedSlot}>
              {saving ? t("bookingsPage.confirming") : t("bookingsPage.confirm")}
            </Button>
          )}
        </Stack>
      </>
    );
  };

  return (
    <Box
      sx={{
        position: "relative",
        p: { xs: 2, md: 3 },
        overflow: "hidden",
        backgroundImage:
          "linear-gradient(180deg, rgba(248,244,237,0.34), rgba(244,236,226,0.46)), url('/Achtergrond%20boeking.png')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        minHeight: { xs: "calc(100vh - 120px)", md: "calc(100vh - 140px)" },
      }}
    >
      <Box
        sx={{
          width: { xs: "100%", md: "66.6667%" },
          ml: { xs: -0.5, md: -0.5 },
        }}
      >
        <Paper
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 5,
            background:
              "linear-gradient(180deg, rgba(255,252,248,0.98) 0%, rgba(246,237,227,0.98) 100%)",
            boxShadow: "0 24px 60px rgba(89, 62, 34, 0.12)",
          }}
        >
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="overline" color="secondary.main">
                {t("bookingsPage.eyebrow")}
              </Typography>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {t("bookingsPage.title")}
              </Typography>
              <Typography color="text.secondary">
                {t("bookingsPage.intro")}
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <Box>
              <Grid container spacing={1.5}>
                {flowItems.map((item, index) => {
                  const isCurrent = index === activeStep;
                  const isCompleted = confirmation ? true : index < activeStep;
                  const isHighlighted = confirmation ? true : isCurrent || isCompleted;
                  const statusLabel = isCompleted
                    ? t("bookingsPage.stepAccepted")
                    : isCurrent
                      ? t("bookingsPage.stepCurrent")
                      : t("bookingsPage.stepPending");
                  const statusColor = isCompleted ? "success" : isCurrent ? "secondary" : "default";
                  const showSummary = Boolean(item.summary) && (isCompleted || isCurrent || confirmation);
                  return (
                    <Grid item xs={12} sm={6} md={3} key={item.step}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          height: "100%",
                          borderRadius: 3,
                          borderColor: isHighlighted ? "secondary.main" : "rgba(140, 124, 104, 0.22)",
                          backgroundColor: isHighlighted ? "rgba(244, 231, 217, 0.95)" : "rgba(255,255,255,0.72)",
                        }}
                      >
                        <Stack spacing={0.6}>
                          <Typography variant="caption" sx={{ textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700 }} color="secondary.main">
                            {item.step}
                          </Typography>
                          <Chip
                            size="small"
                            label={statusLabel}
                            color={statusColor}
                            sx={{ alignSelf: "flex-start", height: 22 }}
                          />
                          <Typography variant="h6" sx={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 600 }}>
                            {item.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                            {item.body}
                          </Typography>
                          {showSummary && (
                            <Typography variant="body2" sx={{ lineHeight: 1.5, fontWeight: 600 }}>
                              {item.summary}
                            </Typography>
                          )}
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>

            {renderWizardBody()}
          </Stack>
        </Paper>
      </Box>

      {isAuthenticated && (
        <Box
          id="booking-dashboard"
          sx={{
            width: { xs: "100%", md: "66.6667%" },
            ml: { xs: -0.5, md: -0.5 },
            mt: 3,
          }}
        >
          <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 5, height: "100%" }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="overline" color="secondary.main">
                  {t("bookingsPage.dashboardEyebrow")}
                </Typography>
                <Typography variant="h5">{t("bookingsPage.dashboardTitle")}</Typography>
              </Box>

              {dashboardError && <Alert severity="error">{dashboardError}</Alert>}

              {loadingDashboard && (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <CircularProgress size={20} />
                  <Typography>{t("bookingsPage.dashboardLoading")}</Typography>
                </Stack>
              )}

              {!loadingDashboard && bookings.length === 0 && (
                <Alert severity="info">{t("bookingsPage.dashboardEmpty")}</Alert>
              )}

              <Stack spacing={1.5}>
                {bookings.map((booking) => {
                  const slot = planningMap[booking.timeslot];
                  const statusChip = statusMeta[booking.status] || { label: booking.status, color: "default" };
                  const canCancel = ACTIVE_STATUSES.includes(booking.status);

                  return (
                    <Paper key={booking.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                      <Stack spacing={1.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                          <Box>
                            <Typography fontWeight={700}>{t("bookingsPage.bookingNumber", { id: booking.id })}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {slot ? slot.title : t("bookingsPage.fallbackTimeslot", { id: booking.timeslot })}
                            </Typography>
                          </Box>
                          <Chip label={statusChip.label} color={statusChip.color} size="small" />
                        </Stack>

                        {slot && (
                          <Typography variant="body2" color="text.secondary">
                            {formatDateTime(slot.starts_at, locale)}
                          </Typography>
                        )}

                        {booking.notes && (
                          <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                            {booking.notes}
                          </Typography>
                        )}

                        {canCancel && (
                          <Button variant="outlined" color="inherit" onClick={() => cancelBooking(booking.id)}>
                            {t("common.cancel")}
                          </Button>
                        )}
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Stack>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
