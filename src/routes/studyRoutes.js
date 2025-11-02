const express = require("express");
const router = express.Router();
const { verifyToken, requireAdmin } = require("../middlewares/authMiddleware");

const {
  getStudyStats,
  logStudySession,
} = require("../controllers/studyController");

router.get("/stats", verifyToken, getStudyStats);
router.post("/log", verifyToken, logStudySession);

module.exports = router;
