"""
Hozi — train.py  ·  the path from Fork B to Fork A (HungerMap-class)
====================================================================
WHERE HOZI IS TODAY (Fork B, "indicator scorer"):
  engine.py computes risk as a HAND-WEIGHTED sum of indicators (rainfall, NDVI,
  pests, irrigation, inputs). Nothing is learned from real outcomes. The 0.81
  figure is an internal consistency check against the dataset's own composite
  score — NOT validation against a measured food-security outcome.

WHAT THIS SCRIPT IS (Fork A, "supervised on outcomes"):
  The real thing HungerMap does — LEARN the indicator->outcome relationship from
  labelled examples, then predict the outcome where no survey ran, and test on
  held-out districts. This file is the working machinery, ready to run the moment
  a REAL outcome label is supplied.

THE ONE MISSING INGREDIENT: a real food-security OUTCOME label per district/period.
  Get it (free) from:
    - FEWS NET Data Explorer   https://data.fews.net/         (API + download, since 2009)
    - IPC portal               https://www.ipcinfo.org/ipc-country-analysis/en/?country=ZWE
    - HDX (Humanitarian Data Exchange)  https://data.humdata.org/  (Zimbabwe IPC datasets)
    - ZimVAC / ZimLAC via the Food & Nutrition Council  https://www.fnc.org.zw/documents/
  Save it as:  Hozi/data/outcome_labels.csv
  Columns:     district, period (YYYY-MM), food_insecurity_pct (0-100)

Then:  python engine/train.py           (trains + validates on REAL outcomes)
Smoke test the plumbing with no labels:  python engine/train.py --demo   (uses a
  PROXY target only to prove the code runs — this is NOT validation, it is circular.)

Pure Python, no numpy/sklearn — the learning is auditable line by line.
"""
import csv, os, math, sys, random
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FEATURES_CSV = os.path.normpath(os.path.join(ROOT, "..", "Datasets",
    "02_agriculture_climate_market_signals.csv"))
LABELS_CSV = os.path.join(ROOT, "data", "outcome_labels.csv")
STAPLES = {"Maize", "Sorghum", "Groundnuts"}
FEATNAMES = ["rainfall_mm", "ndvi", "pest", "irrigation", "inputs"]

def fnum(x):
    try: return float(x)
    except: return 0.0

# ---- build per district-month feature vectors (mean over staple crops) ----
def load_features():
    agg = {}
    with open(FEATURES_CSV, encoding="utf-8") as f:
        for d in csv.DictReader(f):
            if d["crop"] not in STAPLES: continue
            key = (d["district"], d["month"])
            agg.setdefault(key, []).append({
                "rainfall_mm": fnum(d["rainfall_mm"]), "ndvi": fnum(d["ndvi_proxy_0_1"]),
                "pest": fnum(d["pest_incidents_reported"]),
                "irrigation": fnum(d["irrigation_coverage_pct"]),
                "inputs": fnum(d["input_availability_score_0_100"]),
                "proxy": fnum(d["climate_crop_risk_score_0_100"]),  # only for --demo
            })
    feats = {}
    for key, rs in agg.items():
        feats[key] = {fn: sum(r[fn] for r in rs)/len(rs) for fn in FEATNAMES}
        feats[key]["proxy"] = sum(r["proxy"] for r in rs)/len(rs)
    return feats

def load_labels():
    if not os.path.exists(LABELS_CSV): return None
    lab = {}
    with open(LABELS_CSV, encoding="utf-8") as f:
        for d in csv.DictReader(f):
            lab[(d["district"], d["period"])] = fnum(d["food_insecurity_pct"])
    return lab

# ---- standardise, then multivariate linear regression by gradient descent ----
def standardise(rows):
    k = len(FEATNAMES); mean=[0]*k; std=[0]*k; n=len(rows)
    for j,fn in enumerate(FEATNAMES): mean[j]=sum(r[fn] for r in rows)/n
    for j,fn in enumerate(FEATNAMES):
        std[j]=math.sqrt(sum((r[fn]-mean[j])**2 for r in rows)/n) or 1.0
    X=[[ (r[fn]-mean[j])/std[j] for j,fn in enumerate(FEATNAMES)] for r in rows]
    return X, mean, std

