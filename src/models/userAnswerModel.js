const UserAnswer = require("../schemas/userAnswer");

const createUserAnswer = async (answerData) => {
  try {
    const newAnswer = new UserAnswer(answerData);
    return await newAnswer.save();
  } catch (error) {
    console.error("Error creating user answer:", error);
    throw new Error("Failed to create user answer");
  }
};

const findAnswersByAttempt = async (attemptId) => {
  try {
    return await UserAnswer.find({ attemptId });
  } catch (error) {
    console.error("Error finding answers by attempt:", error);
    throw new Error("Failed to find answers by attempt");
  }
};

const updateUserAnswerById = async (id, updateData) => {
  try {
    return await UserAnswer.findByIdAndUpdate(id, updateData, { new: true });
  } catch (error) {
    console.error("Error updating user answer:", error);
    throw new Error("Failed to update user answer");
  }
};

const deleteUserAnswerById = async (id) => {
  try {
    return await UserAnswer.findByIdAndDelete(id);
  } catch (error) {
    console.error("Error deleting user answer:", error);
    throw new Error("Failed to delete user answer");
  }
};

module.exports = {
  createUserAnswer,
  findAnswersByAttempt,
  updateUserAnswerById,
  deleteUserAnswerById,
};
