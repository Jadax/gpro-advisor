# Architecture & Roadmap

Status log for the evolution from a single Tampermonkey userscript into a full GPRO companion
platform. Read this before starting a new iteration — it records what's real vs. scaffold, and
what the next pass should pick up.

## Current shipping product

`GPRO_Strategy_Tool.user.js` + `gpro-data.js` at the repo root — the entire shipping product, no
build step, no other packages. Every change must keep this working — see [CLAUDE.md](CLAUDE.md)
for its house rules (API budget, caching layers, versioning, etc).

**2026-07-27**: removed the `packages/*` monorepo scaffold (11 empty-stub sub-packages, none ever
consumed, none touched across any iteration below) - premature scaffolding for a migration that
never started, against this project's own "don't design for hypothetical future needs" rule. If a
real extraction is ever warranted (e.g. a second consumer of the calc functions besides the
userscript actually shows up), start it then with real content, not stub folders in advance.

## AI-first principles (apply if/when AI-driven features grow beyond AI Coaching)

Every recommendation must: explain its reasoning, show a confidence figure, state its
assumptions, compare at least one alternative, stay deterministic wherever the underlying
calculation allows it, and fall back cleanly to non-AI output when no AI backend is configured.
This mirrors the pattern already used for GAPP-vs-calibrated-vs-own-formula in the tyre/setup/wear
calculators — extend it, don't replace it.

## Deep-dive review #5 (2026-07-19) — Testing.asp research exhausted, real league detection found

- **Testing.asp decay formula, final answer**: searched the web and fetched the **official GPRO
 wiki** directly (`game documentation/index.php/Testing` and `.../Car_Character_Points`) - the
 authoritative source, not a community guess. Confirmed the conversion pipeline (Test Points →
 R&D Points → Engineering Points → Car Character Points, landing over the next races, facility
 levels affecting conversion *ratio* at each stage) but the wiki **explicitly states**: "The
 conversion from Test Points into CCPs depends on a number of factors which you will have to
 investigate" - i.e. even GPRO's own wiki won't give the formula; it's deliberately opaque/
 empirical. Combined with GAPP having zero testing data and our decay factor being
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

- Confirmed via `our internal formulas`'s `data.py` (raw source, searched for "test" - zero
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
 is the exact "reference table... one click away" feature our README calls out for
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
 - **`D.driverSelection`** (established driver-attribute recruiting priorities per
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

- Read the full disclosed source of `our codebase`'s `SponsorAdvisorService.php` (135 lines,
 public). Its own docstring: the 5-negotiation-question → answer mapping is "user-supplied,
 cross-checked against in-game text" - i.e. a analysis-derived heuristic, not a secret/paywalled
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
 our `RecruitmentService`/`IdealPilotService` and our toolset's "Driver & TD Market" both
 do.
- Added `renderMarketOverview()` (new "Driver & TD Market" menu command) - two tables from
 `/AvailDrivers` + `/AvailTDs`, plus a "Value" column (OA per $1M salary) that's plain arithmetic
 over already-returned fields, not a game-mechanic estimate - kept clearly distinct from the
 sponsor-advice feature's "heuristic, not confirmed" labelling since this one really is just math.

## Deep-dive review #2 (2026-07-19) — our src/Service/ inventory

Browsed `our internal codebase`'s actual service-class list (`src/Service/`, ~34 files) for
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
 scoped future task (needs either game documentation research for the actual numbers, or dropping the
 projection and just showing raw current test points from the API) rather than left vague.
- **Found via the same service list**: `SponsorAdvisorService` exists in our codebase but its
 behavior isn't visible from the file list alone (didn't fetch its source - out of budget for
 this pass). Cross-checked our own `gpro-public-api.yml` instead for what's actually buildable
 without their private logic (see below) - built a sponsor feature grounded in verified public API
 schema, not a guess at their implementation.
- **`RecruitmentService`/`IdealPilotService`/`TrainingAdvisorService`**: confirm the "Driver &
 TD Market" (our toolset) and "OA driver + Training" (our toolset) feature areas are real,
 validated market patterns, not just marketing copy - still on the long-term roadmap, not
 attempted this iteration (need the driver-market API endpoints scoped first, see TODOs).

## Competitive review (2026-07-19)

Reviewed live (no code copied — feature/UX reference only):

- **gprohub.net** — account-gated web app. Marketing page lists: Car Setup Calculator, Race
 Strategy Planner, Race Calendar, Data Sync (auto-import from GPRO.net), Driver & TD Market,
 Sponsor Advisor. Confirms our roadmap's "Driver Search"/"Sponsor Optimizer" items are the right
 scope; nothing seen here we don't already cover or plan to.
- **our toolset** — the differentiator is a huge crowd-sourced database (282k+ race
 analyses, 13k+ drivers) searchable by weather forecast, used to find comparable historical races
 ("Race Strategy Analysis", "Q1/Race Risk Analysis" under their paid "Database Plus" tier). Their
 free "Gadgets" list also has several single-purpose calculators we don't have yet: **Wing Split**,
 **Time Lost Due To FLD/TCD**, **Time Gain Due To CTR**, **Car Test Points**, **Driver Influence
 Analysis**, and season-level rollups (Season CTR/PHA/Weather/Car Wear/Fuel/Tyre Wear). We have no
 equivalent historical database and shouldn't try to build one (out of scope — needs a server and
 years of crowd-sourced data); the individual gadget-style calculators are realistic additions.
