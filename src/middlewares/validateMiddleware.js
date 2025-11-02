const user = require("../schemas/user.js");
const bcrypt = require("bcrypt");

// Hàm để validate mật khẩu
const validatePassword = (isRequired = true) => {
  return (req, res, next) => {
    const { password } = req.body;

    if (!isRequired && !password) {
      return next();
    }

    if (isRequired && !password) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (password) {
      // Kiểm tra độ dài tối thiểu (>= 8 kí tự)
      if (password.length < 8) {
        return res.status(400).json({
          error: "Password must be at least 8 characters long",
        });
      }

      // Kiểm tra có ít nhất 1 chữ hoa
      if (!/[A-Z]/.test(password)) {
        return res.status(400).json({
          error: "Password must contain at least one uppercase letter",
        });
      }

      // Kiểm tra có ít nhất 1 chữ thường
      if (!/[a-z]/.test(password)) {
        return res.status(400).json({
          error: "Password must contain at least one lowercase letter",
        });
      }

      // Kiểm tra có ít nhất 1 số
      if (!/\d/.test(password)) {
        return res.status(400).json({
          error: "Password must contain at least one number",
        });
      }

      // Kiểm tra có ít nhất 1 ký tự đặc biệt
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return res.status(400).json({
          error: "Password must contain at least one special character",
        });
      }
    }

    next();
  };
};

const validateNewPassword = (isRequired = true) => {
  return (req, res, next) => {
    const { newPassword } = req.body;

    if (!isRequired && !newPassword) {
      return next();
    }

    if (isRequired && !newPassword) {
      return res.status(400).json({ error: "New password is required" });
    }

    if (newPassword) {
      // Kiểm tra độ dài tối thiểu (>= 8 kí tự)
      if (newPassword.length < 8) {
        return res.status(400).json({
          error: "Password must be at least 8 characters long",
        });
      }

      // Kiểm tra có ít nhất 1 chữ hoa
      if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({
          error: "Password must contain at least one uppercase letter",
        });
      }

      // Kiểm tra có ít nhất 1 chữ thường
      if (!/[a-z]/.test(newPassword)) {
        return res.status(400).json({
          error: "Password must contain at least one lowercase letter",
        });
      }

      // Kiểm tra có ít nhất 1 số
      if (!/\d/.test(newPassword)) {
        return res.status(400).json({
          error: "Password must contain at least one number",
        });
      }

      // Kiểm tra có ít nhất 1 ký tự đặc biệt
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
        return res.status(400).json({
          error: "Password must contain at least one special character",
        });
      }
    }

    next();
  };
};

// Hàm để validate email
const validateEmail = (isRequired = true) => {
  return (req, res, next) => {
    const { email } = req.body;

    // Nếu không bắt buộc và không có email thì bỏ qua
    if (!isRequired && !email) {
      return next();
    }

    // Nếu bắt buộc và không có email thì báo lỗi
    if (isRequired && !email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Nếu có email thì regex, bất kể bắt buộc hay không
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res
          .status(400)
          .json({ error: "Please provide a valid email address" });
      }
    }
    next();
  };
};

