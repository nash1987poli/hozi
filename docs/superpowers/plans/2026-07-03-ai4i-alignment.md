# Hozi AI4I 2026 Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Hozi repository, evidence pack, and submission documents into full compliance with the POTRAZ AI4I 2026 Development Track ToR and scoring rubric, repositioned as National Foresight & Decision Infrastructure (wedge strategy).

**Architecture:** Existing stack unchanged — pure-stdlib Python engine → static vanilla-JS app — extended with: refactored importable engine modules + stdlib unit tests (rubric C1), a baseline-comparison experiment (rubric C2), dataset/AI/business/deployment documentation (C2–C4), an n8n automation workflow definition, and the 10-page proposal PDF.

**Tech Stack:** Python 3 stdlib only (no third-party deps — this is a stated feature), `unittest` (stdlib), Node for `scripts/*.mjs`, n8n (workflow JSON), HTML+headless-print for PDF outputs.

**Spec:** `docs/superpowers/specs/2026-07-03-ai4i-alignment-design.md`

---

## COMPETITION COMPLIANCE REFERENCE (read before any task)

Everything below comes from the AI4I Development Track ToR and the Product Readiness guidance. Executors must treat these as hard constraints.

**Scoring rubric (100 pts):**
- **C1 Technical Feasibility & Code Quality (30):** Exemplary = modular, documented code; no security warnings; lockfiles/clean dependency manifests; unit tests present and passing; **git history shows structured commits** (never squash to single-commit uploads).
- **C2 AI Justification (30):** Exemplary = proves why a baseline algorithm is insufficient; no forced AI. "Sledgehammer-to-crack-a-nut" = fail.
- **C3 Dataset Provenance (20):** Exemplary = dataset statement documenting all sources, processing, labels; synthetic data fully disclosed.
- **C4 Business Model & Edge Feasibility (20):** Exemplary = viable model detailing operating costs, hosting, users. (Edge: N/A for Hozi — state this explicitly.)

**Repo requirements (Product Readiness §6.1):** `README.md`, `/src` or `/app`, `/docs` (architecture diagram, API notes, user guide, screenshots, deployment notes), `/data` or `/sample_data`, `/tests`, `.env.example` (no secrets), dependency manifest, `LICENSE`, commit history. **Never commit keys/tokens — disqualification risk.**

**Proposal format (ToR §6):** PDF only (.docx = disqualified), max 10 pages excl. cover + technical appendices, Arial or Avenir 11pt, 1.15 line spacing, 1-inch margins, filename `[ProjectID]_AI4I_Proposal_Development.pdf` (ProjectID pending portal registration — use `HOZI-TBD` placeholder, replace before submission). Five mandated sections:
1. Problem Definition & Strategic Alignment (1–2 pp)
2. Technical Design & Product Logic (2–3 pp) — architecture diagram, models used, API layer, offline sync, database schemas
3. Deliverables & CCE Implementation Roadmap (2 pp) — timeline, milestones, compute, dependency-locked manifests, ZCHPC CCE deploy/test plan
4. Compliance & Risk Mitigation (1–2 pp) — ethics, Data Protection Act [Ch. 12:07], consent checkbox implementation, model unit testing, cybersecurity
5. Sustainability & Future Adoption (1 p) — cost projections, business model, licensing registry, scaling

**Required deliverables (Product Readiness §13):** written proposal, business model one-pager, deployment plan, repo/evidence pack, architecture diagram, data & AI usage note, demo link, pitch deck, risk & compliance checklist, testing evidence.

**Commit discipline for this plan:** conventional-commit style (`feat:`, `fix:`, `docs:`, `test:`, `chore:`), one logical change per commit, imperative mood — matches C1 "structured commits".

---

## Current-state facts executors need

- `engine/engine.py` — monolithic script: pure functions (`clamp`, `driver_risks`, `model_risk`, `pearson`, `linfit`, `band` at lines 48–62, 86–90, 123–129, 175–176) interleaved with top-level pipeline code (load → validate → forecast → planner → export). Reads `../../Datasets/02_agriculture_climate_market_signals.csv` (OUTSIDE the repo — judges cannot run this; Task 5 fixes it).
- `engine/train_real.py` — real-data training: `ols()` and `predict()` functions + top-level pipeline. Already prints a mean-baseline MAE comparison. LODO r=0.48.
- `data/outcome_labels.csv`, `data/raw/` (gitignored!), `data/real_training_panel.csv`.
- `app/` — static site: `index.html`, `cockpit.js/.css`, `projections.js/json`, `i18n.js`, `briefs.js`, `districts.geo.js`, `name-map.js`, `vendor/`.
- `scripts/` — `generate-briefs.mjs` (Claude API), `check-app.mjs` (app smoke check), `anthropic-key.txt` (gitignored; audit 2026-07-03 confirmed never committed).
- `docs/` — `STRATEGY.md`, `PITCH-DEFENCE.md`, `DEMO-SCRIPT.md`, `DATA-SOURCES-forkA.md`, screenshots.
- No `/tests`, no `requirements.txt`, no `.env.example`, no `CHANGELOG.md`, no architecture diagram file.

