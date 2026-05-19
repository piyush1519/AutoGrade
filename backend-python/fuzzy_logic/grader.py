"""
Advanced Fuzzy Logic Grading Engine — AutoGrade v3
Inputs: 5 AI teacher scores + 3 traditional metrics = 8 inputs
Output: marks (scaled to max_marks)
Uses Mamdani inference +     defuzzification
"""
import numpy as np
import logging

logger = logging.getLogger("autograde.fuzzy")


def trimf(x, a, b, c):
    if x <= a or x >= c: return 0.0
    if x <= b: return (x-a)/(b-a) if b!=a else 1.0
    return (c-x)/(c-b) if c!=b else 1.0

def trapmf(x, a, b, c, d):
    if x<=a or x>=d: return 0.0
    if x<=b: return (x-a)/(b-a) if b!=a else 1.0
    if x<=c: return 1.0
    return (d-x)/(d-c) if d!=c else 1.0


# ── Input MFs (all on [0,1]) ───────────────────────────────────────────────────

# Content accuracy
ca_low    = lambda x: trimf(x, 0, 0, 0.45)
ca_medium = lambda x: trimf(x, 0.3, 0.55, 0.75)
ca_high   = lambda x: trapmf(x, 0.6, 0.8, 1, 1)

# Concept coverage
cc_poor   = lambda x: trimf(x, 0, 0, 0.4)
cc_avg    = lambda x: trimf(x, 0.25, 0.5, 0.75)
cc_good   = lambda x: trapmf(x, 0.55, 0.75, 1, 1)

# Depth of understanding
du_shallow = lambda x: trimf(x, 0, 0, 0.45)
du_moderate= lambda x: trimf(x, 0.3, 0.55, 0.8)
du_deep    = lambda x: trapmf(x, 0.65, 0.85, 1, 1)

# Factual correctness
fc_wrong   = lambda x: trimf(x, 0, 0, 0.4)
fc_partial = lambda x: trimf(x, 0.25, 0.5, 0.75)
fc_correct = lambda x: trapmf(x, 0.55, 0.75, 1, 1)

# Traditional similarity
sim_low    = lambda x: trimf(x, 0, 0, 0.45)
sim_medium = lambda x: trimf(x, 0.3, 0.5, 0.75)
sim_high   = lambda x: trapmf(x, 0.55, 0.75, 1, 1)

# Output MFs (0-10 universe)
def out_very_low(x):  return trimf(x, 0,  0,  3.5)
def out_low(x):       return trimf(x, 2,  3.5, 5.5)
def out_medium(x):    return trimf(x, 4.5,5.5, 7.5)
def out_high(x):      return trimf(x, 6.5,7.5, 9)
def out_very_high(x): return trapmf(x, 8, 9,  10, 10)


class FuzzyGrader:
    def __init__(self, resolution=600):
        self.u = np.linspace(0, 10, resolution)

    def _clip(self, mf, strength):
        return np.minimum(strength, np.array([mf(x) for x in self.u]))

    def grade(self, similarity, keyword_match, length_ratio,
              content_accuracy=None, concept_coverage=None,
              depth=None, factual=None, max_marks=10):

        sim  = float(np.clip(similarity,      0, 1))
        kw   = float(np.clip(keyword_match,   0, 1))
        ln   = float(np.clip(length_ratio,    0, 1))
        ca   = float(np.clip(content_accuracy  if content_accuracy  is not None else similarity,   0, 1))
        cc   = float(np.clip(concept_coverage  if concept_coverage  is not None else keyword_match, 0, 1))
        du   = float(np.clip(depth             if depth             is not None else (sim+kw)/2,   0, 1))
        fc   = float(np.clip(factual           if factual           is not None else similarity,   0, 1))

        # ── 12 Fuzzy Rules ────────────────────────────────────────────────────

        # VERY HIGH marks
        r1 = min(ca_high(ca), cc_good(cc),  du_deep(du),   fc_correct(fc))    # perfect
        r2 = min(ca_high(ca), du_deep(du),  sim_high(sim))                     # deep + similar

        # HIGH marks
        r3 = min(ca_high(ca), cc_avg(cc),   fc_correct(fc))
        r4 = min(sim_high(sim), kw>=0.65 and cc_good(cc) or 0, du_moderate(du))
        r4 = min(sim_high(sim), cc_good(cc), du_moderate(du))
        r5 = min(ca_medium(ca), du_deep(du), fc_correct(fc))

        # MEDIUM marks
        r6  = min(ca_medium(ca), cc_avg(cc))
        r7  = min(sim_medium(sim), fc_partial(fc))
        r8  = min(ca_high(ca), cc_poor(cc))                                    # knows content, missed coverage
        r9  = min(du_moderate(du), fc_partial(fc), sim_medium(sim))

        # LOW marks
        r10 = min(ca_low(ca), fc_wrong(fc))
        r11 = min(sim_low(sim), cc_poor(cc))
        r12 = min(ca_medium(ca), du_shallow(du), cc_poor(cc))                  # surface only

        # VERY LOW
        r13 = min(ca_low(ca), du_shallow(du), fc_wrong(fc))

        # ── Aggregate ─────────────────────────────────────────────────────────
        vh_agg  = self._clip(out_very_high, max(r1, r2))
        h_agg   = self._clip(out_high,  max(r3, r4, r5))
        m_agg   = np.maximum.reduce([self._clip(out_medium, r6),
                                     self._clip(out_medium, r7),
                                     self._clip(out_medium, r8),
                                     self._clip(out_medium, r9)])
        l_agg   = np.maximum(self._clip(out_low,      max(r10, r12)),
                             self._clip(out_low,      r11))
        vl_agg  = self._clip(out_very_low, r13)

        agg = np.maximum.reduce([vh_agg, h_agg, m_agg, l_agg, vl_agg])

        denom = np.sum(agg)
        marks_10 = float(np.sum(self.u * agg) / denom) if denom > 0 else 0.0
        marks_10 = float(np.clip(marks_10, 0, 10))

        # Scale to max_marks
        final = round(marks_10 / 10 * max_marks, 2)
        logger.info(f"Fuzzy: marks={marks_10:.2f}/10 → {final}/{max_marks}")
        return final, marks_10
