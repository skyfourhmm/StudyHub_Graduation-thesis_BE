const buildCertificateMetadata = ({
  certCode,
  issuer,
  student,
  course,
  issueDate,
  expireDate = null,
  isRevoked = false,
  // certificateHash = null,
  network = "Sepolia",
  extra, //optional
}) => {
  return {
    version: "1.0",
    type: "studyhub-certificate",
    certCode: certCode,
    student: {
      id: student._id,
      walletAddress: student.walletAddress,
      name: student.fullName,
    },
    course: {
      id: course._id,
      title: course.title,
      type: course?.courseType,
      level: course?.courseLevel,
    },
    issuer: {
      walletAddress: issuer.walletAddress,
      name: issuer.name,
    },
    validity: {
      issueDate: issueDate || Date.now(),
      // issueDate: issueDate
      //   ? new Date(issueDate).toISOString()
      //   : new Date().toISOString(),
      expireDate: typeof expireDate !== "undefined" ? expireDate : null,
      isRevoked: typeof isRevoked !== "undefined" ? isRevoked : false,
    },
    blockchain: {
      // certificateHash,
      network,
    },
    ...extra,
  };
};

module.exports = { buildCertificateMetadata };
