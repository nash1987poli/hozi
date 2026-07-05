<div align="center">

<img src="docs/logo.jpg" alt="Hozi — National Food-Security Foresight Engine" width="440" />

# Hozi

### National Foresight & Decision Infrastructure — first module: Food Security

**_Fill the granary before the drought._**

*See the hunger coming — and act in time.*

![status](https://img.shields.io/badge/status-working%20prototype-1E6B4F)
![consistency check (synthetic)](https://img.shields.io/badge/consistency%20check%20%28synthetic%29-r%3D0.81-D89B2E)
![real-outcome LODO](https://img.shields.io/badge/real--outcome%20LODO-r%3D0.48-1E6B4F)
![stack](https://img.shields.io/badge/stack-python%20%2B%20vanilla%20JS-16130F)
![license](https://img.shields.io/badge/license-MIT-1E6B4F)
![built in](https://img.shields.io/badge/built%20in-Zimbabwe%20%F0%9F%87%BF%F0%9F%87%BC-D89B2E)

</div>

---

Hozi is the **first Zimbabwean-owned food-security foresight engine.** It forecasts where
food-security risk across Zimbabwe's crops is heading — district by district — then helps
responders **get the most from the resources they already have**, so early action reaches the
right places *in time*.

Built for the **POTRAZ AI for Impact (AI4I) 2026 Challenge** (Development track), Hozi turns a wall of
climate and crop numbers into one clear, honest, actionable picture a Minister can read in thirty seconds.

> **Prediction is a crowded field. Prescription is not.** Global tools (WFP HungerMap, FEWS NET) tell you
> *what* will happen. Hozi helps our own planners decide *where to act first* — interactively, in local
> languages, and sovereign.

### One engine. Many decisions.

The pattern Hozi runs — *signals → risk score → forecast → response ranking → local-language playbooks* — is domain-agnostic. Food security is the proven first module: real-outcome training done, baselines beaten, trilingual playbooks shipped. The next two modules are already on the honest roadmap (visible in the app's domain rail): **cholera-outbreak foresight** and **flood-displacement foresight**. Same engine, new signal set, new institutional customer. That is the infrastructure play.

<div align="center">
<img src="docs/screenshot.jpg" alt="Hozi interface" width="820" />
</div>

---

## Why it exists

Almost every year, parts of Zimbabwe slide into food shortage when the rains fail. The tragedy is rarely
that no one saw it coming — it's that the warning arrives too late, buried in slow seasonal reports
produced outside the country, after the moment for early action has passed. Planners are then left to
stretch limited resources across many struggling districts with no quick, shared way to see where action
would do the most good.

Hozi closes that gap: **earlier warning + a clear, shared picture + help deciding where each dollar
protects the most people.**

## What it does

- 🗺️ **National risk map** — every district's staple food-security risk, on a real Zimbabwe map.
- ⏱️ **Season time-slider (Jan → Sep)** — watch risk climb into the dry season; July–September are forecasts.
- 📋 **Districts to watch** — a live ranked list by projected September risk.
- 🔎 **District drill-down** — the drivers behind each district's risk, its trajectory, and an early-warning note.
- 🎯 **The Response Planner** — for the level of support you can reach this season, Hozi ranks *where that
  effort protects the most people first* (the driest, least-served, highest-risk districts). **It never
  sets budgets** — it helps stretch the ones that exist.
- 🌍 **Local-language ready** — English + chiShona + isiNdebele interface (all 60 district playbooks in three languages; native-speaker verification of sn/nd drafts pending).
- 🧾 **Honesty panel** — states plainly what the model can and cannot know.

## How it works

```
data (CSV / live feeds)  →  [Layer 0: n8n automation]  →  engine.py  →  [Layer 2: Claude API]  →  projections.js + briefs.js  →  app (index.html)
                                                               │
                               transparent risk model · real-outcome training · forecast · Response Planner
```

1. **Transparent risk model** — a clear, weighted blend of rainfall deficit, vegetation (NDVI), pests,
   irrigation and input access. No black box; every number is traceable.
2. **Real-outcome validation** — the OLS forecaster is trained on a real panel of 232 district-season
   observations (IPC Phase 3+ outcomes × CHIRPS rainfall), validated leave-one-district-out: **r = 0.48,
   MAE = 8.5 pp — beats every simpler baseline** (see [`docs/BASELINE-RESULTS.md`](docs/BASELINE-RESULTS.md)).
   Separately, on the *synthetic* challenge data, Hozi's composite score reproduces the dataset's own risk
   band at **r = 0.81** — an internal weighting-coherence check on synthetic data, not real-outcome validation.
   Both numbers are honest; they measure different things.
3. **Forecast** — projects the well-understood seasonal trend 1–3 months ahead with a *widening confidence
   band*. Foresight, not fortune-telling.
4. **Response Planner** — a support package reduces risk most where irrigation is low and the district is
   dry and high-risk, so "best buys" are genuinely differentiated.

## Where the data comes from

Hozi doesn't invent data — it reads trusted signals from the bodies that already own them, and **each
owner keeps control of its own data**:

| Signal | Source | Import |
|---|---|---|
| Rainfall | Met Services · TAMSAT / CHIRPS | scheduled API pull |
| Vegetation (NDVI) | NASA · Copernicus · FAO ASIS | scheduled API pull |
| Crops · pests · inputs | Agritex / Min. of Agriculture | ministry feed + officer reports |
| Market prices | GMB · ZMX · e-Mukambo | API / upload |
| Ground truth | District officers (WhatsApp) | simple report form |
| Everything, long-term | **Project Pangolin** (national data platform) | Hozi as an analytics layer |

*This prototype runs on POTRAZ synthetic sample data. The engine is built to plug the live feeds above
straight in.*

## Quick start

No build tools, no dependencies beyond Python's standard library.

```bash
# 1. run the tests — 14 checks, all stdlib (should print OK)
python -m unittest discover -s tests

# 2. (re)generate the projections from the dataset
#    the app runs fully offline from sample_data/
python engine/engine.py

# 3. open the app — either double-click app/index.html, or serve it:
cd app && python -m http.server 8000
#   then open http://localhost:8000
```

## Project structure

```
Hozi/
├── engine/
│   ├── engine.py        # transparent risk model, forecast, Response Planner
│   ├── train_real.py    # OLS forecaster trained on 232 real IPC × CHIRPS obs
│   └── baselines.py     # LODO baseline comparison (persistence, rainfall-rule)
├── app/
│   ├── index.html       # the interactive decision-support interface
│   ├── cockpit.js       # Response Planner logic, map, time-slider
│   ├── i18n.js          # English / chiShona / isiNdebele UI strings
│   ├── projections.js   # engine output the app reads (also .json)
│   └── briefs.js        # pre-generated Claude advisory playbooks (en/sn/nd)
├── scripts/
│   └── generate-briefs.mjs  # batch Claude API call — runs offline, output committed
├── automation/
│   ├── hozi-pipeline.workflow.json  # import-ready n8n Layer 0 workflow
│   └── README.md        # node-by-node docs, setup guide, security notes
├── tests/
│   ├── test_engine.py   # 12 unit tests: risk model, Pearson r, linfit, band
│   └── test_train_real.py  # 2 unit tests: OLS solver, predict()
├── sample_data/         # POTRAZ synthetic challenge CSV (engine runs offline from here)
├── data/                # real training panel (IPC × CHIRPS), generated projections
├── proposal/            # 4-page AI4I solution proposal (PDF + source)
└── docs/
    ├── ARCHITECTURE.md       # four-layer diagram, component table, integration readiness
    ├── BASELINE-RESULTS.md   # LODO results table (auto-generated by baselines.py)
    ├── DATASET-STATEMENT.md  # provenance, processing, synthetic disclosure, limits
    ├── AI-USAGE-NOTE.md      # two-layer AI design, guardrails, dev disclosure
    ├── BUSINESS-MODEL.md     # Annex A — problem, users, revenue, costs, risks
    ├── DEPLOYMENT-PLAN.md    # Annex B — hosting, pilot site, milestones, monitoring
    ├── RISK-COMPLIANCE.md    # Data Protection Act, responsible AI, security, testing
    └── TESTING-EVIDENCE.md   # captured test outputs + manual checklist
```

## How Hozi is different

| | WFP HungerMap / FEWS NET | **Hozi** |
|---|---|---|
| Granularity | Country-level, global | **District-level, Zimbabwe** |
| Job | Monitor & report | **Plan & prescribe** (Response Planner) |
| Ownership | Foreign agencies | **Zimbabwean-owned, open-source** |
| Language / feel | Global, English | **Local-language, human, sovereign** |

## Evidence pack

Everything a judge needs to verify the claims in this README is committed to the repository:

| Document | What it covers |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Four-layer system diagram (Mermaid + ASCII), component table, data-flow narrative, integration readiness |
| [`docs/BASELINE-RESULTS.md`](docs/BASELINE-RESULTS.md) | LODO results table — OLS r=0.48, MAE=8.5 pp vs all baselines (auto-generated, rerunnable) |
| [`docs/DATASET-STATEMENT.md`](docs/DATASET-STATEMENT.md) | Data provenance, join method, feature construction, synthetic disclosure, limits |
| [`docs/AI-USAGE-NOTE.md`](docs/AI-USAGE-NOTE.md) | Two-layer AI design, prompt text, guardrails, AI-assisted development disclosure |
| [`docs/BUSINESS-MODEL.md`](docs/BUSINESS-MODEL.md) | Annex A — problem, primary users, revenue model, cost table, adoption risks |
| [`docs/DEPLOYMENT-PLAN.md`](docs/DEPLOYMENT-PLAN.md) | Annex B — hosting, pilot site (Matabeleland South), milestones, monitoring, backup |
| [`docs/RISK-COMPLIANCE.md`](docs/RISK-COMPLIANCE.md) | Data Protection Act [Ch. 12:07] position, responsible AI risks, security controls, test suite |
| [`docs/TESTING-EVIDENCE.md`](docs/TESTING-EVIDENCE.md) | Captured outputs: 14 unit tests, engine diagnostics, LODO run, app smoke test |
| [`automation/README.md`](automation/README.md) | n8n Layer 0 workflow — node-by-node table, setup guide, security note |

## Responsible AI (what it can't do)

Hozi is **decision-support, not an oracle.** It keeps a human expert in the loop, shows its reasoning,
and is honest about uncertainty. It **does not set budgets or override any authority** — it supports
existing decision-makers and processes (ZimVAC, ministries).

### Known limitations

- **4 seasons of labels** — the real training panel covers 2019–2020 (232 obs, 58 districts). ZimVAC assessments back to 2009 could expand this materially.
- **Rainfall-only features** — the real OLS model uses CHIRPS rainfall only. NDVI, market prices, pest pressure, and input availability are conceptually in the demo engine but not yet in the real training panel.
- **Demo runs on synthetic challenge data** — the app and offline engine run on POTRAZ's synthetic CSV. Real-data training is documented separately (see `docs/DATASET-STATEMENT.md` and `data/real_training_panel.csv`).
- **LLM contradiction-flagging is now shipped** — the official IPC/ZimVAC Phase 3+ share (2019–2020 assessments) is supplied per district to Claude, which flags disagreements between the model's risk picture and the official figure in each brief's note field. 16 of 20 demo districts matched a label entry; the 4 urban districts receive a no-official-data disclosure. Fresher ZimVAC/IPC rounds slot in without code changes. Honest caveat: assessments are dated 2019–2020; the demo model runs on synthetic current data.
- **sn/nd native-speaker review pending** — chiShona and isiNdebele translations in `app/briefs.js` and `app/i18n.js` are AI-generated drafts; professional verification before operational use is the documented next step.

## Roadmap

- **Now:** working engine + national map + Response Planner on sample data; 14 unit tests passing; real-outcome training done (LODO r=0.48, beats all baselines); trilingual playbooks (en/sn/nd) committed; n8n Layer 0 workflow authored; **live demo: [nash1987poli.github.io/hozi](https://nash1987poli.github.io/hozi/)**.
- **3 months:** live rainfall/satellite/market feeds, all staple crops, pilot with one ministry or NGO.
- **12 months:** national roll-out, local-language alerts to district officers, multi-hazard expansion
  (floods, disease), integration with Project Pangolin.

## Built by

**[Curious Inq](https://curiousinq.com)** — an AI-powered creative studio in Harare, Zimbabwe.

**Nash Barara** — product & design lead. **Chipo** — strategy & copywriting.

Built with AI assistance: Claude served as pair developer throughout — writing engine code, tests, and documentation from specifications authored by the team. Fully disclosed in [`docs/AI-USAGE-NOTE.md`](docs/AI-USAGE-NOTE.md).

For the POTRAZ AI for Impact (AI4I) 2026 Challenge.

## License

[MIT](LICENSE) — free to use, extend, and build upon. Sovereign and open, by design.

---

<div align="center"><i>“Fill the granary before the drought.”</i></div>
