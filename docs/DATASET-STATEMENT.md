# Dataset Provenance Statement

**Project:** Hozi — National Food-Security Foresight Engine
**Submission:** POTRAZ AI for Impact (AI4I) 2026 — Development Track
**Rubric reference:** C3 — Dataset statement (20 pts)
**Last updated:** 2026-07-04

---

## 1. Data Inventory

| Dataset | Source & URL | Licence / Rights | Role in Hozi | Real or Synthetic |
|---|---|---|---|---|
| POTRAZ synthetic challenge CSV (`02_agriculture_climate_market_signals.csv`) | Programme-provided by POTRAZ for AI4I 2026; committed at `sample_data/` | Challenge terms (programme-provided; not for redistribution) | Drives the demo web app (`engine/engine.py`) and judges' offline run; used for internal weighting-coherence check only | **Synthetic** |
| IPC / ZimVAC Phase 3+ district outcomes 2019–2020 | Public IPC reports and ZimVAC/ZimLAC Rural Livelihoods Assessments (Food & Nutrition Council archive); IPC portal: https://www.ipcinfo.org/ipc-country-analysis/en/?country=ZWE; FEWS NET Data Explorer: https://data.fews.net/ | Public — government and UN agency reports | Outcome labels for real-data model training; committed as `data/outcome_labels.csv` | **Real** |
| ZimLAC 2025 Rural Livelihoods Assessment — partial district outcomes | Zimbabwe Food & Nutrition Council / ZimLAC 2025 full report (text archived at `docs/sources/ZimLAC-2025-RLA-fulltext.txt`) | Public government report | Seed of 2025–2026 district labels for future training; committed as `data/outcome_labels_2025_zimlac.csv` | **Real** (partial — top/bottom districts only) |
| CHIRPS district rainfall dekads | HDX / WFP: https://data.humdata.org/ (file: `zwe-rainfall-adm2-full.csv`) | Creative Commons / open | Features for real-data training (`r1h`, `r3h`, `rfq`, `r3q`); bulk file not committed — sourced at build time | **Real** |
| OCHA COD admin2 pcodes | OCHA Common Operational Datasets: https://data.humdata.org/dataset/zimbabwe-administrative-boundaries | Open — humanitarian use | District name-to-pcode join table (`data/raw/pcode2name.csv`); ensures consistent district identity across all datasets | **Real** |

---

## 2. Processing and Labels

### Join method

District names in `data/outcome_labels.csv` are joined to CHIRPS rainfall rows via OCHA admin2 pcodes. The join table `data/raw/pcode2name.csv` maps each pcode to a canonical district name. Because ZimVAC reports use inconsistent spelling, `engine/train_real.py` applies a small hardcoded alias map before the join:

```
"Gokwenorth"            -> "Gokwe North"
"Gokwesouth"            -> "Gokwe South"
"Mhondoro-ngezi"        -> "Mhondoro-Ngezi"
"Uzumbamarambapfungwe"  -> "Uzumba-Maramba-Pfungwe"
```

Any label row whose name (after aliasing) does not match a pcode is silently dropped and the drop count is printed at runtime. No manual overrides beyond the four aliases above.

### Feature construction

For each (district, period) pair, all CHIRPS dekad rows falling within that month are collected and averaged. The four features used are:

| Feature | Description | Observed range in panel |
|---|---|---|
| `r1h` | 1-month accumulated rainfall (mm) — dekad mean | — |
| `r3h` | 3-month accumulated rainfall (mm) — dekad mean | — |
| `rfq` | 1-month rainfall as percent of long-run normal (anomaly index) | 53.8 – 198.9 |
| `r3q` | 3-month rainfall as percent of long-run normal (anomaly index) | 58.3 – 254.1 |

`rfq` and `r3q` are dimensionless percent-of-normal indices. Values above 100 indicate above-average rainfall; values below 100 indicate deficit. The panel contains no NDVI, price, or input data — rainfall is the sole feature source at this stage.

### Label definition

The outcome label is **IPC Phase 3+ percentage of the district population** — the share of people in Acute Food Insecurity Phase 3 (Crisis) or worse at the time of assessment. Source: ZimVAC Rural Livelihoods Assessment district tables and IPC/FEWS NET classifications.

