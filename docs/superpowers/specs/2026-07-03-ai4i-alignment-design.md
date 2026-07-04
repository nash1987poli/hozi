# Hozi — AI4I 2026 Alignment & Repositioning Design

**Date:** 2026-07-03
**Deadline:** July 14, 2026 (submission) · July 21 shortlist · July 27–Aug 1 Mutare bootcamp
**Track:** Development (Track 3)
**Team:** Nash Barara (product & design lead, AI-assisted build) + Chipo (strategy & copywriting). 2 members — meets the 2–5 rule.

## 1. Goal

Align everything Hozi has built with the AI4I Development Track ToR, Product Readiness
guidance, and 100-point rubric — and reposition Hozi from "food-security tool" to
**National Foresight & Decision Infrastructure**, using the wedge strategy.

## 2. Positioning (Wedge Strategy — Option B, approved)

> **Hozi — National Foresight & Decision Infrastructure.**
> One engine that turns Zimbabwe's own data into early warning and ranked response —
> starting where the need is sharpest: food security.

- **Proven wedge:** food security module — real IPC × CHIRPS training,
  leave-one-district-out validation (r=0.48), trilingual playbooks (en/sn/nd),
  Response Planner.
- **Infrastructure claim:** the pattern *signals → risk score → forecast → response
  ranking → local-language playbooks* is domain-agnostic. Featured worked examples:
  1. **Health:** cholera/typhoid outbreak risk by district (rainfall + water points + case reports).
  2. **Climate/disaster:** flood displacement risk (Cyclone Idai lesson; CHIRPS + river gauges + settlements).
  3. Mining incident risk: one-line directional mention only (no public data to cite).
- **Policy alignment:** Hozi is the *decision layer* on top of **Project Pangolin**
  (national data platform, National AI Strategy). Pangolin owns data; Hozi turns it
  into decisions. Explicit National AI Strategy + NDS alignment in proposal Section 1.

## 3. System architecture (final)

```
Layer 0  AUTOMATION      n8n (open-source, self-hosted)
                         - scheduled ingestion: CHIRPS dekads, NDVI, market prices
                         - watch inbox/folders for ZimVAC / Agritex / IPC report drops
                         - orchestration: new data -> engine run -> LLM pass -> app refresh
                         - alerts out: threshold crossings -> WhatsApp/SMS/email briefs
                           to district officers (the low-connectivity story)

Layer 1  NUMBERS         Python engine (deterministic, transparent)
                         - risk model + trained forecaster
                         - inputs ONLY from institutional sources (ZimVAC, IPC,
                           CHIRPS/Met, Agritex)
                         - every score is traceable arithmetic
                         - the LLM NEVER generates, edits, or imputes any data point

Layer 2  REASONING       Claude (read-only, strictly downstream of Layer 1)
                         1. VALIDATES  - flags contradictions for human review
                           (e.g., low model risk vs IPC Phase 3)
                         2. REASONS    - plain-language driver explanations
                         3. SUGGESTS   - ranked intervention playbooks (en/sn/nd),
                           grounded only in supplied inputs, labelled advisory
                         Guardrails: advisory-only; never feeds back into scores;
                         outputs logged for audit; human review before action;
                         ZimVAC/ministry keeps decision authority.

Layer 3  INTERFACE       Static app (map, time-slider, drill-down, Response Planner,
                         honesty panel, domain rail showing health/climate as
                         next modules)
```

## 4. Business model (Hybrid — Option C, approved)

- **Pilot:** donor/programme-funded public good (WFP/FAO/UNDP/NGO funds operations;
  government operates). Named responsible institutions per ToR.
- **Scale:** institutional licensing per domain module — health module licensed to
  Ministry of Health, climate module to Dept. of Civil Protection, etc. Each new
  domain = new institutional customer on the same infrastructure.
- **Pilot cost model (proposal numbers):**

| Item | Est. monthly (US$) |
|---|---|
| VPS for n8n + engine (2GB cloud server) | 20–40 |
| Static app hosting (GitHub Pages/Vercel) | 0 |
| Claude API (reasoning + playbooks, ~20 districts monthly) | 30–80 |
| WhatsApp/SMS alerts (pilot volume) | 10–30 |
| Domain + backups | 5 |
| **Total** | **65–155** |

