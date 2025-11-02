const GrammarLesson = require("../schemas/GrammarLesson");

// Chỉ nhận vào dữ liệu và trả về promise
const createLesson = async (lessonData) => {
  // Xử lý logic nghiệp vụ trong model
  const existingLesson = await GrammarLesson.findOne({ lessonData });
  if (existingLesson) {
    // Ném lỗi để controller có thể bắt và xử lý
    throw new Error("A lesson with this slug already exists.");
  }

  // Tương tác với DB và trả về kết quả
  return GrammarLesson.create(lessonData);
};

const getAllLessons = async () => {
  return GrammarLesson.find({})
    .select("-parts.content")
    .sort({ createdAt: -1 });
};

const getLessonById = async (id) => {
  return GrammarLesson.findOne({ _id: id });
};

const updateLesson = async (id, updateData) => {
  return GrammarLesson.findOneAndUpdate({ _id: id }, updateData, {
    new: true,
    runValidators: true,
  });
};

const deleteLesson = async (slug) => {
  return GrammarLesson.findOneAndDelete({ slug });
};

const getLessonsByCourseId = async (courseId) => {
  try {
    const lessons = await GrammarLesson.find({ courseId })
      .select("-parts.content")
      .populate("exercises", "title description") // nếu bạn muốn lấy thông tin bài tập liên kết
      .lean(); // trả về object thuần (tăng tốc)
    return lessons;
  } catch (error) {
    console.error("Error getting lessons by courseId:", error);
    throw new Error("Failed to get lessons by courseId");
  }
};

const getPartById = async (partId) => {
  try {
    // Tìm lesson chứa part này
    const lesson = await GrammarLesson.findOne(
      { "parts._id": partId },
      { "parts.$": 1 } // chỉ lấy phần tử part khớp ID
    ).lean();

    if (!lesson || !lesson.parts || lesson.parts.length === 0) {
      throw new Error("Part not found");
    }

    // Trả về part cụ thể
    return lesson.parts[0];
  } catch (error) {
    console.error("Error getting part by id:", error);
    throw new Error("Failed to get part by id");
  }
};

module.exports = {
  createLesson,
  getAllLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
  getLessonsByCourseId,
  getPartById,
};
