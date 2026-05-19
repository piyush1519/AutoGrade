import logging, os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from contextlib import asynccontextmanager
import nltk

from services.text_extractor import extract_text_from_file
from services.metrics        import compute_metrics
from services.ai_teacher     import teacher_evaluate
from services.report_generator import generate_report
from fuzzy_logic.grader      import FuzzyGrader

def _nltk():
    for p in ["stopwords","punkt","punkt_tab","wordnet"]:
        try: nltk.download(p, quiet=True)
        except: pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    _nltk()
    yield

app = FastAPI(title="AutoGrade Engine", version="3.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("autograde")
grader = FuzzyGrader()


class EvalRequest(BaseModel):
    student_text: str
    model_text:   str
    max_marks:    int = 10   # 5 or 10

class ReportRequest(BaseModel):
    evaluation_data: dict


@app.get("/health")
def health():
    ai_enabled = bool(os.environ.get("GEMINI_API_KEY",""))
    return {"status":"ok","service":"autograde-v3","ai_evaluation":ai_enabled}


@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        text = extract_text_from_file(contents, file.filename or "upload")
        return {"extracted_text": text, "filename": file.filename, "char_count": len(text)}
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        raise HTTPException(500, str(e))


@app.post("/evaluate")
def evaluate(req: EvalRequest):
    try:
        if not req.student_text.strip(): raise HTTPException(400, "Student text is empty")
        if not req.model_text.strip():   raise HTTPException(400, "Model text is empty")
        if req.max_marks not in [5,10]:  raise HTTPException(400, "max_marks must be 5 or 10")

        # Step 1: traditional NLP metrics
        metrics = compute_metrics(req.student_text, req.model_text)

        # Step 2: AI teacher deep evaluation
        teacher = teacher_evaluate(req.student_text, req.model_text, req.max_marks)

        # Step 3: advanced fuzzy logic with all inputs
        final_marks, marks_10 = grader.grade(
            similarity       = metrics["similarity_score"],
            keyword_match    = metrics["keyword_match_ratio"],
            length_ratio     = metrics["answer_length_ratio"],
            content_accuracy = teacher.get("content_accuracy"),
            concept_coverage = teacher.get("concept_coverage"),
            depth            = teacher.get("depth_of_understanding"),
            factual          = teacher.get("factual_correctness"),
            max_marks        = req.max_marks,
        )

        return {
            **metrics,
            "marks":          final_marks,
            "marks_out_of_10": round(marks_10, 2),
            "max_marks":      req.max_marks,
            "teacher_scores": {
                "content_accuracy":       teacher.get("content_accuracy"),
                "concept_coverage":       teacher.get("concept_coverage"),
                "depth_of_understanding": teacher.get("depth_of_understanding"),
                "presentation_quality":   teacher.get("presentation_quality"),
                "factual_correctness":    teacher.get("factual_correctness"),
            },
            "feedback": {
                "verdict":              teacher.get("verdict"),
                "mark_reason":          teacher.get("mark_reason"),
                "strengths":            teacher.get("strengths",[]),
                "weaknesses":           teacher.get("weaknesses",[]),
                "missing_concepts":     teacher.get("missing_concepts",[]),
                "correct_points":       teacher.get("correct_points",[]),
                "incorrect_points":     teacher.get("incorrect_points",[]),
                "teacher_suggestion":   teacher.get("teacher_suggestion"),
                "source":               teacher.get("source"),
            }
        }
    except HTTPException: raise
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        raise HTTPException(500, str(e))


@app.post("/generate-report")
def gen_report(req: ReportRequest):
    try:
        pdf = generate_report(req.evaluation_data)
        return Response(content=pdf, media_type="application/pdf",
            headers={"Content-Disposition":"attachment; filename=evaluation_report.pdf"})
    except Exception as e:
        logger.error(f"Report failed: {e}")
        raise HTTPException(500, str(e))
