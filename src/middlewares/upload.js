const multer = require("multer");

// Use memory storage so we can forward the buffer to Pinata
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;
