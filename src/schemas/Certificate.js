const mongoose = require("mongoose");
const { generateCertCode } = require("../utils/helper");

const certificateSchema = new mongoose.Schema(
  {
    certificateCode: {
      type: String,
      require: true,
      unique: true,
      index: true,
    },
    student: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      name: {
        type: String,
        require: true,
      },
      walletAddress: {
        type: String,
        require: true,
        index: true,
      },
    },
    course: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
      },
      title: {
        type: String,
        require: true,
      },
      type: {
        type: String,
        enum: ["TOEIC", "IELTS"],
      },
      level: {
        type: String,
      },
    },
    issuer: {
      walletAddress: {
        type: String,
        require: true,
      },
      name: {
        type: String,
        require: true,
      },
    },
    validity: {
      issueDate: {
        type: Date,
        require: true,
        default: Date.now,
      },
      expireDate: {
        type: Date,
        default: null,
      },
      isRevoked: {
        type: Boolean,
        default: false,
      },
    },
    blockchain: {
      transactionHash: {
        type: String,
        trim: true,
      },
      certificateHash: {
        type: String,
        require: true,
        unique: true,
      },
      network: {
        type: String,
        default: "Sepolia",
      },
    },
    ipfs: {
      metadataURI: { type: String, trim: true }, // metadataURI is the URI of the certificate metadata
      metadataCID: { type: String, trim: true, index: true }, // metadataCID is the CID of the certificate metadata
      fileCID: { type: String, trim: true }, // fileCID is the CID of the certificate file
    },
  },
  { timestamps: true }
);

// Middleware: auto generate certCode trước khi lưu
certificateSchema.pre("save", async function (next) {
  if (!this.certificateCode) {
    let newCode;
    let exists = true;

    // Lặp cho tới khi tìm được code chưa trùng
    while (exists) {
      newCode = generateCertCode(
        this.validity.issueDate,
        this.student.id,
        this.course.id
      );
      const check = await mongoose.models.Certificate.findOne({
        certificateCode: newCode,
      });
      if (!check) exists = false;
    }

    this.certificateCode = newCode;
  }
  next();
});

module.exports = mongoose.model("Certificate", certificateSchema);
