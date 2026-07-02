# Hozi Cockpit UI — Design Spec

**Date:** 2026-07-02
**Decided with:** Nash (visual companion + terminal Q&A)
**Goal:** Transform the Hozi web app from a scrolling editorial page into a full-screen interactive
"decision cockpit" that outclasses WFP HungerMap's UX while keeping Hozi's warm editorial identity.

## Decisions made

| Question | Decision |
|---|---|
| Architecture | **A — Full Cockpit.** Map fills the screen; all UI floats over it. No scrolling page. |
| Story/honesty content | **Side-tab.** Collapsible "The Story" panel inside the cockpit. No intro sequence. |
| Map engine | **Leaflet (pinned CDN version)** with muted warm basemap tiles, pannable/zoomable. |
| District coverage | **All 60 real districts** from `ipc_zwe.geojson`; 20 modeled districts choropleth-colored, 40 unmodeled in quiet grey with "no data yet" tooltip. |
| Response Planner | **Planning Mode toggle** — full theme flip to dark war-room, live best-buy highlighting on map. |
| Languages | **EN / chiShona / isiNdebele** (isiNdebele drafted by AI, to be verified by native speaker before submission). |

## Layout (foresight mode — default)

Full-screen Leaflet map, Zimbabwe framed, warm/light basemap (Carto light tiles, CSS-tinted
toward Hozi cream `#F7F3EA`). Floating elements:

1. **Top bar** — Hozi logo + wordmark, subtitle "National Food-Security Foresight Engine";
   right side: language toggle (EN | chiShona | isiNdebele) and Planning Mode switch.
2. **Top-left KPI card** — headline: "19 of 20 districts heading into HIGH risk by September";
   beneath: national risk now (55) → September (75) with animated count-up. Expandable to show
   all four stats from the current stat strip (incl. r = 0.814 consistency check).
3. **Left panel — Districts to Watch** — ranked list (name, province, risk bar, score), synced
   with the map. Hover row ⇄ district glow; click ⇄ fly-to + drill-down.
4. **Right panel — District drill-down** — slides in on district click (map or list). Contents:
   trajectory sparkline Jan–Sep with widening confidence band (Jul–Sep dashed/forecast),
   driver breakdown bars (rain, vegetation, pests, irrigation, inputs), early-warning note,
   footer with data source + validity period. Close button returns to national view.
5. **Bottom-center — Time slider** — Jan → Sep with play button. Play animates months in
   sequence; polygons recolor per month; Jul–Sep zone visually marked as forecast. Month name
   displayed large next to slider.
6. **Story side-tab** — thin vertical tab on the left edge labeled "The Story". Opens a panel
   containing: hero narrative ("See the hunger coming — and act in time"), how-it-works summary,
   and the full honesty panel ("what it can't do"). An "ⓘ" icon in the top bar opens the same panel.
7. **Legend** — pinned bottom-right: risk color chips (lower → high) + grey "no data yet" chip.

## Planning Mode

Toggle in top bar. On activation:

1. Theme flips to dark war-room (`#16130F` base, amber `#D89B2E` accents) via a CSS class on
   the root; smooth ~400ms transition. Basemap tint darkens.
2. Time slider auto-jumps to September (projected worst month); slider remains usable.
3. Left panel is replaced by the Planner panel: "districts you can support this season"
   slider (0–20), and the three planner KPIs (districts kept out of high risk / national risk
   points removed / September national risk) with live count-up/down.
4. As the slider moves, best-buy districts (ranked by the existing intervention math in
   `projections.js`) highlight on the map with a glow outline and rank badges 1–10; the
   best-buys list shows name, province, and risk-points saved.
5. Toggling off restores foresight mode and prior month selection.

No engine changes: the planner reuses the intervention weights already exported to
`projections.json`.

## Interactions & state

- **Hover sync** (both directions) between list rows and polygons; tooltip on polygon hover:
  district, province, current risk, September projection (or "no data yet").
- **Zoom-to-district**: Leaflet `flyToBounds` on the polygon; drill-down opens.
- **URL state**: `?month=sep&district=mazowe&mode=plan&lang=nd` — read on load, updated via
  `history.replaceState`. Any view is shareable; browser back works for district open/close.
- **Animated counters** on all KPI numbers (requestAnimationFrame count-up).
- **Skeleton loaders** on panels until `projections.js` + geojson are parsed.
- **Fallback**: if the geojson fails to load or parse, the app falls back to the existing
  dot-marker map so it never renders broken. If basemap tiles fail (offline), polygons still
  render on the cream background — the app remains fully usable offline except tiles.

## Data flow

```
Datasets/02_agriculture_climate_market_signals.csv → engine/engine.py (UNCHANGED)
        → app/projections.js / projections.json (UNCHANGED format)
Datasets/ipc_zwe.geojson → copied to app/districts.geojson
app/name-map.js → hand-checked mapping: 20 modeled district names ↔ geojson `title` fields
app/index.html → reads projections + geojson + name map, renders cockpit
```

- Engine and its output format are untouched.
- Leaflet loaded from CDN with pinned version + SRI hash; no build tools; everything else
  stays vanilla HTML/CSS/JS in `app/index.html` (may split CSS/JS into `app/cockpit.css` /
  `app/cockpit.js` for maintainability — still zero build).

## Languages

All UI strings in one dictionary object keyed `en` / `sn` / `nd`. Existing EN + chiShona strings
carried over; isiNdebele drafted new and flagged in a code comment for native-speaker review.
Language choice persists in URL param and `localStorage`.

## Separate deliverable — Pitch defence doc

`docs/PITCH-DEFENCE.md`: judge-likely hard questions with crisp 30-second answers, including:
live-feed plug-in ("data contract" answer), synthetic vs real data, r = 0.81 meaning and limits,
hardest feed (ministry partnership → the ask), why not ML now (Fork A path), sustainability.
Explicitly NOT part of DEMO-SCRIPT.md.

## Out of scope

- Engine/model changes, train.py work, live API integrations.
- n8n automation, WhatsApp alerts, Ask-Hozi LLM features.
- Mobile-first layout (must be usable on a laptop for judging; graceful degradation only).

## Success criteria

1. Opens as a full-screen cockpit; a first-time viewer understands the national picture in
   under 30 seconds without scrolling.
2. Play button delivers the season animation smoothly (no jank on a mid-range laptop).
3. Planning Mode flip + live best-buy highlighting works end-to-end with existing data.
4. All 60 districts render as real polygons; the 20 modeled ones match engine output exactly.
5. Works offline except basemap tiles; no build step; `python -m http.server` still the only
   way needed to run it.
6. Three languages switchable at runtime.
