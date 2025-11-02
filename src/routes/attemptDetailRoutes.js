const express = require("express");
const router = express.Router();
const attemptDetailController = require("../controllers/attemptDetailController");
const { verifyToken, requireAdmin } = require("../middlewares/authMiddleware");

// Tạo mới attempt detail (khi học viên nộp bài)
router.post("/", verifyToken, attemptDetailController.createAttemptDetail);

// Lấy chi tiết attempt theo attemptId
router.get(
  "/:attemptId",
  verifyToken,
  attemptDetailController.getAttemptDetailByAttemptId
);

// Cập nhật lại kết quả phân tích AI hoặc câu trả lời
router.put(
  "/:attemptId",
  verifyToken,
  attemptDetailController.updateAttemptDetailByAttemptId
);

// Xoá attempt detail (admin)
router.delete(
  "/:attemptId",
  verifyToken,
  requireAdmin,
  attemptDetailController.deleteAttemptDetailByAttemptId
);

// Lấy toàn bộ (admin)
router.get(
  "/",
  verifyToken,
  requireAdmin,
  attemptDetailController.getAllAttemptDetails
);

// Lấy toàn bộ chi tiết attempt của user, gom nhóm theo Test
router.get(
  "/details/grouped",
  verifyToken,
  attemptDetailController.getAllAttemptDetailsByUserId
);

router.get("/attempt/:attemptId", attemptDetailController.getAnswersByAttempt);

router.get(
  "/user/:userId/test/:testId",
  attemptDetailController.getAttemptDetailByUserAndTest
);

module.exports = router;
