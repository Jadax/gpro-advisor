# GPRO Strategy Tool

Made with ❤ by Tushant Sharma

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
- **Escape scraped text before it reaches `innerHTML`.** Everything renders via string-concatenated `innerHTML`, and some values are scraped off gpro.net pages (driver/TD names, track names). Use `esc()` for anything page-sourced. Currently no known live injection path (those strings are game-generated), but nothing structurally prevents one.
- **Every `GM_xmlhttpRequest` must set `timeout: NET_TIMEOUT_MS`.** Without it a hung request never settles and the awaiting render path blocks forever (panel stuck on "Loading..."). An `ontimeout` handler does nothing unless `timeout` is also set — that exact bug shipped in `fetchPageHTML`.
- **Fan out network requests through `mapLimit(items, NET_CONCURRENCY, fn)`, not bare `Promise.all`.** Unbounded batches previously fired 30 (market full-stat scan) and 17 (season track-specs) simultaneous page fetches at gpro.net from one tab.
- **Debug logging goes through `logDebug()`** (off unless `localStorage.gproDebug === '1'`), real failures through `logError()`. Don't add bare `console.log` — it ships to every user on every page load.
- **Verdict colors live in the shared `VERDICT` const**; panel chrome lives in `PALETTE`. Don't re-declare either inline.
- **`gpro-public-api.yml`** is reference-only (116k+ lines). Never read or glob it wholesale — grep for specific field names before adding a new endpoint call.
- **Don't guess numeric constants.** Every calibrated number in `gpro-data.js` should be sourced (official wiki, a real in-game result, a public repo) and say so in a comment. Several past bugs were exactly this: a plausible-looking number that turned out to be wrong (see "Known calibration facts" below).
- **UI stays copy-paste-simple.** Several backend-only breakdown sections (Time Lost/FLD/TCD, PHA car-vs-track, pit-strategy/phase-by-phase, tyre-cliff/DNF-risk blocks) were deliberately removed from visible panels in v6.1.1 per explicit user request — the calculations still run internally, just aren't surfaced. Don't re-add UI clutter without checking this preference first.
- **User context**: this user does not run practice laps — goes straight to Q1 using GAPP/derived setup values. Don't design features around a practice-feedback loop.

## Cash/balance freshness (real bug fixed 2026-07-31)

`renderUpdateCar`'s DOM-vs-cached cash merge used to only overwrite the cached figure when the
fresh DOM reading was numerically *greater* than what was already cached (`domData.cash > apiCash`).
That's backwards for a balance that legitimately goes down when you spend — once any purchase
happened, the true (lower) fresh reading could never pass the check, so the panel got permanently
stuck showing the pre-purchase balance and kept re-persisting it. Fixed: a valid live DOM reading
always wins outright. Also removed `parseUpdateCarDOM`'s "largest dollar amount on the page"
fallback — the page is full of non-cash dollar figures (every part's upgrade/replace option has its
own cost, easily larger than the real balance), so that fallback could silently report a part's
price as the account balance. A wrong number for a financial figure is worse than no number.
`parseHomeMoneyDOM`/`updateCachedCash` now also refresh the same cached cash figure from gpro.asp's
own "Money:" row on every home-page visit (far more frequent than UpdateCar.asp visits), so it stays
current even on race weekends where the user never opens the Car Advisor.

## Market custom filter bar (2026-08-11, revised same day)

