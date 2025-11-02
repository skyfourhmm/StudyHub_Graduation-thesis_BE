const userAnswerModel = require("../models/userAnswerModel");
const questionModel = require("../models/questionModel");
const attemptDetailModel = require("../models/attemptDetailModel");

const submitAnswer = async (req, res) => {
  try {
    const {
      attemptId,
      questionId,
      selectedOptionId,
      answerText,
      answerLetter,
    } = req.body;

    // 1. Validate input
    if (!attemptId || !questionId) {
      return res
        .status(400)
        .json({ error: "attemptId and questionId are required" });
    }

    // 2. Lấy câu hỏi
    const question = await questionModel.findQuestionById(questionId);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // 3. Xác định option được chọn
    let selectedOption = null;

    // Ưu tiên selectedOptionId
    if (selectedOptionId) {
      selectedOption = question.options.find(
        (opt) => opt._id.toString() === selectedOptionId
      );
    }

    // Nếu chưa có, check theo answerLetter (A, B, C, D...)
    if (!selectedOption && answerLetter) {
      selectedOption = question.options.find(
        (opt, idx) =>
          opt.label?.toUpperCase() === answerLetter.toUpperCase() ||
          String.fromCharCode(65 + idx) === answerLetter.toUpperCase()
      );
    }

    // 4. Chấm điểm
    let isCorrect = false;
    let score = 0;

    if (question.questionType === "mcq") {
      if (selectedOption) {
        isCorrect = selectedOption.isCorrect === true;
        score = isCorrect ? question.points || 1 : 0;
      }
    } else if (question.questionType === "short_answer") {
      if (answerText) {
        const correctOption = question.options.find((opt) => opt.isCorrect);
        if (correctOption) {
          isCorrect =
            answerText.trim().toLowerCase() ===
            correctOption.optionText.trim().toLowerCase();
          score = isCorrect ? question.points || 1 : 0;
        }
      }
    } else {
      // essay, writing... chưa tự động chấm
      isCorrect = undefined;
      score = 0;
    }

    // 5. Lưu UserAnswer
    const ua = await userAnswerModel.createUserAnswer({
      attemptId,
      questionId,
      selectedOptionId: selectedOption?._id,
      selectedOptionText: selectedOption?.optionText,
      answerText,
      isCorrect,
      score,
    });

    return res.status(201).json({
      message: "Answer submitted successfully",
      data: ua,
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    return res.status(500).json({ error: "Failed to submit answer" });
  }
};

const submitManyAnswers = async (req, res) => {
  try {
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "Answers array is required" });
    }

    const results = [];

    for (const ans of answers) {
      const {
        attemptId,
        questionId,
        selectedOptionId,
        answerText,
        answerLetter,
      } = ans;

      if (!attemptId || !questionId) {
        return res
          .status(400)
          .json({ error: "Each answer must include attemptId and questionId" });
      }

      // 1. Lấy câu hỏi
      const question = await questionModel.findQuestionById(questionId);
      if (!question) {
        return res
          .status(404)
          .json({ error: `Question ${questionId} not found` });
      }

      // 2. Xác định option được chọn
      let selectedOption = null;

      if (selectedOptionId) {
        selectedOption = question.options.find(
          (opt) => opt._id.toString() === selectedOptionId
        );
      }

      if (!selectedOption && answerLetter) {
        selectedOption = question.options.find(
          (opt, idx) =>
            opt.label?.toUpperCase() === answerLetter.toUpperCase() ||
            String.fromCharCode(65 + idx) === answerLetter.toUpperCase()
        );
      }

      // 3. Chấm điểm
      let isCorrect = false;
      let score = 0;

      if (question.questionType === "mcq") {
        if (selectedOption) {
          isCorrect = selectedOption.isCorrect === true;
          score = isCorrect ? question.points || 1 : 0;
        }
      } else if (question.questionType === "short_answer") {
        if (answerText) {
          const correctOption = question.options.find((opt) => opt.isCorrect);
          if (correctOption) {
            isCorrect =
              answerText.trim().toLowerCase() ===
              correctOption.optionText.trim().toLowerCase();
            score = isCorrect ? question.points || 1 : 0;
          }
        }
      } else {
        isCorrect = undefined;
        score = 0;
      }

      // 4. Lưu UserAnswer
      const ua = await userAnswerModel.createUserAnswer({
        attemptId,
        questionId,
        selectedOptionId: selectedOption?._id,
        selectedOptionText: selectedOption?.optionText,
        answerText,
        isCorrect,
        score,
      });

      results.push(ua);
    }

    return res.status(201).json({
      message: `${results.length} answers submitted successfully`,
      data: results,
    });
  } catch (error) {
    console.error("Error submitting multiple answers:", error);
    return res.status(500).json({ error: "Failed to submit multiple answers" });
  }
};

const getAnswersByAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    if (!attemptId)
      return res.status(400).json({ error: "Attempt ID not found" });

    // const answers = await userAnswerModel.findAnswersByAttempt(attemptId);
    const answers = await attemptDetailModel.findAnswersByAttempt(attemptId);
    res.status(200).json({
      message: "Answers retrieved",
      data: answers,
      total: answers.length,
    });
  } catch (error) {
    console.error("Error getting answers by attempt:", error);
    res.status(500).json({ error: "Failed to get answers" });
  }
};

const updateUserAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await userAnswerModel.updateUserAnswerById(id, req.body);
    if (!updated) return res.status(404).json({ error: "Answer not found" });
    res.status(200).json({ message: "Answer updated", data: updated });
  } catch (error) {
    console.error("Error updating answer:", error);
    res.status(500).json({ error: "Failed to update answer" });
  }
};

const deleteUserAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await userAnswerModel.deleteUserAnswerById(id);
    if (!deleted) return res.status(404).json({ error: "Answer not found" });
    res.status(200).json({ message: "Answer deleted" });
  } catch (error) {
    console.error("Error deleting answer:", error);
    res.status(500).json({ error: "Failed to delete answer" });
  }
};

module.exports = {
  submitAnswer,
  getAnswersByAttempt,
  updateUserAnswer,
  deleteUserAnswer,
  submitManyAnswers,
};
