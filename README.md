# GPRO Strategy Tool

Made with ❤ by Tushant Sharma

> A Tampermonkey userscript that acts as your personal race engineer for [Grand Prix Racing Online](https://www.gpro.net). It runs directly on gpro.net and gives you data-driven recommendations for every decision you make during a race weekend — tyre strategy, car setup, fuel loads, car upgrades, and more.

If you've ever stared at the tyre supplier page wondering which compound to pick, or nervously clicked "Start Q1" without knowing whether your setup is right — this tool is for you.

---

## Why This Exists

GPRO gives you raw data. This tool turns it into **decisions**.

- **Save API requests.** GPRO caps your API token at ~100 requests per race. Most tools burn through these quickly. This tool uses a three-tier data system (DOM → stale cache → API) so you rarely hit the limit.
- **Stop second-guessing.** Every recommendation shows *which model produced it* (per-track formulas, calibrated data, or custom analysis) so you know exactly how much to trust it.
- **Get answers fast.** One floating panel on every page — no tab-switching, no spreadsheets, no copy-pasting between tools.

---

## Features

### Race Weekend

| Page | What You Get |
|------|-------------|
| **Dashboard** | Live data-freshness dashboard, API token status, one-click "Update All" |
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

1. Clone this repo or download `GPRO_Strategy_Tool.user.js` and `gpro-data.js` into the same folder
2. Open Tampermonkey dashboard → **Utilities** tab → **Import from file**
3. Select `GPRO_Strategy_Tool.user.js` (the `@require` for `gpro-data.js` is already configured with a local `file://` path)
4. **If you moved the files**, update the `@require file://` path in the script header to match your actual file location
5. **Enable local file access** — go to your browser's extension settings for Tampermonkey and turn on **"Allow access to file URLs."** This is easy to miss and the script will silently fail to load its data without it — if the panel never appears, this is almost always why.

> The `@require` currently points at a local `file://` path rather than a hosted URL, so this is a two-file, same-folder setup rather than a single-click install. If you'd rather host `gpro-data.js` somewhere and point `@require` at that URL instead, that works too.

---

## Getting Started

1. Navigate to [gpro.net](https://www.gpro.net) and log in
2. On your first visit, the tool will prompt you for an **API token**
3. Get your token: **GPRO App → Menu → Miscellaneous → API access** → copy the token
4. Paste it into the tool's settings modal
5. Visit the **Dashboard** (gpro.asp) to see all your data load

That's it. The floating panel will appear on every game page with page-specific recommendations.

### Menu Commands

Right-click the Tampermonkey icon or use the Tampermonkey menu:

- **Settings** — Enter or change your API token
- **Clear Cache** — Wipe all cached data and reload
- **Reset API Call Counter** — Reset the per-race budget counter (do this at the start of each new race)
- **Season Overview** — View all 17 races with track profiles and intensity bars
- **Sponsor Overview** — View sponsor negotiations and get answer advice
- **Driver & TD Market** — Browse available drivers and technical directors

---

## How It Works

### Three-Tier Data Resolution

The tool is designed to respect GPRO's API budget. Every piece of data goes through three tiers:

1. **Live DOM parse** — Reads data directly from the page you're on (zero network cost)
2. **Stale cache** — Long-lived cached data from previous API calls or background captures (no TTL)
3. **API call** — Last resort only, counted against your per-race budget

Most recommendations are generated without making a single API call.

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
| **API token** | Tampermonkey menu → Settings | Required for API access |

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
