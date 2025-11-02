const express = require("express");
const {
  register,
  login,
  logout,
  refreshToken,
  changePassword,
  forgotPassword,
  logoutAllSessions,
  getUserSessions,
  resetPassword,
} = require("../controllers/authController");
const {
  validateEmail,
  validatePhone,
  validatePassword,
  checkUserExists,
  removePasswordFromResponse,
  validateNewPassword,
  validateFullName,
  validateDob,
  validateGender,
} = require("../middlewares/validateMiddleware");
const {
  hashPassword,
  verifyToken,
  comparePassword,
  verifyRefreshToken,
} = require("../middlewares/authMiddleware");
const router = express.Router();

router.post(
  "/register",
  validateEmail(),
  validatePhone(),
  validatePassword(),
  validateFullName(),
  validateDob(),
  validateGender(),
  checkUserExists,
  hashPassword,
  removePasswordFromResponse,
  register
);
router.post(
  "/login",
  validateEmail(),
  validatePassword(),
  comparePassword,
  login
);
router.post("/logout", verifyToken, logout);
router.post("/logout-all", verifyToken, logoutAllSessions);
router.get("/sessions", verifyToken, getUserSessions);
router.post("/refreshToken", verifyRefreshToken, refreshToken);
router.post(
  "/change-password",
  verifyToken,
  validateNewPassword(),
  changePassword
);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
