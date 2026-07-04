# Hozi — Deployment Plan
### AI4I 2026 · Annex B Template · Rubric C4

---

## Deployment environment

Hybrid architecture — three components, each independently deployable:

1. **Static web app (public-facing).** Pure HTML/CSS/vanilla JS. No build step; no server-side
   rendering. Served directly from GitHub Pages. Works on any modern browser including low-bandwidth
   connections.

2. **VPS running n8n (Layer 0 automation).** Open-source, self-hosted n8n instance on a 2 GB cloud
   server. Handles scheduled data ingestion (CHIRPS dekads, NDVI pulls), watches for ZimVAC/Agritex
   report drops, triggers engine runs, and dispatches threshold alerts via WhatsApp/SMS/email to
   district officers.

3. **Python engine (batch processing).** Deterministic risk model and forecaster. Invoked by n8n on
   schedule or on-demand. Writes output JSON/CSV that the static app reads. Claude API is called
   downstream of the engine, read-only, for playbook generation and validation briefs — never for
   data generation.

**Edge feasibility: N/A — Hozi is server-side + static web; no on-device inference. (Stated per rubric C4.)**

---

## Hosting provider or site

| Component | Pilot hosting | National hosting |
|---|---|---|
| Static web app | GitHub Pages (free, zero build step) | GitHub Pages or ZCHPC-hosted static server |
| n8n + engine | 2 GB cloud VPS (e.g., DigitalOcean / Hetzner), ~US$20–40/month | ZCHPC CCE containerised deployment |
| Data outputs | Git repository + object storage for nightly JSON/CSV exports | ZCHPC object storage |

**Container specification (ready for ZCHPC CCE handover if a hosting arrangement is agreed):**
- Engine image: `python:3.12-slim` + `requirements.txt` (no GPU required)
- Automation image: official `n8nio/n8n` Docker image
- Smoke test on any environment:
  ```
  python engine/engine.py
  python -m unittest discover -s tests
  ```
  Plus one n8n workflow execution (scheduled CHIRPS pull → engine trigger → alert message).

---

## Operator

**Pilot phase (0–12 months):** Curious Inq team. Responsible for infrastructure provisioning,
n8n workflow management, engine updates, and first-line support. Nash Barara is the named technical
contact during the AI4I incubation period.

**National scale (12+ months):** Handover to a proposed government host — the natural candidates
are the ZimVAC secretariat (food-security module) and Ministry of ICT (platform infrastructure).
No handover agreement is in place; this is the documented design intent.
Handover documentation, runbooks, and training sessions are a 90-day milestone deliverable.

---

## Pilot site

**Proposed site:** Matabeleland South district cluster — Beitbridge, Gwanda, and Mangwe districts.

**Rationale:** Consistently among Zimbabwe's highest food-insecurity risk districts in ZimVAC
historical data; active ZimVAC and Agritex field presence; isiNdebele-speaking population aligns
with the Ndebele-language playbook already in the engine; road and mobile network coverage
sufficient for pilot connectivity needs.

**Pilot user count:** 10–20 users (ZimVAC district staff, Agritex officers, and district
development officers in the cluster).

---

## Users to onboard

- District ZimVAC coordinators (primary users of the web dashboard and district drill-downs)
- Agritex district officers (primary recipients of WhatsApp alert briefs)
- Department of Civil Protection district contacts (secondary; alert distribution)
- ZimVAC secretariat staff (national-level oversight view)

Onboarding materials:
- WhatsApp quick-start guide in chiShona and isiNdebele (voice note + text format)
- Laminated one-page field reference card (what the map shows, what the alert means, who to call)
- One in-person or video training session per district cluster (approximately 2 hours)

---

## Training and support

- **Pre-launch:** One training session per district cluster covering dashboard navigation, alert
  interpretation, Response Planner use, and how to submit ground-truth reports.
- **Ongoing support:** WhatsApp support line monitored by Curious Inq during pilot. Response target:
  same business day.
