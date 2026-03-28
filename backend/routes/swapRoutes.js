const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const {
  getEligibleSlots,
  createSwapRequest,
  getSwapRequests,
  targetApproveSwap,
  targetRejectSwap,
  cancelSwap,
  adminFinalizeSwap,
  adminRejectSwap,
} = require("../controllers/swapRequestController");

router.get(
  "/eligible-slots",
  authMiddleware,
  allowRoles("SUPER_ADMIN", "DEPT_ADMIN"),
  getEligibleSlots
);

router.post("/", authMiddleware, allowRoles("SUPER_ADMIN", "DEPT_ADMIN"), createSwapRequest);
router.get("/", authMiddleware, allowRoles("SUPER_ADMIN", "DEPT_ADMIN"), getSwapRequests);

router.post(
  "/:id/target-approve",
  authMiddleware,
  allowRoles("SUPER_ADMIN", "DEPT_ADMIN"),
  targetApproveSwap
);
router.post(
  "/:id/target-reject",
  authMiddleware,
  allowRoles("SUPER_ADMIN", "DEPT_ADMIN"),
  targetRejectSwap
);
router.post("/:id/cancel", authMiddleware, allowRoles("SUPER_ADMIN", "DEPT_ADMIN"), cancelSwap);
router.post("/:id/admin-finalize", authMiddleware, allowRoles("SUPER_ADMIN"), adminFinalizeSwap);
router.post("/:id/admin-reject", authMiddleware, allowRoles("SUPER_ADMIN"), adminRejectSwap);

module.exports = router;
