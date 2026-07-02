# Hozi — Strategy & Vision

### National Foresight & Decision-Support Engine

*"Fill the granary before the drought." · See the crisis coming — and act in time.*

> **One line:** Hozi is Zimbabwe's own early-warning brain. It reads the warning signs of a
> national crisis, forecasts where it is heading district by district, and helps our planners get
> the most from the resources they already have. Its proven flagship is **food security** — and
> the same engine extends to **floods, disease, water and markets.**

---

## 1. The problem we exist to solve

Zimbabwe's biggest shocks are rarely surprises. Drought and hunger, floods, disease outbreaks,
water stress, price spikes — the signals build for weeks. Yet three failures repeat every year:

1. **The warning comes too late** — buried in slow seasonal reports, often produced by foreign
   agencies, after the season is already lost.
2. **No shared, live picture** — ministries, NGOs and donors work off different, out-of-date
   documents and reach different conclusions.
3. **Resources land in the wrong order** — with limited money, planners have no quick way to see
   *where* action would protect the most people, so help arrives late and mis-targeted.

The cost is measured in hungry families, avoidable deaths, and money spent for too little effect.

## 2. The product

**Hozi is a foresight & decision-support engine.** It does two things no seasonal report does:

- **Forecast** — projects where risk is heading over the next 1–3 months, per district, with an
  honest confidence band.
- **Plan (the Response Planner)** — the planner enters the resources already set aside, and Hozi
  ranks *where that effort protects the most people first* (driest, least-served, highest-risk).
  **It never sets budgets** — it stretches the ones that exist and helps officials defend their
  own decisions.

Delivered as a clean web app — a national map, a season time-slider, a ranked watch-list, district
drill-downs, and the Response Planner — that a Minister can read in thirty seconds.

## 3. The platform: one engine, many national risks

The core insight: **every one of these crises follows the same pattern —**

```
   signals  →  transparent risk score  →  forecast  →  Response Planner
```

Build that engine once, and it becomes reusable **national resilience infrastructure**, not a
single-use app. This is exactly the *"AI disaster-warning system"* the National AI Strategy calls
for.

| Domain | Signals it reads | Decision it supports | Status |
|---|---|---|---|
| **🌾 Food security** | rainfall, vegetation (NDVI), pests, irrigation, inputs, prices | where to send seed / irrigation / relief | **LIVE · calibrated (r=0.81)** |
| **🌊 Floods & disaster** | rainfall intensity, river levels, terrain, forecasts | where to pre-position / evacuate | Next |
| **🦟 Disease outbreaks** | case reports, water/sanitation, mobility, climate | where to send health teams / supplies | Next |
| **💧 Water & drought** | dam levels, rainfall, demand, boreholes | where to ration / drill / truck water | Roadmap |
| **📈 Markets & prices** | farmgate & retail prices, supply, currency | where prices threaten access to food | Roadmap |

**Food security is the flagship** — built and working — because it is the Strategy's
Year-1 theme and the clearest public-value story. The others are the deliberate architecture, not
vapourware: each is the same engine pointed at a new set of signals.

## 4. How it works (the engine)

1. **Transparent risk model.** A clear, weighted blend of the drivers — no black box. Every number
   is traceable and explainable. *This transparency is the moat.*
2. **Consistency check (not yet outcome validation).** On the *synthetic* challenge data, Hozi's
   weighted score reproduces the dataset's **own provided** risk band at **r = 0.81** — an internal
   check that the weighting is coherent. It is **not** validation against a real food-security
   outcome (that requires ZimVAC/IPC labels + a trained model — see *Path to nowcasting* below).
3. **Forecast.** Projects the well-understood seasonal trend 1–3 months ahead with a *widening*
   confidence band. Foresight, not fortune-telling.
4. **Response Planner.** A support package reduces risk most where irrigation is low and the district
   is dry and high-risk, so "best buys" are genuinely differentiated and defensible.

## 4a. Path to nowcasting — from indicator scorer to trained model (Fork A)

Today Hozi is an **indicator scorer** (Fork B): a transparent, *hand-weighted* model. The gold
standard (WFP HungerMap) is **supervised on outcomes** (Fork A): it *learns* the indicator→outcome
relationship from real, measured food-insecurity labels, then predicts the outcome where no survey
ran. Hozi's credible, funded runway to that:

1. **Get the outcome labels — they exist and are public.** **ZimVAC/ZimLAC** Rural Livelihoods
   Assessments (annual, 2009–2025; e.g. 2025 peak: Kariba 57.6%, Marondera 1%, ~15% nationally) and
   **FEWS NET / IPC** (monthly, via API). Indexed in `docs/DATA-SOURCES-forkA.md`; a real seed of
   labels is already in `data/outcome_labels_2025_zimlac.csv`.
2. **Assemble a training panel.** Join real per-district features (rainfall/NDVI/prices from
   FEWS NET and satellites) to those labels, by district and period.
3. **Train + validate honestly.** `engine/train.py` (already in the repo) learns the weights via
   supervised regression, **holds out whole districts**, and reports error on districts it never
   saw — real validation, replacing today's internal consistency check.
4. **Nowcast + forecast.** Predict outcomes where no survey exists, and project forward.

Crucially, **the map, Response Planner and API do not change** — only the scoring brain upgrades
from hand-weighted to learned. Transparency is kept as a *feature*: the mature system is a learned
model **plus** the explainable breakdown that conservative institutions trust.

## 5. The AI layer — used only where AI is strong

We keep AI **out of the math** (so the numbers stay auditable) and use it where it excels —
**language**:

- **Local-language early-warning briefs** (English / chiShona / isiNdebele) generated from each
  district's numbers.