---

### Task 1: Refactor `engine/engine.py` into an importable module (no behavior change)

**Files:**
- Modify: `engine/engine.py`

Rubric driver: C1 "modular, well-documented". Also unblocks unit tests (importing the current file executes the whole pipeline).

- [ ] **Step 1: Record the current output as the golden reference**

```bash
cd "C:\Users\MSI\Documents\CLIENTS CURIOUS INQ\P\POTRAZ\Hozi"
python engine/engine.py
cp app/projections.json /tmp/projections.golden.json
```
Expected: prints `districts: 20 ...` diagnostics; golden file saved.

- [ ] **Step 2: Restructure the file mechanically**

Keep, at module level and in this order: the module docstring, imports, path constants (`HERE`…`OUT_DATA`), model constants (`STAPLES`, `MONTHS`, `FUTURE`, `W`, `RAIN_NEED`, `NDVI_HEALTHY`, `SUPPORT_K`), and ALL pure functions, each given a one-line docstring: `clamp`, `driver_risks`, `model_risk`, `fnum`, `pearson`, `linfit`, `band`. Hoist `latest(d)` and `sep_proj(d)` (currently defined mid-pipeline at lines 179–185) to module level unchanged.

Move ALL remaining top-level pipeline code (currently lines 69–83 load, 92–96 validation, 99–120 district series, 131–144 forecast, 150–173 planner/timeline, 187–199 rollup, 202–222 export, 225–233 diagnostics) into a single function, preserving statement order exactly:

```python
def main(src=SRC):
    """Run the full pipeline: load -> validate -> forecast -> plan -> export."""
    # (moved pipeline code, indented one level, `SRC` replaced by `src`)
    ...

if __name__ == "__main__":
    main()
```

Rules: do not rename variables, do not reorder statements, do not change any arithmetic. The only edits are indentation, the `def main(...)` wrapper, docstrings, and the `__main__` guard.

- [ ] **Step 3: Verify byte-identical output**

```bash
python engine/engine.py && diff /tmp/projections.golden.json app/projections.json && echo IDENTICAL
```
Expected: `IDENTICAL`. If any diff appears, the refactor changed behavior — fix before proceeding.

- [ ] **Step 4: Verify import is now side-effect-free**

```bash
python -c "import sys; sys.path.insert(0,'engine'); import engine; print(engine.model_risk({'rainfall_mm':50,'ndvi':0.4,'pest':10,'irrigation':20,'inputs':30}))"
```
Expected: prints a number (e.g. `44.x`), does NOT print pipeline diagnostics.

- [ ] **Step 5: Commit**

```bash
git add engine/engine.py
git commit -m "refactor: make engine importable (main() guard) with docstrings, output verified byte-identical"
```

### Task 2: Same treatment for `engine/train_real.py`

**Files:**
- Modify: `engine/train_real.py`

- [ ] **Step 1: Golden reference**

```bash
python engine/train_real.py > /tmp/train.golden.txt 2>&1; tail -5 /tmp/train.golden.txt
```
Expected: LODO results incl. `r ... : 0.48x`.

- [ ] **Step 2: Restructure** — keep `ALIAS`, `fnum`, `FEATS`, `ols`, `predict` at module level (add one-line docstrings to `ols` and `predict`); wrap everything else in `def main():` + `__main__` guard, same mechanical rules as Task 1.

- [ ] **Step 3: Verify identical output**

```bash
python engine/train_real.py > /tmp/train.new.txt 2>&1 && diff /tmp/train.golden.txt /tmp/train.new.txt && echo IDENTICAL
```
Expected: `IDENTICAL`.

- [ ] **Step 4: Commit**

```bash
git add engine/train_real.py
git commit -m "refactor: make train_real importable with main() guard and docstrings"
```

### Task 3: Unit tests (stdlib `unittest`) for both modules

**Files:**
- Create: `tests/__init__.py` (empty)
- Create: `tests/test_engine.py`
- Create: `tests/test_train_real.py`

- [ ] **Step 1: Write the tests**

