# Testing Evidence

**Project:** Hozi — National Food-Security Foresight Engine
**Submission:** POTRAZ AI for Impact (AI4I) 2026 — Development Track
**Rubric reference:** ToR named deliverable — testing evidence; proposal Section 4
**Last updated:** 2026-07-05

All commands below were executed on 2026-07-04 from the repository root
(`C:\Users\MSI\Documents\CLIENTS CURIOUS INQ\P\POTRAZ\Hozi`) on Windows 11,
Python (standard library only), Node.js 18+.

---

## 1. Unit Tests — `python -m unittest discover -s tests -v`

```
test_above (test_engine.TestClamp.test_above) ... ok
test_below (test_engine.TestClamp.test_below) ... ok
test_within_bounds (test_engine.TestClamp.test_within_bounds) ... ok
test_band_thresholds (test_engine.TestLinfitAndBand.test_band_thresholds) ... ok
test_linfit_recovers_line (test_engine.TestLinfitAndBand.test_linfit_recovers_line) ... ok
test_bounded_0_100 (test_engine.TestModelRisk.test_bounded_0_100) ... ok
test_drought_district_high_risk (test_engine.TestModelRisk.test_drought_district_high_risk) ... ok
test_healthy_district_low_risk (test_engine.TestModelRisk.test_healthy_district_low_risk) ... ok
test_irrigation_mitigates (test_engine.TestModelRisk.test_irrigation_mitigates) ... ok
test_constant_series_returns_zero (test_engine.TestPearson.test_constant_series_returns_zero) ... ok
test_perfect_negative (test_engine.TestPearson.test_perfect_negative) ... ok
test_perfect_positive (test_engine.TestPearson.test_perfect_positive) ... ok
test_predict_matches_manual (test_train_real.TestOLS.test_predict_matches_manual) ... ok
test_recovers_known_coefficients (test_train_real.TestOLS.test_recovers_known_coefficients) ... ok

----------------------------------------------------------------------
Ran 14 tests in 0.001s

OK
```

**Result: 14/14 passed. 0 failures. 0 errors.**

What each class verifies:

- `TestClamp` (3): bounds enforcement — values below 0 clamp to 0, above 1 clamp to 1, valid values pass through unchanged.
- `TestModelRisk` (4): risk model bounds and monotonicity — healthy district scores below 10; drought district (zero rain, zero NDVI, max pests) scores above 80; adding irrigation to a dry district provably reduces its score; output is always within [0, 100] regardless of extreme or out-of-range inputs.
- `TestPearson` (3): correlation math — perfect positive r = 1.0, perfect negative r = -1.0, constant series returns 0.0 (degenerate case handled without divide-by-zero).
- `TestLinfitAndBand` (2): OLS line recovery — `linfit([3,5,7,9])` recovers slope=2.0, intercept=3.0 to floating-point precision; band thresholds correctly assign High (>=66), Medium (>=45), Low (<45).
- `TestOLS` (2): OLS solver on a synthetic design matrix recovers known coefficients to 6 decimal places; `predict()` matches manual dot-product arithmetic.

---

## 2. Engine Diagnostics — `python engine/engine.py`

```
districts: 20   staple rows: 173
VALIDATION  r(all crops) = 0.786   r(staples) = 0.814
NATIONAL    now=54.8  Sep=75.4   High districts now=0 -> Sep=19

TOP 8 DISTRICTS TO WATCH (projected Sep risk):
  district         prov                   now   Sep      Δ  band
  Mazowe           Mashonaland Central   55.8  84.9  +29.1  Medium->High
  Hurungwe         Mashonaland West      53.5  82.3  +28.8  Medium->High
  Bulawayo North   Bulawayo              58.8  79.8  +21.0  Medium->High
  Lupane           Matabeleland North    55.4  79.5  +24.1  Medium->High
  Mutare           Manicaland            53.7  79.4  +25.7  Medium->High
  Gwanda           Matabeleland South    63.0  78.8  +15.8  Medium->High
  Murehwa          Mashonaland East      54.9  77.5  +22.6  Medium->High
  Kwekwe           Midlands              51.9  75.0  +23.1  Medium->High

wrote: C:\Users\MSI\Documents\CLIENTS CURIOUS INQ\P\POTRAZ\Hozi\app\projections.json
```

**Interpretation:**

- 20 districts processed from the POTRAZ synthetic challenge dataset; 173 staple-crop rows (Maize, Sorghum, Groundnuts) used for scoring.
- Weighting-coherence check: Hozi's composite risk score reproduces the dataset's own `climate_crop_risk_score` at r = 0.814 on staple crops (r = 0.786 across all crops). This is an internal self-consistency check on synthetic data, not real-outcome validation — see Section 3 for real validation.
- National projected trajectory: average risk rises from 54.8 (June observed) to 75.4 (September forecast). Zero districts in High band now; 19 of 20 projected into High band by September without early action.
- Output files written: `app/projections.json`, `data/projections.json`, `app/projections.js`.

---

## 3. Baseline Experiment — `python engine/baselines.py`

