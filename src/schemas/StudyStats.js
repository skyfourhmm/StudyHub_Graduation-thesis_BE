const mongoose = require("mongoose");

const dailyStatSchema = new mongoose.Schema({
  day: { type: Number, required: true },

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

studyStatsSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("StudyStats", studyStatsSchema);
