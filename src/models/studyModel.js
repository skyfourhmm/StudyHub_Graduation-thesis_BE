const mongoose = require("mongoose");
const StudyStats = require("../schemas/studyStats");
const StudyLog = require("../schemas/studyLog");

const getStudyStatistics = async (userId) => {
  // Lấy chỉ số cố định (Completed Lessons, Streaks)
  const stats = await StudyStats.findOne({ user: userId });

  // Tính Study Time This Month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const studyTimeThisMonthResult = await StudyLog.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId), // Chuyển userId sang ObjectId
        date: { $gte: startOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        totalMinutes: { $sum: "$durationMinutes" }, // Tổng thời gian (phút)
      },
    },
  ]);

  const totalMinutes =
    studyTimeThisMonthResult.length > 0
      ? studyTimeThisMonthResult[0].totalMinutes
      : 0;

  // Tổng hợp dữ liệu để trả về
  const completedLessons = stats ? stats.completedLessons : 0;
  const currentStreak = stats ? stats.currentStreak : 0;
  const longestStreak = stats ? stats.longestStreak : 0;

  return {
    completedLessons,
    currentStreak,
    longestStreak,
    studyTimeThisMonthMinutes: totalMinutes,
  };
};

// ... (Có thể thêm các hàm khác như logStudySession, updateCompletedLessons)

module.exports = {
  getStudyStatistics,
  // ...
};
