const express = require("express");
const router = express.Router();
const testPoolController = require("../controllers/testPoolController");

// Admin tạo TestPool (sau khi AI sinh ra)
router.post("/", testPoolController.createTestPool);

// Lấy danh sách pool
router.get("/", testPoolController.getAllTestPools);

// Lấy pool theo ID
router.get("/:poolId", testPoolController.getTestPoolById);

// Update pool (admin)
router.put("/:poolId", testPoolController.updateTestPoolById);

// Xoá pool (admin)
router.delete("/:poolId", testPoolController.deleteTestPoolById);

// Lấy pool theo level (userB dùng để lấy pool phù hợp với level của mình)
router.get("/level/:level", testPoolController.getTestPoolsByLevel);

// Lấy pool theo baseTestId (dùng để lấy pool khi tạo test từ pool)
router.get("/by-test/:testId", testPoolController.getPoolsByBaseTestId);

// Lấy pool theo creatorId
router.get("/creator/:creatorId", testPoolController.getTestPoolsByCreator);

module.exports = router;
