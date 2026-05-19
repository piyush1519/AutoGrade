const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");

const router = express.Router();
const PYTHON_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

router.get("/", async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  let pythonStatus = "unreachable";
  try {
    const r = await axios.get(`${PYTHON_URL}/health`, { timeout: 3000 });
    pythonStatus = r.data?.status === "ok" ? "ok" : "degraded";
  } catch (_) {}

  res.json({
    service: "autograde-node",
    status: "ok",
    mongo: mongoStatus,
    python_service: pythonStatus,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