`tests/test_engine.py`:
```python
"""Unit tests for the Hozi risk engine (pure stdlib)."""
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "engine"))
import engine


def row(rain=100.0, ndvi=0.70, pest=0.0, irr=0.0, inp=0.0):
    return {"rainfall_mm": rain, "ndvi": ndvi, "pest": pest,
            "irrigation": irr, "inputs": inp}


class TestClamp(unittest.TestCase):
    def test_within_bounds(self): self.assertEqual(engine.clamp(0.5), 0.5)
    def test_below(self): self.assertEqual(engine.clamp(-1), 0.0)
    def test_above(self): self.assertEqual(engine.clamp(2), 1.0)


class TestModelRisk(unittest.TestCase):
    def test_healthy_district_low_risk(self):
        # full rain, healthy ndvi, no pests -> only bias term remains
        self.assertLess(engine.model_risk(row()), 10)

    def test_drought_district_high_risk(self):
        r = engine.model_risk(row(rain=0.0, ndvi=0.0, pest=25.0))
        self.assertGreater(r, 80)

    def test_irrigation_mitigates(self):
        dry = engine.model_risk(row(rain=20.0))
        dry_irrigated = engine.model_risk(row(rain=20.0, irr=100.0))
        self.assertLess(dry_irrigated, dry)

    def test_bounded_0_100(self):
        for r in (row(rain=-500), row(rain=500, ndvi=2, irr=100, inp=100)):
            v = engine.model_risk(r)
            self.assertGreaterEqual(v, 0.0); self.assertLessEqual(v, 100.0)


class TestPearson(unittest.TestCase):
    def test_perfect_positive(self):
        self.assertAlmostEqual(engine.pearson([1, 2, 3], [2, 4, 6]), 1.0)

    def test_perfect_negative(self):
        self.assertAlmostEqual(engine.pearson([1, 2, 3], [6, 4, 2]), -1.0)

    def test_constant_series_returns_zero(self):
        self.assertEqual(engine.pearson([1, 1, 1], [2, 4, 6]), 0.0)


class TestLinfitAndBand(unittest.TestCase):
    def test_linfit_recovers_line(self):
        slope, intercept = engine.linfit([3, 5, 7, 9])  # y = 2x + 3
        self.assertAlmostEqual(slope, 2.0); self.assertAlmostEqual(intercept, 3.0)

    def test_band_thresholds(self):
        self.assertEqual(engine.band(70), "High")
        self.assertEqual(engine.band(50), "Medium")
        self.assertEqual(engine.band(10), "Low")


if __name__ == "__main__":
    unittest.main()
```

`tests/test_train_real.py`:
```python
"""Unit tests for the OLS trainer used on real IPC x CHIRPS data."""
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "engine"))
import train_real


class TestOLS(unittest.TestCase):
    def test_recovers_known_coefficients(self):
        # y = 10 + 2*a - 1*b + 0*c + 0*d  (FEATS has 4 features)
        rows = []
        for a in range(6):
            for b in range(6):
                rows.append({"x": [a, b, 1.0, 2.0], "y": 10 + 2 * a - b})
        w = train_real.ols(rows)
        self.assertAlmostEqual(w[1], 2.0, places=6)
        self.assertAlmostEqual(w[2], -1.0, places=6)

    def test_predict_matches_manual(self):
        w = [1.0, 2.0, 3.0, 0.0, 0.0]
        self.assertAlmostEqual(train_real.predict(w, [10, 1, 0, 0]), 24.0)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run and verify all pass**

```bash
python -m unittest discover -s tests -v
```
Expected: `OK` with 11+ tests. (If any fail, fix the TEST assumptions first — Tasks 1–2 verified the engine is unchanged, so the code is the reference.)

- [ ] **Step 3: Commit**

```bash
git add tests/
git commit -m "test: stdlib unit tests for risk model, pearson, linfit, band, OLS trainer"
```

### Task 4: Baseline comparison experiment (the C2 centerpiece)

**Files:**
- Create: `engine/baselines.py`
- Create (generated): `docs/BASELINE-RESULTS.md`

Purpose: prove (or honestly fail to prove) that the trained model beats simpler approaches, on the SAME leave-one-district-out protocol. Three baselines: (a) global mean, (b) district persistence (district's mean of *other* periods), (c) rainfall rule ("high insecurity iff 3-month rainfall anomaly below threshold" — grid-search the threshold on train folds only).

- [ ] **Step 1: Write `engine/baselines.py`**

```python
"""
Baseline comparison for Hozi's trained model (AI4I rubric C2).

Answers the judges' question directly: is AI justified, or would a
simple rule do? All methods evaluated with the SAME leave-one-district-out
protocol on the same real panel (IPC Phase 3+ % x CHIRPS rainfall).

Baselines:
  1. global-mean      : predict the training-set mean (no skill floor)
  2. persistence      : predict the district's own mean from other periods
                        (needs no rainfall data at all)
  3. rainfall-rule    : two-level rule on r3q (3-month rainfall anomaly);
                        threshold + levels fitted on train fold only
Model:
  4. OLS on 4 rainfall features (train_real.ols) - the submitted model

Outputs a markdown table to docs/BASELINE-RESULTS.md and prints it.
Pure stdlib. Deterministic.
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import train_real

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "docs", "BASELINE-RESULTS.md")
R3Q = train_real.FEATS.index("r3q")


def build_panel():
    """Reuse train_real's data loading by running its pipeline steps."""
    # train_real.main() writes the panel csv; read it back for independence.
    train_real.main()
    import csv
    panel = []
    with open(os.path.join(ROOT, "data", "real_training_panel.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            panel.append({"district": r["district"], "period": r["period"],
                          "x": [float(r[k]) for k in train_real.FEATS],
                          "y": float(r["food_insecurity_pct"])})
    return panel


