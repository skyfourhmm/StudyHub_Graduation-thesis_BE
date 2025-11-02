const mongoose = require("mongoose");

const attemptModel = require("../models/testAttemptModel");
const attemptDetailModel = require("../models/attemptDetailModel");
const questionModel = require("../models/questionModel");
const testPoolModel = require("../models/testPoolModel");
const testModel = require("../models/testModel");

// const StudyStats = require("../schemas/studyStats");
const StudyLog = require("../schemas/studyLog");
const dayjs = require("dayjs");

const userModel = require("../models/userModel");
//  For calling external grading service
const axios = require("axios");
const { issueCertificate } = require("../models/certificateModel");
// const userAnswerModel = require("../models/userAnswerModel");

const startAttempt = async (req, res) => {
  try {
    const { testPoolId, testId, evaluationModel, maxAttempts } = req.body;
    if (!testPoolId)
      return res.status(400).json({ error: "testPoolId is required" });

    console.log("maxAttempts received:", maxAttempts);

    const attemptData = {
      testPoolId,
      userId: req.user?.userId || req.body.userId,
      evaluationModel: evaluationModel || "gemini",
      feedback: "",
      maxAttempts: maxAttempts || 3,
      testId,
    };

    console.log("Starting attempt with data:", attemptData);

    const savedAttempt = await attemptModel.createAttempt(attemptData);
    res.status(201).json({ message: "Attempt started", data: savedAttempt });
  } catch (error) {
    console.error("Error starting attempt:", error);
    res.status(500).json({ error: "Failed to start attempt" });
  }
};

const submitAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers, testId, startTime } = req.body;
    const userId = req.user.userId;

    console.log("Submitting attempt:", { attemptId, userId, testId, answers });

    const endTime = new Date();

    let resForTestResult = {};

    let testDetail;
    // TEST RESULT CONTROLLER
    try {
      // --- Lấy thông tin test ---
      testDetail = await testModel.findTestById(testId);

      const questionIds = answers.map((a) => a.questionId);
      const questionsByTest = await questionModel.findQuestionsByIds(
        questionIds
      );

      const formattedAnswerKey = questionsByTest.map((q, index) => {
        const correctOption = q.options.find((opt) => opt.isCorrect);
        return {
          id: index + 1, // đánh số từ 1
          question: q.questionText,
          answer: correctOption?.optionText || null,
          skill: q.skill || null,
          topic: Array.isArray(q.topic) ? q.topic.join(", ") : q.topic || null,
        };
      });

      // --- Lấy câu trả lời của học sinh ---
      // const userAnswers = await userAnswerModel.findAnswersByAttempt(attemptId);
      const userAnswers = await attemptDetailModel.findAnswersByAttempt(
        attemptId
      );

      const questionMap = new Map(
        questionsByTest.map((q, index) => [q._id.toString(), index + 1]) // map questionId -> số thứ tự
      );

      const studentAnswers = {};
      userAnswers.forEach((ans) => {
        const questionNumber = questionMap.get(ans.questionId?.toString());
        if (questionNumber !== undefined) {
          const selectedOption = questionsByTest
            .find((q) => q._id.toString() === ans.questionId?.toString())
            .options.find(
              (opt) => opt._id.toString() === ans.selectedOptionId?.toString()
            );
          if (selectedOption)
            studentAnswers[questionNumber] = selectedOption.optionText;
        }
      });

      // Lấy danh sách câu hỏi để chấm điểm
      const qIds = answers.map((a) => a.questionId);
      const questionDocs = await questionModel.findQuestionsByIds(qIds);
      const qMap = new Map(questionDocs.map((q) => [q._id.toString(), q]));

      let totalScore = 0;
      const processedAnswers = [];

      for (const a of answers) {
        const q = qMap.get(String(a.questionId));
        if (!q) continue;

        let selectedOption = null;
        if (a.selectedOptionId) {
          selectedOption = q.options.find(
            (opt) => opt._id.toString() === a.selectedOptionId
          );
        }
        if (!selectedOption && a.answerLetter) {
          selectedOption = q.options.find(
            (opt, idx) =>
              String.fromCharCode(65 + idx) === a.answerLetter.toUpperCase()
          );
        }

        let isCorrect = undefined;
        let score = 0;
        if (q.questionType === "multiple_choice") {
          if (selectedOption) {
            isCorrect = !!selectedOption.isCorrect;
            score = isCorrect ? q.points || 1 : 0;
          } else {
            isCorrect = false;
            score = 0;
          }
        }

        totalScore += score;
        processedAnswers.push({
          questionId: q._id,
          questionText: q.questionText,
          selectedOptionId: selectedOption?._id,
          selectedOptionText: selectedOption?.optionText || a.answerText || "",
          isCorrect,
          score,
        });
      }

      // 👉 Tạo object dạng { "1": "ARE YOU", "2": "IS SHE", ... }
      const studentAnswersMap = {};
      processedAnswers.forEach((a, index) => {
        studentAnswersMap[String(index + 1)] = a.selectedOptionText || "";
      });

      // lấy thời gian học hằng tuần
      let timeWeekly = {};
      try {
        const timedata = await getStudyStats(userId);
        console.log("Study stats data sent to grading service:", timedata);
        const result = getWeekWithMaxHours(dailyStats);
        // { maxWeek: "42", maxHours: 0.167 }
        console.log(result);
        timeWeekly = result;
      } catch (error) {
        console.error("Error submitting answers to grading service:", error);
      }

      // --- Lấy thông tin học sinh ---
      const userInfo = await attemptModel.findAttemptById(attemptId);
      const formattedUser = {
        student_id: userInfo?.userId._id.toString(),
        name: userInfo?.userId.fullName,
        current_level: `TOEIC ${userInfo?.userId?.currentLevel?.TOEIC}`,
        study_hours_per_week: timeWeekly.maxHours || 2,
        learning_goals:
          userInfo?.userId?.learningGoals || "Đạt TOEIC 750 trong vòng 6 tháng",
        learning_preferences: userInfo?.userId?.learningPreferences || [],
        study_methods: userInfo?.userId?.studyMethods || [],
      };

      // --- Lịch sử làm bài ---
      // const history = await attemptModel.findAttemptsByUser(
      //   userInfo?.userId._id
      // );
      // const testHistory = history.map((a) => ({
      //   test_date: a.startTime
      //     ? new Date(a.startTime).toISOString().split("T")[0] // yyyy-mm-dd
      //     : "1970-01-01", // nếu null, gán ngày mặc định hợp lệ
      //   level_at_test: a.level || "Unknown",
      //   score: a.score != null ? a.score : 0, // nếu score undefined/null -> 0
      //   notes: a.feedback || "",
      // }));

      const history = await attemptDetailModel.getAllAttemptDetailsByUserId(
        userInfo?.userId._id
      );

      console.log("Full test history:", history);

      const simplifiedResults = history.slice(0, 3).map((item) => ({
        test_date:
          item.startTime instanceof Date
            ? item.startTime.toISOString().split("T")[0] // chuyển Date → ISO string → lấy ngày
            : item.startTime?.split("T")[0] || null, // nếu là string
        level_at_test: item.analysisResult.current_level,
        per_question: item.analysisResult.per_question,
        weak_topics: item.analysisResult.weak_topics || [],
      }));

      console.log("Simplified test history:", simplifiedResults);

      formattedUser.test_history = simplifiedResults;

      console.log(
        "Formatted user data sent to grading service:",
        formattedUser
      );

      // --- Ghép thành object cuối cùng ---
      const gradingPayload = {
        test_info: {
          title: testDetail.title,
          total_questions: questionsByTest.length,
        },
        answer_key: formattedAnswerKey,
        student_answers: studentAnswersMap,
        use_gemini: true,
        profile: formattedUser,
      };

      console.log("Grading payload:", gradingPayload);
      if (testDetail.isTheLastTest) {
        gradingPayload.use_gemini = false; // nếu là bài test cuối, ko dùng gemini
      }
      const response = await axios.post(
        "http://localhost:8000/grade",
        gradingPayload
      );

      resForTestResult = response?.data || {};

      console.log("Grading response:", resForTestResult);

      // console.log("Grading response:", response.data);

      // res.status(201).json({
      //   message: "Answers submitted successfully",
      //   data: response?.data,
      // });
    } catch (error) {
      console.error("Error submitting answers:", error);
      return res.status(500).json({ error: "Failed to submit answers" });
    }

    // TEST RESULT CONTROLLER

    if (!attemptId)
      return res.status(400).json({ error: "attemptId is required" });
    if (!Array.isArray(answers) || !answers.length)
      return res.status(400).json({ error: "answers is required" });

    // Lấy danh sách câu hỏi để chấm điểm
    const qIds = answers.map((a) => a.questionId);
    const questionDocs = await questionModel.findQuestionsByIds(qIds);
    const qMap = new Map(questionDocs.map((q) => [q._id.toString(), q]));

    let totalScore = 0;
    const processedAnswers = [];

    for (const a of answers) {
      const q = qMap.get(String(a.questionId));
      if (!q) continue;

      let selectedOption = null;
      if (a.selectedOptionId) {
        selectedOption = q.options.find(
          (opt) => opt._id.toString() === a.selectedOptionId
        );
      }
      if (!selectedOption && a.answerLetter) {
        selectedOption = q.options.find(
          (opt, idx) =>
            String.fromCharCode(65 + idx) === a.answerLetter.toUpperCase()
        );
      }

      let isCorrect = undefined;
      let score = 0;
      if (q.questionType === "multiple_choice") {
        if (selectedOption) {
          isCorrect = !!selectedOption.isCorrect;
          score = isCorrect ? q.points || 1 : 0;
        } else {
          isCorrect = false;
          score = 0;
        }
      }

      totalScore += score;
      processedAnswers.push({
        questionId: q._id,
        questionText: q.questionText,
        selectedOptionId: selectedOption?._id,
        selectedOptionText: selectedOption?.optionText || a.answerText || "",
        isCorrect,
        score,
      });
    }

    // Lấy attempt hiện tại để tăng số lần làm bài
    const attemptDoc = await attemptModel.findAttemptById(attemptId);
    const newAttemptNumber = (attemptDoc.attemptNumber || 0) + 1;

    // Tạo AttemptDetail mới (1 bản ghi / lần nộp)
    const attemptDetail = await attemptDetailModel.createAttemptDetail({
      attemptId,
      attemptNumber: newAttemptNumber,
      startTime: startTime ? new Date(startTime) : new Date(), // thời điểm bắt đầu (hoặc lấy từ frontend nếu có)
      endTime: endTime, // thời điểm kết thúc khi nộp
      answers: processedAnswers,
      analysisResult: resForTestResult || {},
      totalScore,
      submittedAt: endTime,
    });

    // Cập nhật tổng điểm và số lần attempt
    const updatedAttempt = await attemptModel.updateAttemptById(attemptId, {
      score: totalScore,
      attemptNumber: newAttemptNumber,
    });

    // const updateData = {
    //   currentLevel: {
    //     TOEIC:
    //       extractLevel(resForTestResult?.post_test_level) ||
    //       extractLevel(resForTestResult?.current_level),
    //   },
    // };

    // if (resForTestResult?.post_test_level) {
    //   await userModel.updateUserById(userId, updateData);
    // }

    let certificate = null;

    console.log("Test detail fetched:", testDetail);

    if (
      (totalScore / testDetail?.numQuestions) * 100 >=
        testDetail?.passingScore * 10 &&
      testDetail.isTheLastTest &&
      testDetail?.courseId
    ) {
      certificate = await issueCertificate(userId, testDetail.courseId);
    } else if (!testDetail?.courseId) {
      console.warn("Cannot issue certificate: courseId is missing.");
    }

    res.status(200).json({
      message: "Submitted successfully",
      attempt: updatedAttempt,
      certificate,
      attemptDetail,
      summary: { totalScore, answered: processedAnswers.length },
    });
  } catch (error) {
    console.error("Error submitting attempt:", error);
    res.status(500).json({ error: "Failed to submit attempt" });
  }
};

