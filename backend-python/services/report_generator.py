"""AutoGrade — Professional Evaluation Report Generator"""
import io
import re
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
    Table, TableStyle, HRFlowable)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

W, H = A4
BG    = colors.HexColor("#07080f")
BG2   = colors.HexColor("#0d0e1a")
BG3   = colors.HexColor("#111224")
AMB   = colors.HexColor("#f59e0b")
TEAL  = colors.HexColor("#2dd4bf")
GRN   = colors.HexColor("#34d399")
RED   = colors.HexColor("#f87171")
PUR   = colors.HexColor("#a78bfa")
BLU   = colors.HexColor("#60a5fa")
TX1   = colors.HexColor("#f1f1f9")
TX2   = colors.HexColor("#8b8ba8")
TX3   = colors.HexColor("#3d3d5c")
BOR   = colors.HexColor("#1e1e2e")
AGBG  = colors.HexColor("#1a1500")
GBG   = colors.HexColor("#071a0e")
RBG   = colors.HexColor("#1a0707")
TBG   = colors.HexColor("#00141a")

def safe_float(value, default=0.0):
    """
    Robust numeric parser for production systems.
    Handles:
        4.5
        "4.5"
        "4.5cm"
        "8/10"
        "9 marks"
        None
        ""
    """

    if value is None:
        return default

    if isinstance(value, (int, float)):
        return float(value)

    try:
        text = str(value)

        # Handle fractions like "8/10"
        if "/" in text:
            num, denom = text.split("/", 1)
            return float(num) / float(denom)

        match = re.search(r"[-+]?\d*\.?\d+", text)

        if match:
            return float(match.group())

    except Exception:
        pass

    return default

def _grade(m, mx):
    r = m/mx
    if r>=.9: return "A+", GRN
    if r>=.8: return "A",  GRN
    if r>=.7: return "B+", TEAL
    if r>=.6: return "B",  TEAL
    if r>=.5: return "C",  AMB
    if r>=.4: return "D",  colors.HexColor("#fb923c")
    return "F", RED


def S(name, **kw):
    defaults = dict(fontName="Helvetica", fontSize=9, textColor=TX1, leading=14)
    defaults.update(kw)
    return ParagraphStyle(name, **defaults)


def _bar_str(v, width=22):
    filled = int(v * width)
    return "█"*filled + "░"*(width-filled)


def _page_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # Decorative top stripe
    canvas.setFillColor(AMB)
    canvas.rect(0, H-3, W, 3, fill=1, stroke=0)
    canvas.restoreState()


