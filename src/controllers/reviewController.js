const reviewModel = require("../models/reviewModel");
const userModel = require("../models/userModel");

/**
 * Tạo review mới
 */
const createReview = async (req, res) => {
  try {
    const reviewData = req.body;
    const userId = req.user.userId;

    // Kiểm tra các trường bắt buộc
    const requiredFields = ["courseId", "rating", "content"];
    const missingFields = requiredFields.filter((field) => !reviewData[field]);

    if (!userId) {
      missingFields.push("userId");
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Kiểm tra rating hợp lệ
    if (reviewData.rating < 1 || reviewData.rating > 5) {
      return res.status(400).json({
        error: "Rating must be between 1 and 5",
      });
    }

    reviewData.userId = userId;

    const savedReview = await reviewModel.createReview(reviewData);
    res.status(201).json({
      message: "Review created successfully!",
      review: savedReview,
    });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
};

/**
 * Lấy danh sách reviews của khóa học
 */
const getReviewsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required" });
    }

    const reviews = await reviewModel.getReviewsByCourse(courseId);
    res.status(200).json({
      message: "Reviews retrieved successfully",
      reviews: reviews,
      total: reviews.length,
    });
  } catch (error) {
    console.error("Error getting reviews by course:", error);
    res.status(500).json({ error: "Failed to get reviews by course" });
  }
};

/**
 * Lấy review theo ID
 */
const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Review ID is required" });
    }

    const review = await reviewModel.getReviewById(id);

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    res.status(200).json({
      message: "Review retrieved successfully",
      review: review,
    });
  } catch (error) {
    console.error("Error getting review by id:", error);
    res.status(500).json({ error: "Failed to get review by id" });
  }
};

/**
 * Cập nhật review
 */
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({ error: "Review ID is required" });
    }

    // Kiểm tra rating nếu có trong updateData
    if (updateData.rating && (updateData.rating < 1 || updateData.rating > 5)) {
      return res.status(400).json({
        error: "Rating must be between 1 and 5",
      });
    }

    const updatedReview = await reviewModel.updateReview(id, updateData);
    res.status(200).json({
      message: "Review updated successfully",
      review: updatedReview,
    });
  } catch (error) {
    console.error("Error updating review:", error);
    if (error.message === "Review not found") {
      res.status(404).json({ error: "Review not found" });
    } else {
      res.status(500).json({ error: "Failed to update review" });
    }
  }
};

/**
 * Xóa review
 */
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Review ID is required" });
    }

    const deletedReview = await reviewModel.deleteReview(id);
    res.status(200).json({
      message: "Review deleted successfully",
      review: deletedReview,
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    if (error.message === "Review not found") {
      res.status(404).json({ error: "Review not found" });
    } else {
      res.status(500).json({ error: "Failed to delete review" });
    }
  }
};

/**
 * Lấy danh sách reviews của user
 */
const getReviewsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const reviews = await reviewModel.getReviewsByUser(userId);
    res.status(200).json({
      message: "User reviews retrieved successfully",
      reviews: reviews,
      total: reviews.length,
    });
  } catch (error) {
    console.error("Error getting reviews by user:", error);
    res.status(500).json({ error: "Failed to get reviews by user" });
  }
};

/**
 * Lấy thống kê rating của khóa học
 */
const getCourseRatingStats = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required" });
    }

    const stats = await reviewModel.getCourseRatingStats(courseId);
    res.status(200).json({
      message: "Course rating stats retrieved successfully",
      stats: stats,
    });
  } catch (error) {
    console.error("Error getting course rating stats:", error);
    res.status(500).json({ error: "Failed to get course rating stats" });
  }
};

/**
 * Lấy thống kê tổng quan reviews cho admin
 */
const getAdminReviewStats = async (req, res) => {
  try {
    const stats = await reviewModel.getAdminReviewStats();
    res.status(200).json({
      message: "Admin review stats retrieved successfully",
      stats: stats,
    });
  } catch (error) {
    console.error("Error getting admin review stats:", error);
    res.status(500).json({ error: "Failed to get admin review stats" });
  }
};

/**
 * Lấy tất cả reviews (admin only)
 */
const getAllReviews = async (req, res) => {
  try {
    const reviews = await reviewModel.getAllReviews();
    res.status(200).json({
      message: "All reviews retrieved successfully",
      reviews: reviews,
      total: reviews.length,
    });
  } catch (error) {
    console.error("Error getting all reviews:", error);
    res.status(500).json({ error: "Failed to get all reviews" });
  }
};

module.exports = {
  createReview,
  getReviewsByCourse,
  getReviewById,
  updateReview,
  deleteReview,
  getReviewsByUser,
  getCourseRatingStats,
  getAdminReviewStats,
  getAllReviews,
};
