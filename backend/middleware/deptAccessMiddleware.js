const Slot = require("../models/Slot");

/**
 * Department access middleware for slot editing.
 * SUPER_ADMIN can edit any slot.
 * DEPT_ADMIN can only edit slots already assigned to their own department.
 */
const deptAccessMiddleware = async (req, res, next) => {
  try {
    if (req.user.role === "SUPER_ADMIN") {
      return next();
    }

    // DEPT_ADMIN — check department ownership
    const slotId = req.params.slotId;
    if (!slotId) {
      return res.status(400).json({
        success: false,
        message: "Slot ID is required.",
      });
    }

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Slot not found.",
      });
    }

    // Allow editing only if slot belongs to user's department.
    // Empty slot assignment is restricted to SUPER_ADMIN.
    const slotDeptId = slot.departmentId ? slot.departmentId.toString() : null;
    const userDeptId = req.user.departmentId ? req.user.departmentId.toString() : null;

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

    // Attach slot to request for downstream use
    req.slot = slot;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = deptAccessMiddleware;
