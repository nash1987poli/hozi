# CHANGELOG — Hozi

All notable changes to this project, in plain English.
Grouped by theme and date from the commit history.

---

## Foundation & initial app (late June 2026)

**Engine + interactive app v1**
- Built the first working engine (`engine.py`): transparent weighted risk model, validation against POTRAZ synthetic data (r=0.81 weighting-coherence check), seasonal forecast with widening confidence band, and Response Planner ranking.
- Shipped the interactive app: Leaflet-based national risk map for Zimbabwe, season time-slider (Jan–Sep), Districts to Watch list, district drill-down panel, and Response Planner.
- Added 4-page AI4I solution proposal (PDF + HTML source).
- Added logo, README, and MIT LICENSE.

**App v2 — map & layout**
- Replaced placeholder outline with proper Zimbabwe district map.
- Added hero statement band and default Districts-to-Watch list.

**App v3 — data pipeline panel**
- Added "Where the data comes from" section (live-ready data pipeline, EN + chiShona).

**Demo preparation**
- Added demo film shoot script, live walkthrough guide, and judge Q&A script.

**Repositioning (multi-hazard framing)**
- Repositioned Hozi from single-purpose food-security tool to National Foresight & Decision Engine, with food security as the proven first module.

**App v4 — trilingual + Talk-to-Hozi**
- Added isiNdebele as third language (full UI in EN/sn/nd).
- Added Talk-to-Hozi grounded Q&A tab.
- Floating-widget UI polish.

**App v5 — dark canvas + API console**
- Dark map canvas with rotating hotspot ticker and count-up KPIs.
- Comprehensive Talk-to-Hozi engine (fixed repeated-answer bug).
- Interactive API in/out demo console.

**Fork A scaffold — supervised learning**
- Added `train.py`: supervised-learning scaffold with grouped holdout and learned weights, ready for real ZimVAC/IPC labels.
- Added real ZimVAC/ZimLAC food-security outcome data as Fork A labels.
- Corrected validation wording to be honest about synthetic vs real outcome validation.

**API console wiring**
- Wired data-source cards to the API console (click a source → live feed appears).

**Proposal finalised**
- Finalised `Hozi-Solution-Proposal.pdf`; removed stale draft versions.

---

## Cockpit UI redesign (late June — early July 2026)

**Design spec & implementation plan**
- Added full-screen decision cockpit design spec.
- Added 12-task cockpit implementation plan.

**Infrastructure**
- Vendored Leaflet 1.9.4 locally (offline-capable, no build tools, no CDN dependency).
- Added all 60 Zimbabwe district polygons as script-loadable GeoJSON.
- Added district name-map with automated smoke check.
- Extracted i18n to a standalone module; added cockpit strings in EN/sn/nd.

**Cockpit shell & engine**
- Full-screen layout with floating panels and planning-mode theme.
- Choropleth map with hover-synced watch list, drill-down, season player, planning mode, Ask-Hozi, story panel, URL state, and three-language support.

**Pitch defence**
- Added separate pitch defence Q&A document.

**Bug fixes**
- Fixed KPI count-up final values when `rAF` is throttled in background tabs.

**Copy**
- Changed "maize" to "staple food-security risk (maize-led)" across story panel and README.

**Welcome overlay + domain rail**
- Added welcome overlay with platform domain rail and original iconography.
- Fixed backdrop-filter blur that froze renderer on some GPUs.
- Domain rail icons open honest roadmap cards; food icon acts as home.
- Rail active-state hierarchy: amber for roadmap domains, ink for story, green home.

---

## Claude playbooks — real AI integration (early July 2026)

**Pre-generated intervention playbooks**
- Added `scripts/generate-briefs.mjs`: batch Claude API call that reads `projections.json` and generates structured intervention playbooks per district in EN/sn/nd.
- Resume-safe generation; first 3 district briefs generated and committed.
- Pulse animation on high-risk districts; GPU tile filter removal (freeze fix); welcome dismiss via backdrop/Escape.
- Completed Claude playbooks for all 20 districts (en/sn/nd).

**Bug fixes**
- Fixed cache-bust asset URLs so browsers always load the current build.
- Fixed hidden attribute defeated by explicit `display:flex` — welcome overlay was not visually closing.

---

## Real-data training (2026-07-03)

**First real-outcome supervised training**
- Trained OLS forecaster on real IPC Phase 3+ outcomes × CHIRPS rainfall: leave-one-district-out cross-validation **r = 0.48** on 232 observations, 58 districts. First Zimbabwean food-security model trained on ground-truth labels.

---

## AI4I alignment & repositioning design (2026-07-03)