- Scale path: VPS pilot → ZCHPC CCE for national deployment.

## 5. Workstreams mapped to the rubric

### WS1 — AI justification pack (C2, 30 pts)
- Baseline comparison experiment: persistence baseline (last year's IPC) and
  rule-based rainfall-threshold baseline vs trained model, same
  leave-one-district-out split. Report results honestly whatever they show.
- Written AI-usage note: two justified AI uses (classical validated ML for
  prediction; LLM for multilingual reasoning/validation/suggestion), cleanly
  separated, with guardrails per Layer 2 above.

### WS2 — Repo hardening (C1, 30 pts)
- `/tests` with unit tests for engine risk model, forecast, Response Planner.
- Dependency manifests (`requirements.txt`, `package.json` for scripts) — pinned.
- `.env.example` (no secrets). Secrets audit DONE 2026-07-03: key file never
  committed; no key strings in history.
- Docstrings on engine functions; architecture diagram in `/docs`;
  known-limitations section in README.

### WS3 — Dataset statement (C3, 20 pts)
- Single document: IPC + CHIRPS provenance, processing steps, licensing/rights,
  synthetic challenge-data disclosure, quality limits, refresh frequency,
  no personal data collected.

### WS4 — Business & deployment pack (C4, 20 pts)
- Business model one-pager (Section 4 above, Annex A template).
- Deployment plan (Annex B template): hosting, operator, named pilot pathway
  (ZimVAC/ministry district pilot), onboarding, support, monitoring, backup,
  low-bandwidth story (n8n alerts via WhatsApp/SMS), ZCHPC CCE testing plan,
  scale pathway. Edge feasibility: N/A statement (not an edge project).

### WS5 — Proposal PDF (required deliverable)
- Max 10 pages, PDF only, Arial 11pt, 1.15 spacing, 1-inch margins.
- Filename: `[ProjectID]_AI4I_Proposal_Development.pdf` (placeholder ID until
  portal registration — Nash registering this week).
- Five mandated sections: 1 Problem & Strategic Alignment · 2 Technical Design &
  Product Logic · 3 Deliverables & CCE Roadmap · 4 Compliance & Risk (Data
  Protection Act [Ch. 12:07], consent checkbox implementation, model unit
  testing, cybersecurity) · 5 Sustainability & Future Adoption.

### WS6 — Demo, deck, app updates
- Public demo URL: GitHub Pages (static-friendly, free).
- Pitch deck built from existing DEMO-SCRIPT.md + PITCH-DEFENCE.md; Chipo
  reviews all narrative copy.
- App updates: domain rail cards updated for health + climate as next modules;
  honesty panel gains the read-only-LLM paragraph; reconcile isiNdebele status
  (playbooks exist in nd; README says roadmap).
- n8n: build at minimum one working demonstration workflow (scheduled CHIRPS
  pull -> engine trigger -> alert message) so the automation claim is evidenced,
  not aspirational.

## 6. Timeline (11 days)

| Days | Work |
|---|---|
| 1–2 | WS1 baseline experiment · WS2 repo hardening |
| 3–5 | WS5 proposal draft · WS3 dataset statement |
| 6–7 | WS4 business/deployment pack · WS6 demo hosting + n8n workflow + app updates |
| 8–9 | Pitch deck · testing evidence · ToR self-assessment checklist |
| 10–11 | Chipo review pass · PDF formatting · portal registration · submit with buffer |

## 7. Risks & mitigations

- **Baseline beats model:** report honestly; frame as "model adds skill where
  baselines fail; both shown." Honesty is explicitly rewarded by the rubric.
- **Two-person team, no dedicated engineer:** ToR allows AI-assisted builds if
  the team can explain the system; team section names mentorship/advisors as
  the fill-in path; Nash drills the architecture via PITCH-DEFENCE.md.
- **n8n unproven in our stack:** scope to one demonstrable workflow; the rest
  is documented design.
- **ProjectID unknown:** placeholder in filename; register this week.

## 8. Out of scope (this cycle)

- Building health/climate modules (worked examples on paper + domain rail only).
- Real institutional integrations (Pangolin, ministry feeds) — documented as
  integration-ready design.
- Edge/embedded deployment.