def metrics(pairs):
    ys = [a for a, _ in pairs]; ps = [b for _, b in pairs]
    my, mp = sum(ys) / len(ys), sum(ps) / len(ps)
    mae = sum(abs(a - b) for a, b in pairs) / len(pairs)
    va = sum((a - my) ** 2 for a in ys); vb = sum((b - mp) ** 2 for b in ps)
    if va == 0 or vb == 0:
        return 0.0, mae
    r = sum((a - my) * (b - mp) for a, b in pairs) / math.sqrt(va * vb)
    return r, mae


def fit_rule(train):
    """Grid-search a two-level rainfall rule on the train fold only."""
    best = None
    lo_candidates = [p["y"] for p in train]
    mean_y = sum(lo_candidates) / len(lo_candidates)
    for q in range(-30, 31, 2):          # threshold on r3q anomaly
        wet = [p["y"] for p in train if p["x"][R3Q] >= q]
        dry = [p["y"] for p in train if p["x"][R3Q] < q]
        if not wet or not dry:
            continue
        pw, pd = sum(wet) / len(wet), sum(dry) / len(dry)
        sse = sum((p["y"] - (pw if p["x"][R3Q] >= q else pd)) ** 2 for p in train)
        if best is None or sse < best[0]:
            best = (sse, q, pw, pd)
    if best is None:
        return lambda x: mean_y
    _, q, pw, pd = best
    return lambda x: pw if x[R3Q] >= q else pd


def run():
    panel = build_panel()
    districts = sorted(set(p["district"] for p in panel))
    results = {"global-mean": [], "persistence": [], "rainfall-rule": [], "OLS model": []}
    for d in districts:
        train = [p for p in panel if p["district"] != d]
        test = [p for p in panel if p["district"] == d]
        gmean = sum(p["y"] for p in train) / len(train)
        rule = fit_rule(train)
        w = train_real.ols(train)
        for p in test:
            results["global-mean"].append((p["y"], gmean))
            results["persistence"].append((p["y"], gmean))  # replaced below if possible
            others = [q["y"] for q in panel
                      if q["district"] == d and q["period"] != p["period"]]
            if others:
                results["persistence"][-1] = (p["y"], sum(others) / len(others))
            results["rainfall-rule"].append((p["y"], rule(p["x"])))
            results["OLS model"].append(
                (p["y"], max(0.0, min(100.0, train_real.predict(w, p["x"])))))

    lines = ["# Baseline comparison (leave-one-district-out, real IPC x CHIRPS panel)",
             "",
             f"Panel: {len(panel)} observations, {len(districts)} districts.",
             "",
             "| Method | r | MAE (pp) |",
             "|---|---|---|"]
    print(f"{'method':14s} {'r':>7s} {'MAE':>7s}")
    for name, pairs in results.items():
        r, mae = metrics(pairs)
        lines.append(f"| {name} | {r:.3f} | {mae:.1f} |")
        print(f"{name:14s} {r:7.3f} {mae:7.1f}")
    lines += ["",
              "Note on persistence: it uses the district's own OTHER-season outcomes, "
              "information unavailable for a district never assessed - the model needs "
              "only rainfall. All fitting (rule threshold, OLS weights) done on the "
              "train fold only.", ""]
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"\nwrote {OUT}")


if __name__ == "__main__":
    run()
```

- [ ] **Step 2: Run it**

```bash
python engine/baselines.py
```
Expected: a 4-row table; OLS model r ≈ 0.48. Whatever the baseline numbers are, they are the results — do NOT tune the model in response. If a baseline wins on a metric, that goes in the report verbatim (the proposal frames it per spec §7).

- [ ] **Step 3: Sanity-check the generated `docs/BASELINE-RESULTS.md`** — table renders, note paragraph present.

- [ ] **Step 4: Commit**

```bash
git add engine/baselines.py docs/BASELINE-RESULTS.md
git commit -m "feat: baseline comparison experiment (global-mean, persistence, rainfall-rule vs OLS) on LODO protocol"
```

### Task 5: Vendor sample data + dependency manifests + .env.example

**Files:**
- Create: `sample_data/02_agriculture_climate_market_signals.csv` (copy from `../Datasets/`)
- Create: `sample_data/README.md`
- Create: `requirements.txt`
- Create: `scripts/package.json`
- Create: `.env.example`
- Modify: `engine/engine.py` (SRC fallback), `.gitignore`

- [ ] **Step 1: Copy the challenge CSV into the repo** (it is programme-provided synthetic data — redistribution inside the submission is the intended use; note this in `sample_data/README.md`):

```bash
cp "../Datasets/02_agriculture_climate_market_signals.csv" sample_data/
```

`sample_data/README.md`:
```markdown
# Sample data

