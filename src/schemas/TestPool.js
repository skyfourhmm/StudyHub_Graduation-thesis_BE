const mongoose = require("mongoose");

const testPoolSchema = new mongoose.Schema(
  {
    baseTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    level: { type: String, required: true }, // Nơi mà userB dùng đề thực hiện lấy đúng level không
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    usageCount: { type: Number, default: 0 }, // bao nhiêu user đã làm
    maxReuse: { type: Number, default: 10 }, // tối đa bao nhiêu user reuse
    status: { type: String, enum: ["active", "expired"], default: "active" },
    expiresAt: { type: Date }, // option: tự động hết hạn pool
  },
  { timestamps: true }
);

module.exports = mongoose.model("TestPool", testPoolSchema);
