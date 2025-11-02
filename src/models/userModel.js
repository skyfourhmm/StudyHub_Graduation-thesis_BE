const User = require("../schemas/User.js");

const createUser = async (userData) => {
  try {
    const newUser = new User(userData);
    const savedUser = await newUser.save();
    return savedUser;
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("Failed to create user");
  }
};

const findUserById = async (id) => {
  try {
    const user = await User.findById(id);
    return user;
  } catch (error) {
    console.error("Error finding user by id:", error);
    throw new Error("Failed to find user by id");
  }
};

const findUserByWalletAddress = async (walletAddress) => {
  try {
    const user = await User.findOne({ walletAddress });
    return user;
  } catch (error) {
    console.error("Error finding user by wallet address:", error);
    throw new Error("Failed to find user by wallet address");
  }
};

const findUserByEmail = async (email) => {
  try {
    const user = await User.findOne({ email });
    return user;
  } catch (error) {
    console.error("Error finding user by email:", error);
    throw new Error("Failed to find user by email");
  }
};

const updateUserById = async (id, updateData) => {
  try {
    const user = await User.findByIdAndUpdate(id, updateData, { new: true });
    return user;
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error("Failed to update user");
  }
};

const getAllUsers = async () => {
  try {
    const users = await User.find();
    return users;
  } catch (error) {
    console.error("Error getting all users:", error);
    throw new Error("Failed to get all users");
  }
};

const getMyCourses = async (userId) => {
  try {
    const course = await User.findById(userId)
      .populate({
        path: "courses",
        select:
          "title description teacherId courseType courseLevel thumbnailUrl category tags cost durationHours reviews grammarLessons",
      })
      .lean();
    return course;
  } catch (error) {
    console.error("Error getting user's courses:", error);
  }
};

module.exports = {
  createUser,
  findUserById,
  findUserByWalletAddress,
  findUserByEmail,
  updateUserById,
  getAllUsers,
  getMyCourses,
};
