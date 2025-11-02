// File Router
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const attemptController = require("../controllers/attemptController");

// --- 1. Route Tĩnh (Không có tham số /:...) ---
// Start attempt
router.post("/", verifyToken, attemptController.startAttempt);

// POST /attempt/info
router.post("/info", attemptController.getAttemptInfo);

// POST /attempt/by-test-pool
router.post("/by-test-pool", attemptController.getAttemptsByTestPool); // Đặt route TĨNH này lên trên

// --- 2. Route Động (Có tham số /:...) ---
// Submit attempt (by attemptId)
router.post("/:attemptId/submit", verifyToken, attemptController.submitAttempt);

// Get attempt by id
router.get("/:attemptId", attemptController.getAttemptById); // Đặt route ĐỘNG này xuống dưới

// Get attempts by user
router.get("/user/:userId", attemptController.getAttemptsByUser);

// GET /attempts/test/:testId
router.get("/test/:testId", attemptController.getAttemptByTest);

// GET /attempts/test/:testId/user/:userId
router.get(
  "/test/:testId/user/:userId",
  attemptController.getAttemptsByTestIdAndUser
);

// GET /attempts/custom/user
router.get(
  "/custom/user",
  verifyToken,
  attemptController.getCustomTestAttemptsByUser
);

// PATCH /attempts/:attemptId
router.patch("/:attemptId", attemptController.updateAttempt);

module.exports = router;
