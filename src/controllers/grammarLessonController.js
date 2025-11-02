const { request } = require("http");
const grammarLessonModal = require("../models/grammarLessonModel");

// Tạo bài học ngữ pháp mới
const createGrammarLesson = async (req, res) => {
  try {
    const createLesson = await grammarLessonModal.createLesson(req.body);
    res.status(201).json({
      message: "Grammar lesson created successfully",
      data: createLesson,
    });
  } catch (error) {
    console.error("Error creating grammar lesson:", error);
    res.status(500).json({ error: "Failed to create grammar lesson" });
  }
};

// Lấy tất cả bài học
const getAllGrammarLessons = async (req, res) => {
  try {
    const lessons = await grammarLessonModal.getAllLessons();
    res.status(200).json({
      message: "Grammar lessons retrieved successfully",
      data: lessons,
      total: lessons.length,
    });
  } catch (error) {
    console.error("Error getting grammar lessons:", error);
    res.status(500).json({ error: "Failed to get grammar lessons" });
  }
};

// Lấy bài học theo ID
const getGrammarLessonById = async (req, res) => {
  try {
    const { id } = req.params;
    const lesson = await grammarLessonModal.getLessonById(id);
    if (!lesson)
      return res.status(404).json({ error: "Grammar lesson not found" });
    res.status(200).json({ data: lesson });
  } catch (error) {
    console.error("Error getting grammar lesson:", error);
    res.status(500).json({ error: "Failed to get grammar lesson" });
  }
};

// Cập nhật bài học
const updateGrammarLessonById = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedLesson = await grammarLessonModal.updateLesson(id, req.body, {
      new: true,
    });
    if (!updatedLesson)
      return res.status(404).json({ error: "Grammar lesson not found" });
    res.status(200).json({
      message: "Grammar lesson updated successfully",
      data: updatedLesson,
    });
  } catch (error) {
    console.error("Error updating grammar lesson:", error);
    res.status(500).json({ error: "Failed to update grammar lesson" });
  }
};

// Xóa bài học
const deleteGrammarLessonById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedLesson = await grammarLessonModal.deleteLesson(id);
    if (!deletedLesson)
      return res.status(404).json({ error: "Grammar lesson not found" });
    res.status(200).json({
      message: "Grammar lesson deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting grammar lesson:", error);
    res.status(500).json({ error: "Failed to delete grammar lesson" });
  }
};

const getLessonsByCourseId = async (req, res) => {
  try {
    const { courseId } = req.params;
    const lessons = await grammarLessonModal.getLessonsByCourseId(courseId);
    res.status(200).json({
      message: "Grammar lessons retrieved successfully",
      data: lessons,
      total: lessons.length,
    });
  } catch (error) {
    console.error("Error getting lessons by courseId:", error);
    res.status(500).json({ error: "Failed to get lessons by courseId" });
  }
};

const getPartByIdController = async (req, res) => {
  try {
    const { partId } = req.params;
    const part = await grammarLessonModal.getPartById(partId);

    res.status(200).json({
      message: "Part retrieved successfully",
      data: part,
    });
  } catch (error) {
    console.error("Error fetching part:", error);
    res.status(500).json({ error: "Failed to fetch part" });
  }
};

module.exports = {
  createGrammarLesson,
  getAllGrammarLessons,
  getGrammarLessonById,
  updateGrammarLessonById,
  deleteGrammarLessonById,
  getLessonsByCourseId,
  getPartByIdController,
};
