require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const logger = require("./middleware/logger");
const uploadRoutes = require("./routes/upload");
const evaluateRoutes = require("./routes/evaluate");
const resultRoutes = require("./routes/result");
const healthRoutes = require("./routes/health");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/autograde";

// Ensure dirs exist
["uploads/student", "uploads/model", "logs"].forEach((d) => {
  fs.mkdirSync(path.join(__dirname, d), { recursive: true });
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Routes
app.use("/upload", uploadRoutes);
app.use("/evaluate", evaluateRoutes);
app.use("/result", resultRoutes);
app.use("/health", healthRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

// Connect to MongoDB and start
mongoose
  .connect(MONGO_URI)
  .then(() => {
    logger.info(`MongoDB connected: ${MONGO_URI}`);
    app.listen(PORT, () => logger.info(`AutoGrade Node server running on port ${PORT}`));
  })
  .catch((err) => {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  });
