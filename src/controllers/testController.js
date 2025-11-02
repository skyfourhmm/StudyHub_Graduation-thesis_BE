const testModel = require("../models/testModel");
const Question = require("../schemas/Question");
const TestAttempt = require("../schemas/TestAttempt");

const createTest = async (req, res) => {
  try {
    const testData = req.body;

    console.log(testData);

    if (!testData)
      return res.status(400).json({ error: "Test data not found" });

    // attach creator if available
    if (req.user && req.user.userId) testData.createdBy = req.user.userId;

    const requiredFields = [
      "title",
      "topic",
      "skill",
      "durationMin",
      "courseId",
      "createdBy",
      "numQuestions",
      "questionTypes",
      "examType",
      "passingScore",
      // "maxAttempts",
      "isTheLastTest",
    ];
    for (const field of requiredFields) {
      if (testData[field] === undefined || testData[field] === null) {
        return res
          .status(400)
          .json({ error: `Missing required field: ${field}` });
      }
    }

    // Tạo test mới
    const savedTest = await testModel.createTest(testData);
    res
      .status(201)
      .json({ message: "Test created successfully", data: savedTest });
  } catch (error) {
    console.error("Error creating test:", error);
    res.status(500).json({ error: "Failed to create test" });
  }
};

const getTestById = async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) return res.status(404).json({ error: "Test ID not found" });

    const test = await testModel.findTestById(testId);
    if (!test) return res.status(404).json({ error: "Test not found" });

    res.status(200).json({ message: "Test retrieved", data: test });
  } catch (error) {
    console.error("Error getting test by id:", error);
    res.status(500).json({ error: "Failed to get test by id" });
  }
};

const getAllTests = async (req, res) => {
  try {
    const tests = await testModel.getAllTests();
    res
      .status(200)
      .json({ message: "Tests retrieved", data: tests, total: tests.length });
  } catch (error) {
    console.error("Error getting all tests:", error);
    res.status(500).json({ error: "Failed to get tests" });
  }
};

const getTestsByCourseId = async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!courseId)
      return res.status(400).json({ error: "Course ID not found" });

    const tests = await testModel.getTestsByCourseId(courseId);
    if (!tests || tests.length === 0)
      return res.status(404).json({ error: "No tests found for this course" });

    res
      .status(200)
      .json({ message: "Tests retrieved successfully", data: tests });
  } catch (error) {
    console.error("Error getting tests by courseId:", error);
    res.status(500).json({ error: "Failed to get tests by courseId" });
  }
};

const updateTestById = async (req, res) => {
  try {
    const { testId } = req.params;
    const updateData = req.body;
    if (!testId) return res.status(404).json({ error: "Test ID not found" });
    if (!updateData)
      return res.status(400).json({ error: "Update data not found" });

    const updatedTest = await testModel.updateTestById(testId, updateData);
    if (!updatedTest) return res.status(404).json({ error: "Test not found" });

    res
      .status(200)
      .json({ message: "Test updated successfully", data: updatedTest });
  } catch (error) {
    console.error("Error updating test:", error);
    res.status(500).json({ error: "Failed to update test" });
  }
};

const deleteTestById = async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) return res.status(404).json({ error: "Test ID not found" });

    const deleted = await testModel.deleteTestById(testId);
    if (!deleted) return res.status(404).json({ error: "Test not found" });

    res
      .status(200)
      .json({ message: "Test deleted successfully", data: deleted });
  } catch (error) {
    console.error("Error deleting test:", error);
    res.status(500).json({ error: "Failed to delete test" });
  }
};

const getTestStatistics = async (req, res) => {
  try {
    // Lấy tất cả tests
    const allTests = await testModel.getAllTests();

    if (!allTests || allTests.length === 0) {
      return res.status(200).json({
        message: "No tests found",
        data: [],
        total: 0,
      });
    }

    // Tạo array để chứa kết quả với thông tin thống kê
    const testStatistics = await Promise.all(
      allTests.map(async (test) => {
        try {
          // Đếm tổng số câu hỏi của test
          const totalQuestions = await Question.countDocuments({
            testId: test._id,
          });

          // Đếm số lượng participants duy nhất (distinct userId)
          const uniqueParticipants = await TestAttempt.distinct("userId", {
            testId: test._id,
          });
          const totalParticipants = uniqueParticipants.length;

          // Tính tổng số attempts
          const testAttempts = await TestAttempt.find(
            {
              testId: test._id,
            },
            "attemptNumber"
          );

          const totalAttempts = testAttempts.reduce((sum, attempt) => {
            return sum + (attempt.attemptNumber || 0);
          }, 0);

          // Thống kê theo level
          const levelStatistics = await getLevelStatistics(
            test._id,
            test.examType
          );

          return {
            id: test._id,
            title: test.title,
            examType: test.examType,
            totalQuestions,
            totalParticipants,
            totalAttempts,
            levels: levelStatistics,
            createdAt: test.createdAt,
            updatedAt: test.updatedAt,
          };
        } catch (error) {
          console.error(`Error processing test ${test._id}:`, error);
          return {
            id: test._id,
            title: test.title,
            examType: test.examType,
            totalQuestions: 0,
            totalParticipants: 0,
            totalAttempts: 0,
            levels: [],
            createdAt: test.createdAt,
            updatedAt: test.updatedAt,
          };
        }
      })
    );

    res.status(200).json({
      message: "Test statistics retrieved successfully",
      data: testStatistics,
      total: testStatistics.length,
    });
  } catch (error) {
    console.error("Error getting test statistics:", error);
    res.status(500).json({
      error: "Failed to get test statistics",
      details: error.message,
    });
  }
};

