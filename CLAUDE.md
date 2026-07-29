# GPRO Strategy Tool

Made with ❤ by Tushant Sharma | Astraiva

Tampermonkey userscript for gpro.net. Two files: `GPRO_Strategy_Tool.user.js` (logic/UI, ~5820 lines), `gpro-data.js` (season/track/calibration/scraped data, ~1355 lines, loaded via `@require`). No build step — verify with `npm run check:userscript` (or `node --check` on each file directly).

## File Inventory

| File | Purpose |
|------|---------|
| `GPRO_Strategy_Tool.user.js` | Main script: DOM parsing, calculations, UI rendering |
| `gpro-data.js` | Season data, track profiles, GAPP formulas, calibration, scraped data |
| `gpro-public-api.yml` | **Reference only** — GPRO's OpenAPI spec (116k+ lines). Never load it. Grep for field names. |
| `docs/page-structures.md` | Confirmed DOM selectors for ~14+ game pages |
| `CLAUDE.md` | This file — development rules and durable project knowledge |
| `README.md` | User-facing install guide |

`ARCHITECTURE.md` (a long chronological iteration log) was retired 2026-07-29 — its durable content is folded into this file below; don't recreate it as a running log going forward. Git history still has it if a specific past decision needs digging up.

## Architecture (3 sentences)

1. **Data resolution**: `getDataSmart(endpoint, domParseFn?)` tries live DOM parse → long-lived stale cache → real API call. `getDataDomOnly(endpoint, domParseFn?)` is the stricter variant that never falls through to the API at all. `apiGet()` is last resort (GPRO token capped at ~100 requests/race) — never call it directly, always through one of the two resolvers above.
2. **GAPP-first formulas**: Every calc function checks `D.gapp` data first, falls back to own calibrated formulas. Key functions: `calcCarSetupSmart`, `calcTyreStrategySmart`, `calcPartsWear`.
3. **Passive + background capture**: `runPassiveCapture()` fires when visiting DriverProfile/TrackDetails/Suppliers/StaffAndFacilities/Testing pages. `backgroundCaptureAuxPages()` fetches those pages (plus Qualify.asp for weather, NegOverview, TDProfile) without navigation on every gpro.asp load, throttled to once/30min. `backgroundCacheSeasonTrackSpecs()` additionally pre-fetches every track's `TrackDetails.asp` via `Calendar.asp` once per season (for weather-period lap conversion — see below).

## Key Functions Index

