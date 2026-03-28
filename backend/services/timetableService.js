const Timetable = require("../models/Timetable");
const Slot = require("../models/Slot");
const { generatePeriods } = require("../utils/timeUtils");

/**
 * Create a timetable and generate empty slots for each day × period.
 */
async function createTimetableWithSlots({ roomId, days, periodsPerDay, startTime, periodDuration, createdBy }) {
  // Generate period time windows
  const generatedPeriods = generatePeriods(startTime, periodDuration, periodsPerDay);

  // Create the timetable document
  const timetable = await Timetable.create({
    roomId,
    days,
    periodsPerDay,
    startTime,
    periodDuration,
    generatedPeriods,
    createdBy,
  });

  // Generate empty slots for every day × period combination
  const slotDocs = [];
  for (const day of days) {
    for (let p = 1; p <= periodsPerDay; p++) {
      slotDocs.push({
        timetableId: timetable._id,
        roomId,
        day,
        periodNumber: p,
      });
    }
  }

  await Slot.insertMany(slotDocs);

  return timetable;
}

module.exports = { createTimetableWithSlots };