- **our toolset** — a "Total setup" combined view (setup + fuel + wear + strategy in one place,
 which our panel already does per-page) and a "Driver info" tool that estimates a driver's
 *current* hidden attributes from their publicly-visible history over time — a genuinely novel
 idea worth a future `analytics`/`prediction` package feature, not implementable from a single
 page load though (needs periodic background capture accumulated over weeks).
- **our internal codebase** () — the most directly
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

### 2026-07-27 — Iteration 32 (weather-period lap conversion generalized beyond one track)

Iteration 31 fixed the mechanic but left `ELITE_LAPS_PER_PERIOD = 20` as a single flat constant
calibrated from Losail alone - correct for that one track, but with no reason to be right for
every other track on the calendar. User then shared a TrackDetails.asp screenshot and asked
whether it carries what's needed to generalize the constant properly.

It does: `Average speed` (km/h) and `Lap distance` (km) are both plain fields on that page,
confirmed matching the real `/TrackProfile` API's `avgSpeed`/`lapDistance` fields exactly (same
DOM/API-interchangeable convention already used for `overtaking`/`gripLevel`). Lap time =
lapDistance/avgSpeed; laps/period = 1800s / lapTime. Cross-checked against Losail's real numbers:
5.381km @ 239.08km/h → ~81.0s/lap → ~22.2 laps/period from the raw formula, vs. the real
calibrated value of 20 - not identical, so this is genuinely a two-point derivation (a physics-
based per-track estimate, corrected by the one real result available as a calibration ratio), not
a fully verified formula.

- Added `avgSpeed`/`lapDistance` to `parseTrackDetailsDOM` (previously documented in
 docs/page-structures.md but never actually parsed).
- New `estimateLapsPerWeatherPeriod(track)`: per-track laps/period from the speed/distance
 formula, corrected by `LAPS_PER_PERIOD_CALIBRATION` (derived from the Losail ratio), falling
 back to the flat `20` constant when track data isn't available yet (e.g. before
 TrackDetails.asp has been visited this race weekend).
- Wired into the rain-stop-window calc in place of the flat constant. Still explicitly flagged as
 provisional - the correction ratio itself could be wrong, or could vary by track type (street
 vs road, corner count) in ways one data point can't reveal. Revisit if a result on a different
 track falls outside the resulting window - that's the signal to gather more calibration points
 or abandon the single-ratio-correction approach for something more sophisticated.

### 2026-07-27 — Iteration 31 (real fix: weather periods are NOT proportional to your own race's lap count)

Iteration 30's fix was still fundamentally wrong. User clarified the Losail screenshot IS the same
race as their "fuelled 44, rain stopped lap 45" comment, and manually working the math against
Losail's real 57-lap distance exposed it: the previous code derived each forecast period's length
as `raceLaps / 4` (14.25 laps for Losail), giving an estimated window of lap 29-35 - nowhere near
the user's correct 40-46 (actual: 45).

Re-fetched the official wiki and got the exact quote: **"All weather changes (temperature,
humidity, rain) happen on the same lap in all races, not dependent on time."** Confirmed directly:
an 80-lap race and a 57-lap race on the same track/week see a weather transition at the same
ABSOLUTE lap number (tied to the Elite race's pace), not at the same fraction of each race's own
distance. Dividing the current race's own total laps by 4 was never correct, independent of the
transition-window-width fix from iteration 30 layered on top of it.

- Replaced the `raceLaps/4`-derived period length with `ELITE_LAPS_PER_PERIOD = 20`, taken
 directly from the user's own worked example for Losail ("laps/period 20+20 + 0-6 laps"). Both
 bounds are capped to the race's own total laps (can't run past the actual finish).
- This constant is explicitly flagged as single-track, single-result calibration - there's no data
 source yet to derive Elite's per-track pace (would need Elite's own lap time that race week), so
 it's very likely track-dependent to some degree (shorter-lap tracks probably don't share the same
 elite laps/period as longer-lap ones). Still far more accurate than the previous proportional
 assumption, which the wiki directly contradicts. Revisit if a result on a different track falls
 outside the resulting window - that would be the signal needed to start deriving a per-track value
 instead of one flat constant.

### 2026-07-27 — Iteration 30 (rain-stop window narrowed with real user-supplied race data - superseded by iteration 31, see below)

Follow-up to iteration 29's segment-width rain-stop window. User supplied their own real-race data
point and methodology: "laps/period 20+20 + 0-6 laps for the 3 periods = rain stopping around lap
40-46" - full wet forecast periods count in full, but the TRANSITIONING period only contributes a
0-6 lap uncertainty window, not its whole width. Their actual result that race: fuelled for 44
laps, rain stopped on lap 45 - inside their 40-46 estimate and far tighter than iteration 29's
full-segment-width window would have given (~40-60 for a 20-lap period). Adopted the 6-lap
transition window (`TRANSITION_WINDOW_LAPS`) in place of the full segment width, capped to the
segment's own width for unusually short periods. Explicitly logged as empirical calibration from
one real result, not an official formula or a large sample - if a future real result falls outside
this window, revisit and widen rather than assuming the constant is exactly right.

### 2026-07-27 — Iteration 29 (Car Advisor budget-allocation bug + rain-stop lap range, not a sharp guess)

User reported two real problems from a live Car Advisor screenshot and a rain-forecast comment:

