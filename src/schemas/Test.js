const mongoose = require("mongoose");

const testSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: { type: String, trim: true },
    topic: {
      type: String,
      required: true,
      trim: true,
    }, // chủ điểm bài kiểm tra
    skill: {
      type: String,
      enum: [
        "reading",
        "listening",
        "speaking",
        "writing",
        "vocabulary",
        "grammar",
      ],
      required: true,
    },
    durationMin: { type: Number, required: true }, // thời gian làm bài (phút)
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    }, // liên kết test với course
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }, // teacher/admin
    numQuestions: { type: Number, default: 10 }, // số lượng câu hỏi
    questionTypes: [
      {
        type: String,
        enum: ["multiple_choice", "fill_in_blank", "rearrange", "essay"],
        required: true,
      },
    ],
    examType: {
      type: String,
      enum: ["TOEIC", "IELTS"],
      required: true,
    },
    passingScore: { type: Number, default: 7 }, // điểm đạt
    maxAttempts: { type: Number }, // số lần được phép thi
    isTheLastTest: { type: Boolean, default: false }, // bài test cuối cùng để phát hành chứng chỉ
  },
  { timestamps: true }
);

module.exports = mongoose.model("Test", testSchema);
