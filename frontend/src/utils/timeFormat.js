/**
 * Convert 24h "HH:mm" to 12h "hh:mm AM/PM" format.
 */
export function to12Hour(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Format a period range in 12h: "09:00–10:00" → "9:00 AM – 10:00 AM"
 */
export function formatPeriodRange(startTime, endTime) {
  return `${to12Hour(startTime)} – ${to12Hour(endTime)}`;
}
