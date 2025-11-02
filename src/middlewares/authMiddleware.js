const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../schemas/user");
const config = require("../configs/config");
const redisService = require("../services/redis.service");

// Hàm dùng để mã hóa mật khẩu
const hashPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    req.body.password = hashedPassword;

    next();
  } catch (error) {
    console.log("Error hashing password: ", error);
    res.status(500).json({ error: "Falled to hash password" });
  }
};

// Hàm dùng để so sánh mật khẩu
const comparePassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const userFound = await User.findOne({ email }).exec();
    if (!userFound) {
      return res
        .status(401)
        .json({ error: "No accounts found with that email." });
    }

    const isPasswordValid = await bcrypt.compare(password, userFound.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Password is not correct" });
    }

    req.user = userFound;
    next();
  } catch (error) {
    console.error("Error comparing password:", error);
    res.status(500).json({ error: "Failed to authenticate user" });
  }
};

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: "Acess token is required" });
    }

    const decoded = jwt.verify(token, config.jwtKey);

    // Kiểm tra xem token có trong Redis hay không
    const isValidToken = await redisService.isValidAccessToken({
      userId: decoded.userId,
      token,
    });
    if (!isValidToken) {
      return res
        .status(401)
        .json({ error: "Token has been invalidated or expired" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(500).json({ error: "Failed to verify token" });
  }
};

const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token required" });
    }

    const decoded = jwt.verify(refreshToken, config.jwtKey);

    const isValidRefreshToken = await redisService.isValidRefreshToken({
      userId: decoded.userId,
      token: refreshToken,
    });

    if (!isValidRefreshToken) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const userFound = await User.findById(userId).exec();

    if (!userFound) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userFound.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Error checking admin role:", error);
    res.status(500).json({ error: "Failed to verify admin role" });
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  verifyToken,
  verifyRefreshToken,
  requireAdmin,
};
