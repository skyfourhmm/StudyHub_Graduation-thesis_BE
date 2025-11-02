const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { verifyToken, requireAdmin } = require("../middlewares/authMiddleware");

// Tạo payment mới (thanh toán khóa học)
router.post("/", verifyToken, paymentController.createPayment);

// Lấy thống kê payments cho admin
router.get(
  "/statistics",
  verifyToken,
  requireAdmin,
  paymentController.getAdminPaymentStats
);

// Lấy danh sách payments của user hiện tại
router.get("/user", verifyToken, paymentController.getMyPayments);

// Lấy danh sách payments của một user cụ thể (admin only)
router.get(
  "/user/:userId",
  verifyToken,
  requireAdmin,
  paymentController.getPaymentsByUser
);

// Lấy danh sách payments theo khóa học
router.get(
  "/course/:courseId",
  verifyToken,
  paymentController.getPaymentsByCourse
);

// Lấy tất cả payments (admin only) - Đặt cuối để tránh conflict
router.get("/all", verifyToken, requireAdmin, paymentController.getAllPayments);

module.exports = router;