`AvailDrivers.asp`/`AvailTechDirectors.asp` gate their own per-attribute filters (Con/Tal/Agr/Exp/
TechI/Sta/Cha/Mot/Rep/Wei/Age/Min salary/Offers) behind GPRO Supporter status. `mkFilterBar`/
`applyCustomFilters`/`applyFilterBar`/`runMarketScan` replicate the same filtering client-side, for
free, in `mkShortlistSection`/`wireScanFullStatsButton`. Age/Salary/Offers filters work immediately
(already on the base market row) and can reach the FULL row list, not just the OA-capped scan
subset. **All fields are always fillable** - a first version disabled the attribute fields
(Con/Tal/etc) until a separate scan had already run, which was a real UX bug ("half the filters
can't even be filled out"). `applyFilterBar` is now self-sufficient: if any filled-in field needs
real scraped stats and no scan has happened yet, it runs one automatically (via the shared
`runMarketScan`, cached per candidate ID so a second scan from the other entry point is free) before
filtering - one button, one step. `BASE_FILTER_FIELDS`/`DRIVER_ATTR_FILTER_FIELDS`/
`TD_ATTR_FILTER_FIELDS` define each field's direction (`dir: 'max'` = lower is better/keep below,
`dir: 'min'` = higher is better/keep above) - add new filterable fields there, not by hand-rolling
another filter UI elsewhere.

