const Department = require("../models/Department");

/**
 * GET /api/departments
 */
exports.getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/departments
 */
exports.createDepartment = async (req, res, next) => {
  try {
    const { name, code, email, phone, hodName, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Department name is required.",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Department email is required.",
      });
    }

    const department = await Department.create({
      name: name.trim(),
      code: code && code.trim() ? code.trim().toUpperCase() : undefined,
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || "",
      hodName: hodName?.trim() || "",
      description: description?.trim() || "",
    });

    res.status(201).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/departments/:id
 */
exports.updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, email, phone, hodName, description } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    if (name !== undefined) department.name = name.trim();
    if (code !== undefined) {
      department.code = code.trim() ? code.trim().toUpperCase() : undefined;
    }
    if (email !== undefined) department.email = email.trim().toLowerCase();
    if (phone !== undefined) department.phone = phone.trim();
    if (hodName !== undefined) department.hodName = hodName.trim();
    if (description !== undefined) department.description = description.trim();

    await department.save();

    res.json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/departments/:id
 */
exports.deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Optional: Check if department has assigned slots or users before deleting
    // For now, simple delete
    const department = await Department.findByIdAndDelete(id);
    
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    res.json({ success: true, message: "Department deleted successfully" });
  } catch (error) {
    next(error);
  }
};
