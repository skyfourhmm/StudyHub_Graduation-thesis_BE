const Course = require("../schemas/Course");
const Payment = require("../schemas/Payment");
const mongoose = require("mongoose");

/**
 * Tạo khóa học mới
 * @param {Object} courseData Dữ liệu khóa học (title, description, cost, ratings)
 * @returns {Object} Khóa học vừa được tạo
 */
const createCourse = async (courseData) => {
  try {
    const newCourse = new Course(courseData);
    const savedCourse = await newCourse.save();
    return savedCourse;
  } catch (error) {
    console.error("Error creating course:", error);
    throw new Error("Failed to create course");
  }
};

const findCourseById = async (id) => {
  try {
    const course = await Course.findById(id);
    return course;
  } catch (error) {
    console.error("Error finding course by id:", error);
    throw new Error("Failed to find course by id");
  }
};

const findCourseByTitle = async (title) => {
  try {
    const course = await Course.findOne({ title });
    return course;
  } catch (error) {
    console.error("Error finding course by title:", error);
    throw new Error("Failed to find course by title");
  }
};

const updateCourseById = async (id, updateData) => {
  try {
    const course = await Course.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    return course;
  } catch (error) {
    console.error("Error updating course:", error);
    throw new Error("Failed to update course");
  }
};

const getAllCourses = async () => {
  try {
    const courses = await Course.find();
    return courses;
  } catch (error) {
    console.error("Error getting all courses:", error);
    throw new Error("Failed to get all courses");
  }
};

const addRatingToCourse = async (id, ratingData) => {
  try {
    const course = await Course.findByIdAndUpdate(
      id,
      { $push: { ratings: ratingData } },
      { new: true }
    );
    return course;
  } catch (error) {
    console.error("Error adding rating to course:", error);
    throw new Error("Failed to add rating to course");
  }
};

const getCourseRatings = async (id) => {
  try {
    const course = await Course.findById(id);
    return course.ratings;
  } catch (error) {
    console.error("Error getting course ratings:", error);
    throw new Error("Failed to get course ratings");
  }
};

/**
 * Lấy thống kê courses cho admin
 * @returns {Object} Thống kê courses
 */
const getCourseStatistics = async () => {
  try {
    // Tổng số courses
    const totalCourses = await Course.countDocuments();

    // Lấy thông tin từ payment statistics
    const paymentStats = await Payment.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalPayments: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue =
      paymentStats.length > 0 ? paymentStats[0].totalRevenue : 0;
    const totalStudents =
      paymentStats.length > 0 ? paymentStats[0].totalPayments : 0;

    // Lấy thông tin chi tiết từ mỗi course kết hợp với payment data
    const courseDetails = await Course.aggregate([
      {
        $lookup: {
          from: "payments",
          localField: "_id",
          foreignField: "courseId",
          as: "payments",
        },
      },
      {
        $addFields: {
          totalRevenue: { $sum: "$payments.amount" },
          totalStudents: { $size: "$payments" },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          cost: 1,
          courseType: 1,
          courseLevel: 1,
          thumbnailUrl: 1,
          totalRevenue: 1,
          totalStudents: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { totalStudents: -1 },
      },
    ]);

    // Tính tổng số khóa học đã bán (có ít nhất 1 payment)
    const totalSoldCourses = await Course.aggregate([
      {
        $lookup: {
          from: "payments",
          localField: "_id",
          foreignField: "courseId",
          as: "payments",
        },
      },
      {
        $match: {
          "payments.0": { $exists: true }, // Có ít nhất 1 payment
        },
      },
      {
        $count: "soldCourses",
      },
    ]);

    const soldCoursesCount =
      totalSoldCourses.length > 0 ? totalSoldCourses[0].soldCourses : 0;

    return {
      totalCourses,
      totalRevenue,
      totalStudents,
      totalSoldCourses: soldCoursesCount,
      courses: courseDetails,
    };
  } catch (error) {
    console.error("Error getting course statistics:", error);
    throw new Error("Failed to get course statistics");
  }
};

module.exports = {
  createCourse,
  findCourseById,
  findCourseByTitle,
  updateCourseById,
  getAllCourses,
  addRatingToCourse,
  getCourseRatings,
  getCourseStatistics,
};
