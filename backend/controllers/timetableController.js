const Timetable = require("../models/Timetable");
const Room = require("../models/Room");
const Slot = require("../models/Slot");
const Department = require("../models/Department");
const XLSX = require("xlsx");
const { createTimetableWithSlots } = require("../services/timetableService");
const { checkConflicts } = require("../services/conflictService");
const { sendDepartmentTimetableEmail } = require("../services/emailService");

const HEADER_REGEX = /^Period\s+(\d+)\s*\(([^)]+)\)$/i;

function to24Hour(timeText) {
  const value = String(timeText || "").trim();
  if (!value) return null;

  const m24 = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (m24) {
    const hh = String(parseInt(m24[1], 10)).padStart(2, "0");
    return `${hh}:${m24[2]}`;
  }

  const m12 = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m12) return null;

  let hour = parseInt(m12[1], 10);
  const minute = m12[2];
  const ampm = m12[3].toUpperCase();

  if (hour === 12) hour = 0;
  if (ampm === "PM") hour += 12;

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function parseHeaderPeriods(headerRow) {
  const periodColumns = [];
  for (let colIndex = 1; colIndex < headerRow.length; colIndex += 1) {
    const header = String(headerRow[colIndex] || "").trim();
    if (!header) continue;

    const matched = header.match(HEADER_REGEX);
    if (!matched) {
      throw new Error(
        `Invalid period header "${header}" at column ${colIndex + 1}. Expected format: Period 1 (09:00 AM - 10:00 AM).`
      );
    }

    const periodNumber = parseInt(matched[1], 10);
    const [rawStart, rawEnd] = matched[2].split("-").map((s) => s.trim());
    const startTime = to24Hour(rawStart);
    const endTime = to24Hour(rawEnd);

    if (!startTime || !endTime) {
      throw new Error(`Invalid time range in header "${header}".`);
    }

    const duration = toMinutes(endTime) - toMinutes(startTime);
    if (duration <= 0) {
      throw new Error(`End time must be after start time in header "${header}".`);
    }

    periodColumns.push({ periodNumber, startTime, endTime, colIndex, header });
  }

  if (!periodColumns.length) {
    throw new Error("Excel must contain at least one period column.");
  }

  const periodNumbers = periodColumns.map((p) => p.periodNumber);
  const uniquePeriodNumbers = new Set(periodNumbers);
  if (uniquePeriodNumbers.size !== periodNumbers.length) {
    throw new Error("Duplicate period numbers found in header row.");
  }

  const orderedPeriods = [...periodColumns].sort((a, b) => a.periodNumber - b.periodNumber);
  const first = orderedPeriods[0];
  const duration = toMinutes(first.endTime) - toMinutes(first.startTime);
  if (duration < 10 || duration > 180) {
    throw new Error("Could not infer a valid period duration from Excel headers.");
  }

  const hasMixedDurations = orderedPeriods.some(
    (p) => toMinutes(p.endTime) - toMinutes(p.startTime) !== duration
  );
  if (hasMixedDurations) {
    throw new Error("All period headers must use the same duration.");
  }

  const expected = orderedPeriods.map((p) => p.periodNumber);
  const isSequential = expected.every((n, idx) => n === idx + 1);

  if (!isSequential) {
    throw new Error("Period headers must be sequential starting from Period 1.");
  }

  return {
    periodsPerDay: orderedPeriods.length,
    startTime: first.startTime,
    periodDuration: duration,
    periodColumns: orderedPeriods,
  };
}

function parseCellValue(rawValue, departmentByName) {
  const text = String(rawValue || "").trim();
  if (!text) return { departmentId: null, subject: "", teacher: "" };

  const parts = text
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);

  if (!parts.length) return { departmentId: null, subject: "", teacher: "" };

  const maybeDept = departmentByName.get(parts[0].toLowerCase()) || null;
  if (maybeDept) {
    return {
      departmentId: maybeDept._id,
      subject: parts[1] || "",
      teacher: parts.slice(2).join(" | ") || "",
    };
  }

  if (parts.length >= 2) {
    return {
      departmentId: null,
      subject: "",
      teacher: "",
      parseError: `Unknown department "${parts[0]}" in slot value "${text}".`,
    };
  }

  return {
    departmentId: null,
    subject: parts[0] || "",
    teacher: parts.slice(1).join(" | ") || "",
  };
}