| Function | Line (as of 2026-07-29, will drift — grep, don't trust blindly) | Purpose |
|----------|------|---------|
| `apiGet()` | 183 | Direct API call with budget guard — last resort only |
| `getDataSmart()` | 260 | 3-tier data resolution (DOM → stale → API) |
| `detectPage()` | 331 | URL → page key mapping |
| `calcTyreStrategySmart()` | 1814 | Tyre compound analysis (GAPP-first) |
| `calcCarSetupSmart()` | 1995 | Q1/Q2/Race setup calculation |
| `calcDriverStrategyRecommendation()` | 2063 | Risk advisor (overtake/defend/start-risk dials) |
| `calcBoostLapSuggestion()` | 2219 | Boost lap placement |
| `calcHappyRange()` | 2277 | Driver acceptable wear range |
| `calcPartsWear()` | 2371 | Per-part wear prediction |
| `parseUpdateCarDOM()` | 2395 | DOM parser for UpdateCar.asp |
| `analyzeCar()` | 2688 | Car upgrade recommendations (see budget-allocation notes below) |
| `renderQualify()` | 3101 | Qualify page renderer |
| `renderRaceSetup()` | 3337 | Race Setup page renderer |
| `renderUpdateCar()` | 4031 | Car Update page renderer |
| `renderStaff()` | 4623 | Staff & Facilities renderer |
| `renderTraining()` | 4790 | Training page renderer |
| `init()` | 5074 | Main router: fetches data, calls render functions |

## Visual design system (2026-07-29)

All panel chrome (background/header/section-cards/rows/buttons/scrollbar) is centralized through
`PALETTE`, `injectGlobalStyles()`, and `ST` near the top of the file, plus `mkSection`/`mkRow`/
`mkRec`/`mkInlineBar`/`barStyle`. Editing those few spots reaches every rendered panel — don't
hand-roll one-off panel/section/card styling in a new render function, reuse these. Semantic verdict
colors (`good`=#10b981, `warn`=#f59e0b, `bad`=#ef4444, `info`=#3b82f6) are used in hundreds of call
sites throughout the render functions and are deliberately NOT part of the chrome refresh — don't
change those hues without a very good reason, since they're load-bearing for meaning, not just
decoration. `injectGlobalStyles()` is idempotent (checks for `#gpro-global-style` before injecting)
and must be called from `createPanel()` — it's what gives every `<button>`/`.gpro-card`/
`[data-jump-to]` element inside `#gpro-panel` its hover/transition behavior for free, without each
call site needing its own CSS.

## Active Rules

- **After changing `gpro-data.js`, bump BOTH `@version` in `GPRO_Strategy_Tool.user.js` AND the `?v=` cache-buster on the `@require file://...gpro-data.js` line.** Tampermonkey caches `@require` by exact URL and won't re-fetch a local `file://` require on a normal reload.
- **API calls are last resort, not default.** Use `getDataSmart(endpoint, domParseFn?)` or `getDataDomOnly(endpoint, domParseFn?)`, never `apiGet()` directly. Token capped at ~100 requests/race.
- **DOM parsers** for: `parseUpdateCarDOM`, `parseQualifyCarDOM`, `parseDriverProfileDOM`, `parseTrackDetailsDOM`, `parseTyreSuppliersDOM`, `parseStaffFacilitiesDOM`, `parseTestingDOM`, `parseAvailListDOM` (Driver/TD market lists), `parseTdProfileDOM` (**unverified against a live TD profile page** — no TD profile page has ever been captured; flag/investigate if its console warning ever fires), `parseCalendarDOM`, `parseNegOverviewDOM`, `parseWeatherDOM`.
- **Money strings** are dot-thousands (`$5.902.387`) — reuse `parseGproCash`.
- **`gpro-public-api.yml`** is reference-only (116k+ lines). Never read or glob it wholesale — grep for specific field names before adding a new endpoint call.
- **Don't guess numeric constants.** Every calibrated number in `gpro-data.js` should be sourced (official wiki, a real in-game result, a public repo) and say so in a comment. Several past bugs were exactly this: a plausible-looking number that turned out to be wrong (see "Known calibration facts" below).
- **UI stays copy-paste-simple.** Several backend-only breakdown sections (Time Lost/FLD/TCD, PHA car-vs-track, pit-strategy/phase-by-phase, tyre-cliff/DNF-risk blocks) were deliberately removed from visible panels in v6.1.1 per explicit user request — the calculations still run internally, just aren't surfaced. Don't re-add UI clutter without checking this preference first.
- **User context**: this user does not run practice laps — goes straight to Q1 using GAPP/derived setup values. Don't design features around a practice-feedback loop.

## Known calibration facts (sourced, don't re-derive from scratch)

- **Driver OA caps per league** (confirmed live in-game by the user, 2026-07-27 — NOT what the GPRO wiki says, which was stale/wrong): Rookie 85, Amateur 110, Pro 135, Master 160, Elite uncapped. `D.leagues[league].driverMaxOA` and `D.driverSelection[league].targetOA`.
- **TD OA caps** (wiki-sourced, `wiki.gpro.net/index.php/Technical_Director`, **not independently re-verified** — treat with the same caution as the driver caps above until confirmed live): Pro 90, Master 120 (higher than the Master driver cap), Elite uncapped in the sources checked. TDs unavailable below Pro, not trainable, no skill decay with age, contracts can't be renewed.
- **Only 3 of 6 staff skills are trainable** (confirmed via `wiki.gpro.net/index.php?title=Staff_and_Facilities`): Concentration ($750k/session), Stress Handling ($1.2M/session), Efficiency ($1M/session). Technical Skill/Experience/Motivation are real displayed attributes with no purchase option at all.
- **Facility level caps per league** (wiki-confirmed, matches `D.leagues[league].facilityMax`): Rookie 20, Amateur 40, Pro 60, Master 80, Elite uncapped.
- **Driver training session effects are NOT deterministic** — GPRO's own wiki states the same training won't always affect stats identically. `D.trainingSessionEffects` is community-sourced (gproracers.forumotion.com/t65-driver-stats) directional guidance, not a formula. Spa Resort has no community-confirmed effect found anywhere — left unconfirmed rather than guessed.
- **Driver market shortlisting must not require every attribute floor at once.** GPRO's own official Newbie Guide (`gpro.net/gb/GPRONoobGuide.asp`): "You will not find a driver who has a good rating for all his skills whilst in Rookie, but a driver with one or two skills will suffice." `mkFullStatsTable` gates only on the single top-priority attribute (concentration) for exactly this reason.
- **Weather forecast periods are NOT proportional to your own race's lap count.** Wiki, verbatim: "All weather changes... happen on the same lap in all races, not dependent on time." An 80-lap and a 57-lap race on the same track/week see a transition at the same *absolute* lap number, tied to Elite's pace. `estimateLapsPerWeatherPeriod()` derives this per-track from `avgSpeed`/`lapDistance` (TrackDetails.asp, matches real `/TrackProfile` API fields), corrected by a single real-race calibration ratio (Losail: formula's raw ~22.2 laps/period vs. the real calibrated 20) — **this correction factor is single-track-derived and may not generalize; revisit if a result on a different track falls outside the estimated window.**
- **Testing.asp / Car Test Points conversion is deliberately closed by GPRO, not just under-researched.** GPRO's own wiki states the Test Points → CCP conversion "depends on a number of factors which you will have to investigate" — checked GAPP, this codebase, and the wiki directly; there's no raw test-points field exposed anywhere either. Don't re-open without a genuinely new source.
- **GAPP-vs-calibration discrepancies** (validated against Spa/Montreal calibration, kept visible in the UI rather than silently trusted): tyre stop-count runs ~2x fewer stops than calibrated numbers for dry compounds (Rain matches closely) — shown via `result.ownCrossCheck`/`mkGappStopsCrossCheck`. Part wear-per-race runs ~25-30% higher than calibration across all 11 parts — shown via `.ownRaceWear`/`.ownTotalRaceWear`. If asked to investigate either further, start here rather than re-trusting either number outright.
- **Car Advisor budget allocation**: within the "will fail this race" tier, a narrow ultra-urgent carve-out (`ULTRA_URGENT_WEAR = 5`, i.e. remaining wear ≤5% — essentially already fully worn before the race even starts) always gets first claim on budget regardless of static part-importance priority; everything else in that tier is ordered by `UPGRADE_PRIORITY` (Engine=1, "most impactful for Power PHA"). The fix-selection logic picks whichever of the cheapest upgrade or cheapest same-level replace costs less, not always upgrade.

## GAPP Data Hierarchy

`gpro-data.js` → `D.gapp` contains:
- `trackData` — per-track: laps, fuel, tyre, PHA, CTR, overtaking, grip
- `tyreCalc`/`stopCalc` — tyre wear formula constants (includes `tyreSupplierFactor`/`tyreCompoundSupplierFactor` — only 6 of 9 real suppliers have disclosed numeric factors; Hancock/Bridgerock/Michelini are unknown, surfaced via `tyre.supplierFactorUnknown` rather than silently degrading)
- `pitTimeCalc` — pit stop formula constants
- `fuelTimeCalcConstant` — FLD formula constant
- `compoundCalcConstant` — TCD formula constant
- `levelFactors` — car level → wear multiplier
- `profileFactors` — part → PHA contribution

## Scraped Data (from gproanalyzer.info / gprohub.net, authenticated sessions, Season 111)

`D.scrapedRaceData` — 10 races with fuel/tyre rates, setups, positions
`D.seasonCTR` — 17 tracks: overtaking, grip, CTR/lap, CTR/race
`D.seasonPHA` — 17 tracks: Power/Handling/Acceleration requirements
`D.tyreSuppliers` — 9 suppliers: durability, compound diff, peak temp, performance
`D.tyreCompoundFactors` — 5 compounds: type value, wear factor
`D.sponsorAnswers` — 5 negotiation questions mapped to characteristic values

## Dead code sweeps (for context, not an active list to maintain)

Two dead-code audits (v6.2.0/v6.2.1) removed ~800 lines of genuinely-unused functions and data keys, plus the `gproanalyzer/` scraper scratch directory and `race_coaching.user.js` (a standalone script with a hardcoded API key — don't recreate anything like it; if a similar experiment is needed, keep secrets out of committed files entirely). If you suspect new dead code has accumulated, grep each candidate's name across the whole file before removing — don't trust a stale list here.
