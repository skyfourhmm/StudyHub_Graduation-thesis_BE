// models/StudyLog.js
const mongoose = require("mongoose");

const studyLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    //  Đổi từ phút sang giây
    durationSeconds: {
      type: Number,
      required: true,
      min: 1,
    },
    // Có thể là bài học hoặc bài test
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
    },
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
    },
    type: {
      type: String,
      enum: ["lesson", "test"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudyLog", studyLogSchema);
