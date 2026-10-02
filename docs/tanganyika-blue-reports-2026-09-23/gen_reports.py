"""Builds the ten Tanganyika Blue management reports as separate PDFs.

Run:  python gen_reports.py   (writes PDFs next to this file)
All figures come from data.py (read-only extract of the tb-farm mirror database).
Derived numbers are arithmetic on recorded rows; anything modelled is labelled as such.
"""
import math
import os
from datetime import date, timedelta

from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.shapes import Drawing, String
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table,
                                TableStyle)

import data as D

OUT = os.path.dirname(os.path.abspath(__file__))

# Same typefaces as the daily planner and the app: IBM Plex Sans for text, Manrope for titles.
for _name, _file in (("PlexSans", "IBMPlexSans-Regular"), ("PlexSans-Medium", "IBMPlexSans-Medium"),
                     ("PlexSans-SemiBold", "IBMPlexSans-SemiBold"), ("PlexSans-Bold", "IBMPlexSans-Bold"),
                     ("Manrope", "Manrope-Regular"), ("Manrope-Bold", "Manrope-Bold"), ("Manrope-ExtraBold", "Manrope-ExtraBold")):
    pdfmetrics.registerFont(TTFont(_name, os.path.join(OUT, "fonts", _file + ".ttf")))
TEAL = colors.HexColor("#0F4C81")  # AquaSmart sidebar blue
TEAL_L = colors.HexColor("#DCE6F1")  # table header / total-row tint
AMBER = colors.HexColor("#B45309")
AMBER_L = colors.HexColor("#FEF3C7")
RED = colors.HexColor("#B91C1C")
GREY = colors.HexColor("#6B7280")
ZEBRA = colors.HexColor("#F7F9FA")
PAGE = landscape(A4)
CW = PAGE[0] - 28 * mm

S_BODY = ParagraphStyle("body", fontName="PlexSans", fontSize=8.5, leading=11)
S_SMALL = ParagraphStyle("small", parent=S_BODY, fontSize=7.5, leading=9.5, textColor=GREY)
S_H1 = ParagraphStyle("h1", fontName="Manrope-ExtraBold", fontSize=17, leading=21, textColor=TEAL)
S_SUB = ParagraphStyle("sub", fontName="PlexSans", fontSize=9, leading=12, textColor=GREY)
S_H2 = ParagraphStyle("h2", fontName="Manrope-ExtraBold", fontSize=11, leading=14, textColor=TEAL, spaceBefore=8,
                      spaceAfter=3, keepWithNext=1)
S_CELL = ParagraphStyle("cell", fontName="PlexSans", fontSize=7.2, leading=8.6)
S_CELLB = ParagraphStyle("cellb", parent=S_CELL, fontName="PlexSans-SemiBold")
S_HEAD = ParagraphStyle("head", fontName="PlexSans-SemiBold", fontSize=7.2, leading=8.6, textColor=colors.HexColor("#111827"), alignment=1)
S_NOTE = ParagraphStyle("note", parent=S_BODY, fontSize=8, leading=10.5, backColor=AMBER_L, borderPadding=5,
                        borderColor=AMBER, borderWidth=0.5, spaceBefore=6, spaceAfter=6)
S_KPI_V = ParagraphStyle("kpiv", fontName="Manrope-Bold", fontSize=14, leading=16, textColor=colors.white)
S_KPI_L = ParagraphStyle("kpil", fontName="PlexSans", fontSize=7.5, leading=9, textColor=colors.HexColor("#DCE6F1"))


# ----------------------------------------------------------------------------- helpers
def d(s):
    return date.fromisoformat(s) if isinstance(s, str) else s


def n0(x):
    return "-" if x is None else f"{x:,.0f}"


def n1(x):
    return "-" if x is None else f"{x:,.1f}"


def n2(x):
    return "-" if x is None else f"{x:,.2f}"


def pct(x, nd=1):
    return "-" if x is None else f"{x:.{nd}f}%"


def sgr(w0, w1, days):
    if not w0 or not w1 or days <= 0 or w1 <= 0:
        return None
    return math.log(w1 / w0) / days * 100


NA = "Not recorded"


def P(t, st=S_CELL):
    return Paragraph(str(t), st)


def table(header, rows, widths=None, align_right_from=1, bold_last=False, flag_col=None, zebra=True, repeat=1):
    """rows: list of lists of str/Paragraph. widths as fractions of CW."""
    cells = [[P(h, S_HEAD) for h in header]]
    for r in rows:
        cells.append([c if isinstance(c, Paragraph) else P(c, S_CELLB if i == 0 else S_CELL) for i, c in enumerate(r)])
    cw = [CW * w for w in widths] if widths else None
    t = Table(cells, colWidths=cw, repeatRows=repeat)
    st = [("BACKGROUND", (0, 0), (-1, 0), TEAL_L), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
          ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#9AA5A0")),
          ("TOPPADDING", (0, 0), (-1, -1), 2.2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2),
          ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3)]
    if zebra:
        for i in range(2, len(cells), 2):
            st.append(("BACKGROUND", (0, i), (-1, i), ZEBRA))
    if bold_last:
        st += [("BACKGROUND", (0, len(cells) - 1), (-1, len(cells) - 1), TEAL_L),
               ("LINEABOVE", (0, len(cells) - 1), (-1, len(cells) - 1), 0.8, TEAL)]
    t.setStyle(TableStyle(st))
    return t


def kpis(items):
    cells = [[Table([[P(v, S_KPI_V)], [P(l, S_KPI_L)]], colWidths=[CW / len(items) - 12]) for v, l in items]]
    t = Table(cells, colWidths=[CW / len(items)] * len(items))
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), TEAL), ("INNERGRID", (0, 0), (-1, -1), 3, colors.white),
                           ("BOX", (0, 0), (-1, -1), 3, colors.white), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 5)]))
    return t


def chart_block(title, cats, series):
    """Hook for the web export (export_json.py); the PDF draws its own chart, so this does nothing here."""


def note(t):
    return Paragraph(t, S_NOTE)


def h2(t):
    return Paragraph(t, S_H2)


def body(t):
    return Paragraph(t, S_BODY)


def small(t):
    return Paragraph(t, S_SMALL)


def build(filename, title, subtitle, story, scope_line=None):
    path = os.path.join(OUT, filename)
    foot = scope_line or "Recorded data from the farm database; derived values are arithmetic on those records"

    def deco(c, doc):
        c.saveState()
        c.setFont("PlexSans", 7)
        c.setFillColor(GREY)
        c.drawString(14 * mm, 8 * mm, f"SUSTAIN AquaSmart | Tanganyika Blue | Extract {D.EXTRACT}")
        c.drawRightString(PAGE[0] - 14 * mm, 8 * mm, f"Page {doc.page}")
        c.setStrokeColor(TEAL)
        c.setLineWidth(1.2)
        c.line(14 * mm, PAGE[1] - 10 * mm, PAGE[0] - 14 * mm, PAGE[1] - 10 * mm)
        c.restoreState()

    doc = SimpleDocTemplate(path, pagesize=PAGE, leftMargin=14 * mm, rightMargin=14 * mm, topMargin=14 * mm,
                            bottomMargin=13 * mm, title=f"Tanganyika Blue - {title}", author="SUSTAIN Aquasmart")
    head = [Paragraph("SUSTAIN AquaSmart | Tanganyika Blue | 23 Aug - 23 Sep 2026", S_SUB), Paragraph(title, S_H1),
            Paragraph(subtitle, S_SUB), Spacer(1, 6)]
    doc.build(head + story, onFirstPage=deco, onLaterPages=deco)
    return path


# ----------------------------------------------------------------------------- derived data
STAGE = {c[0]: c[2] for c in D.CAGE_CLOSE}
VOL = {c[0]: c[1] for c in D.CAGE_CLOSE}


