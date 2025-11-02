const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    password: {
      type: String,
      require: true,
    },
    fullName: {
      type: String,
      require: true,
      trim: true,
    },
    phone: {
      type: String,
      require: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      require: true,
      unique: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },
    dob: { type: Date, require: false },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      require: false,
    },
    walletAddress: {
      type: String,
      require: true,
      unique: true,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, "Please provide a valid wallet address"],
    },
    avatarUrl: { type: String, trim: true },
    organization: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    certificates: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Certificate",
    },
    currentLevel: {
      TOEIC: { type: String },
      IELTS: { type: String },
    },
    studyHoursPerWeek: { type: Number, min: 0 },
    learningGoals: { type: String, trim: true },
    learningPreferences: { type: [String], trim: true }, // vd: ["Vocabulary", "Listening"]
    studyMethods: { type: [String], trim: true }, // vd: ["Flashcards", "Listening practice"]

    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
