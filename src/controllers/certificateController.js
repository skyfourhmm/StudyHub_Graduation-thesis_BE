const certificateModel = require("../models/certificateModel");
const {
  searchMetadataByKeyvalues,
  getPinataMetadataByCID,
} = require("../services/ipfs.service");
const {
  getCertificateByHash: readByHash,
  getStudentCertificatesByStudent: readByStudent,
} = require("../services/ethers.service");
const config = require("../configs/config");
const {
  toPlain,
  structureCertificateData,
  structureCertificateList,
  isCertificateConsistent,
} = require("../utils/helper");

/**
 * Tạo bản ghi chứng chỉ trong cơ sở dữ liệu (KHÔNG phát hành on-chain).
 * @param {import('express').Request} req - Body chứa dữ liệu chứng chỉ
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
const createCertificate = async (req, res) => {
  try {
    const certificateData = req.body;
    if (!certificateData) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const savedCertificate = await certificateModel.createCertificate(
      certificateData
    );
    res.status(201).json({
      message: "Certificate created successfully!",
      certificate: savedCertificate,
    });
  } catch (error) {
    console.error("Error creating certificate:", error);
    res.status(500).json({ error: "Failed to create certificate" });
  }
};

/**
 * Phát hành chứng chỉ: upload metadata JSON lên Pinata/IPFS,
 * gọi smart contract để phát hành với metadataURI, sau đó lưu chứng chỉ vào DB
 * @param {import('express').Request} req - JSON body: { courseId }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
const issueCertificate = async (req, res, next) => {
  try {
    const { courseId } = req.body;
    const studentId = req.user.userId;

    // Input validation
    if (!studentId || !courseId) {
      return res.status(400).json({
        error: "Missing required fields",
        received: req.body,
        required: ["studentId", "courseId"],
      });
    }

    // Use the complete issuance function from model
    const result = await certificateModel.issueCertificate(studentId, courseId);

    return res.status(201).json({
      isSuccess: true,
      message: "Certificate issued successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error issuing certificate:", error);
    return res.status(500).json({
      error: "Failed to issue certificate",
      details: error.message,
    });
  }
};

/**
 * Lấy thông tin chứng chỉ on-chain theo certHash.
 * Ghi chú: dữ liệu có kiểu BigInt (vd issuedDate) sẽ được chuyển sang string bằng toPlain.
 * @param {import('express').Request} req - params: { hash }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
const getCertificateByHash = async (req, res, next) => {
  try {
    const hash = req.params.hash;
    if (!hash) {
      return res
        .status(400)
        .json({ error: "Missing certificate's hash fields" });
    }

    // 1. Lấy dữ liệu từ blockchain
    let blockchainCert = null;
    try {
      const rawBlockchainCert = await readByHash(hash);
      blockchainCert = structureCertificateData(rawBlockchainCert);
    } catch (err) {
      console.error("Blockchain read error:", err.message);
    }

    // 2. Lấy dữ liệu từ database
    let mongoCert = null;
    try {
      mongoCert = await certificateModel.findCertificateByCertHash(hash);
    } catch (err) {
      console.error("MongoDB read error:", err.message);
    }

    // 3. Lấy dữ liệu từ Pinata
    let pinataMetadata = null;
    try {
      if (mongoCert?.ipfs?.metadataCID) {
        pinataMetadata = await getPinataMetadataByCID(
          mongoCert.ipfs.metadataCID
        );
      }
    } catch (err) {
      console.error("Pinata read error:", err.message);
    }

    // 4. So sánh dữ liệu giữa 3 nguồn
    const isConsistent = isCertificateConsistent(
      mongoCert,
      blockchainCert,
      pinataMetadata
    );

    if (isConsistent) {
      return res.json({
        certificate: mongoCert,
      });
    } else {
      return res.status(400).json({
        certificate: {},
      });
    }
  } catch (error) {
    console.error("Can not find certificate by hash: ", error);
    next(error);
  }
};

/**
 * Lấy thông tin chứng chỉ on-chain theo certCode.
 * Ghi chú: dữ liệu có kiểu BigInt (vd issuedDate) sẽ được chuyển sang string bằng toPlain.
 * @param {import('express').Request} req - params: { certCode }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
const getCertificateByCode = async (req, res, next) => {
  try {
    const certificateCode = req.params.certificateCode;

    if (!certificateCode) {
      return res.status(400).json({ error: "Missing certificate code" });
    }

    // Tìm chứng chỉ trong DB
    const certificate = await certificateModel.findCertificateByCertCode(
      certificateCode
    );
    if (!certificate) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    const certificateHash = certificate.blockchain.certificateHash;
    if (
      !certificateHash ||
      certificateHash.length !== 66 ||
      !certificateHash.startsWith("0x")
    ) {
      return res.status(400).json({ error: "Invalid certificate hash format" });
    }

    // Lấy dữ liệu từ blockchain
    let blockchainCert = null;
    try {
      const rawBlockchainCert = await readByHash(certificateHash);
      blockchainCert = structureCertificateData(rawBlockchainCert);
    } catch (err) {
      console.error("Blockchain read error:", err.message);
    }

    // Lấy dữ liệu từ Pinata
    let pinataMetadata = null;
    try {
      // Nếu có metadataCID hoặc metadataURI
      if (certificate.ipfs?.metadataCID) {
        pinataMetadata = await getPinataMetadataByCID(
          certificate.ipfs.metadataCID
        );
      }
    } catch (err) {
      console.error("Pinata read error:", err.message);
    }

    // So sánh dữ liệu giữa 3 nguồn
    const isConsistent = isCertificateConsistent(
      certificate,
      blockchainCert,
      pinataMetadata
    );

    if (isConsistent) {
      return res.json({
        certificate: certificate,
      });
    } else {
      return res.status(400).json({
        certificate: {},
      });
    }
  } catch (error) {
    console.error("Can not find certificate by code: ", error);
    next(error);
  }
};

/**
 * Lấy danh sách chứng chỉ của một sinh viên theo địa chỉ ví on-chain.
 * Trả về { total, list } trong đó BigInt đã được chuyển sang string (toPlain).
 * @param {import('express').Request} req - params: { address }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
const getStudentCertificatesByStudent = async (req, res, next) => {
  try {
    const studentAddress = req.params.address;

    if (!studentAddress) {
      return res
        .status(400)
        .json({ error: "Missing student's address fields" });
    }
    const [list, total] = await readByStudent(studentAddress);
    const structuredList = structureCertificateList(toPlain(list));

    console.log(structuredList);

    return res.json({
      total: Number(total),
      certificates: structuredList,
    });
  } catch (error) {
    console.error("Can not get list certificates by student: ", error);
    next(error);
  }
};

/**
 * Lấy danh sách chứng chỉ kết hợp database và blockchain
 * @param {import('express').Request} req - params: { address }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
const getStudentCertificatesHybrid = async (req, res, next) => {
  try {
    const { address } = req.params;

    // 1. Lấy từ database trước
    try {
      const dbCertificates =
        await certificateModel.findCertificatesByStudentAddress(address);

      if (dbCertificates && dbCertificates.length > 0) {
        return res.json({
          total: dbCertificates.length,
          certificates: dbCertificates,
          source: "database",
        });
      }
    } catch (dbError) {
      console.error("Database query failed:", dbError.message);
    }

    // 2. Fallback: Lấy từ Pinata
    const keyvalues = {
      studentWalletAddress: { value: String(address), op: "eq" },
    };

    const pinataCerts = await searchMetadataByKeyvalues(keyvalues, 100, 0);

    const formatPinataCertificates = await Promise.all(
      pinataCerts.map(async (cert) => {
        const data = await getPinataMetadataByCID(cert.cid);

        return {
          certificateCode: data.certificateCode,
          student: {
            id: data.student.id,
            name: data.student.name,
            walletAddress: data.student.walletAddress,
          },
          course: {
            id: data.course.id,
            title: data.course.title,
          },
          issuer: {
            walletAddress: data.issuer.walletAddress,
            name: data.issuer.name,
          },
          validity: {
            issueDate: data.validity.issueDate,
            expireDate: data.validity.expireDate,
            isRevoked: data.validity.isRevoked,
          },
          blockchain: {
            transactionHash: null,
            certificateHash: null,
            network: data.blockchain.network || "Sepolia",
          },
          createdAt: cert.date_pinned ? new Date(cert.date_pinned) : null,
          updatedAt: cert.date_pinned ? new Date(cert.date_pinned) : null,
        };
      })
    );

    return res.json({
      total: formatPinataCertificates.length,
      certificates: formatPinataCertificates,
      source: "pinata",
    });
  } catch (error) {
    console.error("Can not get certificates (hybrid): ", error);
    next(error);
  }
};

/**
 * Tìm kiếm metadata chứng chỉ đã pin trên Pinata theo bộ lọc keyvalues.
 * Hỗ trợ phân trang qua limit/offset; trả về danh sách rút gọn kèm CID và URL gateway.
 * @param {import('express').Request} req - query: { student?, issuer?, courseName?, studentName?, limit?, offset? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
const searchCertificates = async (req, res, next) => {
  try {
    const { student, issuer, courseName, studentName, limit, offset } =
      req.query;
    const keyvalues = {};
    if (student)
      keyvalues.student = { value: String(student).toLowerCase(), op: "eq" };
    if (issuer) keyvalues.issuer = { value: String(issuer), op: "eq" };
    if (courseName) {
      const encodedCourseName = encodeURIComponent(String(courseName));
      keyvalues.courseName = { value: encodedCourseName, op: "eq" };
    }
    if (studentName) {
      const encodedStudentName = encodeURIComponent(String(studentName));
      keyvalues.studentName = { value: encodedStudentName, op: "eq" };
    }

    const rows = await searchMetadataByKeyvalues(
      keyvalues,
      Number(limit) || 50,
      Number(offset) || 0
    );
    return res.json({ total: rows.length, list: rows });
  } catch (error) {
    console.error("Can not search certificates: ", error);
    next(error);
  }
};

/**
 * Lấy tất cả chứng chỉ từ database
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
const getAllCertificates = async (req, res, next) => {
  try {
    const certificates = await certificateModel.getAllCertificates();

    return res.json({
      total: certificates.length,
      certificates: certificates,
    });
  } catch (error) {
    console.error("Can not get all certificates: ", error);
    return res.status(500).json({
      error: "Failed to get all certificates",
      details: error.message,
    });
  }
};

module.exports = {
  createCertificate,
  issueCertificate,
  getCertificateByHash,
  getCertificateByCode,
  getStudentCertificatesByStudent,
  getStudentCertificatesHybrid,
  searchCertificates,
  getAllCertificates,
};