def cage_biomass(rows, fish_i, abw_i):
    out = {}
    for r in rows:
        if r[fish_i] and r[fish_i] > 0 and r[abw_i]:
            out[r[3] if len(r) > 6 else r[1]] = out.get(r[3] if len(r) > 6 else r[1], 0) + r[fish_i] * r[abw_i] / 1000
    return out


def batch_biomass_open():
    out, miss = {}, {}
    for cage, b, fish, sd, n, abw in D.CAGE_OPEN:
        if fish <= 0:
            continue
        if abw is None:
            miss.setdefault(b, []).append((cage, "no sample"))
            continue
        age = (D.W0 - d(sd)).days
        if age > 3:
            miss.setdefault(b, []).append((cage, f"sample {sd} ({age} d old)"))
        out[b] = out.get(b, 0) + fish * abw / 1000
    return out, miss


def batch_biomass_close():
    out = {}
    for cage, vol, st, b, fish, sd, n, abw in D.CAGE_CLOSE:
        out[b] = out.get(b, 0) + fish * abw / 1000
    return out


B_OPEN, B_OPEN_MISS = batch_biomass_open()
B_CLOSE = batch_biomass_close()
CLOSE_FISH_BY_BATCH = {b: sum(c[4] for c in D.CAGE_CLOSE if c[3] == b) for b in D.BATCHES}
BATCH_STAGE = {}
for c in D.CAGE_CLOSE:
    BATCH_STAGE.setdefault(c[3], set()).add(c[2])


def stage_label(b):
    s = BATCH_STAGE.get(b, set())
    return "Grow-out" if "grow_out" in s and len(s) == 1 else ("Mixed" if len(s) > 1 else "Nursing")


def culture_days(b):
    return (D.W1 - d(D.ORIGIN[b][1])).days


def batch_abw(b):
    fish = CLOSE_FISH_BY_BATCH[b]
    return B_CLOSE[b] * 1000 / fish if fish else None


def efcr_window(b):
    """Indicative window eFCR from book count x sampled ABW. Returns (gain_kg, efcr, reason)."""
    if b in ("02.26cK",):
        return None, None, "Negative cage balances and an 11,259-fish unaccounted loss"
    if b in ("08.26", "09.26a"):
        return None, None, "Stocked/restocked in or just before the window; no opening sample"
    if b in D.LED and b in B_OPEN_MISS:
        return None, None, "Opening sample missing or stale (" + "; ".join(f"{c}: {m}" for c, m in B_OPEN_MISS[b]) + ")"
    led = D.LED[b]
    gain = B_CLOSE[b] - B_OPEN[b] + led[5]
    if gain <= 0:
        return gain, None, "Zero or negative biomass gain"
    return gain, led[9] / gain, ""


def efcr_cum(b):
    if b in ("02.26cK", "05.26b", "08.26", "09.26a"):
        return None
    led = D.LED[b]
    gain = B_CLOSE[b] + D.HARVEST_KG_CUM.get(b, 0) - D.STOCKED_KG[b]
    return led[10] / gain if gain > 0 else None


# ----------------------------------------------------------------------------- 1. stock reconciliation
def r1():
    s = []
    tot = [sum(D.LED[b][i] for b in D.BATCHES) for i in range(12)]
    s.append(kpis([(n0(tot[0]), "Opening book fish (23 Aug)"), (n0(tot[1]), "Stocked in window"),
                   (n0(tot[3]), "Recorded deaths"), (n0(tot[2]), "Unaccounted external loss"),
                   (n0(tot[6]), "Closing book fish (23 Sep)"), ("0", "Batches with a verified count")]))
    s.append(h2("Batch stock ledger"))
    rows = []
    for b in D.BATCHES:
        L = D.LED[b]
        calc = L[0] + L[1] - L[2] - L[3] - L[4]
        ok = "OK" if calc == L[6] else "CHECK"
        rows.append([b, n0(L[0]), n0(L[1]), "0", n0(L[2]) if L[2] else "0", n0(L[3]), n0(L[4]), n0(calc),
                     "Not established", ok])
    rows.append(["TOTAL", n0(tot[0]), n0(tot[1]), "0", n0(tot[2]), n0(tot[3]), n0(sum(D.LED[b][4] for b in D.BATCHES)),
                 n0(tot[6]), "", ""])
    s.append(table(["Batch", "Opening fish", "Stocked", "External in", "External out / loss", "Recorded deaths",
                    "Harvest fish", "Expected closing", "Latest verified count", "Arithmetic"],
                   rows, [0.09, 0.1, 0.09, 0.08, 0.12, 0.1, 0.09, 0.11, 0.14, 0.08], bold_last=True))
    s.append(small("Expected closing = opening + stocked + external in - external out - deaths - harvest. Within-farm transfers "
                   "cancel at batch level. Adjustments are only the recorded external_out reconciliation entry; no other "
                   "adjustment rows exist. 'Verified count' = a physical count recorded in fish_inventory_count (none exist)."))
    s.append(h2("Discrepancies and investigation status"))
    rows = [
        ["02.26cK / 1B", "2026-08-28", "-1,008", "0 (user-confirmed empty)", "+1,008", "Reconciliation row recorded (count_difference); "
         "ledger balance not yet adjusted", "Open - count evidence not attached"],
        ["02.26cK / 1C", "2026-09-11", "-749", "0 (final transfer)", "+749", "Reconciliation row recorded (count_difference); "
         "ledger balance not yet adjusted", "Open - count evidence not attached"],
        ["02.26cK / 1A", "-", "-11", "-", "-11", "Residual from earlier movements; no reconciliation row", "Open - not investigated"],
        ["02.26cK / external_out", "2026-08-28", "11,259 fish (673.8 kg)", "-", "15.3% of batch opening",
         "Booked as 'Lost / unaccounted - 1B transfer reconciliation' on 2026-09-01 (not via the app form)", "Open - cause not established"],
    ]
    s.append(table(["Cage / item", "Date", "Book balance / quantity", "Confirmed count", "Discrepancy (fish)",
                    "Recorded evidence", "Investigation status"], rows, [0.12, 0.08, 0.14, 0.13, 0.12, 0.28, 0.13]))
    s.append(note("<b>Counting method and evidence:</b> not recorded for any batch. The two reconciliation rows have no linked count "
                  "(inventory_count_id is empty) and fish_inventory_count holds no rows. The closing figures above are book stock, "
                  "not certified physical stock."))
    s.append(h2("Cage-level closing book (2026-09-23)"))
    rows = [[c[0], c[3], n0(c[4]), c[5], n0(c[6]), n1(c[7])] for c in D.CAGE_CLOSE]
    rows += [[c[0], c[1], n0(c[2]), "-", "-", "negative balance"] for c in D.NEGATIVE_CAGES]
    s.append(table(["Cage", "Batch", "Book fish", "Latest sample", "Sample fish", "Sample ABW g / note"], rows,
                   [0.1, 0.12, 0.14, 0.14, 0.14, 0.2]))
    return build("01-stock-reconciliation-and-discrepancy.pdf", "Stock Reconciliation and Discrepancy Report",
                 "Do we actually have the fish the system shows?", s)


