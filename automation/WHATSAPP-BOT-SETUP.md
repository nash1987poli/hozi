# Hozi WhatsApp Bot — Setup Guide (no coding needed)

This turns `Hozi-WhatsApp-Bot.n8n.json` into a **real, working** WhatsApp bot. An officer
texts a district name; the bot fetches the **live Hozi data** and texts back the real brief.

Everything below uses **free tiers**. Budget ~45–60 minutes the first time.

---

## What you're building

```
Officer's phone  ──WhatsApp──►  Meta Cloud API  ──►  n8n (your flow)
                                                        │
                                        fetches LIVE data from your Hozi app
                                        (projections.js + briefs.js)
                                                        │
Officer's phone  ◄──WhatsApp──  Meta Cloud API  ◄──  real brief reply
```

The key point for judges: **the bot and the map read the same live files.** Text "Mazowe"
and the reply says "85 by September" — the exact number on the map. Tap the link in the
reply and it opens the map to Mazowe. One brain, two front doors.

---

## What you need (all free)

| Thing | Free tier | Link |
|---|---|---|
| **n8n** | n8n Cloud 14-day trial, OR self-host free forever | n8n.io |
| **Meta developer account** | Free | developers.facebook.com |
| **WhatsApp Cloud API** | Free test number + 1,000 conversations/month | via the Meta app below |

You do **not** need Wassenger, a paid number, or a business verification for the demo —
Meta gives you a free test sender number.

---

## Part A — Meta WhatsApp Cloud API (the phone side)

1. Go to **developers.facebook.com** → log in → **My Apps** → **Create App**.
2. Choose **"Other"** → **"Business"** → name it `Hozi`. Create.
3. On the app dashboard, find **WhatsApp** → click **Set up**.
4. You now have a **test sender number** and a **Phone number ID** (a long number).
   **Copy the Phone number ID** — you'll paste it into n8n later.
5. Under **API Setup**, copy the **temporary access token** (a long string). This is your
   send credential. (For the demo the 24-hour token is fine; for the pilot you generate a
   permanent one.)
6. Under **"To"**, add **your own phone number** as a test recipient and verify it with the
   code Meta sends you. (Test numbers can only message recipients you've added — that's fine
   for a demo.)

Keep this tab open — you'll come back for the webhook in Part C.

---

## Part B — Import the flow into n8n

1. Open n8n (Cloud or your self-hosted instance).
2. Top-right **⋯ menu → Import from File** → choose **`Hozi-WhatsApp-Bot.n8n.json`**.
3. The 7-node flow appears. Nothing is connected to your account yet — that's the next step.

### Set the two credentials

4. Click the **"Send WhatsApp Reply"** node → **Credential → Create New** →
   - Type: **WhatsApp API**
   - **Access Token**: paste the token from Part A step 5.
   - Save as **"Hozi WhatsApp Send"**.
5. In the **same node**, replace `WHATSAPP_PHONE_NUMBER_ID_PLACEHOLDER` in the
   **"Sender Phone Number (ID)"** field with the **Phone number ID** from Part A step 4.
6. Click the **"WhatsApp Trigger"** node → **Credential → Create New** →
   - Type: **WhatsApp Trigger API**
   - Fill the **App ID**, **App Secret** (from your Meta app → Settings → Basic) and a
     **Verify Token** you invent (any word, e.g. `hozi123`).
   - Save as **"Hozi WhatsApp Trigger"**.

---

## Part C — Connect the webhook (so Meta can reach n8n)

1. In the **WhatsApp Trigger** node, copy the **Production Webhook URL** n8n shows.
2. Back in the Meta app → **WhatsApp → Configuration → Webhook → Edit**:
   - **Callback URL**: paste the n8n webhook URL.
   - **Verify token**: the same word you invented in Part B step 6.
   - Click **Verify and save**.
3. Under **Webhook fields**, **Subscribe** to **`messages`**.

---

## Part D — Go live and test

1. In n8n, toggle the workflow **Active** (top-right).
2. From your phone, WhatsApp your Meta **test sender number** the word: **`Mazowe`**
3. Within a second or two you should get the real Hozi alert back.
4. Try: **`deadline Mazowe`**, **`data Gwanda`**, **`cost Beitbridge`**, or just **`hi`**.

**That's it — a real, functional bot reading your live app data.**

---

## For the pitch: how to demo the linkage in 20 seconds

1. Open the **map** on the projector — point to Mazowe at **85**.
2. On your phone, WhatsApp **"Mazowe"** to the bot — the reply says **"85 by September."**
3. Say: *"Same engine, same number — the map for planners, WhatsApp for the officer in the field."*
4. Tap the **link in the WhatsApp reply** → it opens the map to Mazowe. Loop closed.

Keep the **WhatsApp officer simulation** (the standalone HTML preview kept in the project prep
folder, also published as a shareable link) open as your backup — if venue wifi or the token
fails, the simulation shows the same experience with zero live risk.

---

## Part E — The outbound alert (Hozi texts the officer)

The file **`Hozi-WhatsApp-Alert.n8n.json`** is the **push** side: on a daily schedule it checks
the live data and, if any district is projected HIGH, it WhatsApps the officer first.

1. **Import** it the same way (Part B step 1–2).
2. It **reuses the same "Hozi WhatsApp Send" credential** and Phone Number ID from Part B —
   no new credential needed.
3. Set the officer's number: in n8n **Settings → Variables** (or environment), add
   `HOZI_OFFICER_NUMBER` = the recipient in E.164 digits, e.g. `263771234567`.
   (Or edit the placeholder inside the "Find HIGH Districts + Build Alert" node.)
4. Toggle **Active**. To demo without waiting for 6am, open the workflow and click
   **Execute Workflow** — it sends immediately.

### One honest WhatsApp rule you must know
WhatsApp lets a business send **free text only within 24 hours** of the user's last message.
A **cold** proactive alert (outside that window) must use a **pre-approved message template**.

- **For the demo:** message the bot first (you'll have done this testing Part D). That opens the
  24-hour window, so the alert's free text sends fine. This is a legitimate demo path.
- **For the pilot:** create a template named e.g. `hozi_alert` in Meta → WhatsApp → Message
  Templates, get it approved (usually minutes–hours), and switch the send node's operation to
  **"send template"**. Then alerts reach officers anytime, cold.

Say this plainly if a judge asks — it shows you understand the real platform, not just a demo.

---

## Honest notes (keep these true on stage)

- **Test number limits:** the free Meta number only messages recipients you pre-add, and the
  24-hour token expires. Both are lifted in the pilot with a permanent token and a verified
  business number — say so if asked.
- **This is the inbound (pull) bot.** The **outbound alert** — Hozi texting an officer the
  moment a district crosses HIGH — is the scheduled workflow already in
  `Hozi/automation/hozi-pipeline.workflow.json` (currently wired to email; the same GMB/alert
  branch swaps to this WhatsApp send node for the pilot).
- **No secrets in the files.** The workflow JSON stores only placeholders; your token lives
  in the n8n credential store, never in the file.
```