- **"Ask Hozi"** — a planner asks in their own language ("which districts need seed first?"); the LLM
  answers, grounded in the engine's real outputs (tool-calling, so it can't invent figures).
- **Ground-truth intake** — parses a district officer's free-text WhatsApp report into clean signals.
- **Report drafting** — one-click Minister-ready situation reports.

> *"We use AI where it's genuinely good — explaining and translating — and we deliberately keep it
> out of the math, which stays transparent and auditable."* Responsible AI as a design principle.

## 6. Automation — how it runs live and lean (n8n)

The whole pipeline runs on **n8n** so a small team can operate it nationally, and it updates itself:

- **Weekly refresh** — pulls rainfall, satellite and market feeds on a schedule → runs the engine →
  publishes the fresh forecast.
- **Auto-alerts** — when a district crosses into high risk, sends a local-language brief to its
  officer by **WhatsApp**.
- **Ask-Hozi / ground-truth webhook** — hosts the LLM server-side (keys never exposed) and closes the
  loop from field reports back into the model.

## 7. Data & sovereignty

Hozi doesn't invent or hoard data — it **reads trusted signals from the bodies that already own
them, and each owner keeps control**:

| Signal | Source |
|---|---|
| Rainfall | Met Services · TAMSAT / CHIRPS |
| Vegetation (NDVI) | NASA · Copernicus · FAO ASIS |
| Crops, pests, inputs | Agritex / Ministry of Agriculture |
| Market prices | GMB · ZMX · e-Mukambo |
| Ground truth | District officers (WhatsApp) |
| Long-term backbone | **Project Pangolin** (national data platform) |

Like Pangolin's federated design, each ministry keeps its own data; Hozi reads only the agreed
signals through secure connections. *Today it runs on POTRAZ sample data; the engine is built to plug
these live feeds straight in.*

## 8. How Hozi is different

| | WFP HungerMap / FEWS NET / FAO ASIS | **Hozi** |
|---|---|---|
| Granularity | Country-level, global | **District-level, Zimbabwe** |
| Job | Monitor & report | **Plan & prescribe** (Response Planner) |
| Scope | Mostly single-domain | **Multi-hazard, one engine** |
| Ownership | Foreign agencies | **Zimbabwean-owned, open-source** |
| Language / feel | Global, English | **Local-language, human, sovereign** |

We do not out-monitor the global players; we own the **prescriptive, district-level, sovereign
planning** lane they don't serve. The approach is *de-risked* — WFP proved the science works; Hozi
brings it home, extends it to a plan, and makes it ours.

## 9. Responsible AI & honesty

Hozi is **decision-support, not an oracle.** It keeps a human expert in the loop, shows its
reasoning, states plainly what it cannot know (a visible "limitations" panel), runs on synthetic
sample data in this prototype, and **does not set budgets or override any authority.** It supports
existing processes (ZimVAC, ministries) — it never replaces them.

## 10. Impact & the economic case

- The World Food Programme estimates anticipatory action returns **at least 7:1**. The hard part is
  acting early and in the right order — exactly what Hozi enables.
- In a working test on national sample data, Hozi flagged **0 → 19 of 20 districts** heading into
  high risk by September, and ranked where existing effort pays off most.
- Benefits: fewer lives lost; existing budgets go further; one shared truth for all responders.

## 11. Alignment with the National AI Strategy (2026–2030)

- Delivers the **Year-1 Food Security** priority.
- Builds the explicitly-named **"AI disaster-warning system."**
- Supports **Pillar 3** (AI for service delivery & decision-making).
- An analytics layer for **Project Pangolin**.
- Embodies **sovereignty, local language, digital equity and responsible AI** — the Strategy's soul.

## 12. Sustainability & business model

Open-core and lean:

- **Open-source engine** (MIT) — drives adoption, trust, and developer contribution (and stars).
- **Sustained by** government adoption, NGO/donor programmes, and the Strategy's innovation funds;
  the automation (n8n) keeps running costs tiny.
- **Curious Inq** provides the design, integration and hosting expertise to deploy and extend it —
  turning one flagship (food) into a platform (floods, disease, water) over time.

## 13. Roadmap — from flagship to platform

- **Now (prototype):** food-security engine + national map + Response Planner + data pipeline, on
  sample data. Open-source; weighting consistency-checked at r=0.81 (not yet outcome-validated).
- **3 months:** live rainfall / satellite / market feeds; all staple crops; chiShona & isiNdebele
  briefs and WhatsApp alerts; pilot with one ministry or NGO.
- **12 months:** national roll-out; **floods & disease modules**; ground-truth loop; full Project
  Pangolin integration; multi-hazard national dashboard.

## 14. Team & the ask

- **Nash Barara** — product, design & narrative (Curious Inq).
- **[Technical Lead]** — engine & n8n automation.
- **[Domain Advisor]** — food-security / agronomy validation.

Grant funding accelerates: connecting live feeds, the pilot deployment, local-language voice, and the
first two new hazard modules — moving Hozi from a validated prototype to a national platform.

## 15. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Prototype uses synthetic data | Engine built for live feeds; transparent method; real Fork A label sources already found (ZimVAC/IPC) |
| "Predicts the future" over-claim | Framed as foresight + confidence bands; limitations panel is a feature |
| Adoption vs existing foreign tools | Sovereign, prescriptive, local-language — serves the state directly |
| One-person capacity | n8n automation + open-source contributors + Curious Inq delivery |
| Multi-domain over-reach | Food is the sole flagship now; others are staged, same proven engine |

---

*Built by Curious Inq, Harare · for the POTRAZ AI for Impact (AI4I) 2026 Challenge · Open-source · Sovereign · "Fill the granary before the drought."*
