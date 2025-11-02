const Question = require("../schemas/question");

const createQuestion = async (questionData) => {
  try {
    const newQ = new Question(questionData);
    return await newQ.save();
  } catch (error) {
    console.error("Error creating question:", error);
    throw new Error("Failed to create question");
  }
};

const createManyQuestions = async (questionsData) => {
  try {
    return await Question.insertMany(questionsData);
  } catch (error) {
    console.error("Error creating multiple questions:", error);
    throw new Error("Failed to create multiple questions");
  }
};

const findQuestionById = async (id) => {
  try {
    return await Question.findById(id);
  } catch (error) {
    console.error("Error finding question by id:", error);
    throw new Error("Failed to find question by id");
  }
};

const findQuestionsByIds = async (ids) => {
  try {
    return await Question.find({ _id: { $in: ids } }).lean(); // lean() trả về mảng thuần
  } catch (error) {
    console.error("Error finding questions by ids:", error);
    throw new Error("Failed to find questions by ids");
  }
};

const findQuestionsByTest = async (testId) => {
  try {
    return await Question.find({ testId }).sort({ createdAt: 1 });
  } catch (error) {
    console.error("Error finding questions by test:", error);
    throw new Error("Failed to find questions by test");
  }
};

const updateQuestionById = async (id, updateData) => {
  try {
    return await Question.findByIdAndUpdate(id, updateData, { new: true });
  } catch (error) {
    console.error("Error updating question:", error);
    throw new Error("Failed to update question");
  }
};

const deleteQuestionById = async (id) => {
  try {
    return await Question.findByIdAndDelete(id);
  } catch (error) {
    console.error("Error deleting question:", error);
    throw new Error("Failed to delete question");
  }
};

const findQuestionsByTestLevelAndCreator = async (filter) => {
  try {
    return await Question.find(filter).sort({ createdAt: 1 });
  } catch (error) {
    console.error(
      "Error finding questions by test, level, and creator:",
      error
    );
    throw new Error("Failed to find questions by test, level, and creator");
  }
};

const findQuestionsByAttemptId = async (attemptId) => {
  try {
    return await Question.find({ attemptId })
      .populate("testId", "title examType") // optional: lấy thêm thông tin Test
      .populate("createdBy", "name email") // optional: lấy thông tin người tạo
      .sort({ createdAt: 1 });
  } catch (error) {
    console.error("Error finding questions by attemptId:", error);
    throw new Error("Failed to find questions by attemptId");
  }
};

module.exports = {
  createQuestion,
  createManyQuestions,
  findQuestionById,
  findQuestionsByTest,
  updateQuestionById,
  deleteQuestionById,
  findQuestionsByIds,
  findQuestionsByTestLevelAndCreator,
  findQuestionsByAttemptId,
};
