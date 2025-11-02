const mongoose = require("mongoose");

const dailyStatSchema = new mongoose.Schema({
  day: { type: Number, required: true },

  // Mỗi ngày có thể học nhiều bài test hoặc bài học
  exercises: [{ type: mongoose.Schema.Types.ObjectId, ref: "Test" }],
  lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: "GrammarLesson" }],

  durationSeconds: { type: Number, default: 0 },
});

const studyStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    dailyStats: [dailyStatSchema],
  },
  { timestamps: true }
);

// Mỗi user chỉ có 1 document cho mỗi tháng/năm
studyStatsSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("StudyStats", studyStatsSchema);
