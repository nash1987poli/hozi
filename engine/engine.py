"""
Hozi — National Food-Security Foresight Engine
================================================
Transparent, explainable risk + forecast + intervention engine for the
POTRAZ AI4I 2026 Challenge.

Pipeline:
  1. Load the POTRAZ agriculture/climate dataset (synthetic challenge data).
  2. Compute a TRANSPARENT composite food-security risk from observable drivers.
  3. VALIDATE: show it tracks the dataset's own `climate_crop_risk_score`.
  4. FORECAST: project each district's staple risk 1-3 months ahead (Jul-Sep)
     with an explicit confidence band.
  5. Export everything (incl. model weights + per-district drivers) to
     projections.json so the web app can recompute interventions live.

No ML black box, no numpy — pure, auditable Python. Honesty over false precision.
"""
import csv, json, math, os, statistics, sys
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

# ---- paths ----
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                      # .../Hozi
SRC  = os.path.normpath(os.path.join(ROOT, "..", "Datasets",
        "02_agriculture_climate_market_signals.csv"))
OUT_APP  = os.path.join(ROOT, "app", "projections.json")
OUT_DATA = os.path.join(ROOT, "data", "projections.json")

STAPLES = {"Maize", "Sorghum", "Groundnuts"}      # food-security staples; Maize = lead
MONTHS  = ["2026-01","2026-02","2026-03","2026-04","2026-05","2026-06"]
FUTURE  = ["2026-07","2026-08","2026-09"]

# ---- transparent risk model (weights are interpretable & exported to JS) ----
# Each driver -> a 0..1 "risk contribution". Composite is a weighted blend,
# reduced by mitigation from irrigation & input availability.
W = {
    "rain":  0.42,   # rainfall deficit  (penalty)
    "ndvi":  0.34,   # vegetation shortfall (penalty)
    "pest":  0.12,   # pest pressure (penalty)
    "irr":   0.18,   # irrigation buffer (mitigator)
    "inp":   0.10,   # input availability (mitigator)
    "bias":  0.06,
}
RAIN_NEED = 100.0    # mm/month reference need for staple growth
NDVI_HEALTHY = 0.70  # healthy vegetation index
SUPPORT_K = 24.0     # max risk points a package can remove (before caps)


def clamp(x, lo=0.0, hi=1.0):
    """Clamp x to the range [lo, hi]."""
    return max(lo, min(hi, x))

def driver_risks(r):
    """Return (rain, ndvi, pest, irr, inp) normalised 0..1 risk contributions for row r."""
    rain = clamp((RAIN_NEED - r["rainfall_mm"]) / RAIN_NEED)
    ndvi = clamp((NDVI_HEALTHY - r["ndvi"]) / NDVI_HEALTHY)
    pest = clamp(r["pest"] / 25.0)
    irr  = clamp(r["irrigation"] / 100.0)
    inp  = clamp(r["inputs"] / 100.0)
    return rain, ndvi, pest, irr, inp

def model_risk(r):
    """Return composite food-security risk score 0..100 for row r."""
    rain, ndvi, pest, irr, inp = driver_risks(r)
    raw = (W["rain"]*rain + W["ndvi"]*ndvi + W["pest"]*pest
           - W["irr"]*irr - W["inp"]*inp + W["bias"])
    return round(clamp(raw) * 100, 1)

def fnum(x):
    """Parse x as float, returning 0.0 on failure."""
    try: return float(x)
    except: return 0.0

def pearson(a, b):
    """Return Pearson correlation coefficient between lists a and b."""
    n = len(a); ma = sum(a)/n; mb = sum(b)/n
    cov = sum((x-ma)*(y-mb) for x, y in zip(a, b))
    va = math.sqrt(sum((x-ma)**2 for x in a)); vb = math.sqrt(sum((y-mb)**2 for y in b))
    return cov/(va*vb) if va and vb else 0.0

def linfit(ys):
    """Return (slope, intercept) of ordinary least-squares line through ys."""
    n = len(ys); xs = list(range(n))
    mx = sum(xs)/n; my = sum(ys)/n
    den = sum((x-mx)**2 for x in xs) or 1
    slope = sum((x-mx)*(y-my) for x, y in zip(xs, ys)) / den
    intercept = my - slope*mx
    return slope, intercept

