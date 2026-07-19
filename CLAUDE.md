# GPRO Strategy Tool

Tampermonkey userscript for gpro.net. Two files: `GPRO_Strategy_Tool.user.js` (logic/UI), `gpro-data.js` (season/track/calibration data, loaded via `@require`). No build step — verify with `node --check GPRO_Strategy_Tool.user.js`.

## Reference material (grep, don't dump)
- `gpro-public-api.yml` — GPRO's official OpenAPI spec (~116k lines). **Authoritative source for API field/endpoint names — grep it before guessing a field name or adding a new `apiGet`/`getDataSmart` call.** Never read or glob this file wholesale; it will blow the context budget. Two real bugs were found this way (2026-07-19): TD endpoint was `/TechDProfile`, real one is `/TDProfile`; staff `concentration`/`stressHandling` live on `/StaffAndFacilities`, not `/Office`.
- `docs/page-structures.md` — confirmed DOM selectors for ~14 game pages, updated in place as new pages are captured. This is for *scraping HTML*; `gpro-public-api.yml` is for *API field names* — don't conflate the two when a field could come from either.

## Active Rules
- **After changing `gpro-data.js`, bump BOTH `@version` in `GPRO_Strategy_Tool.user.js` AND the `?v=` cache-buster on the `@require file://...gpro-data.js` line.** Tampermonkey caches `@require` by exact URL and won't re-fetch a local `file://` require on a normal reload — this cost a full debugging session (2026-07-18) chasing a "GAPP not activating" ghost that was just a stale cached copy.
- **API calls are last resort, not default.** GPRO's token is capped at ~100 requests/race. Any new data need must go through `getDataSmart(endpoint, domParseFn?)`, never `apiGet()` directly: (1) live-parse the current page's DOM if a parser exists for it, (2) long-lived stale cache (any age), (3) only then a real API call. See "API budget system" below.
- Keep scripts modular; no duplicate helpers. Don't re-derive constant tables by eye — diff with a short `node -e` script.
- Don't paste full page HTML into chat/memory — update `docs/page-structures.md` in place instead.
- Data additions (trackHistory, calibration, etc.) go in `gpro-data.js` only, never duplicated in the `.user.js`, unless the script genuinely can't read `GPRO_DATA` at that point.
- Money strings are dot-thousands (`$5.902.387`) — reuse `parseGproCash`, don't reinvent.
- Before touching `apiGet`/cache/stale-fallback/`getDataSmart` logic, re-read it in full first — it already handles retries, short cache, long-lived stale fallback, and the budget guard; don't add a second caching layer.
- Never write extensive explanatory text in chat; output code directly.

## API budget system
- `apiGet` enforces `API_CALL_BUDGET` (40, GM key `gpro_api_call_count`) and also respects GPRO's own `apiRequestsRemaining` field (returned by `/Office`, cached as `gpro_api_requests_remaining`) — whichever is more conservative wins. Once either is hit, no more real requests; straight to cache/stale. Reset manually via Tampermonkey menu each new race (no reliable auto-detect without spending a request to check).
- `CACHE_TTL` is 20 min. `getDataSmart`'s stale-cache tier has no TTL at all — it's fed by:
  - `runPassiveCapture()` — fires when the user is physically on DriverProfile/TrackDetails/Suppliers/StaffAndFacilities.asp (all `@match`ed pages).
  - `backgroundCaptureAuxPages()` — fetches those same pages *without navigation* on every gpro.asp load, throttled to once/30min (`gpro_bg_capture_last`), bypassable by "Update All Data". Real HTTP requests but not `/backend/api/v2` calls, so they don't count against the budget.
- `resolveActiveSupplier(office, supplierData)` matches by `office.tyreSupplierId` (API path) or `supplierData.activeSupplierName` (DOM-capture path has no numeric ids).

## GAPP formulas (`gpro-data.js` `gapp` block)
Ported from github.com/Jadax/gapp (unmaintained; formulas verified by reading `calcs.py`/`data.py` from a local clone, not lossy web-fetch summaries). **GAPP is PRIMARY everywhere it applies** (`calcCarSetupSmart`, `calcTyreStrategySmart`, `calcPartsWear`, `analyzeCar`), falling back to the legacy/own-calibrated formula only when track+driver+car+supplier data is unavailable. Two unresolved numeric discrepancies found during validation against Spa/Montreal calibration — both intentionally kept visible in the UI rather than silently trusted:
- Tyre stop-count: ~2x fewer stops than gproanalyzer-calibrated numbers for dry compounds (Rain matches closely). Own numbers shown via `result.ownCrossCheck` / `mkGappStopsCrossCheck`.
- Part wear-per-race: ~25-30% higher than calibration across all 11 parts. Own numbers shown via `.ownRaceWear`/`.ownTotalRaceWear` in an "(own)" column.

If asked to investigate either further, start here rather than re-trusting GAPP's numbers outright.

## gpro-pitwall cross-check (github.com/Jadax/gpro-pitwall, reviewed 2026-07-19)
Same author lineage as GAPP, evolved into a full PHP web app. Its real numeric coefficients live in a gitignored `config/secrets.php` (redacted to 0.0 in the public repo) — **not available to us** — but its formula *structure* and several fully-disclosed public constants were: confirmed our GAPP port already correctly includes driver weight in the tyre-wear exponent, engine/electronics level in the fuel factor, and a per-supplier additive TCD term (no changes needed there). What was ported in:
- **Driver Strategy risk advisor** (`calcDriverStrategyRecommendation`, `calcBoostLapSuggestion`) — full rewrite from a crude own-guess to gpro-pitwall's disclosed `RiskAdvisorService` heuristic: composure formula (wet/dry-weighted concentration/talent/experience/motivation), track `overtaking`/`gripLevel` as real inputs (confirmed live on `/TrackProfile` — `track.overtaking`, `track.gripLevel`), aggression-vs-experience mistake penalty, race-distance/stamina tiering, start-risk approach, "pit on solvable problem" lap threshold, and boost-lap placement. Explicitly still a heuristic, not a verified game formula (same status as before, just far better-considered).
- **180L max-fuel-per-stint enforcement** in `renderRaceSetup`'s fuel plan — real correctness gap found by comparing against pitwall's `StrategyService` (which bumps stop count until every stint fits the tank).
- **Oval-track setup multiplier** (`trackMult` in `calcCarSetupGappSession`, Indianapolis Oval / Rafaela Oval only) — ported from a disclosed public default (0.39) in `SetupCalculatorService`, applied at coarser granularity than the original (our formula doesn't cleanly separate the same sub-terms) — not verified against real oval race data, flag if it looks wrong.

## User context
- User never runs practice laps — goes straight to a Q1 lap using GAPP/gproanalyzer-derived setup values. Don't design features around a practice-feedback loop.
