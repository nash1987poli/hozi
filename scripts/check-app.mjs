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
