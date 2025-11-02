const mongoose = require("mongoose");
const questionModel = require("../models/questionModel");
const testPoolModel = require("../models/testPoolModel");

// Create question (optionally with options array)
const createQuestion = async (req, res) => {
  try {
    const {
      testId,
      questionText,
      questionType,
      skill,
      topic,
      points,
      options,
      level,
    } = req.body;

    if (!testId || !questionText || !questionType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (
      questionType === "mcq" &&
      (!options || !Array.isArray(options) || options.length === 0)
    ) {
      return res.status(400).json({ error: "MCQ must include options" });
    }

    const createdBy = req.user ? req.user.userId : null;

    const newQuestion = await questionModel.createQuestion({
      testId,
      questionText,
      questionType,
      skill,
      topic,
      points,
      options,
      level,
      createdBy,
    });

    res.status(201).json({
      message: "Question created successfully",
      data: newQuestion,
    });
  } catch (error) {
    console.error("Error creating question:", error.message);
    res.status(400).json({ error: error.message });
  }
};

const createManyQuestions = async (req, res) => {
  try {
    let { questions, createdBy, testAttemptId, exam_type, score_range } =
      req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Questions array is required" });
    }

    const level = {};
    if (exam_type && score_range) {
      if (exam_type.toUpperCase() === "TOEIC") level.TOEIC = score_range;
      else if (exam_type.toUpperCase() === "IELTS") level.IELTS = score_range;
    }

    // Validate nhanh gọn
    questions = questions.map((q) => {
      if (!q.testId || !q.questionText || !q.questionType) {
        throw new Error("Missing required fields in some questions");
      }
      if (q.questionType && (!q.options || q.options.length === 0)) {
        throw new Error("MCQ must include options");
      }
      return { ...q, createdBy, attemptId: testAttemptId || null, level };
    });

    // Lưu vào DB (nếu questionModel là mongoose model thì dùng insertMany)
    const newQuestions = await questionModel.createManyQuestions(questions);

    res.status(201).json({
      message: `${newQuestions.length} questions created successfully`,
      data: newQuestions,
    });
  } catch (error) {
    console.error("Error creating questions:", error);
    res.status(500).json({ error: "Failed to create questions" });
  }
};

const getQuestionsByTest = async (req, res) => {
  try {
    const { testId } = req.params;
    if (!testId) return res.status(400).json({ error: "Test ID not found" });

    const questions = await questionModel.findQuestionsByTest(testId);

    res.status(200).json({
      message: "Questions retrieved",
      data: questions,
      total: questions.length,
    });
  } catch (error) {
    console.error("Error getting questions:", error);
    res.status(500).json({ error: "Failed to get questions" });
  }
};

const getQuestionById = async (req, res) => {
  try {
    const { questionId } = req.params;
    if (!questionId)
      return res.status(400).json({ error: "Question ID not found" });

    const question = await questionModel.findQuestionById(questionId);
    if (!question) return res.status(404).json({ error: "Question not found" });

    res.status(200).json({
      message: "Question retrieved successfully",
      data: question,
    });
  } catch (error) {
    console.error("Error getting question by ID:", error);
    res.status(500).json({ error: "Failed to get question" });
  }
};

const updateQuestionById = async (req, res) => {
  try {
    const { questionId } = req.params;
    const updateData = req.body;
    if (!questionId)
      return res.status(400).json({ error: "Question ID not found" });

    const updated = await questionModel.updateQuestionById(
      questionId,
      updateData
    );
    if (!updated) return res.status(404).json({ error: "Question not found" });

    res.status(200).json({ message: "Question updated", data: updated });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ error: "Failed to update question" });
  }
};

const deleteQuestionById = async (req, res) => {
  try {
    const { questionId } = req.params;
    if (!questionId)
      return res.status(400).json({ error: "Question ID not found" });

    const deleted = await questionModel.deleteQuestionById(questionId);
    if (!deleted) return res.status(404).json({ error: "Question not found" });

    res.status(200).json({ message: "Question deleted", data: deleted });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ error: "Failed to delete question" });
  }
};

const getQuestionsByTestLevelAndCreator = async (req, res) => {
  try {
    const { testId, exam_type, score_range, createdBy } = req.body;

    if (!testId) {
      return res.status(400).json({ error: "Test ID is required" });
    }

    // 1. TÌM TEST POOL DỰA TRÊN baseTestId VÀ createdBy (Nếu createdBy được cung cấp)
    let testPoolId = null;

    // Xác thực ID trước khi tìm kiếm để tránh lỗi BSONError
    const isValidTestId = mongoose.Types.ObjectId.isValid(testId);
    const isValidCreatorId =
      createdBy && mongoose.Types.ObjectId.isValid(createdBy);

    if (isValidCreatorId && isValidTestId) {
      // Sử dụng hàm model mới
      const pools = await testPoolModel.findTestPoolByBaseTestIdAndCreator(
        testId, // baseTestId
        createdBy // creatorId
      );

      // Lấy pool đầu tiên nếu có
      if (pools && pools.length > 0) {
        testPoolId = pools[0]._id;
      }
    }

    // 🎯 Tạo điều kiện lọc động
    const filter = { testId };

    // Nếu có exam_type + score_range thì lọc theo level tương ứng
    if (exam_type && score_range) {
      if (exam_type.toUpperCase() === "TOEIC")
        filter["level.TOEIC"] = score_range;
      else if (exam_type.toUpperCase() === "IELTS")
        filter["level.IELTS"] = score_range;
      else filter[`level.${exam_type}`] = score_range;
    }

    // Nếu có người tạo thì thêm vào filter
    if (createdBy) filter.createdBy = createdBy;

    const questions = await questionModel.findQuestionsByTestLevelAndCreator(
      filter
    );

    if (!questions || questions.length === 0) {
      return res.status(404).json({ message: "No questions found" });
    }

    res.status(200).json({
      message: "Questions retrieved successfully",
      total: questions.length,
      testPoolId: testPoolId,
      data: questions,
    });
  } catch (error) {
    console.error(
      "❌ Error getting questions by test, level, and creator:",
      error
    );
    res.status(500).json({ error: "Failed to get questions" });
  }
};

const getQuestionsByAttemptId = async (req, res) => {
  try {
    const { attemptId } = req.params;

    if (!attemptId) {
      return res.status(400).json({ error: "attemptId is required" });
    }

    // Tìm tất cả câu hỏi thuộc về attemptId
    const questions = await questionModel.findQuestionsByAttemptId(attemptId);

    if (!questions.length) {
      return res
        .status(404)
        .json({ message: "No questions found for this attempt" });
    }

    res.status(200).json({
      message: `Found ${questions.length} questions for attempt ${attemptId}`,
      data: questions,
    });
  } catch (error) {
    console.error("Error fetching questions by attemptId:", error);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
};

module.exports = {
  createQuestion,
  createManyQuestions,
  getQuestionsByTest,
  updateQuestionById,
  deleteQuestionById,
  getQuestionById,
  getQuestionsByTestLevelAndCreator,
  getQuestionsByAttemptId,
};
