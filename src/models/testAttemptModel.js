const TestAttempt = require("../schemas/TestAttempt");

const createAttempt = async (attemptData) => {
  try {
    const newAttempt = new TestAttempt(attemptData);
    return await newAttempt.save();
  } catch (error) {
    console.error("Error creating attempt:", error);
    throw new Error("Failed to create attempt");
  }
};

const findAttemptById = async (id) => {
  try {
    return await TestAttempt.findById(id).populate("testPoolId userId");
  } catch (error) {
    console.error("Error finding attempt by id:", error);
    throw new Error("Failed to find attempt by id");
  }
};

const findAttemptsByUser = async (userId) => {
  try {
    return await TestAttempt.find({ userId });
  } catch (error) {
    console.error("Error finding attempts by user:", error);
    throw new Error("Failed to find attempts by user");
  }
};

const updateAttemptById = async (id, updateData) => {
  try {
    return await TestAttempt.findByIdAndUpdate(id, updateData, { new: true });
  } catch (error) {
    console.error("Error updating attempt:", error);
    throw new Error("Failed to update attempt");
  }
};

const findAttemptByTestId = async (testPoolId, userId) => {
  const query = { testPoolId };
  if (userId) query.userId = userId;

  return await TestAttempt.findOne(query)
    .sort({ createdAt: -1 })
    .populate("testPoolId userId");
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

const findAttemptsByTestPool = async (testPoolId, userId = null) => {
  try {
    const filter = { testPoolId };
    if (userId) filter.userId = userId;

    const attempts = await TestAttempt.find(filter)
      .sort({ createdAt: -1 }) // mới nhất trước
      .populate("userId", "fullName email") // lấy thông tin user
      .populate("testPoolId", "level baseTestId"); // lấy thông tin test pool

    return attempts;
  } catch (error) {
    console.error("Error finding attempts by test pool:", error);
    throw new Error("Failed to find attempts by test pool");
  }
};

const findAttemptsByTestIdAndUser = async (testId, userId) => {
  try {
    const attempts = await TestAttempt.find({
      testId: testId,
      userId: userId,
    }).sort({ attemptNumber: 1 }); // sort theo lần attempt tăng dần

    return attempts;
  } catch (error) {
    console.error("Error finding attempts by testId and user:", error);
    throw new Error("Failed to find attempts by testId and user");
  }
};

const findCustomTestAttemptsByUser = async (userId) => {
  try {
    const attempts = await TestAttempt.find({
      userId,
      testPoolId: "000000000000000000000000",
    })
      .populate(
        "testId",
        "title skill topic description durationMin courseId createdBy numQuestions questionTypes examType passingScore maxAttempts isTheLastTest"
      ) // lấy thông tin test
      .lean();

    return attempts;
  } catch (error) {
    console.error("Error finding custom test attempts by user:", error);
    throw new Error("Failed to find custom test attempts by user");
  }
};

module.exports = {
  createAttempt,
  findAttemptById,
  findAttemptsByUser,
  findAttemptsByTestIdAndUser,
  updateAttemptById,
  findAttemptByTestId,
  findAttemptByUserAndPool,
  findAttemptsByTestPool,
  findCustomTestAttemptsByUser,
};
