# Architecture & Roadmap

Status log for the evolution from a single Tampermonkey userscript into a full GPRO companion
platform. Read this before starting a new iteration — it records what's real vs. scaffold, and
what the next pass should pick up.

## Current shipping product

`GPRO_Strategy_Tool.user.js` + `gpro-data.js` at the repo root. This is what users actually
install and what every change must keep working — see [CLAUDE.md](CLAUDE.md) for its house rules
(API budget, caching layers, versioning, etc). **Nothing in `packages/` is wired into it yet.**

## packages/ (scaffold, not yet consumed)

| Package | Purpose | Status |
|---|---|---|
| `core` | Domain types/models (track/driver/car/session), no I/O | empty stub |
| `calculations` | Pure deterministic engines: tyre strategy, car setup, parts wear, fuel, PHA | empty stub — target for extracting `.user.js`'s calc functions |
| `prediction` | Forecasting: driver progress, race outcome, career trajectory | empty stub |
| `ai` | LLM coaching/explanation layer over calculations+prediction, must degrade gracefully without a backend | empty stub |
| `ui` | Framework-agnostic view-model/section builders shared by userscript panel + future web app | empty stub — target for `mkSection`/`mkRow`/`mkRec`/etc |
| `api` | GPRO API client: auth, endpoints, budget enforcement, retry | empty stub — target for `apiGet`/`getDataSmart` |
| `storage` | Cache + settings behind one interface (GM storage today, swappable later) | empty stub |
| `simulation` | Monte Carlo race/season sim, financial/testing/car-dev simulators | empty stub |
| `analytics` | Historical explorers, transfer market valuation, sponsor optimization | empty stub |
| `userscript` | Tampermonkey entrypoint/adapters wiring the above into the live script | empty stub |
| `shared` | Zero-dependency utilities (money parsing, formatting) | empty stub — target for `parseGproCash` etc |

Each package has its own `package.json`/`README.md`; root `package.json` declares npm workspaces.
No build step exists yet — the userscript continues to be hand-maintained at the root until a
real extraction happens (see Migration strategy below).

## Migration strategy (do not big-bang this)

1. Extract pure, dependency-free logic first: `calculations` and `shared` (money parsing, wear/tyre/setup
   math) can be lifted out of `.user.js` verbatim with zero behavior change, since they take plain
   objects in and return plain objects out.
2. The userscript then `@require`s a bundled build of these packages (or, short-term, keeps a
   generated single-file copy in sync) rather than reimplementing the math twice.
3. `api`/`storage` extraction comes next, behind an interface the userscript backs with
   `GM_xmlhttpRequest`/`GM_getValue` and a future web app backs with `fetch`/IndexedDB.
4. `ui` extraction (shared section/table builders) only after the render-layer duplication
   identified in the 2026-07-19 pass (weather section, tyre table, setup table, copy button) is
   consolidated *inside* `.user.js` first — no point sharing a package that's still internally
   duplicated.
5. `ai`/`prediction`/`simulation`/`analytics` remain empty until `calculations`/`core` are real,
   since they all depend on having stable domain types to build against.

## AI-first principles (apply once `ai`/`prediction` have real content)

Every recommendation must: explain its reasoning, show a confidence figure, state its
assumptions, compare at least one alternative, stay deterministic wherever the underlying
calculation allows it, and fall back cleanly to non-AI output when no AI backend is configured.
This mirrors the pattern already used for GAPP-vs-calibrated-vs-own-formula in the tyre/setup/wear
calculators — extend it, don't replace it.

## Deep-dive review #5 (2026-07-19) — Testing.asp research exhausted, real league detection found

- **Testing.asp decay formula, final answer**: searched the web and fetched the **official GPRO
  wiki** directly (`wiki.gpro.net/index.php/Testing` and `.../Car_Character_Points`) - the
  authoritative source, not a community guess. Confirmed the conversion pipeline (Test Points →
  R&D Points → Engineering Points → Car Character Points, landing over the next races, facility
  levels affecting conversion *ratio* at each stage) but the wiki **explicitly states**: "The
  conversion from Test Points into CCPs depends on a number of factors which you will have to
  investigate" - i.e. even GPRO's own wiki won't give the formula; it's deliberately opaque/
  empirical. Combined with GAPP having zero testing data and gpro-pitwall's decay factor being
  config-injected (not in its public repo), this is now checked against **four independent
  sources** with the same result. Also checked `gpro-public-api.yml`'s `TestingResponse` schema
  for a raw "test points earned" field to at least show *something* real without projecting - none
  exists (`/Testing` returns stint lap times/comments/current setup, all already used by
  `calcFuelSimple`, but no points counter). **Conclusion: this TODO is definitively closed as
  not buildable without insider/reverse-engineered knowledge this project doesn't have** - not
  "needs more research," genuinely blocked by GPRO's own design choice to keep it opaque.
- **Real league detection, finally unblocked**: grepped `gpro-public-api.yml` for a league/group
  response field (as opposed to the `Group`/`StaffGroup` *query* parameters already known from the
  market endpoints) and found `MenuResponse.group` (e.g. `"Rookie - 31"`) plus `groupShort`/`class`
  on the `/Menu` endpoint. Splitting on `" - "` gives the league name in the exact casing
  `D.leagues`/`D.risks`/`D.facilityTargets`/`D.staffPriority`/`D.driverSelection` already key by -
  no abbreviation-guessing needed. This is the prerequisite the multi-league TODO was blocked on.

## Deep-dive review #4 (2026-07-19) — GAPP confirmation + own dead-data audit

- Confirmed via `github.com/Jadax/gapp`'s `data.py` (raw source, searched for "test" - zero
  matches) and its own README feature list (Setup/Strategy/Wear/PHA calculators only) that GAPP
  has no testing/decay data whatsoever. This closes out the Testing.asp TODO's research angle -
  there is no verified source for those constants in any of our reviewed references, GAPP included.
  It stays explicitly unimplemented.
