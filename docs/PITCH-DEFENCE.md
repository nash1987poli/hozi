# Hozi — Pitch Defence

Hard questions judges are likely to ask, with 30-second spoken answers.
**Not part of the demo** — this is the Q&A armour. Read it the night before; don't recite it word-for-word.

---

## 1. "How do live data feeds actually plug in?"

> The engine doesn't care where the numbers come from — it reads a simple table: district, month,
> rainfall, vegetation, pests, irrigation, inputs. Today POTRAZ's sample data fills that table.
> Going live, a scheduled job calls the rainfall and satellite APIs — TAMSAT, CHIRPS, NASA — every
> week, writes the same columns into the same table, and the engine re-runs automatically. Nothing
> in the model changes. That's deliberate: we validated the brain first, and the plumbing is the
> cheap part.

**Backup fact:** TAMSAT/CHIRPS rainfall and NASA/FAO vegetation data are free, public, open APIs built for exactly this use.

## 2. "It's synthetic data — why should we trust any of this?"

> We're honest about that on the screen itself — there's a limitations panel in the product. What the
> prototype proves is the decision experience and the transparent method. The funded next step is
> training on real outcomes: ZimVAC's Rural Livelihoods Assessments and IPC data, which are public
> and already indexed in our repo — we've even seeded the 2025 ZimVAC labels. The training script
> exists today; it needs the panel of real features joined to it.

**Backup fact:** we've already run the first pass — `engine/train_real.py` trains on 232 real observations
(IPC Phase 3+ outcomes × CHIRPS district rainfall, 2019–2020) with leave-one-district-out validation:
r = 0.48, mean error 8.5pp vs a 10.1pp naive baseline. Early, honest, and real — vegetation and market
features are the documented next step.

## 3. "What does r = 0.81 actually mean?"

> It means our weighted score reproduces the dataset's own risk classification with strong
> correlation — an internal consistency check that the weighting is coherent. I want to be precise:
> it is NOT validation against real-world hunger outcomes. That's the Fork A step — supervised
> training with whole districts held out, so we report error on districts the model never saw.

**Backup fact:** Saying what a metric is *not* is the credibility play; most teams over-claim here.

## 4. "Which data feed will be hardest to get?"

> Not the satellites — those are open APIs. The hard ones are the ministry signals: pest reports,
> irrigation coverage, input availability. That's a partnership, not an API — and it's exactly what
> this challenge and POTRAZ's convening power unlock. Hozi is designed so each ministry keeps
> ownership of its own data; we only read agreed signals.

**Backup fact:** This turns your weakest point into the ask. Federated design mirrors Project Pangolin.

## 5. "Why is there no machine learning in the model?"

> By choice, for now. Where trust matters — the risk score a Minister acts on — we use transparent,
> auditable math. We use AI where it's genuinely strong: language. Local-language briefs, parsing
> officer reports, answering planners' questions grounded in the engine's real numbers. The upgrade
> path to a learned model exists in the repo, and when it lands, the explainable breakdown stays —
> that transparency is the moat, not a limitation.

**Backup fact:** WFP's HungerMap is supervised on outcomes; Hozi's Fork A follows the same proven recipe, brought home.

## 6. "How is this different from HungerMap or FEWS NET?"

> Those tools answer "what will happen," at country scale, from outside. Hozi answers "where do we
> act first," at district scale, from inside — in English, chiShona and isiNdebele. We don't try to
> out-monitor global agencies; we own the lane they don't serve: prescriptive, sovereign,
> district-level planning. Prediction is a crowded field. Prescription is not.

**Backup fact:** The Response Planner never sets budgets — it stretches existing ones; that's the feature no global tool has.

## 7. "Who pays for this after the prize money?"

> Open-core and lean. The engine is MIT open-source — that builds trust and adoption. Revenue comes
> from government adoption, NGO and donor programmes, and the National AI Strategy's innovation
> funds. The automation keeps running costs tiny — this is built to be operated by a small team, not
> a big org. Curious Inq provides the design and integration capacity to deploy and extend it.

**Backup fact:** WFP estimates anticipatory action returns at least 7:1 — the economic case writes itself.

## 8. "What happens when the forecast is wrong?"

> It will be wrong sometimes — and the product says so on screen. Forecasts carry a widening
> confidence band, the limitations panel is a feature, and a human expert stays in the loop. Hozi is
> decision-support, never an oracle: it doesn't set budgets, it doesn't override ZimVAC or any
> ministry — it helps the people already responsible defend better decisions, earlier.

**Backup fact:** "Honesty first" is a differentiator in a field of over-claimed AI demos.

---

## One-liners to land

- *"Fill the granary before the drought."*
- *"We validated the brain first — plumbing is the cheap part."*
- *"Prediction is a crowded field. Prescription is not."*
- *"We keep AI out of the math and put it into the language."*
- *"It never sets budgets — it stretches the ones that exist."*
