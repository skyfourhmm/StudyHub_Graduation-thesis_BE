const config = require("../configs/config");
const pinataSDK = require("@pinata/sdk");
const { Readable } = require("stream");
const axios = require("axios");

const pinata = new pinataSDK({ pinataJWTKey: config.pinataJwt });

/**
 * Chuyển ipfs://CID về CID thuần.
 * @param {string} uri Chuỗi IPFS URI (ví dụ: "ipfs://bafy...")
 * @returns {string} CID thuần (bafy...)
 */
function ipfsUriToCid(uri) {
  return uri?.startsWith("ipfs://") ? uri.slice(7) : uri;
}

/**
 * Chuyển ipfs://CID về gateway URL.
 * @param {string} uri Chuỗi IPFS URI (ví dụ: "ipfs://bafy...")
 * @returns {string} CID thuần (http://<gateway>/ipfs/bafy...)
 */
function ipfsUriToGatewayUrl(uri) {
  const cid = uri?.startsWith("ipfs://") ? uri.slice(7) : uri;
  return `${config.pinataGatewayBase}/ipfs/${cid}`;
}

/**
 * Tải metadata JSON từ IPFS qua gateway Pinata bằng URI hoặc CID.
 * @param {string} uriOrCid IPFS URI (ipfs://...) hoặc CID thuần
 * @returns {Promise<any>} Đối tượng JSON đã parse
 */
async function fetchJSONFromIPFS(uriOrCid) {
  const cid = ipfsUriToCid(uriOrCid);
  const url = `${config.pinataGatewayBase}/ipfs/${cid}`;
  const { data } = await axios.get(url, { responseType: "json" });
  return data;
}

/**
 * Lấy metadata JSON của chứng chỉ từ Pinata/IPFS bằng CID.
 * @param {string} cid - CID của metadata trên IPFS
 * @returns {Promise<Object|null>} - Trả về metadata JSON hoặc null nếu lỗi
 */
const getPinataMetadataByCID = async (cid) => {
  try {
    if (!cid) return null;
    // Sử dụng gateway của Pinata để lấy nội dung JSON
    const url = `${config.pinataGatewayBase}/ipfs/${cid}`;
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    console.error("Error fetching metadata from Pinata:", error.message);
    return null;
  }
};

/**
 * Chuyển Buffer thành Readable stream để upload lên Pinata.
 * @param {Buffer} buffer Nội dung cần chuyển
 * @returns {import("stream").Readable} Stream có thể đọc
 */
function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

/**
 * Upload (pin) một file nhị phân lên Pinata/IPFS từ bộ nhớ.
 * @param {string} filename Tên tệp gốc
 * @param {Buffer} buffer Dữ liệu tệp dạng Buffer
 * @param {string} mime MIME type (ví dụ: "application/pdf")
 * @returns {Promise<{ cid: string, uri: string, gateway: string, mime: string }>} Thông tin IPFS trả về
 */
async function uploadFileBuffer(filename, buffer, mime) {
  const fileStream = bufferToStream(buffer);
  const options = {
    pinataMetadata: { name: filename },
    pinataOptions: { cidVersion: 1 },
  };
  const result = await pinata.pinFileToIPFS(fileStream, options);
  const cid = result.IpfsHash;
  return {
    cid,
    uri: `ipfs://${cid}`,
    gateway: `${config.pinataGatewayBase}/ipfs/${cid}`,
    mime,
  };
}

/**
 * Upload (pin) một đối tượng JSON lên Pinata/IPFS.
 * @param {Object} obj Đối tượng JSON cần pin
 * @param {{ name?: string, keyvalues?: Record<string, any> }} [meta] Metadata Pinata (name, keyvalues)
 * @returns {Promise<{ cid: string, uri: string, gateway: string }>} Thông tin IPFS trả về
 */
async function uploadJSON(obj, meta = {}) {
  const options = {
    pinataMetadata: {
      name: meta.name || "metadata.json",
      ...(meta.keyvalues ? { keyvalues: meta.keyvalues } : {}),
    },
    pinataOptions: { cidVersion: 1 },
  };
  const result = await pinata.pinJSONToIPFS(obj, options);
  const cid = result.IpfsHash;
  return {
    cid,
    uri: `ipfs://${cid}`,
    gateway: `${config.pinataGatewayBase}/ipfs/${cid}`,
  };
}

// Cập nhật metadata (keyvalues) cho pin hiện tại trên Pinata, không đổi CID
async function updatePinataKeyvalues(cid, keyvalues) {
  return pinata.hashMetadata(cid, { keyvalues });
}

/**
 * Tìm các metadata đã pin trên Pinata theo bộ lọc keyvalues.
 * Phân trang sau đó trả về danh sách rút gọn kèm CID và URL gateway
 * @param {Record<string, { value: any, op: string }>} keyvalues Bộ lọc keyvalues theo chuẩn Pinata (op: 'eq', 'like', 'between', ...)
 * @param {number} [pageLimit=50] Giới hạn kết quả mỗi trang
 * @param {number} [pageOffset=0] Offset phân trang
 * @returns {Promise<Array<{ cid: string, uri: string, gateway: string, metadata: any, size: number, date_pinned: string, date_unpinned: string|null }>>} Danh sách kết quả
 */
// Keyvalue:
// {
//   student: { value: "0xabc...789", op: "eq" },
//   courseName: { value: "Blockchain 101", op: "eq" }
// }
async function searchMetadataByKeyvalues(
  keyvalues = {}, // bộ lọc
  pageLimit = 50, // kích thước trang
  pageOffset = 0 // vị trí bắt đầu (bỏ qua)
) {
  const options = {
    status: "pinned", // chỉ lấy các pin đang tồn tại
    pageLimit,
    pageOffset,
    metadata: {
      name: "studyhub-certificate.json", // chỉ lấy các item có tên metadata này (trùng với uploadJSON đã đặt)
      keyvalues, // bộ lọc theo chuẩn Pinata (từng key có dạng {value,op}, vd: eq, like, ... )
    },
  };
  const result = await pinata.pinList(options); // gọi API Pinata để truy vấn pin
  // Rút gọn Object
  //   {
  //    "cid": "bafkrei123...",
  //    "uri": "ipfs://bafkrei123...",
  //    "gateway": "https://gateway.pinata.cloud/ipfs/bafkrei123...",
  //    "metadata":
  //      {
  //      "name": "studyhub-certificate.json",
  //      "keyvalues": { "student": "0xabc...789", "courseName": "Blockchain 101" }
  //      },
  //    "size": 1234,
  //    "date_pinned": "2025-01-10T12:34:56Z",
  //    "date_unpinned": null
  //   }
  return (
    result?.rows?.map((row) => ({
      cid: row.ipfs_pin_hash, //
      uri: `ipfs://${row.ipfs_pin_hash}`,
      gateway: `${config.pinataGatewayBase}/ipfs/${row.ipfs_pin_hash}`,
      metadata: row.metadata, // metadata Pinata (gồm name, keyvalues)
      size: row.size,
      date_pinned: row.date_pinned,
      date_unpinned: row.date_unpinned,
    })) || []
  );
}

module.exports = {
  uploadFileBuffer,
  uploadJSON,
  searchMetadataByKeyvalues,
  fetchJSONFromIPFS,
  updatePinataKeyvalues,
  ipfsUriToGatewayUrl,
  getPinataMetadataByCID,
};
