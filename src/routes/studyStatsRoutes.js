const express = require("express");
const router = express.Router();
const studyStatsController = require("../controllers/studyStatsController");
const { verifyToken } = require("../middlewares/authMiddleware");

// POST: ghi hoạt động học
router.post("/log", verifyToken, studyStatsController.logStudyActivity);

// GET: lấy thống kê theo tháng
// Lấy thống kê học tập theo tháng
router.get("/:year/:month", verifyToken, studyStatsController.getMonthlyStats);

// Xóa thống kê theo tháng
router.delete(
  "/:year/:month",
  verifyToken,
  studyStatsController.deleteMonthlyStats
);

module.exports = router;
