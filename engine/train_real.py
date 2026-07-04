"""
Hozi - train_real.py  ·  Fork A first pass on REAL data.
Labels:   data/outcome_labels.csv        (IPC Phase 3+ %, 60 districts, 4 periods 2019-2020)
Features: data/raw/zwe-rainfall-adm2-full.csv (CHIRPS district rainfall, HDX/WFP)
Join:     data/raw/pcode2name.csv        (OCHA COD admin2 pcodes)

Model: ordinary least squares on rainfall features, validated with
LEAVE-ONE-DISTRICT-OUT cross-validation (the model never sees the district
it is tested on). Pure Python - auditable line by line, no dependencies.
"""
import csv, math, os, sys
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
P = lambda *a: os.path.join(ROOT, *a)

ALIAS = {"Gokwenorth":"Gokwe North","Gokwesouth":"Gokwe South",
         "Mhondoro-ngezi":"Mhondoro-Ngezi","Muzarabani":"Muzarabani",
         "Uzumbamarambapfungwe":"Uzumba-Maramba-Pfungwe"}

def fnum(x):
    """Return float(x) or None if conversion fails."""
    try: return float(x)
    except: return None

FEATS = ["r1h", "r3h", "rfq", "r3q"]  # 1-month rain, 3-month rain, and their anomalies vs long-term average

# ---- OLS via normal equations (with intercept), pure python ----
def ols(rows):
    """Fit OLS weights via Gaussian elimination on normal equations; returns weight vector."""
    n = len(FEATS) + 1
    A = [[0.0] * n for _ in range(n)]; b = [0.0] * n
    for r in rows:
        x = [1.0] + r["x"]
        for i in range(n):
            b[i] += x[i] * r["y"]
            for j in range(n): A[i][j] += x[i] * x[j]
    # gaussian elimination
    for i in range(n):
        p = max(range(i, n), key=lambda k: abs(A[k][i])); A[i], A[p] = A[p], A[i]; b[i], b[p] = b[p], b[i]
        for k in range(i + 1, n):
            m = A[k][i] / A[i][i]
            for j in range(i, n): A[k][j] -= m * A[i][j]
            b[k] -= m * b[i]
    w = [0.0] * n
    for i in range(n - 1, -1, -1):
        w[i] = (b[i] - sum(A[i][j] * w[j] for j in range(i + 1, n))) / A[i][i]
    return w

def predict(w, x):
    """Apply OLS weight vector w to feature vector x; returns scalar prediction."""
    return w[0] + sum(wi * xi for wi, xi in zip(w[1:], x))

def main():
    """Build the real-data panel and run leave-one-district-out validation."""
    # pcode -> name
    p2n = {r["pcode"]: r["name"].strip() for r in csv.DictReader(open(P("data/raw/pcode2name.csv"), encoding="utf-8"))}
    n2p = {v: k for k, v in p2n.items()}

    # labels
    labels = []
    for r in csv.DictReader(open(P("data/outcome_labels.csv"), encoding="utf-8")):
        name = ALIAS.get(r["district"], r["district"])
        if name in n2p:
            labels.append({"district": name, "pcode": n2p[name], "period": r["period"],
                           "y": float(r["food_insecurity_pct"])})
    print(f"labels joined to pcodes: {len(labels)}")

    # rainfall features: for each (pcode, period) use the dekad rows of that month
    want = {(l["pcode"], l["period"]) for l in labels}
    feat = {}
    with open(P("data/raw/zwe-rainfall-adm2-full.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["adm_level"] != "2": continue
            key = (r["PCODE"], r["date"][:7])
            if key not in want: continue
            row = feat.setdefault(key, {"r1h": [], "r3h": [], "rfq": [], "r3q": []})
            for k in row:
                v = fnum(r.get(k))
                if v is not None: row[k].append(v)

    panel = []
    for l in labels:
        fr = feat.get((l["pcode"], l["period"]))
        if not fr or not all(fr[k] for k in FEATS): continue
        x = [sum(fr[k]) / len(fr[k]) for k in FEATS]
        panel.append({"district": l["district"], "period": l["period"], "x": x, "y": l["y"]})
    print(f"training panel rows (district x period with full features): {len(panel)}")
    with open(P("data/real_training_panel.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["district", "period"] + FEATS + ["food_insecurity_pct"])
        for p in panel: w.writerow([p["district"], p["period"]] + [round(v, 2) for v in p["x"]] + [p["y"]])

    # ---- leave-one-district-out cross-validation ----
    districts = sorted(set(p["district"] for p in panel))
    preds = []
    for d in districts:
        train = [p for p in panel if p["district"] != d]
        test = [p for p in panel if p["district"] == d]
        w = ols(train)
        for p in test: preds.append((p["y"], max(0.0, min(100.0, predict(w, p["x"])))))
    ys = [a for a, _ in preds]; ps = [b for _, b in preds]
    my, mp = sum(ys) / len(ys), sum(ps) / len(ps)
    cov = sum((a - my) * (b - mp) for a, b in preds)
    r = cov / math.sqrt(sum((a - my) ** 2 for a in ys) * sum((b - mp) ** 2 for b in ps))
    mae = sum(abs(a - b) for a, b in preds) / len(preds)
    base = sum(abs(a - my) for a in ys) / len(ys)
    print(f"\nLEAVE-ONE-DISTRICT-OUT results on {len(preds)} real observations, {len(districts)} districts:")
    print(f"  r (predicted vs actual IPC 3+ %) : {r:.3f}")
    print(f"  mean absolute error              : {mae:.1f} percentage points")
    print(f"  naive baseline (always mean)     : {base:.1f} percentage points")
    w = ols(panel)
    print(f"\nfull-data weights: intercept={w[0]:.2f} " + " ".join(f"{k}={v:.4f}" for k, v in zip(FEATS, w[1:])))
    print("\nHonest read: rainfall-only model on 4 seasons. More periods + vegetation/prices as next features.")

if __name__ == "__main__":
    main()