**Autofill + single source of truth (2026-08-11, same day again)**: `mkShortlistSection` now builds
a `filterDefaults` object (sourced attribute floors from `priorityEntries`, plus driver
salary/age caps) and passes it into `mkFilterBar(sectionId, idKey, defaults)`, which pre-fills each
input's `value` - so Rookie/Amateur drivers (the only tiers with real numeric targets today) open
with the sourced minimums already showing, but every input is a plain `<input>` the user can freely
edit or blank out. This fixed a real bug: `mkFullStatsTable` used to independently re-derive the
*same* floors from `priorityEntries` and re-enforce them as a second, hidden, non-editable gate
after the filter bar had already run - so a candidate who passed a user's edited/lowered filter-bar
threshold could still get silently kicked into "below the floor" by the original sourced minimum
underneath. User's exact words: "update the numbers as I want without it failing because in the
backend we have the fixed minimums." Fixed by removing `mkFullStatsTable`'s own floor logic
entirely - it's now a thin ranking wrapper around `mkScoredTable`, and a new `filterAndRenderMarket`
helper (used by both the standalone "Scan Full Stats" button and the filter bar's Apply button) is
the ONLY place filtering happens, always reading the filter bar's current on-screen values. If you
add a new sourced numeric floor anywhere in this flow, it must reach the user through the filter
bar's `defaults`, not as a separate enforced check elsewhere.

**Direction-aware autofill (2026-08-11, third pass)**: the first autofill pass read every sourced
target with `parseMinFromTarget` regardless of the field's `dir`, which silently dropped
`aggressiveness`/`stamina` (Rookie/Amateur target `'0-49'`/`'0-45'`, dir:`'max'`/"keep low") from
the filter bar entirely - their real, meaningful number is the range's UPPER bound, and reading it
as a lower bound produces a 0-floor that gets filtered out as a no-op. Fixed by `parseMaxFromTarget`
(reads the trailing number) used for `dir:'max'` fields, `parseMinFromTarget` (leading number) for
`dir:'min'` fields - see the `floors` computation in `mkShortlistSection`. Charisma/motivation
(`'0-250'`, dir:`'min'`) correctly stay unfilled either way - that range spans the entire attribute
scale, i.e. genuinely no sourced constraint, not a bug.

**Whole-market auto-pagination (2026-08-11, fourth pass, v6.8.0)**: `renderMarketPage` used to only
ever parse the current page's ~20 rows from the live DOM, so applying the filter bar on
`AvailDrivers.asp` only ever filtered whatever page the user happened to be on - user's exact
complaint: "why can the filter not filter out every driver... it clearly only filters the drivers
on that page", after noticing the URL takes a `?Page=N` param they'd have to click through manually.
`fetchRemainingMarketPages(type, idKey)` now auto-fetches every remaining page (real HTTP page
loads via `fetchPageHTML`, never the API) starting from page 2, probing page 2 alone first (most
leagues' markets fit on one page - avoids a wasted batch of requests in the common case), then
continuing in `NET_CONCURRENCY`-bounded batches via `mapLimit` until a page comes back empty -
GPRO exposes no page-count anywhere on the page itself, so "the next page is empty" is the only
stop signal, backstopped by a hard `MARKET_PAGE_FETCH_MAX = 15` safety cap. `renderMarketPage`
awaits this before rendering, so `domRows`/`drivers`/`tds` (and therefore the filter bar and
shortlist) now always cover the FULL current market, not one page of it.

**Cheap-filter-first scanning (2026-08-11, fifth pass, v6.8.1)**: once a market can be 700+
candidates (after the above), the full-profile scan's old flat `MARKET_SCAN_MAX = 60` (top-60-by-OA)
became a real bug, not just a politeness cap - a screenshot showed "0 of 60 scanned candidates
matching your filters" because the 60 highest-OA candidates were nowhere near the Rookie salary/age
caps, so the OA-based pre-selection excluded everyone who could actually pass the user's filter
before scanning even started. Fixed with `cheapFilteredRows(sectionId, idKey, rows)`: narrows the
row set using only the CHEAP filter-bar fields (Age/Salary/Offers - already on the market row, zero
profile fetches needed) *before* any scan runs - both `applyFilterBar` and the standalone "Scan Full
Stats" button call this first. `MARKET_SCAN_MAX` (60) is now display-only (the pre-scan preview
table); the real scan uses a separate, much larger `MARKET_FULL_SCAN_MAX = 300` purely as a
backstop against an unbounded fetch count if the user clears every cheap filter on a huge market -
`scanCandidatesFullStats` reports `.truncatedFrom` when that backstop actually bites, surfaced
honestly in `runMarketScan`'s status text rather than silently dropping candidates. The
"Scan Full Stats & Filter" button's label previews roughly how many profiles today's default
Age/Salary values will trigger, computed with the same `applyCustomFilters` used at scan time.

**Auto-run on page load (2026-08-11, sixth pass, v6.8.2)**: per explicit user request ("all drivers
within this OA range must meet the filters we have - that's the automated search and filtering I
want you to do when I open the driver market up"), `renderMarketPage` no longer waits for a click.
`wireScanFullStatsButton` takes a new `autoStart` param (passed `true` for Rookie/Amateur drivers
where sourced targets exist) - the cheap-filter-then-scan-then-render pipeline (extracted into
`runScanAndFilter`, shared by the button's click handler and this auto-run path) now fires
immediately once the full market has loaded, so the first thing the user sees on `AvailDrivers.asp`
is already a real, scanned, filtered shortlist - no click required. Considered but explicitly did
NOT implement: passing GPRO's own supporter-gated query params (`con`/`tal`/`agr`/.../`MinOA`/
`MaxOA`) into `fetchRemainingMarketPages`'s background page fetches to get server-side filtering for
free. Risk: if GPRO silently ignores those params for non-supporters by returning a differently-
shaped or truncated response instead of the normal full table, `parseAvailListDOM`/the pagination
stop-condition could misread that as "end of market" and silently under-fetch - reintroducing
exactly the kind of silent candidate-exclusion bug fixed twice already this session (v6.7.2's hidden
floor gate, v6.8.1's OA-capped scan). Not worth the risk without a live-confirmed test of what those
params actually do for a non-supporter account.

**MARKET_PAGE_FETCH_MAX was the actual silent-truncation bug (2026-08-11, seventh pass, v6.8.3)**:
user reported that manually visiting page 10 of a market surfaced drivers our own crawl had missed.
Root cause: `MARKET_PAGE_FETCH_MAX` was set to 15 based on a guessed ~20 rows/page - but GPRO
actually pages at 50 rows/page, and the user's real Rookie market ran 92 pages (~4600 candidates).
The previously-reported "750 listed" was EXACTLY 15 pages × 50 rows - i.e. the crawl was hitting its
own artificial cap and treating that as end-of-market, not GPRO's real "next page is empty" signal.
Fixed by raising the cap to 250 (real headroom above anything observed) and raising
`MARKET_FULL_SCAN_MAX` from 300 to 500 to match (see its own comment). Also added live progress to
`fetchRemainingMarketPages` (`onProgress(pagesFetched, candidatesSoFar)` callback, wired into
`renderMarketPage`'s loading message) since a 90+ page crawl takes real time and a static "Loading"
message gave no way to tell it was working versus silently stuck - exactly what made this bug hard
to notice in the first place.

**Top Pick callout (2026-08-12, eighth pass, v6.9.0)**: per explicit user request ("is there a way
to show the top driver sorted by priority... think of the logic here, from the game rules, top user
ratings etc"), `mkFullStatsTable` now renders a highlighted "🏆 Top Pick" card above the ranked table,
naming the single best-fitting scanned candidate. Not a new heuristic - reuses the same
`recruitmentScore` the table below already sorts by (weighted sum of real scraped attributes by this
league's priority order, age/weight penalties modeled on pitwall's RecruitmentService), just
surfaced prominently instead of requiring the user to scan down a table for the #1 row. See also the
concentration-floor fix above, which was found WHILE debugging why so few candidates were reaching
this ranking in the first place.

## Known calibration facts (sourced, don't re-derive from scratch)

- **Driver OA caps per league** (confirmed live in-game by the user, 2026-07-27 — NOT what the GPRO wiki says, which was stale/wrong): Rookie 85, Amateur 110, Pro 135, Master 160, Elite uncapped. `D.leagues[league].driverMaxOA` and `D.driverSelection[league].targetOA`.
- **TD OA caps** (wiki-sourced, `wiki.gpro.net/index.php/Technical_Director`, **not independently re-verified** — treat with the same caution as the driver caps above until confirmed live): Pro 90, Master 120 (higher than the Master driver cap), Elite uncapped in the sources checked. TDs unavailable below Pro, not trainable, no skill decay with age, contracts can't be renewed.
- **Only 3 of 6 staff skills are trainable** (confirmed via `wiki.gpro.net/index.php?title=Staff_and_Facilities`): Concentration ($750k/session), Stress Handling ($1.2M/session), Efficiency ($1M/session). Technical Skill/Experience/Motivation are real displayed attributes with no purchase option at all.
- **Facility level caps per league** (wiki-confirmed, matches `D.leagues[league].facilityMax`): Rookie 20, Amateur 40, Pro 60, Master 80, Elite uncapped.
- **Driver training session effects are NOT deterministic** — GPRO's own wiki states the same training won't always affect stats identically. `D.trainingSessionEffects` is community-sourced (gproracers.forumotion.com/t65-driver-stats) directional guidance, not a formula. Spa Resort has no community-confirmed effect found anywhere — left unconfirmed rather than guessed.
- **Driver/TD market shortlisting REQUIRES every sourced attribute floor at once** (explicit user decision 2026-08-10, overriding the earlier Newbie-Guide "one or two skills will suffice" behaviour). Filtering now lives entirely in the custom filter bar (`applyCustomFilters`/`filterAndRenderMarket`, see "Market custom filter bar" above) — `mkFullStatsTable` no longer re-derives or enforces its own floor set (that was a real bug, fixed in v6.7.2). `"0-xx"` keep-low targets parse to a 0 floor and impose no lower bound on `dir:'min'` fields, so they never block (see `parseMaxFromTarget` for the `dir:'max'` counterpart). Keep `currentLeague`-driven per-league floors in mind when editing numbers.
- **Rookie/Amateur concentration has no trustworthy numeric floor — don't reintroduce one without real data.** The 2026-08-10 recalibration (24,846-driver scrape) documented that the old `'200+'` concentration floor was empirically unreachable (0 of 100 sampled max-OA Rookie drivers had it; only ~20% of Amateur) — but the fix only changed the target STRING from `'200+'` to `'200'`, leaving the exact same unreachable number in place. Combined with the "every floor must clear at once" policy above, this collapsed a ~4600-candidate Rookie market down to ~3 matches (found live, 2026-08-12). Fixed by setting concentration's target to `'as high as affordable'` (qualitative, same treatment already used for Pro/Master/Elite) rather than inventing a replacement number — no corrected numeric median for concentration specifically was ever actually sourced. Talent/experience/techInsight/aggressiveness/stamina keep their real median-derived numeric floors from the same scrape.
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
