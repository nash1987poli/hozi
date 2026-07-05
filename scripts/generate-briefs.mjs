// Pre-generates per-district intervention playbooks with Claude.
// Usage:  node scripts/generate-briefs.mjs            (all 20 districts)
//         node scripts/generate-briefs.mjs Mazowe     (one district, for testing)
// Requires: scripts/anthropic-key.txt (git-ignored) containing only the API key.
// Output:  app/briefs.js  ->  window.HOZI_BRIEFS = { "<district>": {en:{...},sn:{...},nd:{...}} }
import { readFileSync, writeFileSync, existsSync } from "fs";

const KEY_FILE = "scripts/anthropic-key.txt";
if (!existsSync(KEY_FILE)) { console.error(`Missing ${KEY_FILE} — create it with only your Anthropic API key inside.`); process.exit(1); }
const API_KEY = readFileSync(KEY_FILE, "utf8").trim();
const MODEL = "claude-sonnet-4-6";

const load = (p) => { const window = {}; eval(readFileSync(p, "utf8")); return window; };
const HOZI = load("app/projections.js").HOZI;
const only = process.argv[2];
const districts = HOZI.districts.filter(d => !only || d.district === only);

// ---------------------------------------------------------------------------
// Load outcome_labels.csv and build a lookup: normalised-name -> {period, pct}
// Use the most recent period available per district (2020-10 > 2020-02 > 2019-06 > 2019-02).
// ---------------------------------------------------------------------------
const PERIOD_ORDER = ["2020-10", "2020-02", "2019-06", "2019-02"];

function normName(s) {
  return s.toLowerCase().replace(/[\s\-]/g, "");
}

// Alias map mirrors engine/train_real.py ALIAS logic plus name-map.js Chinhoyi->Makonde.
const ALIASES = {
  "chinhoyi": "makonde",
  "gokwe north": "gokwenorth",
  "gokwe south": "gokwesouth",
  "mhondoro ngezi": "mhondoro-ngezi",
  "uzumba maramba pfungwe": "uzumbamarambapfungwe",
};

function resolveNorm(districtName) {
  const n = normName(districtName);
  return ALIASES[n] || n;
}

const labelRaw = readFileSync("data/outcome_labels.csv", "utf8").trim().split("\n");
const labelHeader = labelRaw[0].split(","); // district,period,food_insecurity_pct
const labelRows = labelRaw.slice(1).map(line => {
  const [district, period, pct] = line.split(",");
  return { district: district.trim(), period: period.trim(), pct: parseFloat(pct) };
});

// Build best-period lookup per normalised district name.
const labelLookup = {};
for (const row of labelRows) {
  const key = normName(row.district);
  const existing = labelLookup[key];
  if (!existing || PERIOD_ORDER.indexOf(row.period) < PERIOD_ORDER.indexOf(existing.period)) {
    labelLookup[key] = { period: row.period, pct: row.pct, original: row.district };
  }
}

