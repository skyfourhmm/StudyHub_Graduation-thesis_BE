const mongoose = require("mongoose");
// const StudyStats = require("../schemas/studyStats");
const StudyLog = require("../schemas/studyLog");
const dayjs = require("dayjs");

const getStudyStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);
    const targetMonth = !isNaN(month) ? month : dayjs().month() + 1;
    const targetYear = !isNaN(year) ? year : dayjs().year();

    const startOfMonth = dayjs(`${targetYear}-${targetMonth}-01`).startOf(
      "month"
    );
    const endOfMonth = startOfMonth.endOf("month");

    const logs = await StudyLog.find({
      user: userId,
      date: { $gte: startOfMonth.toDate(), $lte: endOfMonth.toDate() },
    }).sort({ date: 1 });

    if (!logs.length) {
      return res.json({
        message: `No study logs found for ${targetMonth}/${targetYear}`,
        data: {
          completedLessons: 0,
          completedTests: 0,
          currentStreak: 0,
          longestStreak: 0,
          studyTimeThisMonth: "0h 0m 0s",
          studyTimeThisMonthSeconds: 0,
          dailyStats: [],
        },
      });
    }

    // Tổng thời gian (giây)
    const studyTimeThisMonthSeconds = logs.reduce(
      (acc, l) => acc + (l.durationSeconds || 0),
      0
    );

    // Chuyển sang h/m/s
    const hours = Math.floor(studyTimeThisMonthSeconds / 3600);
    const minutes = Math.floor((studyTimeThisMonthSeconds % 3600) / 60);
    const seconds = studyTimeThisMonthSeconds % 60;
    const studyTimeThisMonth = `${hours}h ${minutes}m ${seconds}s`;

    // Đếm số bài học & test duy nhất
    const completedLessons = new Set(
      logs.filter((l) => l.type === "lesson").map((l) => l.lesson?.toString())
    ).size;

    const completedTests = new Set(
      logs.filter((l) => l.type === "test").map((l) => l.test?.toString())
    ).size;

    // Tính streak
    let currentStreak = 0;
    let longestStreak = 0;
    const dates = [
      ...new Set(logs.map((l) => dayjs(l.date).format("YYYY-MM-DD"))),
    ].sort();

    for (let i = 0; i < dates.length; i++) {
      if (i === 0) {
        currentStreak = 1;
        longestStreak = 1;
      } else {
        const prev = dayjs(dates[i - 1]);
        const curr = dayjs(dates[i]);
        const diff = curr.diff(prev, "day");

        if (diff === 1) currentStreak++;
        else if (diff > 1) {
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak);

    // Tổng hợp theo ngày
    const dailyStats = [];
    const daysInMonth = endOfMonth.date();
    let cumulativeSeconds = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dayjs(`${targetYear}-${targetMonth}-${d}`).format(
        "YYYY-MM-DD"
      );
      const dayLogs = logs.filter((l) => dayjs(l.date).isSame(dateStr, "day"));

      const totalLessonCount = new Set(
        dayLogs
          .filter((l) => l.type === "lesson")
          .map((l) => l.lesson?.toString())
      ).size;

      const totalTestCount = new Set(
        dayLogs.filter((l) => l.type === "test").map((l) => l.test?.toString())
      ).size;

      const totalSeconds = dayLogs.reduce(
        (acc, l) => acc + (l.durationSeconds || 0),
        0
      );

      cumulativeSeconds += totalSeconds;

      dailyStats.push({
        date: dateStr,
        completedLessons: totalLessonCount,
        completedTests: totalTestCount,
        studyTimeSeconds: totalSeconds,
        cumulativeStudyTimeSeconds: cumulativeSeconds,
      });
    }

    res.status(200).json({
      message: `Get Study Stats for ${targetMonth}/${targetYear} Successfully`,
      data: {
        month: targetMonth,
        year: targetYear,
        completedLessons,
        completedTests,
        currentStreak,
        longestStreak,
        studyTimeThisMonth,
        studyTimeThisMonthSeconds,
        dailyStats,
      },
    });
  } catch (error) {
    console.error("Error getting study stats:", error);
    res.status(500).json({ error: "Failed to get study stats" });
  }
};

// 🧠 Ghi log học tập (khi user hoàn thành 1 bài)
const logStudySession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { lessonId, testId, durationSeconds } = req.body;

    console.log("Logging study session:", {
      userId,
      lessonId,
      testId,
      durationSeconds,
    });

    if (!durationSeconds) {
      return res.status(400).json({ error: "durationSeconds is required" });
    }

    // Xác định loại log
    const type = lessonId ? "lesson" : testId ? "test" : null;
    if (!type) {
      return res
        .status(400)
        .json({ error: "Either lessonId or testId is required" });
    }

    const newLog = await StudyLog.create({
      user: userId,
      lesson: lessonId || null,
      test: testId || null,
      durationSeconds,
      type,
      date: new Date(),
    });

    res.status(201).json({
      message: "Study session logged successfully",
      data: newLog,
    });
  } catch (error) {
    console.error("Error logging study session:", error);
    res.status(500).json({ error: "Failed to log study session" });
  }
};
module.exports = { getStudyStats, logStudySession };