# ----------------------------------------------------------------------------- 2. cage and batch performance
def r2():
    s = []
    live_fish = sum(c[4] for c in D.CAGE_CLOSE)
    live_kg = sum(B_CLOSE.values())
    s.append(kpis([(n0(live_fish), "Book fish in cages"), (n0(live_kg) + " kg", "Book biomass (count x sample ABW)"),
                   (f"{live_kg * 1000 / live_fish:.1f} g", "Weighted ABW"), (n0(sum(D.LED[b][9] for b in D.BATCHES)) + " kg",
                                                                       "Feed fed in window"),
                   (n0(sum(D.LED[b][3] for b in D.BATCHES)), "Deaths in window")]))
    s.append(h2("Batch performance"))
    rows = []
    for b in D.BATCHES:
        L = D.LED[b]
        sup = D.ORIGIN[b][0]
        denom = L[0] + L[1]
        mort = L[3] / denom * 100 if denom else None
        gain, ef, why = efcr_window(b)
        abw = batch_abw(b)
        opening_abw = B_OPEN[b] * 1000 / sum(c[2] for c in D.CAGE_OPEN if c[1] == b and c[2] > 0 and c[5]) if b in B_OPEN and b not in B_OPEN_MISS else None
        rows.append([b, sup.split()[0], D.ORIGIN[b][1], str(culture_days(b)), stage_label(b),
                     n0(CLOSE_FISH_BY_BATCH[b]), n1(abw), n0(B_CLOSE[b]), n1(opening_abw),
                     n1(gain) if gain else "-", n0(L[9]), pct(mort, 2),
                     n2(ef) if ef else "-", "250 g" if b in ("02.26aK", "02.26b", "02.26cK", "03.26aK", "03.26b", "03.26c") else "400 g (plan)"])
    s.append(table(["Batch", "Origin", "Stocked", "Days", "Stage", "Fish", "ABW g", "Biomass kg", "Open ABW g",
                    "Gain kg", "Feed kg", "Mort %", "eFCR*", "Target"], rows,
                   [0.07, 0.07, 0.08, 0.04, 0.08, 0.08, 0.06, 0.08, 0.07, 0.07, 0.07, 0.07, 0.06, 0.1]))
    s.append(small("Stage: Grow-out = grow-out cages, Nursing = nursing cages. Broodstock and reserved stock are not recorded "
                   "anywhere in the data. Mort % = deaths in window / (opening + stocked). *eFCR = feed in window / "
                   "(closing biomass - opening biomass + harvested kg); indicative, from book counts x sampled ABW, not verified counts. "
                   "Target: production_cycle.target_weight_g (250 g on older cycles) or the plan's 400 g where no cycle target is set."))
    s.append(h2("Target variance (plan model v2 vs latest measured ABW)"))
    rows = []
    for c in D.CAGE_CLOSE:
        cage, vol, st, b, fish, sd, n, abw = c
        p = D.PLAN[cage]
        var = (abw / p[0] - 1) * 100
        rows.append([cage, b, f"{abw:.1f}", f"{p[0]:.1f}", pct(var), n0(fish), f"{(d(p[1]) - date(2026, 9, 22)).days}", n0(fish * abw / 1000)])
    s.append(table(["Cage", "Batch", "Measured ABW g (23 Sep)", "Plan ABW g (22 Sep)", "Variance", "Book fish", "Plan days to 400 g",
                    "Biomass kg"], rows, [0.08, 0.1, 0.17, 0.15, 0.1, 0.12, 0.16, 0.12]))
    s.append(note("Measured ABW is below the plan's starting ABW in 15 of 16 cages (see report 4). Plan harvest dates are therefore "
                  "optimistic until the model is re-anchored to the measured weights."))
    s.append(h2("Cage view"))
    rows = []
    for c in D.CAGE_CLOSE:
        cage, vol, st, b, fish, sd, n, abw = c
        kg = fish * abw / 1000
        rows.append([cage, b, st.replace("_", "-"), n0(vol), n0(fish), f"{abw:.1f}", n0(kg), f"{kg / vol:.1f}", sd, str(n)])
    for cg, vol, stg in D.FREE_CAGES:
        rows.append([cg, "-", stg.replace("_", "-"), n0(vol), "0", "-", "0", "0.0", "-", "available"])
    s.append(table(["Cage", "Batch", "Stage", "Volume m3", "Fish", "ABW g", "Biomass kg", "kg/m3", "Sample date", "Sample n"], rows,
                   [0.08, 0.1, 0.09, 0.1, 0.1, 0.08, 0.11, 0.08, 0.14, 0.1]))
    return build("02-cage-and-batch-performance.pdf", "Cage and Batch Performance Report",
                 "Which cages need attention, and why?", s)


# ----------------------------------------------------------------------------- 3. feed efficiency / FCR
def r3():
    s = []
    s.append(note("This report explains the ratios; it does not present them as verified results. Biomass is book fish x sampled ABW "
                  "(sample sizes 100-500). Mortality weight is not deducted, and ABW measurement error moves the ratio materially "
                  "(+/-5 g ABW on a 40 g fish is a 12% swing in biomass)."))
    groups = {"Active grow-out (grow-out cages)": [], "Nursing / small fish": [], "Newly stocked / insufficient data": []}
    for b in D.BATCHES:
        gain, ef, why = efcr_window(b)
        if b in ("08.26", "09.26a"):
            groups["Newly stocked / insufficient data"].append(b)
        elif b in ("02.26cK", "05.26b"):
            groups["Newly stocked / insufficient data"].append(b)
        elif stage_label(b) == "Grow-out" or b == "02.26b":
            groups["Active grow-out (grow-out cages)"].append(b)
        else:
            groups["Nursing / small fish"].append(b)
    for title, bl in groups.items():
        if not bl:
            continue
        s.append(h2(title))
        rows = []
        for b in bl:
            L = D.LED[b]
            gain, ef, why = efcr_window(b)
            ec = efcr_cum(b)
            opening = n0(B_OPEN.get(b)) if b in B_OPEN and b not in B_OPEN_MISS else "-"
            flag = why if why else ("OK - indicative" if ef and ef < 2.2 else "High - review")
            if ef and not why and ef >= 2.2:
                flag = "High (>2.2): check sample size, stock loss and feed records"
            rows.append([b, n0(L[9]), opening, n0(B_CLOSE[b]), n1(L[5]) if L[5] else "0", n1(gain) if gain else "-",
                         n2(ef) if ef else "-", n0(L[10]), n2(ec) if ec else "-", flag])
        s.append(table(["Batch", "Feed kg (window)", "Opening biomass kg", "Closing biomass kg", "Harvest kg", "Biomass gain kg",
                        "eFCR window", "Feed kg (cumulative)", "eFCR cumulative", "Reading / flag"], rows,
                       [0.07, 0.09, 0.1, 0.1, 0.07, 0.09, 0.08, 0.1, 0.09, 0.21]))
    s.append(h2("How to read the ratios"))
    s.append(table(["Situation", "Cause shown by the data", "Batches"], [
        ["High eFCR with large deaths", "Feed went to fish that later died or were lost; ratio overstated", "02.26cK (2,024 deaths + 11,259 unaccounted loss) - not computed"],
        ["High eFCR, small sample", "Closing ABW from n=100 fish; 5 g error swings the ratio", "02.26aK (2.59, n=100 at close)"],
        ["Low eFCR (< 1.4)", "Possible under-recorded feed or over-weighted sample; not credible until verified",
         "02.26b (1.32), 07.26b (1.30), 06.26a (1.31)"],
        ["No ratio possible", "Missing opening sample, restocking in window, or new batch", "05.26b, 08.26, 09.26a"],
        ["Harvest in window", "Harvest kg is added back to biomass gain; harvest records for small batches are mostly samples/culls",
         "03.26b (1,742 fish, 206 kg), 08.26 (20 fish)"],
    ], [0.22, 0.5, 0.28]))
    s.append(small(f"Plan model v2 expects a biological FCR rising from {D.GROWTH_MODEL['fcr_start']} to {D.GROWTH_MODEL['fcr_end']} over 1-400 g, "
                   f"calibrated to a harvest eFCR of {D.GROWTH_MODEL['target_efcr']}. Broodstock and completed-batch groups are empty: "
                   "no batch is recorded as broodstock and no 2026 batch has been closed."))
    return build("03-feed-efficiency-and-fcr-explanation.pdf", "Feed Efficiency and FCR Explanation Report",
                 "Is poor FCR a feeding problem, stock loss or a data issue?", s)


