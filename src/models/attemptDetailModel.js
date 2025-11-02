const AttemptDetail = require("../schemas/attemptDetail");
const TestAttempt = require("../schemas/TestAttempt");

// Tạo mới bản ghi AttemptDetail
const createAttemptDetail = async (data) => {
  try {
    const newAttemptDetail = new AttemptDetail(data);
    const saved = await newAttemptDetail.save();
    return saved;
  } catch (error) {
    console.error("Error creating AttemptDetail:", error);
    throw new Error("Failed to create AttemptDetail");
  }
};

// Lấy AttemptDetail theo attemptId
const getAttemptDetailByAttemptId = async (attemptId) => {
  try {
    return await AttemptDetail.findOne(attemptId)
      .populate("attemptId")
      .populate("answers.questionId");
  } catch (error) {
    console.error("Error getting AttemptDetail by attemptId:", error);
    throw new Error("Failed to get AttemptDetail by attemptId");
  }
};

// Cập nhật AttemptDetail theo attemptId
const updateAttemptDetailByAttemptId = async (attemptId, updateData) => {
  try {
    return await AttemptDetail.findOneAndUpdate({ attemptId }, updateData, {
      new: true,
    });
  } catch (error) {
    console.error("Error updating AttemptDetail:", error);
    throw new Error("Failed to update AttemptDetail");
  }
};

// Xoá AttemptDetail theo attemptId
const deleteAttemptDetailByAttemptId = async (attemptId) => {
  try {
    return await AttemptDetail.findOneAndDelete({ attemptId });
  } catch (error) {
    console.error("Error deleting AttemptDetail:", error);
    throw new Error("Failed to delete AttemptDetail");
  }
};

// Lấy toàn bộ AttemptDetail (chủ yếu dùng admin)
const getAllAttemptDetails = async () => {
  try {
    return await AttemptDetail.find().populate(
      "attemptId",
      "userId testId createdAt"
    );
  } catch (error) {
    console.error("Error getting all AttemptDetails:", error);
    throw new Error("Failed to get all AttemptDetails");
  }
};

const findAnswersByAttempt = async (attemptId) => {
  try {
    const attemptDetail = await AttemptDetail.findOne({ attemptId }).lean();
    return attemptDetail ? attemptDetail.answers : [];
  } catch (error) {
    console.error("Error finding answers by attempt:", error);
    throw new Error("Failed to find answers by attempt");
  }
};

const getAttemptDetailByUserAndTest = async (userId, testId) => {
  try {
    // Bước 1: Tìm attempt tương ứng
    const testAttempt = await TestAttempt.findOne({ userId, testId });

    if (!testAttempt) return null;

    // Bước 2: Tìm tất cả attempt detail của attempt đó
    const attemptDetails = await AttemptDetail.find({
      attemptId: testAttempt._id,
    })
      .populate({
        path: "attemptId",
        populate: { path: "testId userId", select: "fullName email title" },
      })
      .populate("answers.questionId")
      .sort({ attemptNumber: -1 }); // sắp xếp giảm dần (mới nhất trước)

    return attemptDetails;
  } catch (error) {
    console.error("Error getting attempt detail:", error);
    throw error;
  }
};

const getAllAttemptDetailsByUserId = async (userId) => {
  try {
    // Lấy tất cả các attempt của user này
    const attempts = await TestAttempt.find({ userId })
      .populate({
        path: "testPoolId",
        populate: {
          path: "baseTestId",
          model: "Test",
          select: "title skill level examType durationMin",
        },
      })
      .lean();

    if (!attempts.length) {
      return res
        .status(404)
        .json({ message: "No attempts found for this user" });
    }

    // Lấy danh sách attemptId
    const attemptIds = attempts.map((a) => a._id);

    // Lấy tất cả attempt details tương ứng
    const attemptDetails = await AttemptDetail.find({
      attemptId: { $in: attemptIds },
    })
      .populate({
        path: "answers.questionId",
        model: "Question",
        select: "questionText options points skill topic",
      })
      .lean();

    // Ghép dữ liệu attempt + detail
    const mergedData = attemptDetails.map((detail) => {
      const relatedAttempt = attempts.find(
        (a) => a._id.toString() === detail.attemptId.toString()
      );

      console.log(detail);

      return {
        attemptId: detail.attemptId,
        testTitle: relatedAttempt?.testPoolId?.baseTestId?.title,
        skill: relatedAttempt?.testPoolId?.baseTestId?.skill,
        level: relatedAttempt?.testPoolId?.baseTestId?.level,
        examType: relatedAttempt?.testPoolId?.baseTestId?.examType,
        durationMin: relatedAttempt?.testPoolId?.baseTestId?.durationMin,
        startTime: detail?.startTime,
        endTime: detail?.endTime,
        // answers: detail.answers.map((a) => ({
        //   questionId: a.questionId?._id,
        //   questionText: a.questionText || a.questionId?.questionText,
        //   selectedOptionText: a.selectedOptionText,
        //   isCorrect: a.isCorrect,
        //   score: a.score,
        // })),
        analysisResult: detail.analysisResult || {},
      };
    });

    return mergedData;
  } catch (error) {
    console.error("Error fetching attempt details:", error);
    res.status(500).json({
      message: "Error fetching attempt details",
      error: error.message,
    });
  }
};

module.exports = {
  createAttemptDetail,
  getAttemptDetailByAttemptId,
  updateAttemptDetailByAttemptId,
  deleteAttemptDetailByAttemptId,
  getAllAttemptDetails,
  findAnswersByAttempt,
  getAttemptDetailByUserAndTest,
  getAllAttemptDetailsByUserId,
};