`02_agriculture_climate_market_signals.csv` — synthetic challenge dataset
provided by POTRAZ for AI4I 2026 (programme-provided; not real observations).
Used by `engine/engine.py` so judges can run the full pipeline offline.

Real-data training inputs (IPC/ZimVAC outcome labels + CHIRPS rainfall, HDX/WFP,
OCHA pcodes) are documented in `docs/DATASET-STATEMENT.md`; bulk raw files are
not committed — `engine/train_real.py` documents their exact sources and layout.
```

- [ ] **Step 2: Point the engine at the vendored copy first** — in `engine/engine.py` replace the `SRC` constant with:

```python
_CANDIDATES = [
    os.path.join(ROOT, "sample_data", "02_agriculture_climate_market_signals.csv"),
    os.path.normpath(os.path.join(ROOT, "..", "Datasets",
                     "02_agriculture_climate_market_signals.csv")),
]
SRC = next((p for p in _CANDIDATES if os.path.exists(p)), _CANDIDATES[0])
```

Run `python engine/engine.py && python -m unittest discover -s tests` — expected: same diagnostics, tests `OK`.

- [ ] **Step 3: Manifests.** `requirements.txt`:
```
# Hozi engine: Python standard library ONLY - zero third-party dependencies.
# This is deliberate: auditable line-by-line, runs anywhere Python 3.9+ runs,
# including the ZCHPC CCE, with no supply-chain surface.
# python_requires >= 3.9
```
`scripts/package.json`:
```json
{
  "name": "hozi-scripts",
  "private": true,
  "description": "Operational scripts: Claude brief generation, app smoke check",
  "engines": { "node": ">=18" },
  "dependencies": {}
}
```
(Then check the two `.mjs` files: if `generate-briefs.mjs`/`check-app.mjs` import any npm package, add it with an exact pinned version and run `npm install` inside `scripts/` to produce `package-lock.json`; if they use only `node:` builtins and `fetch`, dependencies stays empty and note that in the description.)

- [ ] **Step 4: `.env.example`**:
```
# Copy to scripts/anthropic-key.txt OR export as env var - NEVER commit real keys.
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

- [ ] **Step 5: Run everything once more, then commit**

```bash
python engine/engine.py && python -m unittest discover -s tests && git add sample_data requirements.txt scripts/package.json .env.example engine/engine.py .gitignore && git commit -m "chore: vendor challenge sample data, add dependency manifests and .env.example (AI4I repo standards)"
```

### Task 6: Dataset statement (C3)

**Files:**
- Create: `docs/DATASET-STATEMENT.md`

- [ ] **Step 1: Write the document** with exactly these sections (content assembled from `docs/DATA-SOURCES-forkA.md`, `engine/train_real.py` docstring, and README data table):
  1. **Data inventory table** — one row per dataset: name | source & URL | license/rights | role in Hozi | real or synthetic. Rows: POTRAZ synthetic challenge CSV (programme-provided, synthetic — fully disclosed per C3); IPC/ZimVAC Phase 3+ district outcomes 2019–2020 (public IPC reports); CHIRPS district rainfall dekads via HDX/WFP (public, CC-BY); OCHA COD admin2 pcodes (public).
  2. **Processing & labels** — the join (pcode/name aliasing), feature construction (r1h/r3h/rfq/r3q dekad means), label definition (IPC Phase 3+ %), panel size, `data/real_training_panel.csv` as the reproducible artifact.
  3. **Synthetic data disclosure** — the demo app runs on the POTRAZ synthetic dataset; no GAN/diffusion generation is used anywhere; the r=0.81 figure is an internal consistency check on synthetic data, NOT outcome validation (that is the r=0.48 LODO result on real data).
  4. **Quality limits & gaps** — 4 seasons only; rainfall-only features; district renames/aliases; refresh frequency of each source.
  5. **Personal data: none collected** — all inputs are district-level aggregates; DPA [Ch. 12:07] exposure is minimal by design.
- [ ] **Step 2: Commit** — `git commit -m "docs: dataset statement - provenance, processing, synthetic disclosure, limits (rubric C3)"`

### Task 7: AI usage note (C2 written evidence)

**Files:**
- Create: `docs/AI-USAGE-NOTE.md`

