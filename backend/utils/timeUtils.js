/**
 * Time utility functions for period generation.
 */

/**
 * Parse "HH:mm" string to total minutes from midnight.
 */
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert total minutes from midnight to "HH:mm" string.
 */
function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Generate period time slots.
 * @param {string} startTime - Start time in "HH:mm" format
 * @param {number} periodDuration - Duration of each period in minutes
 * @param {number} periodsPerDay - Number of periods
 * @returns {Array<{periodNumber, startTime, endTime}>}
 */
function generatePeriods(startTime, periodDuration, periodsPerDay) {
  const periods = [];
  let currentMinutes = parseTime(startTime);

  for (let i = 1; i <= periodsPerDay; i++) {
    const periodStart = formatTime(currentMinutes);
    const periodEnd = formatTime(currentMinutes + periodDuration);

    periods.push({
      periodNumber: i,
      startTime: periodStart,
      endTime: periodEnd,
    });

    currentMinutes += periodDuration;
  }

  return periods;
}

module.exports = { parseTime, formatTime, generatePeriods };