const getAttemptById = async (req, res) => {
  try {
    const { attemptId } = req.params;
    console.log("Fetching attempt with ID:", attemptId);
    if (!attemptId)
      return res.status(400).json({ error: "Attempt ID not found" });

    const attempt = await attemptModel.findAttemptById(attemptId);
    if (!attempt) return res.status(404).json({ error: "Attempt not found" });

    // Lấy tất cả các lần attempt detail của attempt này
    const details = await attemptDetailModel.getAttemptDetailByAttemptId({
      attemptId,
    });

    res.status(200).json({
      message: "Attempt retrieved",
      data: { attempt, details },
    });
  } catch (error) {
    console.error("Error getting attempt:", error);
    res.status(500).json({ error: "Failed to get attempt" });
  }
};

const getAttemptsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "User ID not found" });

    const attempts = await attemptModel.findAttemptsByUser(userId);
    res.status(200).json({
      message: "Attempts retrieved",
      data: attempts,
      total: attempts.length,
    });
  } catch (error) {
    console.error("Error getting attempts by user:", error);
    res.status(500).json({ error: "Failed to get attempts" });
  }
};

const getAttemptByTest = async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) return res.status(400).json({ error: "testId is required" });

    const userId = req.user?.userId;
    const attempt = await attemptModel.findAttemptByTestId(testId, userId);
    if (!attempt) return res.status(404).json({ error: "Attempt not found" });

    res.status(200).json({ message: "Attempt retrieved", data: attempt });
  } catch (error) {
    console.error("Error getting attempt by testId:", error);
    res.status(500).json({ error: "Failed to get attempt" });
  }
};

