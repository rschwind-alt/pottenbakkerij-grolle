import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useAuth } from "../auth/AuthProvider";
import { useLanguage } from "../i18n/LanguageProvider";
import { parseApiError } from "../lib/api";

const emptyForm = {
  title: "",
  activity: "",
  room: "",
  starts_at: "",
  ends_at: "",
  capacity: "",
  notes: "",
};

const START_HOUR = 8;
const END_HOUR = 20;
const ROW_MINUTES = 30;
const ROW_HEIGHT = 28;
const DAY_COUNT = 7;

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

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildWeekDays(offset) {
  const weekStart = addDays(startOfIsoWeek(new Date()), offset * 7);
  return Array.from({ length: DAY_COUNT }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return {
      key: toDateKey(day),
      date: day,
    };
  });
}

function toLocalDateTimeValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseLocalDateTime(value) {
  return value ? new Date(value) : null;
}

function minutesSinceStartHour(date) {
  return date.getHours() * 60 + date.getMinutes() - START_HOUR * 60;
}

function clampRowIndex(rowIndex) {
  return Math.min((END_HOUR - START_HOUR) * 2 - 1, Math.max(0, rowIndex));
}

function rowIndexFromClientY(rect, clientY) {
  const relativeY = Math.max(0, clientY - rect.top);
  return clampRowIndex(Math.floor(relativeY / ROW_HEIGHT));
}

function findDayColumnAtPoint(dayColumnRefs, clientX, clientY) {
  const entries = Object.entries(dayColumnRefs.current);
  for (const [dayKey, node] of entries) {
    if (!node) {
      continue;
    }

    const rect = node.getBoundingClientRect();
    const withinX = clientX >= rect.left && clientX <= rect.right;
    const withinY = clientY >= rect.top && clientY <= rect.bottom;
    if (withinX && withinY) {
      return { dayKey, rect };
    }
  }

  return null;
}

function buildDateTimeFromRow(dayDate, rowIndex) {
  const start = new Date(dayDate);
  start.setHours(0, 0, 0, 0);
  start.setMinutes(START_HOUR * 60 + rowIndex * ROW_MINUTES);
  return start;
}

function durationMinutes(slot) {
  const start = new Date(slot.starts_at).getTime();
  const end = new Date(slot.ends_at).getTime();
  return Math.max(30, Math.round((end - start) / 60000));
}

function slotTopPx(slot) {
  return Math.max(0, (minutesSinceStartHour(new Date(slot.starts_at)) / ROW_MINUTES) * ROW_HEIGHT);
}

