/**
 * Seed script: creates default SUPER_ADMIN and sample data.
 * Usage: node utils/seed.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Department = require("../models/Department");
const Room = require("../models/Room");
const Timetable = require("../models/Timetable");
const Slot = require("../models/Slot");
const { createTimetableWithSlots } = require("../services/timetableService");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Department.deleteMany({});
    await Room.deleteMany({});
    await Timetable.deleteMany({});
    await Slot.deleteMany({});
    console.log("🗑️  Cleared existing data");

    // Create departments
    const departments = await Department.insertMany([
      {
        name: "Computer Science",
        code: "CS",
        email: "cs@university.edu",
        phone: "+91 9876543210",
        hodName: "Dr. Rajesh Kumar",
        description: "Department of Computer Science and Engineering",
      },
      {
        name: "Mathematics",
        code: "MATH",
        email: "math@university.edu",
        phone: "+91 9876543211",
        hodName: "Dr. Priya Sharma",
        description: "Department of Mathematics and Statistics",
      },
      {
        name: "Physics",
        code: "PHY",
        email: "physics@university.edu",
        phone: "+91 9876543212",
        hodName: "Dr. Amit Verma",
        description: "Department of Physics and Applied Sciences",
      },
      {
        name: "Electronics",
        code: "ECE",
        email: "ece@university.edu",
        phone: "+91 9876543213",
        hodName: "Dr. Sunita Gupta",
        description: "Department of Electronics and Communication",
      },
    ]);
    console.log(`📂 Created ${departments.length} departments`);

    // Create rooms
    const rooms = await Room.insertMany([
      { name: "Room 101", capacity: 60 },
      { name: "Room 102", capacity: 40 },
      { name: "Room 103", capacity: 80 },
      { name: "Lab A", capacity: 30 },
      { name: "Lab B", capacity: 30 },
    ]);
    console.log(`🏠 Created ${rooms.length} rooms`);

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash("admin123", salt);
    const deptAdminPassword = await bcrypt.hash("dept123", salt);

    // Create users
    const users = await User.insertMany([
      {
        username: "superadmin",
        password: hashedPassword,
        role: "SUPER_ADMIN",
      },
      {
        username: "cs_admin",
        password: deptAdminPassword,
        role: "DEPT_ADMIN",
        departmentId: departments[0]._id, // Computer Science
      },
      {
        username: "math_admin",
        password: deptAdminPassword,
        role: "DEPT_ADMIN",
        departmentId: departments[1]._id, // Mathematics
      },
    ]);
    console.log(`👤 Created ${users.length} users`);

    // Create a timetable for Room 101 and Room 102
    const tt1 = await createTimetableWithSlots({
      roomId: rooms[0]._id, // Room 101
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      periodsPerDay: 6,
      startTime: "09:00",
      periodDuration: 60,
      createdBy: users[0]._id,
    });

    const tt2 = await createTimetableWithSlots({
      roomId: rooms[1]._id, // Room 102
      days: ["Monday", "Wednesday", "Friday"],
      periodsPerDay: 4,
      startTime: "10:00",
      periodDuration: 50,
      createdBy: users[0]._id,
    });

    // Populate some slots for the first timetable
    const tt1Slots = await Slot.find({ timetableId: tt1._id }).sort({ day: 1, periodNumber: 1 });
    if (tt1Slots.length > 5) {
      // Mon P1 -> CS
      tt1Slots[0].departmentId = departments[0]._id;
      tt1Slots[0].subject = "Data Structures";
      tt1Slots[0].teacher = "Dr. Rajesh Kumar";
      await tt1Slots[0].save();

      // Mon P2 -> CS
      tt1Slots[1].departmentId = departments[0]._id;
      tt1Slots[1].subject = "Algorithms";
      tt1Slots[1].teacher = "Prof. Smith";
      await tt1Slots[1].save();

      // Mon P4 -> Math
      tt1Slots[3].departmentId = departments[1]._id;
      tt1Slots[3].subject = "Linear Algebra";
      tt1Slots[3].teacher = "Dr. Priya Sharma";
      await tt1Slots[3].save();
      
      // Tue P1 -> Physics
      tt1Slots[6].departmentId = departments[2]._id;
      tt1Slots[6].subject = "Quantum Mechanics";
      tt1Slots[6].teacher = "Dr. Amit Verma";
      await tt1Slots[6].save();
    }
    
    console.log("📅 Created 2 example timetables with populated sample slots");

    console.log("\n🎉 Seed complete! Credentials:");
    console.log("   SUPER_ADMIN  → superadmin / admin123");
    console.log("   DEPT_ADMIN   → cs_admin / dept123");
    console.log("   DEPT_ADMIN   → math_admin / dept123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error.message);
    process.exit(1);
  }
}

seed();