const getAttemptInfo = async (req, res) => {
  try {
    const { userId, testId } = req.body;

    const testPool = await testPoolModel.findTestPool({
      baseTestId: testId,
      status: "active",
      createdBy: userId,
    });
    console.log("Found testPool:", testPool);
    if (!testPool || !testPool.length)
      return res
        .status(404)
        .json({ message: "No test pool found for this test" });

    const attempt = await attemptModel.findAttemptByUserAndPool(
      userId,
      testPool[0]?._id
    );

    const baseTest = await testModel.findTestById(testId);

    if (attempt) {
      return res.json({
        testInfo: baseTest,
        attemptInfo: {
          id: attempt._id,
          testPoolId: attempt.testPoolId?._id,
          userId: attempt.userId?._id,
          attemptNumber: attempt.attemptNumber,
          maxAttempts: attempt.maxAttempts,
          startTime: null,
          endTime: null,
          score: attempt.score,
          feedback: attempt.feedback,
          evaluationModel: attempt.evaluationModel,
        },
      });
    } else {
      return res.json({
        testInfo: baseTest,
        attemptInfo: {
          attemptNumber: 0,
          maxAttempts: 3,
          score: 0,
        },
      });
    }
  } catch (error) {
    console.error("Error in getAttemptInfo:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAttemptsByTestPool = async (req, res) => {
  try {
    const { testPoolId, userId } = req.body;

    const attempts = await attemptModel.findAttemptsByTestPool(
      testPoolId,
      userId
    );

    res.status(200).json({
      message: "Attempts retrieved successfully",
      data: attempts,
    });
  } catch (error) {
    console.error("Error in controller:", error);
    res.status(500).json({ message: error.message });
  }
};

const getAttemptsByTestIdAndUser = async (req, res) => {
  const { testId, userId } = req.params;
  try {
    const attempts = await attemptModel.findAttemptsByTestIdAndUser(
      testId,
      userId
    );
    res.status(200).json({
      message: "Attempts retrieved successfully",
      data: attempts,
    });
  } catch (error) {
    console.error("Error getting attempts by testId and user:", error);
    res.status(500).json({ message: error.message });
  }
};

const getCustomTestAttemptsByUser = async (req, res) => {
  try {
    const userId = req.user?.userId; // lấy từ token hoặc query

    // Tìm tất cả attempt của user có testPoolId là customPoolId
    const attempts = await attemptModel.findCustomTestAttemptsByUser(userId);

    if (attempts.length === 0) {
      return res.status(200).json({
        message: "No custom test attempts found for this user.",
        data: [],
        total: 0,
      });
    }

    res.status(200).json({
      message: "Custom test attempts retrieved successfully",
      data: attempts,
      total: attempts.length,
    });
  } catch (error) {
    console.error("Error fetching custom test attempts:", error);
    res.status(500).json({ error: "Failed to fetch test attempts" });
  }
};

const getStudyStats = async (userId) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1; // getMonth() trả về 0-11, nên +1
    const year = now.getFullYear();

    // Nếu không có query, mặc định là tháng hiện tại
    const targetMonth = !isNaN(month) ? month : dayjs().month() + 1; // month trong dayjs là 0-index
    const targetYear = !isNaN(year) ? year : dayjs().year();

    const startOfMonth = dayjs(`${targetYear}-${targetMonth}-01`).startOf(
      "month"
    );
    const endOfMonth = startOfMonth.endOf("month");

    // 1️⃣ Lấy toàn bộ log trong tháng đó
    const logs = await StudyLog.find({
      user: userId,
      date: { $gte: startOfMonth.toDate(), $lte: endOfMonth.toDate() },
    }).sort({ date: 1 });

    if (!logs.length) {
      return res.json({
        message: `No study logs found for ${targetMonth}/${targetYear}`,
        data: {
          completedLessons: 0,
          currentStreak: 0,
          longestStreak: 0,
          studyTimeThisMonth: "0h 0m",
          studyTimeThisMonthMinutes: 0,
          dailyStats: [],
        },
      });
    }

    // 2️⃣ Tính tổng bài học & thời gian học trong tháng
    const completedLessons = new Set(logs.map((l) => l.lesson?.toString()))
      .size;
    const studyTimeThisMonthMinutes = logs.reduce(
      (acc, l) => acc + (l.durationMinutes || 0),
      0
    );
    const hours = Math.floor(studyTimeThisMonthMinutes / 60);
    const minutes = studyTimeThisMonthMinutes % 60;
    const studyTimeThisMonth = `${hours}h ${minutes}m`;

    // 3️⃣ Tính streak trong tháng
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

    // 4️⃣ Tổng hợp theo ngày (để hiển thị biểu đồ)
    const dailyStats = [];
    const daysInMonth = endOfMonth.date();
    let cumulativeTime = 0; // 👉 thêm biến tích lũy

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dayjs(`${targetYear}-${targetMonth}-${d}`).format(
        "YYYY-MM-DD"
      );
      const dayLogs = logs.filter((l) => dayjs(l.date).isSame(dateStr, "day"));

      const totalLessons = new Set(dayLogs.map((l) => l.lesson?.toString()))
        .size;
      const totalTime = dayLogs.reduce(
        (acc, l) => acc + (l.durationMinutes || 0),
        0
      );

      cumulativeTime += totalTime; // 👉 cộng dồn theo ngày

      dailyStats.push({
        date: dateStr,
        completedLessons: totalLessons,
        studyTimeMinutes: totalTime,
        cumulativeStudyTimeMinutes: cumulativeTime, // 👉 thêm trường mới
      });
    }

    // ✅ Trả kết quả
    return {
      data: {
        month: targetMonth,
        year: targetYear,
        completedLessons,
        currentStreak,
        longestStreak,
        studyTimeThisMonth,
        studyTimeThisMonthMinutes,
        dailyStats,
      },
    };
  } catch (error) {
    console.error("Error getting study stats:", error);
    res.status(500).json({ error: "Failed to get study stats" });
  }
};

