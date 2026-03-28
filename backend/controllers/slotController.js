const Slot = require("../models/Slot");
const { checkConflicts } = require("../services/conflictService");

/**
 * GET /api/slots?timetableId=xxx
 * Get all slots for a timetable.
 */
exports.getSlots = async (req, res, next) => {
  try {
    const { timetableId } = req.query;

    if (!timetableId) {
      return res.status(400).json({
        success: false,
        message: "timetableId query parameter is required.",
      });
    }

    const slots = await Slot.find({ timetableId })
      .populate("departmentId", "name")
      .populate("roomId", "name")
      .populate("updatedBy", "username")
      .sort({ day: 1, periodNumber: 1 });

    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/slots/:slotId
 * Update a slot with conflict detection.
 */
exports.updateSlot = async (req, res, next) => {
  try {
    const { slotId } = req.params;
    const { departmentId, subject, teacher } = req.body;

    // Use slot from deptAccessMiddleware or fetch fresh
    const slot = req.slot || await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Slot not found.",
      });
    }

    if (req.user.role === "DEPT_ADMIN") {
      const slotDeptId = slot.departmentId ? String(slot.departmentId) : null;
      const userDeptId = req.user.departmentId ? String(req.user.departmentId) : null;

      if (!slotDeptId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only SUPER_ADMIN can assign empty slots.",
        });
      }

      if (slotDeptId !== userDeptId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only edit slots assigned to your department.",
        });
      }

      const requestedDept = departmentId ? String(departmentId) : null;
      if (requestedDept !== slotDeptId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Department reassignment is allowed only for SUPER_ADMIN.",
        });
      }
    }

    // Run conflict checks
    const conflict = await checkConflicts({
      slotId: slot._id,
      day: slot.day,
      periodNumber: slot.periodNumber,
      teacher: teacher || "",
      departmentId: departmentId || null,
    });

    if (conflict.hasConflict) {
      return res.status(409).json({
        success: false,
        message: conflict.message,
      });
    }

    // Apply updates
    slot.departmentId = departmentId || null;
    slot.subject = subject || "";
    slot.teacher = teacher || "";
    slot.updatedBy = req.user.userId;
    await slot.save();

    // Return populated slot
    const updated = await Slot.findById(slot._id)
      .populate("departmentId", "name")
      .populate("roomId", "name")
      .populate("updatedBy", "username");

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
