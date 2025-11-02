const mongoose = require("mongoose");

const attemptDetailSchema = new mongoose.Schema({
  attemptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestAttempt",
    required: true,
  },
  attemptNumber: { type: Number, required: true },

  startTime: { type: Date, default: Date.now }, // ✅ thêm mới
  endTime: { type: Date }, // ✅ thêm mới

  answers: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
      questionText: String,
      selectedOptionId: { type: mongoose.Schema.Types.ObjectId },
      selectedOptionText: String,
      isCorrect: Boolean,
      score: Number,
    },
  ],
  analysisResult: {
    type: Object, // có thể chứa kết quả phân tích AI (grammar, reasoning, vv)
    default: {},
  },
  totalScore: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AttemptDetail", attemptDetailSchema);