# ----------------------------------------------------------------------------- 4. growth vs target & sampling quality
def r4():
    s = []
    rows, flags_n = [], 0
    for (cage, b), sm in D.SAMPLES.items():
        last = sm[0]
        plan_abw = D.PLAN[cage][0]
        prev = sm[1] if len(sm) > 1 else None
        if cage == "G1.A":
            prev = D.SAMPLES_1C_PRE[-1]
        days = (d(last[0]) - d(prev[0])).days if prev else None
        g = last[2] - prev[2] if prev else None
        sg = sgr(prev[2], last[2], days) if prev else None
        gap = (last[2] / plan_abw - 1) * 100
        days_to_target = (d(D.PLAN[cage][1]) - date(2026, 9, 22)).days
        naive = math.log(400 / last[2]) / (sg / 100) if sg and sg > 0 else None
        fl = []
        if last[1] < 150:
            fl.append("small sample (n<150)")
        if prev and days and days > 35:
            fl.append(f"{days}-day interval")
        if sg is not None and sg > 1.5 and last[2] > 20:
            fl.append("fast gain - check outlier")
        if sg is not None and sg < 0.3:
            fl.append("no measurable growth")
        if gap < -15:
            fl.append("below plan by >15%")
        if cage == "G1.A":
            fl.append("prior ABW from cage 1C before transfer")
        flags_n += 1 if fl else 0
        rows.append([b, cage, f"{prev[0][5:]} to {last[0][5:]}" if prev else last[0][5:],
                     f"{prev[1]}/{last[1]}" if prev else str(last[1]), f"{prev[2]:.1f}" if prev else "-", f"{last[2]:.1f}",
                     n1(g), n2(sg), f"{plan_abw:.1f}", pct(gap, 0), str(days_to_target),
                     n0(naive) if naive else "-", "; ".join(fl) if fl else "-"])
    s.append(kpis([("16 / 16", "cages sampled on 23 Sep"), ("15 of 16", "cages below plan ABW"), (str(flags_n), "cages with a quality flag"),
                   ("n = 100-500", "sample size range"), ("Not recorded", "size distribution / sex")]))
    s.append(h2("Actual ABW against the versioned growth curve (plan model tanganyika-planning-v2)"))
    s.append(table(["Batch", "Cage", "Samples (MM-DD)", "Sample n", "Prev ABW g", "Latest ABW g", "Gain g", "SGR %/day",
                    "Plan ABW g 22 Sep", "vs plan", "Plan days to 400 g", "Naive days at recent SGR", "Quality flags"], rows,
                   [0.06, 0.05, 0.1, 0.06, 0.06, 0.06, 0.05, 0.06, 0.07, 0.05, 0.07, 0.08, 0.19]))
    s.append(small("SGR = ln(ABW2/ABW1) / days x 100. Plan ABW is the model's starting weight for each cage in draft plan rev 6 "
                   "(snapshot 22 Sep). 'Naive days' extrapolates the latest SGR to 400 g and ignores slowing growth, so it is a lower bound. "
                   "Individual fish weights are not stored, so size distribution and outlier fish cannot be assessed; "
                   "outlier flags are based on the batch-level gain only."))
    s.append(h2("Cohort comparison by source and age"))
    coh = {}
    for (cage, b), sm in D.SAMPLES.items():
        sup = D.ORIGIN[b][0]
        mon = D.ORIGIN[b][1][:7]
        fish = [c for c in D.CAGE_CLOSE if c[0] == cage][0][4]
        e = coh.setdefault((sup, mon), [0, 0, 0, []])
        e[0] += fish
        e[1] += fish * sm[0][2]
        prev = sm[1] if len(sm) > 1 else None
        if prev and cage != "G1.A":
            sgv = sgr(prev[2], sm[0][2], (d(sm[0][0]) - d(prev[0])).days)
            if sgv is not None:
                e[3].append(sgv)
        e[2] += 1
    rows = []
    for (sup, mon), e in sorted(coh.items(), key=lambda x: x[0][1]):
        rows.append([sup, mon, str(e[2]), n0(e[0]), f"{e[1] / e[0]:.1f}", n2(sum(e[3]) / len(e[3])) if e[3] else "-"])
    s.append(table(["Source", "Stocking month", "Cages", "Book fish", "Fish-weighted ABW g", "Mean SGR %/day"], rows,
                   [0.22, 0.14, 0.1, 0.14, 0.2, 0.2]))
    s.append(note("<b>Lagging batches:</b> 05.26b / 2B (41.7 g, 39% below plan), 05.26cK / 3B (30% below) and 03.26aK / 1A (27% below) "
                  "are furthest behind the model; 2A is the only cage at or above plan. G1.A (02.26cK) grew from 52.0 g (cage 1C, 4 Sep) to 63.0 g, "
                  "but only 59.7 to 63.0 g (+5%) in the last 12 days, alongside the large post-transfer mortality in that cage. "
                  "Sex composition is not recorded; cohorts are compared by supplier and stocking month only."))
    return build("04-growth-against-target-and-sampling-quality.pdf", "Growth Against Target and Sampling Quality Report",
                 "Which batches are genuinely growing slowly?", s)


# ----------------------------------------------------------------------------- 5. transfers & grading
def r5():
    s = []
    moved = sum(t[5] for t in D.TRANSFERS if t[1] != "external_out")
    s.append(kpis([(str(sum(1 for t in D.TRANSFERS if t[1] != "external_out")), "transfer events (Jun-Sep)"), (n0(moved), "fish moved"),
                   ("11,259", "fish booked lost on 28 Aug"), ("3,021", "deaths in 7 d after Jul-29 transfer into G1.D"),
                   ("Not recorded", "handling time / water quality")]))
    s.append(h2("Transfer and grading events (2026-06-01 to 2026-09-23)"))
    rows = []
    for t in D.TRANSFERS:
        dt, tp, b, o, tg, n, kg, abw, nt, m7, m0 = t
        rate = f"{m7 / n * 100:.1f}%" if m7 is not None and n else "-"
        rows.append([dt, tp.replace("_", " "), b, o, tg, n0(n), n0(kg), n1(abw), n0(m0) if m0 is not None else "-",
                     n0(m7) if m7 is not None else "-", rate, nt or "-"])
    s.append(table(["Date", "Type", "Batch", "From", "To", "Fish", "Biomass kg", "ABW g", "Deaths same day", "Deaths next 7 d",
                    "7-d % of fish moved", "Operational note"], rows,
                   [0.07, 0.08, 0.06, 0.04, 0.12, 0.06, 0.07, 0.05, 0.07, 0.07, 0.08, 0.23]))
    s.append(small("Source/destination counts and biomass are as entered; before/after counts per cage are not stored on the transfer record. "
                   "Deaths are recorded mortality in the destination cage for that batch on the transfer date and the 7 days after. "
                   "Consecutive transfers into the same cage have overlapping windows (e.g. 27-29 Jul, 26-28 Aug), so the 7-day figures are cumulative, "
                   "not additive."))
    s.append(h2("Campaign summary"))
    camp = [
        ("1C to 3D, 23 Jun (03.26b)", "4,770", "2", "0.04%", "Single transfer, 46 g fish - negligible loss"),
        ("1B to 1C, 24 Jun (02.26cK)", "37,000", "78", "0.21%", "Density thinning of 24 g fish - low loss"),
        ("1F to G1.D, 20-29 Jul (02.26aK)", "40,443", "3,021 after final", "7.5%", "Four partial moves at 43-45 g; losses jumped to 2,375-3,021 per 7-day window after 27-29 Jul"),
        ("2C to 2D grading, 21 Aug (02.26b)", "4,434", "0 recorded", "0.0%", "Single graded move of 188 g fish - no recorded loss"),
        ("1B to G1.A, 26-28 Aug (02.26cK)", "26,725", "1,514 after final", "5.7%", "Three moves at 52-60 g; plus 11,259 fish booked unaccounted the same day"),
        ("1C to G1.A, 4-11 Sep (02.26cK)", "37,209", "408 after final", "1.1%", "Five moves at 51-52 g; far lower loss than the August campaign"),
    ]
    s.append(table(["Campaign", "Fish moved", "Deaths (7 d)", "% moved", "Reading"], [list(c) for c in camp], [0.24, 0.09, 0.12, 0.08, 0.47]))
    s.append(note("<b>What reduces losses:</b> single-day moves of 24-47 g fish (Jun) and the 188 g grading lost almost nothing; multi-day "
                  "partial transfers into the big circular cages (G1.D in July, G1.A in August) lost 5.7-7.5% within a week. The September "
                  "1C to G1.A campaign used the same cage and fish size as August but lost 1.1% - the difference (handling, water, feed "
                  "withdrawal) is not captured. Water quality measurements and handling duration are not recorded in this database "
                  "(water_quality_measurement has 0 rows), so the cause of the improvement cannot be quantified yet."))
    return build("05-transfer-and-grading-outcomes.pdf", "Transfer and Grading Outcome Report",
                 "Which transfer practices reduce losses?", s)