**1. Car Advisor budget allocation bug.** The screenshot showed the Engine (the tool's own
"most impactful for Power PHA", `UPGRADE_PRIORITY.Engine = 1`) getting "No affordable option"
while Rear Wing/Gearbox (lower priority) got funded first, spending most of the budget before
Engine was even evaluated. Root cause: `analyzeCar`'s allocation sort chained `willFail`/
`critical`/`flagged` as independent tie-breaks ahead of the static `priority`, so a part that was
willFail-AND-critical (very low remaining wear right now) could jump ahead of a willFail-but-not-
yet-critical Engine purely on current wear buffer, not actual importance. Fixed: each part now
gets exactly one tier (0=willFail/1=critical/2=flagged/3=belowTarget), and `priority` is the ONLY
tie-breaker within a tier - the most important part in the worst tier always gets first claim on
the budget. Also improved the "no affordable option" fallback message: instead of a bare dead-end,
it now shows the cheapest real fix's cost and the exact shortfall, states the actual consequence
(mid-race failure = DNF/retirement risk, not just a stat), and suggests concrete alternatives
(downgrade something lower-priority to free cash, or knowingly accept the risk this race).

**2. Rain-stop lap estimate overstated its own precision.** User referenced GPRO's own weather
mechanics (and linked wiki.gpro.net/index.php/Weather) - fetched it directly and confirmed: a
low/0% rain-probability segment right after a wet one only guarantees rain stops SOMEWHERE WITHIN
that segment, not at its exact start. The Rain Strategy Plan was asserting a single sharp lap
("auto-pit around lap ~29") when the forecast itself can't support that precision. Fixed:
`dryingFuelData` now carries `earliestStopLap`/`latestStopLap` (segment start/end) instead of one
point, all "auto-pit around lap ~X" UI strings now show the range, and the wet-stint fuel load is
biased toward the LATER bound (safer to carry a bit more wet-stint fuel than run dry if rain
persists longer than the earliest possible stop). **Not implemented**: the user also referenced
using a track's historical wet-race record (TrackDetails.asp) to narrow the window further with
real data - that's a legitimate future improvement but needs that historical data actually scraped
first, which isn't wired up yet. Don't guess at a narrower window without it.

### 2026-07-27 — Iteration 28 (fix overly-strict shortlist filter, sourced from the official GPRO Newbie Guide)

User reported the Full Stats filter found zero drivers even with reasonable-looking thresholds.
Root cause: `mkFullStatsTable` required EVERY numeric floor at once (Concentration 200+ AND
Talent 60+ AND Experience 90+ AND TechInsight 80+ simultaneously). Fetched GPRO's own official
Newbie Guide (gpro.net/gb/GPRONoobGuide.asp) directly, which states plainly: "You will not find a
driver who has a good rating for all his skills whilst in Rookie, but a driver with one or two
skills will suffice and provide you with a promotion-worthy driver." Requiring all floors at once
was structurally guaranteed to return nothing, independent of whether the threshold numbers
themselves were reasonable.

- `mkFullStatsTable`/`mkShortlistSection` now gate only on the SINGLE top-priority attribute
 (priority 1 - concentration in every league's `driverSelection`/`tdSelection` data), matching
 "one or two skills will suffice" without being so loose the filter stops meaning anything.
 Other attributes remain visible as priority-ordered reference for manual judgement.
- Added an explicit warning comment in `gpro-data.js` above `driverSelection` so a future editor
 doesn't reintroduce the all-floors-at-once bug when extending this data.

### 2026-07-27 — Iteration 27 (fixed: advisor panel missing on paginated market pages)

Real bug: `@match https://www.gpro.net/gb/AvailDrivers.asp`/`AvailTechDirectors.asp` had no `*`
wildcard, unlike `DriverProfile.asp*`/`TrackDetails.asp*` elsewhere in the same header - so
Tampermonkey only ever injected the script on page 1 (`AvailDrivers.asp` with no query string).
Any paginated URL (`AvailDrivers.asp?Page=2&MinOA=&...`) didn't match at all, so the panel simply
never appeared - not a rendering bug, the script wasn't running there. Fixed both `@match` lines to
use the wildcard suffix; `detectPage()` already used `.includes()` so no other code needed to
change.

### 2026-07-27 — Iteration 26 (shortlist filtering rebuilt around real scraped attributes, not OA)

User reported the OA-band shortlist from iteration 25 still showed all ~50 listed drivers. Root
cause understood properly this time: GPRO's own default market page is already sorted descending
and capped near the league's max OA (confirmed in `gpro-public-api.yml`'s `/AvailDrivers`
description), so an OA-range filter barely narrows anything - nearly every listed row is already
near the top of the allowed range by construction. Asked the user how they wanted filtering to
actually work; they chose real attributes via the Full Stats scan as the primary mechanism.

- `mkShortlistSection` no longer pre-filters by OA/affordability. It now shows the full list
 (capped to 30 for real-request politeness against gpro.net, not an API budget concern) with the
 league's target OA and cash shown as context only, plus a "Scan Full Stats & Filter" button as
 the primary action.
- New `parseMinFromTarget` extracts a numeric floor from `D.driverSelection[league].attributes`/
 `D.tdSelection[league].skills` target strings (`'200+'` → 200, `'150-200'` → 150) - qualitative
 targets (`'as high as affordable'`) yield no floor and don't filter.
