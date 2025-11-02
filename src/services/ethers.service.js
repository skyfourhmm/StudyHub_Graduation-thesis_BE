const { ethers } = require("ethers");
const config = require("../configs/config");
const abi = require("../configs/CertificateRegistry.abi.json");

const provider = new ethers.JsonRpcProvider(config.rpcUrl);
const wallet = new ethers.Wallet(config.adminPk, provider);
const contract = new ethers.Contract(config.contractAddress, abi, wallet); //instance contract

/**
 * Gọi smart contract để phát hành chứng chỉ với metadataURI đã lưu trên IPFS.
 * Đợi giao dịch được xác nhận, parse log event CertificateIssued để lấy certHash.
 * @param {string} studentAddress Địa chỉ ví người nhận
 * @param {string} studentName Tên người nhận
 * @param {string} issuerAddress Địa chỉ ví của đơn vị/cá nhân phát hành
 * @param {string} issuerName Tên đơn vị/cá nhân phát hành
 * @param {string} courseName Tên khóa học
 * @param {string} metadataURI URI metadata JSON trên IPFS (vd: ipfs://bafy...)
 * @returns {Promise<{ certHash: string|null, txHash: string }>} Mã băm chứng chỉ và hash giao dịch
 */
async function issueCertificate(
  student,
  studentName,
  issuerAddress,
  issuerName,
  courseName,
  courseType,
  courseLevel,
  metadataURI
) {
  const tx = await contract.issueCertificate(
    student,
    studentName,
    issuerAddress,
    issuerName,
    courseName,
    courseType,
    courseLevel,
    metadataURI
  );

  // console.log("Transaction object:", {
  //   hash: tx.hash,
  //   type: typeof tx.hash,
  //   nonce: tx.nonce,
  //   gasLimit: tx.gasLimit?.toString(),
  // });
  const receipt = await tx.wait();

  const issuedEvent = receipt.logs
    .map((l) => {
      try {
        return contract.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "CertificateIssued");

  const certHash = issuedEvent?.args?.[0] ?? null;

  const txHash = tx.hash || receipt.transactionHash || receipt.hash;
  return { certHash, txHash };
}

/**
 * Lấy thông tin chứng chỉ on-chain theo certHash.
 * @param {string} hash Mã băm chứng chỉ (bytes32, dạng 0x...)
 * @returns {Promise<any>} Certificate từ contract
 */
function getCertificateByHash(hash) {
  return contract.getCertificateByHash(hash);
}

/**
 * Lấy danh sách chứng chỉ của sinh viên theo địa chỉ ví.
 * @param {string} address Địa chỉ ví của sinh viên (0x...)
 * @returns {Promise<[any[], bigint]>} Danh sách chứng chỉ và tổng số (uint256)
 */
function getStudentCertificatesByStudent(address) {
  return contract.getStudentCertificatesByStudent(address);
}

module.exports = {
  issueCertificate,
  getCertificateByHash,
  getStudentCertificatesByStudent,
};