function getLabel(districtName) {
  const key = resolveNorm(districtName);
  return labelLookup[key] || null;
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
const SYSTEM = `You are Hozi, Zimbabwe's food-security foresight engine, drafting early-action
intervention briefs for government planners. Rules:
- Ground EVERY statement in the numbers provided. Never invent figures, places, or programmes.
- Map each action to a real Zimbabwean institution: Agritex, Ministry of Lands & Agriculture,
  DDF (District Development Fund), GMB (Grain Marketing Board), Ministry of Public Service,
  Labour & Social Welfare, ZINWA, Meteorological Services Department, Rural District Council.
- Tone: calm, specific, advisory. These are recommendations for human review — never orders.
- The engine runs on POTRAZ synthetic challenge data; briefs are illustrative of the production system.
Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"en":{"bullets":[{"dept":"...","action":"..."}],"note":"..."},
 "sn":{"bullets":[{"dept":"...","action":"..."}],"note":"..."},
 "nd":{"bullets":[{"dept":"...","action":"..."}],"note":"..."}}
- 3 to 5 bullets per language. "sn" = chiShona, "nd" = isiNdebele (translate the same content naturally).
- "note" = one honest sentence on urgency and what the forecast cannot know.`;

// ---------------------------------------------------------------------------
// Build per-district prompt, injecting the official IPC label block.
// ---------------------------------------------------------------------------
function districtPrompt(d) {
  const tl = d.timeline.map(x => `${x.m}: ${x.risk}${x.proj ? " (forecast)" : ""}`).join(", ");
  const dr = d.latest_drivers || {};
  const label = getLabel(d.district);

  let officialBlock;
  if (label) {
    officialBlock =
`OFFICIAL ASSESSMENT (ZimVAC/IPC, ${label.period}): ${label.pct}% of this district's population was classified in food crisis (IPC Phase 3+). Compare this with the model's current risk picture above. If they clearly disagree (e.g., low model risk but a high official crisis share, or vice versa), add a short warning in the "note" field: state the disagreement plainly, remind that the official assessment is dated ${label.period} and the model runs on the current demo dataset, and advise human review before acting. If they broadly agree, do not add a warning.`;
  } else {
    officialBlock =
`OFFICIAL ASSESSMENT: none available for this district in the loaded label set. State in the note that no official cross-check was possible.`;
  }

  return `District: ${d.district} (${d.province} province)
Risk timeline 0-100 (Jan-Sep 2026): ${tl}
Latest drivers: rainfall ${dr.rainfall_mm}mm/month (staples need ~100mm), vegetation index ${dr.ndvi} (healthy ~0.70), pest incidents ${dr.pest}, irrigation coverage ${dr.irrigation}%, input availability ${dr.inputs}/100.
Support-package effect if applied: September risk falls by ${d.support?.reduction ?? "n/a"} points to ${d.support?.supported_sep ?? "n/a"}.

${officialBlock}

Write the intervention brief.`;
}

// ---------------------------------------------------------------------------
// Claude call
// ---------------------------------------------------------------------------
async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 4000, system: SYSTEM,
      messages: [{ role: "user", content: prompt }] })
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  let text = data.content[0].text.trim();
  // Strip markdown fences if present
  text = text.replace(/^```(json)?[\r\n]*/,'').replace(/[\r\n]*```\s*$/,'').trim();
  // Attempt to find the outermost JSON object in case there is trailing text
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    text = text.slice(first, last + 1);
  }
  return text;
}

// ---------------------------------------------------------------------------
// Report matching stats
// ---------------------------------------------------------------------------
console.log("\n--- IPC label matching ---");
let matched = 0, unmatched = 0;
for (const d of HOZI.districts) {
  const lbl = getLabel(d.district);
  if (lbl) {
    console.log(`  ${d.district.padEnd(20)} -> ${lbl.original} (${lbl.period}, ${lbl.pct}%)`);
    matched++;
  } else {
    console.log(`  ${d.district.padEnd(20)} -> NO MATCH`);
    unmatched++;
  }
}
console.log(`  Matched: ${matched}/${HOZI.districts.length}  Unmatched: ${unmatched}\n`);

// ---------------------------------------------------------------------------
// Generate — load existing briefs so single-district retries preserve others.
// ---------------------------------------------------------------------------
const out = existsSync("app/briefs.js")
  ? load("app/briefs.js").HOZI_BRIEFS || {}
  : {};

for (const d of districts) {
  process.stdout.write(`${d.district} ... `);
  try {
    let text = await callClaude(districtPrompt(d));
    text = text.replace(/^```(json)?/,'').replace(/```$/,'').trim();
    out[d.district] = JSON.parse(text);
    console.log("ok");
  } catch (e) { console.log("FAILED:", e.message); }
}

writeFileSync("app/briefs.js",
  "// Pre-generated by Claude (" + MODEL + ") from engine data via scripts/generate-briefs.mjs\n" +
  "// TODO(native-speaker): verify sn/nd translations before submission.\n" +
  "window.HOZI_BRIEFS=" + JSON.stringify(out, null, 1) + ";\n");
console.log(`\nWrote app/briefs.js with ${Object.keys(out).length} district briefs.`);