function slotHeightPx(slot) {
  return Math.max(ROW_HEIGHT, (durationMinutes(slot) / ROW_MINUTES) * ROW_HEIGHT);
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

function groupSlotsByDay(slots) {
  return slots.reduce((accumulator, slot) => {
    const key = slot.starts_at.slice(0, 10);
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(slot);
    return accumulator;
  }, {});
}

export default function PlanningPage() {
  const { authFetch } = useAuth();
  const { t, locale } = useLanguage();
  const dayColumnRefs = useRef({});
  const dragStateRef = useRef(null);
  const titleWasEditedRef = useRef(false);
  const [slots, setSlots] = useState([]);
  const [activities, setActivities] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [isDraggingDraft, setIsDraggingDraft] = useState(false);
  const [draggingSlotId, setDraggingSlotId] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  const weekDays = useMemo(() => buildWeekDays(weekOffset), [weekOffset]);
  const weekRangeLabel = useMemo(() => formatWeekRangeLabel(weekDays, locale), [weekDays, locale]);
  const visibleSlots = useMemo(() => {
    const startKey = weekDays[0]?.key;
    const endKey = weekDays[weekDays.length - 1]?.key;
    return slots
      .filter((slot) => slot.starts_at.slice(0, 10) >= startKey && slot.starts_at.slice(0, 10) <= endKey)
      .sort((left, right) => left.starts_at.localeCompare(right.starts_at));
  }, [slots, weekDays]);
  const slotsByDay = useMemo(() => groupSlotsByDay(visibleSlots), [visibleSlots]);
  const selectedActivity = useMemo(
    () => activities.find((activity) => String(activity.id) === String(form.activity)),
    [activities, form.activity]
  );
  const selectedRoom = useMemo(
    () => rooms.find((room) => String(room.id) === String(form.room)),
    [rooms, form.room]
  );
  const defaultRoomForSelectedActivity = useMemo(() => {
    if (!selectedActivity) {
      return rooms[0] || null;
    }

    const roomFromActivity = rooms.find(
      (room) => String(room.id) === String(selectedActivity.default_room)
    );
    return roomFromActivity || rooms[0] || null;
  }, [selectedActivity, rooms]);

  const loadData = async () => {
    setLoading(true);
    const [slotsResponse, activitiesResponse, roomsResponse] = await Promise.all([
      authFetch("/api/planning/"),
      authFetch("/api/activities/"),
      authFetch("/api/rooms/"),
    ]);

    if (!slotsResponse.ok) {
      throw new Error(await parseApiError(slotsResponse));
    }
    if (!activitiesResponse.ok) {
      throw new Error(await parseApiError(activitiesResponse));
    }
    if (!roomsResponse.ok) {
      throw new Error(await parseApiError(roomsResponse));
    }

    const [nextSlots, nextActivities, nextRooms] = await Promise.all([
      slotsResponse.json(),
      activitiesResponse.json(),
      roomsResponse.json(),
    ]);

    setSlots(nextSlots);
    setActivities(nextActivities);
    setRooms(nextRooms);
    setLoading(false);
  };

  useEffect(() => {
    loadData().catch((err) => {
      setLoading(false);
      setError(err.message || t("planningPage.loadFailed"));
    });
  }, [authFetch, t]);

  useEffect(() => {
    if (!form.activity && activities.length > 0) {
      setForm((current) => ({ ...current, activity: String(activities[0].id) }));
    }
  }, [activities, form.activity]);

  useEffect(() => {
    if (!form.room && rooms.length > 0) {
      const preferredRoom = defaultRoomForSelectedActivity || rooms[0];
      setForm((current) => ({
        ...current,
        room: preferredRoom ? String(preferredRoom.id) : "",
        capacity: current.capacity || (preferredRoom ? String(preferredRoom.capacity) : ""),
      }));
    }
  }, [rooms, form.room, defaultRoomForSelectedActivity]);

  useEffect(() => {
    if (selectedRoom && !form.capacity) {
      setForm((current) => ({ ...current, capacity: String(selectedRoom.capacity) }));
    }
  }, [selectedRoom, form.capacity]);

  useEffect(() => {
    if (!selectedSlotId && selectedActivity && !form.title) {
      setForm((current) => {
        if (current.title) {
          return current;
        }

        return {
          ...current,
          title: selectedActivity.name,
        };
      });
    }
  }, [selectedActivity, form.title, selectedSlotId]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const dayColumn = findDayColumnAtPoint(dayColumnRefs, event.clientX, event.clientY);
      if (!dayColumn) {
        return;
      }

      const rowIndex = rowIndexFromClientY(dayColumn.rect, event.clientY);
      const start = buildDateTimeFromRow(new Date(weekDays.find((day) => day.key === dayColumn.dayKey)?.date || dragState.dayDate), rowIndex);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + (dragState.durationMinutes || selectedActivity?.default_duration_minutes || ROW_MINUTES));

      setForm((current) => ({
        ...current,
        title: current.title || selectedActivity?.name || "",
        starts_at: toLocalDateTimeValue(start),
        ends_at: toLocalDateTimeValue(end),
        activity: current.activity || (activities[0] ? String(activities[0].id) : ""),
        room: current.room || (defaultRoomForSelectedActivity ? String(defaultRoomForSelectedActivity.id) : ""),
        capacity:
          current.capacity
          || (selectedRoom
            ? String(selectedRoom.capacity)
            : defaultRoomForSelectedActivity
              ? String(defaultRoomForSelectedActivity.capacity)
              : ""),
      }));

      dragState.dayKey = dayColumn.dayKey;
      dragState.dayDate = new Date(weekDays.find((day) => day.key === dayColumn.dayKey)?.date || dragState.dayDate);
    };

    const handlePointerUp = () => {
      if (dragStateRef.current) {
        dragStateRef.current = null;
        setIsDraggingDraft(false);
        setDraggingSlotId(null);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [activities, rooms, selectedActivity?.name, selectedRoom, weekDays]);

  const resetForm = () => {
    setForm({
      title: "",
      activity: activities[0] ? String(activities[0].id) : "",
      room: defaultRoomForSelectedActivity ? String(defaultRoomForSelectedActivity.id) : "",
      starts_at: "",
      ends_at: "",
      capacity: defaultRoomForSelectedActivity ? String(defaultRoomForSelectedActivity.capacity) : "",
      notes: "",
    });
    setSelectedSlotId(null);
    titleWasEditedRef.current = false;
    setError("");
  };

  const onWeekCellClick = (dayDate, rowIndex) => {
    const start = buildDateTimeFromRow(dayDate, rowIndex);

    const duration = selectedActivity?.default_duration_minutes || 60;
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + duration);

    setForm((current) => ({
      ...current,
      title: selectedActivity?.name || current.title || "",
      starts_at: toLocalDateTimeValue(start),
      ends_at: toLocalDateTimeValue(end),
      activity: current.activity || (activities[0] ? String(activities[0].id) : ""),
      room: current.room || (defaultRoomForSelectedActivity ? String(defaultRoomForSelectedActivity.id) : ""),
      capacity:
        current.capacity
        || (selectedRoom
          ? String(selectedRoom.capacity)
          : defaultRoomForSelectedActivity
            ? String(defaultRoomForSelectedActivity.capacity)
            : ""),
    }));
    titleWasEditedRef.current = false;
    setSelectedSlotId(null);
  };

  const beginDraftDrag = (dayDate, dayKey, rowIndex, event) => {
    const start = buildDateTimeFromRow(dayDate, rowIndex);
    const duration = selectedActivity?.default_duration_minutes || ROW_MINUTES;
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + duration);

    dragStateRef.current = {
      dayDate,
      dayKey,
      startRow: rowIndex,
      mode: "create-slot",
    };
    setIsDraggingDraft(true);
    setSelectedSlotId(null);
    setForm((current) => ({
      ...current,
      title: current.title || selectedActivity?.name || "",
      starts_at: toLocalDateTimeValue(start),
      ends_at: toLocalDateTimeValue(end),
      activity: current.activity || (activities[0] ? String(activities[0].id) : ""),
      room: current.room || (defaultRoomForSelectedActivity ? String(defaultRoomForSelectedActivity.id) : ""),
      capacity:
        current.capacity
        || (selectedRoom
          ? String(selectedRoom.capacity)
          : defaultRoomForSelectedActivity
            ? String(defaultRoomForSelectedActivity.capacity)
            : ""),
    }));

    if (event.currentTarget?.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const beginSlotDrag = (slot, event) => {
    const slotStart = new Date(slot.starts_at);
    const slotEnd = new Date(slot.ends_at);
    const dayKey = toDateKey(slotStart);
    const dayDate = new Date(slotStart);

    dragStateRef.current = {
      dayDate,
      dayKey,
      startRow: clampRowIndex(Math.floor(minutesSinceStartHour(slotStart) / ROW_MINUTES)),
      mode: "move-slot",
      slotId: slot.id,
      durationMinutes: Math.max(ROW_MINUTES, Math.round((slotEnd.getTime() - slotStart.getTime()) / 60000)),
      sourceStartMinutes: slotStart.getHours() * 60 + slotStart.getMinutes(),
    };
    setDraggingSlotId(slot.id);
    setIsDraggingDraft(true);
    setSelectedSlotId(slot.id);
    titleWasEditedRef.current = true;
    setForm({
      title: slot.title || "",
      activity: String(slot.activity),
      room: String(slot.room),
      starts_at: toLocalDateTimeValue(slotStart),
      ends_at: toLocalDateTimeValue(slotEnd),
      capacity: String(slot.capacity),
      notes: slot.notes || "",
    });

    if (event.currentTarget?.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const onSelectSlot = (slot) => {
    setSelectedSlotId(slot.id);
    setForm({
      title: slot.title || "",
      activity: String(slot.activity),
      room: String(slot.room),
      starts_at: toLocalDateTimeValue(new Date(slot.starts_at)),
      ends_at: toLocalDateTimeValue(new Date(slot.ends_at)),
      capacity: String(slot.capacity),
      notes: slot.notes || "",
    });
    setError("");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        title: form.title,
        activity: Number(form.activity),
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        capacity: Number(form.capacity || selectedRoom?.capacity || 1),
        notes: form.notes,
      };
      if (form.room) {
        payload.room = Number(form.room);
      }

      const response = await authFetch(selectedSlotId ? `/api/planning/${selectedSlotId}/` : "/api/planning/", {
        method: selectedSlotId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      await loadData();
      resetForm();
    } catch (err) {
      setError(err.message || t("planningPage.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const onDeleteSelectedSlot = async () => {
    if (!selectedSlotId) {
      return;
    }

    const confirmed = window.confirm(t("planningPage.deleteConfirm"));
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await authFetch(`/api/planning/${selectedSlotId}/`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      await loadData();
      resetForm();
    } catch (err) {
      setError(err.message || t("planningPage.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  };

  const hourLabels = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index),
    []
  );

  const handleActivityChange = (value) => {
    setForm((current) => {
      const nextActivity = activities.find((activity) => String(activity.id) === String(value));
      const nextDefaultRoom = rooms.find(
        (room) => String(room.id) === String(nextActivity?.default_room)
      );
      const fallbackRoom = nextDefaultRoom || rooms.find((room) => String(room.id) === String(current.room)) || rooms[0];
      const start = parseLocalDateTime(current.starts_at);
      const nextEnd =
        start && nextActivity
          ? new Date(start.getTime() + nextActivity.default_duration_minutes * 60000)
          : parseLocalDateTime(current.ends_at);

      return {
        ...current,
        activity: String(value),
        room: !selectedSlotId && fallbackRoom ? String(fallbackRoom.id) : current.room,
        capacity: !selectedSlotId && fallbackRoom ? String(fallbackRoom.capacity) : current.capacity,
        title:
          !selectedSlotId && !titleWasEditedRef.current && nextActivity
            ? nextActivity.name
            : current.title || nextActivity?.name || "",
        ends_at: nextEnd ? toLocalDateTimeValue(nextEnd) : current.ends_at,
      };
    });
  };

  const handleRoomChange = (value) => {
    const nextRoom = rooms.find((room) => String(room.id) === String(value));
    setForm((current) => ({
      ...current,
      room: String(value),
      capacity: String(nextRoom?.capacity || current.capacity || 1),
    }));
  };

  const selectedWeekSummary = selectedSlotId
    ? t("planningPage.selectedSlot")
    : t("planningPage.clickEmptySlot");

  const gridHeight = ROW_HEIGHT * ((END_HOUR - START_HOUR) * 2);
  const draftStart = parseLocalDateTime(form.starts_at);
  const draftEnd = parseLocalDateTime(form.ends_at);
  const draftDayKey = draftStart ? toDateKey(draftStart) : null;
  const draftTop = draftStart
    ? Math.max(0, ((draftStart.getHours() * 60 + draftStart.getMinutes() - START_HOUR * 60) / ROW_MINUTES) * ROW_HEIGHT)
    : 0;
  const draftHeight = draftStart && draftEnd ? Math.max(ROW_HEIGHT, ((draftEnd.getTime() - draftStart.getTime()) / 60000 / ROW_MINUTES) * ROW_HEIGHT) : 0;

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 2fr) minmax(320px, 1fr)" }, gap: 3 }}>
      <Box>
        <Paper
          sx={{
            p: 0,
            borderRadius: 4,
            overflow: "hidden",
            border: "1px solid rgba(127, 94, 65, 0.18)",
            background: "linear-gradient(180deg, rgba(249, 244, 237, 0.98) 0%, rgba(240, 231, 219, 0.98) 100%)",
          }}
          elevation={3}
        >
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid rgba(127, 94, 65, 0.18)" }}>
            <Typography variant="overline" color="secondary.main" sx={{ letterSpacing: 1.2 }}>
              {t("planningPage.calendarTitle")}
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.25 }}>
              {t("planningPage.newSlot")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t("planningPage.calendarBody")}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1.5 }}>
              <Button size="small" variant="outlined" onClick={() => setWeekOffset((current) => current - 1)}>
                {t("planningPage.prevWeek")}
              </Button>
              <Button size="small" variant="contained" disabled={weekOffset === 0} onClick={() => setWeekOffset(0)}>
                {t("planningPage.thisWeek")}
              </Button>
              <Button size="small" variant="outlined" onClick={() => setWeekOffset((current) => current + 1)}>
                {t("planningPage.nextWeek")}
              </Button>
              <Typography variant="caption" color="text.secondary">
                {weekRangeLabel}
              </Typography>
            </Stack>
          </Box>

          {loading && (
            <Box sx={{ px: 3, py: 3 }}>
              <Typography>{t("common.loading")}</Typography>
            </Box>
          )}

          {!loading && error && (
            <Box sx={{ px: 3, py: 3 }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          )}

          {!loading && !error && (
            <Box sx={{ overflowX: "auto" }}>
              <Box sx={{ minWidth: 860 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))" }}>
                  <Box sx={{ borderRight: "1px solid rgba(127, 94, 65, 0.18)", backgroundColor: "rgba(238, 228, 215, 0.8)" }} />
                  {weekDays.map((day) => (
                    <Box
                      key={day.key}
                      sx={{
                        px: 1.25,
                        py: 1,
                        borderRight: "1px solid rgba(127, 94, 65, 0.18)",
                        backgroundColor: "rgba(238, 228, 215, 0.8)",
                      }}
                    >
                      <Typography variant="caption" sx={{ display: "block", fontWeight: 700, textTransform: "uppercase" }}>
                        {day.date.toLocaleDateString(locale, { weekday: "short" })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {day.date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Box sx={{ display: "flex" }}>
                  <Box
                    sx={{
                      width: 72,
                      flexShrink: 0,
                      position: "relative",
                      height: gridHeight,
                      borderRight: "1px solid rgba(127, 94, 65, 0.18)",
                      backgroundColor: "rgba(249, 244, 237, 0.88)",
                    }}
                  >
                    {hourLabels.map((hour) => (
                      <Typography
                        key={hour}
                        variant="caption"
                        sx={{
                          position: "absolute",
                          top: (hour - START_HOUR) * ROW_HEIGHT * 2 - 7,
                          right: 10,
                          fontSize: 11,
                        }}
                      >
                        {`${String(hour).padStart(2, "0")}:00`}
                      </Typography>
                    ))}
                  </Box>

                  {weekDays.map((day) => {
                    const daySlots = slotsByDay[day.key] || [];
                    const hasDraft = draftDayKey === day.key && draftStart && draftEnd;
                    return (
                      <Box
                        key={day.key}
                        ref={(node) => {
                          if (node) {
                            dayColumnRefs.current[day.key] = node;
                          }
                        }}
                        sx={{
                          flex: "1 1 0",
                          position: "relative",
                          height: gridHeight,
                          borderRight: "1px solid rgba(127, 94, 65, 0.18)",
                          backgroundImage:
                            "repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(127, 94, 65, 0.1) 27px, rgba(127, 94, 65, 0.1) 28px)",
                          cursor: isDraggingDraft ? "grabbing" : "crosshair",
                        }}
                        onPointerDown={(event) => {
                          if (event.button !== 0) {
                            return;
                          }

                          const rect = event.currentTarget.getBoundingClientRect();
                          const rowIndex = rowIndexFromClientY(rect, event.clientY);
                          beginDraftDrag(day.date, day.key, rowIndex, event);
                        }}
                        title={t("planningPage.calendarHint")}
                      >
                        {hasDraft && (
                          <Box
                            sx={{
                              position: "absolute",
                              left: 6,
                              right: 6,
                              top: draftTop,
                              height: draftHeight,
                              borderRadius: 1.5,
                              border: "2px dashed rgba(68, 87, 168, 0.9)",
                              backgroundColor: "rgba(190, 203, 255, 0.28)",
                              boxShadow: "0 0 0 1px rgba(255,255,255,0.45) inset",
                              pointerEvents: "none",
                              zIndex: 1,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                p: 1,
                                fontWeight: 700,
                                color: "primary.dark",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {form.title || selectedActivity?.name || t("planningPage.clickEmptySlot")}
                            </Typography>
                          </Box>
                        )}

                        {daySlots.map((slot) => {
                          const start = new Date(slot.starts_at);
                          const top = slotTopPx(slot);
                          const height = slotHeightPx(slot);
                          const isBooked = slot.booked_count > 0;
                          const isSelectedSlot = String(slot.id) === String(selectedSlotId);
                          const isDraggingThisSlot = String(slot.id) === String(draggingSlotId);
                          return (
                            <Box
                              key={slot.id}
                              onPointerDown={(event) => {
                                if (event.button !== 0) {
                                  return;
                                }

                                event.stopPropagation();
                                beginSlotDrag(slot, event);
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectSlot(slot);
                              }}
                              sx={{
                                position: "absolute",
                                left: 6,
                                right: 6,
                                top,
                                height,
                                p: 1,
                                borderRadius: 1.5,
                                border: isSelectedSlot
                                  ? "2px solid rgba(68, 87, 168, 0.95)"
                                  : isBooked
                                    ? "1px solid rgba(160, 47, 47, 0.55)"
                                    : "1px solid rgba(62, 122, 72, 0.5)",
                                backgroundColor: isBooked
                                  ? isSelectedSlot
                                    ? "rgba(248, 219, 219, 0.98)"
                                    : "rgba(248, 219, 219, 0.98)"
                                  : isSelectedSlot
                                    ? "rgba(216, 226, 255, 0.98)"
                                    : "rgba(216, 241, 219, 0.98)",
                                outline: isSelectedSlot ? "3px solid rgba(68, 87, 168, 0.18)" : "none",
                                boxShadow: isDraggingThisSlot ? "0 12px 24px rgba(68, 87, 168, 0.18)" : "0 1px 0 rgba(0,0,0,0.04)",
                                overflow: "hidden",
                                zIndex: isDraggingThisSlot || isSelectedSlot ? 2 : 1,
                                transform: isDraggingThisSlot ? "scale(1.02)" : "none",
                                cursor: "grab",
                              }}
                              title={slot.title}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  fontWeight: 700,
                                  lineHeight: 1.15,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {slot.title}
                              </Typography>
                              <Typography variant="caption" sx={{ display: "block", mt: 0.2, opacity: 0.88 }}>
                                {formatTimeRange(start, slot.ends_at, locale)}
                              </Typography>
                              <Typography variant="caption" sx={{ display: "block", mt: 0.2, opacity: 0.78 }}>
                                {slot.booked_count > 0 ? `${slot.booked_count} booked` : "open"}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      <Box>
        <Paper sx={{ p: 3, borderRadius: 4, position: "sticky", top: 24 }} elevation={3}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">{t("planningPage.selectedSlot")}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {selectedWeekSummary}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                {isDraggingDraft ? "Laat los om het tijdsblok vast te zetten." : "Sleep over een leeg vak om een nieuw tijdsblok te tekenen."}
              </Typography>
            </Box>

            <Button variant="outlined" onClick={resetForm}>
              {t("planningPage.clearSelection")}
            </Button>

            {error && <Alert severity="error">{error}</Alert>}

            <Divider />

            <Box component="form" onSubmit={onSubmit}>
              <Stack spacing={2}>
                <TextField
                  label={t("planningPage.activity")}
                  select
                  value={form.activity}
                  onChange={(event) => handleActivityChange(event.target.value)}
                  required
                >
                  {activities.map((activity) => (
                    <MenuItem key={activity.id} value={String(activity.id)}>
                      {activity.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label={t("planningPage.room")}
                  select
                  value={form.room}
                  onChange={(event) => handleRoomChange(event.target.value)}
                  required
                >
                  {rooms.map((room) => (
                    <MenuItem key={room.id} value={String(room.id)}>
                      {room.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label={t("planningPage.title")}
                  value={form.title}
                  onChange={(event) => {
                    titleWasEditedRef.current = true;
                    setForm((current) => ({ ...current, title: event.target.value }));
                  }}
                  required
                />
                <TextField
                  label={t("planningPage.start")}
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={form.starts_at}
                  onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))}
                  required
                />
                <TextField
                  label={t("planningPage.end")}
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={form.ends_at}
                  onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))}
                  required
                />
                <TextField
                  label={t("planningPage.capacity")}
                  type="number"
                  inputProps={{ min: 1 }}
                  value={form.capacity}
                  onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
                  required
                />
                <TextField
                  label={t("planningPage.notes")}
                  multiline
                  minRows={4}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />

                <Button type="submit" variant="contained" disabled={saving}>
                  {saving
                    ? t("planningPage.saving")
                    : selectedSlotId
                      ? t("planningPage.updateSlot")
                      : t("planningPage.createSlot")}
                </Button>

                {selectedSlotId && (
                  <Button
                    type="button"
                    variant="outlined"
                    color="error"
                    disabled={deleting || saving}
                    onClick={onDeleteSelectedSlot}
                  >
                    {deleting ? t("planningPage.deleting") : t("planningPage.deleteSlot")}
                  </Button>
                )}
              </Stack>
            </Box>

            <Divider />

            <Stack spacing={1}>
              <Typography variant="subtitle2">{t("planningPage.overview")}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t("planningPage.calendarHint")}
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
