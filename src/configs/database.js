const mongoose = require("mongoose");
require("dotenv").config();
const config = require("../configs/config");

const connectToDB = async () => {
  try {
    const uri = config.mongoDBUri;
    await mongoose.connect(uri);
    console.log("Connected to MongoDB successfully!");
  } catch (error) {
    console.error("Error connecting to MongoDB: ", error);
    process.exit(1);
  }
};

module.exports = connectToDB;
