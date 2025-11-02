const attemptDetailModel = require("../models/attemptDetailModel");

const TestAttempt = require("../schemas/TestAttempt");
const AttemptDetail = require("../schemas/attemptDetail");

const createAttemptDetail = async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.attemptId) {
      return res.status(400).json({ error: "attemptId is required" });
    }

    const created = await attemptDetailModel.createAttemptDetail({
      ...data,
      startTime: data.startTime || new Date(),
    });
    res.status(201).json({
      message: "AttemptDetail created successfully",
      data: created,
    });
  } catch (error) {
    console.error("Error creating AttemptDetail:", error);
    res.status(500).json({ error: "Failed to create AttemptDetail" });
  }
};

const getAttemptDetailByAttemptId = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const detail = await attemptDetailModel.getAttemptDetailByAttemptId(
      attemptId
    );

    if (!detail)
      return res.status(404).json({ error: "AttemptDetail not found" });

    res.status(200).json({
      message: "AttemptDetail retrieved successfully",
      data: detail,
    });
  } catch (error) {
    console.error("Error getting AttemptDetail by attemptId:", error);
    res.status(500).json({ error: "Failed to get AttemptDetail" });
  }
};

const updateAttemptDetailByAttemptId = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const updateData = req.body;

    const updated = await attemptDetailModel.updateAttemptDetailByAttemptId(
      attemptId,
      updateData
    );

    if (!updated)
      return res.status(404).json({ error: "AttemptDetail not found" });

    res.status(200).json({
      message: "AttemptDetail updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating AttemptDetail:", error);
    res.status(500).json({ error: "Failed to update AttemptDetail" });
  }
};

const deleteAttemptDetailByAttemptId = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const deleted = await attemptDetailModel.deleteAttemptDetailByAttemptId(
      attemptId
    );

    if (!deleted)
      return res.status(404).json({ error: "AttemptDetail not found" });

    res.status(200).json({
      message: "AttemptDetail deleted successfully",
      data: deleted,
    });
  } catch (error) {
    console.error("Error deleting AttemptDetail:", error);
    res.status(500).json({ error: "Failed to delete AttemptDetail" });
  }
};

const getAllAttemptDetails = async (req, res) => {
  try {
    const list = await attemptDetailModel.getAllAttemptDetails();
    res.status(200).json({
      message: "AttemptDetails retrieved successfully",
      total: list.length,
      data: list,
    });
  } catch (error) {
    console.error("Error getting all AttemptDetails:", error);
    res.status(500).json({ error: "Failed to get AttemptDetails" });
  }
};

const getUserTestDetailsGroupedByTest = async (req, res) => {
  try {
    const userId = req.user?.userId || req.params.userId;

    // 1️⃣ Lấy tất cả các attempt của user (liên kết sang Test)
    const attempts = await TestAttempt.find({ userId })
      .populate({
        path: "testPoolId",
        populate: {
          path: "baseTestId",
          model: "Test",
          select: "title skill level examType durationMin",
        },
      })
      .sort({ createdAt: -1 });

    if (!attempts.length) {
      return res.status(200).json({
        message: "User has no attempts yet",
        data: [],
      });
    }

    // 2️⃣ Lấy toàn bộ AttemptDetail của user theo danh sách attemptId
    const attemptIds = attempts.map((a) => a._id);
    const attemptDetails = await AttemptDetail.find({
      attemptId: { $in: attemptIds },
    });

    // 3️⃣ Gom nhóm theo Test
    const groupedByTest = {};

    for (const attempt of attempts) {
      const testInfo = attempt.testPoolId?.baseTestId;
      if (!testInfo) continue;

      const testId = testInfo._id.toString();

      if (!groupedByTest[testId]) {
        groupedByTest[testId] = {
          testId,
          title: testInfo.title,
          skill: testInfo.skill,
          level: testInfo.level,
          examType: testInfo.examType,
          durationMin: testInfo.durationMin,
          attempts: [],
        };
      }

      // 🔍 Lấy toàn bộ AttemptDetail tương ứng với attempt này
      const details = attemptDetails.find(
        (d) => d.attemptId.toString() === attempt._id.toString()
      );

      // Đưa toàn bộ object AttemptDetail vào
      groupedByTest[testId].attempts.push({
        attemptId: attempt._id,
        attemptNumber: attempt.attemptNumber,
        startTime: attempt.startTime,
        endTime: attempt.endTime,
        score: attempt.score,
        totalScore: details?.totalScore || 0,
        submittedAt: details?.submittedAt,
        answers: details?.answers || [],
        analysisResult: details?.analysisResult || {}, // ⚡ Thêm luôn phân tích AI
      });
    }

    res.status(200).json({
      message: "Fetched all test details grouped by test successfully",
      data: Object.values(groupedByTest),
    });
  } catch (error) {
    console.error("Error fetching test details:", error);
    res.status(500).json({
      message: "Failed to get test details for user",
      error: error.message,
    });
  }
};

const getAllAttemptDetailsByUserId = async (req, res) => {
  try {
    const userId = req.user?.userId || req.params.userId; // lấy từ JWT hoặc params

    console.log("Fetching attempt details for userId:", userId);

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

    res.status(200).json({
      message: "Fetched all attempt details successfully",
      data: mergedData,
    });
  } catch (error) {
    console.error("Error fetching attempt details:", error);
    res.status(500).json({
      message: "Error fetching attempt details",
      error: error.message,
    });
  }
};

const getAnswersByAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    if (!attemptId)
      return res.status(400).json({ error: "Attempt ID not found" });

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

const getAttemptDetailByUserAndTest = async (req, res) => {
  const { userId, testId } = req.params;
  try {
    const detail = await attemptDetailModel.getAttemptDetailByUserAndTest(
      userId,
      testId
    );

    console.log("detail:", detail);

    if (!detail) {
      return res
        .status(404)
        .json({ message: "No attempt found for this user and test" });
    }

    res.status(200).json({
      message: "Attempt detail retrieved",
      data: detail,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  createAttemptDetail,
  getAttemptDetailByAttemptId,
  updateAttemptDetailByAttemptId,
  getAnswersByAttempt,
  deleteAttemptDetailByAttemptId,
  getAllAttemptDetails,
  getAllAttemptDetailsByUserId,
  getAttemptDetailByUserAndTest,
};
