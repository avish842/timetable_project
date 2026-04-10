const router = require("express").Router();
const { getDashboardAnalytics } = require("../controllers/analyticsController");
const authMiddleware = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

router.get(
  "/dashboard",
  authMiddleware,
  allowRoles("SUPER_ADMIN"),
  getDashboardAnalytics
);

module.exports = router;
