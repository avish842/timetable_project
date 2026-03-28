const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "Room is required"],
    },
    days: {
      type: [String],
      required: [true, "Days are required"],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one day is required",
      },
    },
    periodsPerDay: {
      type: Number,
      required: [true, "Periods per day is required"],
      min: 1,
      max: 20,
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must be in HH:mm format"],
    },
    periodDuration: {
      type: Number,
      required: [true, "Period duration is required"],
      min: 10,
      max: 180,
    },
    generatedPeriods: [
      {
        periodNumber: { type: Number, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Timetable", timetableSchema);