# ----------------------------------------------------------------------------- 6. stock profile & pipeline
def r6():
    s = []
    bins = [("< 10 g", 0, 10), ("10-30 g", 10, 30), ("30-70 g", 30, 70), ("70-150 g", 70, 150), ("150-250 g", 150, 250),
            ("250-400 g", 250, 400), ("> 400 g", 400, 9999)]
    rows, fish_vals, kg_vals = [], [], []
    for lab, lo, hi in bins:
        sel = [c for c in D.CAGE_CLOSE if lo <= c[7] < hi]
        f = sum(c[4] for c in sel)
        kg = sum(c[4] * c[7] / 1000 for c in sel)
        fish_vals.append(f)
        kg_vals.append(kg)
        rows.append([lab, ", ".join(c[0] for c in sel) or "-", n0(f), n0(kg)])
    tf, tk = sum(fish_vals), sum(kg_vals)
    rows.append(["TOTAL", "", n0(tf), n0(tk)])
    s.append(kpis([(n0(tf), "Book fish (23 Sep)"), (n0(tk) + " kg", "Book biomass"), ("150,000", "planned fish stocked per month (plan target)"),
                   ("3", "cages free (1B, 1C, 2E)"), ("10", "stockings planned by 25 Dec")]))
    chart = Drawing(CW * 0.55, 150)
    bc = VerticalBarChart()
    bc.categoryAxis.labels.fontName = bc.valueAxis.labels.fontName = "PlexSans"
    bc.bars.strokeColor = None
    bc.x, bc.y, bc.height, bc.width = 40, 25, 110, CW * 0.5
    bc.data = [fish_vals]
    bc.categoryAxis.categoryNames = [b[0] for b in bins]
    bc.categoryAxis.labels.fontSize = 7
    bc.valueAxis.labels.fontSize = 7
    bc.valueAxis.labelTextFormat = lambda v: f"{v / 1000:.0f}k"
    bc.bars[0].fillColor = TEAL
    chart.add(bc)
    chart.add(String(40, 140, "Book fish by weight class (latest sample ABW per cage)", fontName="PlexSans", fontSize=8, fillColor=GREY))
    s.append(h2("Stock profile by weight class"))
    t = Table([[chart, table(["Weight class", "Cages", "Fish", "Biomass kg"], rows, [0.1, 0.12, 0.08, 0.1])]], colWidths=[CW * 0.57, CW * 0.43])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    s.append(t)
    chart_block("Book fish by weight class (latest sample ABW per cage)", [b[0] for b in bins], [("Fish", fish_vals)])
    s.append(small("Target stock profile by weight class is not stored in the database; actual weight classes are shown with the plan's "
                   f"monthly stocking target (150,000 fish/month) as the only target. {sum(c[4] for c in D.CAGE_CLOSE if c[7] < 70) / tf * 100:.0f}% of fish are below 70 g and none are above 250 g."))
    s.append(h2("Stocking pipeline (draft plan rev 6, model v2)"))
    rows, cum = [], 0
    for dt, f in D.PLANNED_STOCKINGS:
        cum += f
        rows.append([dt, n0(f), n0(cum), "Not assigned in plan", "Not recorded"])
    s.append(table(["Planned stocking date", "Fish", "Cumulative fish", "Supplier / hatchery", "Delivery confirmed"], rows, [0.2, 0.15, 0.17, 0.25, 0.23]))
    s.append(h2("Capacity check"))
    s.append(table(["Item", "Value"], [
        ["Cages free today", "3 x 125 m3 (1B and 1C nursing, 2E grow-out); G1.A (750 m3) and G1.D (790 m3) are occupied"],
        ["Planned stockings by 25 Dec 2026", "10 batches / 530,000 fish (80,000 on 25 Sep, then 50,000 on 1, 15 and 25 of each month)"],
        ["Cages released by planned harvests before 25 Dec", "1 (2D, baseline harvest 2 Dec 2026)"],
        ["Shortfall without batch combining or cage additions", "6 batches (10 planned minus 3 free cages minus 1 released)"],
        ["Plan limitation", "The plan projects growth and mortality only; it does not assign cages, so cage shortfalls are not shown by the model"],
    ], [0.3, 0.7]))
    s.append(h2("Projected live stock (plan baseline, model v2)"))
    rows = [[m[0], n0(m[2]), n0(m[6]), n0(m[7]), n0(m[4]), n0(m[5])] for m in D.PLAN_MONTHLY[:12]]
    s.append(table(["Month", "Planned stocking fish", "Live fish end of month", "Live biomass kg", "Harvest fish", "Harvest kg"], rows,
                   [0.12, 0.18, 0.2, 0.18, 0.16, 0.16]))
    s.append(note("Plan live fish at end of Sep (466,373) include the 80,000 planned on 25 Sep. The plan starts from model-estimated weights that are "
                  "above the measured ABW in 15 of 16 cages, so projected biomass is overstated until it is re-anchored."))
    return build("06-stock-profile-and-stocking-pipeline.pdf", "Stock Profile and Stocking Pipeline Report",
                 "Will today's stocking produce a continuous future harvest?", s)


# ----------------------------------------------------------------------------- 7. harvest availability & scenarios
def lag_days(cage):
    sm = D.SAMPLES[(cage, [b for c, b in D.SAMPLES if c == cage][0])]
    last = sm[0]
    prev = sm[1] if len(sm) > 1 else (D.SAMPLES_1C_PRE[-1] if cage == "G1.A" else None)
    plan = D.PLAN[cage][0]
    if last[2] >= plan:
        return 0, "at/above plan"
    sg = sgr(prev[2], last[2], (d(last[0]) - d(prev[0])).days) if prev else None
    if not sg or sg < 0.3:
        return 60, "no usable SGR; 60-day default"
    return min(max(math.log(plan / last[2]) / (sg / 100), 0), 90), "ABW gap / recent SGR"


def month_of(x):
    return x[:7]


