const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = file.fieldname === "student" ? "student" : "model";
    const dir = path.join(__dirname, "..", "uploads", type);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".pdf", ".txt"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error(`Invalid file type: ${ext}. Only PDF and TXT allowed.`));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// POST /upload
router.post(
  "/",
  upload.fields([
    { name: "student", maxCount: 1 },
    { name: "model",   maxCount: 1 },
  ]),
  (req, res) => {
    try {
      const files = req.files;
      if (!files?.student || !files?.model) {
        return res.status(400).json({ error: "Both student and model files are required" });
      }
      res.json({
        message: "Files uploaded successfully",
        student: {
          filename: files.student[0].filename,
          originalname: files.student[0].originalname,
          path: files.student[0].path,
        },
        model: {
          filename: files.model[0].filename,
          originalname: files.model[0].originalname,
          path: files.model[0].path,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
