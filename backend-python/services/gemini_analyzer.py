"""
Gemini API integration for deep contextual analysis of student vs model answers.
Returns structured feedback: reasons, strengths, weaknesses, missing concepts.
"""
import logging
import os
import json
import re

logger = logging.getLogger("autograde-python.gemini")

_gemini_client = None

def _get_client():
    global _gemini_client
    if _gemini_client is None:
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            return None
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            _gemini_client = genai.GenerativeModel("gemini-1.5-flash")
            logger.info("Gemini client initialized")
        except Exception as e:
            logger.error(f"Gemini init failed: {e}")
            return None
    return _gemini_client


def analyze_with_gemini(student_text: str, model_text: str, marks: float, metrics: dict) -> dict:
    """
    Use Gemini to produce deep contextual feedback.
    Falls back to rule-based reasoning if Gemini is unavailable.
    """
    client = _get_client()
    if client:
        try:
            return _gemini_analysis(client, student_text, model_text, marks, metrics)
        except Exception as e:
            logger.warning(f"Gemini analysis failed, using fallback: {e}")
    return _fallback_analysis(student_text, model_text, marks, metrics)


def _gemini_analysis(client, student_text: str, model_text: str, marks: float, metrics: dict) -> dict:
    prompt = f"""You are an expert academic evaluator. Analyze the student's answer against the model answer and provide detailed structured feedback.

MODEL ANSWER:
{model_text[:2000]}

STUDENT ANSWER:
{student_text[:2000]}

COMPUTED METRICS:
- Similarity Score: {metrics['similarity_score']:.2f} (0-1)
- Keyword Match Ratio: {metrics['keyword_match_ratio']:.2f} (0-1)
- Length Ratio: {metrics['answer_length_ratio']:.2f} (0-1)
- Fuzzy Logic Marks Assigned: {marks:.1f}/10

Respond ONLY with a JSON object (no markdown, no backticks) with this exact structure:
{{
  "overall_verdict": "One sentence verdict on the answer quality",
  "mark_justification": "2-3 sentences explaining exactly why these marks were given",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "missing_concepts": ["concept 1", "concept 2"],
  "correct_points": ["point student got right 1", "point student got right 2"],
  "incorrect_points": ["point student got wrong 1", "point student got wrong 2"],
  "improvement_suggestions": "Specific actionable advice for the student",
  "context_match_score": 0.75,
  "context_match_explanation": "Explanation of how well the context/meaning matches"
}}"""

    response = client.generate_content(prompt)
    raw = response.text.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    data = json.loads(raw)
    data["source"] = "gemini"
    return data


def _fallback_analysis(student_text: str, model_text: str, marks: float, metrics: dict) -> dict:
    """Rule-based feedback when Gemini is unavailable."""
    import re as _re

    sim   = metrics["similarity_score"]
    kw    = metrics["keyword_match_ratio"]
    ln    = metrics["answer_length_ratio"]

    # Extract keywords from model
    model_words  = set(_re.findall(r'\b[a-zA-Z]{4,}\b', model_text.lower()))
    student_words = set(_re.findall(r'\b[a-zA-Z]{4,}\b', student_text.lower()))
    matched   = model_words & student_words
    missing   = list(model_words - student_words)[:5]

    strengths, weaknesses = [], []

    if sim >= 0.7:
        strengths.append("Answer is highly similar in content to the model answer")
    elif sim >= 0.4:
        strengths.append("Answer covers some of the expected content")
    else:
        weaknesses.append("Answer content significantly differs from the model answer")

    if kw >= 0.7:
        strengths.append("Most key concepts and terminology are present")
    elif kw >= 0.4:
        weaknesses.append("Some important keywords and concepts are missing")
    else:
        weaknesses.append("Many key concepts are absent from the answer")

    if 0.6 <= ln <= 1.3:
        strengths.append("Answer length is appropriate relative to the model")
    elif ln < 0.4:
        weaknesses.append("Answer is too brief — lacks sufficient detail")
    else:
        weaknesses.append("Answer may be too verbose or off-topic")

    if marks >= 8:
        verdict = "Excellent answer demonstrating strong understanding."
        justification = f"Marks of {marks:.1f}/10 awarded for high similarity ({sim:.0%}), strong keyword coverage ({kw:.0%}), and appropriate length. The answer closely aligns with the model in both content and structure."
    elif marks >= 6:
        verdict = "Good answer with room for improvement."
        justification = f"Marks of {marks:.1f}/10 awarded. The answer shows reasonable understanding (similarity: {sim:.0%}) but misses some key concepts (keyword match: {kw:.0%}). Additional detail on core concepts would improve the score."
    elif marks >= 4:
        verdict = "Partial understanding demonstrated."
        justification = f"Marks of {marks:.1f}/10 awarded. While some concepts are present (similarity: {sim:.0%}), significant gaps remain (keyword match: {kw:.0%}). The answer needs more depth and coverage of key ideas."
    else:
        verdict = "Answer requires significant improvement."
        justification = f"Marks of {marks:.1f}/10 awarded due to low content similarity ({sim:.0%}) and poor keyword coverage ({kw:.0%}). The answer does not adequately address the question."

    return {
        "source": "rule_based",
        "overall_verdict": verdict,
        "mark_justification": justification,
        "strengths": strengths if strengths else ["Some relevant content is present"],
        "weaknesses": weaknesses if weaknesses else ["Minor gaps in coverage"],
        "missing_concepts": missing,
        "correct_points": [f"Mentioned: {w}" for w in list(matched)[:4]],
        "incorrect_points": [f"Missing key term: {w}" for w in missing[:3]],
        "improvement_suggestions": f"Focus on including: {', '.join(missing[:5])}. Study the model answer structure carefully." if missing else "Review the model answer for additional depth.",
        "context_match_score": round((sim + kw) / 2, 2),
        "context_match_explanation": f"Based on lexical similarity ({sim:.0%}) and keyword overlap ({kw:.0%}).",
    }
