# GPRO Strategy Tool

Made with ❤ by Tushant Sharma

> A Tampermonkey userscript that acts as your personal race engineer for [Grand Prix Racing Online](https://www.gpro.net). It runs directly on gpro.net and gives you data-driven recommendations for every decision you make during a race weekend — tyre strategy, car setup, fuel loads, car upgrades, and more.

If you've ever stared at the tyre supplier page wondering which compound to pick, or nervously clicked "Start Q1" without knowing whether your setup is right — this tool is for you.

---

## Why This Exists

GPRO gives you raw data. This tool turns it into **decisions**.

- **No API token needed.** Everything is read off GPRO's own pages — the page you're on, or a copy captured when you (or the tool, in the background) last loaded that page.
- **Stop second-guessing.** Every recommendation shows *which model produced it* (per-track formulas, calibrated data, or custom analysis) so you know exactly how much to trust it.
- **Get answers fast.** One floating panel on every page — no tab-switching, no spreadsheets, no copy-pasting between tools.

---

## Features

### Race Weekend

| Page | What You Get |
|------|-------------|
| **Dashboard** | Live data-freshness dashboard, one-click "Update All" |
| **Q1 Advisor** | Car setup values, tyre strategy, weather forecast, rain qualifying plan |
| **Q2 Advisor** | Same as Q1, plus first-stint fuel recommendation for the race |
| **Race Advisor** | Full race strategy — fuel plan, pit laps, wet/rain plans, driver risk analysis, PHA comparison |

### Car & Staff

| Page | What You Get |
|------|-------------|
| **Car Advisor** | All 11 parts with wear predictions, upgrade/replace/downgrade recommendations, multi-race wear projection, budget-aware sequencing |
| **Staff Advisor** | Staff skill overview, training priorities, facility levels vs league targets |

### Season & Strategy

| Feature | What You Get |
|---------|-------------|
| **Season Overview** | All 17 races with visual intensity bars for tyre wear, fuel, and track wear |
| **Sponsor Overview** | Negotiation answer advice, car spot status, active negotiations |
| **Driver & TD Market** | Available drivers/TDs with value scoring and league-specific attribute priorities |
| **Boost Lap Planner** | Suggested boost lap placement with estimated fuel cost per track |

### Under the Hood

- **Per-track formula integration** — setup, tyre wear, stop counts, and pit times derived from verified internal formulas
- **Interactive weather toggles** — change dry/wet conditions and see setup + tyre recommendations recalculate instantly
- **Live session detection** — auto-detects wet/dry from DOM weather icons, respects your manual overrides
- **Strategy confidence score** — tells you how confident the tool is (30–95%) based on driver stats, car condition, and race conditions
- **Background data capture** — silently fetches driver, track, supplier, and staff pages in the background to keep your cache fresh
- **Cross-checks everywhere** — when per-track and calibrated data disagree, both numbers are shown so you can judge for yourself
- **Multi-race wear planner** — projects car wear forward across upcoming races to plan ahead

---

## Installation

You need [Tampermonkey](https://www.tampermonkey.net/) (or a compatible userscript manager) installed in your browser.

1. Open https://raw.githubusercontent.com/Jadax/gpro-advisor/main/GPRO_Strategy_Tool.user.js — Tampermonkey shows its install page; click **Install**.
2. That's it. `gpro-data.js` loads from the same GitHub repo, and Tampermonkey keeps the script up to date from there (`@updateURL`). To pull a new version immediately: Tampermonkey menu → **Check for userscript updates**.

The copilot's run log starts with the installed version ("▶ Run started … (script v6.39.0)") so you can see which version ran.

---

## Getting Started

1. Navigate to [gpro.net](https://www.gpro.net) and log in
2. Visit the **Dashboard** (gpro.asp) — it captures your driver, track, suppliers, staff and testing pages in the background

That's it. The floating panel will appear on every game page with page-specific recommendations.

### Menu Commands

Right-click the Tampermonkey icon or use the Tampermonkey menu:

- **Settings** — Driver-offer aggressiveness
- **Clear Cache** — Wipe all cached data and reload
- **Season Overview** — View all 17 races with track profiles and intensity bars
- **Sponsor Overview** — View sponsor negotiations and get answer advice
- **Driver & TD Market** — Browse available drivers and technical directors

---

## Autopilot (GPRO pill, bottom-left, or Alt+A)

Every switch starts **off**. Turn on the master switch plus the steps you want, press **Preview** first (it fills each page's form in a hidden frame and reports what it would do — nothing is submitted), then **Run now** or let it run in the background (at most every 20 minutes, never while you're on one of the pages it fills).

| Step | What it does |
|---|---|
| Car parts | Replaces/upgrades/downgrades **only** a part the advisor says will break this race |
| Staff training | Trains the first skill below GPRO's cap (Concentration → Stress Handling → Efficiency) |
| Facility upgrades | Raises facilities to your league targets, in order, while cash stays above the reserve |
| Driver training | Books the advisor's top training recommendation |
| Testing | Drives test stints for car character points every race the cash and wear checks allow (a car level of testing points costs far less than a level of parts) |
| Sponsors | Answers waiting negotiation questions with the advisor's recommended reply, and starts a new negotiation (best-scored sponsor) while fewer than 2 are running and a car spot is free |
| Q1 | Drives the Q1 lap with the advisor's setup, tyre (Rain if wet, the race's dry compound if dry) and risk |
| Q2 | Drives Q2 with the setup, risk and start fuel |
| Race setup | Confirms setup, fuel per stop (planned around the start fuel Q2 locked in), boost laps and all risks — once, then leaves it alone |

- One run per race; nothing after qualifying closes; qualifies early to collect the early-qualifying bonus.
- Never spends below **$5M** cash. Testing never pushes a part past 95% by the end of the next race.
- Each race analysis is logged automatically (this season's races; older seasons are locked by GPRO unless unlocked with supporter credits). **Export data** downloads everything it has learned.
- **Fill this page's form** (in the pill) fills the page you're on without submitting — the manual way to use the same plan.

---

## How It Works

### Data Resolution

Every piece of data comes from GPRO's own pages:

1. **Live page parse** — reads the page you're on
2. **Captured copy** — the last time that page was read (by you visiting it, or the dashboard's background capture)

### Internal Formulas

The tool integrates verified formulas for:

- **Tyre stop counts** — exponential decay across 8 factors (track wear, temperature, supplier, compound, suspension, aggression, experience, weight)
- **Fuel consumption** — linear model across 6 driver + car attributes
- **Car setup** — driver-aware values incorporating talent, car levels, wear, and weather
- **Pit times** — staff concentration/stress + TD experience + fuel load effects

When per-track data isn't available, the tool falls back to its own calibrated formulas. When both are available, **both numbers are shown** so you can see where they agree or disagree.

---

## Configuration

The tool mostly works out of the box. A few optional settings:

| Setting | Where | What It Does |
|---------|-------|-------------|
| **CTR (Clear Track Risk)** | Race Advisor | Set your driver's CTR value for risk calculations |
| **Wet/Dry overrides** | Q1/Q2 pages | Manually toggle session conditions when auto-detection is wrong |

---

## Known Quirks

- **Panel not showing up at all?** Check that Tampermonkey has "Allow access to file URLs" enabled (see Installation) — this is the #1 cause, and it fails silently.
- **Tyre stop counts may differ from other tools.** Per-track formulas tend to suggest fewer stops than simpler models for dry compounds. Both numbers are shown in the UI. Rain compound stop counts match closely.
- **Part wear predictions may run ~25–30% higher than expected.** This is a known calibration difference. The tool shows both per-track and own-calibrated wear predictions side by side.
- **The API call counter doesn't auto-reset.** GPRO doesn't provide a reliable way to detect a new race without spending an API request. Reset it manually via the Tampermonkey menu.

---

## Project Structure

```
GPRO Tool/
├── GPRO_Strategy_Tool.user.js   # Main script — all logic, UI, and helpers
├── gpro-data.js                  # Season data, track profiles, formulas, calibration
├── gpro-public-api.yml           # GPRO's official OpenAPI spec (reference only)
├── docs/
│   └── page-structures.md        # Confirmed DOM selectors for game pages (reference only)
├── CLAUDE.md                     # House rules + durable project knowledge for AI-assisted development
└── README.md
```

---

## License

This is a free, open-source project. Use it, modify it, share it — just don't sell it.

---

Made with ❤ by Tushant Sharma
