"""
AI Teacher Engine — evaluates student answers like an expert teacher.
Completely internal. No external branding exposed.
"""
import os, json, re, logging
logger = logging.getLogger("autograde.ai_teacher")

_client = None

def _get_client():
    global _client
    if _client is None:
        key = os.environ.get("GEMINI_API_KEY","")
        if not key: return None
        try:
            import google.generativeai as genai
            genai.configure(api_key=key)
            _client = genai.GenerativeModel("gemini-1.5-flash-latest")
            logger.info("AI teacher engine initialized")
        except Exception as e:
            logger.error(f"AI teacher init failed: {e}")
    return _client


def teacher_evaluate(student_text: str, model_text: str, max_marks: int = 10) -> dict:
    """
    Core evaluation: AI teacher reviews student answer against model answer.
    Returns structured scores + feedback used by fuzzy logic engine.
    """
    client = _get_client()
    if client:
        try:
            return _ai_evaluate(client, student_text, model_text, max_marks)
        except Exception as e:
            logger.warning(f"AI evaluation failed, falling back: {e}")
    return _rule_evaluate(student_text, model_text, max_marks)


def _ai_evaluate(client, student_text, model_text, max_marks):
    prompt = f"""You are an experienced {max_marks}-mark exam teacher evaluating a student's handwritten answer.

QUESTION MAX MARKS: {max_marks}

MODEL ANSWER (correct/expected answer):
\"\"\"
{model_text[:3000]}
\"\"\"

STUDENT ANSWER (extracted from handwritten scan):
\"\"\"
{student_text[:3000]}
\"\"\"

Evaluate the student answer as a strict but fair teacher. Respond ONLY with valid JSON, no markdown, no backticks:
{{
  "content_accuracy": 0.82,
  "concept_coverage": 0.75,
  "depth_of_understanding": 0.70,
  "presentation_quality": 0.80,
  "factual_correctness": 0.85,
  "verdict": "One sentence summary of the answer quality",
  "mark_reason": "2-3 sentences explaining the marks. Be specific about what was right and wrong.",
  "strengths": ["specific strength 1", "specific strength 2"],
  "weaknesses": ["specific weakness 1", "specific weakness 2"],
  "missing_concepts": ["concept not covered 1", "concept not covered 2"],
  "correct_points": ["point correctly answered 1", "point correctly answered 2"],
  "incorrect_points": ["point answered incorrectly or missing 1"],
  "teacher_suggestion": "Specific advice the teacher would give this student to improve.",
  "estimated_marks": {max_marks * 0.7}
}}

All score fields (content_accuracy, concept_coverage, depth_of_understanding, presentation_quality, factual_correctness) must be floats between 0.0 and 1.0.
estimated_marks must be between 0 and {max_marks}."""

    response = client.generate_content(prompt)
    raw = response.text.strip()
    raw = re.sub(r"^```(?:json)?\s*","", raw)
    raw = re.sub(r"\s*```$","", raw)
    data = json.loads(raw)

    # Normalize all score fields to [0,1]
    for field in ["content_accuracy","concept_coverage","depth_of_understanding",
                  "presentation_quality","factual_correctness"]:
        v = float(data.get(field, 0.5))
        data[field] = max(0.0, min(1.0, v))

    em = float(data.get("estimated_marks", max_marks * 0.5))
    data["estimated_marks"] = max(0, min(max_marks, em))
    data["source"] = "ai_teacher"
    data["max_marks"] = max_marks
    logger.info(f"AI teacher scored: {data['estimated_marks']}/{max_marks}")
    return data


def _rule_evaluate(student_text, model_text, max_marks):
    """Fallback rule-based evaluation when AI is unavailable."""
    import re as _re
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    def tok(t): return set(_re.findall(r'\b[a-zA-Z]{3,}\b', t.lower()))
    sw = tok(student_text); mw = tok(model_text)
    matched = sw & mw; missing = list(mw - sw)[:6]

    try:
        vec = TfidfVectorizer(stop_words="english")
        tfidf = vec.fit_transform([model_text, student_text])
        sim = float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0])
    except: sim = len(matched)/max(len(mw),1)

    kw_ratio = len(matched)/max(len(mw),1)
    ln_ratio  = min(len(sw)/max(len(mw),1), 1.5)
    depth     = min(sim * 1.1, 1.0)
    accuracy  = (sim + kw_ratio) / 2
    estimated = round(accuracy * max_marks, 2)

    if   estimated >= max_marks*0.8: verdict = "Excellent answer demonstrating thorough understanding."
    elif estimated >= max_marks*0.6: verdict = "Good answer with some gaps in coverage."
    elif estimated >= max_marks*0.4: verdict = "Partial answer — key concepts missing."
    else:                             verdict = "Answer needs significant improvement."

    return {
        "content_accuracy":       round(accuracy, 3),
        "concept_coverage":       round(kw_ratio, 3),
        "depth_of_understanding": round(depth, 3),
        "presentation_quality":   round(min(ln_ratio*0.8, 1.0), 3),
        "factual_correctness":    round(sim, 3),
        "verdict":                verdict,
        "mark_reason":            f"Based on content similarity ({sim:.0%}) and keyword coverage ({kw_ratio:.0%}), the answer demonstrates {'strong' if sim>0.7 else 'partial' if sim>0.4 else 'weak'} understanding.",
        "strengths":              [f"Covered {len(matched)} of {len(mw)} key concepts"] if matched else ["Attempted the answer"],
        "weaknesses":             [f"Missing concepts: {', '.join(list(missing)[:4])}"] if missing else ["Minor gaps"],
        "missing_concepts":       missing[:6],
        "correct_points":         [f"Correctly mentioned: {w}" for w in list(matched)[:4]],
        "incorrect_points":       [f"Missing: {w}" for w in missing[:3]],
        "teacher_suggestion":     f"Study these missing topics: {', '.join(missing[:4])}." if missing else "Review the model answer for additional depth.",
        "estimated_marks":        estimated,
        "source":                 "rule_based",
        "max_marks":              max_marks,
    }