**Strategy and planning**
- Added AI4I alignment and repositioning design spec (wedge strategy, two-layer AI architecture, n8n, hybrid business model).
- Added detailed AI4I alignment implementation plan (16 tasks mapped to rubric C1–C4).

---

## Refactors, tests, and evidence pack (2026-07-03 — 2026-07-04)

**Engine refactors**
- Made `engine.py` importable with `main()` guard and docstrings; output verified byte-identical.
- Corrected model_risk range note; documented MONTHS/`2026-09` dependencies in helper docstrings.
- Made `train_real.py` importable with `main()` guard and docstrings.

**Unit tests**
- Added stdlib unit test suite (`tests/`): 14 tests across risk model, Pearson r, linfit/band, OLS trainer, and `predict()`.
- Fixed OLS recovery test (previous design matrix was collinear with intercept).

**Baseline comparison**
- Added `baselines.py`: LODO experiment comparing global-mean, persistence, rainfall-rule, and OLS model. OLS wins on both r and MAE; all simpler methods lose — two of three are anti-correlated with real outcomes.
- Fixed data-driven threshold candidates for rainfall-rule baseline (fixed grid never split the r3q range).
- Aligned baselines docstring with data-driven threshold fix.

**Data vendoring & manifests**
- Vendored POTRAZ synthetic challenge data into `sample_data/`; added dependency manifests, `.env.example`, and `.gitignore` for API keys (AI4I repo standards).

**Evidence documentation**
- `docs/DATASET-STATEMENT.md` — provenance, processing steps, synthetic disclosure, known limits (rubric C3).
- Fixed ALIAS entry count (5 entries, not 4; Muzarabani is a no-op passthrough).
- `docs/AI-USAGE-NOTE.md` — two-layer AI design, baseline evidence, LLM guardrails (rubric C2). Tightened claims to implemented reality.
- `docs/BUSINESS-MODEL.md` and `docs/DEPLOYMENT-PLAN.md` — Annex A/B per ToR templates (rubric C4). Softened implied partner/host commitments to candidates.
- `docs/RISK-COMPLIANCE.md` and `docs/TESTING-EVIDENCE.md` — risk and compliance checklist; testing evidence pack with captured command outputs. Fixed two wording inaccuracies in RISK-COMPLIANCE.
- `docs/ARCHITECTURE.md` — four-layer Mermaid + ASCII diagram, component table, data-flow narrative, integration readiness. Fixed three diagram/table issues.

**n8n Layer 0 workflow**
- Added `automation/hozi-pipeline.workflow.json`: import-ready n8n workflow — scheduled CHIRPS ingest, engine trigger, high-band district detection, alert email dispatch.
- Added `automation/README.md`: node-by-node documentation, environment setup, security note.
- Fixed email subject date expression (Luxon `toFormat`, not Moment format).

**App repositioning — final**
- Updated domain rail wedge copy, tagline, and read-only-LLM honesty note (EN/sn/nd) to reflect the full decision-infrastructure repositioning.

---

## Documentation overhaul (2026-07-04)

**README repositioning + evidence pack**
- Subtitle updated to "National Foresight & Decision Infrastructure — first module: Food Security".
- Badges split: consistency-check (synthetic) r=0.81 and real-outcome LODO r=0.48, both explained honestly.
- "One engine. Many decisions." paragraph added: food security proven wedge; cholera-outbreak and flood-displacement on honest roadmap.
- "How it works" pipeline updated to show Layer 0 (n8n) and Layer 2 (Claude); real-outcome validation (LODO r=0.48, beats all baselines) documented with link; distinction between r=0.81 (synthetic) and r=0.48 (real) made explicit.
- Language line updated: English + chiShona + isiNdebele, all 60 district playbooks, native-speaker review pending.
- Quick start: added `python -m unittest discover -s tests` step; noted offline operation from `sample_data/`.
- Project structure expanded to include tests/, sample_data/, automation/, all engine scripts, and all docs files.
- Evidence pack section added: linked table of all judge-facing documents.
- Known limitations subsection added under Responsible AI: 4 seasons of labels, rainfall-only features, synthetic demo data, LLM contradiction-flagging as design-intent only, sn/nd native review pending.
- "Built by" updated: Chipo (strategy & copywriting) named; AI-assisted build disclosed; link to AI-USAGE-NOTE.md.
- Roadmap "Now" line refreshed to current truth: tests, baselines, real-data training done; n8n workflow authored; demo URL pending.

**CHANGELOG**
- Added this file: plain-English record of development history grouped by theme and date.

---

*Maintained as evidence of structured, incremental development (AI4I rubric C1).*
