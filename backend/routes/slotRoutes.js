const router = require("express").Router();
const { getSlots, updateSlot } = require("../controllers/slotController");
const authMiddleware = require("../middleware/authMiddleware");
const deptAccessMiddleware = require("../middleware/deptAccessMiddleware");

router.get("/", authMiddleware, getSlots);
router.put("/:slotId", authMiddleware, deptAccessMiddleware, updateSlot);

module.exports = router;