def r7():
    s = []
    batch_of = {c[0]: c[3] for c in D.CAGE_CLOSE}
    rows, base_m, early_m, late_m = [], {}, {}, {}
    for cage, p in D.PLAN.items():
        lag, how = lag_days(cage)
        late_dt = (d(p[1]) + timedelta(days=round(lag))).isoformat()
        rows.append([batch_of[cage], cage, f"{[c for c in D.CAGE_CLOSE if c[0] == cage][0][7]:.1f}", p[1], n0(p[3]), p[4], n0(p[6]),
                     f"{lag:.0f}", late_dt])
        base_m[month_of(p[1])] = base_m.get(month_of(p[1]), 0) + p[3]
        early_m[month_of(p[4])] = early_m.get(month_of(p[4]), 0) + p[6]
        late_m[month_of(late_dt)] = late_m.get(month_of(late_dt), 0) + p[3] * 1  # same kg, later date
    s.append(kpis([("4,389 fish / 975 kg", "available now at > 150 g (2D, 222 g)"), ("3 harvests", "3D sold 2,487 fish at 110-134 g in Sep"),
                   (n0(base_m.get("2026-12", 0) + base_m.get("2027-01", 0) + base_m.get("2027-02", 0)) + " kg", "baseline Dec-Feb supply (existing stock)"),
                   (n0(sum(p[3] for p in D.PLAN.values())) + " kg", "baseline harvest of existing stock at 400 g"), ("Not recorded", "broodstock / reserved stock")]))
    s.append(h2("Existing stock - harvest date by scenario"))
    s.append(table(["Batch", "Cage", "ABW now g", "Baseline date (400 g)", "Baseline kg", "Early date (250 g)", "Early kg", "Delay days", "Delayed date"], rows,
                   [0.08, 0.06, 0.08, 0.15, 0.1, 0.15, 0.1, 0.1, 0.18]))
    s.append(small("Baseline = draft plan rev 6 (model v2, harvest at 400 g). Early sale = first date the model reaches 250 g (the cycle target on older batches); "
                   "fish weigh 250 g, so biomass is lower than at 400 g. Delayed growth = baseline shifted by the time each cage needs to grow from its "
                   "measured ABW to the plan's assumed ABW at its latest measured SGR (capped at 90 days; 60 days where no usable growth rate). "
                   "These are scenarios, not forecasts."))
    months = sorted(set(base_m) | set(early_m) | set(late_m))
    months = [m for m in months if "2026-10" <= m <= "2027-06"]
    rows = [[m, n0(base_m.get(m, 0)), n0(early_m.get(m, 0)), n0(late_m.get(m, 0))] for m in months]
    rows.append(["TOTAL", n0(sum(base_m.get(m, 0) for m in months)), n0(sum(early_m.get(m, 0) for m in months)), n0(sum(late_m.get(m, 0) for m in months))])
    s.append(h2("Harvestable biomass by month, existing stock only (kg)"))
    s.append(table(["Month", "Baseline (400 g)", "Early sale (250 g)", "Delayed growth (400 g, later)"], rows, [0.2, 0.26, 0.27, 0.27], bold_last=True))
    chart_block("Harvest kg by month: baseline, early sale, delayed growth", months,
                [("Baseline (400 g)", [base_m.get(m, 0) for m in months]), ("Early sale (250 g)", [early_m.get(m, 0) for m in months]),
                 ("Delayed growth", [late_m.get(m, 0) for m in months])])
    ch = Drawing(CW, 140)
    bc = VerticalBarChart()
    bc.categoryAxis.labels.fontName = bc.valueAxis.labels.fontName = "PlexSans"
    bc.bars.strokeColor = None
    bc.x, bc.y, bc.height, bc.width = 40, 25, 100, CW - 60
    bc.data = [[base_m.get(m, 0) for m in months[:-0] or months], [early_m.get(m, 0) for m in months], [late_m.get(m, 0) for m in months]]
    bc.categoryAxis.categoryNames = months
    bc.categoryAxis.labels.fontSize = 7
    bc.valueAxis.labels.fontSize = 7
    bc.valueAxis.labelTextFormat = lambda v: f"{v / 1000:.0f}t"
    bc.bars[0].fillColor, bc.bars[1].fillColor, bc.bars[2].fillColor = TEAL, colors.HexColor("#E0A526"), colors.HexColor("#9CA3AF")
    ch.add(bc)
    ch.add(String(40, 130, "Harvest kg by month: baseline (teal), early sale (amber), delayed growth (grey)", fontName="PlexSans", fontSize=8, fillColor=GREY))
    s.append(ch)
    s.append(h2("Sellable now vs December-February supply"))
    tot_base, tot_early, tot_late = sum(base_m.values()), sum(early_m.values()), sum(late_m.values())
    dfm = ("2026-12", "2027-01", "2027-02")
    df_base, df_early, df_late = (sum(x.get(m, 0) for m in dfm) for x in (base_m, early_m, late_m))
    s.append(table(["Question", "Answer from recorded data and the plan"], [
        ["What can be sold today?", "2D holds 4,389 fish at 222 g (about 975 kg). 2C (132 g, 9,582 fish) and 3D (116 g, 2,964 fish; already being partially harvested at 110-134 g) are the next largest."],
        ["Does selling early undermine Dec-Feb supply?", f"Baseline Dec-Feb supply is {n0(df_base)} kg ({n0(base_m.get('2026-12', 0))} / {n0(base_m.get('2027-01', 0))} / {n0(base_m.get('2027-02', 0))} kg). "
         f"Early sale at 250 g brings {n0(early_m.get('2026-12', 0))} kg into Dec and leaves Feb at {n0(early_m.get('2027-02', 0))} kg; Dec-Feb totals {n0(df_early)} kg, "
         f"but the existing stock yields {n0(tot_early)} kg instead of {n0(tot_base)} kg ({(1 - tot_early / tot_base) * 100:.0f}% less) because the fish are sold smaller."],
        ["How exposed is the plan to slow growth?", f"Measured ABW is below plan in 15 of 16 cages. If each cage needs the extra time estimated above, Dec-Feb supply falls to {n0(df_late)} kg "
         f"({(1 - df_late / df_base) * 100:.0f}% below baseline) and the weight moves into Mar-May 2027."],
        ["Reserved broodstock", "Not recorded: no stock-purpose field. Broodstock to keep back must be set before any sale."],
        ["Planned partial harvests", "Only recorded partial harvests exist (3D: 753, 989, 745 fish on 16, 19 and 29 Sep); no future partial harvest is planned in the draft."],
    ], [0.25, 0.75]))
    return build("07-harvest-availability-and-scenarios.pdf", "Harvest Availability and Scenario Report",
                 "Which fish can we sell now without undermining December-February supply?", s)


