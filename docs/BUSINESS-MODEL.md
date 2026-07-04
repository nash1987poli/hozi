# Hozi — Business Model One-Pager
### AI4I 2026 · Annex A Template · Rubric C4

---

## Problem

Zimbabwe's food-security warnings arrive too late and from outside the country. By the time a seasonal
report confirms a drought, the window for early action has closed. Planners then face a second problem:
with limited budgets and many districts in distress simultaneously, there is no quick, shared way to see
*where* a given unit of effort protects the most people. The result is slow, mis-targeted response —
measurable in hungry families and wasted resources.

---

## Primary user

- ZimVAC field members and secretariat staff
- Ministry of Agriculture / Agritex district and provincial planners
- District development officers
- Department of Civil Protection duty officers

---

## Beneficiary

Rural populations in Zimbabwe's drought-prone districts — particularly the most food-insecure
households in Matabeleland, Masvingo, Mashonaland East, and Manicaland provinces — who benefit
from earlier, better-targeted anticipatory action.

---

## Customer or payer

**Pilot phase:** Development partner programme funding. Natural candidates include WFP Zimbabwe
resilience programmes, FAO country office, and UNDP. Under this model a development partner
covers operating costs while the proposed government institution (ZimVAC secretariat / Ministry
of Agriculture) operates the system and retains full data sovereignty. No partnership commitment is
claimed here; these are the logical candidates given their existing food-security mandates in Zimbabwe.

**Scale phase:** Per-domain institutional licensing. Each new module built on the same engine
infrastructure — e.g., a health outbreak module for the Ministry of Health and Child Care, or a
climate/disaster module for the Department of Civil Protection — becomes a separate institutional
customer. New revenue is unlocked without rebuilding the core platform. The open-source MIT engine
also positions Hozi for government adoption grants and innovation fund support under Zimbabwe's
National AI Strategy 2026–2030.

---

## Value proposition

1. **Earlier warning.** District-level risk forecasts 1–3 months ahead of the seasonal curve,
   generated from Zimbabwe's own institutional data (ZimVAC, CHIRPS, Agritex, IPC).
2. **Ranked response.** The Response Planner shows where a given support package protects the most
   people first — helping planners stretch limited budgets and defend their decisions.
3. **Local languages.** Playbooks and alert briefs in English, chiShona, and isiNdebele. Officers
   receive WhatsApp alerts on 2G with no app install required.
4. **Sovereign and open-source.** MIT-licensed, built in Zimbabwe, runs on Zimbabwe's data.
   No dependence on foreign agency access or proprietary data pipelines.

---

## Revenue or funding model

| Phase | Mechanism | Notes |
|---|---|---|
| Pilot (0–12 months) | Development partner programme grant covering operating costs | Government operates; partner funds |
| Scale (12+ months) | Institutional licence per domain module | Health, climate/disaster, water modules — each new domain is a new institutional customer on the same infrastructure |
| Long-term | Government line-item adoption + ZCHPC national hosting | Moves operating cost off grants and onto national AI Strategy budget lines |

The open-source engine lowers adoption barriers and supports trust-building with conservative
institutions. Curious Inq provides design, integration, and deployment expertise as the incubation
operator.

---

## Cost drivers

**Monthly operating costs — pilot configuration (approximately 20 districts):**

| Item | Est. monthly (US$) |
|---|---|
| VPS — n8n automation + Python engine (2 GB cloud server) | 20–40 |
| Static app hosting (GitHub Pages) | 0 |
| Claude API — reasoning, validation, playbook generation (~20 districts/month) | 30–80 |
| WhatsApp/SMS alert delivery (pilot volume) | 10–30 |
| Domain name + automated backups | 5 |
| **Total** | **65–155** |

**Budget envelope:**
- 3-month pilot: approximately US$200–500 infrastructure + field onboarding costs (device checks,
  printed one-pagers, one training session per district cluster).
- National scale: ZCHPC CCE hosting would replace the VPS, reducing cash cost — subject to a
  hosting arrangement being agreed. The system is containerised (no GPU required) and designed to
  run on existing national infrastructure without modification.

---

## Partnerships

**Institutional data sources (existing, no commercial arrangement required):**
- CHIRPS / TAMSAT — open satellite rainfall data (scheduled API pull)
- ZimVAC / IPC — ground-truth food-security outcome labels
- Agritex / Ministry of Agriculture — crop, pest, and input data
- Project Pangolin — national data platform; Hozi is designed to work as an analytics layer on top of it (integration agreement required; no arrangement is in place)

**Deployment and hosting candidates (not yet formalised):**
- ZCHPC CCE — national high-performance computing infrastructure for scale hosting
- ZimVAC secretariat — natural government operator for the food-security module

---

## Pilot market

One drought-prone district cluster in Zimbabwe, proposed as Matabeleland South (e.g., Beitbridge,
Gwanda, and Mangwe districts). Rationale: consistently high food-insecurity risk in ZimVAC data,
active ZimVAC/Agritex presence, Ndebele-language alignment with the isiNdebele playbook already
in the engine. Pilot user base: 10–20 district officers and ZimVAC/Agritex staff.

---

## Adoption risks

| Risk | Mitigation |
|---|---|
| Government procurement pace | Pilot via development partner funding avoids procurement; MOU is a milestone, not a pre-condition |
| Data-sharing agreements between ministries | Hozi reads open/public data (CHIRPS, IPC) first; ministry data added progressively with each agency's consent |
| Officer connectivity in the field | WhatsApp/SMS alerts function on 2G; no app install required; static web app is lightweight |
| Trust in model outputs | Honesty panel in the interface; advisory-only framing; human authority explicitly preserved; all scores are traceable arithmetic |
| Small team capacity | n8n automation keeps the pipeline running with minimal human intervention; open-source invites contributor growth |

---

## Success metrics

**30-day targets:**
- Judge feedback incorporated and documented
- Pilot MOU signed with at least one ZimVAC/ministry stakeholder (or formal expression of interest)
- Security and compliance checklist complete

**60-day targets:**
- Live pilot running in target district cluster
- Alert delivery rate to district officers tracked and reported
- Playbook usage and officer feedback collected

**90-day targets:**
- Warning lead-time measured against the ZimVAC seasonal assessment cycle (target: meaningful
  advance over seasonal report publication date)
- Districts covered by live data feeds documented
- Adoption case study drafted for scale proposal
- Refined model published with real ZimVAC/IPC training labels (Fork A path)

---

*Hozi is MIT-licensed, open-source, and built in Zimbabwe for Zimbabwe.*
*Operated by Curious Inq during incubation; designed for government handover at national scale.*
