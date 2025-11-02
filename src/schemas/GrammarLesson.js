const mongoose = require("mongoose");

const grammarLessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true }, // ví dụ: "Ngữ pháp TOEIC"
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    parts: [
      {
        title: { type: String, required: true }, // Phần 1, 2, 3
        description: { type: String }, // mô tả phần
        content: { type: String }, // nội dung chính
      },
    ],
    exercises: [{ type: mongoose.Schema.Types.ObjectId, ref: "Test" }], // liên kết bài tập
  },
  { timestamps: true }
);

module.exports = mongoose.model("GrammarLesson", grammarLessonSchema);