- [ ] **Step 1: Write it** with sections: (1) **Two-layer AI design** — copy the Layer 1/Layer 2 definitions and guardrail list verbatim from spec §3 (LLM is read-only: validates / reasons / suggests; never creates or edits data; advisory-only; logged; human review; ZimVAC/ministry authority). (2) **Why AI at all** — reference `docs/BASELINE-RESULTS.md` numbers; state plainly what the model adds over each baseline and what it cannot do. (3) **Why an LLM for Layer 2** — multilingual (en/sn/nd) reasoning over institutional evidence and contradiction-flagging are not achievable with rules/templates at usable quality; cite the 20-district × 3-language playbook generation as the concrete workload. (4) **Prompt design & guardrails** — summarize how `scripts/generate-briefs.mjs` constrains Claude (inputs supplied, structure enforced, advisory labels), plus the honesty panel disclosure in-app. (5) **AI-assisted development disclosure** — built with Claude as pair-developer; team understands and can explain every line (ToR explicitly permits this with understanding).
- [ ] **Step 2: Commit** — `git commit -m "docs: AI usage note - two-layer design, baseline evidence, LLM guardrails (rubric C2)"`

### Task 8: Business model one-pager + deployment plan (C4)

**Files:**
- Create: `docs/BUSINESS-MODEL.md`
- Create: `docs/DEPLOYMENT-PLAN.md`

- [ ] **Step 1: `BUSINESS-MODEL.md`** — use the Product Readiness **Annex A** field list verbatim as headings (Problem / Primary user / Beneficiary / Customer or payer / Value proposition / Revenue or funding model / Cost drivers / Partnerships / Pilot market / Adoption risks / Success metrics). Content per spec §4: hybrid model — donor/programme-funded public-good pilot (named candidates: WFP Zimbabwe, FAO, UNDP resilience programmes; government operates via ZimVAC/Ministry of Agriculture) → per-domain institutional licensing as modules expand (health → MoHCC, climate → Dept of Civil Protection). Include the pilot cost table (US$65–155/mo, itemized as in spec §4) and 3-month pilot + 1-year scale budget lines. Success metrics: lead-time of warnings vs ZimVAC cycle, districts covered, alert delivery rate, playbook usage by district officers.
- [ ] **Step 2: `DEPLOYMENT-PLAN.md`** — use **Annex B** fields verbatim as headings (Deployment environment / Hosting / Operator / Pilot site / Users to onboard / Training & support / Monitoring / Backup & recovery / Connectivity plan / Scale pathway / Milestones). Key content: VPS (2GB) hosts n8n + engine; static app on GitHub Pages; demo now, ZCHPC CCE for national deployment (state: containerizable — stdlib Python + static files + n8n docker image; no GPU required); pilot = one drought-prone district cluster with ZimVAC/Agritex district officers (10–20 users); onboarding via WhatsApp guide in local language; monitoring via n8n execution logs + uptime check; backup = nightly JSON/CSV export to object storage + git; connectivity = WhatsApp/SMS alert delivery (works on 2G, no app install); 30/60/90-day milestones from Product Readiness §12.2 adapted to Hozi. Add an explicit line: **Edge feasibility: N/A — Hozi is server-side + static web; no on-device inference** (rubric C4 asks).
- [ ] **Step 3: Commit** — `git commit -m "docs: business model one-pager and deployment plan per Annex A/B templates (rubric C4)"`

### Task 9: Risk & compliance checklist + testing evidence

**Files:**
- Create: `docs/RISK-COMPLIANCE.md`
- Create: `docs/TESTING-EVIDENCE.md`

- [ ] **Step 1: `RISK-COMPLIANCE.md`** — sections: (1) Data Protection Act [Ch. 12:07] position — no personal data processed; if district-officer reporting is added later, consent + minimisation applies, with the **consent checkbox implementation** described (a required, unticked-by-default checkbox on the report form, storing timestamped consent with the submission — describe even though not yet built, as ToR §6 Section 4 requires the detail). (2) Responsible AI risks table — risk | mitigation rows for: over-trust in forecasts (honesty panel + widening confidence bands + advisory labels), LLM error (read-only design, logging, human review), bias/underserved districts (LODO validation across ALL districts; missing-data districts flagged not silently scored), misuse (misreading planner output as budget allocation — explicit "never sets budgets" rule in UI). (3) Security — no secrets in repo (audit date 2026-07-03), key handling via env/gitignored file, static frontend = minimal attack surface, VPS hardening basics for pilot, dependency surface = zero third-party Python packages. (4) Model unit testing — pointer to `/tests` and CI-style run command.
- [ ] **Step 2: `TESTING-EVIDENCE.md`** — paste actual outputs: `python -m unittest discover -s tests -v` result, `python engine/engine.py` diagnostics, `python engine/baselines.py` table, `node scripts/check-app.mjs` result, plus a short manual demo-flow checklist (map loads → slider → drill-down → planner → language switch) with pass marks and any known bugs listed honestly.
- [ ] **Step 3: Commit** — `git commit -m "docs: risk & compliance checklist and testing evidence pack"`

### Task 10: Architecture document + diagram

**Files:**
- Create: `docs/ARCHITECTURE.md`

