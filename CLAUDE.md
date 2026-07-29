# GPRO Strategy Tool

Made with ❤ by Tushant Sharma | Astraiva

Tampermonkey userscript for gpro.net. Two files: `GPRO_Strategy_Tool.user.js` (logic/UI, ~5440 lines), `gpro-data.js` (season/track/calibration data, ~1330 lines, loaded via `@require`). No build step — verify with `node --check`.

## File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| `GPRO_Strategy_Tool.user.js` | 5,439 | Main script: DOM parsing, calculations, UI rendering |
| `gpro-data.js` | 1,332 | Season data, track profiles, GAPP formulas, calibration data |
| `gpro-public-api.yml` | 116,639 | **Reference only** — GPRO's OpenAPI spec. Never load it. Grep for field names. |
| `docs/page-structures.md` | 156 | DOM selectors for ~14 game pages |
| `CLAUDE.md` | this file | Development rules for AI assistants |
| `README.md` | 167 | User-facing install guide |

## Architecture (3 sentences)

1. **Data resolution**: `getDataSmart(endpoint, domParseFn?)` tries live DOM parse → long-lived stale cache → real API call. `apiGet()` is last resort (GPRO token capped at ~100 requests/race).
2. **GAPP-first formulas**: Every calc function checks `D.gapp` data first, falls back to own calibrated formulas. Key functions: `calcCarSetupSmart`, `calcTyreStrategySmart`, `calcPartsWear`.
3. **Passive capture**: `runPassiveCapture()` fires when visiting DriverProfile/TrackDetails/Suppliers/StaffAndFacilities pages. `backgroundCaptureAuxPages()` fetches those pages without navigation on every gpro.asp load.

## Key Functions Index

| Function | Line | Purpose |
|----------|------|---------|
| `detectPage()` | 330 | URL → page key mapping |
| `init()` | 5239 | Main router: fetches data, calls render functions |
| `getDataSmart()` | 260 | 3-tier data resolution (DOM → stale → API) |
| `apiGet()` | 183 | Direct API call with budget guard |
| `calcCarSetupSmart()` | 1984 | Q1/Q2/Race setup calculation |
| `calcTyreStrategySmart()` | 1694 | Tyre compound analysis (GAPP-first) |
| `calcPartsWear()` | 2453 | Per-part wear prediction |
| `analyzeCar()` | 2732 | Car upgrade recommendations |
| `calcDriverStrategyRecommendation()` | 2052 | Risk advisor (overtake/defend dials) |
| `calcBoostLapSuggestion()` | 2208 | Boost lap placement |
| `renderRaceSetup()` | 3440 | Race Setup page renderer |
| `renderUpdateCar()` | 4326 | Car Update page renderer |
| `renderQualify()` | 3202 | Qualify page renderer |
| `renderStaff()` | 4606 | Staff & Facilities renderer |
| `renderTraining()` | 4869 | Training page renderer |
| `parseUpdateCarDOM()` | 2498 | DOM parser for UpdateCar.asp |
| `calcHappyRange()` | 2266 | Driver acceptable wear range |

## Dead Code (verified, safe to ignore)

**Functions never called**: `calcFuelSimple`, `calcStrategyConfidence`, `identifyRiskFactors`, `generateStrategyNotes`, `calcTestingWearPerLap`, `calcTestingTargets` — all removed in v6.2.0.

**gpro-data.js keys never referenced**: `phaSeasonAvg`, `wearAlerts`, `carIdealLevels`, `upgradeRoiThreshold`, `preRaceDnfRisk`, `wearPerformanceLoss`, `wearFailureRisk`, `wearAcceleration`, `driverPerformanceScores`, `driverOATests`, `pitwallFormulas`, `seasonCarWear`, `quickSetupCalibration`, `databaseFields` — all removed in v6.2.0.

## Active Rules

- **After changing `gpro-data.js`, bump BOTH `@version` in `GPRO_Strategy_Tool.user.js` AND the `?v=` cache-buster on the `@require file://...gpro-data.js` line.** Tampermonkey caches `@require` by exact URL.
- **API calls are last resort.** Use `getDataSmart(endpoint, domParseFn?)`, never `apiGet()` directly. Token capped at ~100 requests/race.
- **DOM parsers** for: `parseUpdateCarDOM`, `parseDriverProfileDOM`, `parseTrackDetailsDOM`, `parseTyreSuppliersDOM`, `parseStaffFacilitiesDOM`, `parseTestingDOM`, `parseAvailListDOM`.
- **Money strings** are dot-thousands (`$5.902.387`) — reuse `parseGproCash`.
- **`gpro-public-api.yml`** is reference-only (116k lines). Never load it wholesale — grep for specific field names.
- **`ARCHITECTURE.md`** is a 1,248-line iteration log. Don't read it unless specifically debugging a historical change.

## GAPP Data Hierarchy

`gpro-data.js` → `D.gapp` contains:
- `trackData` — per-track: laps, fuel, tyre, PHA, CTR, overtaking, grip
- `tyreCalc` — tyre wear formula constants
- `pitTimeCalc` — pit stop formula constants
- `fuelTimeCalcConstant` — FLD formula constant
- `compoundCalcConstant` — TCD formula constant
- `levelFactors` — car level → wear multiplier
- `profileFactors` — part → PHA contribution

## Scraped Data (from gproanalyzer.info, Season 111)

`D.scrapedRaceData` — 10 races with fuel/tyre rates, setups, positions
`D.seasonCTR` — 17 tracks: overtaking, grip, CTR/lap, CTR/race
`D.seasonPHA` — 17 tracks: Power/Handling/Acceleration requirements
`D.tyreSuppliers` — 9 suppliers: durability, compound diff, peak temp, performance
`D.tyreCompoundFactors` — 5 compounds: type value, wear factor
`D.sponsorAnswers` — 5 negotiation questions mapped to characteristic values