- Since the "use our past data" instruction pointed back at `gpro-data.js` itself, audited every
  top-level `GPRO_DATA` key for actual usage in `.user.js` (simple grep-per-key) rather than assume
  the iteration-4 cleanup caught everything. Found:
  - **`D.phaContrib`** (GAPP-verified Power/Handling/Accel-per-level-per-part table, confirmed
    2026-07-17) was computed and stored but **never rendered anywhere**. Added as a collapsible
    "PHA Contribution per Level" reference table on the Car Advisor page (`renderUpdateCar`) - this
    is the exact "reference table... one click away" feature gpro-pitwall's README calls out for
    its Car Wear panel.
  - **A real, live bug**: `lookupSeasonTrack()` returns `{name, ...GPRO_DATA.tracks[name]}`, but
    `GPRO_DATA.tracks` entries have no `wearIntensity` field - only the rarely-hit hardcoded
    `SEASON_TRACKS` fallback object did. Every caller reading `stData.wearIntensity` (the Car
    Advisor page's per-track wear context line) was silently getting `undefined` whenever
    `GPRO_DATA` loaded normally (i.e. always, in practice) - rendering "undefinedx intensity".
    Fixed by merging in `GPRO_DATA.trackWearIntensity`, a *separate* table that was itself sitting
    completely unused with the exact values needed.
  - **`trackFuelConsumption`/`trackTyreWear`**: confirmed byte-identical to the `fuel`/`tyre`
    fields already on each `tracks` entry (which is what's actually read) - true orphaned
    duplicates with no gap to fill, unlike `trackWearIntensity`. Deleted.
  - **`D.driverSelection`** (community-consensus driver-attribute recruiting priorities per
    league, with `targetOA`/prioritized attribute targets/budget notes) was completely unused.
    `/AvailDrivers`' list view doesn't return per-driver attribute breakdowns, so it can't score
    individual market rows, but it's a perfect "what to look for" checklist for the Driver Market
    page added last iteration - wired in as a collapsible reference there.
  - **`D.leagues`/`D.facilityTargets`/`D.staffPriority`** (Rookie/Amateur/Pro/Master/Elite caps,
    facility targets, and staff training priority - all genuinely different per league, not
    duplicates) remain unused. This is a real, scoped future feature (see TODOs) - the whole tool
    is currently Amateur-hardcoded throughout (`STAFF_SKILLS`/`FACILITY_TARGETS`/`LEAGUE_TARGETS`
    all assume Amateur), and making it league-aware means detecting the user's actual league from
    the API and threading it through several calculators, not a quick wire-up. Not attempted this
    iteration - recorded precisely instead of quietly implemented halfway.
  - `D.seasons` (S111 track list) and `D.wearAlerts` (matches existing `.user.js` constants
    `FAST_ALERT`/`SLOW_ALERT`/`CRITICAL_WEAR` exactly) reviewed and left as-is - genuinely inert
    metadata / harmless pre-existing duplication, not worth further surgery this pass.

## Deep-dive review #3 (2026-07-19) — SponsorAdvisorService + gpro-public-api.yml market endpoints

- Read the full disclosed source of `gpro-pitwall`'s `SponsorAdvisorService.php` (135 lines,
  public). Its own docstring: the 5-negotiation-question → answer mapping is "user-supplied,
  cross-checked against in-game text" - i.e. a community-derived heuristic, not a secret/paywalled
  formula, same status as the `RiskAdvisorService` heuristic already ported in earlier iterations.
  Reimplemented independently (not copied) as `calcSponsorAnswerAdvice()`, wired into
  `renderSponsorOverview` for any negotiation GPRO's own `attention` flag marks as needing a
  response - one extra `/NegotiateSponsor?id=` API call per flagged negotiation, bounded by GPRO's
  own `maxNegotiations` (typically ≤5).
- Grepped `gpro-public-api.yml` for driver/TD market endpoints (unblocking TODO #3 from iteration
  6): found `/AvailDrivers` and `/AvailTDs` - real, symmetric endpoints returning name/OA/age/
  salary/signFee/offers per candidate. Extensive skill/range filter params exist on both but are
  GPRO-Supporters-only per the spec, so built against the default (unfiltered) response only rather
  than assume filter access. No TD-specific market gap found - `/AvailTDs` covers the TD side
  gpro-pitwall's `RecruitmentService`/`IdealPilotService` and GPRO Hub's "Driver & TD Market" both
  do.
- Added `renderMarketOverview()` (new "Driver & TD Market" menu command) - two tables from
  `/AvailDrivers` + `/AvailTDs`, plus a "Value" column (OA per $1M salary) that's plain arithmetic
  over already-returned fields, not a game-mechanic estimate - kept clearly distinct from the
  sponsor-advice feature's "heuristic, not confirmed" labelling since this one really is just math.

## Deep-dive review #2 (2026-07-19) — gpro-pitwall's src/Service/ inventory

Browsed `github.com/Jadax/gpro-pitwall`'s actual service-class list (`src/Service/`, ~34 files) for
a concrete feature inventory beyond the README, and read the full source of
`TestingProjectionService.php` (public, disclosed) since it's the exact "Car Test Points" gadget
this project's TODO list has been carrying. Findings:

- **Confirms our existing ports are the right shape**: `PhaMatchService`/`RiskAdvisorService`
  correspond to our already-ported `calcPhaMatch`/`calcDriverStrategyRecommendation`. No changes
  needed there.
- **`TestingProjectionService`**: publicly readable, ~80 lines, algorithm is fully disclosed -
  Test Points → R&D → Engineering → Car Character decay over 3 races (`decayFactor ** 3`), scaled
  per 5 test laps, capped at 100 laps/session. **However** the actual numeric `priorityPoints`
  table and `decayFactor` value are injected via constructor from elsewhere in the app (a config
  file not in this public repo) - the *shape* of the formula is public, the *numbers* are not.
  We have no verified source for those numbers (checked `gpro-data.js` - nothing testing-related
  exists there, GAPP doesn't cover testing either). Per this project's rule against inventing
  unverified formula constants, **not implementing this** rather than guess at a decay factor or
  priority-points table. This also still requires `Testing.asp` DOM parsing, which has no `@match`
  in this script at all - a bigger lift than "port a disclosed algorithm." Recorded as a real,
  scoped future task (needs either GPRO wiki research for the actual numbers, or dropping the
  projection and just showing raw current test points from the API) rather than left vague.
- **Found via the same service list**: `SponsorAdvisorService` exists in gpro-pitwall but its
  behavior isn't visible from the file list alone (didn't fetch its source - out of budget for
  this pass). Cross-checked our own `gpro-public-api.yml` instead for what's actually buildable
  without their private logic (see below) - built a sponsor feature grounded in verified public API
  schema, not a guess at their implementation.
- **`RecruitmentService`/`IdealPilotService`/`TrainingAdvisorService`**: confirm the "Driver &
  TD Market" (GPRO Hub) and "OA driver + Training" (gpro-tools.eu) feature areas are real,
  validated market patterns, not just marketing copy - still on the long-term roadmap, not
  attempted this iteration (need the driver-market API endpoints scoped first, see TODOs).

## Competitive review (2026-07-19)

Reviewed live (no code copied — feature/UX reference only):

- **gprohub.net** — account-gated web app. Marketing page lists: Car Setup Calculator, Race
  Strategy Planner, Race Calendar, Data Sync (auto-import from GPRO.net), Driver & TD Market,
  Sponsor Advisor. Confirms our roadmap's "Driver Search"/"Sponsor Optimizer" items are the right
  scope; nothing seen here we don't already cover or plan to.
- **gproanalyzer.info** — the differentiator is a huge crowd-sourced database (282k+ race
  analyses, 13k+ drivers) searchable by weather forecast, used to find comparable historical races
  ("Race Strategy Analysis", "Q1/Race Risk Analysis" under their paid "Database Plus" tier). Their
  free "Gadgets" list also has several single-purpose calculators we don't have yet: **Wing Split**,
  **Time Lost Due To FLD/TCD**, **Time Gain Due To CTR**, **Car Test Points**, **Driver Influence
  Analysis**, and season-level rollups (Season CTR/PHA/Weather/Car Wear/Fuel/Tyre Wear). We have no
  equivalent historical database and shouldn't try to build one (out of scope — needs a server and
  years of crowd-sourced data); the individual gadget-style calculators are realistic additions.
- **gpro-tools.eu** — a "Total setup" combined view (setup + fuel + wear + strategy in one place,
  which our panel already does per-page) and a "Driver info" tool that estimates a driver's
  *current* hidden attributes from their publicly-visible history over time — a genuinely novel
  idea worth a future `analytics`/`prediction` package feature, not implementable from a single
  page load though (needs periodic background capture accumulated over weeks).
