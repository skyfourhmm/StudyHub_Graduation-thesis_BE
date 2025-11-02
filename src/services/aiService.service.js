// services/aiService.js
const axios = require("axios");

const gradeTestWithAI = async (payload) => {
  try {
    const response = await axios.post("http://localhost:8000/grade", payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data; // dữ liệu AI trả về
  } catch (error) {
    console.error("Error calling AI service:", error.message);
    throw new Error("AI grading failed");
  }
};

module.exports = { gradeTestWithAI };
