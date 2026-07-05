# Hozi — ToR Self-Assessment Checklist

**Project:** Hozi — National Food-Security Foresight Engine
**Submission:** POTRAZ AI for Impact (AI4I) 2026 — Development Track
**Last updated:** 2026-07-04

This document covers (1) the ToR §16 submission-readiness checklist, (2) the Annex F demo-day checklist, and (3) the final compliance sweep results.

---

## Part 1 — ToR §16 Submission-Readiness Checklist (15 items)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Problem and target users clearly defined | **Yes** | `proposal/ai4i-2026/proposal.html` §1 (The Problem); `docs/BUSINESS-MODEL.md` §Primary user; `docs/BUSINESS-MODEL.md` §Beneficiary |
| 2 | Evidence that the problem matters | **Yes** | `docs/DATASET-STATEMENT.md` §1 — real IPC Phase 3+ district outcomes used as training labels; `docs/BUSINESS-MODEL.md` — WFP 7× ROI citation; DEMO-SCRIPT Q&A: 19/20 districts high risk by September |
| 3 | Who pays or sustains the solution | **Yes** | `docs/BUSINESS-MODEL.md` §Revenue or funding model — donor-funded pilot phase → per-domain institutional licensing → government line-item adoption |
| 4 | Operating costs documented | **Yes** | `docs/BUSINESS-MODEL.md` §Cost drivers — itemised pilot cost table (US$65–155/mo); 3-month pilot budget envelope (US$200–500) |
| 5 | Deployment model described | **Yes** | `docs/DEPLOYMENT-PLAN.md` — three-component hybrid architecture; pilot site (Matabeleland South); operator; hosting; scale pathway; backup and recovery |
| 6 | Repository and evidence pack present | **Yes** | Git repo at working directory root; all docs, tests, sample_data, engine, app, automation, scripts committed; see `README.md` for map |
| 7 | Clear README | **Yes** | `README.md` — overview, quick-start, repo map, links to all evidence docs |
| 8 | Architecture diagram | **Yes** | `docs/ARCHITECTURE.md` — Mermaid flowchart (four layers: automation, numbers, reasoning, interface); `proposal/ai4i-2026/proposal.html` §2 |
| 9 | Data sources, rights, and limitations documented | **Yes** | `docs/DATASET-STATEMENT.md` — full data inventory table (source, URL, licence, role, real vs synthetic); limitations and gap log |
| 10 | AI use justified and validated with baselines | **Yes** | `docs/AI-USAGE-NOTE.md` — two-layer architecture rationale; `docs/BASELINE-RESULTS.md` — leave-one-district-out table (global-mean, persistence, rainfall-rule, OLS model); OLS r=0.484, MAE 8.5pp vs 10.2pp naive |
| 11 | Privacy, security, consent, and responsible-AI addressed | **Yes** | `docs/RISK-COMPLIANCE.md` — Data Protection Act [Ch.12:07] position; no personal data; human-in-the-loop design; responsible AI framing; `docs/AI-USAGE-NOTE.md` §Responsible AI |
| 12 | Secrets removed from repo | **Yes (git clean)** | Audited 2026-07-04: `git log --all -S "sk-ant-api" --oneline` returns empty; `.env.example` present (placeholder only); `CLAUDE_API_KEY` loaded from environment at runtime, never hardcoded; `scripts/anthropic-key.txt` is gitignored (never committed) but contains a live key on disk — **rotate before public repo deployment** |
| 13 | Main flow tested and bugs recorded | **Yes** | `docs/TESTING-EVIDENCE.md` — 14/14 unit tests pass; engine diagnostics; `node scripts/check-app.mjs` → OK; `CHANGELOG.md` — defect log |
| 14 | Demo script and screenshots present; live URL | **Yes / In progress** | `docs/DEMO-SCRIPT.md` — shot-by-shot film script + live walkthrough; `docs/TESTING-EVIDENCE.md` — engine output screenshots; `docs/screenshot.jpg`; **live URL: In progress** — pending GitHub Pages deployment (Task 14 checkpoint with Nash) |
| 15 | 30/60/90-day plan | **Yes** | `docs/DEPLOYMENT-PLAN.md` §Milestones — Day 0–30, 31–60, 61–90 one-liner targets; `docs/BUSINESS-MODEL.md` §Success metrics |

---

## Part 2 — Annex F Demo-Day Checklist (12 items)

