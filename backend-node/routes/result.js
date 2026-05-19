const express = require("express");
const Evaluation = require("../models/Evaluation");

const router = express.Router();

// GET /result?id=xxx  or  GET /result  (latest)
router.get("/", async (req, res) => {
  try {
    if (req.query.id) {
      const doc = await Evaluation.findById(req.query.id);
      if (!doc) return res.status(404).json({ error: "Evaluation not found" });
      return res.json(doc);
    }
    const docs = await Evaluation.find().sort({ timestamp: -1 }).limit(20);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
