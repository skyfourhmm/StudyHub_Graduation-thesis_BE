const Certificate = require("../schemas/certificate");
const userModel = require("./userModel");
const courseModel = require("./courseModel");
const config = require("../configs/config");
const { buildCertificateMetadata } = require("../utils/certificateMetadata");
const { generateCertCode } = require("../utils/helper");
const { ethers } = require("ethers");
const {
  uploadJSON,
  updatePinataKeyvalues,
  ipfsUriToGatewayUrl,
} = require("../services/ipfs.service");
const {
  issueCertificate: issueOnChain,
} = require("../services/ethers.service");

const createCertificate = async (certificateData) => {
  try {
    const newCertificate = new Certificate(certificateData);
    const savedCertificate = await newCertificate.save();
    return savedCertificate;
  } catch (error) {
    console.error("Error creating certificate:", error);
    throw new Error("Failed to create certificate");
  }
};

const findCertificateById = async (id) => {
  try {
    const certificate = await Certificate.findById(id);
    return certificate;
  } catch (error) {
    console.error("Error finding certificate by id:", error);
    throw new Error("Failed to find certificate by id");
  }
};

const findCertificateByCertHash = async (certHash) => {
  try {
    const certificate = await Certificate.findOne({
      "blockchain.certificateHash": certHash,
    }).lean();
    return certificate;
  } catch (error) {
    console.error("Error finding certificate by cert hash:", error);
    throw new Error("Failed to find certificate by cert hash");
  }
};

const findCertificateByCertCode = async (certificateCode) => {
  try {
    const certificate = await Certificate.findOne({
      certificateCode,
    }).lean();
    return certificate;
  } catch (error) {
    console.error("Error finding certificate by cert code:", error);
    throw new Error("Failed to find certificate by cert code");
  }
};

const findCertificatesByStudentAddress = async (address) => {
  try {
    const certificates = await Certificate.find({
      "student.walletAddress": address,
    }).lean();
    return certificates;
  } catch (error) {
    console.error("Error finding certificate by cert code:", error);
    throw new Error("Failed to find certificate by cert code");
  }
};

const getCertificateByStudentId = async (learnerId) => {
  try {
    const certificates = await Certificate.find({
      "student.id": learnerId,
    }).lean();
    return certificates;
  } catch (error) {
    console.error("Error getting certificates by learner id:", error);
    throw new Error("Failed to get certificates by learner id");
  }
};

/**
 * Validate student and course data for certificate issuance
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @returns {Promise<{student: Object, course: Object, certCode: string}>}
 */
const validateCertificateData = async (studentId, courseId) => {
  if (!studentId || !courseId) {
    throw new Error("Missing required fields: studentId and courseId");
  }

  const certCode = generateCertCode(new Date(), studentId, courseId);

  const [student, course] = await Promise.all([
    userModel.findUserById(studentId),
    courseModel.findCourseById(courseId),
  ]);

  if (!student) {
    throw new Error(`Student not found: ${studentId}`);
  }

  if (!student.walletAddress || !ethers.isAddress(student.walletAddress)) {
    throw new Error(
      `Invalid student wallet address format: ${student.walletAddress}`
    );
  }

  if (!course) {
    throw new Error(`Course not found: ${courseId}`);
  }

  return { student, course, certCode };
};

/**
 * Upload certificate metadata to IPFS/Pinata
 * @param {Object} certificateData - Certificate data for metadata
 * @returns {Promise<{cid: string, uri: string}>}
 */
const uploadCertificateMetadata = async (certificateData) => {
  const { certCode, student, course } = certificateData;

  const defaultIssuer = {
    walletAddress: config.adminAddress,
    name: "StudyHub",
  };
  const issueDate = new Date();

  // Build JSON metadata
  const metadata = buildCertificateMetadata({
    certCode,
    student,
    issuer: defaultIssuer,
    course,
    issueDate,
  });

  // Upload JSON to IPFS (Pinata)
  const meta = await uploadJSON(metadata, {
    name: "studyhub-certificate.json",
    keyvalues: {
      type: "studyhub-certificate",
      studentWalletAddress: String(student.walletAddress),
      issuerWalletAddress: String(defaultIssuer.walletAddress),
      certificateCode: String(certCode),
    },
  });

  return {
    cid: meta.cid,
    uri: meta.uri,
    issuer: defaultIssuer,
    issueDate,
  };
};

/**
 * Issue certificate on blockchain
 * @param {Object} blockchainData - Data for blockchain transaction
 * @returns {Promise<{certHash: string, txHash: string}>}
 */
const uploadCertificateOnBlockchain = async (blockchainData) => {
  const { student, course, issuer, metadataUri } = blockchainData;

  try {
    const result = await issueOnChain(
      student.walletAddress,
      student.fullName,
      issuer.walletAddress,
      issuer.name,
      course.title,
      course.courseType || "General",
      course.courseLevel || "Beginner",
      metadataUri
    );

    return {
      certHash: result.certHash,
      txHash: result.txHash,
    };
  } catch (contractError) {
    console.error("Blockchain transaction failed:", contractError.message);
    throw new Error(`Blockchain transaction failed: ${contractError.message}`);
  }
};

