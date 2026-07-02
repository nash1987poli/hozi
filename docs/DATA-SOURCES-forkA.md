# Fork A data sources — the real food-security *outcomes* Hozi can learn from

To move Hozi from **Fork B** (hand-weighted indicator scorer) to **Fork A** (a model
*trained on real outcomes*, HungerMap-class), we need a **real outcome label**: measured
district food-insecurity, over time. It exists, it's public, and it goes back two decades.

---

## 1. What we already pulled (real 2025 numbers)

From the **ZimLAC 2025 Rural Livelihoods Assessment** (full text saved at
`docs/sources/ZimLAC-2025-RLA-fulltext.txt`):

- **National, peak hunger period (Jan–Mar 2026):** ~**15%** of rural households cereal-insecure
  — approximately **1,548,432 individuals**.
- **Highest districts:** **Kariba 57.6%**, **Mangwe 43.3%**, **Bulilima 43.3%**, Mberengwa 40%,
  Binga 40%, Zaka 37%, Mudzi 35%.
- **Lowest districts:** **Marondera 1%**, **Muzarabani 2.3%**.
- **Provinces highest at peak:** Matabeleland North 20%, Midlands 19%.
- Acceptable food consumption rose from **29% (2020) → 59% (2025)**.
- Full **Top-30 / Bottom-30 district rankings** are in the source text (a chart on p.154–156;
  transcribe carefully — the confident values are seeded in
  `data/outcome_labels_2025_zimlac.csv`).

## 2. The label time-series (the training set)

The Food & Nutrition Council hosts **every national ZimVAC/ZimLAC Rural Livelihoods Assessment**
— one per year, each with district food-insecurity prevalence. Full index with URLs:
`docs/sources/FNC-ZimVAC-ZimLAC-archive-index.md`. Key national reports:

| Year | Report |
|---|---|
| 2025 | ZimLAC Rural Livelihoods Assessment |
| 2024 | ZimLAC Rural Livelihoods Assessment |
| 2023 | ZimVAC Rural Livelihoods Assessment (+ Technical Report) |
| 2022 | ZimVAC Rural Livelihoods Assessment (National + all 8 provinces) |
| 2021 | ZimVAC Rural Livelihoods Assessment (National + provinces) |
| 2020 | ZimVAC Rural Livelihoods Assessment (National + provinces) |
| 2019 | ZimVAC Rural Livelihoods Assessment |
| 2018 | ZimVAC Rural Livelihoods Assessment |
| 2009–2017 | ZimVAC Rural Livelihoods Assessments (annual) |

→ ~15+ years × ~60 districts = a real district-year panel of food-insecurity outcomes.
The catch: these PDFs are report-style (charts/tables); building a clean CSV means transcribing
or OCR-ing the district tables — real work, but a well-defined, fundable task.

## 3. Machine-readable sources (easier to automate)

- **FEWS NET Data Explorer** — https://data.fews.net/ — IPC-compatible acute food-insecurity
  classifications, **monthly since 2009**, per area, via **API + download** (free account).
- **IPC portal (Zimbabwe)** — https://www.ipcinfo.org/ipc-country-analysis/en/?country=ZWE
- **HDX** — https://data.humdata.org/dataset/zimbabwe-acute-food-insecurity-country-data —
  Zimbabwe IPC datasets (current + projections), GeoJSON/CSV.

## 4. The honest join requirement

Fork A needs **features and labels for the *same real districts*.** The POTRAZ challenge dataset
(`Datasets/02_…csv`) is *synthetic* and uses a different, smaller district set — it **cannot** be
joined directly to these real ZimVAC labels. The real pipeline is:

```
real per-district FEATURES              real per-district LABELS
(rainfall/NDVI/prices from FEWS NET,  +  (ZimVAC/ZimLAC food-insecurity %)
 satellite, GMB)                          → data/outcome_labels.csv
                     └── join on (district, period) ──┘
                                   │
                          engine/train.py  → learned model + held-out validation
```

## 5. Status in this repo

- ✅ `engine/train.py` — the Fork A training machinery, ready for `data/outcome_labels.csv`.
- ✅ `data/outcome_labels_2025_zimlac.csv` — a real (partial) seed of district labels from ZimLAC 2025.
- ✅ `docs/sources/` — the full ZimLAC 2025 report text + the complete ZimVAC/ZimLAC archive index.
- ⏭️ Next: assemble real per-district features (FEWS NET/satellite) for the same districts,
  expand the label CSV across years, then run `python engine/train.py` for genuine validation.
