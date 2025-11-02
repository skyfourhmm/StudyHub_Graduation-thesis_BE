const express = require("express");
const router = express.Router();
const { verifyToken, requireAdmin } = require("../middlewares/authMiddleware");

const {
  generateTestController,
} = require("../controllers/generateTestController");

const {
  generateTestCustomController,
} = require("../controllers/generateTestCustomController");

// Submit test
router.post("/", verifyToken, generateTestController);

// Custom Test Generation
router.post("/custom", verifyToken, generateTestCustomController);

module.exports = router;