/**
 * Update Pinata metadata with blockchain information
 * @param {string} cid - Pinata CID
 * @param {Object} blockchainInfo - Blockchain transaction info
 */
const updateMetadataWithBlockchainInfo = async (cid, blockchainInfo) => {
  const { certHash, student, issuer, txHash } = blockchainInfo;

  await updatePinataKeyvalues(cid, {
    certificateHash: String(certHash),
    transactionHash: String(txHash),
    studentWalletAddress: String(student.walletAddress),
    issuerWalletAddress: String(issuer.walletAddress),
    network: "Sepolia",
  });
};

/**
 * Save certificate to database
 * @param {Object} certificateInfo - Complete certificate information
 * @returns {Promise<Object>} Saved certificate document
 */
const saveCertificateToDatabase = async (certificateInfo) => {
  const {
    certCode,
    // studentId,
    // courseId,
    student,
    course,
    issuer,
    issueDate,
    certHash,
    txHash,
    metadataUri,
    metadataCid,
  } = certificateInfo;

  const savedCertificate = await Certificate.create({
    certificateCode: certCode,
    student: {
      id: student._id,
      name: student.fullName,
      walletAddress: student.walletAddress,
    },
    course: {
      id: course._id,
      title: course.title,
      type: course.courseType,
      level: course.courseLevel,
    },
    issuer: {
      walletAddress: issuer.walletAddress,
      name: issuer.name,
    },
    validity: {
      issueDate,
      expireDate: null,
      isRevoked: false,
    },
    blockchain: {
      transactionHash: txHash,
      certificateHash: certHash,
      network: "Sepolia",
    },
    ipfs: {
      metadataURI: ipfsUriToGatewayUrl(metadataUri),
      metadataCID: metadataCid,
      fileCID: "",
    },
  });

  return savedCertificate;
};

/**
 * Complete certificate issuance process
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Complete certificate issuance result
 */
const issueCertificate = async (studentId, courseId) => {
  try {
    // Step 1: Validate data
    const { student, course, certCode } = await validateCertificateData(
      studentId,
      courseId
    );

    // Step 2: Upload metadata to IPFS
    const metadataResult = await uploadCertificateMetadata({
      certCode,
      student,
      course,
    });

    const { cid, uri: metadataUri, issuer, issueDate } = metadataResult;

    let certHash, txHash;
    try {
      // Step 3: Issue on blockchain
      const blockchainResult = await uploadCertificateOnBlockchain({
        student,
        course,
        issuer,
        metadataUri,
      });

      certHash = blockchainResult.certHash;
      txHash = blockchainResult.txHash;
    } catch (blockchainError) {
      console.error("Blockchain failed, metadata uploaded but unused:", cid);
      throw blockchainError;
    }

    // Step 4: Update Pinata metadata with blockchain info
    await updateMetadataWithBlockchainInfo(cid, {
      txHash,
      certHash,
      student,
      issuer,
    });

    // Step 5: Save to database
    const savedCertificate = await saveCertificateToDatabase({
      certCode,
      // studentId,
      // courseId,
      student,
      course,
      issuer,
      issueDate,
      certHash,
      txHash,
      metadataUri,
      metadataCid: cid,
    });

    // Return complete result
    return {
      certificate: savedCertificate,
      blockchain: {
        certHash,
        txHash,
        network: "Sepolia",
      },
      ipfs: {
        metadataURI: metadataUri,
        metadataCID: cid,
      },
      metadata: {
        certCode,
        issuer,
        student: {
          id: student._id,
          name: student.fullName,
          walletAddress: student.walletAddress,
        },
        course: {
          id: course._id,
          name: course.title,
          type: course.courseType,
          level: course.courseLevel,
        },
        issueDate: issueDate.toISOString(),
      },
    };
  } catch (error) {
    console.error("Certificate issuance failed:", error);
    throw error;
  }
};

/**
 * Get all certificates from database
 * @returns {Promise<Array>} All certificates
 */
const getAllCertificates = async () => {
  try {
    const certificates = await Certificate.find()
      .sort({ createdAt: -1 })
      .lean();
    return certificates;
  } catch (error) {
    console.error("Error getting all certificates:", error);
    throw new Error("Failed to get all certificates");
  }
};

module.exports = {
  createCertificate,
  findCertificateById,
  findCertificateByCertHash,
  findCertificateByCertCode,
  findCertificatesByStudentAddress,
  getCertificateByStudentId,
  validateCertificateData,
  uploadCertificateMetadata,
  uploadCertificateOnBlockchain,
  updateMetadataWithBlockchainInfo,
  saveCertificateToDatabase,
  issueCertificate,
  getAllCertificates,
};
