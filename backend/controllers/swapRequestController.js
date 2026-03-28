const Slot = require("../models/Slot");
const SwapRequest = require("../models/SwapRequest");
const { checkConflicts } = require("../services/conflictService");

const ACTIVE_STATUSES = ["PENDING_TARGET", "PENDING_ADMIN"];

const toStringId = (value) => (value ? String(value) : null);

const buildSnapshot = (slot) => ({
  slotId: slot._id,
  departmentId: slot.departmentId?._id || slot.departmentId,
  departmentName: slot.departmentId?.name || "",
  roomId: slot.roomId?._id || slot.roomId,
  roomName: slot.roomId?.name || "",
  timetableId: slot.timetableId,
  day: slot.day,
  periodNumber: slot.periodNumber,
  subject: slot.subject || "",
  teacher: slot.teacher || "",
});

const assertSlotSnapshotMatches = (slot, snapshot, label) => {
  const sameDepartment = toStringId(slot.departmentId) === toStringId(snapshot.departmentId);
  const sameTeacher = (slot.teacher || "") === (snapshot.teacher || "");
  const sameSubject = (slot.subject || "") === (snapshot.subject || "");
  const sameDay = slot.day === snapshot.day;
  const samePeriod = slot.periodNumber === snapshot.periodNumber;
  const sameTimetable = toStringId(slot.timetableId) === toStringId(snapshot.timetableId);

  if (!sameDepartment || !sameTeacher || !sameSubject || !sameDay || !samePeriod || !sameTimetable) {
    const error = new Error(
      `${label} slot has changed since request creation. Please create a new swap request.`
    );
    error.statusCode = 409;
    throw error;
  }
};

const isDeptAdminOf = (req, departmentId) =>
  req.user.role === "DEPT_ADMIN" && toStringId(req.user.departmentId) === toStringId(departmentId);

const canViewRequest = (req, request) => {
  if (req.user.role === "SUPER_ADMIN") return true;

  const userId = toStringId(req.user.userId);
  const userDeptId = toStringId(req.user.departmentId);

  return (
    toStringId(request.requestedBy?._id || request.requestedBy) === userId ||
    toStringId(request.sourceDepartmentId) === userDeptId ||
    toStringId(request.targetDepartmentId) === userDeptId
  );
};

const mapRequestForClient = (req, request) => {
  const userId = toStringId(req.user.userId);
  const userDeptId = toStringId(req.user.departmentId);
  const status = request.status;

  return {
    _id: request._id,
    status,
    reason: request.reason,
    sourceSlotId: request.sourceSlotId,
    targetSlotId: request.targetSlotId,
    timetableId: request.timetableId,
    sourceDepartmentId: request.sourceDepartmentId,
    targetDepartmentId: request.targetDepartmentId,
    sourceSnapshot: request.sourceSnapshot,
    targetSnapshot: request.targetSnapshot,
    requestedBy: request.requestedBy,
    targetApprovedBy: request.targetApprovedBy,
    targetApprovedAt: request.targetApprovedAt,
    rejectedBy: request.rejectedBy,
    rejectedAt: request.rejectedAt,
    rejectionReason: request.rejectionReason,
    cancelledBy: request.cancelledBy,
    cancelledAt: request.cancelledAt,
    cancelReason: request.cancelReason,
    adminActionBy: request.adminActionBy,
    adminActionAt: request.adminActionAt,
    adminNote: request.adminNote,
    completedAt: request.completedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    permissions: {
      canTargetApprove:
        status === "PENDING_TARGET" &&
        (req.user.role === "SUPER_ADMIN" || userDeptId === toStringId(request.targetDepartmentId)),
      canAdminFinalize: status === "PENDING_ADMIN" && req.user.role === "SUPER_ADMIN",
      canCancel:
        ACTIVE_STATUSES.includes(status) &&
        (req.user.role === "SUPER_ADMIN" ||
          toStringId(request.requestedBy?._id || request.requestedBy) === userId),
      canReject:
        (status === "PENDING_TARGET" &&
          (req.user.role === "SUPER_ADMIN" || userDeptId === toStringId(request.targetDepartmentId))) ||
        (status === "PENDING_ADMIN" && req.user.role === "SUPER_ADMIN"),
    },
  };
};

/**
 * GET /api/swaps/eligible-slots?timetableId=...
 */
