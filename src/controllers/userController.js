const userModel = require("../models/userModel");

const createUser = async (req, res) => {
  try {
    const userData = req.body;
    if (!userData) {
      return res.status(404).json({ error: "User data not found" });
    }

    const savedUser = await userModel.createUser(userData);
    if (savedUser)
      res.status(201).json({
        message: "User created successfully!",
        user: savedUser,
      });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(404).json({ error: "User Id not found" });
    }

    const user = await userModel.findUserById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userProfile = user.toObject();
    delete userProfile.password;
    delete userProfile.__v;

    res.status(200).json({
      message: "User profile retrieved successfully",
      data: userProfile,
    });
  } catch (error) {
    console.error("Error getting user by id:", error);
    res.status(500).json({ error: "Failed to get user by id" });
  }
};

const getUserByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    if (!phone) {
      return res.status(404).json({ error: "Phone not found" });
    }

    const user = await userModel.findUserByPhone(phone);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userProfile = user.toObject();
    delete userProfile.password;
    delete userProfile.__v;

    res.status(200).json({
      message: "User profile retrieved successfully",
      data: userProfile,
    });
  } catch (error) {
    console.error("Error getting user by phone:", error);
    res.status(500).json({ error: "Failed to get user by phone" });
  }
};

const getUserByWalletAddress = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    if (!walletAddress) {
      return res.status(404).json({ error: "Wallet address not found" });
    }

    const user = await userModel.findUserByWalletAddress(walletAddress);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userProfile = user.toObject();
    delete userProfile.password;
    delete userProfile.__v;

    res.status(200).json({
      message: "User profile retrieved successfully",
      data: userProfile,
    });
  } catch (error) {
    console.error("Error getting user by wallet address:", error);
    res.status(500).json({ error: "Failed to get user by wallet address" });
  }
};

const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(404).json({ error: "Email not found" });
    }

    const user = await userModel.findUserByEmail(email);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userProfile = user.toObject();
    delete userProfile.password;
    delete userProfile.__v;

    res.status(200).json({
      message: "User profile retrieved successfully",
      data: userProfile,
    });
  } catch (error) {
    console.error("Error getting user by email:", error);
    res.status(500).json({ error: "Failed to get user by email" });
  }
};

const updateUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;
    if (!userId) {
      return res.status(404).json({ error: "User Id not found" });
    }
    if (!updateData) {
      return res.status(404).json({ error: "Updated data not found" });
    }

    const updatedUser = await userModel.updateUserById(userId, updateData);
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const userProfile = updatedUser.toObject();
    delete userProfile.password;
    delete userProfile.__v;

    res.status(200).json({
      message: "User profile retrieved successfully",
      data: userProfile,
    });
  } catch (error) {
    console.error("Error updating user by id:", error);
    res.status(500).json({ error: "Failed to update user by id" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // Từ middleware verifyToken
    const updateData = req.body;

    if (!userId) {
      return res.status(404).json({ error: "User Id not found" });
    }
    if (!updateData) {
      return res.status(404).json({ error: "Updated data not found" });
    }

    // Không cho phép cập nhật một số trường nhạy cảm
    delete updateData.password;
    delete updateData.email;
    delete updateData.role;

    const updatedUser = await userModel.updateUserById(userId, updateData);
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const userProfile = updatedUser.toObject();
    delete userProfile.__v;
    delete userProfile.password;

    res.status(200).json({
      message: "User profile updated successfully",
      data: userProfile,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // Từ middleware verifyToken
    const user = await userModel.findUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    /**
     * Cách 1: tạo res object
     */
    // const userProfile = {
    //   _id: user._id,
    //   fullName: user.fullName || "",
    //   email: user.email || "",
    //   phone: user.phone || "",
    //   role: user.role || "student",
    //   walletAddress: user.walletAddress || "",
    //   avatarUrl: user.avatarUrl || null,
    //   organization: user.organization || "",
    //   status: user.status || "active",
    //   certificates: Array.isArray(user.certificates) ? user.certificates : [],
    //   createdAt: user.createdAt,
    //   updatedAt: user.updatedAt,
    // };

    /**
     * Cách 2: chuyển mongose document thành plain object
     */
    const userProfile = user.toObject();
    delete userProfile.password;
    delete userProfile.__v;

    res.status(200).json({
      message: "User profile retrieved successfully",
      data: userProfile,
    });
  } catch (error) {
    console.error("Error getting profile:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.getAllUsers();

    if (!users || users.length === 0) {
      return res.status(200).json({
        message: "No users found",
        data: [],
        total: 0,
      });
    }

    const cleanUsers = users.map((user) => {
      const userObject = user.toObject();
      delete userObject.password;
      delete userObject.__v;
      return userObject;
    });

    res.status(200).json({
      message: "Users retrieved successfully",
      data: cleanUsers,
      total: cleanUsers.length,
    });
  } catch (error) {
    console.error("Error getting all users:", error);
    res.status(500).json({ error: "Failed to get all users" });
  }
};

module.exports = {
  createUser,
  getUserById,
  getUserByPhone,
  getUserByWalletAddress,
  getUserByEmail,
  updateUserById,
  updateProfile,
  getAllUsers,
  getUserProfile,
};
