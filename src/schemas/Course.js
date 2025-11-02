const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseType: {
      type: String,
      enum: ["TOEIC", "IELTS"],
      required: true,
    },
    courseLevel: {
      type: String,
      required: true,
    },
    thumbnailUrl: { type: String, trim: true },
    category: { type: String, trim: true },
    tags: { type: [String], trim: true },
    cost: {
      type: Number,
      required: true,
      min: 0,
    },
    durationHours: { type: Number, min: 0 },
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],

    grammarLessons: [
      {
        type: mongoose.Schema.Types.ObjectId, // Kiểu dữ liệu là ID của Mongoose
        ref: "GrammarLesson", // Quan trọng: Đây là tên model bạn đã export
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