- **github.com/Jadax/gpro-pitwall** (same author lineage as our GAPP port) — the most directly
  useful reference. Key UX patterns adopted this iteration: a **plain-language "Race Engineer"
  narrative** over the existing risk-dial numbers (their example: *"overtaking... is hard, so I'd
  push overtake up to 60... grip here is low... I've shaved both numbers"*) and a **"Push or
  hold?" checklist** that turns several independent signals (PHA match, tyre confidence, wear
  headroom) into one aggregate read for how much CTR risk to carry. Also noted for later: a
  **decision-summary board** (one verdict tile per card, jumps to the full card) and **PHA match
  badges** (top/perfect rank alignment) as the front page of their Cockpit — we now compute PHA
  match (`calcPhaMatch`) as an input to Push-or-Hold, but don't yet surface it as its own badge or
  build a summary-tile board across sections; both are good next-iteration UI work. Their
  verdict-first, source-disclosed writing style is exactly what our `mkTyreSourceNote`/
  `mkGappStopsCrossCheck` already do — validates keeping that pattern rather than changing it.

## Iteration log

### 2026-07-19 — Iteration 19 (StrategyService + PartSwapAdvisorService reviewed)

- **`StrategyService.php`** (the tyre/fuel strategy calculator, most directly comparable to
  `calcTyreStrategyGapp`): mostly independent confirmation, not new numbers - the redacted
  `secrets.php` still hides the actual per-driver/car coefficients, but two disclosed constants in
  this file **already match ours exactly**: the TCD formula's `0.00018` constant (identical to our
  `gapp.compoundCalcConstant`) and the Rain wear modifier `0.73` (identical to our `wetFactor: 0.73`
  for Rain). Strong independent validation that our GAPP port is correct on both.
- **Found and fixed a real gap**: `StrategyService` clamps pit time to `max(15.0, $pitTime)` - a
  sanity floor on the game itself, not tied to either project's specific coefficients. Our
  `calcTyreStrategyGapp` had no equivalent floor. Added `Math.max(15, ...)` around the per-stop pit
  time calculation.
- **`PartSwapAdvisorService.php`**: this is a materially richer system than our current
  `analyzeCar` upgrade recommender - it re-projects every GPRO-offered option through the wear
  formula, classifies each by post-swap PHA tier (via `PhaMatchService::tierFor`, not just cost/
  survival), and presents up to **4 named slots** (free_downgrade / downgrade / sidegrade / upgrade)
  per flagged part instead of one single pick. It also filters options against a peer group's
  observed car-level "operating band" (`GetMoneyLevels`-sourced, min-1..max+1) that we have no
  equivalent data source for. **Not rewritten this iteration** - this would be a substantial rework
  of a working, already-good recommendation system, not a small faithfulness fix, and doing it
  properly needs the peer-group data question resolved first. Recorded precisely in TODOs rather
  than attempted piecemeal.
- Verified with `node --check`; bumped `@version` to `3.25.0` (`gpro-data.js` untouched).

Still unreviewed: `PartUpgradeAdvisorService`, `TrainingAdvisorService`, `IdealPilotService`,
`RecruitmentService`, `TestingTargetsService`, `PilotCalculatorService`, `InsightService`.

### 2026-07-19 — Iteration 18 (continued gpro-pitwall source review: SetupCalculatorService, CarWearService, BoostFuelService)

Continued fetching real current source (not README) for the remaining high-value services:

- **`SetupCalculatorService.php`**: confirmed the `special_track_mult` default of `0.39` for
  Indianapolis Oval/Rafaela Oval (already ported) is correct, and the overall formula *shape*
  (talent-driven wings/engine/brakes, concentration-driven gearbox, experience+weight-driven
  suspension with a wet-only tech-insight term, wing split from talent+level+temp) independently
  matches our GAPP-derived `calcCarSetupGappSession` structurally. The actual numeric coefficients
  are still redacted in a `secrets.php` this repo doesn't include - nothing new to port, but real
  confirmation our GAPP port has the right shape.
- **`CarWearService.php`**: same story for the race-wear formula shape (`driverFactor =
  concentration^c * talent^t * experience^e`, `end = trackBase * levelFactor^risk *
  driverFactor`) - matches our `gappPartRaceWear`/`calcDriverWearFactor` exactly in form. **But
  found one fully-disclosed, usable constant**: `TESTING_WEAR_FACTOR = 0.53` (their own comment:
  calibrated against two real testing sessions, a 30-lap and a 100-lap run, both best-fitting
  ~0.533) for `testingWearRates()` - testing wears the car at roughly half the full-race per-lap
  rate, no risk/level exponent (testing has no clear-track risk). Added `calcTestingWearPerLap()`
  using this exact factor against our own already-loaded GAPP wear data, and a new "Testing Wear"
  section in `renderRaceSetup` (shown only when a real testing session with laps done exists, at
  whichever track the testing happened at - can differ from the race track).
- **`BoostFuelService.php`**: confirmed boost-lap fuel cost is a **real disclosed GPRO formula**
  (`extra_fuel = ROUNDUP(boost_laps * lap_length_km * a per-track dry/wet coefficient)`), not a
  heuristic - genuinely different status from most of what we've ported. However the per-track
  coefficient itself isn't available from any source checked (not in GAPP's `trackData` columns,
  not disclosed in this file either - it's presumably in the same redacted `secrets.php`). Rather
  than leave the existing vague "budget a few extra litres" reminder unexplained forever, updated
  it to state plainly that this is a real formula we can't compute a number for, and why.
- Verified with `node --check` after each change; bumped `@version` to `3.24.0` (`gpro-data.js`
  untouched).

Still unreviewed from the full `src/Service/` list (34 files): `PartSwapAdvisorService`,
`PartUpgradeAdvisorService`, `TrainingAdvisorService`, `IdealPilotService`, `RecruitmentService`,
`TestingTargetsService`, `StrategyService`, `PilotCalculatorService`, `InsightService` - worth
continuing this same source-verification pass on the next iteration rather than assuming the ones
checked so far are representative of all of them.

### 2026-07-19 — Iteration 17 (gpro-pitwall faithfulness pass — real source, not README)

The user flagged directly: had the RiskAdvisorService/PhaMatchService ports actually been checked
against gpro-pitwall's real, current source, or just its README description? Honest answer: the
latter, for these two. Since it's an actively-maintained project (unlike GAPP), that's a real gap.
Fetched the raw source of `RiskAdvisorService.php`, `PhaMatchService.php`, and
`WearAdvisorService.php` directly and compared line-by-line against our ports:

- **`calcDriverStrategyRecommendation`'s formula and constants were already exactly faithful** -
  every constant (`OVERTAKE_BASE`/`DEFEND_BASE`/`GRIP_FACTOR`/`TYRE_WEAR_FACTOR`/
  `ATTRIBUTE_SCALE`/`RAIN_WATCH_THRESHOLD`/`SHORT`/`LONG_RACE_KM`/`MIN`/`MAX_RISK`/
  `PROBLEM_LAP_LOSS`/`PROBLEM_REPAIR_TIME`) matches the real source exactly. No changes needed.
- **`mkRaceEngineerNarrative` was noticeably thinner than the real `phrase()` method** - ours only
  covered 4 threshold-based bits (overtake tier, defend tier, grip, long-race); the real source has
  a **per-rating-tier lead sentence** (distinct wording for Very Easy/Easy/Hard-Very Hard/Normal,
  not just a magnitude threshold) plus an **ordered caveat list capped at 2** (wet-race talent
  tiers, rain-watch, grip, aggression-gap, tyre-wear-very-high, long-race-stamina, falling back to
  a confidence/ceiling read when nothing else applies). Rewrote it to match that structure
  (reimplemented independently in JS, not copied).