- [ ] **Step 1: Write it** — the Layer 0–3 diagram from spec §3 rendered two ways: (a) a Mermaid `flowchart LR` (users on the left per Product Readiness §7.2: District officers/Ministers → app; institutions → n8n ingestion → engine → Claude reasoning → app + alerts out; security/monitoring annotations), and (b) the ASCII fallback. Plus: component table (component | tech | responsibility | replaces/integrates), data flow narrative (one paragraph per layer), authentication note (public read-only demo; admin functions offline by design in pilot; role-based access is a pilot milestone), and integration readiness table answering Product Readiness §7.3 rows (API readiness, import CSV/JSON, export JSON/CSV, identity, notifications via n8n, payments N/A, institutional systems = Pangolin/ministry feeds).
- [ ] **Step 2: Commit** — `git commit -m "docs: architecture - four-layer diagram, components, data flow, integration readiness"`

### Task 11: n8n automation workflow (evidence, not vaporware)

**Files:**
- Create: `automation/hozi-pipeline.workflow.json`
- Create: `automation/README.md`

- [ ] **Step 1: Build the workflow in n8n locally** (`npx n8n` or Docker; Nash runs the GUI, or construct the JSON directly): nodes = **Cron** (daily 06:00) → **HTTP Request** (CHIRPS/HDX rainfall resource URL used in `docs/DATA-SOURCES-forkA.md`) → **Write Binary File** (`data/raw/` drop) → **Execute Command** (`python engine/engine.py`) → **IF** (any district crosses `band == "High"` — parse `data/projections.json` via a **Read/Move** + **Code** node) → **Send Email / WhatsApp-API stub** (alert text = district + risk + one-line playbook pointer). Export the workflow JSON from n8n into `automation/hozi-pipeline.workflow.json`.
- [ ] **Step 2: `automation/README.md`** — how to import (`n8n import:workflow --input=...`), what each node does, which nodes are live vs stubbed for the demo (alert channel may be email in demo, WhatsApp Business API in pilot), and a screenshot of a successful execution log (save to `docs/sources/` or `automation/`).
- [ ] **Step 3: Run once end-to-end, screenshot the green execution, commit**

```bash
git add automation/ && git commit -m "feat: n8n automation workflow - scheduled ingest, engine trigger, threshold alerts (Layer 0)"
```

### Task 12: App updates — repositioning + LLM honesty + domain rail

**Files:**
- Modify: `app/index.html`, `app/i18n.js`, `app/cockpit.js` (exact hooks located at execution time via `grep -n "roadmap\|honesty\|domain" app/*.js app/index.html`)

- [ ] **Step 1: Domain rail** — update the roadmap cards for the two featured domains with the concrete wedge copy (all three languages via `i18n.js`): Health card = "Cholera & typhoid outbreak foresight — same engine: rainfall + water-point + case-report signals. Next module."; Climate card = "Flood displacement foresight — the Idai lesson: CHIRPS + river gauges + settlement data. Next module."; Mining stays a minimal mention. Tagline block gains: "One engine. Many decisions. — National Foresight & Decision Infrastructure."
- [ ] **Step 2: Honesty panel** — add the read-only-LLM paragraph (en/sn/nd): "The AI assistant never creates or changes the data. It only reads the finished numbers from institutional sources (ZimVAC, IPC, Met Services) and explains, checks and suggests — a human decides."
- [ ] **Step 3: Verify** — `node scripts/check-app.mjs` passes; manual check in browser (all 3 languages render, no layout break).
- [ ] **Step 4: Commit** — `git commit -m "feat: decision-infrastructure repositioning in app - domain rail wedge copy, read-only-LLM honesty note (en/sn/nd)"`

### Task 13: README overhaul + CHANGELOG

**Files:**
- Modify: `README.md`
- Create: `CHANGELOG.md`

- [ ] **Step 1: README updates** (surgical, keep the strong existing voice): retitle to "National Foresight & Decision Infrastructure — first module: food security"; replace the r=0.81 badge with the honest pair (`consistency r=0.81 (synthetic)` + `real-outcome LODO r=0.48`); add sections/links: Architecture (docs/ARCHITECTURE.md), Baselines (docs/BASELINE-RESULTS.md), Dataset statement, AI usage note, Business model, Deployment plan, Tests (`python -m unittest discover -s tests`), Automation (n8n), Known limitations (4 seasons of labels; rainfall-only features; synthetic demo data; nd = playbooks done, full UI pending — reconcile the current contradiction); Team (Nash — product & design lead, AI-assisted build; Chipo — strategy & copy); n8n in the pipeline diagram.
- [ ] **Step 2: `CHANGELOG.md`** — generate skeleton from `git log --oneline --reverse`, grouped by week with plain-English entries (evidence of evolution per C1).
- [ ] **Step 3: Commit** — `git commit -m "docs: README repositioning + full evidence links; CHANGELOG from commit history"`

### Task 14: Public demo — GitHub repo + Pages  **[CHECKPOINT: needs Nash's GitHub account]**

**Files:** none (operations)