- **Issue tracking:** GitHub Issues (public log). Critical bugs triaged within 24 hours.
- **Feedback loop:** Simple Google Form or WhatsApp poll after the first four weeks. Findings
  incorporated into the 60-day review.

---

## Monitoring

- **n8n execution logs:** every scheduled workflow run logged with success/failure status and
  timestamp. Reviewed weekly.
- **Uptime check:** lightweight uptime monitor on the static app URL (e.g., UptimeRobot free tier).
- **Alert delivery receipts:** WhatsApp Business API delivery status tracked per message; undelivered
  alerts flagged for follow-up within 24 hours.
- **Engine output validation:** automated assertion that each engine run produces output for all
  expected districts; anomalous score changes (>2 standard deviations) flagged for human review.
- **User feedback form:** collected at 30 and 60 days; results reported in the adoption case study.

---

## Backup and recovery

- **Data outputs:** nightly automated export of `projections.json` and engine CSVs to object storage
  (e.g., Backblaze B2, ~US$0/month at pilot volume). Retained for 90 days.
- **Engine and application code:** all source in Git (GitHub). Full history preserved.
- **n8n workflows:** exported as JSON and committed to the repository after each change.
- **Recovery procedure:** clone repository → install dependencies (`pip install -r requirements.txt`)
  → run `python engine/engine.py` → restore latest data export → redeploy static app. Full restore
  from zero estimated at under two hours with documented runbook.
- **No single point of failure:** the static app continues serving the last published forecast even
  if the VPS is temporarily unreachable.

---

## Connectivity plan

- **District officers in the field:** WhatsApp and SMS alerts are the primary delivery channel.
  Both work on 2G mobile data; no smartphone app install required; messages are readable offline
  once received.
- **Web dashboard:** the static app is lightweight (no framework, no CDN dependencies for core
  function). Tested against Chrome on a throttled 3G connection. Target: dashboard loads
  under 5 seconds on slow-3G.
- **Offline field reporting (pilot milestone):** a simple structured WhatsApp message format
  allows district officers to submit ground-truth observations without internet beyond basic SMS;
  n8n parses incoming messages via webhook.
- **Low-bandwidth design principle:** all data the app needs is pre-computed by the engine and
  written to a single JS file. There are no runtime API calls from the browser.

---

## Scale pathway

| Stage | Scope | Trigger |
|---|---|---|
| Pilot | One district cluster (~3 districts, 10–20 users) | MOU signed; infrastructure deployed |
| Provincial | 10–20 districts, one province | Pilot adoption case study complete |
| National | All ~60 districts, multiple ministries | ZCHPC CCE handover; government operating budget |
| Multi-domain | Health module (MoHCC), climate/disaster module (DCP) on same infrastructure | Each new institutional customer signs module agreement |

Each new domain module is the same engine architecture applied to a new set of signals — no
infrastructure rebuild required.

---

## Milestones

**Days 0–30 (post-submission):**
- Incorporate judge and shortlist feedback
- Complete security and compliance checklist (Data Protection Act [Ch. 12:07] review, `.env`
  audit, no personal data confirmation)
- Sign pilot MOU or formal expression of interest with at least one ZimVAC/ministry stakeholder
- Deploy to GitHub Pages with public demo URL active

**Days 31–60 (live pilot):**
- Launch live pilot in Matabeleland South district cluster
- n8n automation running: scheduled CHIRPS pull → engine run → WhatsApp alert to district officers
- Collect alert delivery receipts and initial officer feedback
- Log and resolve defects; publish patch release

**Days 61–90 (evidence and scale):**
- Measure warning lead-time against ZimVAC seasonal assessment publication cycle
- Complete adoption case study (quantified: districts covered, alerts delivered, officer feedback)
- Draft scale proposal for provincial rollout
- Publish refined model with real ZimVAC/IPC training labels (Fork A path)
- Produce government handover runbook and operator documentation

---

*All timeline commitments above are subject to pilot MOU being in place by day 30.*
*Curious Inq is the incubation operator. Government handover is the explicit national-scale goal.*