exports.getEligibleSlots = async (req, res, next) => {
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
      .sort({ day: 1, periodNumber: 1 });

    const userDeptId = toStringId(req.user.departmentId);

    const data = slots.map((slot) => {
      const slotDeptId = toStringId(slot.departmentId?._id || slot.departmentId);
      const hasDepartment = Boolean(slotDeptId);

      return {
        _id: slot._id,
        day: slot.day,
        periodNumber: slot.periodNumber,
        subject: slot.subject || "",
        teacher: slot.teacher || "",
        roomName: slot.roomId?.name || "",
        departmentId: slot.departmentId?._id || slot.departmentId || null,
        departmentName: slot.departmentId?.name || "",
        isAssigned: hasDepartment,
        canBeSource:
          (req.user.role === "SUPER_ADMIN" && hasDepartment) ||
          (req.user.role === "DEPT_ADMIN" && hasDepartment && slotDeptId === userDeptId),
        canBeTarget: hasDepartment,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/swaps
 */
exports.createSwapRequest = async (req, res, next) => {
  try {
    const { sourceSlotId, targetSlotId, reason = "" } = req.body;

    if (!sourceSlotId || !targetSlotId) {
      return res.status(400).json({
        success: false,
        message: "sourceSlotId and targetSlotId are required.",
      });
    }

    if (toStringId(sourceSlotId) === toStringId(targetSlotId)) {
      return res.status(400).json({
        success: false,
        message: "Source and target slots must be different.",
      });
    }

    const [sourceSlot, targetSlot] = await Promise.all([
      Slot.findById(sourceSlotId).populate("departmentId", "name").populate("roomId", "name"),
      Slot.findById(targetSlotId).populate("departmentId", "name").populate("roomId", "name"),
    ]);

    if (!sourceSlot || !targetSlot) {
      return res.status(404).json({
        success: false,
        message: "One or both selected slots were not found.",
      });
    }

    if (toStringId(sourceSlot.timetableId) !== toStringId(targetSlot.timetableId)) {
      return res.status(400).json({
        success: false,
        message: "Swap is allowed only between slots of the same timetable.",
      });
    }

    const sourceDeptId = toStringId(sourceSlot.departmentId?._id || sourceSlot.departmentId);
    const targetDeptId = toStringId(targetSlot.departmentId?._id || targetSlot.departmentId);

    if (!sourceDeptId || !targetDeptId) {
      return res.status(400).json({
        success: false,
        message: "Both source and target slots must already be assigned to departments.",
      });
    }


    if (req.user.role === "DEPT_ADMIN" && sourceDeptId !== toStringId(req.user.departmentId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can request swap only from your department's slot.",
      });
    }

    const existing = await SwapRequest.findOne({
      status: { $in: ACTIVE_STATUSES },
      $or: [
        { sourceSlotId, targetSlotId },
        { sourceSlotId: targetSlotId, targetSlotId: sourceSlotId },
      ],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An active swap request already exists for this slot pair.",
      });
    }

    const request = await SwapRequest.create({
      sourceSlotId: sourceSlot._id,
      targetSlotId: targetSlot._id,
      timetableId: sourceSlot.timetableId,
      sourceDepartmentId: sourceSlot.departmentId,
      targetDepartmentId: targetSlot.departmentId,
      sourceSnapshot: buildSnapshot(sourceSlot),
      targetSnapshot: buildSnapshot(targetSlot),
      reason,
      requestedBy: req.user.userId,
      status: "PENDING_TARGET",
    });

    const populated = await SwapRequest.findById(request._id)
      .populate("requestedBy", "username role")
      .populate("targetApprovedBy", "username role")
      .populate("adminActionBy", "username role")
      .populate("rejectedBy", "username role")
      .populate("cancelledBy", "username role");

    res.status(201).json({
      success: true,
      message: "Swap request created. Waiting for target department approval.",
      data: mapRequestForClient(req, populated),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/swaps
 */
exports.getSwapRequests = async (req, res, next) => {
  try {
    const query = {};

    if (req.user.role === "DEPT_ADMIN") {
      const userDeptId = toStringId(req.user.departmentId);
      query.$or = [
        { requestedBy: req.user.userId },
        { sourceDepartmentId: userDeptId },
        { targetDepartmentId: userDeptId },
      ];
    }

    const requests = await SwapRequest.find(query)
      .populate("requestedBy", "username role")
      .populate("targetApprovedBy", "username role")
      .populate("adminActionBy", "username role")
      .populate("rejectedBy", "username role")
      .populate("cancelledBy", "username role")
      .sort({ createdAt: -1 });

    const data = requests.filter((r) => canViewRequest(req, r)).map((r) => mapRequestForClient(req, r));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/swaps/:id/target-approve
 */
exports.targetApproveSwap = async (req, res, next) => {
  try {
    const request = await SwapRequest.findById(req.params.id)
      .populate("requestedBy", "username role")
      .populate("targetApprovedBy", "username role")
      .populate("adminActionBy", "username role")
      .populate("rejectedBy", "username role")
      .populate("cancelledBy", "username role");

    if (!request) {
      return res.status(404).json({ success: false, message: "Swap request not found." });
    }

    if (request.status !== "PENDING_TARGET") {
      return res.status(400).json({
        success: false,
        message: "Only requests pending target approval can be approved at this stage.",
      });
    }

    if (!(req.user.role === "SUPER_ADMIN" || isDeptAdminOf(req, request.targetDepartmentId))) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only target department admin can approve this request.",
      });
    }

    request.status = "PENDING_ADMIN";
    request.targetApprovedBy = req.user.userId;
    request.targetApprovedAt = new Date();
    await request.save();

    const updated = await SwapRequest.findById(request._id)
      .populate("requestedBy", "username role")
      .populate("targetApprovedBy", "username role")
      .populate("adminActionBy", "username role")
      .populate("rejectedBy", "username role")
      .populate("cancelledBy", "username role");

    res.json({
      success: true,
      message: "Target approval completed. Waiting for super admin finalization.",
      data: mapRequestForClient(req, updated),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/swaps/:id/target-reject
 */
exports.targetRejectSwap = async (req, res, next) => {
  try {
    const { reason = "" } = req.body;
    const request = await SwapRequest.findById(req.params.id)
      .populate("requestedBy", "username role")
      .populate("targetApprovedBy", "username role")
      .populate("adminActionBy", "username role")
      .populate("rejectedBy", "username role")
      .populate("cancelledBy", "username role");

    if (!request) {
      return res.status(404).json({ success: false, message: "Swap request not found." });
    }

    if (!ACTIVE_STATUSES.includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: "Only active requests can be rejected.",
      });
    }

    const canRejectAsTarget = request.status === "PENDING_TARGET" && isDeptAdminOf(req, request.targetDepartmentId);
    const canRejectAsAdmin = req.user.role === "SUPER_ADMIN";

    if (!canRejectAsTarget && !canRejectAsAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not allowed to reject this request.",
      });
    }

    request.status = "REJECTED";
    request.rejectedBy = req.user.userId;
    request.rejectedAt = new Date();
    request.rejectionReason = reason;
    await request.save();

    const updated = await SwapRequest.findById(request._id)
      .populate("requestedBy", "username role")
      .populate("targetApprovedBy", "username role")
      .populate("adminActionBy", "username role")
      .populate("rejectedBy", "username role")
      .populate("cancelledBy", "username role");

    res.json({
      success: true,
      message: "Swap request rejected.",
      data: mapRequestForClient(req, updated),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/swaps/:id/cancel
 */
exports.cancelSwap = async (req, res, next) => {
  try {
    const { reason = "" } = req.body;
    const request = await SwapRequest.findById(req.params.id)
      .populate("requestedBy", "username role")
      .populate("targetApprovedBy", "username role")
      .populate("adminActionBy", "username role")
      .populate("rejectedBy", "username role")
      .populate("cancelledBy", "username role");

    if (!request) {
      return res.status(404).json({ success: false, message: "Swap request not found." });
    }

    if (!ACTIVE_STATUSES.includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: "Only active requests can be cancelled.",
      });
    }

    const isRequester = toStringId(request.requestedBy?._id || request.requestedBy) === toStringId(req.user.userId);
    if (!(req.user.role === "SUPER_ADMIN" || isRequester)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only requester or super admin can cancel.",
      });
    }

    request.status = "CANCELLED";
    request.cancelledBy = req.user.userId;
    request.cancelledAt = new Date();
    request.cancelReason = reason;
    await request.save();

    const updated = await SwapRequest.findById(request._id)
      .populate("requestedBy", "username role")
      .populate("targetApprovedBy", "username role")
      .populate("adminActionBy", "username role")
      .populate("rejectedBy", "username role")
      .populate("cancelledBy", "username role");

    res.json({
      success: true,
      message: "Swap request cancelled.",
      data: mapRequestForClient(req, updated),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/swaps/:id/admin-finalize
 */
exports.adminFinalizeSwap = async (req, res, next) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only SUPER_ADMIN can finalize swaps.",
      });
    }

    const { note = "" } = req.body;

    const request = await SwapRequest.findById(req.params.id)
      .populate("requestedBy", "username role")
      .populate("targetApprovedBy", "username role")
      .populate("adminActionBy", "username role")
      .populate("rejectedBy", "username role")
      .populate("cancelledBy", "username role");

    if (!request) {
      return res.status(404).json({ success: false, message: "Swap request not found." });
    }

    if (request.status !== "PENDING_ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Only requests pending admin action can be finalized.",
      });
    }

    const [sourceSlot, targetSlot] = await Promise.all([
      Slot.findById(request.sourceSlotId),
      Slot.findById(request.targetSlotId),
    ]);

    if (!sourceSlot || !targetSlot) {
      return res.status(404).json({
        success: false,
        message: "Swap slot not found. Request cannot be finalized.",
      });
    }

    assertSlotSnapshotMatches(sourceSlot, request.sourceSnapshot, "Source");
    assertSlotSnapshotMatches(targetSlot, request.targetSnapshot, "Target");

    const sourceNewTeacher = request.targetSnapshot.teacher;
    const targetNewTeacher = request.sourceSnapshot.teacher;

    const sourceConflict = await checkConflicts({
      slotId: sourceSlot._id,
      day: sourceSlot.day,
      periodNumber: sourceSlot.periodNumber,
      teacher: sourceNewTeacher,
    });

    if (sourceConflict.hasConflict) {
      const error = new Error(`Cannot finalize swap. ${sourceConflict.message}`);
      error.statusCode = 409;
      throw error;
    }

    const targetConflict = await checkConflicts({
      slotId: targetSlot._id,
      day: targetSlot.day,
      periodNumber: targetSlot.periodNumber,
      teacher: targetNewTeacher,
    });

    if (targetConflict.hasConflict) {
      const error = new Error(`Cannot finalize swap. ${targetConflict.message}`);
      error.statusCode = 409;
      throw error;
    }

    sourceSlot.departmentId = request.targetSnapshot.departmentId;
    sourceSlot.subject = request.targetSnapshot.subject || "";
    sourceSlot.teacher = request.targetSnapshot.teacher || "";
    sourceSlot.updatedBy = req.user.userId;

    targetSlot.departmentId = request.sourceSnapshot.departmentId;
    targetSlot.subject = request.sourceSnapshot.subject || "";
    targetSlot.teacher = request.sourceSnapshot.teacher || "";
    targetSlot.updatedBy = req.user.userId;

    await Promise.all([sourceSlot.save(), targetSlot.save()]);

    request.status = "COMPLETED";
    request.adminActionBy = req.user.userId;
    request.adminActionAt = new Date();
    request.adminNote = note;
    request.completedAt = new Date();
    await request.save();

    const updated = await SwapRequest.findById(request._id)
      .populate("requestedBy", "username role")
      .populate("targetApprovedBy", "username role")
      .populate("adminActionBy", "username role")
      .populate("rejectedBy", "username role")
      .populate("cancelledBy", "username role");

    res.json({
      success: true,
      message: "Swap finalized successfully.",
      data: mapRequestForClient(req, updated),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/swaps/:id/admin-reject
 */
exports.adminRejectSwap = async (req, res, next) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only SUPER_ADMIN can reject at admin stage.",
      });
    }

    const { reason = "" } = req.body;

    const request = await SwapRequest.findById(req.params.id)
      .populate("requestedBy", "username role")
      .populate("targetApprovedBy", "username role")
      .populate("adminActionBy", "username role")
      .populate("rejectedBy", "username role")
      .populate("cancelledBy", "username role");

    if (!request) {
      return res.status(404).json({ success: false, message: "Swap request not found." });
    }

    if (!ACTIVE_STATUSES.includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: "Only active requests can be rejected.",
      });
    }

    request.status = "REJECTED";
    request.rejectedBy = req.user.userId;
    request.rejectedAt = new Date();
    request.rejectionReason = reason;
    request.adminActionBy = req.user.userId;
    request.adminActionAt = new Date();
    request.adminNote = reason;
    await request.save();

    const updated = await SwapRequest.findById(request._id)
      .populate("requestedBy", "username role")
      .populate("targetApprovedBy", "username role")
      .populate("adminActionBy", "username role")
      .populate("rejectedBy", "username role")
      .populate("cancelledBy", "username role");

    res.json({
      success: true,
      message: "Swap request rejected by super admin.",
      data: mapRequestForClient(req, updated),
    });
  } catch (error) {
    next(error);
  }
};
