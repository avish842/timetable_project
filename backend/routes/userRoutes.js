const router = require("express").Router();
const { getUsers, createUser, deleteUser } = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

// All user management routes require SUPER_ADMIN
router.use(authMiddleware, allowRoles("SUPER_ADMIN"));

router.get("/", getUsers);
router.post("/", createUser);
router.delete("/:id", deleteUser);

module.exports = router;