- After a scan, `mkFullStatsTable` now splits results into "meets every sourced numeric floor"
 (shown first) vs "below threshold" (collapsed but still visible, never hidden) - this is the
 literal "minimum stats to filter for per league" the user asked for. Leagues/roles with no
 numeric floor sourced (Pro/Master/Elite drivers, all TD tiers) fall back to ranked-by-Match-Score
 with no hard cutoff, explicitly labelled as such rather than silently doing nothing.
- Removed `filterShortlist` (dead code - the OA/affordability filter it implemented is no longer
 used anywhere).

### 2026-07-27 — Iteration 25 (real bugs found in review: wrong wiki-sourced OA caps + an overly-strict filter)

User reported the Driver Market shortlist said "No listings currently match OA 80-80" for Amateur
and knew from live gameplay that Amateur's actual cap is 110, not 80 - two real bugs, not one:

1. **The wiki-sourced driver OA caps from iteration 23 were wrong.** Re-checked the source: the
 GPRO wiki's `Driver_Contract` page states its 80/90/100/110 figures apply only under a *negative
 cash balance* penalty scenario, not as the normal league caps - a nuance missed the first time.
 A second wiki excerpt gave the same numbers with no such caveat, and a forum thread title
 ("New Season Maximum Driver Overall Levels for groups") implies these caps are revised
 seasonally anyway, so the wiki page may simply be stale. Rather than guess a third time, asked
 the user directly (they're actively playing right now) - real current caps confirmed: **Rookie
 85, Amateur 110, Pro 135, Master 160, Elite uncapped**. Updated `D.leagues[league].driverMaxOA`
 and `D.driverSelection[league].targetOA` for all 5 leagues. TD OA caps (Pro 90/Master 120) came
 from the same wiki and were NOT re-verified - flagged with a caution comment in gpro-data.js and
 a visible UI warning on the TD "what to look for" section, since the driver-cap mistake is direct
 evidence this wiki can't be trusted blindly for numeric caps.
2. **Separate, structural bug**: `targetOA` for Amateur (and originally the same pattern would have
 applied to any league) was a single point (`min: 80, max: 80`) rather than a real band, so
 `filterShortlist`'s `oa >= min && oa <= max` check required an EXACT OA match against a ~20-row
 market listing - which will rarely happen regardless of whether the cap number itself was
 correct. Every league's `targetOA` is now a real band (a reasonable width below the real cap,
 disclosed as this tool's own heuristic, not sourced) so the shortlist can actually return results.

### 2026-07-27 — Iteration 24 (per-candidate full-stat scraping for the Driver/TD Market shortlist)

User request: complete TODO 0e - the shortlist from iteration 23 could only filter on OA/salary
(all the market list DOM exposes), not real attributes. Wanted actual per-candidate stats.

- `parseAvailListDOM` now captures each row's raw link `href` as `row.profileHref` - this is how
 the (previously unconfirmed) TD profile page URL got discovered: it was sitting right there in
 the market table's own link the whole time, no need to guess it.
- New `parseTdProfileDOM` (GPRO_Strategy_Tool.user.js) - **explicitly flagged unverified**, no TD
 profile page has ever been captured in this project. Tries label-text and element-id patterns,
 logs to console on total failure instead of silently returning null forever. Field names
 (`leadership`/`mechanics`/`electronics`/`aerodynamics`/`pitCoord`/`motivation`/`experience`) are
 the real API field names from `gpro-public-api.yml`'s `TDProfileResponse` - not guessed.
- New `fetchCandidateFullStats`/`scanCandidatesFullStats`: a user-triggered "🔍 Scan Full Stats"
 button (not automatic - these are real HTTP page loads against gpro.net, capped to the already-
 filtered shortlist and to 15 candidates max per scan) fetches each candidate's own profile page
 and caches the result indefinitely per candidate ID under a scout-specific stale-cache key
 (`/DriProfileScout/{id}`, `/TDProfileScout/{id}`), separate from the account's own driver/TD cache.
- New `scoreCandidate`/`mkFullStatsTable`: once scanned, candidates get a weighted "Match Score"
 from their real attributes, weighted by the league's own priority order
 (`D.driverSelection[league].attributes` / `D.tdSelection[league].skills`, both wiki-sourced from
 iteration 23). Explicitly labelled as a **relative ranking tool only**, not a normalized
 percentage or verified formula - attribute scales differ too much across skills for the raw
 number to mean anything in isolation.
- `D.tdSelection` keys renamed `pitCoordination`→`pitCoord`, `mechanical`→`mechanics` to match the
 real API/DOM field names now that `parseTdProfileDOM` needs to key off them directly.

### 2026-07-27 — Iteration 23 (real driver/TD market shortlisting, sourced from the GPRO wiki)

User request: Driver/TD Market advisors dump the whole market list; wanted it filtered to what's
actually relevant given their league and cash balance, using community tips/recommendations rather
than a guess.

- Used `WebSearch`/`WebFetch` against the **official GPRO wiki** (not a guess, not a forum rumor)
 to confirm driver OA caps (Pro 90/Master 100/Elite 110) and TD OA caps (Pro 90/Master 120 - higher
 than the driver cap at Master, Elite uncapped in the sources checked). Extended `D.driverSelection`
 to all 5 leagues and added `D.tdSelection` (Pro/Master/Elite) in gpro-data.js, both cited in-code
 and in the UI.
- Where a source gave a hard number (OA caps), used it. Where no source gave a number (attribute
 targets beyond Rookie/Amateur, TD skill weights beyond "leadership is a multiplier"/"pit
 coordination affects pit time directly"), left it qualitative ("as high as affordable", priority
 order without a numeric target) instead of inventing precision - consistent with CLAUDE.md's
 don't-guess rule.
- Built real shortlist filtering (`filterShortlist`/`mkShortlistSection`, GPRO_Strategy_Tool.user.js):
 rows are filtered to the league's target OA range AND affordability (sign fee vs. cached cash
 balance from `getCachedCarData()`), sorted by value (OA/$1M salary), with the full unfiltered list
 still one click away in a collapsed `<details>` rather than being hidden entirely.
