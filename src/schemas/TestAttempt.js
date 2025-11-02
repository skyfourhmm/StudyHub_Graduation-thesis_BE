const mongoose = require("mongoose");

const testAttemptSchema = new mongoose.Schema(
  {
    testPoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestPool",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    attemptNumber: { type: Number, default: 0 }, // lần attempt cho cùng 1 đề
    maxAttempts: { type: Number, default: 3 },
    score: { type: Number, default: 0 },
    feedback: { type: String, trim: true },
    evaluationModel: { type: String, default: "gemini" },
    isPassed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TestAttempt", testAttemptSchema);