# ----------------------------------------------------------------------------- 8. feed requirement & purchasing
def r8():
    s = []
    model_30d = sum(w[1] for w in D.FEED_WEEKLY[:4]) * 30 / 28
    ratio = D.ACTUAL_FEED_30D / model_30d
    scen = {"Slower (observed pace)": ratio, "Base (plan model v2)": 1.0, "Faster (+15%)": 1.15}
    s.append(kpis([(n0(D.ACTUAL_FEED_30D) + " kg", "fed 24 Aug-23 Sep (recorded)"), (n0(model_30d) + " kg", "model-implied next 30 days"),
                   (f"{ratio:.2f}x", "observed / model feed ratio"), ("0 kg", "incoming orders recorded"), ("30-90 days", "supplier lead times")]))
    s.append(note("<b>Why forecasts differ:</b> the plan's weekly feed is derived as model growth gain x the model's biological FCR "
                  f"({D.GROWTH_MODEL['fcr_start']} to {D.GROWTH_MODEL['fcr_end']}). It starts from model ABWs that exceed measured ABWs, so it asks for "
                  f"about {1 / ratio:.1f}x the feed the farm actually fed last month. The 'slower' scenario scales the model to the observed pace; "
                  "'faster' adds 15% for growth catching up."))
    s.append(h2("Weekly feed requirement, base scenario (kg) by pellet size"))
    rows = [[w[0], n0(w[1]), n0(w[2]), n0(w[3]), n0(w[4]), n0(w[5]), n0(w[6])] for w in D.FEED_WEEKLY]
    tot = [sum(w[i] for w in D.FEED_WEEKLY) for i in range(1, 7)]
    rows.append(["16 weeks"] + [n0(x) for x in tot])
    s.append(table(["Week starting", "Total", "0.5-1.0 mm", "1.0-1.5 mm", "2 mm", "3 mm", "4 mm"], rows, [0.16, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14], bold_last=True))
    chart_block("Base weekly feed requirement (kg), plan model v2", [w[0][5:] for w in D.FEED_WEEKLY],
                [("Feed kg", [w[1] for w in D.FEED_WEEKLY])])
    ch = Drawing(CW, 130)
    bc = VerticalBarChart()
    bc.categoryAxis.labels.fontName = bc.valueAxis.labels.fontName = "PlexSans"
    bc.bars.strokeColor = None
    bc.x, bc.y, bc.height, bc.width = 40, 22, 95, CW - 60
    bc.data = [[w[1] for w in D.FEED_WEEKLY]]
    bc.categoryAxis.categoryNames = [w[0][5:] for w in D.FEED_WEEKLY]
    bc.categoryAxis.labels.fontSize = 6.5
    bc.valueAxis.labels.fontSize = 7
    bc.bars[0].fillColor = TEAL
    ch.add(bc)
    ch.add(String(40, 120, "Base weekly feed requirement (kg), plan model v2", fontName="PlexSans", fontSize=8, fillColor=GREY))
    s.append(ch)
    s.append(h2("Stock cover and run-out by pellet size"))
    bands = [("0.5-1.0mm", 2), ("1.0-1.5mm", 3), ("2mm", 4), ("3mm", 5), ("4mm", 6)]
    stock = {fid: row for fid, *row in [(r[0], *r[1:]) for r in D.FEED_STOCK]}
    rows, runouts = [], {}
    for band, col in bands:
        have = sum(max(stock[f][2], 0) for f in D.BAND_STOCK[band])
        line = [band, ", ".join(f"ft{f}" for f in D.BAND_STOCK[band]), n0(have), n0(sum(w[col] for w in D.FEED_WEEKLY))]
        for name, k in scen.items():
            cum, runout = 0, None
            for i, w in enumerate(D.FEED_WEEKLY):
                cum += w[col] * k
                if cum > have and runout is None:
                    runout = d(w[0]) + timedelta(days=int(7 * (have - (cum - w[col] * k)) / max(w[col] * k, 1)))
            line.append(runout.isoformat() if runout else "> 16 wk")
            runouts[(band, name)] = runout
        rows.append(line)
    s.append(table(["Pellet", "Stock lines", "Book stock kg (23 Sep)", "16-wk base need kg", "Run-out: slower", "Run-out: base", "Run-out: faster"], rows,
                   [0.1, 0.14, 0.16, 0.16, 0.15, 0.15, 0.14]))
    s.append(small("Book stock is the feed_inventory_movement ledger to 23 Sep; negative lines are floored at 0. 4.5 mm Aller feed (ft23) is counted "
                   "with 4 mm. Last physical stock count: 28 Aug (26 days earlier). No incoming deliveries are recorded (feed_incoming_delivery is empty)."))
    s.append(h2("Purchasing: order-by dates (run-out minus supplier lead time)"))
    extract = date(2026, 10, 1)
    rows = []
    for band in ("2mm", "3mm", "4mm"):
        for name in scen:
            ro = runouts.get((band, name))
            if ro is None:
                rows.append([band, name, "> 16 weeks", "-", "-", "-"])
                continue
            cells = []
            for sup, lt in D.LEAD_TIMES:
                ob = ro - timedelta(days=lt)
                cells.append(f"{ob.isoformat()}" + ("  LATE" if ob < extract else ""))
            rows.append([band, name, ro.isoformat()] + cells)
    s.append(table(["Pellet", "Scenario", "Run-out"] + [f"Order by ({sup}, {lt} d)" for sup, lt in D.LEAD_TIMES], rows,
                   [0.08, 0.2, 0.14, 0.19, 0.19, 0.2]))
    s.append(small(f"Minimum order {D.MOQ_KG:,} kg (one 25 t container). Lead times from feed_supplier_purchasing_policy; which supplier delivers "
                   "the Koudijs lines is not recorded, so all three are shown. LATE = order-by date is before the 1 Oct extract date."))
    s.append(note("<b>Action:</b> 2 mm feed (Koudijs, 1,045 kg) runs out first - mid-October on the plan's base requirement, mid-December at the pace actually fed. "
                  "On the base plan an order with any listed lead time is already late, so bridge with the 1.0-1.5 mm Aller stock only for the smallest fish and "
                  "confirm real consumption this week. 3 mm and 4 mm cover lasts into late October to December depending on the scenario; each reorder is a 25 t minimum."))
    s.append(h2("Inventory snapshot"))
    rows = [[f"ft{r[0]}", r[2], r[1], n0(r[3]), r[4], n0(r[5]), n0(r[6]), n0(r[7])] for r in D.FEED_STOCK]
    s.append(table(["Feed", "Supplier", "Line", "Book kg 23 Sep", "Last count", "Counted kg", "Book at count", "Used 24 Aug-23 Sep"], rows,
                   [0.07, 0.12, 0.17, 0.12, 0.12, 0.12, 0.12, 0.16]))
    return build("08-feed-requirement-and-purchasing.pdf", "Feed Requirement and Purchasing Report",
                 "How much feed should we order, and when?", s)


