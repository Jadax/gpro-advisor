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

## Current-season CTR/PHA/weather data added, old S111 data superseded (2026-08-13)

`D.seasonCTR`/`D.seasonPHA` were tagged Season 111 with a track calendar (Barcelona/Ahvenisto/
Magny Cours/...) that doesn't match this account's actual current calendar at all - found while
reviewing user-supplied gproanalyzer.info screenshots for the real current season (Estoril/
Bremgarten/Zandvoort/Zolder/Anderstorp/Sochi/Monza/Brno/Valencia/Indianapolis/Mexico City/Brasilia/
Baku City/Shanghai/Sepang/Fuji/Singapore). Since `renderUpdateCar`'s PHA table and `renderTraining`'s
track-specific focus both just `.slice(0, 5)` off the front of these arrays (no track-name lookup),
the stale data was silently showing wrong-track PHA/CTR requirements as "upcoming races".

Added `D.currentSeasonCTR`/`D.currentSeasonPHA`/`D.currentSeasonAvgTemp` with the real current
calendar (both `.slice(0,5)` call sites now prefer these, falling back to the legacy `seasonCTR`/
`seasonPHA` only if absent). The old S111 arrays were left in place as historical record, clearly
re-commented as stale/superseded, not deleted - they may still have reference value.

**Real season number still unknown** - the user was asked (2026-08-13) to confirm it from gpro.asp;
`D.currentSeason`/`D.seasons.S111.tracks` (season metadata, separate from the CTR/PHA data above)
were deliberately NOT touched pending that answer, since guessing a season number would be exactly
the kind of unsourced number this project's rules warn against.

**Season PHA's "Season" cumulative columns were dropped, not transcribed** - the screenshot's
per-track table had both a "Track" P/H/A/Advantage set (captured) and a separate "Season" P/H/A set
per row that looked like a running average, but the bottom summary row's totals didn't match race
17's own "Season" column values - internally inconsistent, so rather than guess at the semantics
they were left out of `currentSeasonPHA` entirely.

**Bar-chart-only screenshots (Season Car Wear, Season Fuel Consumption, Season Tyre Wear, and the
unlabeled bar row under Season Weather) were NOT transcribed** - no printed numbers were visible,
only colored bar segments (green/orange/red), and this project doesn't guess numeric values from
bar length/color. If the user can get a numeric table view (e.g. gproanalyzer hover tooltips, a
CSV/table export) these could be added properly later.

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

## Part wear freshness — same bug class, part wear this time (real bug fixed 2026-08-13)

Same root cause as the cash bug above, just never applied to part levels/wear. User reported the
Car Advisor showing large wear percentages (Chassis 83%, Engine 96%...) on a car confirmed live (via
a pasted screenshot of the actual UpdateCar.asp points-distribution table) to be brand-new Level 1
parts at a genuine, correct 0% wear. Two compounding bugs: (1) `parseUpdateCarDOM` treated
`currentWear === 0` as "not found yet" (same signal as a genuine parse failure), so a correctly-read
0% got silently overwritten by a second, greedier text-regex fallback that could latch onto an
unrelated number-then-percent anywhere else on the page. Fixed by adding explicit `wearFound`/
`levelFound` booleans that track discovery separately from the discovered value. (2) `renderUpdateCar`'s
DOM-vs-cached merge only ever trusted the DOM reading when `dp.currentWear > 0` - so even after (1)
was fixed, a genuine 0% from the DOM could never overwrite a stale cached wear value from a previous
race/season. Fixed to use the new `wearFound`/`levelFound` flags instead: a valid DOM reading wins
outright whenever found, exactly matching the cash fix's "always wins outright" precedent - not
gated on the value being nonzero. If you add new DOM-parsed numeric fields anywhere in this file,
check whether 0 is a legitimate real value for that field before using `=== 0`/`> 0` as a "did we
find it" signal - it silently isn't, twice now.

## UI trims — training advisor, Q1/Q2 tyre/weather detail, race setup detail (2026-08-13)