/**
 * POST /api/timetable/create
 * Create timetable and auto-generate empty slots.
 */
exports.createTimetable = async (req, res, next) => {
  try {
    const { roomId, days, periodsPerDay, startTime, periodDuration } = req.body;

    // Validation
    if (!roomId || !days || !periodsPerDay || !startTime || !periodDuration) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: roomId, days, periodsPerDay, startTime, periodDuration.",
      });
    }

    // Verify room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    // Check if timetable already exists for this room
    const existing = await Timetable.findOne({ roomId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A timetable already exists for this room. Delete it first to create a new one.",
      });
    }

    const timetable = await createTimetableWithSlots({
      roomId,
      days,
      periodsPerDay,
      startTime,
      periodDuration,
      createdBy: req.user.userId,
    });

    const populated = await Timetable.findById(timetable._id).populate("roomId", "name");

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timetable/:roomId
 * Get timetable by room ID.
 */
exports.getTimetableByRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    const timetable = await Timetable.findOne({ roomId })
      .populate("roomId", "name capacity")
      .populate("createdBy", "username");

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: "No timetable found for this room.",
      });
    }

    res.json({ success: true, data: timetable });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/timetable/:id
 * Delete a timetable and all its associated slots.
 */
exports.deleteTimetable = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: "Timetable not found.",
      });
    }

    // Delete all slots first
    const Slot = require("../models/Slot");
    await Slot.deleteMany({ timetableId: timetable._id });

    // Delete the timetable
    await Timetable.findByIdAndDelete(id);

    res.json({ success: true, message: "Timetable deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/timetable/:id/send-department-emails
 * Send timetable assignment summary emails to departments included in this timetable.
 */
exports.sendDepartmentAssignmentEmails = async (req, res, next) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate("roomId", "name")
      .populate("createdBy", "name email");

    if (!timetable) {
      return res.status(404).json({ success: false, message: "Timetable not found." });
    }

    const slots = await Slot.find({
      timetableId: timetable._id,
      departmentId: { $ne: null },
    })
      .populate("departmentId", "name email")
      .sort({ day: 1, periodNumber: 1 });

    if (!slots.length) {
      return res.status(400).json({
        success: false,
        message: "No assigned department slots found in this timetable.",
      });
    }

    const periodMeta = new Map(
      (timetable.generatedPeriods || []).map((p) => [
        p.periodNumber,
        { startTime: p.startTime, endTime: p.endTime },
      ])
    );

    const grouped = new Map();
    for (const slot of slots) {
      const dept = slot.departmentId;
      if (!dept || !dept.email) continue;

      const deptKey = String(dept._id);
      if (!grouped.has(deptKey)) {
        grouped.set(deptKey, {
          departmentId: deptKey,
          departmentName: dept.name,
          email: dept.email,
          slotRows: [],
        });
      }

      const period = periodMeta.get(slot.periodNumber) || {};
      grouped.get(deptKey).slotRows.push({
        day: slot.day,
        periodNumber: slot.periodNumber,
        startTime: period.startTime || "--:--",
        endTime: period.endTime || "--:--",
        subject: slot.subject || "",
        teacher: slot.teacher || "",
      });
    }

    if (!grouped.size) {
      return res.status(400).json({
        success: false,
        message: "No departments with valid email addresses found in assigned slots.",
      });
    }

    const generatedBy =
      timetable.createdBy?.name || timetable.createdBy?.email || "Timetable Admin";
    const roomName = timetable.roomId?.name || "Room";

    const sent = [];
    const failed = [];

    for (const item of grouped.values()) {
      try {
        const result = await sendDepartmentTimetableEmail({
          to: item.email,
          departmentName: item.departmentName,
          roomName,
          slotRows: item.slotRows,
          generatedBy,
        });

        sent.push({
          departmentId: item.departmentId,
          departmentName: item.departmentName,
          email: item.email,
          emailId: result?.id || null,
          slotCount: item.slotRows.length,
        });
      } catch (error) {
        failed.push({
          departmentId: item.departmentId,
          departmentName: item.departmentName,
          email: item.email,
          reason: error.message,
        });
      }
    }

    const statusCode = failed.length ? 207 : 200;
    return res.status(statusCode).json({
      success: failed.length === 0,
      message: failed.length
        ? `Emails sent to ${sent.length} department(s), failed for ${failed.length}.`
        : `Emails sent to ${sent.length} department(s).`,
      data: {
        timetableId: String(timetable._id),
        roomName,
        sentCount: sent.length,
        failedCount: failed.length,
        sent,
        failed,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timetable/room-status
 * Return timetable availability per room.
 */
exports.getRoomTimetableStatus = async (req, res, next) => {
  try {
    const rooms = await Room.find({}, "name capacity").sort({ name: 1 });
    const timetables = await Timetable.find({}, "roomId");

    const timetableByRoomId = new Map(
      timetables.map((tt) => [String(tt.roomId), String(tt._id)])
    );

    const data = rooms.map((room) => {
      const key = String(room._id);
      return {
        roomId: key,
        roomName: room.name,
        capacity: room.capacity || null,
        hasTimetable: timetableByRoomId.has(key),
        timetableId: timetableByRoomId.get(key) || null,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timetable/mine
 * Get timetables created by the current user.
 */
exports.getMyTimetables = async (req, res, next) => {
  try {
    const timetables = await Timetable.find({ createdBy: req.user.userId })
      .populate("roomId", "name capacity")
      .sort({ createdAt: -1 });

    const data = timetables.map((tt) => ({
      _id: tt._id,
      roomId: tt.roomId?._id || null,
      roomName: tt.roomId?.name || "Unknown Room",
      roomCapacity: tt.roomId?.capacity || null,
      daysCount: tt.days?.length || 0,
      periodsPerDay: tt.periodsPerDay,
      periodDuration: tt.periodDuration,
      startTime: tt.startTime,
      createdAt: tt.createdAt,
      updatedAt: tt.updatedAt,
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timetable/dept-rooms/me
 * Get room ids where current department is present in slots.
 */
exports.getMyDepartmentRoomIds = async (req, res, next) => {
  try {
    if (!req.user.departmentId) {
      return res.status(400).json({
        success: false,
        message: "Department is not mapped to this user.",
      });
    }

    const roomIds = await Slot.distinct("roomId", {
      departmentId: req.user.departmentId,
    });

    res.json({ success: true, data: roomIds.map(String) });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/timetable/import
 * Create a timetable from uploaded Excel and populate slots.
 */
exports.importTimetableFromExcel = async (req, res, next) => {
  let createdTimetableId = null;
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "roomId is required.",
      });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required. Upload a .xlsx or .xls file.",
      });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    const existing = await Timetable.findOne({ roomId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A timetable already exists for this room. Delete it first before importing.",
      });
    }

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) {
      return res.status(400).json({ success: false, message: "Uploaded Excel file is empty." });
    }

    const ws = wb.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });

    if (!rows.length || !rows[0].length) {
      return res.status(400).json({ success: false, message: "Excel sheet has no usable data." });
    }

    const headerRow = rows[0].map((v) => String(v || "").trim());
    if (headerRow[0].toLowerCase() !== "day") {
      return res.status(400).json({
        success: false,
        message: 'First column header must be "Day".',
      });
    }

    const { periodsPerDay, startTime, periodDuration, periodColumns } = parseHeaderPeriods(headerRow);

    const dayRows = rows.slice(1).filter((row) => String(row[0] || "").trim() !== "");
    if (!dayRows.length) {
      return res.status(400).json({ success: false, message: "Excel must include at least one day row." });
    }

    const dayKeys = new Set();
    const uniqueDays = [];
    for (const row of dayRows) {
      const day = String(row[0] || "").trim();
      const normalizedDay = day.toLowerCase();
      if (dayKeys.has(normalizedDay)) {
        return res.status(400).json({
          success: false,
          message: `Duplicate day row found: ${day}. Please keep only one row per day.`,
        });
      }
      dayKeys.add(normalizedDay);
      uniqueDays.push(day);
    }

    const allowedColumnIndexes = new Set([0, ...periodColumns.map((p) => p.colIndex)]);
    let skippedCellsCount = 0;
    const skippedCells = [];
    for (const row of dayRows) {
      const day = String(row[0] || "").trim();
      for (let col = 1; col < row.length; col += 1) {
        if (allowedColumnIndexes.has(col)) continue;
        const raw = String(row[col] || "").trim();
        if (!raw) continue;

        skippedCellsCount += 1;
        if (skippedCells.length < 20) {
          skippedCells.push({
            day,
            column: col + 1,
            value: raw,
            reason: "No valid period header for this column in current structure.",
          });
        }
      }
    }

    const departments = await Department.find({}, "name");
    const departmentByName = new Map(departments.map((d) => [d.name.toLowerCase(), d]));

    const timetable = await createTimetableWithSlots({
      roomId,
      days: uniqueDays,
      periodsPerDay,
      startTime,
      periodDuration,
      createdBy: req.user.userId,
    });
    createdTimetableId = timetable._id;

    const slots = await Slot.find({ timetableId: timetable._id });
    const slotMap = new Map(slots.map((s) => [`${s.day}-${s.periodNumber}`, s]));

    let updatedCount = 0;
    let teacherClearedCount = 0;
    const teacherConflictWarnings = [];

    for (const row of dayRows) {
      const day = String(row[0]).trim();
      for (const periodCol of periodColumns) {
        const p = periodCol.periodNumber;
        const rawCell = row[periodCol.colIndex] || "";
        const parsed = parseCellValue(rawCell, departmentByName);
        if (parsed.parseError) {
          return res.status(400).json({
            success: false,
            message: `Import failed at ${day}, period ${p}. ${parsed.parseError}`,
          });
        }
        const isEmpty = !parsed.departmentId && !parsed.subject && !parsed.teacher;
        if (isEmpty) continue;

        const slot = slotMap.get(`${day}-${p}`);
        if (!slot) {
          throw new Error(`Unable to map slot for ${day}, period ${p}.`);
        }

        const conflict = await checkConflicts({
          slotId: slot._id,
          day,
          periodNumber: p,
          teacher: parsed.teacher,
        });

        if (conflict.hasConflict) {
          if (parsed.teacher) {
            // Soft conflict handling: keep the slot but clear teacher in imported timetable.
            teacherConflictWarnings.push({
              day,
              periodNumber: p,
              teacher: parsed.teacher,
              message: conflict.message,
            });
            teacherClearedCount += 1;
            parsed.teacher = "";
          } else {
            const error = new Error(`Import failed at ${day}, period ${p}. ${conflict.message}`);
            error.statusCode = 409;
            throw error;
          }
        }

        slot.departmentId = parsed.departmentId || null;
        slot.subject = parsed.subject;
        slot.teacher = parsed.teacher;
        slot.updatedBy = req.user.userId;
        await slot.save();
        updatedCount += 1;
      }
    }

    const populated = await Timetable.findById(timetable._id).populate("roomId", "name");

    return res.status(201).json({
      success: true,
      message:
        teacherClearedCount > 0 || skippedCellsCount > 0
          ? `Timetable imported with ${teacherClearedCount} teacher adjustment(s) and ${skippedCellsCount} skipped cell(s).`
          : "Timetable imported successfully.",
      data: {
        timetable: populated,
        rowsProcessed: dayRows.length,
        slotsUpdated: updatedCount,
        teacherClearedCount,
        teacherConflictWarnings,
        skippedCellsCount,
        skippedCells,
      },
    });
  } catch (error) {
    if (createdTimetableId) {
      await Slot.deleteMany({ timetableId: createdTimetableId });
      await Timetable.findByIdAndDelete(createdTimetableId);
    }
    next(error);
  }
};