- [ ] **Step 1: With Nash present:** create GitHub repo (suggest `curiousinq/hozi`, public), `git remote add origin ... && git push -u origin master`.
- [ ] **Step 2: Enable Pages** serving from `master` `/app` folder (or an Actions workflow copying `app/` to Pages artifact if folder-serving is unavailable — `/docs`-folder fallback: workflow copies `app/*` into `/docs-site`; decide at execution with Nash).
- [ ] **Step 3: Verify the public URL** loads the full app (projections.js is committed, so no build step needed). Record the URL — it goes in the proposal, README badge, and the portal form.
- [ ] **Step 4: Grant judge access note** — repo is public; add the URL + access statement to `docs/TESTING-EVIDENCE.md`. Commit.

### Task 15: The 10-page proposal PDF

**Files:**
- Create: `proposal/ai4i-2026/proposal.html` (print-ready source)
- Create (generated): `proposal/ai4i-2026/HOZI-TBD_AI4I_Proposal_Development.pdf`

- [ ] **Step 1: Draft content in the 5 mandated sections** (Chipo owns tone pass afterward). Source material per section: S1 Problem & Strategic Alignment ← spec §2 + README "Why it exists" + National AI Strategy/Pangolin/NDS alignment + AI4I priority sectors (agriculture/food, climate, health, local languages). S2 Technical Design ← docs/ARCHITECTURE.md diagram + model specifics (transparent weighted risk model; OLS forecaster w/ LODO r; Claude for Layer 2 — name the models used, e.g. "Claude Sonnet family" for playbooks; offline sync = n8n + WhatsApp/SMS; data schema = panel CSV + projections JSON schema). S3 Deliverables & CCE Roadmap ← spec §6 timeline extended past bootcamp + Product Readiness §12.2 milestones + dependency-locked manifests statement (stdlib-only Python, pinned node engines) + ZCHPC CCE test plan (container: python:3.12-slim + n8n image; no GPU; smoke test = engine run + unittest + workflow execution). S4 Compliance & Risk ← docs/RISK-COMPLIANCE.md condensed (DPA Ch 12:07, consent checkbox detail, unit testing, cybersecurity). S5 Sustainability ← docs/BUSINESS-MODEL.md condensed + licensing registry (MIT own code; CC-BY CHIRPS; public IPC; programme dataset; n8n sustainable-use license — list each).
- [ ] **Step 2: Build `proposal.html`** with print CSS: `font-family: Arial; font-size: 11pt; line-height: 1.15; @page { margin: 1in; }`; cover page (Project Title / Track / Team name / Lead innovator / Date) excluded from the 10-page count; page-break rules per section.
- [ ] **Step 3: Render to PDF** via headless Chrome (Playwright MCP or `chrome --headless --print-to-pdf`), filename `HOZI-TBD_AI4I_Proposal_Development.pdf`. **Verify: page count ≤ 11 total (cover + 10), PDF format, fonts embedded.** Post-registration action: regenerate with the real ProjectID.
- [ ] **Step 4: Commit** — `git commit -m "docs: AI4I 10-page proposal (5 mandated sections, print-compliant PDF)"`

### Task 16: Pitch deck + self-assessment + final compliance sweep

**Files:**
- Create: `proposal/ai4i-2026/pitch-deck.html` (+ exported PDF)
- Create: `docs/SELF-ASSESSMENT.md`

- [ ] **Step 1: Deck** (10–12 slides) from `docs/DEMO-SCRIPT.md` + `docs/PITCH-DEFENCE.md`: problem → who decides & too late today → Hozi demo frames → two-layer AI (numbers vs reasoning) → baseline table (the honesty slide) → architecture → business model & costs → deployment & pilot → team → 30/90-day plan. Same HTML→PDF route as Task 15.
- [ ] **Step 2: `docs/SELF-ASSESSMENT.md`** — fill the Product Readiness §16 15-item checklist with real statuses and file pointers; fill Annex F demo-day checklist.
- [ ] **Step 3: Final sweep against the COMPLIANCE REFERENCE above** — repo structure items all present; no secrets (`git log --all -S "sk-ant"` clean); proposal naming/format; all §13 deliverables exist with paths listed in SELF-ASSESSMENT.
- [ ] **Step 4: Commit** — `git commit -m "docs: pitch deck, ToR self-assessment, final compliance sweep"`

---

## Self-review notes

- Spec coverage: WS1→Task 4+7 · WS2→Tasks 1,2,3,5 · WS3→Task 6 · WS4→Task 8 · WS5→Task 15 · WS6→Tasks 11,12,14,16 · README/positioning→Task 13. Timeline/risks live in spec.
- Checkpoints needing Nash: Task 11 Step 1 (n8n GUI run), Task 14 (GitHub account), Task 15 ProjectID swap after portal registration, Chipo copy pass before Task 16 export.
- Deliberately excluded: building health/climate modules, real institutional integrations, edge deployment (spec §8).