// Hàm helper để lấy thống kê theo level
const getLevelStatistics = async (testId, examType) => {
  try {
    // Lấy tất cả câu hỏi của test này
    const questions = await Question.find({ testId: testId });

    // Group câu hỏi theo level
    const levelGroups = {};

    questions.forEach((question) => {
      let level = null;

      // Lấy level dựa trên examType
      if (examType === "TOEIC" && question.level && question.level.TOEIC) {
        level = question.level.TOEIC;
      } else if (
        examType === "IELTS" &&
        question.level &&
        question.level.IELTS
      ) {
        level = question.level.IELTS;
      }

      // Nếu không có level hoặc level rỗng, đặt là "Unknown"
      if (!level || level.trim() === "") {
        level = "Unknown";
      }

      if (!levelGroups[level]) {
        levelGroups[level] = {
          level: level,
          questionIds: [],
          totalQuestions: 0,
        };
      }

      levelGroups[level].questionIds.push(question._id);
      levelGroups[level].totalQuestions += 1;
    });

    // Tính thống kê cho từng level
    const levelStatistics = await Promise.all(
      Object.values(levelGroups).map(async (levelGroup) => {
        try {
          // Lấy tất cả TestAttempt có chứa câu hỏi của level này
          // Vì TestAttempt chỉ có testId, chúng ta sẽ đếm dựa trên testId
          // và giả định rằng mỗi attempt sẽ làm tất cả câu hỏi trong test

          // Đếm số participants duy nhất đã làm test này (giả định họ làm tất cả levels)
          const participantsForLevel = await TestAttempt.distinct("userId", {
            testId: testId,
          });

          // Đếm tổng số attempts cho level này
          const attemptsForLevel = await TestAttempt.find(
            {
              testId: testId,
            },
            "attemptNumber"
          );

          const totalAttemptsForLevel = attemptsForLevel.reduce(
            (sum, attempt) => {
              return sum + (attempt.attemptNumber || 0);
            },
            0
          );

          return {
            level: levelGroup.level,
            totalQuestions: levelGroup.totalQuestions,
            totalParticipants: participantsForLevel.length,
            totalAttempts: totalAttemptsForLevel,
            // Tính phần trăm câu hỏi của level này so với tổng câu hỏi
            questionPercentage:
              questions.length > 0
                ? Math.round(
                    (levelGroup.totalQuestions / questions.length) * 100
                  )
                : 0,
          };
        } catch (error) {
          console.error(`Error processing level ${levelGroup.level}:`, error);
          return {
            level: levelGroup.level,
            totalQuestions: levelGroup.totalQuestions,
            totalParticipants: 0,
            totalAttempts: 0,
            questionPercentage: 0,
          };
        }
      })
    );

    // Sắp xếp theo level name
    return levelStatistics.sort((a, b) => a.level.localeCompare(b.level));
  } catch (error) {
    console.error(`Error getting level statistics for test ${testId}:`, error);
    return [];
  }
};

const getTestsByCreatorId = async (req, res) => {
  try {
    console.log("Getting tests by creatorId");
    // Lấy userId từ req.user (được gán bởi verifyToken middleware)
    const creatorId = req.user && req.user.userId;

    if (!creatorId) {
      // Trường hợp này không nên xảy ra nếu đã có verifyToken, nhưng vẫn kiểm tra
      return res
        .status(401)
        .json({ error: "User not authenticated or ID missing." });
    }

    const tests = await testModel.getTestsByCreatorId(creatorId);

    if (!tests || tests.length === 0) {
      return res
        .status(404)
        .json({ error: "No tests found created by this user." });
    }

    res.status(200).json({
      message: "Tests created by user retrieved successfully",
      data: tests,
      total: tests.length,
    });
  } catch (error) {
    console.error("Error getting tests by creatorId:", error);
    res.status(500).json({ error: "Failed to get tests created by user." });
  }
};

module.exports = {
  createTest,
  getTestById,
  getAllTests,
  updateTestById,
  deleteTestById,
  getTestsByCourseId,
  getTestStatistics,
  getTestsByCreatorId,
};
