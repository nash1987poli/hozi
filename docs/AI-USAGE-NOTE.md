# AI Usage Note

**Project:** Hozi — National Food-Security Foresight Engine
**Submission:** POTRAZ AI for Impact (AI4I) 2026 — Development Track
**Rubric reference:** C2 — AI integration justification (30 pts)
**Last updated:** 2026-07-04

---

## 1. Two-Layer AI Architecture

Hozi uses two strictly separated AI components. Neither is decorative; each does work the other cannot. The boundary between them is enforced by design.

### Layer 1 — Numbers (deterministic, transparent)

A Python engine (`engine/engine.py`, `engine/train_real.py`) that:

- Computes a transparent weighted risk score from institutional signals (rainfall, NDVI, pest incidents, irrigation coverage, input availability).
- Trains an OLS forecaster on a real panel of 232 district-season observations, cross-referencing IPC/ZimVAC Phase 3+ outcomes with CHIRPS dekadal rainfall (see `data/real_training_panel.csv` and `docs/DATASET-STATEMENT.md`).
- Produces every number in the app — risk scores, forecasts, Response Planner rankings — through traceable arithmetic. No score is interpolated or imputed by any model the team does not fully understand.

**The LLM never generates, edits, or imputes any data point in Layer 1.** All inputs come exclusively from institutional sources: ZimVAC, IPC/FEWS NET, CHIRPS/Met Services, Agritex.

### Layer 2 — Reasoning (read-only LLM, strictly downstream)

Claude (claude-sonnet-4-6) operates only after Layer 1 has finished. It receives the completed district data as a read-only input and performs exactly three functions:

1. **REASONS** — produces plain-language driver explanations so a district planner can understand what is behind a risk score without reading raw numbers.
2. **SUGGESTS** — generates ranked intervention playbooks in English (en), chiShona (sn), and isiNdebele (nd), grounded only in the supplied district inputs, and explicitly labelled as advisory.
3. **VALIDATES (shipped 2026-07-05)** — each district's most recent official IPC/ZimVAC Phase 3+ food-insecurity share (from `data/outcome_labels.csv`, period 2020-10 where available) is supplied to Claude alongside the model's risk picture. Claude is instructed to compare them: if they clearly disagree — e.g., low model risk but a high official crisis share, or vice versa — it adds a plain-English warning to the brief's `note` field, states the disagreement, names the assessment date, and advises human review before acting. If they broadly agree, no warning is added. For the 4 urban demo districts with no rural-IPC polygon (Harare Urban, Chitungwiza, Bulawayo Central, Bulawayo North), the note states that no official cross-check was possible. Honest caveat: the ZimVAC/IPC assessments supplied are dated 2019–2020 while the demo model runs on synthetic current data; the mechanism is live and fresher labels slot in as they arrive. Verified in `app/briefs.js`: 16 of 20 districts received official IPC data; all 20 en/sn/nd briefs carry the appropriate note.

**Guardrails enforced by architecture:**

- Layer 2 output is advisory only; it never feeds back into Layer 1 scores.
- Outputs are committed to the repository as `app/briefs.js` (version-controlled, auditable). This means zero API calls occur at browse time — judges and planners read pre-generated, auditable text.
- The in-app honesty panel discloses the LLM role to every user.
- Human review is required before any brief is acted upon; ZimVAC and the responsible ministries retain full decision authority.

---

## 2. Why a Learned Model at All (Layer 1)

A trained model is justified only if it outperforms every simpler alternative on the same protocol. We ran a leave-one-district-out (LODO) cross-validation on the identical 232-observation real panel for four methods. LODO is the strictest feasible protocol for this panel size: the model is never tested on a district it trained on.

Results from `docs/BASELINE-RESULTS.md`:

| Method | r | MAE (percentage points) |
|---|---|---|
| Global-mean | -0.557 | 10.2 |
| Persistence (prior-season own district) | 0.129 | 11.0 |
| Rainfall-rule (threshold heuristic) | -0.179 | 10.7 |
| **OLS model (Hozi)** | **0.484** | **8.5** |

Every simpler method loses on both r and MAE. The global-mean and rainfall-rule baselines are anti-correlated with outcomes (negative r), meaning that a naive rule based on rainfall magnitude actually points planners in the wrong direction on this panel. The persistence baseline — using a district's own prior-season result — achieves only r = 0.129, and is additionally unusable for any district not previously assessed, because it requires historical district data that may not exist. The OLS model needs only rainfall features, making it applicable to unassessed districts.

**Honest limits:** The model is trained on 4 assessment seasons (2019–2020), uses rainfall as its sole feature class, and achieves r = 0.484 — moderate correlation, not high confidence. This is foresight, not fortune-telling. The README and honesty panel state this plainly. Adding NDVI, market prices, and a longer label time-series (15+ years of ZimVAC assessments are digitisable) is the documented next step.

