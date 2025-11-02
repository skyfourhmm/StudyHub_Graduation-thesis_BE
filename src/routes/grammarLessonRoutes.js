const express = require("express");
const router = express.Router();

// Giả định bạn có các middleware tương tự để xác thực và phân quyền
const { verifyToken, requireAdmin } = require("../middlewares/authMiddleware");

// Import controller dưới dạng một object
const grammarLessonController = require("../controllers/grammarLessonController");

// --- Định nghĩa các routes ---

// 1. Tạo bài học mới (chỉ Admin)
router.post("/", verifyToken, grammarLessonController.createGrammarLesson);

// 2. Lấy tất cả bài học (công khai)
router.get("/", grammarLessonController.getAllGrammarLessons);

// 3. Lấy một bài học theo id (công khai)
router.get("/:id", grammarLessonController.getGrammarLessonById);

// 4. Cập nhật bài học theo id (chỉ Admin)
router.patch(
  "/:id",
  verifyToken,
  grammarLessonController.updateGrammarLessonById
);

// 5. Xóa bài học theo id (chỉ Admin)
router.delete(
  "/:id",
  verifyToken,
  grammarLessonController.deleteGrammarLessonById
);

// 6. Lấy tất cả bài học theo courseId (công khai)
router.get("/course/:courseId", grammarLessonController.getLessonsByCourseId);

// 7. Lấy part theo partId (công khai)
router.get("/parts/:partId", grammarLessonController.getPartByIdController);

module.exports = router;
