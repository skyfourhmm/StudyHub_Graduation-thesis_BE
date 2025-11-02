const express = require("express");
const {
  createCertificate,
  getCertificateByHash,
  issueCertificate,
  searchCertificates,
  getCertificateByCode,
  getStudentCertificatesHybrid,
  getAllCertificates,
} = require("../controllers/certificateController");
const { verifyToken, requireAdmin } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/", verifyToken, createCertificate);
router.get("/", verifyToken, requireAdmin, getAllCertificates);
router.get("/search", verifyToken, searchCertificates);
router.post("/issue", verifyToken, issueCertificate);
router.get("/student/:address", verifyToken, getStudentCertificatesHybrid);
router.get("/hash/:hash", getCertificateByHash);
router.get("/code/:certificateCode", getCertificateByCode);

module.exports = router;
