const Timetable = require("../models/Timetable");
const Slot = require("../models/Slot");
const Room = require("../models/Room");
const Department = require("../models/Department");
const SwapRequest = require("../models/SwapRequest");

/**
 * GET /api/analytics/dashboard
 * Returns aggregate analytics for the Super Admin dashboard.
 */
exports.getDashboardAnalytics = async (req, res, next) => {
  try {
    // ── 1. Basic counts ──────────────────────────────────────────────
    const [roomCount, departmentCount, timetableCount, totalSlots, filledSlots, swapStats] =
      await Promise.all([
        Room.countDocuments(),
        Department.countDocuments(),
        Timetable.countDocuments(),
        Slot.countDocuments(),
        Slot.countDocuments({ departmentId: { $ne: null } }),
        SwapRequest.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    const swapCounts = {};
    for (const s of swapStats) {
      swapCounts[s._id] = s.count;
    }

    const overallFillRate =
      totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

    // ── 2. Room utilization ──────────────────────────────────────────
    const roomUtilization = await Slot.aggregate([
      {
        $group: {
          _id: { roomId: "$roomId" },
          totalSlots: { $sum: 1 },
          filledSlots: {
            $sum: { $cond: [{ $ne: ["$departmentId", null] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "rooms",
          localField: "_id.roomId",
          foreignField: "_id",
          as: "room",
        },
      },
      { $unwind: "$room" },
      {
        $project: {
          _id: 0,
          roomId: "$_id.roomId",
          roomName: "$room.name",
          totalSlots: 1,
          filledSlots: 1,
          utilization: {
            $cond: [
              { $gt: ["$totalSlots", 0] },
              {
                $round: [
                  { $multiply: [{ $divide: ["$filledSlots", "$totalSlots"] }, 100] },
                  1,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { roomName: 1 } },
    ]);

    // ── 3. Teacher workload ──────────────────────────────────────────
    const teacherWorkload = await Slot.aggregate([
      { $match: { teacher: { $ne: "" } } },
      {
        $group: {
          _id: "$teacher",
          totalPeriods: { $sum: 1 },
          rooms: { $addToSet: "$roomId" },
        },
      },
      {
        $project: {
          _id: 0,
          teacher: "$_id",
          totalPeriods: 1,
          roomCount: { $size: "$rooms" },
        },
      },
      { $sort: { totalPeriods: -1 } },
      { $limit: 20 },
    ]);

    // ── 4. Department distribution ───────────────────────────────────
    const departmentDistribution = await Slot.aggregate([
      { $match: { departmentId: { $ne: null } } },
      {
        $group: {
          _id: "$departmentId",
          slotCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "_id",
          foreignField: "_id",
          as: "dept",
        },
      },
      { $unwind: "$dept" },
      {
        $project: {
          _id: 0,
          departmentId: "$_id",
          departmentName: "$dept.name",
          slotCount: 1,
        },
      },
      { $sort: { slotCount: -1 } },
    ]);

    // ── 5. Response ──────────────────────────────────────────────────
    res.json({
      success: true,
      data: {
        summary: {
          rooms: roomCount,
          departments: departmentCount,
          timetables: timetableCount,
          totalSlots,
          filledSlots,
          overallFillRate,
          uniqueTeachers: teacherWorkload.length,
          pendingSwaps: (swapCounts["PENDING_TARGET"] || 0) + (swapCounts["PENDING_ADMIN"] || 0),
          completedSwaps: swapCounts["COMPLETED"] || 0,
        },
        roomUtilization,
        teacherWorkload,
        departmentDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
};