This script calls `engine/train_real.py` internally (which joins IPC/ZimVAC labels to
CHIRPS rainfall features and prints its own diagnostics), then runs the LODO evaluation
and overwrites `docs/BASELINE-RESULTS.md`. Full output:

```
labels joined to pcodes: 232
training panel rows (district x period with full features): 232

LEAVE-ONE-DISTRICT-OUT results on 232 real observations, 58 districts:
  r (predicted vs actual IPC 3+ %) : 0.484
  mean absolute error              : 8.5 percentage points
  naive baseline (always mean)     : 10.1 percentage points

full-data weights: intercept=26.95 r1h=0.1883 r3h=-0.0476 rfq=-0.0258 r3q=0.0103

Honest read: rainfall-only model on 4 seasons. More periods + vegetation/prices as next features.
method               r     MAE
global-mean     -0.557    10.2
persistence      0.129    11.0
rainfall-rule   -0.179    10.7
OLS model        0.484     8.5

wrote C:\Users\MSI\Documents\CLIENTS CURIOUS INQ\P\POTRAZ\Hozi\docs\BASELINE-RESULTS.md
```

**Interpretation:**

The OLS model (Hozi) achieves r = 0.484, MAE = 8.5 percentage points on real IPC/ZimVAC
district outcomes under LODO — the strictest feasible validation protocol for this panel
(the model is never evaluated on a district it trained on). Every simpler alternative
performs worse on both metrics:

| Method | r | MAE (pp) |
|---|---|---|
| Global-mean | -0.557 | 10.2 |
| Persistence | 0.129 | 11.0 |
| Rainfall-rule | -0.179 | 10.7 |
| **OLS model (Hozi)** | **0.484** | **8.5** |

The global-mean and rainfall-rule baselines are anti-correlated with real outcomes
(negative r), meaning a naive heuristic actively misdirects planners on this panel.
The persistence baseline additionally cannot be applied to any district not previously
assessed, since it requires that district's own historical scores. The OLS model needs
only rainfall features and is therefore applicable to any district in the CHIRPS coverage
area. Full data weights are printed above; they are deterministic — rerunning produces
identical results.

---

## 4. App Smoke Test — `node scripts/check-app.mjs`

```
OK: 20 districts resolved, 60 polygons present
```

**Exit code: 0 (success).**

**What this script does:** `scripts/check-app.mjs` is a headless Node.js smoke test
that runs without a browser or server. It loads three static JS data files by evaluating
them with Node's `fs.readFileSync` and a `window = {}` shim:

- `app/projections.js` — the engine output (20 districts with timelines, forecasts, support packages)
- `app/districts.geo.js` — the GeoJSON polygon layer (60 Zimbabwe district polygons)
- `app/name-map.js` — the name-mapping table (polygon titles to model district names; urban point markers)

For each of the 20 modelled districts, the script checks that either a polygon mapping
or an urban-marker entry exists, that no district is mapped both ways, and that every
polygon mapping resolves to a real GeoJSON feature title. It also asserts the GeoJSON
contains exactly 60 features and the projections data contains exactly 20 districts.

**Why it cannot test browser rendering:** The script is deliberately headless — it
verifies data integrity and name-resolution correctness without spinning up a browser.
It cannot verify that Leaflet renders polygons, that the time-slider animates, or that
the language switcher updates DOM text. Those interactions require a browser and are
covered by the manual checklist in Section 5.

---

## 5. Manual Demo-Flow Checklist

The following table maps each demo flow to the code path that implements it. "Pass
(code path verified, 2026-07-04)" means the relevant function or DOM element was
confirmed to exist in the committed source by code inspection on that date. It does NOT
claim the author ran a live browser session — that is stated explicitly where it applies.

| Feature | Code path verified | Status |
|---|---|---|
| **Map loads** | `buildMap()` in `app/cockpit.js` (line 38): builds Leaflet GeoJSON layer from `HOZI_GEO`, attaches click/hover handlers; `L.map('map')` initialises on page load. Map data integrity confirmed by `check-app.mjs` (Section 4): 20 districts resolved, 60 polygons present. | Pass — code path verified, 2026-07-04 |
| **Time-slider moves risk** | `setMonth(i)` in `app/cockpit.js` (line 134): updates `monthIdx`, calls `repaint()` which recolours every polygon and urban marker via `riskAt(d, monthIdx)`. Input event listener on `#time` (line 138) calls `setMonth`. Play button (line 140) steps through indices 0–8 at 700 ms intervals. | Pass — code path verified, 2026-07-04 |
| **District drill-down opens** | `selectDistrict(name)` in `app/cockpit.js` (line 106): populates `#dName`, `#dProv`, sparkline, driver bars, early-warning note, and AI playbook; sets `$('#drill').hidden = false`. Triggered from polygon click (line 48), urban marker click (line 57), and watch-list row click (line 90). | Pass — code path verified, 2026-07-04 |
| **Response Planner ranks districts** | `buysRanked` (line 151): districts sorted descending by `support.reduction`. `updatePlanner(n)` (line 158): selects top N districts, computes aggregate risk saved, calls `renderBuys()` and `repaint()`. Slider `#plRange` (line 170) drives N. Planning mode toggled by `#planToggle` (line 171). | Pass — code path verified, 2026-07-04 |
| **Language switch en -> sn -> nd** | `applyLang(l)` in `app/cockpit.js` (line 263): sets `window.HOZI_LANG`, updates all `.lng button` active states, updates `document.documentElement.lang`, and re-renders all labelled UI strings via the `t()` i18n helper. Language buttons in `app/index.html` (lines 17–20): EN, chiShona, isiNdebele buttons with `data-lang` attributes. Click listeners attached at line 297. chiShona and isiNdebele string tables are present in `app/i18n.js`. | Pass — code path verified, 2026-07-04 |
| **Honesty panel opens** | Story panel (`#storyPanel`) toggled by `#storyTab` click (line 253) and `#infoBtn` click (line 254) in `app/cockpit.js`. `renderStory()` (line 242) generates the honesty content including the "How it works & what it can't do (honesty first)" heading and bullet list covering model transparency, consistency check, forecast limits, and sample-data disclosure. | Pass — code path verified, 2026-07-04 |

