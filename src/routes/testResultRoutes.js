// routes/testRoutes.js
const express = require("express");
const router = express.Router();
// const TestAttempt = require("../models/testAttemptModel");
// const UserAnswer = require("../models/userAnswerModel");
const { gradeTestWithAI } = require("../services/aiService.service");

const submitAnswer = require("../controllers/testResultController");

// Submit test
router.post("/submit", submitAnswer.submitAnswers);

module.exports = router;