### Panel size

The committed reproducible artefact is **`data/real_training_panel.csv`**:

- **232 observations** (233 lines including header)
- **58 districts**
- **4 assessment periods:** 2019-02, 2019-06, 2020-02, 2020-10
- Columns: `district`, `period`, `r1h`, `r3h`, `rfq`, `r3q`, `food_insecurity_pct`

Not every district appears in every period; the panel is unbalanced. Rows with missing feature values for any of the four features are excluded before training.

---

## 3. Synthetic Data Disclosure

**What is synthetic:** The POTRAZ challenge CSV (`sample_data/02_agriculture_climate_market_signals.csv`) is entirely synthetic programme-provided data. It is not derived from real district observations.

**What is not synthetic:** No generative model (GAN, diffusion, statistical synthesiser) was used by this team to produce or augment any dataset. All real-data files are transcribed or downloaded from the public sources named in Section 1.

**The r = 0.81 figure (README badge):** This is an internal weighting-coherence check. It measures how well Hozi's transparent composite risk score reproduces the synthetic dataset's own built-in `climate_crop_risk_score` column. It is a self-consistency check on the *synthetic* data, not a validation against real food-insecurity outcomes. It has no bearing on model quality in deployment.

**Real validation:** The only validation against real outcomes is the leave-one-district-out (LODO) cross-validation on the 232-row real panel, reported in [`docs/BASELINE-RESULTS.md`](BASELINE-RESULTS.md):

| Method | r | MAE (percentage points) |
|---|---|---|
| Global-mean baseline | −0.557 | 10.2 |
| Persistence baseline | 0.129 | 11.0 |
| Rainfall-rule baseline | −0.179 | 10.7 |
| **OLS model (Hozi)** | **0.484** | **8.5** |

The OLS model is fitted and tested entirely on real IPC/ZimVAC district outcomes. LODO means the model is never tested on a district it was trained on — the strictest feasible protocol given the panel size.

---

## 4. Quality Limits and Gaps

**Label depth:** Only 4 assessment seasons are currently represented (2019–2020). ZimVAC/ZimLAC assessments exist back to at least 2009, giving a potential panel of 15+ years × ~60 districts. Expanding the label time-series is the documented next step (see `docs/DATA-SOURCES-forkA.md`).

**Features:** The real model uses rainfall only. Vegetation (NDVI), market prices, pest pressure, and input availability — all of which the demo engine uses conceptually — are not yet in the real training panel. Adding them is expected to materially improve predictive skill.

**District naming:** The four-alias map in `train_real.py` was sufficient for the 2019–2020 ZimVAC tables. Earlier reports or different transcription sources may introduce additional naming variants that require further aliases.

**Refresh frequency:**

| Dataset | Refresh cadence |
|---|---|
| CHIRPS rainfall | Dekadal (10-day); near-real-time |
| IPC / ZimVAC outcomes | Seasonal (typically once or twice per year) |
| ZimLAC 2025 labels | Static — single assessment period (Jan–Mar 2026) |
| POTRAZ synthetic CSV | Static — fixed challenge dataset |

**Panel balance:** The panel is unbalanced (not all districts assessed in all periods). This is a property of the underlying ZimVAC survey design, not a processing artefact.

**Bulk raw files not committed:** `data/raw/zwe-rainfall-adm2-full.csv` and `data/raw/pcode2name.csv` are not committed to the repository due to size and redistribution constraints. `engine/train_real.py` documents their exact sources, column names, and download locations. The committed `data/real_training_panel.csv` is the reproducible output from those inputs.

---

## 5. Personal Data: None

All inputs to Hozi are district-level aggregate statistics — no individual, household, or personally identifiable information is collected, stored, or processed at any stage of this pipeline.

The system does not request, ingest, or retain names, identity numbers, contact details, location traces, or any other personal data as defined under Zimbabwe's Data Protection Act [Chapter 12:07].

Exposure under that Act is minimal by design: the unit of analysis is the administrative district, not the person.

---

*This statement covers all data used in the Hozi prototype as at the submission date. Any future integration of live data feeds (Met Services, Agritex, GMB) will require a corresponding update to this statement before operational deployment.*
