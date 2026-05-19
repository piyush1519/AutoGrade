const mongoose = require("mongoose");
const s = new mongoose.Schema({
  student_answer_text: { type:String, required:true },
  model_answer_text:   { type:String, required:true },
  similarity_score:    Number, keyword_match_ratio: Number,
  length_ratio:        Number, marks: Number, max_marks: Number,
  teacher_scores:      mongoose.Schema.Types.Mixed,
  feedback:            mongoose.Schema.Types.Mixed,
  evaluation_time_ms:  Number,
  timestamp:           { type:Date, default:Date.now },
}, { collection:"evaluations" });
module.exports = mongoose.model("Evaluation", s);
