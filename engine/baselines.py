"""
Baseline comparison for Hozi's trained model (AI4I rubric C2).

Answers the judges' question directly: is AI justified, or would a
simple rule do? All methods evaluated with the SAME leave-one-district-out
protocol on the same real panel (IPC Phase 3+ % x CHIRPS rainfall).

Baselines:
  1. global-mean      : predict the training-set mean (no skill floor)
  2. persistence      : predict the district's own mean from other periods
                        (needs no rainfall data at all)
  3. rainfall-rule    : two-level rule on r3q (3-month rainfall anomaly);
                        threshold + levels fitted on train fold only
Model:
  4. OLS on 4 rainfall features (train_real.ols) - the submitted model

Outputs a markdown table to docs/BASELINE-RESULTS.md and prints it.
Pure stdlib. Deterministic.
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import train_real

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "docs", "BASELINE-RESULTS.md")
R3Q = train_real.FEATS.index("r3q")


def build_panel():
    """Rebuild the panel via train_real, then read it back from CSV."""
    train_real.main()
    import csv
    panel = []
    with open(os.path.join(ROOT, "data", "real_training_panel.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            panel.append({"district": r["district"], "period": r["period"],
                          "x": [float(r[k]) for k in train_real.FEATS],
                          "y": float(r["food_insecurity_pct"])})
    return panel


def metrics(pairs):
    """Return (pearson r, mean absolute error) for (actual, predicted) pairs."""
    ys = [a for a, _ in pairs]; ps = [b for _, b in pairs]
    my, mp = sum(ys) / len(ys), sum(ps) / len(ps)
    mae = sum(abs(a - b) for a, b in pairs) / len(pairs)
    va = sum((a - my) ** 2 for a in ys); vb = sum((b - mp) ** 2 for b in ps)
    if va == 0 or vb == 0:
        return 0.0, mae
    r = sum((a - my) * (b - mp) for a, b in pairs) / math.sqrt(va * vb)
    return r, mae


def fit_rule(train):
    """Grid-search a two-level rainfall rule on the train fold only."""
    best = None
    mean_y = sum(p["y"] for p in train) / len(train)
    for q in range(-30, 31, 2):          # threshold on r3q anomaly
        wet = [p["y"] for p in train if p["x"][R3Q] >= q]
        dry = [p["y"] for p in train if p["x"][R3Q] < q]
        if not wet or not dry:
            continue
        pw, pd = sum(wet) / len(wet), sum(dry) / len(dry)
        sse = sum((p["y"] - (pw if p["x"][R3Q] >= q else pd)) ** 2 for p in train)
        if best is None or sse < best[0]:
            best = (sse, q, pw, pd)
    if best is None:
        return lambda x: mean_y
    _, q, pw, pd = best
    return lambda x: pw if x[R3Q] >= q else pd


def run():
    """Evaluate all methods under leave-one-district-out and write the report."""
    panel = build_panel()
    districts = sorted(set(p["district"] for p in panel))
    results = {"global-mean": [], "persistence": [], "rainfall-rule": [], "OLS model": []}
    for d in districts:
        train = [p for p in panel if p["district"] != d]
        test = [p for p in panel if p["district"] == d]
        gmean = sum(p["y"] for p in train) / len(train)
        rule = fit_rule(train)
        w = train_real.ols(train)
        for p in test:
            results["global-mean"].append((p["y"], gmean))
            others = [q["y"] for q in panel
                      if q["district"] == d and q["period"] != p["period"]]
            results["persistence"].append(
                (p["y"], sum(others) / len(others) if others else gmean))
            results["rainfall-rule"].append((p["y"], rule(p["x"])))
            results["OLS model"].append(
                (p["y"], max(0.0, min(100.0, train_real.predict(w, p["x"])))))

    lines = ["# Baseline comparison (leave-one-district-out, real IPC x CHIRPS panel)",
             "",
             f"Panel: {len(panel)} observations, {len(districts)} districts.",
             "",
             "| Method | r | MAE (pp) |",
             "|---|---|---|"]
    print(f"{'method':14s} {'r':>7s} {'MAE':>7s}")
    for name, pairs in results.items():
        r, mae = metrics(pairs)
        lines.append(f"| {name} | {r:.3f} | {mae:.1f} |")
        print(f"{name:14s} {r:7.3f} {mae:7.1f}")
    lines += ["",
              "Note on persistence: it uses the district's own OTHER-season outcomes, "
              "information unavailable for a district never assessed - the model needs "
              "only rainfall. All fitting (rule threshold, OLS weights) done on the "
              "train fold only.", ""]
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"\nwrote {OUT}")


if __name__ == "__main__":
    run()