const dailyStats = [
  /* dữ liệu dailyStats bạn đã đưa */
];

// Hàm lấy tuần cao nhất
function getWeekWithMaxHours(stats) {
  const weeks = {};
  stats.forEach((day) => {
    const date = new Date(day.date);
    const week = `${getWeekNumber(date)}`; // dùng số tuần trong năm
    if (!weeks[week]) weeks[week] = 0;
    weeks[week] += day.studyTimeMinutes;
  });

  // Tìm tuần có số phút cao nhất
  let maxWeek = null;
  let maxMinutes = 0;
  for (const [week, minutes] of Object.entries(weeks)) {
    if (minutes > maxMinutes) {
      maxMinutes = minutes;
      maxWeek = week;
    }
  }

  return { maxWeek, maxHours: maxMinutes / 60 };
}

// Hàm tính số tuần trong năm từ date
function getWeekNumber(d) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNum = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - dayNum);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

function extractLevel(levelStr) {
  if (!levelStr) return null;
  // Dùng regex lấy 2 số cách nhau dấu -
  const match = levelStr.match(/(\d+\s*-\s*\d+)/);
  return match ? match[1] : levelStr; // nếu ko match thì giữ nguyên
}

const updateAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const updateData = req.body;
    const updatedAttempt = await attemptModel.updateAttemptById(
      attemptId,
      updateData
    );
    res.status(200).json({ message: "Attempt updated", data: updatedAttempt });
  } catch (error) {
    console.error("Error updating attempt:", error);
    res.status(500).json({ error: "Failed to update attempt" });
  }
};

module.exports = {
  startAttempt,
  submitAttempt,
  getAttemptById,
  getAttemptsByUser,
  getAttemptByTest,
  getAttemptInfo,
  getAttemptsByTestPool,
  getAttemptsByTestIdAndUser,
  getCustomTestAttemptsByUser,
  updateAttempt,
};
