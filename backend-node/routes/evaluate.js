const express  = require("express");
const multer   = require("multer");
const path     = require("path");
const axios    = require("axios");
const FormData = require("form-data");
const Evaluation = require("../models/Evaluation");
const logger     = require("../middleware/logger");

const router     = express.Router();
const PYTHON_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    [".pdf",".txt",".png",".jpg",".jpeg"].includes(ext) ? cb(null,true) : cb(new Error("PDF/TXT/Image only"));
  },
  limits: { fileSize: 20*1024*1024 },
});

async function extractText(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".txt") return buffer.toString("utf-8");
  const form = new FormData();
  form.append("file", buffer, { filename, contentType: "application/octet-stream" });
  const res = await axios.post(`${PYTHON_URL}/extract-text`, form,
    { headers: form.getHeaders(), timeout: 90000 });
  return res.data.extracted_text;
}

// POST /evaluate
router.post("/",
  upload.fields([{ name:"student", maxCount:1 }, { name:"model", maxCount:1 }]),
  async (req, res) => {
    const t0 = Date.now();
    try {
      const maxMarks = parseInt(req.body?.max_marks || req.query?.max_marks || "10");
      if (![5,10].includes(maxMarks)) return res.status(400).json({ error:"max_marks must be 5 or 10" });

      let studentText, modelText;
      if (req.files?.student && req.files?.model) {
        const sf = req.files.student[0], mf = req.files.model[0];
        logger.info(`Evaluating: ${sf.originalname} vs ${mf.originalname} [${maxMarks} marks]`);
        [studentText, modelText] = await Promise.all([
          extractText(sf.buffer, sf.originalname),
          extractText(mf.buffer, mf.originalname),
        ]);
      } else if (req.body?.student_text && req.body?.model_text) {
        studentText = req.body.student_text;
        modelText   = req.body.model_text;
      } else {
        return res.status(400).json({ error:"Provide files or student_text/model_text" });
      }

      if (!studentText?.trim()) return res.status(400).json({ error:"Could not extract student text" });
      if (!modelText?.trim())   return res.status(400).json({ error:"Could not extract model text" });

      const evalRes = await axios.post(`${PYTHON_URL}/evaluate`,
        { student_text:studentText, model_text:modelText, max_marks:maxMarks },
        { timeout:90000 });
      const d = evalRes.data;
      const evalTime = Date.now() - t0;

      const doc = await Evaluation.create({
        student_answer_text: studentText,
        model_answer_text:   modelText,
        similarity_score:    d.similarity_score,
        keyword_match_ratio: d.keyword_match_ratio,
        length_ratio:        d.answer_length_ratio,
        marks:               d.marks,
        max_marks:           maxMarks,
        teacher_scores:      d.teacher_scores,
        feedback:            d.feedback,
        evaluation_time_ms:  evalTime,
      });

      logger.info(`Saved id=${doc._id} marks=${d.marks}/${maxMarks} time=${evalTime}ms`);
      res.json({ id:doc._id, student_answer_text:studentText, model_answer_text:modelText, ...d, evaluation_time_ms:evalTime, timestamp:doc.timestamp });
    } catch(err) {
      logger.error(`Evaluation error: ${err.message}`);
      res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
  }
);

// POST /evaluate/report
router.post("/report", async (req, res) => {
  try {
    const r = await axios.post(`${PYTHON_URL}/generate-report`,
      { evaluation_data: req.body }, { responseType:"arraybuffer", timeout:30000 });
    res.set({ "Content-Type":"application/pdf",
      "Content-Disposition":`attachment; filename="evaluation_report.pdf"` });
    res.send(Buffer.from(r.data));
  } catch(err) {
    logger.error(`Report error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
