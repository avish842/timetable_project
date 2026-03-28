const router = require("express").Router();
const multer = require("multer");
const {
	createTimetable,
	getTimetableByRoom,
	deleteTimetable,
	getRoomTimetableStatus,
	getMyTimetables,
	getMyDepartmentRoomIds,
	importTimetableFromExcel,
	sendDepartmentAssignmentEmails,
} = require("../controllers/timetableController");
const authMiddleware = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		const allowed = [
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"application/vnd.ms-excel",
		];
		if (allowed.includes(file.mimetype)) {
			cb(null, true);
			return;
		}
		cb(new Error("Only .xlsx and .xls files are allowed."));
	},
});

router.post("/create", authMiddleware, allowRoles("SUPER_ADMIN"), createTimetable);
router.post(
	"/import",
	authMiddleware,
	allowRoles("SUPER_ADMIN"),
	upload.single("file"),
	importTimetableFromExcel
);
router.get("/room-status", authMiddleware, getRoomTimetableStatus);
router.get("/mine", authMiddleware, allowRoles("SUPER_ADMIN"), getMyTimetables);
router.get("/dept-rooms/me", authMiddleware, allowRoles("DEPT_ADMIN"), getMyDepartmentRoomIds);
router.post(
	"/:id/send-department-emails",
	authMiddleware,
	allowRoles("SUPER_ADMIN"),
	sendDepartmentAssignmentEmails
);
router.get("/:roomId", authMiddleware, getTimetableByRoom);
router.delete("/:id", authMiddleware, allowRoles("SUPER_ADMIN"), deleteTimetable);

module.exports = router;