- **Two entirely missing pieces found and added**: `calcStrategyTip()` (pit-count tie-breaker
  advice - "take fewer stops when passing is hard, more stops OK when passing is easy") and
  `calcDistanceTip()` (race-distance-vs-driver-energy narrative, shown only for the short/long
  tails) - both real `RiskAdvisorService` methods (`strategyTip()`/`distanceTip()`) we simply
  hadn't ported at all. Wired into `renderRaceSetup`'s Driver Strategy section.
- **`calcPhaMatch` had a real correctness bug**: it ranked attributes via `Array.sort()`, which is
  wrong on ties - two equal PHA values (e.g. a fresh car at 6/6/6) get an arbitrary, unstable order
  from `sort()`, so "perfect" match could silently misfire. `PhaMatchService::matchLevel()`'s real
  algorithm uses **competition ranking** (ties share a rank) and explicitly only calls something
  'top' when the track has a single unambiguous #1 that coincides with the car's single #1 - a
  tied #1 on either side can only ever be 'perfect', never 'top'. Rewrote `calcPhaMatch` to match
  this exactly.
- **Added a one-line severity headline** to the Car Advisor's parts table (`renderUpdateCar`),
  matching `WearAdvisorService::headline()`'s concept ("All parts will finish comfortably." / "2
  parts will not survive the race - swap them.") - built from the `willFail`/`atRisk` flags already
  computed, not a new wear calculation.
- Verified with `node --check` after each change; version was already bumped to `3.23.0` for this
  batch (`gpro-data.js` untouched).

**Takeaway for future research passes**: for an actively-maintained reference project, always fetch
the actual current source before porting/trusting a description of it - a README or an earlier
session's summary can go stale or was never fully accurate to begin with. GAPP is unmaintained, so
that risk is lower there, but gpro-pitwall changes; treat every prior port from it as "verify
against source, don't assume it's still accurate" rather than settled.

### 2026-07-19 — Iteration 16 (repo pushed to GitHub, AI Coaching extended to Qualify)

- **First git history**: this project had no `.git` until now. Initialized, added a `.gitignore`
  (excludes `.claude/` local tool settings - never project config), committed everything as of
  v3.21.0, and pushed to `https://github.com/Jadax/gpro-advisor` (repo created by the user; the
  push itself needed explicit per-session confirmation - pushing to a remote is treated as a
  visible/shared-state action, not something to do on a standing instruction alone). Going
  forward: version bump + `node --check` + ARCHITECTURE.md entry + commit + push is the per-
  iteration pattern, same rigor as before, now with actual version control backing it.
- **AI Coaching extended to `renderQualify`** (Q1/Q2 pages) - same opt-in, click-to-fetch,
  transparency-block pattern as `renderRaceSetup`, with a track+session-scoped cache key so Q1/Q2
  (which can have different weather/tyre calls for the same track) don't collide.
- **Extracted `wireAiCoachButton(btnId, outId, context, cacheKey)`** - the click-handler/cache-
  check/transparency-block sequence was about to become copy-pasted a second time (Qualify +
  RaceSetup); pulled out into one shared function instead and had `renderRaceSetup`'s original
  inline version call it too, so there's exactly one implementation of "wire an AI Coaching
  button" now, not two near-identical ones.
- Verified with `node --check`; bumped `@version` to `3.22.0` (`gpro-data.js` untouched).

### 2026-07-19 — Iteration 15 (AI Coaching hardened: current model, richer context, transparency, key test)

Follow-up pass on iteration 14's AI Coaching feature (user asked to log into gprohub.net for
further research - declined per this project's hard rule against ever entering passwords into a
form, even the user's own credentials pasted directly in chat; flagged that the password is now
in the chat transcript and suggested rotating it. Redirected the remaining effort into hardening
what's already built instead):

- **Model updated**: `claude-3-5-haiku-20241022` → `claude-haiku-4-5-20251001` - the prior string
  was already stale relative to Anthropic's current model family.
- **Prompt rewritten** to explicitly satisfy this doc's own AI-first principles instead of just
  asking for a generic note: now asks for a confidence read (low/medium/high + what would change
  it) and one concrete alternative worth weighing, not just an interpretation of the numbers.
- **Context enriched**: `aiCoachContext` now also includes the PHA match verdict and Push-or-Hold
  signal (recomputed cheaply, same pattern as the decision board doing the same twice already) -
  previously only weather/tyre/driver-risk/CTR were sent, missing two signals already computed and
  shown elsewhere on the same page.
- **"Test key" button** added to Settings - tests the in-progress (possibly unsaved) key value
  directly via `callAiCoach`, without needing to navigate to RaceSetup.asp first to discover a
  typo or bad key.
- **Full transparency block** ("What was sent to the AI", a `<details>` dump of the exact context
  object) added under every AI result - satisfies the AI-first "display assumptions" principle
  literally, and can never drift out of sync with the real request since it renders the same object
  `callAiCoach` stringifies.
- Verified with `node --check`; bumped `@version` to `3.21.0` (`gpro-data.js` untouched). TODO #0
  (verify end-to-end with a real key) still stands - none of this iteration's changes were
  live-tested either, for the same reason as before.

### 2026-07-19 — Iteration 14 (Priority 2: first real AI-first feature — opt-in AI Coaching)

The first real (not scaffold) piece of Priority 2: an optional LLM coaching layer over the
already-deterministic Race Setup recommendations, matching the AI-first principles this document
already committed to (explain reasoning, deterministic fallback, graceful degradation without AI).

- **`callAiCoach(context)`** — POSTs a compact, already-computed context object (track, weather
  verdict, tyre choice + source, driver risk dials, CTR) to Claude (`claude-3-5-haiku-20241022`
  via the Messages API) for a short (3-5 sentence) coaching paragraph. Never throws - returns
  `{text}` or `{error}`, so a missing/bad key just means the button's result area shows an error,
  nothing else on the page is affected.
- **Entirely opt-in and user-triggered**: nothing calls this unless the user pastes their own
  Anthropic API key into Settings (new field added to `showTokenModal`, stored via
  `getAiKey`/`setAiKey`, GM storage same as the token/CTR already there). The "🤖 Get AI Coaching"
  button only renders on the Race Setup page's Driver Strategy section when a key is configured,
  and only fires the API call on click - never automatically, so it never spends the user's own
  API credits without them explicitly asking each time. Response is cached per track via the
  existing short-lived `getCachedData`/`setCachedData` (same `CACHE_TTL` as everything else) so
  re-opening the panel for the same race doesn't re-spend.
- Added `@connect api.anthropic.com` to the userscript header (required for `GM_xmlhttpRequest` to
  reach it - Tampermonkey's connect declarations are how it decides which cross-origin hosts a
  script may reach).
- **Explicit, honest caveats** (recorded here rather than glossed over):
  - **Not end-to-end tested** - this environment has no way to hold a real Anthropic API key and
    click through Tampermonkey on live gpro.net, so the request/response wiring is written
    correctly against Anthropic's documented Messages API shape but hasn't been verified against a
    real key. Test with a real key before relying on it; the error path (`{error: ...}`) should
    surface anything wrong (bad key, wrong header, model name) rather than fail silently, but
    confirm that in practice.
  - **Cost is the user's own** - every click spends their own Anthropic API credits. The
    click-to-fetch + per-track caching design exists specifically to keep this predictable and
    opt-in, not to hide the cost.
  - **Model name** (`claude-3-5-haiku-20241022`) may drift out of date - if Anthropic deprecates it,
    the error path will surface an API error; update the model string when that happens rather than
    guessing at a replacement in advance.
  - `packages/ai` (Priority 2 scaffold) still isn't where this code lives - kept directly in the
    userscript per the migration strategy (don't extract into a package before a second consumer
    of the same logic exists).
