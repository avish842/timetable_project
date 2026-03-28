const Room = require("../models/Room");

/**
 * GET /api/rooms
 */
exports.getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find().sort({ name: 1 });
    res.json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/rooms
 */
exports.createRoom = async (req, res, next) => {
  try {
    const { name, capacity } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Room name is required.",
      });
    }

    const room = await Room.create({ name: name.trim(), capacity: capacity || null });
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/rooms/:id
 */
exports.deleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if room exists
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    // Delete associated timetable and slots first (optional but good practice)
    const Timetable = require("../models/Timetable");
    const Slot = require("../models/Slot");
    const timetables = await Timetable.find({ roomId: id });
    for (const tt of timetables) {
      await Slot.deleteMany({ timetableId: tt._id });
      await Timetable.findByIdAndDelete(tt._id);
    }

    // Delete the room
    await Room.findByIdAndDelete(id);

    res.json({ success: true, message: "Room and associated timetables deleted successfully" });
  } catch (error) {
    next(error);
  }
};

