# AutoGrade

**AI-powered answer evaluation using Fuzzy Logic**

AutoGrade automatically evaluates a student answer against a model answer and assigns marks (0–10) using a Mamdani Fuzzy Inference System.

---

## 🚀 Live Deployment

| Service | Platform | URL |
|---------|----------|-----|
| ⚛️ React Frontend | Vercel | [autograde.vercel.app](https://autograde.vercel.app) |
| 🟢 Node.js API | Render | https://autograde-node.onrender.com |
| 🐍 Python FastAPI | Render | https://autograde-python.onrender.com |
| 🍃 MongoDB | Atlas | Managed Cloud |

> ⚠️ **Note on Free Tier (Render):** Render free services spin down after 15 minutes of inactivity. The first request after a period of inactivity may take **~30 seconds** to wake up. This is expected behavior on the free plan.

---

## Architecture

```
Browser (React)
    │
    ▼
Nginx (port 80) ──── /api/ ──► Node.js (port 5000) ──► MongoDB (port 27017)
                                        │
                                        ▼
                               Python FastAPI (port 8000)
                               ├── Tesseract OCR
                               ├── TF-IDF Metrics
                               └── Fuzzy Logic Grader
```

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/piyush1519/AutoGrade.git
cd AutoGrade

# Start all services
docker-compose up --build

# App is available at http://localhost:8080
```

---

## How It Works

### 1. Text Extraction
- **PDF files** → `pdf2image` converts pages to images → `Tesseract OCR` extracts text
- **TXT files** → read directly

### 2. Evaluation Metrics (all normalized 0–1)

| Metric | Description |
|--------|-------------|
| `similarity_score` | Cosine similarity via TF-IDF |
| `keyword_match_ratio` | Fraction of model keywords in student answer |
| `answer_length_ratio` | Closeness of lengths (ideal = 1.0) |

### 3. Fuzzy Logic Grading (Mamdani FIS)

**Membership Functions (triangular):**

| Variable | Sets |
|----------|------|
| Similarity | Low [0,0,0.5], Medium [0.25,0.5,0.75], High [0.5,1,1] |
| Keyword | Poor [0,0,0.5], Average [0.25,0.5,0.75], Good [0.5,1,1] |
| Length | Short [0,0,0.5], Normal [0.25,0.6,0.85], Long [0.7,1,1] |
| Marks | Low [0,0,5], Medium [2.5,5,7.5], High [5,10,10] |

**Rule Base:**

| Rule | Condition | Output |
|------|-----------|--------|
| R1 | sim=HIGH ∧ kw=GOOD ∧ len=NORMAL | marks=HIGH |
| R2 | sim=MEDIUM ∧ kw=AVERAGE | marks=MEDIUM |
| R3 | sim=LOW | marks=LOW |
| R4 | sim=HIGH ∧ kw=POOR | marks=MEDIUM |
| R5 | sim=MEDIUM ∧ len=SHORT | marks=LOW |

**Defuzzification:** Centroid method

---

## API Reference

### `POST /api/evaluate`
Evaluate answers. Accepts either file upload or JSON body.

**File upload:**
```
Content-Type: multipart/form-data
student: <file>
model:   <file>
```

**Text input:**
```json
{ "student_text": "...", "model_text": "..." }
```

**Response:**
```json
{
  "id": "...",
  "marks": 7.42,
  "similarity_score": 0.81,
  "keyword_match_ratio": 0.73,
  "answer_length_ratio": 0.88,
  "evaluation_time_ms": 312,
  "student_answer_text": "...",
  "model_answer_text": "...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### `GET /api/result`
Returns last 20 evaluations from MongoDB.

### `GET /api/health`
Returns system status including MongoDB and Python service health.

---

## Project Structure

```
AutoGrade/
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── App.js
│       ├── utils/api.js
│       └── components/
│           ├── DropZone.jsx
│           ├── MarksDisplay.jsx
│           ├── MetricBar.jsx
│           ├── TextPreview.jsx
│           └── HistoryPanel.jsx
├── backend-node/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   ├── routes/
│   │   ├── evaluate.js
│   │   ├── upload.js
│   │   ├── result.js
│   │   └── health.js
│   ├── models/
│   │   └── Evaluation.js
│   └── middleware/
│       └── logger.js
├── backend-python/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   ├── services/
│   │   ├── text_extractor.py
│   │   └── metrics.py
│   └── fuzzy_logic/
│       └── grader.py
├── uploads/
│   ├── student/
│   └── model/
└── logs/
```

---

## Environment Variables

### backend-node
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | HTTP port |
| `MONGO_URI` | mongodb://mongo:27017/autograde | MongoDB connection |
| `PYTHON_SERVICE_URL` | http://backend-python:8000 | Python FIS service |

### frontend
| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | /api | API base URL |

---

## Development (without Docker)

```bash
# MongoDB (local)
mongod

# Python service
cd backend-python
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Node.js API
cd backend-node
npm install
PORT=5000 MONGO_URI=mongodb://localhost:27017/autograde \
  PYTHON_SERVICE_URL=http://localhost:8000 node server.js

# React frontend
cd frontend
npm install
REACT_APP_API_URL=http://localhost:8080 npm start
```

---

## Supported File Types

| Format | Extraction Method |
|--------|------------------|
| `.pdf` | pdf2image → Tesseract OCR |
| `.txt` | Direct read (UTF-8) |

Max file size: **20 MB**

---

## Grade Scale

| Marks | Grade |
|-------|-------|
| 9–10  | A+ |
| 8–9   | A  |
| 7–8   | B+ |
| 6–7   | B  |
| 5–6   | C  |
| 4–5   | D  |
| 0–4   | F  |