- Verified with `node --check`; bumped `@version` to `3.20.0` (`gpro-data.js` untouched).

### 2026-07-19 — Iteration 13 (systematic dead-function sweep, historical track data resurfaced)

Ran a systematic check this time (every `function` declaration vs. its reference count) instead of
spot-checking individual `GPRO_DATA` keys, to catch what earlier passes missed:

- **`lookupTrackHistory`/`lookupTrackInsight` were completely unused** despite wrapping genuinely
  valuable data: `D.trackHistory`/`D.trackInsights` are real GPRO-Analyzer-sourced crowd-sourced
  success-rate data (overtaking/defending/clear-track/malfunction success % by league, at Spa GP
  currently - more tracks need screenshots to add). This is a much better-grounded source for
  risk-related context than the ambiguous `D.risks` table iterations 10-11 correctly avoided
  wiring in. Added as a collapsible "Historical cross-check" note in `renderRaceSetup`'s Driver
  Strategy section (gracefully absent for any track other than Spa GP right now) - explicitly kept
  separate from the risk-dial numbers above it so the two aren't mistaken for the same claim.
  `renderRaceSetup` now also detects the real league (via `/Menu`, same pattern as other pages) to
  pass into this lookup.
- **`calcHappyRange` was computed but never rendered** - a real, distinct calculation (per-part
  setup tolerance driven by driver experience/tech insight) from `calcMarginOfAcceptance` (a single
  overall number), matching gproanalyzer.info's "Driver Happy Range" gadget. Added as a compact
  reference line under the Car Setup table on both `renderQualify` and `renderRaceSetup`.
- **`getUpgradeCost`/`calcDowngradeWear`/`mkBar` were genuinely dead**, not missed features:
  `calcUpgradeCostExact` + real DOM-scraped cost/wear values (straight from UpdateCar.asp's own
  dropdown text) already supersede the first two; `mkBar` lost its only caller when `phaFromParts`/
  `phaSection` were deleted as dead code back in iteration 8. All three removed.
- Verified with `node --check`, then re-ran the same function-reference-count sweep to confirm zero
  remaining unreferenced functions; bumped `@version` to `3.19.0` (`gpro-data.js` untouched).

### 2026-07-19 — Iteration 12 (decision boards extended, market league bug, drift-estimator storage)

- **Decision board coverage** extended to `renderSponsorOverview` (Car Spots filled ratio,
  Negotiations count/attention) and `renderMarketOverview` (drivers/TDs listed) - both now use
  `mkDecisionBoard`/`wireDecisionBoard` the same way `renderQualify`/`renderRaceSetup` already did.
- **Found and fixed another real bug while touching `renderMarketOverview`**: its "What to look
  for" league checklist (added iteration 8) read `GPRO_DATA.currentLeague` - the static hardcoded
  `'Amateur'` string - instead of the real `detectLeagueFromMenu()` detection that's existed since
  iteration 9. Every non-Amateur user was silently getting Amateur's recruiting checklist. Fixed by
  fetching `/Menu` alongside the market data and using the real league, falling back to the static
  string only if detection fails.