def band(v):
    """Return risk band label ('High', 'Medium', or 'Low') for a risk score v."""
    return "High" if v >= 66 else ("Medium" if v >= 45 else "Low")

def latest(d):
    """Return the most recent known monthly risk value for district dict d."""
    for m in reversed(MONTHS):
        if m in d["series"]: return d["series"][m]
    return None

def sep_proj(d):
    """Return the September forecast risk for district dict d, or None."""
    return d["forecast"].get("2026-09", {}).get("risk")


def main(src=SRC):
    """Run the full pipeline: load -> validate -> forecast -> plan -> export."""
    # ---- load ----
    rows = []
    with open(src, encoding="utf-8") as f:
        for d in csv.DictReader(f):
            rows.append({
                "month": d["month"], "province": d["province"], "district": d["district"],
                "lat": fnum(d["latitude"]), "lon": fnum(d["longitude"]), "crop": d["crop"],
                "rainfall_mm": fnum(d["rainfall_mm"]), "ndvi": fnum(d["ndvi_proxy_0_1"]),
                "pest": fnum(d["pest_incidents_reported"]),
                "irrigation": fnum(d["irrigation_coverage_pct"]),
                "inputs": fnum(d["input_availability_score_0_100"]),
                "price": fnum(d["avg_farmgate_price_usd_per_tonne"]),
                "yield": fnum(d["estimated_yield_t_per_ha"]),
                "given_risk": fnum(d["climate_crop_risk_score_0_100"]),
                "given_level": d["risk_level"],
            })

    # ---- validation: Pearson r between our model and the dataset's own score ----
    staple_rows = [r for r in rows if r["crop"] in STAPLES]
    ours  = [model_risk(r) for r in staple_rows]
    given = [r["given_risk"] for r in staple_rows]
    R_ALL = pearson([model_risk(r) for r in rows], [r["given_risk"] for r in rows])
    R_STAPLE = pearson(ours, given)

    # ---- district staple food-security series (mean model risk over staples) ----
    districts = {}
    for r in rows:
        districts.setdefault(r["district"], {
            "district": r["district"], "province": r["province"],
            "lat": r["lat"], "lon": r["lon"], "series": {}, "drivers": {},
        })

    for dname, d in districts.items():
        for m in MONTHS:
            srows = [r for r in staple_rows if r["district"] == dname and r["month"] == m]
            if not srows:  # fall back to any crop that month
                srows = [r for r in rows if r["district"] == dname and r["month"] == m]
            if srows:
                d["series"][m] = round(statistics.mean(model_risk(r) for r in srows), 1)
                # keep latest-month average drivers for live intervention sim
                d["drivers"][m] = {
                    "rainfall_mm": round(statistics.mean(r["rainfall_mm"] for r in srows), 1),
                    "ndvi": round(statistics.mean(r["ndvi"] for r in srows), 3),
                    "pest": round(statistics.mean(r["pest"] for r in srows), 1),
                    "irrigation": round(statistics.mean(r["irrigation"] for r in srows), 1),
                    "inputs": round(statistics.mean(r["inputs"] for r in srows), 1),
                }

    # ---- forecast: linear trend on the 6 monthly points, damped, + widening band ----
    for d in districts.values():
        ys = [d["series"][m] for m in MONTHS if m in d["series"]]
        if len(ys) < 3:
            d["forecast"] = {}; continue
        slope, intercept = linfit(ys)
        n = len(ys); fc = {}
        for h, fm in enumerate(FUTURE, start=1):
            damp = 0.85 ** h                      # damp the trend the further out we go
            proj = clamp((intercept + slope*(n-1 + h*damp)) / 100) * 100
            band_ = round(4 + 3.0*h, 1)           # confidence band widens with horizon
            fc[fm] = {"risk": round(proj, 1),
                      "low": round(clamp((proj-band_)/100)*100, 1),
                      "high": round(clamp((proj+band_)/100)*100, 1)}
        d["forecast"] = fc

    # ---- Response Planner: per-district "support package" impact (best buys) ----
    # A standard early-action package (irrigation + seed/input support) reduces risk MOST where
    # current coverage is lowest and water stress is highest -- so the same effort saves more
    # in the driest, least-served districts. This makes the "best buys" genuinely differentiated.
    for d in districts.values():
        latest_m = next((m for m in reversed(MONTHS) if m in d["drivers"]), None)
        if not latest_m or "2026-09" not in d.get("forecast", {}):
            d["support"] = None
        else:
            dr = d["drivers"][latest_m]
            proj = d["forecast"]["2026-09"]["risk"]
            rain_def = clamp((RAIN_NEED - dr["rainfall_mm"]) / RAIN_NEED)   # how dry
            irr_room = 1 - dr["irrigation"] / 100.0                          # room to add irrigation
            inp_room = 1 - dr["inputs"] / 100.0                             # room to add inputs
            benefit = (0.62 * irr_room * rain_def) + (0.38 * inp_room)
            reduction = SUPPORT_K * (proj / 100.0) * benefit                # scaled by how at-risk
            reduction = round(min(reduction, proj * 0.55), 1)               # never zero out risk
            d["support"] = {"reduction": reduction,
                            "supported_sep": round(max(0.0, proj - reduction), 1)}
        # tidy timeline (actuals + projections) for the time-slider
        tl = [{"m": m, "risk": d["series"][m], "proj": False} for m in MONTHS if m in d["series"]]
        for m in FUTURE:
            if m in d.get("forecast", {}):
                f = d["forecast"][m]
                tl.append({"m": m, "risk": f["risk"], "proj": True, "low": f["low"], "high": f["high"]})
        d["timeline"] = tl
        d["latest_drivers"] = d["drivers"].get(latest_m) if latest_m else None

    # ---- national rollup + "districts to watch" ----
    watch = []
    for d in districts.values():
        cur, proj = latest(d), sep_proj(d)
        if cur is None or proj is None: continue
        watch.append({"district": d["district"], "province": d["province"],
                      "current": cur, "projected_sep": proj, "delta": round(proj-cur, 1),
                      "band_now": band(cur), "band_sep": band(proj)})
    watch.sort(key=lambda x: x["projected_sep"], reverse=True)

    cur_high = sum(1 for w in watch if w["band_now"] == "High")
    sep_high = sum(1 for w in watch if w["band_sep"] == "High")
    nat_now  = round(statistics.mean(w["current"] for w in watch), 1)
    nat_sep  = round(statistics.mean(w["projected_sep"] for w in watch), 1)

    # ---- export ----
    out = {
        "meta": {
            "title": "Hozi — National Food-Security Foresight Engine",
            "source": "POTRAZ AI4I dataset 02 (synthetic challenge data)",
            "staples": sorted(STAPLES), "months": MONTHS, "future": FUTURE,
            "model_weights": W, "rain_need": RAIN_NEED, "ndvi_healthy": NDVI_HEALTHY,
            "validation_r_all": round(R_ALL, 3), "validation_r_staple": round(R_STAPLE, 3),
            "generated": "2026-06-30",
        },
        "national": {"risk_now": nat_now, "risk_sep": nat_sep,
                     "high_now": cur_high, "high_sep": sep_high, "n_districts": len(watch)},
        "watch": watch,
        "districts": list(districts.values()),
    }
    for path in (OUT_APP, OUT_DATA):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        json.dump(out, open(path, "w", encoding="utf-8"), separators=(",", ":"))
    # also emit a JS-wrapped copy so the app works by double-click (no server / no CORS)
    OUT_JS = os.path.join(ROOT, "app", "projections.js")
    open(OUT_JS, "w", encoding="utf-8").write(
        "window.HOZI=" + json.dumps(out, separators=(",", ":")) + ";")

    # ---- diagnostics ----
    print(f"districts: {len(districts)}   staple rows: {len(staple_rows)}")
    print(f"VALIDATION  r(all crops) = {R_ALL:.3f}   r(staples) = {R_STAPLE:.3f}")
    print(f"NATIONAL    now={nat_now}  Sep={nat_sep}   High districts now={cur_high} -> Sep={sep_high}")
    print("\nTOP 8 DISTRICTS TO WATCH (projected Sep risk):")
    print(f"  {'district':16s} {'prov':20s} {'now':>5s} {'Sep':>5s} {'Δ':>6s}  band")
    for w in watch[:8]:
        print(f"  {w['district']:16s} {w['province']:20s} {w['current']:5.1f} "
              f"{w['projected_sep']:5.1f} {w['delta']:+6.1f}  {w['band_now']}->{w['band_sep']}")
    print(f"\nwrote: {OUT_APP}")


if __name__ == "__main__":
    main()