---

## 3. Why an LLM (Layer 2)

The concrete workload that justifies Claude:

- **Scale:** 20 districts × 3 languages = 60 structured intervention playbooks, each grounded in that district's specific risk trajectory, driver values, and support-package modelling.
- **Language quality:** Rule-based or template systems cannot produce usable chiShona and isiNdebele advisory text at acceptable quality or cost. A fixed-phrase template approach would produce either English with inserted numbers, or machine-transliterated text that field officers would not trust.
- **Contradiction-flagging (shipped 2026-07-05):** Detecting logical inconsistencies between Layer 1 outputs and external IPC classifications requires reading and comparing structured evidence — a task suited to an LLM, not a rule engine. This capability is now implemented: the official IPC Phase 3+ share for each district (sourced from `data/outcome_labels.csv`, most recent period — 2020-10 for 16 of the 20 demo districts) is passed into each district's prompt. Claude is instructed to flag disagreements plainly in the `note` field and recommend human review. The assessments are dated 2019–2020; as fresher ZimVAC/IPC rounds become available, they slot into the same pipeline without code changes.

**Cost reality:** Playbook generation is a batch operation run once per data update cycle, not per user request. The output is committed to `app/briefs.js` in the repository. At browse time, the app reads the static file — no API call, no latency, no per-visit cost. The Claude API cost for a full 20-district generation run is in the range of US $0.10–0.40 at current batch pricing. The pilot cost model estimates US $30–80/month for all LLM usage at operational frequency (see `docs/superpowers/specs/2026-07-03-ai4i-alignment-design.md` §4).

---

## 4. Prompt Design and Guardrails

All details below are verifiable in `scripts/generate-briefs.mjs`.

**Inputs supplied to the LLM per district call:**

- District name and province.
- Risk timeline (0–100 scale, Jan–Sep 2026, with months marked as observed or forecast).
- Four latest driver values: rainfall (mm/month), vegetation index (NDVI), pest incident count, irrigation coverage (%), input availability index (0–100).
- Support-package effect: the modelled risk reduction in September if a standard support intervention is applied.

**Structure enforced:** The system prompt specifies exact JSON shape — `{en:{bullets:[],note:""}, sn:{...}, nd:{...}}` — with 3–5 action bullets per language, each bullet containing a responsible department (drawn from a named list of real Zimbabwean institutions: Agritex, GMB, DDF, ZINWA, MSD, Rural District Council, Ministry of Public Service Labour & Social Welfare) and a specific action tied to the supplied numbers. A closing `note` field requires one honest sentence on urgency and forecast limits.

**What the system prompt prohibits:** Inventing figures, places, or programmes not in the supplied input. The prompt instructs: "Ground EVERY statement in the numbers provided. Never invent figures, places, or programmes." Tone is explicitly set as "calm, specific, advisory. These are recommendations for human review — never orders."

**Audit trail:** `app/briefs.js` is version-controlled. Its header line records the model used and the generating script. A `TODO(native-speaker)` comment in the file header flags that chiShona and isiNdebele translations require native-speaker verification before operational use — this is an honest, documented limitation, not a claim of perfect output.

**What is not yet in place:** Live generation logging to an external audit store is a planned pilot milestone. The current audit mechanism is version control: every generation run produces a diff in `app/briefs.js` that is committed and reviewable.

---

## 5. AI-Assisted Development Disclosure

Hozi was built by a non-traditional technical team: Nash Barara (product, design, narrative) and Chipo (strategy, copywriting). Neither member has a software engineering background. Claude was used throughout as a pair-developer — writing engine code, tests, and documentation from specifications authored by the team.

The POTRAZ AI4I Development Track Terms of Reference explicitly permit AI-assisted coding provided the team can explain and defend the system. Evidence of genuine understanding:

- Structured commit history with task-specific messages tracing design decisions.
- Unit tests (`tests/`) covering the risk model, forecaster, and Response Planner.
- Byte-identical refactors that required understanding the engine's output contract to verify correctness.
- This documentation, which describes the system at the level of individual script behaviour and prompt text — not at the level of marketing claims.

AI assistance in development is distinct from AI integration in the product. This note documents both, separately, so judges can evaluate each on its own merits.

---

*Every numerical claim in this note is traceable to a committed repository file. The baseline table is reproduced from `docs/BASELINE-RESULTS.md`. Architecture definitions are reproduced from `docs/superpowers/specs/2026-07-03-ai4i-alignment-design.md` §3. Prompt text is quoted directly from `scripts/generate-briefs.mjs`. Brief structure is verifiable in `app/briefs.js`.*
