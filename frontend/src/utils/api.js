import axios from "axios";
const BASE = process.env.REACT_APP_API_URL || "/api";
const api  = axios.create({ baseURL:BASE, timeout:150000 });

export const evaluateFiles = async (studentFile, modelFile, maxMarks, onProgress) => {
  const form = new FormData();
  form.append("student", studentFile);
  form.append("model",   modelFile);
  form.append("max_marks", String(maxMarks));
  const r = await api.post("/evaluate", form, {
    headers:{"Content-Type":"multipart/form-data"},
    onUploadProgress: e => e.total && onProgress?.(Math.round(e.loaded/e.total*100)),
  });
  return r.data;
};

export const evaluateText = async (studentText, modelText, maxMarks) => {
  const r = await api.post("/evaluate", { student_text:studentText, model_text:modelText, max_marks:maxMarks });
  return r.data;
};

export const downloadReport = async (data) => {
  const r = await api.post("/evaluate/report", data, { responseType:"blob" });
  const url  = URL.createObjectURL(new Blob([r.data],{type:"application/pdf"}));
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `AutoGrade_Report_${Date.now()}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
};

export const getResults = async () => (await api.get("/result")).data;
export const getHealth  = async () => (await api.get("/health")).data;
