import re
import math
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk.corpus import stopwords

logger = logging.getLogger("autograde-python.metrics")

try:
    STOP_WORDS = set(stopwords.words("english"))
except Exception:
    STOP_WORDS = set()


def _clean_text(text: str) -> str:
    """Lowercase, remove special chars."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _tokenize(text: str) -> list[str]:
    words = _clean_text(text).split()
    return [w for w in words if w not in STOP_WORDS and len(w) > 1]


def compute_similarity(student: str, model: str) -> float:
    """Cosine similarity using TF-IDF."""
    try:
        vectorizer = TfidfVectorizer(stop_words="english", min_df=1)
        tfidf = vectorizer.fit_transform([model, student])
        score = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
        return float(min(max(score, 0.0), 1.0))
    except Exception as e:
        logger.warning(f"Similarity computation failed: {e}")
        return 0.0


def compute_keyword_match(student: str, model: str) -> float:
    """Fraction of model keywords present in student answer."""
    model_tokens = set(_tokenize(model))
    student_tokens = set(_tokenize(student))
    if not model_tokens:
        return 0.0
    matched = model_tokens & student_tokens
    return float(len(matched) / len(model_tokens))


def compute_length_ratio(student: str, model: str) -> float:
    """Ratio of student length to model length, clamped to [0, 1]."""
    s_words = len(_tokenize(student))
    m_words = len(_tokenize(model))
    if m_words == 0:
        return 0.0
    ratio = s_words / m_words
    # Map: 0.5-1.5 → ~0.9-1.0, extremes penalized
    # Normalize: ideal is 1.0 → return 1.0, shorter/longer → lower
    normalized = 1.0 - abs(1.0 - min(ratio, 2.0)) / 2.0
    return float(max(0.0, normalized))


def compute_metrics(student_text: str, model_text: str) -> dict:
    """Compute all evaluation metrics."""
    similarity = compute_similarity(student_text, model_text)
    keyword_match = compute_keyword_match(student_text, model_text)
    length_ratio = compute_length_ratio(student_text, model_text)

    logger.info(
        f"Metrics → similarity={similarity:.3f}, "
        f"keyword={keyword_match:.3f}, length={length_ratio:.3f}"
    )
    return {
        "similarity_score": round(similarity, 4),
        "keyword_match_ratio": round(keyword_match, 4),
        "answer_length_ratio": round(length_ratio, 4),
    }
