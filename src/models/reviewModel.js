const Review = require("../schemas/review");
const Course = require("../schemas/course");
const mongoose = require("mongoose");

/**
 * Tạo review mới
 * @param {Object} reviewData Dữ liệu review (userId, courseId, rating, content)
 * @returns {Object} Review vừa được tạo
 */
const createReview = async (reviewData) => {
  try {
    const newReview = new Review(reviewData);
    const savedReview = await newReview.save();

    // Thêm review vào course
    await Course.findByIdAndUpdate(
      reviewData.courseId,
      { $push: { reviews: savedReview._id } },
      { new: true }
    );

    // Populate và transform
    const populatedReview = await Review.findById(savedReview._id)
      .populate({
        path: "userId",
        select: "fullName email",
        options: { lean: true },
      })
      .lean();

    // Transform userId to user
    const transformedReview = {
      ...populatedReview,
      user: populatedReview.userId,
      userId: undefined,
    };

    return transformedReview;
  } catch (error) {
    console.error("Error creating review:", error);
    throw new Error("Failed to create review");
  }
};

/**
 * Lấy tất cả reviews của một khóa học
 * @param {String} courseId ID của khóa học
 * @returns {Array} Danh sách reviews
 */
const getReviewsByCourse = async (courseId) => {
  try {
    const reviews = await Review.find({ courseId })
      .populate({
        path: "userId",
        select: "fullName email",
        options: { lean: true },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Transform userId to user
    const transformedReviews = reviews.map((review) => ({
      ...review,
      user: review.userId,
      userId: undefined,
    }));

    return transformedReviews;
  } catch (error) {
    console.error("Error getting reviews by course:", error);
    throw new Error("Failed to get reviews by course");
  }
};

/**
 * Lấy review theo ID
 * @param {String} reviewId ID của review
 * @returns {Object} Review
 */
const getReviewById = async (reviewId) => {
  try {
    const review = await Review.findById(reviewId)
      .populate({
        path: "userId",
        select: "fullName email",
        options: { lean: true },
      })
      .populate({
        path: "courseId",
        select: "title",
        options: { lean: true },
      })
      .lean();

    if (!review) return null;

    // Transform userId to user và courseId to course
    const transformedReview = {
      ...review,
      user: review.userId,
      course: review.courseId,
      userId: undefined,
      courseId: review.courseId._id,
    };

    return transformedReview;
  } catch (error) {
    console.error("Error getting review by id:", error);
    throw new Error("Failed to get review by id");
  }
};

/**
 * Cập nhật review
 * @param {String} reviewId ID của review
 * @param {Object} updateData Dữ liệu cập nhật
 * @returns {Object} Review đã được cập nhật
 */
const updateReview = async (reviewId, updateData) => {
  try {
    const updatedReview = await Review.findByIdAndUpdate(reviewId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate({
        path: "userId",
        select: "fullName email",
        options: { lean: true },
      })
      .lean();

    if (!updatedReview) {
      throw new Error("Review not found");
    }

    // Transform userId to user
    const transformedReview = {
      ...updatedReview,
      user: updatedReview.userId,
      userId: undefined,
    };

    return transformedReview;
  } catch (error) {
    console.error("Error updating review:", error);
    throw new Error("Failed to update review");
  }
};

/**
 * Xóa review
 * @param {String} reviewId ID của review
 * @returns {Object} Review đã được xóa
 */
const deleteReview = async (reviewId) => {
  try {
    const deletedReview = await Review.findByIdAndDelete(reviewId);

    if (!deletedReview) {
      throw new Error("Review not found");
    }

    // Xóa review khỏi course
    await Course.findByIdAndUpdate(
      deletedReview.courseId,
      { $pull: { reviews: reviewId } },
      { new: true }
    );

    return deletedReview;
  } catch (error) {
    console.error("Error deleting review:", error);
    throw new Error("Failed to delete review");
  }
};

/**
 * Lấy tất cả reviews của một user
 * @param {String} userId ID của user
 * @returns {Array} Danh sách reviews
 */
const getReviewsByUser = async (userId) => {
  try {
    const reviews = await Review.find({ userId })
      .populate({
        path: "courseId",
        select: "title thumbnailUrl",
        options: { lean: true },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Transform courseId to course
    const transformedReviews = reviews.map((review) => ({
      ...review,
      course: review.courseId,
      courseId: review.courseId._id, // Giữ courseId để maintain compatibility
    }));

    return transformedReviews;
  } catch (error) {
    console.error("Error getting reviews by user:", error);
    throw new Error("Failed to get reviews by user");
  }
};

/**
 * Tính rating trung bình của một khóa học
 * @param {String} courseId ID của khóa học
 * @returns {Object} Thông tin rating trung bình và số lượng reviews
 */
const getCourseRatingStats = async (courseId) => {
  try {
    const stats = await Review.aggregate([
      { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const result = stats[0];
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    result.ratingDistribution.forEach((rating) => {
      distribution[rating]++;
    });

    return {
      averageRating: Math.round(result.averageRating * 10) / 10,
      totalReviews: result.totalReviews,
      ratingDistribution: distribution,
    };
  } catch (error) {
    console.error("Error getting course rating stats:", error);
    throw new Error("Failed to get course rating stats");
  }
};

/**
 * Lấy thống kê tổng quan về reviews cho admin
 * @returns {Object} Thống kê reviews
 */
const getAdminReviewStats = async () => {
  try {
    const stats = await Review.aggregate([
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const result = stats[0];
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    result.ratingDistribution.forEach((rating) => {
      distribution[rating]++;
    });

    return {
      totalReviews: result.totalReviews,
      averageRating: Math.round(result.averageRating * 10) / 10,
      ratingDistribution: distribution,
    };
  } catch (error) {
    console.error("Error getting admin review stats:", error);
    throw new Error("Failed to get admin review stats");
  }
};

/**
 * Lấy tất cả reviews (cho admin)
 * @returns {Array} Danh sách tất cả reviews
 */
const getAllReviews = async () => {
  try {
    const reviews = await Review.find()
      .populate({
        path: "userId",
        select: "fullName email",
        options: { lean: true },
      })
      .populate({
        path: "courseId",
        select: "title courseType courseLevel",
        options: { lean: true },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Transform userId to user và courseId to course
    const transformedReviews = reviews.map((review) => ({
      ...review,
      user: review.userId,
      course: review.courseId,
      userId: undefined,
      courseId: undefined,
    }));

    return transformedReviews;
  } catch (error) {
    console.error("Error getting all reviews:", error);
    throw new Error("Failed to get all reviews");
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
