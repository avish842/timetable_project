const router = require("express").Router();
const { getRooms, createRoom, deleteRoom } = require("../controllers/roomController");
const authMiddleware = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, getRooms);
router.post("/", authMiddleware, allowRoles("SUPER_ADMIN"), createRoom);
router.delete("/:id", authMiddleware, allowRoles("SUPER_ADMIN"), deleteRoom);

module.exports = router;
