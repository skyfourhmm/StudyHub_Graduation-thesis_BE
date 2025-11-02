const axios = require("axios");

const generateTestController = async (req, res) => {
  try {
    const {
      testId,
      exam_type,
      topic,
      question_types,
      num_questions,
      score_range,
    } = req.body;

    // Validate input
    if (!topic || !Array.isArray(question_types) || num_questions <= 0) {
      return res.status(400).json({ error: "Invalid input" });
    }

    if (!testId) {
      return res.status(400).json({ error: "testId is required" });
    }
    console.log("Generating test with:");

    // Call AI service
    const response = await axios.post("http://localhost:8000/generate-test", {
      topic,
      question_types,
      num_questions,
      exam_type,
      score_range,
    });

    // Lấy mảng câu hỏi thực sự
    const aiData = response?.data?.data; // fix 2 lớp data
    // console.log("AI response data:", aiData);

    // if (!aiData || !Array.isArray(aiData)) {
    //   console.error("AI response is invalid:", response.data);
    //   return res
    //     .status(500)
    //     .json({ error: "Invalid response from AI service" });
    // }

    // Transform questions
    const dbPayload = transformAIQuestions(aiData, testId, num_questions);
    // console.log("Transformed questions for DB:", dbPayload);
    const createdBy = req.user ? req.user.userId : null;
    console.log("questions:", { ...dbPayload, createdBy });

    // Gọi API bulk để lưu vào database
    const bulkResponse = await axios.post(
      "http://localhost:3000/api/v1/questions/bulk",
      { ...dbPayload, createdBy, exam_type, score_range }
    );
    console.log("Bulk insert response:", bulkResponse.data);

    res.status(200).json({
      message: "Test generated and questions saved successfully",
      data: bulkResponse.data,
    });
  } catch (error) {
    console.error("Error generating test or saving questions:", error);
    res
      .status(500)
      .json({ error: "Failed to generate and save test questions" });
  }
};

function transformAIQuestions(aiData, testId, numQuestions) {
  const pointsPerQuestion = parseFloat((10 / numQuestions).toFixed(2)); // tính điểm trên thang 10

  return {
    questions: aiData?.map((q) => {
      const options = q.options.map((opt) => ({
        optionText: opt,
        isCorrect: opt === q.answer,
      }));

      return {
        testId,
        questionText: q.question,
        questionType: q.type,
        options,
        points: pointsPerQuestion,
        skill: q.skill,
        topic: q.topic,
        description: q.explanation,
      };
    }),
  };
}

module.exports = {
  generateTestController,
};
