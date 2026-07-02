# Hozi Cockpit UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `app/index.html` from a scrolling editorial page into a full-screen Leaflet "decision cockpit" per `docs/superpowers/specs/2026-07-02-cockpit-ui-design.md`.

**Architecture:** One full-screen Leaflet map (vendored locally, no CDN at runtime) with 60 real district polygons; all UI floats over it (KPI card, watch/ask panel, drill-down, time slider, story tab, legend, Planning Mode dark flip). The Python engine and `projections.js` format are untouched; existing i18n (en/sn/nd), planner math, sparkline, and Ask-Hozi functions are ported from the old page, which stays available via git history.

**Tech Stack:** Vanilla HTML/CSS/JS, Leaflet 1.9.4 (local files in `app/vendor/`), Python only for one-time data file generation. No build tools. Node used only for verification scripts.

**Working dir for all commands:** `C:\Users\MSI\Documents\CLIENTS CURIOUS INQ\P\POTRAZ\Hozi` (bash path: `/c/Users/MSI/Documents/CLIENTS CURIOUS INQ/P/POTRAZ/Hozi`).

**Reference copy of the old page (read-only source for ports):**
```bash
git show HEAD:app/index.html > /tmp/old-index.html
```
Key regions in `/tmp/old-index.html`:
- CSS: lines 7–191 (palette variables at top)
- I18N dicts (en/sn/nd): lines ~350–410
- `t()` helper: line 411 · `col()` risk color: line 336 · `riskAt()`: line 414
- `setMonth/kpis/fillStatement`: lines 431–451 · watch list: 454–465
- Ask-Hozi (`renderTalk/ask/dinfo/fmtD/respond`): lines 466–525
- `selectDistrict` drill-down: 526–541 · `sparkline`: 542–550
- Planner (`renderBuys/updatePlanner`): 551–572 · `applyLang`: 573–580 · `countUp`: 589

**Data facts (verified):**
- `app/projections.js` sets `window.HOZI` = `{meta, national, watch[20], districts[20]}`.
- Each district: `{district, province, lat, lon, timeline[9] (Jan–Sep, .m/.risk/.proj), latest_drivers{rainfall_mm,ndvi,pest,irrigation,inputs}, support{reduction, supported_sep}, series, drivers, forecast}`. Timeline index 0–8; index ≥ 6 is forecast.
- `Datasets/ipc_zwe.geojson` (one level up, `../Datasets/`): 60 Polygon features, district name in `properties.title`.
- Name mapping: 15 exact matches; `Chinhoyi → Makonde`; NO polygons for `Harare Urban, Chitungwiza, Bulawayo Central, Bulawayo North` (render as circle markers).

---

### Task 1: Vendor Leaflet locally

**Files:**
- Create: `app/vendor/leaflet.js`, `app/vendor/leaflet.css`

- [ ] **Step 1: Download Leaflet 1.9.4 (one-time; needs internet)**

```bash
mkdir -p app/vendor
curl -sL -o app/vendor/leaflet.js  https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
curl -sL -o app/vendor/leaflet.css https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
```

- [ ] **Step 2: Verify integrity**

```bash
node --check app/vendor/leaflet.js && grep -c "leaflet" app/vendor/leaflet.css && ls -la app/vendor/
```
Expected: no syntax error; grep count ≥ 1; leaflet.js ≈ 145–150 KB, leaflet.css ≈ 15 KB. If sizes are tiny (<5 KB) the download failed — stop and report.

- [ ] **Step 3: Commit**

```bash
git add app/vendor && git commit -m "chore: vendor Leaflet 1.9.4 locally (offline-capable, no build tools)"
```

---

### Task 2: Generate `app/districts.geo.js`

**Files:**
- Create: `app/districts.geo.js` (generated, committed)

