const Payment = require("../schemas/Payment");
const User = require("../schemas/User.js");
const Course = require("../schemas/Course");
const mongoose = require("mongoose");

/**
 * Tạo payment mới (thanh toán khóa học)
 * @param {Object} paymentData Dữ liệu payment (studentId, courseId, amount)
 * @returns {Object} Payment vừa được tạo
 */
const createPayment = async (paymentData) => {
  try {
    // Kiểm tra course tồn tại và lấy thông tin giá
    const course = await Course.findById(paymentData.courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    // Kiểm tra user tồn tại
    const user = await User.findById(paymentData.studentId);
    if (!user) {
      throw new Error("Student not found");
    }

    // Kiểm tra user đã mua course này chưa
    const existingPayment = await Payment.findOne({
      studentId: paymentData.studentId,
      courseId: paymentData.courseId,
    });
    if (existingPayment) {
      throw new Error("You have already purchased this course");
    }

    // Validation: Kiểm tra amount có khớp với cost của course không
    // Sử dụng parseFloat và so sánh với độ chính xác 2 chữ số thập phân
    const expectedAmount = parseFloat(course.cost);
    const providedAmount = parseFloat(paymentData.amount);

    if (Math.abs(expectedAmount - providedAmount) > 0.01) {
      throw new Error(
        `Invalid payment amount. Expected: $${expectedAmount.toFixed(
          2
        )}, Received: $${providedAmount.toFixed(2)}`
      );
    }

    const newPayment = new Payment(paymentData);
    const savedPayment = await newPayment.save();

    // Thêm course vào danh sách courses của user
    await User.findByIdAndUpdate(
      paymentData.studentId,
      { $addToSet: { courses: paymentData.courseId } }, // $addToSet để tránh duplicate
      { new: true }
    );

    // Populate và transform
    const populatedPayment = await Payment.findById(savedPayment._id)
      .populate({
        path: "studentId",
        select: "fullName email",
        options: { lean: true },
      })
      .populate({
        path: "courseId",
        select: "title cost",
        options: { lean: true },
      })
      .lean();

    // Transform studentId to student và courseId to course
    const transformedPayment = {
      ...populatedPayment,
      student: populatedPayment.studentId,
      course: populatedPayment.courseId,
      studentId: undefined,
      courseId: undefined,
    };

    // Xóa các field undefined
    delete transformedPayment.studentId;
    delete transformedPayment.courseId;

    return transformedPayment;
  } catch (error) {
    console.error("Error creating payment:", error);
    throw new Error("Failed to create payment");
  }
};

/**
 * Lấy tất cả payments của một user
 * @param {String} studentId ID của student
 * @returns {Array} Danh sách payments
 */
const getPaymentsByUser = async (studentId) => {
  try {
    const payments = await Payment.find({ studentId })
      .populate({
        path: "courseId",
        select: "title cost thumbnailUrl courseType courseLevel",
        options: { lean: true },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Transform courseId to course
    const transformedPayments = payments.map((payment) => {
      const transformed = {
        ...payment,
        course: payment.courseId,
      };
      delete transformed.courseId;
      return transformed;
    });

    return transformedPayments;
  } catch (error) {
    console.error("Error getting payments by user:", error);
    throw new Error("Failed to get payments by user");
  }
};

/**
 * Lấy tất cả payments của một khóa học
 * @param {String} courseId ID của khóa học
 * @returns {Array} Danh sách payments
 */
const getPaymentsByCourse = async (courseId) => {
  try {
    const payments = await Payment.find({ courseId })
      .populate({
        path: "studentId",
        select: "fullName email",
        options: { lean: true },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Transform studentId to student
    const transformedPayments = payments.map((payment) => {
      const transformed = {
        ...payment,
        student: payment.studentId,
      };
      delete transformed.studentId;
      return transformed;
    });

    return transformedPayments;
  } catch (error) {
    console.error("Error getting payments by course:", error);
    throw new Error("Failed to get payments by course");
  }
};

/**
 * Lấy tất cả payments
 * @returns {Array} Danh sách tất cả payments
 */
const getAllPayments = async () => {
  try {
    const payments = await Payment.find()
      .populate({
        path: "studentId",
        select: "fullName email",
        options: { lean: true },
      })
      .populate({
        path: "courseId",
        select: "title cost courseType courseLevel",
        options: { lean: true },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Transform studentId to student và courseId to course
    const transformedPayments = payments.map((payment) => {
      const transformed = {
        ...payment,
        student: payment.studentId,
        course: payment.courseId,
      };
      delete transformed.studentId;
      delete transformed.courseId;
      return transformed;
    });

    return transformedPayments;
  } catch (error) {
    console.error("Error getting all payments:", error);
    throw new Error("Failed to get all payments");
  }
};

/**
 * Lấy thống kê payments cho admin
 * @returns {Object} Thống kê payments
 */
const getAdminPaymentStats = async () => {
  try {
    // Tổng số lượng payments
    const totalPayments = await Payment.countDocuments();

    // Tổng doanh thu
    const revenueStats = await Payment.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
        },
      },
    ]);

    const totalRevenue =
      revenueStats.length > 0 ? revenueStats[0].totalRevenue : 0;

    // Top 12 courses được payment nhiều nhất
    const topCourses = await Payment.aggregate([
      {
        $group: {
          _id: "$courseId",
          paymentCount: { $sum: 1 },
          totalRevenue: { $sum: "$amount" },
        },
      },
      {
        $sort: { paymentCount: -1 },
      },
      {
        $limit: 12,
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "courseInfo",
        },
      },
      {
        $unwind: "$courseInfo",
      },
      {
        $project: {
          _id: 1,
          paymentCount: 1,
          totalRevenue: 1,
          title: "$courseInfo.title",
          thumbnailUrl: "$courseInfo.thumbnailUrl",
          cost: "$courseInfo.cost",
          courseType: "$courseInfo.courseType",
          courseLevel: "$courseInfo.courseLevel",
        },
      },
    ]);

    return {
      totalPayments,
      totalRevenue,
      topCourses,
    };
  } catch (error) {
    console.error("Error getting admin payment stats:", error);
    throw new Error("Failed to get admin payment stats");
  }
};

module.exports = {
  createPayment,
  getPaymentsByUser,
  getPaymentsByCourse,
  getAllPayments,
  getAdminPaymentStats,
};