// Hàm để validate số điện thoại
const validatePhone = (isRequired = true) => {
  return (req, res, next) => {
    const { phone } = req.body;

    if (!isRequired && !phone) {
      return next();
    }

    if (isRequired && !phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Regex cho số điện thoại VN và quốc tế
    // Hỗ trợ: +84xxxxxxxxx, 84xxxxxxxxx, 0xxxxxxxxx, +1xxxxxxxxx, ...
    if (phone) {
      const phoneRegex = /^(\+?[0-9]{1,4})?[0-9]{9,15}$/;
      if (!phoneRegex.test(phone.trim())) {
        return res.status(400).json({
          error:
            "Please provide a valid phone number (9-15 digits, optionally with country code)",
        });
      }
    }

    next();
  };
};

// Hàm để validate họ tên người dùng
const validateFullName = (isRequired = true) => {
  return (req, res, next) => {
    const { fullName } = req.body;

    if (!isRequired && !fullName) {
      return next();
    }

    if (isRequired && !fullName) {
      return res.status(400).json({ error: "Fullname is required" });
    }

    if (fullName) {
      const nameRegex = /^[A-Za-zÀ-ỹ][A-Za-zÀ-ỹ\s]{0,48}[A-Za-zÀ-ỹ]$/;
      if (!nameRegex.test(fullName.trim())) {
        return res.status(400).json({
          error:
            "Please provide a valid name (2-50 characters, only letters and Vietnamese characters allowed)",
        });
      }
    }

    next();
  };
};

// Hàm để validate ngày sinh của người dùng
const validateDob = (isRequired = true) => {
  return (req, res, next) => {
    const { dob } = req.body;

    if (!isRequired && !dob) {
      return next();
    }

    if (isRequired && !dob) {
      return res.status(400).json({
        error: "Day of birth is required",
      });
    }

    if (dob) {
      const dobDate = new Date(dob);
      if (isNaN(dobDate.getTime())) {
        return res.status(400).json({
          error: "Invalid date format",
        });
      }

      const now = new Date();
      if (dobDate > now) {
        return res.status(400).json({
          error:
            "Please provide a valid date of birth (less than or equal to the present)",
        });
      }
    }

    next();
  };
};

// Hmà để validate giới tính của người dùng
const validateGender = (isRequired = true) => {
  return (req, res, next) => {
    const { gender } = req.body;
    const validGenders = ["male", "female", "other"];

    if (!isRequired && !gender) {
      return next();
    }

    if (isRequired && !gender) {
      return res.status(400).json({
        error: "Gender is required",
      });
    }

    if (gender) {
      if (!validGenders.includes(gender)) {
        return res.status(400).json({
          error: "Please provide a valid gender (male, female, other)",
        });
      }
    }

    next();
  };
};

// Hàm để validate địa chỉ ví
const validateWalletAddress = (isRequired = true) => {
  return (req, res, next) => {
    const { walletAddress } = req.body;

    if (!isRequired && !walletAddress) {
      return next();
    }

    if (isRequired && !walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    if (walletAddress) {
      const walletRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!walletRegex.test(walletAddress.trim())) {
        return res
          .status(400)
          .json({ error: "Please provide a valid wallet address" });
      }
    }

    next();
  };
};

// Hàm để kiểm tra tài khoản có tồn tại hay không
const checkUserExists = async (req, res, next) => {
  try {
    const { email, phone, walletAddress } = req.body;
    const userId = req.user?.userId;

    // Kiểm tra email đã tồn tại
    if (email) {
      const existingUserByEmail = await user.findOne({
        email,
        _id: { $ne: userId },
      });
      if (existingUserByEmail) {
        return res
          .status(400)
          .json({ error: "This email address has been used" });
      }
    }

    // Kiểm tra phone đã tồn tại
    if (phone) {
      const existingUserByPhone = await user.findOne({
        phone,
        _id: { $ne: userId },
      });
      if (existingUserByPhone) {
        return res
          .status(400)
          .json({ error: "This phone number has been used" });
      }
    }

    // // Kiểm tra wallet address đã tồn tại
    // if (walletAddress) {
    //   const existingUserByWallet = await user.findOne({ walletAddress });
    //   if (existingUserByWallet) {
    //     return res
    //       .status(400)
    //       .json({ error: "This wallet address has been used" });
    //   }
    // }

    next();
  } catch (error) {
    console.error("Error checking user existence:", error);
    res.status(500).json({ error: "Failed to check user existence" });
  }
};

// Hàm để xóa mật khẩu khỏi res trả về
const removePasswordFromResponse = (req, res, next) => {
  // Lưu hàm json gốc
  const originalJson = res.json;

  // Override hàm json để loại bỏ password
  res.json = function (data) {
    if (data && typeof data === "object") {
      if (Array.isArray(data)) {
        // Nếu là array, loại bỏ password từ mỗi object
        data = data.map((item) => {
          if (item && typeof item === "object" && item.password) {
            const { password, ...itemWithoutPassword } = item;
            return itemWithoutPassword;
          }
          return item;
        });
      } else if (data.password) {
        // Nếu là object, loại bỏ password
        const { password, ...dataWithoutPassword } = data;
        data = dataWithoutPassword;
      }
    }

    // Gọi hàm json gốc
    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  checkUserExists,
  removePasswordFromResponse,
  validateEmail,
  validatePassword,
  validateNewPassword,
  validatePhone,
  validateWalletAddress,
  validateFullName,
  validateDob,
  validateGender,
};