- Still can't score by actual attributes (concentration/talent/etc) - the market list DOM only
 exposes OA/age/salary, not full stats. Unchanged from TODO 0e: would need per-row profile scraping.

### 2026-07-27 — Iteration 22 (Data Freshness redesign, real parsing bugs, community-sourced training/staff advice)

User-reported: Data Freshness dashboard calling event-driven data "stale" when nothing had actually
changed, tyre supplier/car data never showing as captured, a Training Advisor crash, and a request
to base driver/staff training advice on community consensus per league rather than an internal guess.

- **Data Freshness redesign**: added a `volatility` tag (`session` vs `event`) to each dashboard
 row. Weather/Testing genuinely decay with time and keep the old Fresh/Stale age-based logic.
 Track/Driver/Office/Car/Suppliers/Staff only change on a specific in-game action (train, upgrade,
 sign, race wear landing) - these now show "Captured" with no age decay, plus one explanatory note
 instead of implying the data goes bad by sitting there.
- **Real bug: Car Data always "Missing"**: `gpro_cached_car` (written by `renderUpdateCar`) and the
 generic `stale_api_/UpdateCar` slot (read by `getDataDomOnly`/the dashboard) were two disconnected
 systems - nothing ever wrote to the second one. Bridged by writing both from the same place.
- **Real bug (broader): `getDataDomOnly` threw away successful live parses.** A live DOM parse
 (e.g. `parseQualifyCarDOM` on Qualify.asp) was returned to its caller but never persisted, so
 visiting a page that *did* have working live data still left the dashboard showing stale/missing
 afterward. Fixed to persist every successful live parse into the stale store, same as passive
 capture - this was a general fix, not just a car-specific patch.
- **Tyre supplier parsing**: `parseTyreSuppliersDOM`'s `#tyresuppliers .column` selector (confirmed
 live 2026-07-19) couldn't be re-verified without a live session - added a fallback selector plus a
 console warning if it ever finds zero columns, so a future markup drift is diagnosable instead of
 silently returning null forever.
- **Real bug: `sessionSkills is not defined` crash on the Training Advisor.** `const sessionSkills`
 was block-scoped inside `if (data.sessions.length) {...}` but referenced again in a separate,
 unguarded block below - a driver with real skill data but zero available sessions hit a
 ReferenceError. Fixed by hoisting the declaration (now replaced entirely, see below).
- **Real bug: Staff Training Priority recommended training un-trainable attributes.** Confirmed
 against the official GPRO wiki (wiki.gpro.net/index.php?title=Staff_and_Facilities) that only
 Concentration/Stress Handling/Efficiency are purchasable training - Technical Skill/Experience/
 Motivation have no training-session option at all. `D.staffSkills`/`D.staffPriority` previously
 ranked all 6 as if trainable. Fixed: `trainable: true/false` flag added, `staffPriority` per league
 now only lists the 3 real options (same order across leagues - training is capped by average
 facility level, not by league directly), UI shows the wiki citation.
- **Driver training advice replaced with community-sourced data.** The old `sessionSkills` mapping
 was this project's own unverified guess. GPRO's own wiki explicitly says training effects aren't
 perfectly deterministic session-to-session, so a verified formula was never possible - replaced
 with `D.trainingSessionEffects` (up/down per session, sourced from
 gproracers.forumotion.com/t65-driver-stats, cited in the UI) and `D.driverAttributeLeaguePriority`
 (which attribute matters most per league, same source) so the "weakest skill" recommendation is
 now weighted by league relevance instead of pure raw-lowest-value (e.g. Talent is untrainable and
 barely relevant below Master/Elite, so flagging it as priority #1 for a Rookie was bad advice even
 when numerically true). Spa Resort's effects had no community source found - left unconfirmed
 rather than keeping the old unsourced guess.

### 2026-07-19 — Iteration 21 (DOM-only architecture push + real tyre/fuel conflict bug fixed)

User-reported, screenshot-illustrated bug plus an explicit architecture request, both real and both
fixed:

