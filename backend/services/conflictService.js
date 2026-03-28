const Slot = require("../models/Slot");

/**
 * Check for scheduling conflicts before updating a slot.
 *
 * Conflict 1: Same teacher assigned in another room at the same day + period
 *
 * @param {Object} params
 * @param {string} params.slotId - The slot being updated (excluded from checks)
 * @param {string} params.day - Day of the slot
 * @param {number} params.periodNumber - Period number
 * @param {string} params.teacher - Teacher name
 * @param {string} params.departmentId - Department ObjectId
 * @returns {Object} { hasConflict: boolean, message: string }
 */
async function checkConflicts({ slotId, day, periodNumber, teacher }) {
  // 1) Teacher conflict: same teacher in a different slot at the same time
  if (teacher && teacher.trim() !== "") {
    const teacherConflict = await Slot.findOne({
      _id: { $ne: slotId },
      day,
      periodNumber,
      teacher: teacher.trim(),
    }).populate("roomId", "name");

    if (teacherConflict) {
      const roomName = teacherConflict.roomId?.name || "another room";
      return {
        hasConflict: true,
        message: `Conflict: Teacher "${teacher}" is already assigned on ${day}, period ${periodNumber} in ${roomName}.`,
      };
    }
  }

  return { hasConflict: false, message: "" };
}

module.exports = { checkConflicts };
