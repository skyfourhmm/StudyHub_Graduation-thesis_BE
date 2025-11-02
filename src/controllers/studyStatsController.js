const mongoose = require("mongoose");
const StudyStats = require("../schemas/StudyStats.js");

// ✅ Ghi lại hoạt động học tập trong ngày
const logStudyActivity = async (req, res) => {
  try {
    const { day, exercises, lessons, durationSeconds } = req.body;

    const userId = req.user.userId;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Chuẩn hóa ID hợp lệ
    const exerciseId =
      exercises && mongoose.isValidObjectId(exercises)
        ? new mongoose.Types.ObjectId(exercises)
        : null;

    const lessonId =
      lessons && mongoose.isValidObjectId(lessons)
        ? new mongoose.Types.ObjectId(lessons)
        : null;

    // Tìm document tháng hiện tại
    let stats = await StudyStats.findOne({ userId, year, month });

    // Nếu chưa có thì tạo mới
    if (!stats) {
      stats = new StudyStats({
        userId,
        year,
        month,
        dailyStats: [
          {
            day,
            exercises: exerciseId ? [exerciseId] : [],
            lessons: lessonId ? [lessonId] : [],
            durationSeconds: durationSeconds || 0,
          },
        ],
      });
    } else {
      // Tìm ngày trong mảng dailyStats
      let dayStat = stats.dailyStats.find((d) => d.day === day);

      // Nếu chưa có ngày đó → thêm mới
      if (!dayStat) {
        dayStat = {
          day,
          exercises: exerciseId ? [exerciseId] : [],
          lessons: lessonId ? [lessonId] : [],
          durationSeconds: durationSeconds || 0,
        };
        stats.dailyStats.push(dayStat);
      } else {
        // Cập nhật ngày đã có
        dayStat.durationSeconds += durationSeconds || 0;

        // Nếu có exercise thì push vào mảng (nếu chưa tồn tại)
        if (exerciseId && !dayStat.exercises.includes(exerciseId)) {
          dayStat.exercises.push(exerciseId);
        }

        // Nếu có lesson thì push vào mảng (nếu chưa tồn tại)
        if (lessonId && !dayStat.lessons.includes(lessonId)) {
          dayStat.lessons.push(lessonId);
        }
      }
    }

    await stats.save();
    return res
      .status(200)
      .json({ message: "Logged successfully", data: stats });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error logging study activity", error });
  }
};

// ✅ Lấy thống kê theo tháng
const getMonthlyStats = async (req, res) => {
  try {
    const { year, month } = req.params;
    const userId = req.user.userId;

    const stats = await StudyStats.findOne({ userId, year, month })
      .populate("dailyStats.exercises", "title")
      .populate("dailyStats.lessons", "title");

    if (!stats) {
      return res.status(404).json({ message: "No stats found for this month" });
    }

    // ======= ⚙️ Tính toán các giá trị =======
    const days = stats.dailyStats.map((d) => d.day).sort((a, b) => a - b);
    const totalTime = stats.dailyStats.reduce(
      (sum, d) => sum + (d.durationSeconds || 0),
      0
    );

    // Đếm tổng số lessons đã hoàn thành
    const allLessons = stats.dailyStats.flatMap(
      (d) => d.lessons?.map((l) => l._id.toString()) || []
    );
    const completedLessons = new Set(allLessons).size;

    // Tính streaks (chuỗi ngày học liên tục)
    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 1;

    for (let i = 1; i < days.length; i++) {
      if (days[i] === days[i - 1] + 1) {
        streak++;
      } else {
        streak = 1;
      }
      longestStreak = Math.max(longestStreak, streak);
    }

    // Tính current streak (chuỗi liên tục đến hôm nay)
    const today = new Date().getDate();
    let consecutive = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (today - days[i] <= consecutive) {
        consecutive++;
      } else {
        break;
      }
    }
    currentStreak = consecutive;

    return res.status(200).json({
      data: stats,
      summary: {
        completedLessons,
        studyTimeThisMonth: totalTime,
        currentStreak,
        longestStreak,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error retrieving stats", error });
  }
};

// ✅ Xóa toàn bộ thống kê của 1 tháng
const deleteMonthlyStats = async (req, res) => {
  try {
    const { year, month } = req.params;
    const userId = req.user.userId;

    const deleted = await StudyStats.findOneAndDelete({ userId, year, month });

    if (!deleted) {
      return res.status(404).json({ message: "No stats found to delete" });
    }

    return res.status(200).json({
      message: "Monthly stats deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error deleting stats", error });
  }
};

module.exports = {
  logStudyActivity,
  getMonthlyStats,
  deleteMonthlyStats,
};
