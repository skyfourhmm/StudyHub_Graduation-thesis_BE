const mongoose = require("mongoose");
const TestPool = require("../schemas/TestPool");
const TestAttempt = require("../schemas/TestAttempt");

const createTestPool = async (poolData) => {
  try {
    const newPool = new TestPool(poolData);
    return await newPool.save();
  } catch (error) {
    console.error("Error creating test pool:", error);
    throw new Error("Failed to create test pool");
  }
};

const findTestPoolById = async (id) => {
  try {
    return await TestPool.findById(id).populate(
      "createdBy",
      "fullName email role currentLevel"
    );
  } catch (error) {
    console.error("Error finding test pool:", error);
    throw new Error("Failed to find test pool");
  }
};

const getAllTestPools = async (filter = {}) => {
  try {
    return await TestPool.find(filter).sort({ createdAt: -1 });
  } catch (error) {
    console.error("Error getting all test pools:", error);
    throw new Error("Failed to get test pools");
  }
};

const updateTestPoolById = async (id, updateData) => {
  try {
    return await TestPool.findByIdAndUpdate(id, updateData, { new: true });
  } catch (error) {
    console.error("Error updating test pool:", error);
    throw new Error("Failed to update test pool");
  }
};

const deleteTestPoolById = async (id) => {
  try {
    return await TestPool.findByIdAndDelete(id);
  } catch (error) {
    console.error("Error deleting test pool:", error);
    throw new Error("Failed to delete test pool");
  }
};

const getTestPoolsByLevel = async (level) => {
  try {
    return await TestPool.find({ level, status: "active" })
      .sort({ createdAt: -1 })
      .populate("createdBy", "fullName email role currentLevel");
  } catch (error) {
    console.error("Error getting test pools by level:", error);
    throw new Error("Failed to get test pools by level");
  }
};

const getPoolsByBaseTestId = async (testId) => {
  try {
    return await TestPool.find({ baseTestId: testId })
      .populate("createdBy", "fullName email role currentLevel")
      .sort({ createdAt: -1 });
  } catch (error) {
    console.error("Error getting pools by baseTestId:", error);
    throw new Error("Failed to get pools by baseTestId");
  }
};

const getTestPoolsByCreator = async (creatorId) => {
  try {
    return await TestPool.find({ createdBy: creatorId })
      .populate("createdBy", "fullName email role currentLevel")
      .sort({ createdAt: -1 });
  } catch (error) {
    console.error("Error getting test pools by creator:", error);
    throw new Error("Failed to get test pools by creator");
  }
};

const findTestPool = async (filter) => {
  try {
    if (filter.baseTestId && typeof filter.baseTestId === "string") {
      filter.baseTestId = new mongoose.Types.ObjectId(filter.baseTestId);
    }
    if (filter.createdBy && typeof filter.createdBy === "string") {
      filter.createdBy = new mongoose.Types.ObjectId(filter.createdBy);
    }

    return await TestPool.find(filter).populate(
      "createdBy",
      "fullName email role currentLevel"
    );
  } catch (error) {
    console.error("Error finding test pool:", error);
    throw new Error("Failed to find test pool");
  }
};

const findAttemptByUserAndPool = async (userId, testPoolId) => {
  try {
    return await TestAttempt.findOne({ userId, testPoolId }).populate(
      "testPoolId userId"
    );
  } catch (error) {
    console.error("Error finding attempt by user and pool:", error);
    throw new Error("Failed to find attempt by user and pool");
  }
};

const findTestPoolByBaseTestIdAndCreator = async (baseTestId, creatorId) => {
  try {
    // 1. Xây dựng bộ lọc với hai điều kiện
    const filter = {
      baseTestId: baseTestId,
      createdBy: creatorId,
      status: "active", // Tùy chọn: chỉ tìm các pool đang hoạt động
    };

    // 2. Thực hiện truy vấn và populate thông tin người tạo
    return await TestPool.find(filter)
      .populate("createdBy", "fullName email role currentLevel")
      .sort({ createdAt: -1 });
  } catch (error) {
    // Lỗi có thể là BSONError nếu ID không hợp lệ, nên cần xử lý
    console.error("Error finding test pool by baseTestId and creator:", error);
    throw new Error("Failed to find test pool by criteria");
  }
};

module.exports = {
  createTestPool,
  findTestPoolById,
  getAllTestPools,
  updateTestPoolById,
  deleteTestPoolById,
  getTestPoolsByLevel,
  getPoolsByBaseTestId,
  getTestPoolsByCreator,
  findTestPool,
  findAttemptByUserAndPool,
  findTestPoolByBaseTestIdAndCreator,
};
