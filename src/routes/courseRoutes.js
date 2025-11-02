const express = require("express");
const {
  createCourse,
  getCourseById,
  getCourseByTitle,
  getAllCourses,
  updateCourseById,
  addRatingToCourse,
  getMyCourses,
  getCourseStatistics,
} = require("../controllers/courseController");
const { verifyToken, requireAdmin } = require("../middlewares/authMiddleware");
const router = express.Router();

// Statistics route (should be before other GET routes to avoid conflicts)
router.get("/statistics", verifyToken, requireAdmin, getCourseStatistics);

router.post("/create", createCourse);
router.get("/:id", getCourseById);
router.get("/title/:title", getCourseByTitle);
router.get("/", getAllCourses);
router.put("/update/:id", updateCourseById);
router.post("/:id/ratings", addRatingToCourse);

router.get("/my-courses/:userId", getMyCourses);

module.exports = router;
