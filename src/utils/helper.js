const config = require("../configs/config");
const crypto = require("crypto");

// Chuyển dữ liệu từ BigInt -> String
function toPlain(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = toPlain(v);
    return out;
  }
  return value;
}

/**
 * Cấu trúc lại dữ liệu certificate từ blockchain để dễ đọc
 * @param {Array} certData - Dữ liệu thô từ smart contract
 * @returns {Object} Dữ liệu có cấu trúc
 */
function structureCertificateData(certData) {
  if (!Array.isArray(certData) || certData.length < 8) {
    return { error: "Invalid certificate data format" };
  }

  const [
    certHash,
    issuerAddress,
    issuerName,
    studentAddress,
    studentName,
    courseName,
    issuedDate,
    metadataURI,
  ] = toPlain(certData);

  // Chuyển timestamp thành Date object
  const issueDate = new Date(Number(issuedDate) * 1000);

  return {
    certHash,
    student: {
      address: studentAddress,
      name: studentName,
    },
    issuer: {
      address: issuerAddress,
      name: issuerName,
    },
    course: {
      name: courseName,
    },
    issueDate: {
      timestamp: issuedDate,
      formatted: issueDate.toISOString(),
    },
    metadata: {
      uri: metadataURI,
      gateway: metadataURI.replace(
        "ipfs://",
        `${config.pinataGatewayBase}/ipfs/`
      ),
    },
    network: "sepolia",
  };
}

/**
 * Cấu trúc lại danh sách certificates
 * @param {Array} certList - Danh sách certificates thô
 * @returns {Array} Danh sách có cấu trúc
 */
function structureCertificateList(certList) {
  if (!Array.isArray(certList)) {
    return [];
  }

  return certList.map((cert) => structureCertificateData(cert));
}

function generateCertCode(issueDate = new Date(), learnerId, courseId) {
  // Format ngày: YYMMDD
  const datePart = issueDate.toISOString().slice(2, 10).replace(/-/g, "");

  // Sinh chuỗi gốc để hash (dựa trên learnerId + courseId + thời gian + random salt)
  const raw = `${learnerId}-${courseId}-${Date.now()}-${Math.random()}`;

  // Hash → base36 để rút gọn
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const encoded = parseInt(hash.slice(0, 12), 16).toString(36).toUpperCase();

  // Lấy 6 ký tự
  const codePart = encoded.slice(0, 6);

  return `CERT-${datePart}-${codePart}`;
}

/**
 * Kiểm tra các trường quan trọng của chứng chỉ ở MongoDB, Blockchain, Pinata có giống nhau không
 * @param {Object} mongoCert - Chứng chỉ từ MongoDB
 * @param {Object} blockchainCert - Chứng chỉ từ Blockchain (đã qua structureCertificateData)
 * @param {Object} pinataMetadata - Metadata từ Pinata (JSON)
 * @returns {boolean} - true nếu tất cả trường đều giống nhau, false nếu có trường khác
 */
function isCertificateConsistent(mongoCert, blockchainCert, pinataMetadata) {
  if (!mongoCert || !blockchainCert) return false;

  // Lấy các trường cần so sánh
  const mongoIssuer = mongoCert.issuer?.walletAddress;
  const mongoStudent = mongoCert.student?.walletAddress;
  const mongoCourse = mongoCert.course?.title || mongoCert.course?.name;

  const bcIssuer = blockchainCert.issuer?.address;
  const bcStudent = blockchainCert.student?.address;
  const bcCourse = blockchainCert.course?.name;

  // Pinata có thể thiếu, nên kiểm tra nếu có
  let pinIssuer, pinStudent, pinCourse;
  if (pinataMetadata) {
    pinIssuer = pinataMetadata.issuer?.walletAddress;
    pinStudent = pinataMetadata.student?.walletAddress;
    pinCourse = pinataMetadata.course?.title || pinataMetadata.course?.name;
  }

  // So sánh từng trường
  const issuerMatch =
    mongoIssuer === bcIssuer && (!pinataMetadata || pinIssuer === bcIssuer);

  const studentMatch =
    mongoStudent === bcStudent && (!pinataMetadata || pinStudent === bcStudent);

  const courseMatch =
    mongoCourse === bcCourse && (!pinataMetadata || pinCourse === bcCourse);

  return issuerMatch && studentMatch && courseMatch;
}

module.exports = {
  toPlain,
  structureCertificateData,
  structureCertificateList,
  generateCertCode,
  isCertificateConsistent,
};