| # | Item | Status | Notes / Pointer |
|---|------|--------|-----------------|
| 1 | Written proposal submitted (PDF, correct filename convention) | **Ready** | `proposal/ai4i-2026/HOZI-TBD_AI4I_Proposal_Development.pdf` (11 pages); filename uses TBD placeholder — swap team number when assigned |
| 2 | Business model document | **Ready** | `docs/BUSINESS-MODEL.md` |
| 3 | Deployment plan | **Ready** | `docs/DEPLOYMENT-PLAN.md` |
| 4 | Public repository link | **Ready** | Repo committed locally; GitHub Pages deployment pending Nash checkpoint (Task 14) |
| 5 | Architecture diagram | **Ready** | `docs/ARCHITECTURE.md` (Mermaid LR flowchart); reproduced in proposal §2 |
| 6 | Dataset statement and AI usage note | **Ready** | `docs/DATASET-STATEMENT.md`; `docs/AI-USAGE-NOTE.md` |
| 7 | Live demo URL | **Needs work — scheduled** | GitHub Pages URL not yet live; deployment is Task 14 (Nash checkpoint); `docs/DEMO-SCRIPT.md` covers fallback live walkthrough |
| 8 | n8n automation execution screenshot | **Needs work — scheduled** | `automation/hozi-pipeline.workflow.json` committed; live execution screenshot pending first VPS run (Task 11 — Nash GUI step) |
| 9 | Risk and compliance checklist | **Ready** | `docs/RISK-COMPLIANCE.md` |
| 10 | Testing evidence | **Ready** | `docs/TESTING-EVIDENCE.md` — 14/14 tests; engine diagnostics; check-app OK |
| 11 | Pitch deck | **Ready** | `proposal/ai4i-2026/pitch-deck.html`; `proposal/ai4i-2026/hozi-pitch-deck.pdf` (11 slides) |
| 12 | Baseline comparison table | **Ready** | `docs/BASELINE-RESULTS.md`; reproduced on pitch deck slide 6 and in `docs/AI-USAGE-NOTE.md` |

---

## Part 3 — Final Compliance Sweep (2026-07-04)

### 3.1 Secret scan

```
git log --all -S "sk-ant-api" --oneline
```

**Result:** (empty — no output) — no API key appears in any commit in history.

`.env.example` is present at repo root with placeholder values only. `CLAUDE_API_KEY` is loaded from the runtime environment; it is never hardcoded in any source file.

**Note on `scripts/anthropic-key.txt`:** This file exists on disk and contains a live API key. It is listed in `.gitignore` and has **never been committed to git** (confirmed: `git log --all -- scripts/anthropic-key.txt` returns empty). It does not appear in the git object store. However, it must be rotated before the repo is made public — Nash action required before GitHub Pages / public repo deployment.

### 3.2 Repo structure verification

| Item | Present | Path |
|------|---------|------|
| README | Yes | `README.md` |
| LICENSE | Yes | `LICENSE` (MIT) |
| tests/ | Yes | `tests/` — test_engine.py, test_train_real.py |
| sample_data/ | Yes | `sample_data/` — 02_agriculture_climate_market_signals.csv, README.md |
| .env.example | Yes | `.env.example` |
| requirements.txt | Yes | `requirements.txt` |
| scripts/ | Yes | `scripts/` — check-app.mjs, generate-briefs.mjs, package.json |
| package.json | Yes | `scripts/package.json` (also root-level package.json) |
| docs/ | Yes | `docs/` — all evidence documents |
| automation/ | Yes | `automation/` — hozi-pipeline.workflow.json, README.md |

### 3.3 Python unit tests

```
python -m unittest discover -s tests
```

**Result:** Ran 14 tests in 0.000s — **OK** (0 failures, 0 errors)

### 3.4 Node check-app

```
node scripts/check-app.mjs
```

**Result:** `OK: 20 districts resolved, 60 polygons present`

### 3.5 Proposal PDF

- **File:** `proposal/ai4i-2026/HOZI-TBD_AI4I_Proposal_Development.pdf`
- **Pages:** 11
- **Filename convention:** `HOZI-TBD_AI4I_Proposal_Development.pdf` — the `TBD` token is a placeholder for the team/submission number assigned by POTRAZ. **Action required:** swap `TBD` for the assigned number before final submission upload.

### 3.6 Pitch deck PDF

- **File:** `proposal/ai4i-2026/hozi-pitch-deck.pdf`
- **Pages:** 11 (one per slide)
- **Source:** `proposal/ai4i-2026/pitch-deck.html`

### 3.7 ToR §13 — Ten named deliverables

| # | Deliverable | Status | File |
|---|-------------|--------|------|
| 1 | Written proposal | Done | `proposal/ai4i-2026/HOZI-TBD_AI4I_Proposal_Development.pdf` |
| 2 | Business model | Done | `docs/BUSINESS-MODEL.md` |
| 3 | Deployment plan | Done | `docs/DEPLOYMENT-PLAN.md` |
| 4 | Repository | Done | git repo; GitHub Pages pending |
| 5 | Architecture diagram | Done | `docs/ARCHITECTURE.md` |
| 6 | Data and AI note | Done | `docs/DATASET-STATEMENT.md` + `docs/AI-USAGE-NOTE.md` |
| 7 | Demo link | In progress | `docs/DEMO-SCRIPT.md` ready; live URL pending Task 14 (Nash checkpoint) |
| 8 | Pitch deck | Done | `proposal/ai4i-2026/hozi-pitch-deck.pdf` (11 slides) |
| 9 | Risk and compliance checklist | Done | `docs/RISK-COMPLIANCE.md` |
| 10 | Testing evidence | Done | `docs/TESTING-EVIDENCE.md` |

---

*Self-assessment prepared by Curious Inq. All statuses verified against the repo state on 2026-07-04.*
