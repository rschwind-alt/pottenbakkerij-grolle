import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageProvider";
import { apiFetch } from "../lib/api";

function formatDateLabel(value, locale) {
  return new Date(value).toLocaleDateString(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
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

function formatDayName(value, locale) {
  return new Date(value).toLocaleDateString(locale, { weekday: "short" });
}

function formatDayNumber(value, locale) {
  return new Date(value).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
}

function durationMinutes(item) {
  const start = new Date(item.starts_at).getTime();
  const end = new Date(item.ends_at).getTime();
  return Math.max(Math.round((end - start) / 60000), 30);
}

const DESKTOP_TIMELINE_START_HOUR = 8.5;
const DESKTOP_TIMELINE_END_HOUR = 21;
const DESKTOP_TIMELINE_HEIGHT = 420;
const DESKTOP_TIMELINE_TOTAL_MINUTES = (DESKTOP_TIMELINE_END_HOUR - DESKTOP_TIMELINE_START_HOUR) * 60;

function minutesFromDayStart(value) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function desktopBlockTop(item) {
  const timelineStart = DESKTOP_TIMELINE_START_HOUR * 60;
  const startMinutes = minutesFromDayStart(item.starts_at);
  const offsetMinutes = Math.max(0, Math.min(DESKTOP_TIMELINE_TOTAL_MINUTES, startMinutes - timelineStart));
  return Math.round((offsetMinutes / DESKTOP_TIMELINE_TOTAL_MINUTES) * DESKTOP_TIMELINE_HEIGHT);
}

function desktopBlockHeight(item) {
  const proportionalHeight = Math.round((durationMinutes(item) / DESKTOP_TIMELINE_TOTAL_MINUTES) * DESKTOP_TIMELINE_HEIGHT);
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

function startOfIsoWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function maxDateKey(left, right) {
  return left > right ? left : right;
}

function groupByDay(items) {
  return items.reduce((accumulator, item) => {
    const key = item.starts_at.slice(0, 10);
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(item);
    return accumulator;
  }, {});
}

const TIME_AXIS_LABELS = ["08:30", "10:30", "12:30", "14:30", "16:30", "18:30", "20:30"];

export default function AgendaCard() {
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const [weekOffset, setWeekOffset] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", items: [] });

  const openBookingFlow = (item) => {
    if (item.available_spots <= 0) {
      return;
    }

    const bookingTarget = `/bookings?activity=${item.activity}&date=${item.starts_at.slice(0, 10)}&timeslot=${item.id}`;
    navigate(bookingTarget);
  };

  const weekDays = useMemo(() => {
    const base = startOfIsoWeek(new Date());
    const target = addDays(base, weekOffset * 7);
    return buildWeekDays(target);
  }, [weekOffset]);

  const weekRangeLabel = useMemo(() => formatWeekRangeLabel(weekDays, locale), [weekDays, locale]);

  useEffect(() => {
    let active = true;

    async function loadAgenda() {
      try {
        const weekStartKey = weekDays[0]?.key;
        const weekEndKey = weekDays[6]?.key;
        const params = new URLSearchParams({
          date_from: maxDateKey(weekStartKey, todayValue()),
          date_to: weekEndKey,
        });
        const response = await apiFetch(`/api/timeslots/available/?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (!active) {
          return;
        }
        setState({ loading: false, error: "", items: payload.slice(0, 24) });
      } catch (error) {
        if (!active) {
          return;
        }
        setState({ loading: false, error: error.message || t("agenda.unavailable", { error: "" }), items: [] });
      }
    }

    loadAgenda();
    const intervalId = window.setInterval(loadAgenda, 30000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [weekDays, t]);

  const groupedItems = useMemo(() => groupByDay(state.items), [state.items]);
  const weekColumns = useMemo(
    () =>
      weekDays.map((day) => ({
        ...day,
        items: [...(groupedItems[day.key] || [])].sort((left, right) =>
          left.starts_at.localeCompare(right.starts_at)
        ),
      })),
    [weekDays, groupedItems]
  );

  const hasWeekItems = weekColumns.some((column) => column.items.length > 0);

  const fallbackRows = useMemo(
    () =>
      Object.entries(groupedItems)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, items]) => ({
          date,
          items: [...items].sort((left, right) => left.starts_at.localeCompare(right.starts_at)),
        })),
    [groupedItems]
  );

  return (
    <Paper
      sx={{
        p: 0,
        borderRadius: 4,
        height: "100%",
        overflow: "hidden",
        border: "1px solid rgba(127, 94, 65, 0.2)",
        background: "linear-gradient(180deg, rgba(248,243,236,0.98) 0%, rgba(240,231,218,0.98) 100%)",
      }}
      elevation={3}
    >
      <Stack spacing={0} sx={{ height: "100%" }}>
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: "1px solid rgba(127, 94, 65, 0.2)",
            background: "linear-gradient(90deg, rgba(228,210,189,0.85) 0%, rgba(240,230,215,0.82) 100%)",
          }}
        >
          <Typography variant="overline" color="secondary.main" sx={{ letterSpacing: 1.2 }}>
            {t("agenda.eyebrow")}
          </Typography>
          <Typography variant="h6" sx={{ mt: 0.25 }}>
            {t("agenda.title")}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            {t("agenda.weekLabel")}
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Button
              size="small"
              variant="outlined"
              onClick={() => setWeekOffset((current) => Math.max(0, current - 1))}
              disabled={weekOffset === 0}
            >
              {t("agenda.prevWeek")}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
            >
              {t("agenda.thisWeek")}
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setWeekOffset((current) => current + 1)}
            >
              {t("agenda.nextWeek")}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              {weekRangeLabel}
            </Typography>
          </Stack>
        </Box>

        {state.loading && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 3, py: 3 }}>
            <CircularProgress size={20} />
            <Typography>{t("agenda.loading")}</Typography>
          </Stack>
        )}

        {!state.loading && state.error && (
          <Box sx={{ px: 3, py: 3 }}>
            <Alert severity="error">{t("agenda.unavailable", { error: state.error })}</Alert>
          </Box>
        )}

        {!state.loading && !state.error && state.items.length === 0 && (
          <Box sx={{ px: 3, py: 3 }}>
            <Alert severity="info">{t("agenda.empty")}</Alert>
          </Box>
        )}

        {!state.loading && !state.error && state.items.length > 0 && (
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
                <Stack
                  justifyContent="space-between"
                  sx={{
                    p: 1.1,
                    height: DESKTOP_TIMELINE_HEIGHT,
                  }}
                >
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

              {weekColumns.map((column, columnIndex) => (
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
                      {formatDayName(column.key, locale)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDayNumber(column.key, locale)}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 1.1,
                      position: "relative",
                      height: DESKTOP_TIMELINE_HEIGHT,
                    }}
                  >
                    {column.items.length === 0 && (
                      <Box
                        sx={{
                          borderRadius: 1.25,
                          border: "1px dashed rgba(127, 94, 65, 0.22)",
                          height: 26,
                          mt: 0.5,
                          backgroundColor: "rgba(255,255,255,0.45)",
                        }}
                      />
                    )}

                    {column.items.map((item) => (
                      <Box
                        key={item.id}
                        title={`${item.title} (${item.starts_at} - ${item.ends_at})`}
                        aria-label={`${item.title} ${item.starts_at}`}
                        role="button"
                        tabIndex={item.available_spots > 0 ? 0 : -1}
                        onClick={() => openBookingFlow(item)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openBookingFlow(item);
                          }
                        }}
                        sx={{
                          position: "absolute",
                          left: 8,
                          right: 8,
                          top: desktopBlockTop(item),
                          p: 0.8,
                          borderRadius: 1.5,
                          height: desktopBlockHeight(item),
                          border:
                            item.available_spots > 0
                              ? "1px solid rgba(62, 122, 72, 0.45)"
                              : "1px solid rgba(160, 47, 47, 0.5)",
                          backgroundColor:
                            item.available_spots > 0
                              ? "rgba(216, 241, 219, 0.98)"
                              : "rgba(248, 219, 219, 0.98)",
                          boxShadow:
                            item.available_spots > 0
                              ? "inset 0 0 0 1px rgba(63, 128, 73, 0.1)"
                              : "inset 0 0 0 1px rgba(171, 62, 62, 0.12)",
                          cursor: item.available_spots > 0 ? "pointer" : "not-allowed",
                        }}
                      >
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
                          {item.title}
                        </Typography>
                        <Typography variant="caption" sx={{ display: "block", mt: 0.1, lineHeight: 1.1, opacity: 0.84 }}>
                          {formatTimeRange(item.starts_at, item.ends_at, locale)}
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
                          {t("agenda.spotsCompact", {
                            available: item.available_spots,
                            capacity: item.capacity,
                          })}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>

            <Box sx={{ display: { xs: "block", md: "none" }, overflowY: "auto", maxHeight: 560 }}>
              {fallbackRows.map((day, dayIndex) => (
                <Box
                  key={day.date}
                  sx={{
                    borderTop: dayIndex === 0 ? "none" : "1px solid rgba(127, 94, 65, 0.18)",
                  }}
                >
                  <Box
                    sx={{
                      px: 2.5,
                      py: 1,
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      backgroundColor: "rgba(226, 208, 186, 0.85)",
                      borderBottom: "1px solid rgba(127, 94, 65, 0.18)",
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ textTransform: "capitalize", fontWeight: 700 }}>
                      {formatDateLabel(day.date, locale)}
                    </Typography>
                  </Box>

                  {day.items.map((item, index) => (
                    <Box
                      key={item.id}
                      title={`${item.title} (${item.starts_at} - ${item.ends_at})`}
                      aria-label={`${item.title} ${item.starts_at}`}
                      sx={{
                        display: "block",
                        px: 2.5,
                        py: 0.6,
                        borderBottom:
                          index === day.items.length - 1 ? "none" : "1px dashed rgba(127, 94, 65, 0.2)",
                        backgroundColor: "transparent",
                      }}
                    >
                      <Box
                        role="button"
                        tabIndex={item.available_spots > 0 ? 0 : -1}
                        onClick={() => openBookingFlow(item)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openBookingFlow(item);
                          }
                        }}
                        sx={{
                          width: "100%",
                          minHeight: 38,
                          borderRadius: 1,
                          px: 1,
                          py: 0.6,
                          border:
                            item.available_spots > 0
                              ? "1px solid rgba(62, 122, 72, 0.45)"
                              : "1px solid rgba(160, 47, 47, 0.5)",
                          backgroundColor:
                            item.available_spots > 0
                              ? "rgba(216, 241, 219, 0.98)"
                              : "rgba(248, 219, 219, 0.98)",
                          cursor: item.available_spots > 0 ? "pointer" : "not-allowed",
                        }}
                      >
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
                          {item.title}
                        </Typography>
                        <Typography variant="caption" sx={{ display: "block", mt: 0.1, lineHeight: 1.1, opacity: 0.84 }}>
                          {formatTimeRange(item.starts_at, item.ends_at, locale)}
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
                          {t("agenda.spotsCompact", {
                            available: item.available_spots,
                            capacity: item.capacity,
                          })}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>

            {!hasWeekItems && (
              <Box sx={{ px: 3, py: 2.5 }}>
                <Alert severity="info">{t("agenda.weekEmpty")}</Alert>
              </Box>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
}
