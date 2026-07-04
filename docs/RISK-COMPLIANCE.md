# Risk & Compliance Checklist

**Project:** Hozi — National Food-Security Foresight Engine
**Submission:** POTRAZ AI for Impact (AI4I) 2026 — Development Track
**Rubric reference:** ToR named deliverable — risk and compliance checklist; proposal Section 4
**Last updated:** 2026-07-04

---

## 1. Data Protection Act [Chapter 12:07] Position

### Current prototype (submission date)

No personal data is processed at any stage of the current system. All inputs are
district-level aggregate statistics — published IPC Phase 3+ percentages, CHIRPS
dekadal rainfall averages, ZimVAC seasonal assessment figures, and POTRAZ synthetic
challenge data. The unit of analysis is the administrative district, not the individual
or household.

This is confirmed in `docs/DATASET-STATEMENT.md` §5:

> "All inputs to Hozi are district-level aggregate statistics — no individual, household,
> or personally identifiable information is collected, stored, or processed at any stage
> of this pipeline. The system does not request, ingest, or retain names, identity
> numbers, contact details, location traces, or any other personal data as defined under
> Zimbabwe's Data Protection Act [Chapter 12:07]. Exposure under that Act is minimal by
> design: the unit of analysis is the administrative district, not the person."

Chapter 12:07 applies when personal data — defined as information relating to an
identifiable natural person — is collected or processed. Because Hozi processes only
published aggregate statistics, no processing of personal data occurs and the Act's
consent, storage-limitation, and data-subject-rights obligations are not triggered at
this stage.

### Pilot roadmap — officer ground-truth reporting (designed for, not yet shipped)

The pilot roadmap (see `docs/DEPLOYMENT-PLAN.md`, Days 31–60) includes a
**district-officer ground-truth reporting channel** — a structured WhatsApp message or
simple web form through which field officers can submit observed conditions (district,
date, indicator value). Because officer submissions could constitute personal data
(a named officer submitting a report is an identifiable natural person), this feature
is designed with the following Data Protection Act [Chapter 12:07] safeguards before
any deployment:

| Requirement | Design decision |
|---|---|
| **Informed, freely given consent** | A required, unticked-by-default consent checkbox appears on the officer report form. Text reads: "I consent to Hozi storing this submission — district, indicator, date, and my officer ID — for food-security monitoring. I can request deletion by contacting [contact address]." Form cannot be submitted without checking it. |
| **Timestamped consent record** | Each submission stores: officer ID (not full name), district, indicator type, value, submission timestamp, and a `consent_given: true / timestamp` field. The consent record is stored alongside the submission in the same record. |
| **Data minimisation** | Only three data fields are collected: district (administrative unit), indicator type and value, and date. No full name, home address, phone number, or any other personal identifier beyond the minimum officer ID needed to prevent duplicate submissions. |
| **Right to erasure** | The consent notice states a named contact address (the Curious Inq operator email during pilot, transitioning to the government operator on handover). Any officer may request deletion of their submissions. Deletion is carried out within five working days and confirmed by reply. |
| **Retention limit** | Ground-truth submissions are retained for the duration of the pilot plus 12 months, then purged unless incorporated into anonymised aggregate training data. |
| **Security** | Submissions are received via n8n webhook over HTTPS. Officer IDs are not displayed on the public-facing web app. The n8n database is on the pilot VPS behind SSH-key-only access and firewall rules (see Section 3). |

**Status: designed for the pilot; no officer reporting form is present in the current prototype submission.** No personal data is processed today.

---

## 2. Responsible AI Risks

| Risk | Mitigation |
|---|---|
| **Over-trust in forecasts** — planners treat a 0–100 risk score as a precise, authoritative measurement rather than a probabilistic estimate | **Implemented:** (1) confidence band widens with forecast horizon (`band_ = 4 + 3.0 * h` in `engine/engine.py` line 170 — explicitly larger the further out); (2) all forecast months displayed with dashed lines and band shading in the app to signal uncertainty visually; (3) all playbook briefs carry a mandatory closing `note` field that must include one sentence on urgency and forecast limits — verified in `app/briefs.js`; (4) the in-app honesty panel (story panel, `#storyPanel` in `app/index.html`) states plainly "Foresight, not fortune-telling" and lists model limits; (5) the README Responsible AI section states: "It is honest about uncertainty." |
| **LLM error or hallucination** — Layer 2 (Claude) invents figures, places, or programmes not in the supplied district data | **Implemented:** (1) read-only two-layer architecture: the LLM receives completed engine output as a read-only input and its output never feeds back into Layer 1 scores; (2) system prompt contains an explicit instruction: "Ground EVERY statement in the numbers provided. Never invent figures, places, or programmes" (verified in `scripts/generate-briefs.mjs`); (3) outputs are committed to the repository as `app/briefs.js` — version-controlled and auditable; every generation run produces a reviewable diff; (4) the in-app playbook label reads "Drafted by AI from the engine's risk data — for planner review, not instruction" (verified in `app/cockpit.js` line 126); (5) all responsible departments named in playbooks are drawn from a fixed list of real Zimbabwean institutions in the prompt (Agritex, GMB, DDF, ZINWA, MSD, Rural District Council, Ministry of Public Service Labour & Social Welfare). **Planned:** live generation logging to an external audit store (current audit mechanism is version control only). |
| **Bias / underserved districts** — districts with sparse or missing data silently receive scores that appear as accurate as data-rich districts | **Implemented:** (1) LODO (leave-one-district-out) cross-validation is run across all 58 label districts, meaning no district is tested on data it trained on — the strictest feasible protocol for this panel size; (2) the engine's fallback logic for missing months: if no staple-crop rows exist for a district-month pair, the engine falls back to any crop that month (`engine/engine.py` lines 147–148: `if not srows: srows = [r for r in rows if r["district"] == dname and r["month"] == m]`); if no rows exist at all for a month, that month is simply absent from `d["series"]` — the district is not scored for that month. A district with fewer than 3 observed months receives `d["forecast"] = {}` and `d["support"] = None` (lines 163–164, 182–183), meaning it does not appear in the Response Planner ranking rather than receiving a fabricated score. Districts missing data are therefore **excluded from ranking, not silently scored**. This is the correct behaviour; it is verified in the engine source and confirmed by the DATASET-STATEMENT's note that the real panel is unbalanced by design. |
| **Misuse — planner output misread as budget allocation authority** | **Implemented:** (1) README Responsible AI section states explicitly: "It **never sets budgets** — it helps stretch the ones that exist" and "it **does not set budgets or override any authority**" (README lines 60 and 140); (2) proposal (`proposal/proposal.html`) states three times that Hozi never sets budgets and never tells government how to spend; (3) the Response Planner UI label and in-app description frame output as a prioritisation aid, not an instruction. **Truthfulness note:** the phrase "never sets budgets" appears in the README and proposal but not as a label within the app UI itself (no matching string in `app/index.html`). The concept is conveyed through the "for planner review, not instruction" label on playbooks and the general framing of the planner. This is an identified gap: a short explicit "this tool does not set budgets" notice in the app UI is a recommended pre-pilot addition. |

