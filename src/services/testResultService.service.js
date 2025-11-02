const TestAttempt = require("../models/testAttemptModel");
const UserAnswer = require("../models/userAnswerModel");
const Question = require("../models/questionModel");
const AnswerOption = require("../models/answerOptionModel");

/**
 * Lưu kết quả làm bài của user
 * @param {String} attemptId - id của TestAttempt
 * @param {Array} answers - danh sách câu trả lời
 *   Ví dụ:
 *   [
 *     { questionId: "q1", selectedOptionId: "opt1" },
 *     { questionId: "q2", answerText: "My essay here..." }
 *   ]
 */
async function saveUserAnswers(attemptId, answers) {
  const savedAnswers = [];

  for (const ans of answers) {
    const question = await Question.findById(ans.questionId);
    if (!question) continue;

    let isCorrect = false;
    let score = 0;

    // Nếu là MCQ → check với AnswerOption
    if (question.questionType === "mcq" && ans.selectedOptionId) {
      const option = await AnswerOption.findById(ans.selectedOptionId);
      if (option && option.isCorrect) {
        isCorrect = true;
        score = question.points;
      }
    }

    // Nếu là essay/speaking → chấm sau (AI/manual), tạm cho 0 điểm
    if (
      ["essay", "speaking"].includes(question.questionType) &&
      ans.answerText
    ) {
      isCorrect = null; // chưa xác định
      score = 0;
    }

    const userAnswer = await UserAnswer.create({
      attemptId,
      questionId: ans.questionId,
      selectedOptionId: ans.selectedOptionId,
      answerText: ans.answerText,
      isCorrect,
      score,
    });

    savedAnswers.push(userAnswer);
  }

  // Cập nhật tổng điểm cho bài attempt
  const totalScore = savedAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
  await TestAttempt.findByIdAndUpdate(attemptId, { score: totalScore });

  return savedAnswers;
}

module.exports = {
  saveUserAnswers,
};