Same "UI stays copy-paste-simple" precedent as the Driver Offer Advisor trim (see Active Rules
below), applied to three more pages per explicit user request ("I don't really need to see all
this... probably better used internally by you"):
- **Dashboard**: removed the "Data Updated" section (duplicated the "Data Freshness" table already
  above it - same source count, plus a render-time timestamp that isn't per-source freshness info).
  "API Token" panel was kept - the API is still a genuine last-resort fallback tier
  (`getDataSmart`→`apiGet`), not fully retired, so its budget/status is still meaningful to show.
- **Training Advisor** (`renderTraining`): removed the Driver/Career/Contract/Skills cards and the
  raw "Available Training" session/cost/effect table - the user is physically on the page already
  and can see all of that directly. `data.skills`/`data.sessions`/`data.contract` etc are still
  fully parsed and drive the Training Recommendation, Driver Optimal Training, Track-Specific Focus,
  and budget-check sections, which stayed (they're recommendations, not restated raw data).
- **Q1/Q2** (`renderQualify`): removed the "Tyre Details" breakdown (fuel/lap, total fuel, wear
  factor, per-compound comparison table) - the tyre recommendation line above it already gives the
  actionable answer. `mkWeatherForecastSection` (shared with Race Setup) now shows only its one-line
  DRY/RAIN PLAN verdict, not the raw per-quarter temp/rain% breakdown with bars.
- **Race Setup** (`renderRaceSetup`): removed item 7's raw detail dump (Push-or-Hold signal list,
  tyre compound comparison table, GAPP/calibrated cross-checks, recommendation-source note) - the
  verdict banner and Weather/Compound/Stops/Laps badges (items 1-2, rendered earlier) already surface
  the actual recommendation.
`mkTyreResultsTable`, `mkGappStopsCrossCheck`, `mkTdStatusNote` became genuinely dead code once their
only call sites were removed and were deleted (verified via grep - zero remaining references beyond
their own definitions) rather than left as unused functions.

**Race Setup's Track/Weather Forecast/Race Strategy sections removed too (2026-08-13, v6.12.1)**:
same-day follow-up - user pasted the full text of all three sections and confirmed (after a
clarifying question about whether the actual fuel/pit numbers should stay) that everything shown
should go. Safe to remove because the "RACE QUICK SUMMARY" bar (rendered earlier in
`renderRaceSetup`) already covers the essential numbers compactly - tyre+stops, total fuel, fuel/lap,
stint fuel breakdown, weather, parts-fail warnings. `strategyHtml` (the ~200-line block building the
old "Race Strategy" section) is still fully built - `pushHold`/`fuel`/`tyre`/`analyze` all still
compute and feed the Quick Summary and decision board - only the final `h += mkSection('Race
Strategy', strategyHtml, ...)` append was removed, so nothing downstream broke. Two decision-board
tiles ("Weather", "Strategy") lost their click-to-jump target since the sections they'd scroll to no
longer exist - `wireDecisionBoard`'s handler already null-checks the target before calling
`scrollIntoView`, so this degrades silently (tile just doesn't scroll) rather than erroring.

**OA range buttons reverted, filter fields enlarged (2026-08-13, v6.12.2)**: the OA quick-select
band buttons added the day before (v6.11.1) were removed again same-session per explicit user
request - "we don't need this as I will put the numbers in the filters themselves." Separately, the
filter bar's number inputs were called out as "tiny, needs to be more user friendly" - `mkFilterBar`
now lays fields out in a `grid-template-columns:repeat(auto-fill,minmax(90px,1fr))` grid instead of a
tightly-wrapped flex row of `min-width:52px` boxes, with larger font (14px vs 10px), padding, and
label weight. `wireOaRangeBands`/`OA_RANGE_BANDS`/the `gpro-oabands-*` DOM hook were deleted entirely
(verified via grep - zero remaining references) rather than left disabled - the underlying
`oaMin`/`oaMax` filter fields and their cheap-filter/scan-narrowing behavior are unchanged, only the
button convenience layer on top is gone.

**Con=200 in a screenshot was a stale/leftover input value, not a code bug (2026-08-13)**: user
reported 0 matches with the filter bar's OWN "pre-filled with..." summary text confirming
concentration was correctly NOT among the autofilled fields - yet the Con input still showed 200.
Since `filterDefaults` genuinely never sets `concentration` anymore (its target is qualitative, see
the "Rookie/Amateur concentration has no trustworthy numeric floor" note above), the 200 could only
have gotten into that input from something outside our render (typed earlier and left in place
across an in-page Apply-Filters cycle, or restored by the browser's own form-history on reload) -
`mkFilterBar` only ever sets a `value` attribute from `defaults`, never anything else. Worth
remembering if a similar "field shows a value we never set" report comes in again: check the
page's own rendered summary text first (it reflects the real current `filterDefaults`) before
assuming a code regression.

**Salary default removed, concentration default re-added deliberately (2026-08-13, v6.12.3)**:
explicit, direct user request after everything above - "remove the salary number. add 200 to
concentration." Salary's default (sourced from the league's `maxSalary` cap) is gone; the field
still exists and filters normally, just starts blank. Concentration now defaults to 200 - this is
**not** a sourced floor (concentration still has no trustworthy numeric target, see the "no
trustworthy numeric floor" note above - the old 200 was empirically shown to clear almost no one)
- it's a manually-requested starting value the user explicitly asked for with full knowledge of
that history, not a reintroduction of the earlier bug. Same editable/clearable field as everything
else in the bar. Don't "fix" this back to unset without the user asking again - it's intentional.

**Stale-candidate bug: signed drivers kept reappearing in results (real bug fixed 2026-08-13,
v6.13.0)**: user report - "the driver market advisor keeps scanning and recommending drivers that
are already signed by someone else." Root cause: `mergeMarketRows` is a pure additive union by ID
(rows missing from the latest page are KEPT, never dropped - by design, so paging through a market
doesn't lose earlier pages). That's correct for accumulating PARTIAL views across page visits, but
`ensureFullMarketFetched` was using the same additive merge for a COMPLETED full-market crawl -
merging fresh results into whatever was already in `state.rows` (which started as page 1 + long-
lived stale cache, see `renderMarketPage`). A driver signed by another manager since the last cache
write never got removed, so they kept surfacing in every subsequent scan indefinitely. Fixed:
`ensureFullMarketFetched` now takes an explicit `freshPage1Rows` param (the live DOM read of page 1,
threaded through `wireScanFullStatsButton`'s new `page1Rows` arg → `state.page1Rows`) and REPLACES
`state.rows` with `mergeMarketRows(page1Rows, restRows, idKey)` - both freshly fetched in the same
crawl - rather than merging into old state. When there's no live page 1 available (the menu overview
command, not physically on the market page), it now fetches page 1 for real too instead of silently
relying on stale cache for that page. The confirmed-fresh result also overwrites the stale cache
(`setStaleData`) so a later page load's partial pre-scan view stops perpetuating departed candidates
either. General lesson: `mergeMarketRows`'s "never remove" semantics are only safe for genuinely
partial/incremental views - once a fetch is known to be a complete, authoritative snapshot, it must
replace, not merge.

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

**recruitmentScore math bug + salary factor (2026-08-12, ninth pass, v6.9.1)**: the Top Pick
callout above shipped showing "Fit 0" for every single scanned candidate - `recruitmentScore`'s
`maxWeighted` denominator carried a stray `250 *` factor that `hit` (already normalized to a 0-1
fraction per attribute via `Math.min(1, v/250)`) never had, so every score divided by ~250x too
much and rounded to 0 for everyone, making the "best" pick meaningless/arbitrary. Fixed by dropping
the stray `250 *`. Also added a salary/value penalty (explicit user request: "shouldn't lower
salary etc be better... taking everything we've learned about this game into account") - up to -20
points scaled as a fraction of the league's own sourced `maxSalary` (not a flat dollar figure, so it
stays proportionate across leagues), reflecting the Rookie/Amateur budget guidance already
documented in `D.driverSelection[league].budget` ("save as much as possible" / "never go into
debt"). TDs have no `driverSelection` entry so this penalty is a no-op for them, not a crash.

**MARKET_FULL_SCAN_MAX raised again, live scan progress added (same pass, v6.9.1)**: 500 was still
too low - a live 4571-driver Rookie market's cheap Age/Salary filters barely narrowed anything (188
over the age cap, only 6 over the salary cap out of 4571 - Rookie league inherently skews young and
cheap already), so the OA-sorted top-500 cutoff was still silently excluding thousands of
filter-matching candidates. Raised to 3000 - a real, communicated tradeoff (scanning thousands of
profile pages takes real minutes) rather than a false claim of full completeness; `runMarketScan`
now shows live "Scanning candidate profiles: N of M" progress (via a new `onProgress` callback
threaded through `scanCandidatesFullStats`) so a multi-minute scan doesn't look stuck. If 3000 is
ever genuinely insufficient for a market that large, the honest fix is narrowing the filter bar's
own fields further (attribute floors, not just age/salary) - not silently raising this cap forever,
since real HTTP request volume against gpro.net is a genuine politeness constraint.

**MARKET_FULL_SCAN_MAX removed as a practical limit (2026-08-12, tenth pass, v6.9.2)**: per explicit
user request ("increase the cap... to all the drivers - it's easily less actually because we have
OA ceilings per league") - the user's point being GPRO's own market response is already bounded by
the token account's league OA ceiling (a no-params request tops out at "the maximum OA of the
Token's account league" per `gpro-public-api.yml`), so the real candidate pool was never going to be
"the entire game," just naturally capped well below that already. Raised from 3000 to 12500 (=
`MARKET_PAGE_FETCH_MAX`'s own 250-page x 50-rows/page absolute ceiling), so it now functions as a
pure backstop against a runaway bug rather than a real practical truncation point for any market
size actually observed. The politeness/time tradeoff from the previous pass still applies - scanning
a market this large takes real minutes, communicated via the live scan-progress status text.

**OA range was never actually a filter (2026-08-12, eleventh pass, v6.10.0)**: user asked to confirm
scanning only happens for "OA range and other filter numbers we have" - it turned out OA range
(`targetOA`, the sourced per-league target like Rookie 75-85) was ONLY ever used to color/label the
preview table's Match column (`mkMarketTable`'s ✅/⚠️/❌), never actually applied as a filter or used
to narrow the scan - a driver at OA 60 or OA 150 went through the exact same scan/filter path as one
at OA 80. Added `oaMin`/`oaMax` to `BASE_FILTER_FIELDS` (cheap - OA is already on every row, no scan
needed), pre-filled from `targetOA.min`/`targetOA.max` in `mkShortlistSection`'s `filterDefaults`
(same editable-not-fixed pattern as every other autofilled field). Since OA doesn't correlate much
with age/salary (which barely narrowed the Rookie market previously), this is a genuinely useful
free narrowing step before the expensive per-candidate scan runs.

**autoStart reverted (2026-08-12, twelfth pass, v6.10.1)**: v6.8.2's auto-run-on-load was explicitly
undone the same day the OA filter field landed - exact user words: "it shouldn't automatically start
the search. I should click on apply filters and THEN it starts... because I'll put in OA, salary
etc. which means [fewer] drivers... to scan." Auto-scanning immediately on page load meant the scan
already ran against default filter values before the user got a chance to tighten OA/salary first,
defeating the whole point of those being editable pre-scan narrowing fields. `wireScanFullStatsButton`
now called with `autoStart: false` from `renderMarketPage` - whole-market pagination
(`fetchRemainingMarketPages`) still runs automatically on load, only the scan+filter step now waits
for an explicit Apply Filters / Scan Full Stats click. If auto-run is ever wanted again, it needs to
default to the user's OWN last-edited filter values, not the raw sourced defaults, to avoid
reintroducing this exact complaint.

**Full-market crawl deferred until Apply/Scan, bounded by OA-min (2026-08-12, thirteenth pass,
v6.11.0)**: same-day follow-up to the autoStart revert above - even with autoStart gone, the page
was STILL eagerly crawling every market page on load before the user could touch the filter bar at
all (exact complaint: "I thought we said it'd be better and more efficient for me to choose the
filters first and then run the search?"). `renderMarketPage` now renders using only page 1 (live
DOM) + stale cache - genuinely partial, labeled as such ("N cached so far... set filters below, then
Apply/Scan to search the whole market"). The real crawl now happens inside a new
`ensureFullMarketFetched(sectionId, idKey, state, statusEl)`, called lazily from both
`applyFilterBar` and `runScanAndFilter` on their first invocation (`state.hasFetchedFullMarket`
guards against re-fetching on a second click). Bonus: `fetchRemainingMarketPages` now takes an
`oaMinCutoff` param - since GPRO returns market rows OA-descending, once a fetched page's rows are
ALL below the filter bar's current OA-min value, every further page can only be lower still, so the
crawl stops early. For a narrow OA band (e.g. Rookie's sourced 75-85) this can turn a 92-page crawl
into a handful of pages - real, meaningful savings, not just "wait for the click" cosmetics. Note:
`cheapFilteredRows`/`filterAndRenderMarket` must read `state.rows` (updated in place by
`ensureFullMarketFetched`), never the original `rows` closure param, which after this change is only
ever the small page-1-plus-cache snapshot from page load.

**OA range quick-select buttons (2026-08-12, fourteenth pass, v6.11.1)**: per explicit user request
+ screenshot of GPRO's own OA band bar ("60-, 61-70, 71-77, 78-85, 86-100, ... 201+", visible atop
`AvailDrivers.asp`/`AvailTechDirectors.asp`) - added `OA_RANGE_BANDS` (the same 15 bands) rendered as
clickable buttons above the `oaMin`/`oaMax` inputs in `mkFilterBar`, wired via new
`wireOaRangeBands(sectionId)` (called from `wireScanFullStatsButton`). Clicking a band just writes
into the same two underlying inputs (`data-filter-field="oaMin"`/`"oaMax"`) that already drive
filtering - it's a convenience UI layer, not a new filtering mechanism, so `cheapFilteredRows`/
`applyCustomFilters`/`ensureFullMarketFetched`'s OA-descending crawl cutoff all keep working
unchanged. The active band (if the current oaMin/oaMax exactly match one) is highlighted on render;
the sourced per-league default (e.g. Rookie 75-85) usually won't match any single band exactly, so
no highlight is the normal/expected state there - the inputs are still correctly pre-filled either
way.

**recruitmentScore direction bug fixed (2026-08-12, fifteenth pass, v6.11.2)**: user asked "what all
needs to be taken into account (talent as well)" about Top Pick still not feeling right. Talent was
already weighted correctly (priority 2, real weight in the sum) - the actual bug was that EVERY
attribute was normalized as "higher raw value = better fit," which is backwards for aggressiveness
and stamina, both documented "keep low" attributes (Rookie/Amateur targets `'0-49'`/`'0-45'` - high
values mean MORE tyre/parts wear). A driver with terrible (high) aggressiveness was scoring HIGHER
on that attribute than one with ideal (low) aggressiveness - actively rewarding the wrong drivers on
2 of the 8 weighted attributes. Fixed by threading `idKey` into `recruitmentScore` (both call sites
in `mkScoredTable`/`mkFullStatsTable` now pass it) and looking up each attribute's real direction
via `filterFieldsFor(idKey)` (the same `dir:'min'`/`'max'` the filter bar already uses), inverting
the normalized fraction for `dir:'max'` attributes. Known remaining gaps, not fixed here since they'd
need either a sourced weight (`reputation` has no numeric target in `D.driverSelection`, so it's
scraped/filterable but NOT scored) or live DOM verification (`row.retiring`/`row.natCode` are
referenced in `mkMarketTable`'s display template but `parseAvailListDOM` never actually sets them -
the 🕐 retiring-soon icon and nationality code have silently never rendered; unverified against a
live page, flag if revisited).

**Talent floor was wrong + no untrainability penalty (2026-08-12, sixteenth pass, v6.11.3)**: the
previous pass's claim that "talent was already weighted correctly" was incomplete - a live example
surfaced a Top Pick with talent=69 that a real player immediately flagged: "the higher the better
since you can't train this." Two real, sourced (not guessed) fixes: (1) `D.driverSelection.Rookie/
Amateur.attributes.talent.target` was `'60-150'`, directly contradicting that SAME entry's own note
("Naturally 200+ in most of the market - treat <150 as a red flag" for Rookie; "market median ~205"
for Amateur) - the 60 floor was a leftover market-median artifact from the 2026-08-10 recalibration
that never got reconciled with the note sitting right next to it. Fixed to `'150+'` (Rookie) /
`'200+'` (Amateur), matching each entry's own already-documented number - this also fixes the filter
bar's autofilled Talent minimum, previously far too permissive. (2) `recruitmentScore` had no
explicit talent-specific handling - a bad talent could still be "washed out" by strong scores on
other (trainable) attributes in the weighted average. Added a steep additive penalty (up to -45 at
talent=0, scaling to 0 at the 150 red-flag threshold) reflecting that talent is the ONE attribute
with zero training path - unlike concentration/techInsight/stamina which can be trained up after
signing, a bad talent pick is permanent, so it deserves to dominate the score rather than average
into it. No-op for TDs (no `talent` skill).

**Talent penalty scaled by age (2026-08-13, seventeenth pass, same v6.11.3)**: explicit user
request - "there's a difference between buying an older driver for a season or 2 for promotions vs
a younger one for the long run - younger one will need higher talent to reach that potential."
Talent's ceiling only pays off over a long development arc; an older driver reads as a more likely
short-term/promotion-push pick who won't be around long enough for that ceiling to matter. The
talent penalty above now tapers by age (full weight at ≤22, ~20% by 40+) rather than applying
uniformly - there's no way to read the manager's actual intent (rebuild vs. push-and-move-on) from
market data alone, so age is used as the best available proxy. Clearly a heuristic, not a verified
game mechanic - flagged as such in the code comment.

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