---

## 3. Security

| Control | Status | Detail |
|---|---|---|
| **No secrets in repository** | Implemented | Git history audited 2026-07-03. The Anthropic API key file (`scripts/anthropic-key.txt`) is covered by `.gitignore`. The `data/raw/` directory is gitignored. No `.env` file or credential file has been committed. |
| **Key handling pattern** | Implemented | API key is loaded by `scripts/generate-briefs.mjs` from a gitignored file (`scripts/anthropic-key.txt`). An `.env.example` pattern is documented in the manifest. Key is never hardcoded in source. |
| **Static frontend — minimal attack surface** | Implemented | The demo app is pure HTML/CSS/vanilla JS served as static files. There is no server-side code in the demo, no user input is stored by the browser app, no cookies are set, and no runtime API calls are made at browse time. The app reads a pre-generated static JS file (`app/projections.js`). |
| **Zero third-party Python dependencies** | Implemented | The engine uses Python standard library only (`csv`, `json`, `math`, `os`, `statistics`, `sys`). `requirements.txt` (if present) is empty or lists no packages. This eliminates supply-chain risk from third-party Python packages entirely. |
| **Zero Node.js production dependencies** | Implemented | `scripts/package.json` declares `"dependencies": {}`. The `check-app.mjs` and `generate-briefs.mjs` scripts use Node.js built-ins only (`fs`, `https`). No `node_modules` directory is committed. |
| **Pilot VPS hardening** | Planned | SSH-key-only access (password authentication disabled), UFW firewall (ports 22, 80, 443 only), unattended security upgrades enabled, n8n instance behind HTTP basic auth or reverse-proxy auth. These are documented pilot-launch prerequisites, not present in the current static demo. |
| **HTTPS** | Implemented (demo) / Planned (pilot) | GitHub Pages serves the demo over HTTPS automatically. The pilot VPS will terminate TLS via the hosting platform's reverse proxy or Let's Encrypt. |
| **No user data stored by app** | Implemented | The web app does not collect, transmit, or store any user data. The only browser storage used is `localStorage` for the user's language preference (`hozi-lang`), which contains no personal information. |

---

## 4. Model Unit Testing

### Test suite

The test suite is located in `/tests/` and comprises **14 unit tests** across two test
files, all using Python's standard library `unittest` module with zero external
dependencies.

**`tests/test_engine.py`** — 12 tests across 4 classes:

| Class | Tests | What is verified |
|---|---|---|
| `TestClamp` | 3 | Clamp function respects lo/hi bounds and passes through valid values |
| `TestModelRisk` | 4 | Risk model: healthy district scores below 10; drought district scores above 80; irrigation mitigates risk monotonically; output is always bounded 0–100 regardless of extreme inputs |
| `TestPearson` | 3 | Pearson r returns 1.0 for perfect positive correlation, -1.0 for perfect negative, 0.0 for constant series |
| `TestLinfitAndBand` | 2 | OLS linfit recovers exact slope and intercept for a known line; band thresholds assign High/Medium/Low correctly |

**`tests/test_train_real.py`** — 2 tests in 1 class:

| Class | Tests | What is verified |
|---|---|---|
| `TestOLS` | 2 | OLS solver recovers known coefficients to 6 decimal places on a synthetic design matrix; `predict()` function matches manual dot-product |

### Run command

```
python -m unittest discover -s tests
```

Run from the repository root. No dependencies to install; no test framework beyond Python's
standard library. Expected output: `Ran 14 tests in 0.001s — OK`.

### Validation evidence

Beyond unit tests, the model's predictive validity is established by the leave-one-district-out
(LODO) baseline experiment in `docs/BASELINE-RESULTS.md`. Results are reproduced in
`docs/TESTING-EVIDENCE.md`. The experiment is rerunnable with:

```
python engine/baselines.py
```

which calls `engine/train_real.py` internally and overwrites `docs/BASELINE-RESULTS.md`
with fresh output.

---

*This checklist covers the Hozi prototype as at the submission date 2026-07-04.
Items marked "Planned" are documented pre-pilot prerequisites, not claims of current
capability. Any item marked "Implemented" is verifiable in the committed repository.*
