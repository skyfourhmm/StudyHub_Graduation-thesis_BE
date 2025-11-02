const { default: mongoose } = require("mongoose");

const paymentSchem = mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    amount: {
      type: Number,
      require: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchem);
