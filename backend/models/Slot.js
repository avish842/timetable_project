const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    timetableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timetable",
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    day: {
      type: String,
      required: true,
    },
    periodNumber: {
      type: Number,
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    subject: {
      type: String,
      default: "",
      trim: true,
    },
    teacher: {
      type: String,
      default: "",
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Unique compound index: one slot per timetable + day + period
slotSchema.index({ timetableId: 1, day: 1, periodNumber: 1 }, { unique: true });

module.exports = mongoose.model("Slot", slotSchema);
