const router = require("express").Router();
const { getDepartments, createDepartment, updateDepartment, deleteDepartment } = require("../controllers/departmentController");
const authMiddleware = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, getDepartments);
router.post("/", authMiddleware, allowRoles("SUPER_ADMIN"), createDepartment);
router.put("/:id", authMiddleware, allowRoles("SUPER_ADMIN"), updateDepartment);
router.delete("/:id", authMiddleware, allowRoles("SUPER_ADMIN"), deleteDepartment);

module.exports = router;