**Note on browser testing:** The above confirms that code paths exist and are wired
correctly in the committed source. No live browser session was run as part of this
automated evidence pack. Full end-to-end browser testing against a served instance
(e.g., `cd app && python -m http.server 8000`) is recommended before the submission
demo and before the pilot launch.

---

## 6. Known Bugs and Limitations

The following are honest, documented limitations as of the submission date. None of
these are concealed; most are called out explicitly in the relevant source files.

| Item | Location | Detail |
|---|---|---|
| **chiShona and isiNdebele translations not native-speaker verified** | `app/briefs.js` line 2 | `// TODO(native-speaker): verify sn/nd translations before submission.` — AI-generated translations in the playbook briefs have not been reviewed by a fluent native speaker. The disclaimer is present in the file header. This is the most operationally significant known limitation: district officers reading briefs in chiShona or isiNdebele should treat the language as draft-quality until professional review is complete. |
| **Real model uses rainfall features only** | `docs/DATASET-STATEMENT.md` §4; `engine/train_real.py` | The OLS model trained on real IPC/ZimVAC data uses four CHIRPS rainfall features only (`r1h`, `r3h`, `rfq`, `r3q`). NDVI, market prices, pest pressure, and input availability — present in the demo engine conceptually — are not in the real training panel. Adding these features is the documented next step (Fork A path). |
| **Panel covers only 4 assessment seasons (2019–2020)** | `docs/DATASET-STATEMENT.md` §4 | The real training panel has 232 observations across 4 periods. ZimVAC/ZimLAC assessments exist back to at least 2009, giving a potential 15+ year panel. A longer label time-series is expected to materially improve predictive skill and should be the priority before pilot deployment. |
| **"Never sets budgets" rule stated in README and proposal but not as explicit UI label in the app** | `app/index.html` (absent); `README.md` lines 60, 140; `proposal/proposal.html` | The concept is conveyed through the "for planner review, not instruction" label on playbooks (cockpit.js line 126) and the general framing of the planner. A short explicit disclaimer in the app UI is recommended before the pilot. |
| **LLM contradiction-flagging shipped (2026-07-05)** | `scripts/generate-briefs.mjs`; `app/briefs.js`; `data/outcome_labels.csv` | The official IPC/ZimVAC Phase 3+ food-insecurity share is now passed into each district's Claude prompt. Claude flags disagreements between the model's risk picture and the official assessment in each brief's `note` field (en/sn/nd). Regeneration run: 2026-07-05. Matched districts: 16/20 (4 urban districts have no rural-IPC polygon entry). Example flagged district: Lupane — official 35% IPC Phase 3+ (2020-10) vs model January 2026 score of 14.3, noted as a potential early-period disagreement requiring human review. All 20 × 3 = 60 notes carry either a contradiction warning, a broad-alignment note with dated caveat, or a no-official-data disclosure. Honest caveat: assessments are dated 2019–2020; the mechanism is live and accepts fresher labels as they arrive. |
| **Live generation logging not yet implemented** | `docs/AI-USAGE-NOTE.md` §4 | The current audit mechanism for LLM-generated briefs is version control (git diff on `app/briefs.js`). Logging to an external audit store is a planned pilot milestone. |
| **Pilot VPS security hardening not yet applied** | `docs/RISK-COMPLIANCE.md` §3 | SSH-key-only access, firewall rules, unattended updates, and n8n authentication are documented prerequisites for pilot launch but are not present in the current static demo deployment. |
| **District naming: alias map may be incomplete for pre-2019 ZimVAC sources** | `docs/DATASET-STATEMENT.md` §4; `engine/train_real.py` | The five-entry alias map covers the 2019–2020 ZimVAC tables. Earlier or differently transcribed sources may introduce additional naming variants requiring further aliases. |

---

*All command outputs in this document were captured by running the stated commands
on 2026-07-04 in the repository root. Outputs are reproduced verbatim. The test suite,
engine, and baseline scripts are deterministic: rerunning them produces identical
results given the same committed input data.*
