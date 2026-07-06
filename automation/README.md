# automation/ — Layer 0: n8n Workflows

This directory contains the n8n automation workflows that implement **Layer 0** of the Hozi architecture: scheduled data ingest, engine trigger, threshold check, and the two-way WhatsApp officer channel. See [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for the full system design.

## Workflows in this directory

| File | Role | Trigger | Status |
|---|---|---|---|
| `hozi-pipeline.workflow.json` | Daily CHIRPS ingest → engine run → HIGH-band check → alert | Schedule (cron `0 6 * * *`) | Import-ready; first live run pending VPS |
| `Hozi-WhatsApp-Bot.n8n.json` | **Inbound** officer channel: officer texts a district name → live brief, deadline, data, cost | Incoming WhatsApp message | Import-ready; logic tested against live app data |
| `Hozi-WhatsApp-Alert.n8n.json` | **Outbound** push: daily HIGH-band check → WhatsApp alert to the officer | Schedule (cron `0 6 * * *`) | Import-ready; logic tested against live app data |

Setup for the two WhatsApp workflows (free-tier Meta Cloud API + n8n, no coding) is in **[WHATSAPP-BOT-SETUP.md](WHATSAPP-BOT-SETUP.md)**. Both WhatsApp workflows read the **live** `projections.js` / `briefs.js` served by the public app, so the bot and the map always show the same numbers. No secrets are stored in any workflow file — credentials are configured in n8n at import.

---

## What this workflow is

`hozi-pipeline.workflow.json` is an import-ready n8n workflow export. It is the operational nerve system that runs Hozi without manual intervention:

> CHIRPS rainfall CSV pulled from HDX → engine.py recomputes district risk → districts projected High band are flagged → alert dispatched to district officers.

This is Layer 0 as designed in the architecture. The workflow is authored, structurally validated, and import-ready. First live execution and screenshot are scheduled before submission (see Evidence Status below).

---

## Node-by-Node Table

| # | Node name | Type | What it does | Live vs stubbed |
|---|---|---|---|---|
| 1 | **Schedule Trigger** | `n8n-nodes-base.scheduleTrigger` | Fires daily at 06:00 (cron `0 6 * * *`). Starts the full pipeline automatically. | Live — standard cron trigger, no credentials needed. |
| 2 | **Download CHIRPS Rainfall CSV** | `n8n-nodes-base.httpRequest` | GET request to the HDX/WFP CHIRPS resource URL for Zimbabwe district rainfall (`zwe-rainfall-adm2-full.csv`). Returns CSV text. | Stubbed URL — the HDX dataset page is `https://data.humdata.org/dataset/zimbabwe-rainfall-subnational-chirps/resource/zwe-rainfall-adm2-full.csv`. **At import time, confirm the direct resource download link** from the HDX dataset page and update the URL field. Source documented in `docs/DATASET-STATEMENT.md`. |
| 3 | **Write CSV to data/raw** | `n8n-nodes-base.readWriteFile` (write) | Writes the downloaded CSV to `data/raw/zwe-rainfall-adm2-full.csv` under the repo root. Path is parameterised via the `HOZI_REPO_ROOT` environment variable. | Live once `HOZI_REPO_ROOT` is set on the VPS. Windows path example: `C:\Users\...\Hozi`. Linux VPS example: `/opt/hozi`. |
| 4 | **Run Engine** | `n8n-nodes-base.executeCommand` | Runs `python engine/engine.py` from the repo root. Writes `data/projections.json` and `app/projections.json`. | Live once Python 3.12+ is on PATH. On Linux use `python3` if `python` is not aliased. |
| 5 | **Read Projections JSON** | `n8n-nodes-base.readWriteFile` (read) | Reads `data/projections.json` written by the engine. | Live — reads a local file. |
| 6 | **Parse High-Band Districts** | `n8n-nodes-base.code` (JS) | Parses `projections.json`, filters the `watch` array for entries where `band_sep === "High"` (projected September risk >= 66, as defined in `engine/engine.py` `band()`). Formats a human-readable multi-district alert text including district name, province, projected score, and a deep-link to the app. | Live JS logic — no external calls. App URL is parameterised via the `HOZI_APP_URL` environment variable (default placeholder shown in code). |
| 7 | **Any High Districts?** | `n8n-nodes-base.if` | Checks `highCount > 0`. True branch → alert. False branch → pipeline ends silently (no alert needed). | Live — pure logic. |
| 8 | **Send Alert Email** | `n8n-nodes-base.emailSend` | Sends the formatted alert text via SMTP to the configured district officer address. **Demo channel.** The pilot delivery channel for district officers is WhatsApp Business API (see below). | Stubbed — SMTP credential must be configured at import. `fromEmail` and `toEmail` are placeholders. |

### HDX URL note

The documented source for `zwe-rainfall-adm2-full.csv` is HDX/WFP (Humanitarian Data Exchange). The URL in node 2 targets the expected resource path on the HDX CHIRPS Zimbabwe dataset. HDX resource URLs can change when datasets are updated; **verify the direct download URL on the HDX dataset page before first live execution** and update the HTTP Request node. The dataset and file name are documented in `docs/DATASET-STATEMENT.md`.

### WhatsApp Business API (pilot channel — now built)

Email (node 8) is the demo alert channel for this pipeline. The pilot channel designed for field district officers is the **WhatsApp Business API**: officers receive a brief alert on a basic phone without needing a browser. This channel is **no longer just a design note — it is built as two import-ready workflows in this directory:**

- **`Hozi-WhatsApp-Alert.n8n.json`** — the outbound push. It performs the same HIGH-band check as this pipeline (nodes 6–7) and dispatches the alert over the WhatsApp Business API using a `whatsApp` send node with Meta credentials configured in n8n (never stored in the JSON). To route *this* pipeline through WhatsApp instead of email, swap node 8 (`emailSend`) for that workflow's `Send WhatsApp Alert` node — the alert text from node 6 is channel-agnostic and works for both.
- **`Hozi-WhatsApp-Bot.n8n.json`** — the inbound side the pipeline alone does not cover: an officer texts a district name and receives the live brief, decision deadline, data check, or cost, read straight from the app's `projections.js`/`briefs.js`.

Setup for both (free-tier Meta Cloud API + n8n, no coding) is in **[WHATSAPP-BOT-SETUP.md](WHATSAPP-BOT-SETUP.md)**. Note the platform rule documented there: business-initiated (cold) WhatsApp messages must use a pre-approved message template; free text is allowed only within 24 hours of the officer's last message.

---

## How to run locally

### Prerequisites

- Node.js >= 18 (for `npx n8n`)
- Python 3.12+ with engine dependencies (`pip install -r requirements.txt` from repo root)
- An SMTP server or mail provider (for the alert email node)

### Step 1 — Start n8n

```bash
npx n8n
```

n8n will open at `http://localhost:5678`. Create an account on first run (local credentials only).

### Step 2 — Import the workflow

**Option A — GUI (recommended):**
1. In the n8n sidebar, go to **Workflows** → **Import from file**.
2. Select `automation/hozi-pipeline.workflow.json`.
3. The workflow opens with all 8 nodes wired.

**Option B — CLI:**
```bash
n8n import:workflow --input=automation/hozi-pipeline.workflow.json
```

### Step 3 — Set environment variables

In the n8n instance or your shell before starting n8n:

```bash
# Repo root (no trailing slash)
export HOZI_REPO_ROOT="/path/to/Hozi"

# App URL for deep-links in alert text
export HOZI_APP_URL="https://YOUR-GITHUB-PAGES-URL"
```

On Windows (PowerShell):
```powershell
$env:HOZI_REPO_ROOT = "C:\Users\MSI\Documents\CLIENTS CURIOUS INQ\P\POTRAZ\Hozi"
$env:HOZI_APP_URL = "https://YOUR-GITHUB-PAGES-URL"
```

### Step 4 — Configure the SMTP credential

1. In n8n, go to **Credentials** → **Add credential** → **SMTP**.
2. Name it `Hozi SMTP (configure at import)`.
3. Enter your mail server host, port, username, and password.
4. In node 8 (Send Alert Email), select this credential.

**No credentials are stored in `hozi-pipeline.workflow.json`.** The JSON contains only placeholder strings.

### Step 5 — Update file paths

In nodes 3 and 5, confirm the `fileName` expressions reference `HOZI_REPO_ROOT` correctly. If you are not using environment variables, you can hard-code the absolute path in those fields (e.g. `/opt/hozi/data/raw/zwe-rainfall-adm2-full.csv`).

### Step 6 — Confirm the HDX URL

In node 2 (Download CHIRPS Rainfall CSV), verify the URL returns the CSV file directly. If HDX has updated their resource URL, update the `url` field to the current direct download link from the HDX dataset page.

### Step 7 — Execute once manually

Click **Execute Workflow** (the play button at the top of the workflow canvas). Watch each node turn green. After node 4 completes, `data/projections.json` will be updated. After node 6, check the output panel to see the parsed high-band district list and alert text. If any High districts exist, node 8 will send the alert email.

---

## Evidence status

> Workflow JSON authored and validated structurally; first live execution and screenshot scheduled before submission.

Screenshot placeholder path: `automation/execution-log.png`

Structural validation run:
```bash
python -c "import json; json.load(open('automation/hozi-pipeline.workflow.json')); print('valid JSON')"
```

---

## Security note

**No credentials, API keys, or secrets are stored in `hozi-pipeline.workflow.json`.** Every credential-dependent field contains a `PLACEHOLDER` string. Credentials are configured in the n8n credential store (encrypted at rest by n8n) after import.

The n8n instance on the pilot VPS must be placed behind authentication (n8n's built-in auth or a reverse proxy with password protection). Do not expose the n8n admin interface to the public internet. See [docs/RISK-COMPLIANCE.md](../docs/RISK-COMPLIANCE.md) for the full security and compliance posture.

The `HOZI_APP_URL` and `HOZI_REPO_ROOT` values are operational configuration, not secrets, and can be set as plain environment variables.