def train_linreg(X, y, epochs=6000, lr=0.08):
    n=len(X); k=len(X[0]); w=[0.0]*k; b=0.0
    for _ in range(epochs):
        gw=[0.0]*k; gb=0.0
        for i in range(n):
            err=(b+sum(w[j]*X[i][j] for j in range(k)))-y[i]
            for j in range(k): gw[j]+=err*X[i][j]
            gb+=err
        for j in range(k): w[j]-=lr*gw[j]/n
        b-=lr*gb/n
    return w, b

def predict(x, w, b): return b+sum(w[j]*x[j] for j in range(len(w)))

def metrics(yt, yp):
    n=len(yt); mae=sum(abs(a-b) for a,b in zip(yt,yp))/n
    rmse=math.sqrt(sum((a-b)**2 for a,b in zip(yt,yp))/n)
    ma=sum(yt)/n; mp=sum(yp)/n
    cov=sum((a-ma)*(b-mp) for a,b in zip(yt,yp))
    va=math.sqrt(sum((a-ma)**2 for a in yt)); vb=math.sqrt(sum((b-mp)**2 for b in yp))
    r=cov/(va*vb) if va and vb else 0.0
    return mae, rmse, r

def main():
    demo = "--demo" in sys.argv
    feats = load_features()
    labels = load_labels()

    if labels is None and not demo:
        print("NO REAL OUTCOME LABELS FOUND at", LABELS_CSV)
        print("Fork A (learning) is impossible without them. Get real labels from:")
        print("  FEWS NET Data Explorer  https://data.fews.net/")
        print("  IPC portal              https://www.ipcinfo.org/ipc-country-analysis/en/?country=ZWE")
        print("  HDX                     https://data.humdata.org/")
        print("  ZimVAC/ZimLAC (FNC)     https://www.fnc.org.zw/documents/")
        print("Then save data/outcome_labels.csv (district, period, food_insecurity_pct) and re-run.")
        print("\n(To smoke-test the training machinery on a PROXY target: python engine/train.py --demo)")
        return

    # assemble training rows: feature vector + target
    rows, y = [], []
    if labels is not None:
        for key, fv in feats.items():
            if key in labels:
                rows.append(fv); y.append(labels[key])
        target_desc = "REAL measured food-insecurity outcome"
    else:  # --demo plumbing test only
        print("="*68)
        print("  PLUMBING TEST ONLY (--demo). Target = dataset's own composite score.")
        print("  This is CIRCULAR (target derived from the same inputs). It proves the")
        print("  training code runs end-to-end. It is NOT Fork A validation.")
        print("="*68)
        for key, fv in feats.items():
            rows.append(fv); y.append(fv["proxy"])
        target_desc = "PROXY (circular) — not a real outcome"

    if len(rows) < 20:
        print(f"Only {len(rows)} labelled rows — too few to learn. Need more outcome data.")
        return

    # group holdout: keep ~30% of DISTRICTS entirely unseen (avoids leakage)
    keyed = [(key, feats[key], labels[key] if labels else feats[key]["proxy"])
             for key in feats if (labels is None or key in labels)]
    all_d = sorted({k[0] for k,_,_ in keyed})
    random.seed(7); random.shuffle(all_d)
    n_hold = max(1, int(len(all_d)*0.3)); hold=set(all_d[:n_hold])
    tr=[(fv,t) for k,fv,t in keyed if k[0] not in hold]
    te=[(fv,t) for k,fv,t in keyed if k[0] in hold]

    Xtr, mean, std = standardise([fv for fv,_ in tr]); ytr=[t for _,t in tr]
    w, b = train_linreg(Xtr, ytr)
    Xte = [[ (fv[fn]-mean[j])/std[j] for j,fn in enumerate(FEATNAMES)] for fv,_ in te]
    yte=[t for _,t in te]; yp=[predict(x,w,b) for x in Xte]
    mae, rmse, r = metrics(yte, yp)

    print(f"\ntarget:            {target_desc}")
    print(f"labelled rows:     {len(keyed)}   train districts:{len(all_d)-n_hold}  held-out:{n_hold}")
    print(f"LEARNED weights (standardised):")
    for fn, wv in zip(FEATNAMES, w): print(f"   {fn:12s} {wv:+.3f}")
    print(f"   bias         {b:+.3f}")
    print(f"\nHELD-OUT performance (districts the model never saw):")
    print(f"   MAE  = {mae:.2f}")
    print(f"   RMSE = {rmse:.2f}")
    print(f"   r    = {r:.3f}   {'(REAL validation)' if labels is not None else '(proxy plumbing test — not valid)'}")

if __name__ == "__main__":
    main()