# ----------------------------------------------------------------------------- 9. cage allocation & batch mixing
def r9():
    s = []
    rows = []
    for c in D.CAGE_CLOSE:
        cage, vol, st, b, fish, sd, n, abw = c
        kg = fish * abw / 1000
        dens = kg / vol
        ready = "Ready (>150 g)" if abw >= 150 else ("Approaching" if abw >= 100 else "No")
        rows.append([cage, st.replace("_", "-"), n0(vol), b, D.ORIGIN[b][0].split()[0], n0(fish), f"{abw:.1f}", n0(kg), f"{dens:.1f}", ready])
    for cg, vol, stg in D.FREE_CAGES:
        rows.append([cg, stg.replace("_", "-"), n0(vol), "-", "-", "0", "-", "0", "0.0", "Available"])
    s.append(kpis([("19", "active cages"), ("16", "occupied"), ("3", "available (1B, 1C, 2E)"), ("12.5 kg/m3", "highest density (1E)"),
                   ("0", "batch combinations on record")]))
    s.append(h2("Current occupancy and density (23 Sep)"))
    s.append(table(["Cage", "Stage", "Volume m3", "Batch", "Origin", "Fish", "ABW g", "Biomass kg", "kg/m3", "Transfer readiness"], rows,
                   [0.07, 0.09, 0.09, 0.09, 0.1, 0.1, 0.08, 0.1, 0.08, 0.2]))
    s.append(small("Usable volume = recorded system volume; net-pen depth and oxygen limits are not applied. Density is biomass / volume. "
                   "A farm density ceiling is not recorded, so no cage is flagged as overstocked; the plan's own limit is not defined."))
    s.append(h2("Proposed combinations (similar ABW, same stage, compatible origin first)"))
    cg = {c[0]: c for c in D.CAGE_CLOSE}

    def load(a, b):
        f = cg[a][4] + cg[b][4]
        kg = (cg[a][4] * cg[a][7] + cg[b][4] * cg[b][7]) / 1000
        return f"{n0(f)} fish / {n0(kg)} kg in one 125 m3 cage = {kg / 125:.1f} kg/m3"
    props = [
        ("1D (96.0 g, 16,173) + 3D (116.4 g, 2,964)", "03.26c + 03.26b", "Kimbwela + Kimbwela", load("1D", "3D"),
         "Frees 1 cage; both are 96-116 g. 3D is already being harvested at 110-134 g."),
        ("1A (47.2 g, 7,690) + 2B (41.7 g, 12,996)", "03.26aK + 05.26b", "Kipili + Kimbwela", load("1A", "2B"),
         "Frees 1 cage; mixes origins - keep both batch IDs with fish counts so comparisons remain possible."),
        ("3A (47.0 g, 25,409) + 1E (54.5 g, 28,707)", "05.26aK + 03.26aK", "Kimbwela + Kipili", load("3A", "1E"),
         "Too dense for a 125 m3 cage; only workable in G1.D / G1.A volume."),
        ("2C (132 g, 9,582) + 2D (222 g, 4,389)", "02.26b + 02.26b", "Same batch", load("2C", "2D"),
         "ABW differs by 68%; regrade first, do not combine as-is."),
    ]
    s.append(table(["Cages (ABW, fish)", "Batches", "Origins", "Combined load", "Comment"], [list(p) for p in props], [0.24, 0.14, 0.14, 0.24, 0.24]))
    s.append(note("<b>Preserving batch contribution:</b> the database has batch_combination and batch_combination_component tables, with a derived batch "
                  "and per-component fish counts (none created yet). Combine through that route (not by re-labelling) so each source batch's "
                  "share survives for performance comparison. Mixed cages should be sampled by origin before the next monthly close."))
    s.append(h2("Cycle records that no longer match cages"))
    s.append(table(["Cage", "Cycle batch still 'ongoing'", "Where the fish are now", "Issue"], [
        ["1B", "02.26cK (cycle 13)", "G1.A", "Cage is 'available' but cycle open"],
        ["1C", "03.26b (cycle 14)", "3D", "Cage is 'available' but cycle open; 02.26cK also moved through 1C"],
        ["2B", "02.26aK (cycle 10) and 05.26b (cycle 24)", "G1.D and 2B", "Two ongoing cycles in one cage"],
    ], [0.1, 0.3, 0.2, 0.4]))
    return build("09-cage-allocation-and-batch-mixing.pdf", "Cage Allocation and Batch-Mixing Report",
                 "How do we fill finishing cages while keeping meaningful comparisons?", s)


# ----------------------------------------------------------------------------- 10. data exceptions
def r10():
    s = []
    ex = [
        ("Conflicting count", "High", "02.26cK: 1B -1,008, 1C -749 and 1A -11 book fish; reconciliation rows record confirmed 0 but ledger not adjusted", "Farm manager", "Open"),
        ("Unexplained loss", "High", "02.26cK: 11,259 fish (673.8 kg) booked 'lost / unaccounted' on 28 Aug, entered 1 Sep outside the app form", "Farm manager", "Open"),
        ("Unbalanced transfer", "High", "02.26cK transferred 37,209 fish out of 1C into G1.A; 1C held 36,460 (749 more fish out than in)", "Data lead", "Open"),
        ("Post-transfer mortality", "Medium", "02.26cK recorded 2,024 deaths in the window (2.8% of opening), the most of any batch, after the 1B/1C to G1.A transfers", "Farm manager", "Monitoring"),
        ("Forecast on obsolete assumption", "High", "Plan rev 6 starts 15 of 16 cages above measured ABW (up to 39%); model feed is 2.2x what was fed", "Production planner", "Open"),
        ("Overdue / missing sample", "Medium", "05.26b / 2B: no 23 Aug sample (latest 23 Jul); 08.26 and 09.26a: no opening sample; 1B: last sample 14 Aug (30 fish)", "Sampling lead", "Open"),
        ("Small sample", "Medium", "n < 150 at close: G1.D (100), 2C (100), 2D (100), 3D (125)", "Sampling lead", "Open"),
        ("Unusual ABW change", "Medium", "2D 184.6 to 222.1 g in 20 days (n = 50 then 100); 2C 112.3 to 132.1 g in the same 20 days; G1.A 59.7 to 63.0 g in 12 days", "Sampling lead", "Open"),
        ("Invalid / implausible harvest rows", "Medium", "03.26aK 13 Apr: 1,565 fish at 1.0 g/fish; 06.26a 17 Jun: 15 fish 0.025 kg; 08.26 22 Sep: 20 fish at 6.8 g - culls or samples coded as harvest", "Data lead", "Open"),
        ("Batch stocked above delivery", "Medium", "08.26: stocked 19,861 vs delivered 18,254 (+1,607 on a second stocking record after 23 Aug)", "Data lead", "Open"),
        ("Planned stocking not recorded", "Medium", "80,000 fish planned for 25 Sep (and 50,000 for 1 Oct) have no stocking record; the latest stocking record is 4 Sep (data to 29 Sep)", "Production planner", "Open"),
        ("Missing feed records", "Low", "09.26a fed on 19 of 20 days since stocking; all other batches fed all 31 days", "Feed store", "Open"),
        ("Invalid FCR", "Medium", "02.26cK, 05.26b, 08.26, 09.26a cannot support a ratio; eFCR on 02.26aK is 2.59 with n=100", "Production planner", "Open"),
        ("Feed inventory conflict", "Medium", "Aller 2 mm 40% CP is -60.5 kg book; four Aller lines show 0 kg counted but 5,041 kg book; last count 28 Aug", "Feed store", "Open"),
        ("Cycle records out of step", "Medium", "Cycles still ongoing in 1B, 1C and two in 2B though fish moved; cage statuses 'available'", "Data lead", "Open"),
        ("Missing data classes", "Info", "No water quality rows, no physical count rows, no handling-time or stock-purpose fields", "Farm manager", "Open"),
    ]
    sev = {"High": 0, "Medium": 1, "Low": 2, "Info": 3}
    cnt = {k: sum(1 for e in ex if e[1] == k) for k in sev}
    s.append(kpis([(str(len(ex)), "exceptions"), (str(cnt["High"]), "high"), (str(cnt["Medium"]), "medium"), (str(cnt["Low"] + cnt["Info"]), "low / info"),
                   ("No", "numbers ready for sign-off")]))
    s.append(h2("Exceptions register"))
    rows = [[str(i + 1), e[0], e[1], e[2], e[3], e[4]] for i, e in enumerate(sorted(ex, key=lambda x: sev[x[1]]))]
    s.append(table(["#", "Type", "Severity", "Detail", "Owner (suggested role)", "Status"], rows, [0.03, 0.14, 0.06, 0.55, 0.13, 0.09]))
    s.append(note("<b>Can management trust this month's numbers?</b> Deaths, feed fed and harvest kg are recorded totals and reconcile to the "
                  "source tables. Closing fish counts, biomass and FCR should not be treated as certified until the 02.26cK count, the "
                  "11,259-fish loss and the sampling gaps are resolved. Owners are suggested roles, not assigned people."))
    s.append(small("Comparison note: batch names match the Tanlake Samaki monthly report, but counts differ for the same date (for example 02.26b opening "
                   "14,081 here against 11,021 in the Tanlake report). This database is a separate dataset; do not mix the two when reconciling."))
    return build("10-data-exceptions-and-monthly-close.pdf", "Data Exceptions and Monthly Close Report",
                 "Can management trust this month's numbers?", s)


if __name__ == "__main__":
    for fn in (r1, r2, r3, r4, r5, r6, r7, r8, r9, r10):
        print(fn())