**Bug: conflicting dry-tyre recommendations + confusing fuel total.** Screenshots showed the tyre
table (real GAPP calc) recommending Medium as the best dry compound, while the "Rain Strategy Plan"
section - shown because the race starts wet and dries out - said "Switch to Hard". Root cause: that
section picked its post-rain compound from a **crude lap-count-only heuristic**
(`dryLaps > 20 ? 'Hard' : ...`) completely independent of `tyre.bestDry`, which the tyre table
above it already computes correctly from the real formula. Fixed to use `tyre.bestDry.name`
directly - same number everywhere now. Also added a **real two-phase fuel calculation**: the main
"Total Fuel" figure assumes the whole race runs on one compound's consumption rate, which is wrong
for a wet-start/dries-out race (this was the source of the "why only 95L" question - that total
never accounted for the wet phase's own fuel rate). The Rain Strategy section now computes actual
wet-phase + dry-phase fuel from each compound's own already-computed `fuelPerStint`/`lapsPerStint`
(no new formula - just composing numbers already on screen), and the main Fuel Strategy section now
carries an explicit warning pointing to that real breakdown instead of presenting a single-compound
total as if it described the whole race. Left the drop numeric anomaly in the raw TCD column
(Medium's TCD showing near-zero relative to other compounds in the screenshot) **unresolved** -
could not conclusively diagnose from a screenshot alone without a live session to test against;
flagged as a TODO rather than guessed at.

**DOM-only architecture, explicitly requested for 8 categories** (Practice/Weather, Track Profile,
Driver Profile, Office/Tyre Supplier, Car Data, Testing/Fuel Data, Tyre Suppliers, Staff/
Facilities):

- Added `getDataDomOnly(endpoint, domParseFn)` - same DOM-live-parse-then-DOM-fed-stale-cache
 tiers as `getDataSmart`, but **never falls through to a real API call**. Returns `null` (not a
 sentinel object) so every existing falsy-check throughout the file keeps working unchanged.
- **Found the big one while investigating**: the literal 8-category list the user quoted is
 `renderHome`'s "Data Freshness" dashboard row labels verbatim - meaning that dashboard, shown on
 gpro.asp (the most-visited page every race), was spending **up to 8 real API calls on every
 single visit** via `apiGet(endpoints[key].ep)` for all of them. Switched to `getDataDomOnly` for
 every category except Office (see below); "Missing" rows now show "visit X page once" instead of
 an API error, since the DOM-fed stale cache is the actual source now, not the API.
- **Found and fixed a second real bug** while touching this: the Staff & Facilities page branch in
 `init()` was fetching **`/Office`** instead of **`/StaffAndFacilities`** for its own staff-skill
 data - CLAUDE.md already documented this exact class of mistake once before (concentration/
 stressHandling live on `/StaffAndFacilities`, not `/Office`) for a different call site; this one
 had the same bug, unnoticed because it didn't throw, it just silently produced an all-undefined
 staff object. Fixed, and expanded `parseStaffFacilitiesDOM` (previously only captured
 concentration/stressHandling) to cover every field `renderStaff` actually needs: overall,
 experience, motivation, technicalSkill, efficiency, plus all 7 facility levels.
- **Car data (UpdateCar.asp) is now fully DOM-only**: the page's own `parseUpdateCarDOM()` already
 overrides API values whenever DOM has data (confirmed by re-reading that merge logic), so the
 `apiGet('/UpdateCar')` call before it was redundant - removed. `renderUpdateCar` now gets an
 honest "no data found - visit this page and wait a moment" message instead of a silently-empty
 all-zero analysis if DOM genuinely finds nothing.
- **Added a Testing.asp DOM parser** (`parseTestingDOM`) plus `@match` and wiring into
 `runPassiveCapture`/`backgroundCaptureAuxPages` - Testing/Fuel Data had zero DOM coverage before
 this. **Explicitly flagged as unverified**: this project has no way to hold a real Testing.asp
 session open to confirm the exact markup, so it's written defensively (multiple fallback text
 patterns, same style as `parseUpdateCarDOM`'s cash parsing) rather than committing to brittle
 selectors. If it silently returns nothing on a real page, that's the signal to capture real
 markup into `docs/page-structures.md` and fix the patterns - `getDataDomOnly` degrades to "no
 data yet" rather than ever guessing at fuel numbers either way.
- **The one confirmed, honest exception: Office.** Its fields (TD id, staff concentration/stress
 used in the pit-time calc) have no DOM source anywhere on the site - already researched and
 documented in `docs/page-structures.md` before this session. Office keeps `getDataSmart` (DOM
 tier still tried first, stale-cache next, real API only as a last resort) rather than pretending
 a DOM source exists. This is a deliberate, disclosed deviation from the "no API" request, not an
 oversight - flagged here and in-code rather than silently kept.
- `renderSeasonOverview` switched to `getDataDomOnly` too for consistency (Practice/TrackProfile are
 2 of the 8 categories, even though this menu command isn't part of the main race-day flow).
- Verified with `node --check` after every change, then re-ran the dead-function sweep (clean).
 Bumped `@version` to `3.27.0` (`gpro-data.js` untouched).

### 2026-07-19 — Iteration 20 (internal formula review COMPLETE, 3 features shipped)

Finished the remaining service files. **The full our codebase src/Service review is now complete**
- every game-logic service has been read in current source form (the ~15 remaining files are
infrastructure: auth/email/cookies/rate-limiting/API-client plumbing, no game logic).

Shipped this iteration:
- **PHA-alignment notes on upgrade/replace recommendations** (`calcPhaSimilar`, `carAfterPartSwap`,
 `calcPartUpgradeAlignment` - ported from `PartUpgradeAdvisorService`, fully disclosed, built on
 our own GAPP-verified `D.phaContrib`): when a part already being recommended for replacement
 could flip the car from not-PHA-similar to PHA-similar with a ±1 level choice, the rec now says
 so ("🎯 Replacing with a higher-level X realigns your car..."). Never a generic claim - only
 shown when that specific shift actually flips the verdict, exactly like the source.
- **Testing Targets section** in `renderRaceSetup` (ported from `TestingTargetsService`, fully
 disclosed, zero secret constants): test points land +3/+4/+5 races out, so the section shows
 those races' names and PHA demands from our own `SEASON_RACE_LIST`/`D.tracks` - pick the test
 priority for what those races demand, not this weekend's. Targets past race 17 skipped silently
 (next-season calendar not in our data - same limitation applies when unpublished).
- **AI Coaching extended to the Car Advisor page** (`renderUpdateCar`) via the shared
 `wireAiCoachButton` - context is the already-computed analysis (at-risk parts, recommendations,
 cash), consistent with the AI-advisor-everywhere aim.

Reviewed but NOT built, with reasons:
- **`TrainingAdvisorService`/`IdealPilotService`/`InsightService`/`PilotCalculatorService`**: all
 depend on a crowd-seeded per-division pilot database (`PilotRepository`) and secrets-injected OA
 factors - the "ideal pilot" is an average over peers stored server-side. No equivalent data
 source exists for a client-only userscript. The concept (rank training options by weighted
 shortfall against a division-ideal profile) is recorded for the future platform phase, where a
 backend could accumulate this.
- **`RecruitmentService`**: scores the full market against the division-ideal (same blocker), BUT
 it revealed something independently useful: it reads `GetMarketFile.asp` - the bulk market
 download our own `gpro-public-api.yml` documents as **requiring no authentication** (updated
 hourly, gzip). That's a real, free data source for a future deep-search/market-analytics feature
 that doesn't touch the API budget at all. Recorded in TODOs.
- **`PilotCalculatorService`'s OA-cap adjustment logic** (motivation drains first, then secondary
 stats scale down): interesting for understanding how GPRO caps OA per division, but the factors
 are secrets-injected; nothing portable.
- Verified with `node --check`; bumped `@version` to `3.26.0` (`gpro-data.js` untouched).

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

### 2026-07-19 — Iteration 18 (continued our codebase source review: SetupCalculatorService, CarWearService, BoostFuelService)

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

### 2026-07-19 — Iteration 17 (our codebase faithfulness pass — real source, not README)

The user flagged directly: had the RiskAdvisorService/PhaMatchService ports actually been checked
against our real, current source, or just its README description? Honest answer: the
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
that risk is lower there, but our codebase changes; treat every prior port from it as "verify
against source, don't assume it's still accurate" rather than settled.

### 2026-07-19 — Iteration 16 (repo pushed to GitHub, AI Coaching extended to Qualify)

- **First git history**: this project had no `.git` until now. Initialized, added a `.gitignore`
 (excludes `.claude/` local tool settings - never project config), committed everything as of
 v3.21.0, and pushed to `https://our repository` (repo created by the user; the
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
 overall number), matching our "Driver Happy Range" gadget. Added as a compact
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

- Closed the Testing.asp TODO for good (see Deep-dive review #5) - checked the official game documentation
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
 reimplemented, not copied) from our disclosed `SponsorAdvisorService` mapping, wired
 into `renderSponsorOverview`'s "Suggested Negotiation Answers" section for negotiations GPRO
 flags as needing attention. Labelled as a analysis-derived heuristic, not confirmed.
- Completed TODO #3 from iteration 6: **`renderMarketOverview()`** (new "Driver & TD Market" menu
 command) using `/AvailDrivers` + `/AvailTDs`, found via grepping `gpro-public-api.yml`. Plain
 OA-per-$1M-salary "Value" column, no fabricated scoring.
- Added `/NegOverview`, `/AvailDrivers`, `/AvailTDs` to the "Clear Cache" endpoint list (the
 per-sponsor `/NegotiateSponsor?id=` cache entries are dynamic and rely on the existing 20-minute
 short-TTL expiry instead - not added to that static list).
- Verified with `node --check`; bumped `@version` to `3.13.0` (`gpro-data.js` untouched).

### 2026-07-19 — Iteration 6 (deep-dive research + Sponsor Overview)

- Deep-dived `our codebase`'s actual service-class inventory and `TestingProjectionService.php`'s
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
- **Wing Split** gadget (our toolset-style) - `wingSplitLabel()` recovers it from the
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
- **Decision-summary board** (`mkDecisionBoard`/`wireDecisionBoard`, our codebase Cockpit pattern) -
 one verdict tile per section (Weather/PHA Match/Push-or-Hold/Tyre/Setup), click-to-jump via
 `scrollIntoView`. Added to both `renderQualify` and `renderRaceSetup`, at the top of the panel.
 Tile data is computed by calling the same pure calc functions (`calcPhaMatch`,
 `calcPushOrHoldSignal`) a second time up-front, purely to build the summary early - cheap,
 side-effect-free, zero behavior change to the detailed sections that compute them again below.
- **Season-level rollup**: extended `renderSeasonOverview`'s existing 17-track table with
 Fuel/Avg°C/CTR Gain columns (data already loaded via `SEASON_TRACKS`, just not shown) instead of
 building separate "Season Fuel"/"Season CTR" pages like our toolset does - one table,
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
 'top' / 'none'), ported concept only (not code) from our PHA match badge.
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

