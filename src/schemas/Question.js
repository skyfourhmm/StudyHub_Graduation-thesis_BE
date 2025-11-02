const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },

    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestAttempt",
      required: false,
    },

    questionText: { type: String, required: true }, // nội dung câu hỏi

    questionType: {
      type: String,
      enum: ["multiple_choice", "fill_blank", "essay", "speaking"],
      required: true,
    },

    // Chỉ dùng cho MCQ
    options: [
      {
        optionText: { type: String, required: true }, // ví dụ: "Paris"
        isCorrect: { type: Boolean, default: false }, // true nếu là đáp án đúng
      },
    ],

    audioUrl: { type: String, trim: true }, // listening
    imageUrl: { type: String, trim: true }, // hình minh họa
    points: { type: Number, default: 1 },
    descriptions: { type: String, trim: true }, // giải thích đáp án

    skill: {
      type: String,
      enum: [
        "Grammar",
        "Vocabulary",
        "Reading",
        "Listening",
        "Speaking",
        "Writing",
      ],
    },
    topic: [{ type: String, trim: true }],
    tag: [{ type: String, trim: true }],

    // Người tạo câu hỏi (teacher/admin/AI)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    level: {
      TOEIC: { type: String },
      IELTS: { type: String },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);
