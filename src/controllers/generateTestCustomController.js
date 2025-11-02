const axios = require("axios");

// Hàm ánh xạ loại câu hỏi từ AI sang loại câu hỏi trong DB
function mapQuestionTypeToDb(aiType) {
  switch (aiType?.toLowerCase()) {
    case "mcq":
      return "multiple_choice";
    case "gap-fill":
      return "fill_blank";
    // Thêm các trường hợp khác nếu AI trả về các loại câu hỏi khác
    default:
      return "multiple_choice"; // Giá trị mặc định an toàn
  }
}

// Hàm chuyển đổi giữ nguyên
function transformAIQuestions(aiData, testId, numQuestions) {
  const pointsPerQuestion = parseFloat((10 / numQuestions).toFixed(2));

  return {
    questions: aiData?.map((q) => {
      const options = q.options.map((opt) => ({
        optionText: opt,
        isCorrect: opt === q.answer,
      }));

      return {
        testId,
        questionText: q.question,
        questionType: mapQuestionTypeToDb(q.type),
        options,
        points: pointsPerQuestion,
        skill: q.skill,
        topic: q.topic,
        description: q.explanation,
      };
    }),
  };
}

const generateTestCustomController = async (req, res) => {
  try {
    // -----------------------------------------------------
    // 1. ÁNH XẠ DỮ LIỆU ĐẦU VÀO TỪ FORM FRONTEND
    // -----------------------------------------------------
    const {
      testId, // Cần được thêm vào payload từ frontend khi gọi API
      topics, // Mảng các topics đã chọn
      numQuestions, // Số lượng câu hỏi (từ form)
      timeLimit, // Thời gian làm bài (từ form)
      toeicScore, // Điểm TOEIC (dạng chuỗi)
      level, // Cấp độ (A1, B1, C2,...)
      difficulty, // Độ khó (Easier, Moderate, Harder)
      weakSkills, // Mảng các kỹ năng yếu (Grammar, Vocabulary)
      testAttemptId, // ID lần làm bài (nếu cần)
      question_ratio, // Tỷ lệ loại câu hỏi (nếu có)
      // Các trường khác: goals, description, title...
    } = req.body;

    // -----------------------------------------------------
    // 2. CHUYỂN ĐỔI DỮ LIỆU VÀ VALIDATION CẦN THIẾT
    // -----------------------------------------------------
    const num_questions = parseInt(numQuestions);
    const time_limit = parseInt(timeLimit);
    const toeic_score = toeicScore ? parseInt(toeicScore) : null;

    // VALIDATION
    if (!topics || topics.length === 0 || num_questions <= 0 || !testId) {
      return res.status(400).json({
        error:
          "Required fields (topics, numQuestions, testId) are missing or invalid.",
      });
    }

    // -----------------------------------------------------
    // 3. TẠO PAYLOAD CHÍNH XÁC CHO API AI
    // -----------------------------------------------------
    // Giả định exam_type là 'TOEIC' hoặc 'GENERAL' tùy theo mục tiêu/bối cảnh
    // Ở đây dùng TOEIC theo mẫu bạn cung cấp
    const aiPayload = {
      current_level: level,
      toeic_score: toeic_score,
      weak_skills: weakSkills,
      exam_type: "TOEIC", // Có thể thay bằng level nếu cần linh hoạt hơn
      topics: topics, // Truyền trực tiếp mảng topics
      difficulty: difficulty.toLowerCase(), // 'easier', 'moderate', 'harder'
      // Giả định question_ratio là MCQ vì frontend chỉ có MCQ
      question_ratio: question_ratio,
      num_questions: num_questions,
      time_limit: time_limit,
    };

    console.log("AI Service Payload:", aiPayload);

    // -----------------------------------------------------
    // 4. GỌI DỊCH VỤ AI VỚI CẤU TRÚC MỚI
    // -----------------------------------------------------
    const aiResponse = await axios.post(
      "http://localhost:8000/generate-test-custom", // ✅ Cập nhật Endpoint
      aiPayload // ✅ Sử dụng Payload mới
    );

    // Lấy mảng câu hỏi thực sự (Giả định cấu trúc data trả về vẫn giống cũ)
    const aiData = aiResponse?.data?.data;

    if (!aiData || !Array.isArray(aiData) || aiData.length === 0) {
      console.error("AI response is invalid or empty:", aiResponse.data);
      return res.status(500).json({
        error:
          "Invalid or empty response from AI service. Could not generate questions.",
      });
    }

    // -----------------------------------------------------
    // 5. CHUYỂN ĐỔI VÀ LƯU VÀO DB
    // -----------------------------------------------------
    const dbPayload = transformAIQuestions(aiData, testId, num_questions);
    const createdBy = req.user ? req.user.userId : null;

    // Gọi API bulk để lưu vào database
    const bulkResponse = await axios.post(
      "http://localhost:3000/api/v1/questions/bulk",
      // Truyền thêm các meta-data cần thiết cho bảng Questions
      {
        ...dbPayload,
        createdBy,
        testAttemptId, // Nếu cần lưu liên kết với lần làm bài
        exam_type: "TOEIC", // Hoặc level
        score_range: `${toeic_score - 100}-${toeic_score + 100}`, // Ví dụ tạo score_range để lưu
      }
    );
    console.log("Bulk insert response:", bulkResponse.data);

    res.status(200).json({
      message: "Test generated and questions saved successfully",
      data: bulkResponse.data,
    });
  } catch (error) {
    console.error("Error generating test or saving questions:", error.message);
    if (error.response) {
      console.error("AI Service Response Error:", error.response.data);
    }
    res
      .status(500)
      .json({ error: "Failed to generate and save test questions" });
  }
};

module.exports = {
  generateTestCustomController,
};