def generate_report(data: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm, topMargin=2.2*cm, bottomMargin=2*cm,
        title="AutoGrade Evaluation Report")

    styles = {
        "h1":   S("h1",  fontSize=20, fontName="Helvetica-Bold", textColor=TX1, alignment=TA_CENTER),
        "h2":   S("h2",  fontSize=11, fontName="Helvetica-Bold", textColor=AMB, alignment=TA_CENTER, spaceAfter=4),
        "h3":   S("h3",  fontSize=10, fontName="Helvetica-Bold", textColor=AMB, spaceBefore=6, spaceAfter=4),
        "body": S("body",fontSize=9,  textColor=TX1, leading=14, alignment=TA_JUSTIFY),
        "mono": S("mono",fontSize=8,  fontName="Courier", textColor=TX2, leading=12),
        "sm":   S("sm",  fontSize=8,  textColor=TX2),
        "ctr":  S("ctr", fontSize=8,  textColor=TX2, alignment=TA_CENTER),
        "grn":  S("grn", fontSize=9,  textColor=GRN, leading=13),
        "red":  S("red", fontSize=9,  textColor=RED, leading=13),
        "amb":  S("amb", fontSize=9,  textColor=AMB, leading=13),
        "tel":  S("tel", fontSize=9,  textColor=TEAL, leading=13),
        "pur":  S("pur", fontSize=9,  textColor=PUR, leading=13),
        "blu":  S("blu", fontSize=9,  textColor=BLU, leading=14, alignment=TA_JUSTIFY),
    }

    story = []
    fb = data.get("feedback", {})
    ts = data.get("teacher_scores", {})
    marks = safe_float(data.get("marks", 0))
    max_marks = int(safe_float(data.get("max_marks", 10), 10))
    grade_l, grade_c = _grade(marks, max_marks)

    # ── HEADER ───────────────────────────────────────────────────────────────
    hdr = Table([["AG  AutoGrade", "Evaluation Report"]], colWidths=["*","*"])
    hdr.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),BG2), ("FONTNAME",(0,0),(0,0),"Helvetica-Bold"),
        ("FONTSIZE",(0,0),(0,0),14), ("FONTSIZE",(1,0),(1,0),9),
        ("TEXTCOLOR",(0,0),(0,0),AMB), ("TEXTCOLOR",(1,0),(1,0),TX2),
        ("ALIGN",(0,0),(0,0),"LEFT"), ("ALIGN",(1,0),(1,0),"RIGHT"),
        ("TOPPADDING",(0,0),(-1,-1),10), ("BOTTOMPADDING",(0,0),(-1,-1),10),
        ("LEFTPADDING",(0,0),(-1,-1),14), ("RIGHTPADDING",(0,0),(-1,-1),14),
    ]))
    story.append(hdr)
    story.append(Spacer(1,.3*cm))

    try:
        ts_str = datetime.fromisoformat(str(data.get("timestamp","")).replace("Z","")).strftime("%B %d, %Y · %I:%M %p")
    except: ts_str = str(data.get("timestamp",""))

    story.append(Paragraph("STUDENT ANSWER EVALUATION REPORT", styles["h2"]))
    story.append(Paragraph(ts_str, styles["ctr"]))
    story.append(Spacer(1,.2*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BOR))
    story.append(Spacer(1,.3*cm))

    # ── SCORE CARD ─────────────────────────────────────────────────────────
    if max_marks <= 0:
        max_marks = 10

    pct = int((marks / max_marks) * 100)
    score_data = [
        [f"{marks:.1f}", grade_l, f"{pct}%", f"{max_marks}"],
        ["Marks Obtained", "Grade", "Score", "Max Marks"],
    ]
    sc = Table(score_data, colWidths=["*","*","*","*"])
    sc.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),BG2),
        ("TEXTCOLOR",(0,0),(0,0),AMB), ("TEXTCOLOR",(1,0),(1,0),grade_c),
        ("TEXTCOLOR",(2,0),(2,0),TEAL), ("TEXTCOLOR",(3,0),(3,0),PUR),
        ("TEXTCOLOR",(0,1),(-1,1),TX2),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"), ("FONTSIZE",(0,0),(-1,0),28),
        ("FONTNAME",(0,1),(-1,1),"Helvetica"),      ("FONTSIZE",(0,1),(-1,1),8),
        ("ALIGN",(0,0),(-1,-1),"CENTER"), ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("TOPPADDING",(0,0),(-1,0),12), ("BOTTOMPADDING",(0,0),(-1,0),4),
        ("TOPPADDING",(0,1),(-1,1),2),  ("BOTTOMPADDING",(0,1),(-1,1),10),
        ("LINEBEFORE",(1,0),(3,-1),.5,BOR), ("LINEBELOW",(0,0),(-1,0),.5,BOR),
    ]))
    story.append(sc)
    story.append(Spacer(1,.25*cm))

    # Verdict
    verdict = fb.get("verdict","Evaluation complete.")
    vbox = Table([[Paragraph(f'"{verdict}"', S("vrd",fontSize=11,fontName="Helvetica-Bold",
        textColor=TX1,alignment=TA_CENTER))]])
    vbox.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),BG3),
        ("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10),
        ("LEFTPADDING",(0,0),(-1,-1),16),("RIGHTPADDING",(0,0),(-1,-1),16)]))
    story.append(vbox)
    story.append(Spacer(1,.35*cm))

    # ── METRICS TABLE ────────────────────────────────────────────────────────
    story.append(Paragraph("EVALUATION METRICS", styles["h3"]))
    sim = data.get("similarity_score",0)
    kw  = data.get("keyword_match_ratio",0)
    ln  = data.get("answer_length_ratio",0)
    ca  = ts.get("content_accuracy",0) or 0
    cc  = ts.get("concept_coverage",0) or 0
    du  = ts.get("depth_of_understanding",0) or 0
    fc  = ts.get("factual_correctness",0) or 0

    def stat(v):
        if v>=.8: return "Excellent", GRN
        if v>=.6: return "Good",TEAL
        if v>=.4: return "Fair",AMB
        return "Poor",RED

    def mrow(label, v, color, bar_w=18):
        st, sc_ = stat(v)
        bar = _bar_str(v, bar_w)
        return [label, f"{int(v*100)}%", Paragraph(f'<font color="#{color.hexval()[2:]}"><font name="Courier" size="7">{bar}</font></font>', styles["mono"]), st]

    mrows = [["Metric","Score","Visualization","Status"],
             mrow("Content Accuracy",     ca, GRN),
             mrow("Concept Coverage",     cc, TEAL),
             mrow("Depth of Understanding", du, PUR),
             mrow("Factual Correctness",  fc, BLU),
             mrow("Similarity Score",     sim, AMB),
             mrow("Keyword Match",        kw, TEAL),
             mrow("Length Ratio",         ln, PUR),
    ]
    mt = Table(
    mrows,
    colWidths=[4.5*cm, 1.8*cm, 5.5*cm, 2.2*cm]
    )
    mt_style = [
        ("BACKGROUND",(0,0),(-1,0),BG2), ("TEXTCOLOR",(0,0),(-1,0),AMB),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"), ("FONTSIZE",(0,0),(-1,-1),8),
        ("FONTNAME",(0,1),(-1,-1),"Helvetica"),
        ("TEXTCOLOR",(0,1),(0,-1),TX2), ("TEXTCOLOR",(1,1),(1,-1),TX1),
        ("ALIGN",(0,0),(-1,-1),"CENTER"), ("ALIGN",(0,0),(0,-1),"LEFT"),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[BG3, BG2]),
        ("GRID",(0,0),(-1,-1),.3,BOR),
        ("TOPPADDING",(0,0),(-1,-1),5), ("BOTTOMPADDING",(0,0),(-1,-1),5),
        ("LEFTPADDING",(0,0),(-1,-1),8), ("RIGHTPADDING",(0,0),(-1,-1),8),
    ]
    for i, row in enumerate(mrows[1:], 1):
        _, sc2 = stat([ca,cc,du,fc,sim,kw,ln][i-1])
        mt_style.append(("TEXTCOLOR",(3,i),(3,i),sc2))
    mt.setStyle(TableStyle(mt_style))
    story.append(mt)
    story.append(Spacer(1,.35*cm))

    # ── MARK JUSTIFICATION ──────────────────────────────────────────────────
    story.append(HRFlowable(width="100%",thickness=.5,color=BOR))
    story.append(Spacer(1,.2*cm))
    story.append(Paragraph("WHY THESE MARKS WERE ASSIGNED", styles["h3"]))
    reason = fb.get("mark_reason","")
    rbox = Table([[Paragraph(reason, styles["blu"])]])
    rbox.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#040d1a")),
        ("LINELEFT",(0,0),(-1,-1),2.5,BLU),
        ("TOPPADDING",(0,0),(-1,-1),10), ("BOTTOMPADDING",(0,0),(-1,-1),10),
        ("LEFTPADDING",(0,0),(-1,-1),12), ("RIGHTPADDING",(0,0),(-1,-1),12)]))
    story.append(rbox)
    story.append(Spacer(1,.3*cm))

    # ── STRENGTHS & WEAKNESSES ──────────────────────────────────────────────
    def bullet(items, sty, prefix="▸"):
        return [Paragraph(f"{prefix} {i}", sty) for i in items] or [Paragraph("—", sty)]

    str_items = bullet(fb.get("strengths",[]), styles["grn"])
    wk_items  = bullet(fb.get("weaknesses",[]), styles["red"])
    while len(str_items)<len(wk_items): str_items.append(Spacer(1,12))
    while len(wk_items)<len(str_items): wk_items.append(Spacer(1,12))

    sw = Table([[[Paragraph("✅  STRENGTHS",S("sh",fontSize=9,fontName="Helvetica-Bold",textColor=GRN))]+str_items,
                  [Paragraph("❌  WEAKNESSES",S("wh",fontSize=9,fontName="Helvetica-Bold",textColor=RED))]+wk_items]],
               colWidths=["*","*"])
    sw.setStyle(TableStyle([("BACKGROUND",(0,0),(0,0),GBG),("BACKGROUND",(1,0),(1,0),RBG),
        ("VALIGN",(0,0),(-1,-1),"TOP"),("LINEBETWEEN",(0,0),(1,0),.5,BOR),
        ("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10),
        ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
        ("GRID",(0,0),(-1,-1),.3,BOR)]))
    story.append(sw)
    story.append(Spacer(1,.25*cm))

    # ── CORRECT / INCORRECT ─────────────────────────────────────────────────
    correct   = fb.get("correct_points",[])
    incorrect = fb.get("incorrect_points",[])
    if correct or incorrect:
        story.append(Paragraph("ANSWER POINT ANALYSIS", styles["h3"]))
        ci_rows = [["✓  What Student Got Right","✗  What Needs Correction"]]
        for i in range(max(len(correct), len(incorrect), 1)):
            c = correct[i]   if i<len(correct)   else "—"
            w = incorrect[i] if i<len(incorrect)  else "—"
            ci_rows.append([Paragraph(c, styles["grn"]), Paragraph(w, styles["red"])])
        ci = Table(ci_rows, colWidths=["*","*"])
        ci.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(0,0),GBG),("BACKGROUND",(1,0),(1,0),RBG),
            ("TEXTCOLOR",(0,0),(0,0),GRN),("TEXTCOLOR",(1,0),(1,0),RED),
            ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),8),
            ("BACKGROUND",(0,1),(0,-1),colors.HexColor("#030f07")),
            ("BACKGROUND",(1,1),(1,-1),colors.HexColor("#0f0303")),
            ("GRID",(0,0),(-1,-1),.3,BOR),
            ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
            ("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),
            ("VALIGN",(0,0),(-1,-1),"TOP"),("ALIGN",(0,0),(-1,0),"CENTER"),
        ]))
        story.append(ci)
        story.append(Spacer(1,.25*cm))

    # ── MISSING CONCEPTS ────────────────────────────────────────────────────
    missing = fb.get("missing_concepts",[])
    if missing:
        story.append(Paragraph("MISSING CONCEPTS", styles["h3"]))
        mc_text = "  •  ".join(str(m) for m in missing[:8])
        mc = Table([[Paragraph(f"⚠  {mc_text}", styles["amb"])]])
        mc.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),AGBG),("LINELEFT",(0,0),(-1,-1),2.5,AMB),
            ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
            ("LEFTPADDING",(0,0),(-1,-1),12),("RIGHTPADDING",(0,0),(-1,-1),12)]))
        story.append(mc)
        story.append(Spacer(1,.2*cm))

    # ── TEACHER SUGGESTION ──────────────────────────────────────────────────
    sug = fb.get("teacher_suggestion","")
    if sug:
        story.append(Paragraph("TEACHER'S SUGGESTION", styles["h3"]))
        sb = Table([[Paragraph(f"💡  {sug}", styles["tel"])]])
        sb.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),TBG),("LINELEFT",(0,0),(-1,-1),2.5,TEAL),
            ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
            ("LEFTPADDING",(0,0),(-1,-1),12),("RIGHTPADDING",(0,0),(-1,-1),12)]))
        story.append(sb)
        story.append(Spacer(1,.3*cm))

    # ── ANSWER COMPARISON ───────────────────────────────────────────────────
    story.append(HRFlowable(width="100%",thickness=.5,color=BOR))
    story.append(Spacer(1,.2*cm))
    story.append(Paragraph("ANSWER COMPARISON", styles["h3"]))
    s_text = (data.get("student_answer_text","") or "")[:1000]
    m_text = (data.get("model_answer_text","")   or "")[:1000]
    ac = Table([["MODEL ANSWER","STUDENT ANSWER"],
                [Paragraph(m_text or "(empty)", styles["mono"]),
                 Paragraph(s_text or "(empty)", styles["mono"])]],
               colWidths=["*","*"])
    ac.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(0,0),TBG),("BACKGROUND",(1,0),(1,0),AGBG),
        ("TEXTCOLOR",(0,0),(0,0),TEAL),("TEXTCOLOR",(1,0),(1,0),AMB),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,0),8),
        ("BACKGROUND",(0,1),(0,1),colors.HexColor("#020b09")),
        ("BACKGROUND",(1,1),(1,1),colors.HexColor("#0b0800")),
        ("GRID",(0,0),(-1,-1),.3,BOR),
        ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
        ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
        ("VALIGN",(0,0),(-1,-1),"TOP"),("ALIGN",(0,0),(-1,0),"CENTER"),
    ]))
    story.append(ac)
    story.append(Spacer(1,.3*cm))

    # ── FUZZY LOGIC DETAIL ──────────────────────────────────────────────────
    story.append(Paragraph("ADVANCED FUZZY LOGIC INFERENCE", styles["h3"]))
    fz_rows = [["Variable","Value","Region","Weight"],
               ["Content Accuracy",     f"{ca:.3f}", _mf_label(ca), "High"],
               ["Concept Coverage",     f"{cc:.3f}", _mf_label(cc), "High"],
               ["Depth of Understanding",f"{du:.3f}",_mf_label(du), "High"],
               ["Factual Correctness",  f"{fc:.3f}", _mf_label(fc), "High"],
               ["Similarity Score",     f"{sim:.3f}",_mf_label(sim),"Medium"],
               ["Keyword Match",        f"{kw:.3f}", _mf_label(kw), "Medium"],
               ["Length Ratio",         f"{ln:.3f}", _mf_label(ln), "Low"],
               ["OUTPUT (Fuzzy Marks)", f"{data.get('marks_out_of_10',marks):.2f}/10",
                "Defuzzified","Centroid"],
    ]
    fzt = Table(
    fz_rows,
    colWidths=[4.5*cm, 2.2*cm, 4*cm, 2*cm]
    )
    fzt.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),BG2),("TEXTCOLOR",(0,0),(-1,0),PUR),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),8),
        ("FONTNAME",(0,1),(-1,-1),"Courier"),("TEXTCOLOR",(0,1),(-1,-1),TX1),
        ("BACKGROUND",(0,-1),(-1,-1),AGBG),("TEXTCOLOR",(0,-1),(-1,-1),AMB),
        ("ROWBACKGROUNDS",(0,1),(-1,-2),[BG3,BG2]),
        ("GRID",(0,0),(-1,-1),.3,BOR),("ALIGN",(0,0),(-1,-1),"CENTER"),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
    ]))
    story.append(fzt)
    story.append(Spacer(1,.35*cm))

    # ── FOOTER ──────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%",thickness=.5,color=BOR))
    story.append(Spacer(1,.15*cm))
    eid = str(data.get("id",""))[:20]
    ft = Table([[
        Paragraph("AutoGrade v3.0  ·  Advanced AI Evaluation System", styles["ctr"]),
        Paragraph(f"Developed by Piyush Nimbalkar  ·  VIT Mumbai", styles["ctr"]),
        Paragraph(f"Report ID: {eid}", styles["ctr"]),
    ]], colWidths=["*","*","*"])
    ft.setStyle(TableStyle([("ALIGN",(0,0),(-1,-1),"CENTER")]))
    story.append(ft)

    doc.build(story, onFirstPage=_page_bg, onLaterPages=_page_bg)
    return buf.getvalue()


def _mf_label(v):
    if v>=.67: return "HIGH / GOOD"
    if v>=.33: return "MEDIUM / AVERAGE"
    return "LOW / POOR"