- **Started the driver attribute-drift estimator's storage foundation** (`appendDriverSnapshot`,
  `DRIVER_HISTORY_MAX = 60`): every `DriverProfile.asp` visit now persists a dated snapshot to
  `gpro_driver_history_<driverId>`, keyed by whichever driver is actually being viewed (own or
  scouted - safe to do now that the iteration-11 cache-corruption fix stops a scouted visit from
  polluting the account's own `/DriProfile` cache). Deliberately storage-only: no drift
  *prediction* is built on this yet, since that needs a real methodology this project doesn't have
  yet, not a guess - but the data has to start accumulating before that can ever exist.
- Verified with `node --check`; bumped `@version` to `3.18.0` (`gpro-data.js` untouched).

### 2026-07-19 — Iteration 11 (D.risks researched further, a real cache-corruption bug found and fixed)

- Searched further on the `D.risks`/`calcDriverStrategyRecommendation` ambiguity from iteration
  10: found a real GPRO Rookie risk-setting example ("overtaking 25, hold position 25, clear track
  30, car failure 10") that doesn't match `D.risks.Rookie` (`{max: 0, note: 'Zero risks
  recommended...'}`) closely enough to be confident they're describing the same guidance. This
  **reinforces** the decision not to wire `D.risks` into the risk-dial clamp - two different
  searches now show it's genuinely ambiguous, not just under-researched. Left alone; noted in
  TODOs with the new finding for whoever revisits it.
- **Found and fixed a real, currently-exploitable bug while thinking about driver profile
  visits**: `runPassiveCapture()`'s `DriverProfile.asp` branch scrapes *whatever driver profile is
  currently open* and writes it to the single generic `/DriProfile` stale-cache slot - the same
  slot every Q1/Q2/RaceSetup calculation reads assuming it's always the account's own driver.
  `DriverProfile.asp?ID=N` can show *any* driver's profile, and the new Driver Market page
  (iteration 7) actively encourages clicking into other drivers to scout them - visiting a scouted
  driver's profile would have silently overwritten the account's own cached driver attributes with
  someone else's, corrupting every setup/tyre/wear calculation that depends on driver stats until
  the next real API refresh. Fixed by comparing the URL's `?ID=` against the last-known own driver
  ID (from `/Office`'s stale cache) before writing - only caches when it's confirmed to be the
  account's own profile.
- Now that visiting another driver's profile is safe, wired the previously-unused `idKey` param in
  `mkMarketTable` to link driver names to `DriverProfile.asp?ID=` in the Driver & TD Market page
  (TD names left unlinked - no TD profile page parser/`@match` exists to make that link useful yet).
- Verified with `node --check`; bumped `@version` to `3.17.0` (`gpro-data.js` untouched).

### 2026-07-19 — Iteration 10 (multi-league threading completed, one more real bug fixed)

Completed TODO #1 (multi-league calculator threading) properly rather than piecemeal:

- **`analyzeCar`** now accepts a `league` param and uses `getLeagueCarTargets(league)` (real
  per-league part-level targets from `D.carTargets`, falling back to the old Amateur-only
  constant when the league is unknown) instead of the module-level Amateur-only `LEAGUE_TARGETS`.
  `renderUpdateCar` detects the league via `/Menu` and passes it through; the Cash section header
  and league notes are now shown (e.g. "Cash (Pro league targets)").
- **`renderStaff`** (already given league detection in iteration 9) now actually *uses* it:
  - Staff training priority order comes from `D.staffPriority[league]` when available (matters
    mainly for Rookie, which trains fewer skills; the other four leagues share Amateur's order).
  - Facility targets come from `D.facilityTargets[league]` (matched by label, since that table has
    no `key` field), and the facility bar's max-width scale and footer text now use the real
    `D.leagues[league].facilityMax` instead of a hardcoded "L40" (was silently wrong for anyone
    above Amateur).
  - **Found and fixed a second real bug in the process**: the Training Priority section hardcoded
    "Training to 20..." regardless of the account's *actual* average facility level, even though
    the page already computes the correct value (`maxTraining`, from `avgFacLevel`) - just further
    down, in an unrelated "Training Level" section, never reused. Moved that computation up and
    wired it into the Training Priority loop instead of the hardcoded 20. This was wrong for
    Amateur users too, not just other leagues - a real, pre-existing bug, not a Rookie/Pro/etc-only
    gap.
- Deliberately did **not** touch `calcDriverStrategyRecommendation`'s risk clamp
  (`RISK_MIN`/`RISK_MAX`) using `D.risks[league]` - that table's semantics (CTR guidance vs. the
  overtake/defend risk dials) weren't clear enough to be confident they're the same mechanic, and
  misapplying league risk-ceiling data to the wrong game system would be worse than leaving it
  alone. Recorded as a TODO with the ambiguity spelled out rather than guessed at.
- Verified with `node --check`; bumped `@version` to `3.16.0` (`gpro-data.js` untouched).

### 2026-07-19 — Iteration 9 (Testing.asp research closed, real league detection shipped)

- Closed the Testing.asp TODO for good (see Deep-dive review #5) - checked the official GPRO wiki
  directly via `WebSearch`/`WebFetch`, confirmed the conversion formula is deliberately
  undocumented even there. Not attempting a "scoped-down" version either since `/Testing`'s schema
  has no raw test-points-earned field to show even without projecting - there's genuinely nothing
  further to build here without reverse-engineering the game itself.
- **Added `detectLeagueFromMenu(menu)`** - real league detection from `/Menu`'s `group` field
  (`"Rookie - 31"` → `"Rookie"`), finally unblocking the multi-league TODO's prerequisite.
- Wired it into the Staff & Facilities page only (the most natural home): `renderStaff` now takes
  a `league` param and shows a **"League: X"** context section (driver OA cap, facility level cap,
  TD-allowed, typical CTR risk ceiling, league description) from the previously-unused
  `D.leagues`/`D.risks` tables - informational only, doesn't change any existing calculation or
  target table, so no risk of showing wrong-league data confidently for calculations that are
  still Amateur-specific (`STAFF_SKILLS`/`FACILITY_TARGETS`/`LEAGUE_TARGETS`). Full multi-league
  threading through those calculators remains a separate, bigger TODO - this iteration only shipped
  the detection + a safe, purely-informational use of it, deliberately not the whole feature.
- Added `/Menu` to the "Clear Cache" endpoint list.
- Verified with `node --check`; bumped `@version` to `3.15.0` (`gpro-data.js` untouched this
  iteration, no cache-buster bump needed).

### 2026-07-19 — Iteration 8 (dead-data audit, one real bug fix, two features from unused data)

- Confirmed via GAPP's raw `data.py` that the Testing.asp TODO has no available real numbers
  anywhere reviewed - stays unimplemented, now with that research angle fully closed rather than open.
- **Fixed `lookupSeasonTrack()`'s missing `wearIntensity`** (see Deep-dive review #4) - a real,
  currently-live bug (Car Advisor page showed "undefinedx intensity"), fixed by merging in the
  previously-unused `GPRO_DATA.trackWearIntensity` table instead of inventing new data.
  Reproduces the same "made dead data useful instead of just deleting it" pattern as the PHA
  contribution table below - two different findings on the same page, treated the same way.
- **Added a "PHA Contribution per Level" reference table** to the Car Advisor page from
  `D.phaContrib`, which was computed/verified but never rendered anywhere.
- **Added a "What to look for" driver-recruiting checklist** to the Driver & TD Market page from
  `D.driverSelection`, likewise unused until now.
- **Deleted `trackFuelConsumption`/`trackTyreWear`** from `gpro-data.js` - confirmed exact
  duplicates of `tracks[name].fuel`/`.tyre`, no gap-filling value unlike `trackWearIntensity`.
- `gpro-data.js` changed this iteration, so bumped both `@version` (`3.14.0`) and the
  `@require ...gpro-data.js?v=` cache-buster per the CLAUDE.md rule.
- Verified with `node --check` after each change.

### 2026-07-19 — Iteration 7 (sponsor advice + Driver/TD Market)

- Completed TODO #2 from iteration 6: **`calcSponsorAnswerAdvice()`** ported (independently
  reimplemented, not copied) from gpro-pitwall's disclosed `SponsorAdvisorService` mapping, wired
  into `renderSponsorOverview`'s "Suggested Negotiation Answers" section for negotiations GPRO
  flags as needing attention. Labelled as a community-derived heuristic, not confirmed.
- Completed TODO #3 from iteration 6: **`renderMarketOverview()`** (new "Driver & TD Market" menu
  command) using `/AvailDrivers` + `/AvailTDs`, found via grepping `gpro-public-api.yml`. Plain
  OA-per-$1M-salary "Value" column, no fabricated scoring.
- Added `/NegOverview`, `/AvailDrivers`, `/AvailTDs` to the "Clear Cache" endpoint list (the
  per-sponsor `/NegotiateSponsor?id=` cache entries are dynamic and rely on the existing 20-minute
  short-TTL expiry instead - not added to that static list).
- Verified with `node --check`; bumped `@version` to `3.13.0` (`gpro-data.js` untouched).

### 2026-07-19 — Iteration 6 (deep-dive research + Sponsor Overview)

- Deep-dived `gpro-pitwall`'s actual service-class inventory and `TestingProjectionService.php`'s
  full disclosed source (see "Deep-dive review #2" above). Concluded the testing-projection
  feature needs real numeric constants we don't have a verified source for - explicitly not
  implemented, rather than guessed at.
- Instead grepped `gpro-public-api.yml` for what a sponsor feature could honestly be built from:
  found `/NegOverview` (`GetSponsorNegotiations`) returns `carSpots` (signed sponsors per car
  spot), `ongNegs` (ongoing negotiations, including GPRO's own `attention`-needed flag), and
  `comms` (recent sponsor messages) - a single API call, no fabricated logic required.
- **Added `renderSponsorOverview()`** (new "Sponsor Overview" menu command, alongside "Season
  Overview") - a read-only view of that data: car-spots-filled table, ongoing-negotiations table
  with GPRO's own attention flag highlighted, recent messages. Deliberately does **not** recommend
  specific negotiation answers - the scoring behind "which answer is correct per question type"
  isn't documented anywhere verified (checked `NegoSignSponsorProfileResponse`'s schema - the
  question/attribute fields exist, a scoring formula does not), and this project doesn't guess at
  unverified game mechanics. This is a real, if partial, step on the "Sponsor Optimizer" roadmap
  item - the advisory half stays open until the mechanic is actually verified.
- Added `/NegOverview` to the "Clear Cache" menu command's endpoint list.
- Verified with `node --check`; bumped `@version` to `3.12.0` (`gpro-data.js` untouched).

### 2026-07-19 — Iteration 5 (setup-table dedup, gadgets, decision board, season rollups)

The last big Priority 1 item plus most of the queued feature ideas, in one pass:

- **Setup-table dedup, finally done**: added `mkSetupTableInner(setup, columns)` - a
  `columns: [{key, label, highlight}]` spec covers both `renderQualify`'s 1-column table and
  `renderRaceSetup`'s 3-column (Q1/Q2/Race, with embedded weather `<select>`s in the header row)
  table. Both the initial render *and* the in-place weather-change update
  (`updateSetupInPlace`/`updateRaceSetupInPlace`) now call the same function - previously 4
  separate copies of this markup (2 pages x initial+update), now 1.
- **Wing Split** gadget (gproanalyzer.info-style) - `wingSplitLabel()` recovers it from the
  already-computed Front/Rear wing values (half their difference) rather than re-deriving gapp's
  internal `wingSplit` term separately, so it can never disagree with the table above it. Shown
  under the Car Setup section on both pages.
- **Time Gain Due to CTR** gadget - `calcCtrTimeGain()` uses the already-loaded
  `SEASON_TRACKS`/`GPRO_DATA.tracks` `ctrGain`/`ctrRace` fields (confirmed `ctrRace = ctrGain *
  laps` for every track, i.e. both are CTR=100 reference figures) and scales linearly to the
  driver's actual CTR setting. Own scaling assumption, flagged as such in the UI. Added to Driver
  Strategy in `renderRaceSetup`.
- **Time Lost Due to FLD/TCD** gadget from the TODO list turned out to be **already covered** -
  the existing tyre-results table already shows per-compound TCD/FLD columns straight from GAPP's
  stopCalc data, integrated into race context rather than a standalone calculator. No new code
  needed; noted here so it doesn't get re-proposed.
- **Car Test Points** gadget - explicitly **not built**: it needs Testing.asp DOM parsing, a page
  this script has no `@match` for at all. Out of scope for a "quick gadget" pass; would need its
  own page-integration iteration first.
- **Decision-summary board** (`mkDecisionBoard`/`wireDecisionBoard`, gpro-pitwall Cockpit pattern) -
  one verdict tile per section (Weather/PHA Match/Push-or-Hold/Tyre/Setup), click-to-jump via
  `scrollIntoView`. Added to both `renderQualify` and `renderRaceSetup`, at the top of the panel.
  Tile data is computed by calling the same pure calc functions (`calcPhaMatch`,
  `calcPushOrHoldSignal`) a second time up-front, purely to build the summary early - cheap,
  side-effect-free, zero behavior change to the detailed sections that compute them again below.
- **Season-level rollup**: extended `renderSeasonOverview`'s existing 17-track table with
  Fuel/Avg°C/CTR Gain columns (data already loaded via `SEASON_TRACKS`, just not shown) instead of
  building separate "Season Fuel"/"Season CTR" pages like gproanalyzer.info does - one table,
  more columns.
- Verified with `node --check` after every edit (many small ones this iteration - each dedup step
  checked independently); bumped `@version` to `3.11.0` (`gpro-data.js` untouched this iteration,
  so no `?v=` bump needed).

### 2026-07-19 — Iteration 4 (Priority 1 cleanup pass)

Closed out most of the remaining Priority 1 TODOs from iterations 1-3:

- **`wireCopyButton` extended** with an options-free-but-flexible signature (`idleLabel: null`
  restores the button's own original label instead of a fixed string; optional `flashBg`).
  `renderRaceSetup`'s three Race/Q1/Q2 copy buttons now use it instead of their own `copySetup()`
  closure.
- **Fixed a real correctness bug found while doing that**: `renderRaceSetup`'s `setup` was `const`,
  so after a weather-dropdown change recalculated a `newSetup` for the visible table
  (`updateRaceSetupInPlace`), the Copy buttons kept copying the *original* pre-change setup values
  — the table and the clipboard could silently disagree. `setup` is now `let` and
  `updateRaceSetupInPlace` reassigns it; the copy button's `getText` reads `setup` live.
- **Removed more dead code**: `phaSection`/`phaFromParts` (defined, never called anywhere).
- **Re-checked the "three car-data caches" TODO** from iteration 1's architecture map and found it
  overstated: `mergeWithCachedCarData` is already the single shared merge function used by both
  Qualify and RaceSetup; only `renderUpdateCar` (the actual source of `gpro_cached_car`) reasonably
  does its own thing. No change needed — corrected the record rather than force an unnecessary
  refactor.
- **Removed orphaned `GPRO_DATA` tables** (`setupConstants`, `carCosts`, `partWearPrediction`,
  `upgradePriority`, `wearConstants`, and all of `tyreConstants` except `wearThreshold`, the one
  field actually read) — confirmed via grep that nothing in `.user.js` referenced them; they were
  fully duplicated (by value) by `.user.js`'s own working constants. **This changed `gpro-data.js`,
  so per the CLAUDE.md rule both `@version` and the `@require ...gpro-data.js?v=` cache-buster were
  bumped** (a `?v=` param didn't exist before — added it here to make that rule enforceable at all
  going forward).
- **Deduplicated season data**: `SEASON_RACE_LIST`/`TRACK_PROFILES` (used only by
  `renderSeasonOverview`) were a third independent hardcoded copy of the same 17-track data already
  in `SEASON_TRACKS`/`GPRO_DATA.tracks`. Both now derive from `SEASON_TRACKS` directly. Note: this
  inherits the existing fallback-shape gap flagged in iteration 1 (if `GPRO_DATA` fails to load,
  `SEASON_TRACKS`'s hardcoded fallback lacks `laps`/`overtaking`/`grip`/`tyre`, so the season page
  would show blanks for those columns in that edge case) — pre-existing, not introduced by this
  change, and `GPRO_DATA` failing to load is already a whole-tool-breaking event per CLAUDE.md's own
  documented incident, so not fixed here.
- **PHA match badge** (TODO #1 from iteration 2): `calcPhaMatch`'s perfect/top/none verdict now
  renders as a callout at the top of `renderRaceSetup`'s "PHA: Car vs Track" section, not just as
  an internal input to Push-or-Hold.
- **Logging severity**: added `logError(...)`, routed the genuine failure paths (5 background
  capture fetch failures, 1 "no selects found" DOM-parse failure) through it; left verbose
  parse/fallback tracing on `console.log` by design (still useful, not failures).
- Verified with `node --check` after every edit; version now `3.10.0`.

### Still open (not attempted — see rationale)

- **Setup-table in-place-update dedup** (`updateSetupInPlace` vs `updateRaceSetupInPlace`): the two
  tables have genuinely different shapes (Q1 single-column vs Q1/Q2/Race three-column), not the
  byte-identical case `mkTyreResultsTable` was. A shared builder needs a real `columns` parameter
  design, not a quick extraction — left for a dedicated pass rather than rushed.
- **Gadget calculators / season rollups / PHA-badge-as-summary-tile / decision-summary board /
  driver attribute-drift estimator**: still just TODOs (see below), deliberately not scaffolded as
  empty functions — this project's own rule is refactor-before-add and no half-finished
  implementations, so these wait until there's time to build them properly rather than stub them
  hollow.
- **`packages/*`**: still structure-only. No calculation code has been extracted into it yet -
  doing so before the render-layer and setup-table dedup above is finished would mean extracting
  functions that are about to change shape again.

### 2026-07-19 — Iteration 3 (render-layer dedup continued)

- Extracted `mkTyreResultsTable(results)` — the compound-comparison table (header + best-row
  highlight) was byte-identical copy-pasted markup in `renderQualify` and `renderRaceSetup`; both
  now call the shared builder.
- Extracted `wireCopyButton(btn, getText, idleLabel)` and used it for `renderQualify`'s
  Q1/Q2 setup-copy button (was a bespoke `try/GM_setClipboard/catch/alert` block).
- **Not done**: `renderRaceSetup`'s three copy buttons (Race/Q1/Q2) keep their own `copySetup()`
  closure — it preserves each button's original label and flashes a background-color change that
  `wireCopyButton` doesn't support, and unifying it risked a silent UX regression for a low-value
  cleanup. Left as a TODO (extend `wireCopyButton` with an options object first) rather than force
  it.
- Verified with `node --check` after each edit; bumped `@version` to `3.9.0`.

### 2026-07-19 — Iteration 2 (competitive review + first AI-first features)

- Reviewed the four reference sites/repos above and recorded findings.
- Added `calcPhaMatch(carData, trackPha)` — rank-based car/track PHA alignment ('perfect' /
  'top' / 'none'), ported concept only (not code) from gpro-pitwall's PHA match badge.
- Added `mkRaceEngineerNarrative(rec, track, driver)` — plain-language wrapper over
  `calcDriverStrategyRecommendation`'s existing risk dials, now leading the "Driver Strategy"
  section in `renderRaceSetup`. Purely templated over numbers already computed — no LLM, degrades
  to a generic sentence if driver data is thin, per the AI-first principles above.
- Added `calcPushOrHoldSignal(carData, track, trackPha, tyreResult, wearParts)` — aggregates PHA
  match, tyre-strategy confidence, and car-wear headroom into one push/hold verdict, rendered as a
  new "Push or Hold?" section in `renderRaceSetup` (calls `calcPartsWear` there for the first time
  — previously only used on UpdateCar.asp).
- Verified with `node --check` after each edit; bumped `@version` to `3.8.0`.

### 2026-07-19 — Iteration 1 (Priority 1 pass)

Refactored the live userscript (no `packages/` code touched yet, since nothing consumes it):

- Removed dead code: `markTokenFetched()` referenced an undeclared `DATA_STATUS` global and was
  never called anywhere — deleted.
- Fixed a real bug: `gpro_ctr` (CTR / Clear Track Risk, used by 3 calculators) was read via
  `GM_getValue` in three places but had **no way to ever be set** — no menu command, no UI field.
  Added `getCtr()`/`setCtr()` helpers and a CTR input in the token/settings modal
  (`showTokenModal`), so it's finally user-controllable.
- Deduplicated `STAFF_SKILLS`/`FACILITY_TARGETS`/`CAR_IDEAL_LEVELS`, which existed **three times**
  (twice in `.user.js` itself, once more as byte-identical data in `gpro-data.js`). `.user.js` now
  reads `D.staffSkills`/`D.facilityTargetsData`/`D.carIdealLevels` instead of re-declaring them.
- Deduplicated `parseGproCash` (was a private closure inside `parseUpdateCarDOM`) into one
  top-level utility, matching the CLAUDE.md rule to reuse it rather than reinvent it.
- Extracted `mkWeatherForecastSection()` — the weather-forecast table+bar+summary markup was
  copy-pasted verbatim (with one wording difference) between `renderQualify` and
  `renderRaceSetup`; now both call the same helper.
- Verified with `node --check GPRO_Strategy_Tool.user.js` after every edit; bumped `@version` to
  `3.7.0` (no `gpro-data.js` content changed this pass, so no `@require` cache-buster bump needed
  per the CLAUDE.md rule).
- Scaffolded `packages/*` (Priority 2) as described above — structure only, nothing migrated.

### TODOs for next iteration

**0. Verify AI Coaching end-to-end with a real Anthropic API key** (iteration 14) - the request
shape is written correctly against Anthropic's documented API but has never actually been clicked
with a live key on live gpro.net from this environment. First priority next time a real browser
session with a key is available.

**Part-swap advisor rework** (iteration 19 finding) - `analyzeCar`'s upgrade/downgrade
recommendation currently picks one option per flagged part. gpro-pitwall's `PartSwapAdvisorService`
does something richer: re-projects every GPRO-offered option through the wear formula, classifies
each by post-swap PHA tier (not just cost/survival), and presents up to 4 named slots
(free_downgrade/downgrade/sidegrade/upgrade). Worth adopting the PHA-tier-aware ranking and 4-slot
presentation using our own already-computed `calcPhaMatch`/wear data - but skip the peer-group
"operating band" filter (`GetMoneyLevels`-sourced min-1..max+1), since we have no equivalent data
source and no scoped plan to get one. Don't rewrite `analyzeCar` piecemeal - plan the whole slot
structure first, since it changes what the "Recommendations" section actually shows per part.

**Testing.asp / Car Test Points is CLOSED, not open** - checked GAPP, gpro-pitwall, and the
official GPRO wiki directly; the conversion formula is deliberately undocumented by GPRO itself
and there's no raw test-points field in the API to show even without projecting. Don't re-open
this without a genuinely new source (e.g. a player-run spreadsheet with empirically-derived
constants, clearly labelled as such if found).

1. **Multi-league threading, mostly done** (iteration 10): `analyzeCar` (car part targets) and
   `renderStaff` (staff training priority, facility targets, facility-level bar scale) are now
   fully league-aware via `D.carTargets`/`D.staffPriority`/`D.facilityTargets`/`D.leagues`, with
   clean Amateur fallback when the league is unknown. **Still Amateur-only by design, not
   oversight**: `calcDriverStrategyRecommendation`'s `RISK_MIN`/`RISK_MAX` clamp - `D.risks[league]`
   looked like it might apply (its note text even mentions "overtaking/defend"), but two rounds of
   research (iterations 10 and 11) couldn't confirm it describes the same risk dial
   `calcDriverStrategyRecommendation` computes: a real example found for Rookie ("overtaking 25,
   hold position 25, clear track 30, car failure 10") doesn't closely match `D.risks.Rookie`
   (`{max: 0, note: 'Zero risks recommended...'}`). Genuinely ambiguous, not just
   under-researched - don't wire it in without resolving that discrepancy first (check the GPRO
   wiki's actual race-risk-settings page directly, not just search snippets).
2. **Driver attribute-drift estimator** (gpro-tools.eu's "Driver info") — storage foundation now
   exists (`appendDriverSnapshot`, iteration 12: every `DriverProfile.asp` visit persists a dated
   snapshot per driver ID, own or scouted, capped at 60 entries). What's still missing is
   everything on top of the data: (a) enough real accumulated history to work with (needs weeks of
   actual use, not something a coding session can shortcut), and (b) an actual drift/estimation
   methodology - don't guess at how attributes change over time without a real basis, same
   principle as the Testing.asp decision. Revisit once there's real snapshot data to look at.
3. **Driver Market filters**: `renderMarketOverview` only requests GPRO's default (unfiltered)
   `/AvailDrivers`/`/AvailTDs` response since the skill/range filter params are GPRO-Supporters-only
   per the API spec. If the user has Supporter status, the filter UI (OA/age/salary/skill ranges)
   would be a real, boundable addition - not attempted since we can't verify Supporter access from
   here.
4. **Settings are still ad hoc** (`gpro_ctr` and the token live in the same modal by coincidence,
   not a real settings system). Worth a proper `renderSettingsModal()` if more settings get added
   (wet/dry override defaults, budget threshold, etc.) rather than growing `showTokenModal` further.
   Still no new setting has actually come up that would need it - don't rename/restructure just for
   the sake of it.
5. **Decision board coverage, mostly done** (iteration 12): `renderQualify`/`renderRaceSetup`/
   `renderSponsorOverview`/`renderMarketOverview` all have one now. `renderUpdateCar`/`renderStaff`
   still don't - not yet, both still short enough to scan directly; add if they grow more sections.

Priority 2 (packages/ — pick up once #1–2 above are done, per the migration strategy):

- Start the actual extraction with `packages/shared` (money/date formatting) and
  `packages/calculations` (tyre/setup/wear/fuel math), since those are pure functions with no
  `GM_*`/DOM dependency and can be lifted with zero behavior change.
- No build tooling exists yet (no bundler/tsconfig). Before extracting real code, decide: keep it
  CommonJS + a small bundler (esbuild) that emits the `@require`d file, or keep hand-syncing until
  there's enough package code to justify the tooling. Don't add the tooling speculatively.
