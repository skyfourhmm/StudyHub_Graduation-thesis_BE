const express = require("express");
const cors = require("cors");
const http = require("http");
const connectToDB = require("./configs/database"); // bỏ src/ đầu tiên
const redisService = require("./services/redis.service");

// Routes
const authRoutes = require("./routes/authRoutes");
const courseRoutes = require("./routes/courseRoutes");
const userRoutes = require("./routes/userRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const testRoutes = require("./routes/testRoutes");
const questionRoutes = require("./routes/questionRoutes");
const attemptRoutes = require("./routes/attemptRoutes");

const testResultRoutes = require("./routes/testResultRoutes");
const generateTestRoutes = require("./routes/generateTestRoutes");
const testPoolRoutes = require("./routes/testPoolRoutes");
const attemptDetailRoutes = require("./routes/attemptDetailRoutes");
const studyRoutes = require("./routes/studyRoutes");
const studyStatsRoutes = require("./routes/studyStatsRoutes");
const grammarLessonRoutes = require("./routes/grammarLessonRoutes");

require("dotenv").config();

// Create Express App and HTTP Server
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
app.use("/api/v1/generate-test", generateTestRoutes);
app.use("/api/v1/test-pools", testPoolRoutes);

app.use("/api/v1/attempt-details", attemptDetailRoutes);
app.use("/api/v1/study-stats", studyStatsRoutes);
app.use("/api/v1/grammar-lessons", grammarLessonRoutes);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectToDB(); // Connect to MongoDB
    await redisService.connect(); // Connect to Redis

    // Cleanup expired tokens every hour
    setInterval(() => {
      redisService.cleanupExpiredTokens();
    }, 60 * 60 * 1000);

    // Root route
    app.get("/", (req, res) => {
      res.status(200).json({ message: "Welcome to StudyHub API!" });
    });

    // 404 handler
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
    process.exit(1);
  }
};

startServer();
