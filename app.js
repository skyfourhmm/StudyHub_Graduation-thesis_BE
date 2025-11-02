const express = require("express");
const cors = require("cors");
const http = require("http");
const connectToDB = require("./src/configs/database");
const redisService = require("./src/services/redis.service");

// Routes
const authRoutes = require("./src/routes/authRoutes");
const courseRoutes = require("./src/routes/courseRoutes");
const userRoutes = require("./src/routes/userRoutes");
const certificateRoutes = require("./src/routes/certificateRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");

const testRoutes = require("./src/routes/testRoutes");
const questionRoutes = require("./src/routes/questionRoutes");
const attemptRoutes = require("./src/routes/attemptRoutes");

const testResultRoutes = require("./src/routes/testResultRoutes");
const generateTestRoutes = require("./src/routes/generateTestRoutes");

const testPoolRoutes = require("./src/routes/testPoolRoutes");

const attemptDetailRoutes = require("./src/routes/attemptDetailRoutes");

const studyRoutes = require("./src/routes/studyRoutes");

const studyStatsRoutes = require("./src/routes/studyStatsRoutes");

const grammarLessonRoutes = require("./src/routes/grammarLessonRoutes");

require("dotenv").config();

// Create Expresss App and HTTP Server
const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Config CORS
const corsOptions = {
  origin: ["http://localhost:5173"],
  credentials: true,
};
app.use(cors(corsOptions));

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/certs", certificateRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/payments", paymentRoutes);

app.use("/api/v1/tests", testRoutes);
app.use("/api/v1/questions", questionRoutes);
app.use("/api/v1/attempts", attemptRoutes);

app.use("/api/v1/test-result", testResultRoutes);
app.use("/api/v1/generate-test", generateTestRoutes); // tạm thời dùng chung
app.use("/api/v1/test-pools", testPoolRoutes);

app.use("/api/v1/attempt-details", attemptDetailRoutes);

app.use("/api/v1/study-stats", studyStatsRoutes);

app.use("/api/v1/grammar-lessons", grammarLessonRoutes);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectToDB(); // Connect to MongoDB
    await redisService.connect(); // Connect to Redis

    // Setup cleanup job (chạy mỗi giờ) để xóa token hết hạn
    setInterval(() => {
      redisService.cleanupExpiredTokens();
    }, 60 * 60 * 1000);

    // Define routes
    app.get("/", (req, res) => {
      res.status(200).json({ message: "Welcome to StudyHub API!" });
    });

    // Handle 404 errors
    app.use((req, res, next) => {
      res.status(404).json({ error: "Route not found" });
    });

    // Global error handler
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ error: "Something went wrong!" });
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("SIGTERM received, shutting down gracefully");
      await redisService.disconnect();
      server.close(() => {
        console.log("Process terminated");
      });
    });

    // Start server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1); // Escape when there is an error
  }
};

startServer();
