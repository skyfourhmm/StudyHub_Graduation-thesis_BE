const Test = require("../schemas/Test");

const createTest = async (testData) => {
  try {
    const newTest = new Test(testData);
    const savedTest = await newTest.save();
    return savedTest;
  } catch (error) {
    console.error("Error creating test:", error);
    throw new Error("Failed to create test");
  }
};

const findTestById = async (id) => {
  try {
    return await Test.findById(id);
  } catch (error) {
    console.error("Error finding test by id:", error);
    throw new Error("Failed to find test by id");
  }
};

const getAllTests = async (filter = {}) => {
  try {
    return await Test.find(filter).sort({ createdAt: -1 });
  } catch (error) {
    console.error("Error getting all tests:", error);
    throw new Error("Failed to get all tests");
  }
};

const getTestsByCourseId = async (courseId) => {
  try {
    return await Test.find({ courseId }).sort({ createdAt: -1 });
  } catch (error) {
    console.error("Error getting tests by courseId:", error);
    throw new Error("Failed to get tests by courseId");
  }
};

const updateTestById = async (id, updateData) => {
  try {
    return await Test.findByIdAndUpdate(id, updateData, { new: true });
  } catch (error) {
    console.error("Error updating test:", error);
    throw new Error("Failed to update test");
  }
};

const deleteTestById = async (id) => {
  try {
    return await Test.findByIdAndDelete(id);
  } catch (error) {
    console.error("Error deleting test:", error);
    throw new Error("Failed to delete test");
  }
};

const getTestsByCreatorId = async (creatorId) => {
  try {
    // Tìm tất cả các bài test có trường createdBy khớp với creatorId
    return await Test.find({ createdBy: creatorId }).sort({ createdAt: -1 });
  } catch (error) {
    console.error("Error getting tests by creatorId:", error);
    throw new Error("Failed to get tests by creatorId");
  }
};

module.exports = {
  createTest,
  findTestById,
  getAllTests,
  updateTestById,
  deleteTestById,
  getTestsByCourseId,
  getTestsByCreatorId,
};
