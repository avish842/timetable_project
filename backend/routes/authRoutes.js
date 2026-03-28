const router = require("express").Router();
const { login, getMe, changePassword } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/login", login);
router.get("/me", authMiddleware, getMe);
router.put("/password", authMiddleware, changePassword);

module.exports = router;
