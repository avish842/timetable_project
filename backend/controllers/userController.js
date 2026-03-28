const User = require("../models/User");
const Department = require("../models/Department");
const bcrypt = require("bcryptjs");

/**
 * GET /api/users
 * Get all users, populated with their department info.
 */
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("departmentId", "name code")
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users
 * Create a new user (usually DEPT_ADMIN). Superior admin only.
 */
exports.createUser = async (req, res, next) => {
  try {
    const { username, password, role, departmentId } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
    }

    if (role === "DEPT_ADMIN" && !departmentId) {
      return res.status(400).json({
        success: false,
        message: "Department ID is required for DEPT_ADMIN role.",
      });
    }

    // Check if user exists
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Username already exists.",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      password: hashedPassword,
      role: role || "DEPT_ADMIN",
      departmentId: role === "DEPT_ADMIN" ? departmentId : null,
    });

    const populatedUser = await User.findById(user._id)
      .select("-password")
      .populate("departmentId", "name code");

    res.status(201).json({ success: true, data: populatedUser });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id
 * Delete a user.
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting oneself
    if (req.user.userId === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.json({ success: true, message: "User deleted successfully." });
  } catch (error) {
    next(error);
  }
};
