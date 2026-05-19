import io
import logging
import numpy as np
import cv2
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
from pdf2image import convert_from_bytes

logger = logging.getLogger("autograde-python.ocr")


def extract_text_from_file(contents: bytes, filename: str) -> str:
    fname = filename.lower()
    if fname.endswith(".pdf"):
        return _extract_from_pdf(contents)
    elif fname.endswith(".txt"):
        return contents.decode("utf-8", errors="ignore")
    else:
        try:
            return _extract_from_image_bytes(contents)
        except Exception:
            return contents.decode("utf-8", errors="ignore")


def extract_text_from_string(text: str) -> str:
    return text.strip()


def _extract_from_pdf(contents: bytes) -> str:
    logger.info("Extracting text from PDF using enhanced OCR")
    try:
        images = convert_from_bytes(contents, dpi=300)
    except Exception as e:
        raise RuntimeError(f"Failed to convert PDF: {e}")

    all_text = []
    for i, pil_image in enumerate(images):
        text = _ocr_with_fallback(pil_image, page=i + 1)
        if text.strip():
            all_text.append(text)
        logger.debug(f"Page {i+1}: extracted {len(text)} chars")

    return "\n".join(all_text).strip()


def _extract_from_image_bytes(contents: bytes) -> str:
    pil_image = Image.open(io.BytesIO(contents))
    return _ocr_with_fallback(pil_image)


def _ocr_with_fallback(pil_image: Image.Image, page: int = 1) -> str:
    """Try multiple preprocessing strategies and return the best result."""
    strategies = [
        ("adaptive_threshold", _preprocess_adaptive),
        ("otsu_threshold",     _preprocess_otsu),
        ("contrast_enhanced",  _preprocess_contrast),
        ("raw",                _preprocess_raw),
    ]

    best_text = ""
    for name, preprocess_fn in strategies:
        try:
            img_array = preprocess_fn(pil_image)
            for psm in [6, 11, 13]:
                config = f"--psm {psm} --oem 3"
                text = pytesseract.image_to_string(img_array, config=config).strip()
                text = _clean_ocr_output(text)
                if len(text) > len(best_text):
                    best_text = text
                    logger.debug(f"Page {page} strategy={name} psm={psm} chars={len(text)}: {text[:80]!r}")
        except Exception as e:
            logger.warning(f"Strategy {name} failed: {e}")

    return best_text


def _to_cv2(pil_image: Image.Image) -> np.ndarray:
    img = pil_image.convert("RGB")
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)


def _preprocess_adaptive(pil_image: Image.Image) -> np.ndarray:
    """Adaptive threshold — best for handwriting with uneven lighting."""
    img = _to_cv2(pil_image)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    h, w = gray.shape
    if max(h, w) < 1500:
        gray = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)

    gray = cv2.fastNlMeansDenoising(gray, h=10)
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=31,
        C=15
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    thresh = cv2.dilate(thresh, kernel, iterations=1)
    return thresh


def _preprocess_otsu(pil_image: Image.Image) -> np.ndarray:
    """Otsu binarization — good for printed text."""
    img = _to_cv2(pil_image)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    if max(h, w) < 1500:
        gray = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresh


def _preprocess_contrast(pil_image: Image.Image) -> np.ndarray:
    """High contrast + sharpening — helps faint/light handwriting."""
    img = pil_image.convert("L")
    w, h = img.size
    if max(w, h) < 1500:
        img = img.resize((w * 2, h * 2), Image.LANCZOS)
    img = ImageEnhance.Contrast(img).enhance(3.0)
    img = img.filter(ImageFilter.SHARPEN)
    img = img.filter(ImageFilter.SHARPEN)
    arr = np.array(img)
    _, thresh = cv2.threshold(arr, 140, 255, cv2.THRESH_BINARY)
    return thresh


def _preprocess_raw(pil_image: Image.Image) -> Image.Image:
    """No preprocessing baseline."""
    return pil_image.convert("RGB")


def _clean_ocr_output(text: str) -> str:
    import re
    lines = text.splitlines()
    clean = [line for line in lines if re.search(r'[a-zA-Z0-9]', line)]
    return "\n".join(clean).strip()
