const express = require("express");
const router = express.Router();
const { verifyToken, requireAdmin } = require("../middlewares/authMiddleware");
const testController = require("../controllers/testController");

// Admin creates test
router.post("/", verifyToken, testController.createTest);

router.get("/my-tests", verifyToken, testController.getTestsByCreatorId);

// Get all tests
router.get("/", testController.getAllTests);

// Lấy thông tin của toàn bộ test trong db
router.get("/statistics", testController.getTestStatistics);

// Get test detail
router.get("/:testId", testController.getTestById);

// Lấy tất cả tests của 1 course
router.get("/course/:courseId", testController.getTestsByCourseId);

// Update test (admin)
router.put(
  "/:testId",
  verifyToken,
  requireAdmin,
  testController.updateTestById
);

// Delete test (admin)
router.delete(
  "/:testId",
  verifyToken,
  requireAdmin,
  testController.deleteTestById
);

module.exports = router;