- [ ] **Step 1: Generate JS-wrapped geojson (script-tag loadable, works from file://)**

```bash
python - <<'EOF'
import json
g = json.load(open('../Datasets/ipc_zwe.geojson', encoding='utf-8'))
# keep only what the app needs: geometry + title (shrinks file, strips IPC styling)
feats = [{"type":"Feature","geometry":f["geometry"],
          "properties":{"title":f["properties"]["title"]}} for f in g["features"]]
out = {"type":"FeatureCollection","features":feats}
with open('app/districts.geo.js','w',encoding='utf-8') as f:
    f.write("// generated from Datasets/ipc_zwe.geojson - do not edit by hand\n")
    f.write("window.HOZI_GEO=")
    json.dump(out,f,separators=(',',':'))
    f.write(";\n")
print("features:", len(feats))
EOF
```
Expected output: `features: 60`

- [ ] **Step 2: Verify it parses and exposes the global**

```bash
node -e "window={};require('path');eval(require('fs').readFileSync('app/districts.geo.js','utf8'));console.log('features:',window.HOZI_GEO.features.length)"
```
Expected: `features: 60`

- [ ] **Step 3: Commit**

```bash
git add app/districts.geo.js && git commit -m "feat: add district polygons as script-loadable geojson (60 districts)"
```

---

### Task 3: Name map + automated smoke check

**Files:**
- Create: `app/name-map.js`
- Create: `scripts/check-app.mjs`

- [ ] **Step 1: Write `app/name-map.js`** (complete file):

```js
// Maps engine district names -> geojson feature titles.
// Urban districts have no rural-IPC polygon; they render as circle markers.
window.HOZI_NAMEMAP = {
  polygon: {
    "Mutare":"Mutare","Chipinge":"Chipinge","Bindura":"Bindura","Mazowe":"Mazowe",
    "Marondera":"Marondera","Murehwa":"Murehwa","Hurungwe":"Hurungwe","Masvingo":"Masvingo",
    "Chiredzi":"Chiredzi","Hwange":"Hwange","Lupane":"Lupane","Gwanda":"Gwanda",
    "Beitbridge":"Beitbridge","Gweru":"Gweru","Kwekwe":"Kwekwe",
    "Chinhoyi":"Makonde" // Chinhoyi is the district town of Makonde
  },
  urban: ["Harare Urban","Chitungwiza","Bulawayo Central","Bulawayo North"]
};
```

- [ ] **Step 2: Write `scripts/check-app.mjs`** (complete file):

```js
// Smoke checks: every modeled district resolves to a polygon or an urban marker,
// and every referenced polygon title exists in the geojson.
import { readFileSync } from "fs";
const load = (p) => { const window = {}; eval(readFileSync(p, "utf8")); return window; };
const HOZI = load("app/projections.js").HOZI;
const GEO = load("app/districts.geo.js").HOZI_GEO;
const MAP = load("app/name-map.js").HOZI_NAMEMAP;

const titles = new Set(GEO.features.map(f => f.properties.title));
let fail = 0;
for (const d of HOZI.districts) {
  const name = d.district;
  const poly = MAP.polygon[name];
  const urban = MAP.urban.includes(name);
  if (!poly && !urban) { console.error("UNMAPPED:", name); fail++; }
  if (poly && !titles.has(poly)) { console.error("BAD TITLE:", name, "->", poly); fail++; }
  if (poly && urban) { console.error("DOUBLE-MAPPED:", name); fail++; }
}
if (GEO.features.length !== 60) { console.error("expected 60 features"); fail++; }
if (HOZI.districts.length !== 20) { console.error("expected 20 districts"); fail++; }
console.log(fail ? `FAIL (${fail})` : "OK: 20 districts resolved, 60 polygons present");
process.exit(fail ? 1 : 0);
```

- [ ] **Step 3: Run the check**

```bash
node scripts/check-app.mjs
```
Expected: `OK: 20 districts resolved, 60 polygons present`

- [ ] **Step 4: Commit**

```bash
git add app/name-map.js scripts/check-app.mjs
git commit -m "feat: add district name map with automated smoke check"
```

---

### Task 4: Extract i18n to `app/i18n.js` and add cockpit strings

**Files:**
- Create: `app/i18n.js`

- [ ] **Step 1: Port existing dictionaries.** Copy the full `I18N` object (en/sn/nd) from `/tmp/old-index.html` lines ~350–410 into `app/i18n.js` as `window.HOZI_I18N = { ... }`. Also port the `t()` helper (old line 411) as:

```js
window.hoziT = function(k, en){ const s=window.HOZI_I18N[window.HOZI_LANG||'en'];
  return (s && s[k]!==undefined) ? s[k] : (en!==undefined?en:k); };
```

- [ ] **Step 2: Add NEW cockpit keys to all three dicts** (merge into each of en/sn/nd; en values are canonical, sn/nd below are drafts — flag with the review comment):

```js
// NEW cockpit strings (en canonical):
// planMode:"Planning Mode", exitPlan:"Exit Planning", story:"The Story",
// noData:"No data yet — engine coverage grows with live feeds",
// legendTitle:"Staple food-security risk", legendNo:"no data yet",
// playSeason:"Play the season", watchTab:"Watch", askTab:"Ask Hozi",
// urbanNote:"urban district — shown as a point"
// sn (chiShona) drafts:
// planMode:"Nzira Yekuronga", exitPlan:"Buda muKuronga", story:"Nyaya",
// noData:"Hapana data parizvino — injini ichawedzera nemafeeds mhenyu",
// legendTitle:"Njodzi yechikafu", legendNo:"hapana data",
// playSeason:"Ridza mwaka", watchTab:"Tarisa", askTab:"Bvunza Hozi",
// urbanNote:"dunhu reguta — rinoratidzwa sechinongedzo"
// nd (isiNdebele) drafts:
// planMode:"Indlela Yokuhlela", exitPlan:"Phuma Ekuhleleni", story:"Indaba",
// noData:"Akuladatha okwamanje — injini izakhula ngemifudo ephilayo",
// legendTitle:"Ubungozi bokudla", legendNo:"akuladatha",
// playSeason:"Dlala isizini", watchTab:"Buka", askTab:"Buza iHozi",
// urbanNote:"isigaba sedolobho — sikhonjiswa njengephuzu"
```
Top of file must carry: `// TODO(native-speaker): verify sn/nd drafts before submission` — this TODO is a deliberate, user-approved flag, not a plan placeholder.

- [ ] **Step 3: Verify syntax + keys**

```bash
node --check app/i18n.js && node -e "window={};eval(require('fs').readFileSync('app/i18n.js','utf8'));const I=window.HOZI_I18N;['sn','nd'].forEach(l=>['planMode','story','noData','watchTab'].forEach(k=>{if(!I[l][k])throw l+'.'+k}));console.log('i18n OK')"
```
Expected: `i18n OK`

- [ ] **Step 4: Commit**

```bash
git add app/i18n.js && git commit -m "feat: extract i18n to module; add cockpit strings in en/sn/nd"
```

---

### Task 5: Cockpit shell — new `index.html` + `cockpit.css`

**Files:**
- Modify: `app/index.html` (full rewrite)
- Create: `app/cockpit.css`

- [ ] **Step 1: Write the new `app/index.html`** (complete file):

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hozi — National Food-Security Foresight Engine</title>
<link rel="stylesheet" href="vendor/leaflet.css">
<link rel="stylesheet" href="cockpit.css">
</head>
<body>
<div id="map" aria-label="Zimbabwe district risk map"></div>

<header class="topbar panel">
  <div class="brand"><img src="logo.jpg" alt="Hozi"><div>
    <strong>Hozi</strong><span id="tbSub">National Food-Security Foresight Engine</span></div></div>
  <div class="tools">
    <div class="lng">
      <button data-lang="en" class="on">EN</button>
      <button data-lang="sn">chiShona</button>
      <button data-lang="nd">isiNdebele</button>
    </div>
    <button id="infoBtn" title="How it works">&#9432;</button>
    <label class="plan-switch"><input type="checkbox" id="planToggle">
      <span id="planLabel">Planning Mode</span></label>
  </div>
</header>

<section class="kpi panel skeleton" id="kpiCard">
  <div class="kpi-head"><span class="big" id="kHigh">0</span><span id="kHighLbl">of 20 districts heading into HIGH risk by September</span></div>
  <div class="kpi-sub"><span id="kNow">0</span> → <span id="kSep">0</span> <span id="kNatLbl">national risk</span>
    <button id="kMore">+</button></div>
  <div class="kpi-extra" id="kpiExtra" hidden></div>
</section>

<aside class="left panel skeleton" id="leftPanel">
  <nav class="tabs"><button id="tabWatch" class="on">Watch</button><button id="tabAsk">Ask Hozi</button></nav>
  <div id="watchList" role="list"></div>
  <div id="askPane" hidden><div id="chat"></div><div id="chips"></div>
    <form id="askForm"><input id="askIn" placeholder="Type a question..."><button>Send</button></form></div>
  <div id="plannerPane" hidden>
    <h3 id="plTitle">Districts you can support this season</h3>
    <input type="range" id="plRange" min="0" max="20" value="0"><span class="big" id="pn">0</span>
    <div class="pl-kpis">
      <div><span id="plKept">0</span><label id="plKeptLbl">kept out of high risk</label></div>
      <div><span id="plSaved">0</span><label id="plSavedLbl">risk points removed</label></div>
      <div><span id="plSep">75</span><label id="plSepLbl">September national risk</label></div>
    </div>
    <ol id="buys"></ol>
  </div>
</aside>

<aside class="drill panel" id="drill" hidden>
  <button class="close" id="drillClose">&times;</button>
  <h2 id="dName"></h2><p class="prov" id="dProv"></p>
  <div id="dSpark"></div><div id="dDrivers"></div><p class="note" id="dNote"></p>
  <p class="src" id="dSrc"></p>
</aside>

<div class="timebar panel">
  <button id="play" title="Play the season">&#9654;</button>
  <input type="range" id="time" min="0" max="8" value="5">
  <span class="month" id="monthLbl">June</span><span class="fc" id="fcLbl" hidden>forecast</span>
</div>

<button class="story-tab" id="storyTab">The Story</button>
<aside class="story panel" id="storyPanel" hidden>
  <button class="close" id="storyClose">&times;</button>
  <div id="storyBody"><!-- filled by cockpit.js from I18N (hero, how-it-works, honesty) --></div>
</aside>

<div class="legend panel"><span id="legTitle">Staple food-security risk</span>
  <i style="--c:#1E6B4F"></i><i style="--c:#D89B2E"></i><i style="--c:#D98324"></i><i style="--c:#BC3B2A"></i>
  <i class="nod" style="--c:#DDD8CB"></i><span id="legNo">no data yet</span></div>

<div id="tip" class="tip"></div>

<script src="vendor/leaflet.js"></script>
<script src="projections.js"></script>
<script src="districts.geo.js"></script>
<script src="name-map.js"></script>
<script src="i18n.js"></script>
<script src="cockpit.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `app/cockpit.css`** (complete file — port palette from old CSS lines 7–20 and reuse its component styles where noted):

```css
:root{
  --ink:#16130F; --cream:#F7F3EA; --paper:#FFFFFF; --line:#D8D2C4;
  --green:#1E6B4F; --amber:#D89B2E; --rust:#BC3B2A; --mut:#8A8374;
  --shadow:0 2px 14px rgba(22,19,15,.12); --r:10px;
}
*{box-sizing:border-box} html,body{height:100%;margin:0}
body{font:14px/1.45 Georgia,'Times New Roman',serif;color:var(--ink);background:var(--cream)}
#map{position:fixed;inset:0;background:var(--cream)}
.leaflet-tile-pane{filter:sepia(.25) saturate(.7) brightness(1.04)} /* warm Hozi tint */
.panel{position:fixed;background:var(--paper);border:1px solid var(--line);
  border-radius:var(--r);box-shadow:var(--shadow);z-index:800}
.topbar{top:12px;left:12px;right:12px;display:flex;justify-content:space-between;
  align-items:center;padding:8px 14px}
.brand{display:flex;gap:10px;align-items:center}
.brand img{height:34px;border-radius:6px}
.brand span{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
.tools{display:flex;gap:14px;align-items:center}
.lng button{background:none;border:1px solid var(--line);border-radius:14px;padding:3px 10px;cursor:pointer}
.lng button.on{background:var(--green);color:#fff;border-color:var(--green)}
.plan-switch{display:flex;gap:6px;align-items:center;cursor:pointer;font-weight:bold}
.kpi{top:74px;left:12px;width:270px;padding:14px}
.kpi .big{font-size:34px;color:var(--rust);font-weight:bold;margin-right:8px}
.kpi-sub{margin-top:6px;color:var(--mut)}
.left{top:190px;left:12px;bottom:86px;width:270px;display:flex;flex-direction:column;padding:10px;overflow:hidden}
.tabs{display:flex;gap:6px;margin-bottom:8px}
.tabs button{flex:1;border:1px solid var(--line);background:none;border-radius:6px;padding:5px;cursor:pointer}
.tabs button.on{background:var(--ink);color:var(--cream)}
#watchList,#askPane,#plannerPane{overflow-y:auto;flex:1}
.row{display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid var(--line);cursor:pointer}
.row:hover,.row.hot{background:var(--cream)}
.row .bar{flex:1;height:7px;border-radius:4px;background:var(--line);overflow:hidden}
.row .bar i{display:block;height:100%}
.drill{top:74px;right:12px;bottom:86px;width:330px;padding:16px;overflow-y:auto}
.close{position:absolute;top:8px;right:10px;border:none;background:none;font-size:20px;cursor:pointer}
.timebar{left:50%;transform:translateX(-50%);bottom:16px;display:flex;gap:12px;
  align-items:center;padding:10px 18px;min-width:420px}
.timebar .month{font-size:18px;font-weight:bold;min-width:90px}
.timebar .fc{font-size:11px;color:var(--amber);text-transform:uppercase;letter-spacing:.08em}
#play{width:34px;height:34px;border-radius:50%;border:none;background:var(--green);color:#fff;cursor:pointer}
#time{flex:1}
.story-tab{position:fixed;left:0;top:45%;transform:rotate(180deg);writing-mode:vertical-rl;
  z-index:820;background:var(--ink);color:var(--cream);border:none;padding:14px 6px;
  border-radius:0 8px 8px 0;cursor:pointer;letter-spacing:.1em}
.story{top:74px;left:50%;transform:translateX(-50%);width:min(620px,92vw);max-height:75vh;
  overflow-y:auto;padding:26px;z-index:850}
.legend{right:12px;bottom:16px;display:flex;gap:6px;align-items:center;padding:8px 12px;font-size:11px}
.legend i{width:16px;height:10px;border-radius:2px;background:var(--c)}
.tip{position:fixed;pointer-events:none;background:var(--ink);color:var(--cream);padding:6px 10px;
  border-radius:6px;font-size:12px;opacity:0;transition:opacity .15s;z-index:900;max-width:230px}
.skeleton{position:relative;overflow:hidden}
.skeleton::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.65),transparent);animation:sk 1.2s infinite}
@keyframes sk{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
body.ready .skeleton::after{display:none}
/* ---------- Planning Mode (war room) ---------- */
body.plan{--paper:#221D16;--cream:#16130F;--ink:#F7F3EA;--line:#3A3327;--mut:#B7AE9C}
body.plan{color:var(--ink)}
body.plan .panel{background:var(--paper);border-color:var(--line)}
body.plan #map{background:#16130F}
body.plan .leaflet-tile-pane{filter:grayscale(.5) brightness(.35) sepia(.3)}
body.plan .plan-switch{color:var(--amber)}
body,.panel,#map,.leaflet-tile-pane{transition:background .4s,filter .4s,color .4s}
.buy-badge{background:var(--amber);color:var(--ink);border-radius:50%;width:20px;height:20px;
  display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold}
@media (max-width:900px){ .drill{width:86vw} .left{width:230px} .kpi{width:230px} }
```

- [ ] **Step 3: Verify shell loads without JS (structure only)**

```bash
python -m http.server 8000 --directory app &
sleep 1 && curl -s http://localhost:8000/ | grep -c "cockpit.js\|storyTab\|planToggle"; kill %1
```
Expected: `3`

- [ ] **Step 4: Commit**

```bash
git add app/index.html app/cockpit.css
git commit -m "feat: cockpit shell - full-screen layout, floating panels, planning-mode theme"
```
Note: the app is intentionally non-functional until Task 6 lands `cockpit.js`.

---

### Task 6: `cockpit.js` — boot, map, choropleth, tooltips, fallback

**Files:**
- Create: `app/cockpit.js`

- [ ] **Step 1: Write the core** (complete code; top of file):

```js
/* Hozi cockpit - vanilla JS, no build. Data: window.HOZI, HOZI_GEO, HOZI_NAMEMAP, HOZI_I18N */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const D=window.HOZI, GEO=window.HOZI_GEO, NM=window.HOZI_NAMEMAP, t=window.hoziT;
window.HOZI_LANG='en';
let monthIdx=5, playing=null, selected=null, planMode=false, supportN=0;
const MONTHS_EN=["January","February","March","April","May","June","July","August","September"];

// risk color - ported from old col() (line 336)
function col(v){const st=[[30,[30,107,79]],[50,[216,155,46]],[66,[217,131,36]],[85,[188,59,42]]];
  let c=st[st.length-1][1];for(const [th,rgb] of st){if(v<=th){c=rgb;break;}}
  return `rgb(${c[0]},${c[1]},${c[2]})`;}
function riskAt(d,i){return d.timeline[i].risk;}
const byName={}; D.districts.forEach(d=>byName[d.district]=d);

// ---- map ----
const map=L.map('map',{zoomControl:false,attributionControl:true})
  .setView([-19.0,29.8],7);
L.control.zoom({position:'bottomright'}).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
  {maxZoom:12,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);

const polyByDistrict={}, urbanMarkers={};
let geoLayer=null;
function styleFor(name){
  const d=byName[name];
  if(!d) return {color:'#B8B2A4',weight:1,fillColor:'#DDD8CB',fillOpacity:.55};
  return {color:'#7d7668',weight:1.2,fillColor:col(riskAt(d,monthIdx)),fillOpacity:.78};
}
function buildMap(){
  const title2model={}; Object.entries(NM.polygon).forEach(([m,g])=>title2model[g]=m);
  geoLayer=L.geoJSON(GEO,{
    style:f=>styleFor(title2model[f.properties.title]),
    onEachFeature:(f,ly)=>{
      const model=title2model[f.properties.title];
      if(model) polyByDistrict[model]=ly;
      ly.on('mouseover',e=>{hotRow(model,true);tipShow(e.originalEvent,tipHTML(model,f.properties.title));ly.setStyle({weight:3});});
      ly.on('mousemove',e=>tipMove(e.originalEvent));
      ly.on('mouseout',()=>{hotRow(model,false);tipHide();geoLayer.resetStyle(ly);});
      ly.on('click',()=>model&&selectDistrict(model));
    }
  }).addTo(map);
  NM.urban.forEach(name=>{const d=byName[name];if(!d)return;
    const mk=L.circleMarker([d.lat,d.lon],{radius:9,color:'#7d7668',weight:1.5,
      fillColor:col(riskAt(d,monthIdx)),fillOpacity:.9}).addTo(map);
    mk.on('mouseover',e=>{hotRow(name,true);tipShow(e.originalEvent,tipHTML(name)+`<br><i>${t('urbanNote','urban district — shown as a point')}</i>`);});
    mk.on('mousemove',e=>tipMove(e.originalEvent));
    mk.on('mouseout',()=>{hotRow(name,false);tipHide();});
    mk.on('click',()=>selectDistrict(name));
    urbanMarkers[name]=mk;});
  map.fitBounds(geoLayer.getBounds(),{padding:[40,40]});
}
function repaint(){ if(!geoLayer) return;
  Object.entries(polyByDistrict).forEach(([n,ly])=>ly.setStyle({fillColor:col(riskAt(byName[n],monthIdx))}));
  Object.entries(urbanMarkers).forEach(([n,mk])=>mk.setStyle({fillColor:col(riskAt(byName[n],monthIdx))}));
}
function tipHTML(model,geoTitle){
  if(!model) return `<b>${geoTitle}</b><br>${t('noData','No data yet — engine coverage grows with live feeds')}`;
  const d=byName[model];
  return `<b>${d.district}</b> · ${d.province}<br>${t('nowLbl','now')} ${Math.round(riskAt(d,monthIdx))} · Sep ${Math.round(riskAt(d,8))}`;
}
const tip=$('#tip');
function tipShow(e,h){tip.innerHTML=h;tip.style.opacity=1;tipMove(e);}
function tipMove(e){tip.style.left=(e.clientX+14)+'px';tip.style.top=(e.clientY+14)+'px';}
function tipHide(){tip.style.opacity=0;}
```

- [ ] **Step 2: Add fallback + boot at the END of the file** (runs after all function defs from later tasks; later tasks insert code ABOVE this block):

```js
// ---- boot ----
function boot(){
  try{
    if(!D||!D.districts) throw new Error('projections missing');
    if(GEO&&GEO.features&&GEO.features.length){ buildMap(); }
    else { fallbackDots(); }
  }catch(err){ console.error('Hozi boot:',err); fallbackDots(); }
  document.body.classList.add('ready');
}
function fallbackDots(){ // old dot-map behavior if geojson is broken
  D.districts.forEach(d=>{const mk=L.circleMarker([d.lat,d.lon],{radius:10,
    fillColor:col(riskAt(d,monthIdx)),fillOpacity:.9,color:'#7d7668',weight:1}).addTo(map);
    mk.on('click',()=>selectDistrict(d.district));urbanMarkers[d.district]=mk;});
}
boot();
```
(Temporarily define stubs so this task runs standalone: `function hotRow(){} function selectDistrict(){}` — Task 7 replaces them.)

- [ ] **Step 3: Verify**

```bash
node --check app/cockpit.js && node scripts/check-app.mjs
```
Expected: both OK. Then serve and eyeball:

```bash
python -m http.server 8000 --directory app
```
Open http://localhost:8000 — expect: full-screen warm map, Zimbabwe framed, 16 colored polygons + 4 colored dots + 44 grey polygons, tooltips on hover (colored AND grey), no console errors (F12).

- [ ] **Step 4: Commit**

```bash
git add app/cockpit.js && git commit -m "feat: cockpit core - Leaflet map, 60-district choropleth, tooltips, dot fallback"
```

---

### Task 7: Watch list, hover sync, drill-down

**Files:**
- Modify: `app/cockpit.js` (insert above the boot block)
- Modify: `app/index.html` (only if IDs mismatch — they should not)

- [ ] **Step 1: Watch list + hover sync** (complete code):

```js
// ---- watch list ----
function renderWatch(){
  $('#watchList').innerHTML=D.watch.map(w=>{
    const v=Math.round(w.projected_sep);
    return `<div class="row" data-d="${w.district}" role="listitem">
      <div><b>${w.district}</b><br><small>${w.province}</small></div>
      <div class="bar"><i style="width:${v}%;background:${col(v)}"></i></div>
      <b style="color:${col(v)}">${v}</b></div>`;}).join('');
  $$('#watchList .row').forEach(r=>{
    const n=r.dataset.d;
    r.addEventListener('mouseenter',()=>glow(n,true));
    r.addEventListener('mouseleave',()=>glow(n,false));
    r.addEventListener('click',()=>selectDistrict(n));});
}
function glow(name,on){ const ly=polyByDistrict[name]||urbanMarkers[name]; if(!ly)return;
  if(on) ly.setStyle({weight:4,color:'#16130F'});
  else if(geoLayer&&polyByDistrict[name]) geoLayer.resetStyle(ly);
  else ly.setStyle({weight:1.5,color:'#7d7668'});}
function hotRow(name,on){ if(!name)return;
  const r=$(`#watchList .row[data-d="${name}"]`); if(r)r.classList.toggle('hot',on);}
```

- [ ] **Step 2: Drill-down.** Port `sparkline(tl)` verbatim from `/tmp/old-index.html` lines 542–550. Then (complete code):

```js
function selectDistrict(name){ selected=name; const d=byName[name]; if(!d)return;
  const tgt=polyByDistrict[name];
  if(tgt) map.flyToBounds(tgt.getBounds(),{padding:[60,60],duration:.8});
  else map.flyTo([d.lat,d.lon],9,{duration:.8});
  $('#dName').textContent=d.district; $('#dProv').textContent=d.province;
  $('#dSpark').innerHTML=sparkline(d.timeline);
  const dr=d.latest_drivers||{};
  const bars=[[t('dRain','Rainfall (latest)'),Math.min(100,dr.rainfall_mm),'mm'],
    [t('dVeg','Vegetation index'),Math.round(dr.ndvi*100),'/100'],
    [t('dIrr','Irrigation'),Math.round(dr.irrigation),'%'],
    [t('dInp','Input availability'),Math.round(dr.inputs),'/100']];
  $('#dDrivers').innerHTML=bars.map(([l,v,u])=>`<div class="row"><small style="width:110px">${l}</small>
    <div class="bar"><i style="width:${Math.max(2,Math.min(100,v))}%;background:var(--green)"></i></div><small>${v}${u}</small></div>`).join('');
  const sep=Math.round(riskAt(d,8)), now=Math.round(riskAt(d,monthIdx));
  $('#dNote').textContent=(sep>=66)?t('warnHigh','Early-warning: projected HIGH risk by September without early action.')
    :t('warnWatch','On the watch list — trajectory rising into the dry season.');
  $('#dSrc').textContent=`${D.meta.source} · Jan–Jun ${t('observed','observed')}, Jul–Sep ${t('forecast','forecast')}`;
  $('#drill').hidden=false; syncURL();
}
$('#drillClose').addEventListener('click',()=>{ $('#drill').hidden=true; selected=null;
  if(geoLayer) map.flyToBounds(geoLayer.getBounds(),{padding:[40,40],duration:.8}); syncURL(); });
```
Remove the Task 6 stubs for `hotRow`/`selectDistrict`. Add a temporary `function syncURL(){}` stub (Task 10 replaces it). Call `renderWatch()` inside `boot()` right after map build.

- [ ] **Step 3: Verify** — `node --check app/cockpit.js`, serve, then confirm in browser: hover row highlights district and vice-versa; click flies to district and opens panel with sparkline + 4 driver bars; close returns to national frame.

- [ ] **Step 4: Commit**

```bash
git add app/cockpit.js && git commit -m "feat: watch list with two-way hover sync and district drill-down"
```

---

### Task 8: Time slider, play animation, KPI count-ups

**Files:**
- Modify: `app/cockpit.js` (insert above boot)

- [ ] **Step 1: Complete code** (port `countUp` verbatim from old line 589 first):

```js
// ---- time + KPIs ----
function setMonth(i){ monthIdx=Math.max(0,Math.min(8,+i)); $('#time').value=monthIdx;
  $('#monthLbl').textContent=t('m'+monthIdx,MONTHS_EN[monthIdx]);
  $('#fcLbl').hidden=monthIdx<6; repaint();
  if(selected) selectDistrict(selected); syncURL(); }
$('#time').addEventListener('input',e=>setMonth(e.target.value));
$('#play').addEventListener('click',()=>{
  if(playing){clearInterval(playing);playing=null;$('#play').innerHTML='&#9654;';return;}
  let i=0; setMonth(0); $('#play').innerHTML='&#10074;&#10074;';
  playing=setInterval(()=>{i++; if(i>8){clearInterval(playing);playing=null;$('#play').innerHTML='&#9654;';return;} setMonth(i);},700);});
function renderKPIs(){ const n=D.national;
  countUp($('#kHigh'),n.high_sep,900); countUp($('#kNow'),Math.round(n.risk_now),900);
  countUp($('#kSep'),Math.round(n.risk_sep),1200);
  $('#kpiExtra').innerHTML=`<small>${t('kR','model vs independent index')} r=${D.meta.validation_r_staple}
   · ${t('kSrc','synthetic challenge data')}</small>`;}
$('#kMore').addEventListener('click',()=>$('#kpiExtra').hidden=!$('#kpiExtra').hidden);
```
Call `renderKPIs(); setMonth(5);` inside `boot()` after `renderWatch()`. Add month names to i18n en/sn/nd as keys `m0..m8` (en: January…September; sn: Ndira, Kukadzi, Kurume, Kubvumbi, Chivabvu, Chikumi, Chikunguru, Nyamavhuvhu, Gunyana; nd: uZibandlela, uNhlolanja, uMbimbitho, uMabasa, uNkwenkwezi, uNhlangula, uNtulikazi, uNcwabakazi, uMpandula).

- [ ] **Step 2: Verify** — serve; play button sweeps Jan→Sep in ~6s, polygons visibly redden into September, "forecast" chip appears from July, KPIs count up on load.

- [ ] **Step 3: Commit**

```bash
git add app/cockpit.js app/i18n.js && git commit -m "feat: season time slider with play animation and animated KPIs"
```

---

### Task 9: Planning Mode

**Files:**
- Modify: `app/cockpit.js` (insert above boot)

- [ ] **Step 1: Port planner math.** From `/tmp/old-index.html` lines 551–572, port `buysRanked` construction and the support-effect math EXACTLY (it reads `d.support.reduction` / `d.support.supported_sep` exported by the engine). Then wire (complete code):

```js
// ---- planning mode ----
const buysRanked=[...D.districts].sort((a,b)=>b.support.reduction-a.support.reduction);
let supportedSet=new Set();
function updatePlanner(n){ supportN=n; supportedSet=new Set(buysRanked.slice(0,n).map(d=>d.district));
  $('#pn').textContent=n;
  const kept=buysRanked.slice(0,n).filter(d=>riskAt(d,8)>=66&&d.support.supported_sep<66).length;
  const saved=buysRanked.slice(0,n).reduce((s,d)=>s+d.support.reduction,0);
  const natSep=Math.round(D.national.risk_sep-(saved/D.national.n_districts));
  $('#plKept').textContent=kept; $('#plSaved').textContent=Math.round(saved);
  $('#plSep').textContent=natSep; renderBuys(); paintBuys(); syncURL(); }
function renderBuys(){ $('#buys').innerHTML=buysRanked.slice(0,10).map((d,i)=>{
  const on=supportedSet.has(d.district);
  return `<li class="row ${on?'hot':''}" data-d="${d.district}">
    <span class="buy-badge">${i+1}</span><div><b>${d.district}</b><br><small>${d.province}</small></div>
    <small>−${d.support.reduction.toFixed(1)}</small></li>`;}).join('');
  $$('#buys .row').forEach(r=>r.addEventListener('click',()=>selectDistrict(r.dataset.d)));}
function paintBuys(){ Object.entries(polyByDistrict).forEach(([n,ly])=>{
    if(planMode&&supportedSet.has(n)) ly.setStyle({weight:4,color:'#D89B2E',dashArray:'4'});
    else geoLayer.resetStyle(ly), ly.setStyle({fillColor:col(riskAt(byName[n],monthIdx))});});
  Object.entries(urbanMarkers).forEach(([n,mk])=>mk.setStyle(
    planMode&&supportedSet.has(n)?{color:'#D89B2E',weight:4}:{color:'#7d7668',weight:1.5}));}
$('#plRange').addEventListener('input',e=>updatePlanner(+e.target.value));
$('#planToggle').addEventListener('change',e=>{ planMode=e.target.checked;
  document.body.classList.toggle('plan',planMode);
  $('#watchList').hidden=planMode; $('#tabWatch').parentElement.hidden=planMode;
  $('#askPane').hidden=true; $('#plannerPane').hidden=!planMode;
  if(planMode){ setMonth(8); updatePlanner(supportN); } else { setMonth(5); paintBuys(); }
  syncURL(); });
```

- [ ] **Step 2: Verify** — serve; flip Planning Mode: theme darkens ≈0.4s, slider jumps to September, dragging the range slider makes amber-dashed districts appear on the map ranked 1–10, the three KPIs move, flipping back restores daylight + June.

- [ ] **Step 3: Commit**

```bash
git add app/cockpit.js && git commit -m "feat: planning mode - war-room theme flip with live best-buy map highlighting"
```

---

### Task 10: Ask-Hozi tab, Story panel, URL state, language wiring

**Files:**
- Modify: `app/cockpit.js`, `app/i18n.js`

- [ ] **Step 1: Ask-Hozi.** Port `dinfo, fmtD, respond, ask, renderTalk` + chip logic verbatim from `/tmp/old-index.html` lines 466–525, adapting only DOM ids (`#chat`, `#chips`, `#askForm`, `#askIn`). Tabs:

```js
$('#tabWatch').addEventListener('click',()=>{tab('watch')});
$('#tabAsk').addEventListener('click',()=>{tab('ask')});
function tab(w){ $('#tabWatch').classList.toggle('on',w==='watch');
  $('#tabAsk').classList.toggle('on',w==='ask');
  $('#watchList').hidden=w!=='watch'; $('#askPane').hidden=w!=='ask'; }
```

- [ ] **Step 2: Story panel.** Port the hero paragraph, how-it-works bullets and honesty panel text from the old page's HTML into i18n-keyed strings (`storyHero`, `storyHow`, `storyHonest*` — en from old markup, sn/nd from existing dict where present, drafts otherwise) and render into `#storyBody`:

```js
$('#storyTab').addEventListener('click',()=>{$('#storyPanel').hidden=false; renderStory();});
$('#infoBtn').addEventListener('click',()=>{$('#storyPanel').hidden=false; renderStory();});
$('#storyClose').addEventListener('click',()=>$('#storyPanel').hidden=true);
function renderStory(){ $('#storyBody').innerHTML=
  `<h1>${t('h0','See the hunger coming — and act in time.')}</h1>
   <p>${t('storyHero','')}</p><h3>${t('howT','How it works')}</h3>${t('storyHow','')}
   <h3>${t('honestT',"How it works & what it can't do (honesty first)")}</h3>${t('storyHonest','')}`;}
```

- [ ] **Step 3: URL state + language** (replace the `syncURL` stub; complete code):

```js
function syncURL(){ const p=new URLSearchParams();
  if(monthIdx!==5)p.set('month',monthIdx); if(selected)p.set('district',selected);
  if(planMode)p.set('mode','plan'); if(window.HOZI_LANG!=='en')p.set('lang',window.HOZI_LANG);
  history.replaceState(null,'','?'+p.toString()); }
function applyLang(l){ window.HOZI_LANG=l; localStorage.setItem('hozi-lang',l);
  $$('.lng button').forEach(b=>b.classList.toggle('on',b.dataset.lang===l));
  document.documentElement.lang=l;
  // re-render every translated surface:
  $('#tbSub').textContent=t('mast','National Food-Security Foresight Engine');
  $('#planLabel').textContent=t('planMode','Planning Mode');
  $('#storyTab').textContent=t('story','The Story');
  $('#legTitle').textContent=t('legendTitle','Staple food-security risk');
  $('#legNo').textContent=t('legendNo','no data yet');
  $('#tabWatch').textContent=t('watchTab','Watch'); $('#tabAsk').textContent=t('askTab','Ask Hozi');
  $('#kHighLbl').textContent=t('kHigh','of 20 districts heading into HIGH risk by September');
  renderKPIs(); renderWatch(); setMonth(monthIdx);
  if(selected)selectDistrict(selected); if(planMode)updatePlanner(supportN);
  if(!$('#storyPanel').hidden)renderStory(); syncURL(); }
$$('.lng button').forEach(b=>b.addEventListener('click',()=>applyLang(b.dataset.lang)));
function readURL(){ const p=new URLSearchParams(location.search);
  const lang=p.get('lang')||localStorage.getItem('hozi-lang')||'en';
  applyLang(['en','sn','nd'].includes(lang)?lang:'en');
  if(p.get('month'))setMonth(p.get('month'));
  if(p.get('mode')==='plan'){$('#planToggle').checked=true;$('#planToggle').dispatchEvent(new Event('change'));}
  if(p.get('district')&&byName[p.get('district')])selectDistrict(p.get('district')); }
```
Call `readURL()` at the end of `boot()`.

- [ ] **Step 4: Verify** — `node --check app/cockpit.js`; serve; test: `http://localhost:8000/?month=8&district=Mazowe&lang=sn` opens September, Mazowe drill-down, chiShona UI; switching to isiNdebele re-labels everything; Ask-Hozi answers "Mazowe?" with district figures; story panel opens from tab and ⓘ.

- [ ] **Step 5: Commit**

```bash
git add app/cockpit.js app/i18n.js
git commit -m "feat: ask-hozi tab, story panel, shareable URL state, 3-language wiring"
```

---

### Task 11: Pitch defence doc

**Files:**
- Create: `docs/PITCH-DEFENCE.md`

- [ ] **Step 1: Write the doc.** Sections (each: the judge's question, a 30-second spoken answer, one-line backup fact):
1. *"How do live data feeds plug in?"* — the data-contract answer (engine reads a fixed table of district/month signals; a scheduled n8n job fills the same columns from TAMSAT/CHIRPS/NASA APIs weekly and re-runs the engine; the model doesn't change. "We validated the brain first; plumbing is the cheap part.")
2. *"It's synthetic data — why should we trust it?"* — honesty framing: prototype proves the decision experience + transparent method; r=0.81 is an internal consistency check, not outcome validation; the funded path is Fork A training on ZimVAC/IPC labels already indexed in `docs/DATA-SOURCES-forkA.md` with a real label seed in `data/outcome_labels_2025_zimlac.csv`.
3. *"What does r = 0.81 actually mean?"* — the weighting reproduces the dataset's own risk band; states plainly what it is NOT.
4. *"Which feed is hardest to get?"* — ministry data (pests/irrigation): a partnership, not an API — exactly what POTRAZ/grant unlock. Turn the weakness into the ask.
5. *"Why no machine learning?"* — deliberate: auditable math where trust matters, AI only for language; Fork A upgrade path exists in `engine/train.py` with held-out district validation.
6. *"How is this different from HungerMap/FEWS NET?"* — district-level, prescriptive (Response Planner), sovereign, local-language; we don't out-monitor them, we own the planning lane.
7. *"Who pays after the prize?"* — open-core: government adoption + NGO programmes + Strategy innovation funds; n8n keeps running costs tiny; Curious Inq delivers.
8. *"What if the forecast is wrong?"* — widening confidence bands, honesty panel, human-in-the-loop; decision-support, never an oracle; it stretches budgets, never sets them.

Write full prose for each answer (30-second spoken length, plain English, no jargon). End with a "One-liners to land" list: the signature lines ("Fill the granary before the drought", "We validated the brain first — plumbing is the cheap part", "Prediction is a crowded field; prescription is not").

- [ ] **Step 2: Commit**

```bash
git add docs/PITCH-DEFENCE.md && git commit -m "docs: add pitch defence Q&A (separate from demo script)"
```

---

### Task 12: Final verification sweep

- [ ] **Step 1: Automated checks**

```bash
node --check app/cockpit.js && node --check app/i18n.js && node --check app/name-map.js && node scripts/check-app.mjs
```
Expected: all pass.

- [ ] **Step 2: Manual checklist** (serve with `python -m http.server 8000 --directory app`):
- [ ] Cold load: skeletons appear then clear; no console errors; national picture readable in <30s.
- [ ] All 60 polygons render; 16 colored, 44 grey with honest tooltip; 4 urban dots colored.
- [ ] Play animation smooth Jan→Sep; forecast chip from July.
- [ ] Drill-down: fly-to + sparkline + drivers + source line; close restores national frame.
- [ ] Planning Mode: dark flip, September jump, live best-buys with amber outlines, KPIs move, exit restores.
- [ ] Languages: en/sn/nd switch every visible label; persists on reload.
- [ ] Deep link `?month=8&district=Mazowe&mode=plan&lang=nd` reproduces the exact view.
- [ ] Offline test: stop network (or block cartocdn in devtools) → polygons + all UI still work on cream background.
- [ ] Rename `app/districts.geo.js` temporarily → app falls back to dot map, no blank screen; rename back.

- [ ] **Step 3: Update README screenshot note + commit anything outstanding.** Retake `docs/screenshot.jpg` later with Nash (design eye); add a line to README Quick start that the app is now a full-screen cockpit. Commit:

```bash
git add -u && git commit -m "chore: final cockpit verification fixes"
```

---

## Self-review notes (done at plan time)

- **Spec coverage:** cockpit layout (T5–6), watch/hover/drill (T7), slider/KPIs (T8), Planning Mode (T9), story tab + 3 languages + URL state (T10, T4), 60-district honesty (T2–3, T6), fallback + skeletons (T5–6), pitch defence (T11), engine untouched (no engine tasks). Spec said "CDN with SRI" for Leaflet; changed to vendored local files because the spec's own success criterion 5 requires offline operation — improvement, note for Nash.
- **Type consistency:** `riskAt(d,i)`, `col(v)`, `byName`, `polyByDistrict`, `urbanMarkers`, `syncURL()` used identically across tasks; planner uses engine-exported `support.reduction`/`support.supported_sep` only.
- **Ports are line-anchored** to `git show HEAD:app/index.html` so no logic is re-invented.
