# Sample data

`02_agriculture_climate_market_signals.csv` — synthetic challenge dataset
provided by POTRAZ for AI4I 2026 (programme-provided; not real observations).
Used by `engine/engine.py` so judges can run the full pipeline offline.

Real-data training inputs (IPC/ZimVAC outcome labels + CHIRPS rainfall, HDX/WFP,
OCHA pcodes) are documented in `docs/DATASET-STATEMENT.md`; bulk raw files are
not committed — `engine/train_real.py` documents their exact sources and layout.
