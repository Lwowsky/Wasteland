export function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
}

import { getIntlLocale } from "./intlLocale.js";

export function formatDate(value, language, timeZone, includeTime = false) {
  const date = normalizeDate(value);

  if (!date) {
    return "—";
  }

  const options = {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  };

  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
    options.hourCycle = "h23";
  }

  return new Intl.DateTimeFormat(getIntlLocale(language), options).format(date);
}

export function formatNumericDateTime(value, language, timeZone) {
  const date = normalizeDate(value);

  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(getIntlLocale(language), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date);
}

export function formatMediumDateTime(value, language, timeZone) {
  const date = normalizeDate(value);

  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(getIntlLocale(language), {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

export function formatShiftTime(
  startHourUtc,
  endHourUtc,
  useLocalTime,
  language,
) {
  if (!useLocalTime) {
    return `${formatHour(startHourUtc)} – ${formatHour(endHourUtc)} UTC`;
  }

  const now = new Date();

  const startDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      startHourUtc,
      0,
      0,
    ),
  );

  const endDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      endHourUtc,
      0,
      0,
    ),
  );

  if (endHourUtc <= startHourUtc) {
    endDate.setUTCDate(endDate.getUTCDate() + 1);
  }

  const formatter = new Intl.DateTimeFormat(getIntlLocale(language), {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
}

function formatHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}