**0d. Driver/TD market "what to look for" guidance is league-incomplete** (iteration 22) - the
user reported the Driver/TD Market advisors "not shortlisting anyone" and suspected a
league-dependent staff bug. There is no shortlisting/filter logic at all — the table just lists
whatever `/AvailDrivers`/`/AvailTDs` returns — so the real bugs were: (a) API errors were being
silently swallowed (`.catch(() => null)`) and shown as a generic "check your league" message
regardless of the actual failure (token expired, budget hit, network error) — fixed, now surfaces
the real error message; (b) `D.driverSelection` in gpro-data.js only has calibrated target-attribute
guidance for Rookie/Amateur, nothing for Pro/Master/Elite, and there is no `D.tdSelection` table at
all for TDs in any league — rather than inventing numbers for leagues we have no calibrated source
for (against CLAUDE.md's "don't guess" rule), the UI now says plainly when that guidance doesn't
exist yet instead of silently omitting the section.

**Resolved (iteration 23, 2026-07-27)**: filled the gap with a real source instead of a guess -
`WebSearch`/`WebFetch` against the official GPRO wiki confirmed driver OA caps (Pro 90/Master
100/Elite 110, wiki.gpro.net/index.php/Driver_Contract) and TD OA caps (Pro 90/Master 120,
wiki.gpro.net/index.php/Technical_Director - note Master's TD cap is HIGHER than its driver cap).
`D.driverSelection` extended to Pro/Master/Elite (OA targets are sourced/real; attribute numeric
targets beyond Rookie/Amateur are left as "as high as affordable" rather than inventing precision
no source gave). New `D.tdSelection` (Pro/Master/Elite, TDs unavailable below Pro) with skill
priority backed by direct wiki quotes ("leadership... lifts everything", "Pit Coordination affects
... pit stop service time"). Also built actual shortlist filtering (`filterShortlist`/
`mkShortlistSection`) on both Market advisors: rows are filtered to the league's target OA range
AND affordability (sign fee ≤ cached cash balance from `getCachedCarData()`), sorted by value, with
the full unfiltered list still available in a collapsed `<details>`. **Still open**: real per-
attribute scoring (concentration/talent/etc, not just OA) needs per-row profile scraping - see TODO
0e below, unchanged.

**0e. Per-driver/per-TD full-stat scraping from the market list - DONE (iteration 24)**, with one
caveat: driver-side scraping (`DriverProfile.asp?ID=N` via `parseDriverProfileDOM`) is confirmed and
solid. TD-side scraping now discovers the real profile URL from the market table's own link
(`row.profileHref`) instead of guessing it, but `parseTdProfileDOM` itself is still **unverified
against a real TD profile page** - written defensively (label-text + element-id fallback, console
warning on total failure) exactly like `parseTestingDOM` was when it shipped unverified. Next time a
real TD market scan runs, check the console for the "[GPRO][parseTdProfileDOM] no recognizable
fields found" warning - if it fires, capture the real TD profile page markup into
docs/page-structures.md and fix the parser's label list to match.

**0. Verify AI Coaching end-to-end with a real Anthropic API key** (iteration 14) - the request
shape is written correctly against Anthropic's documented API but has never actually been clicked
with a live key on live gpro.net from this environment. First priority next time a real browser
session with a key is available.

**0b. Verify `parseTestingDOM` against a real Testing.asp page** (iteration 21) - written
defensively with fallback text patterns since this project has no way to hold a real testing
session open to confirm the exact markup. Check on a live page, capture the real structure into
`docs/page-structures.md`, and tighten the patterns once confirmed (or fix them if wrong).

**0c. Investigate the TCD-column numeric anomaly from the iteration-21 bug report** - the user's
screenshot showed Medium's TCD at ~0.0s while other dry compounds showed a pattern that didn't
obviously match the `tcd = oneStepTcd * c.idx` formula's expected monotonic-with-idx shape
(Extra Soft appeared highest, Medium near-zero). Could not conclusively diagnose from a screenshot
without live driver/track/supplier inputs to recompute against - re-check with real values next
time a race with a wet-to-dry forecast is live, rather than guess at a fix now.

**GetMarketFile.asp bulk market data** (iteration 20 finding) - `RecruitmentService` revealed that
`GetMarketFile.asp` (documented in our own `gpro-public-api.yml`) serves the full driver/TD market
as an hourly-updated gzip download with NO authentication and NO API-budget cost. A future "deep
driver search" feature (filter the whole market by any stat range, not just GPRO's default 20-row
page) could be built on this - needs gzip decompression in the userscript (DecompressionStream is
available in modern browsers) and a look at the actual file format first.

**Part-swap advisor rework** (iteration 19 finding) - `analyzeCar`'s upgrade/downgrade
recommendation currently picks one option per flagged part. our `PartSwapAdvisorService`
does something richer: re-projects every GPRO-offered option through the wear formula, classifies
each by post-swap PHA tier (not just cost/survival), and presents up to 4 named slots
(free_downgrade/downgrade/sidegrade/upgrade). Worth adopting the PHA-tier-aware ranking and 4-slot
presentation using our own already-computed `calcPhaMatch`/wear data - but skip the peer-group
"operating band" filter (`GetMoneyLevels`-sourced min-1..max+1), since we have no equivalent data
source and no scoped plan to get one. Don't rewrite `analyzeCar` piecemeal - plan the whole slot
structure first, since it changes what the "Recommendations" section actually shows per part.

**Testing.asp / Car Test Points is CLOSED, not open** - checked GAPP, our codebase, and the
official game documentation directly; the conversion formula is deliberately undocumented by GPRO itself
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
2. **Driver attribute-drift estimator** (our "Driver info") — storage foundation now
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

**Priority 2 (packages/ extraction) is closed, not just deprioritized** — the scaffold was removed
2026-07-27 (see "Current shipping product" above) since nothing ever consumed it. If a real second
consumer of the calc/shared functions shows up in the future, start the extraction then with real
code, not speculative structure ahead of it.
