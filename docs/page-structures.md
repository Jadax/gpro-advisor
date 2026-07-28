# GPRO Page Structure Reference

Captured 2026-07-17 from live pages (Season 111, Amateur - 3, manager Tushant Sharma / driver Jim Buller / Spa GP race week). Purpose: reference for building DOM-scraping fallbacks in `GPRO_Strategy_Tool.user.js` so the tool depends less on the `/backend/api/v2` token. Re-verify selectors periodically — GPRO's HTML has changed before (game is old, still ASP-based, occasionally tweaked).

This file covers **DOM selectors** (scraping rendered HTML). For **API field/endpoint names**, see `../gpro-public-api.yml` (official OpenAPI spec) instead — grep it, never read it wholesale (~116k lines).

---

## gpro.asp (Home)

- Manager money: `<td>Money:</td><td><a href="EconomyHistory.asp">$5.902.387</a></td>` — dot-thousands format.
- Sponsors: adjacent `<tr>` with `<a href="NegotiationsOverview.asp">$322.812</a>`.
- Group/league: `<a href="Standings.asp?Group=Amateur - 3">Amateur - 3</a>`.
- Position/Points: plain `<td>` text in the same manager info table.
- Driver name: `<a href="DriverProfile.asp?ID=29986">Jim Buller</a>` inside `.boxy.xteammanagement`.
- Driver energy %: `<div class="barLabel">100%</div>` next to `/images/drienergy.png`.
- Driver overall: `<td colspan="2">Overall: 87</td>`.
- Driver salary: `<td colspan="3">Salary: $967.942</td>`.
- Races left on contract: `<th ... align="right">Races left: 10&nbsp;&nbsp;</th>`.
- Next race + countdown: `<h1><strong>Next race:</strong> Season 111, Race 11: <a href="TrackDetails.asp?id=10">...Spa GP</a> in: <em id="countdown"></em></h1>`.
- Prep checklist (Practice/Q1/Q2/Race setup done or not): table rows `<td><a href="Qualify.asp">Practice</a></td><td class="xcross">Incomplete</td>` — class `xcross` = incomplete, presumably `xtick` = complete (not observed complete in this capture).

## UpdateCar.asp

Already parsed by `parseUpdateCarDOM()` in the script. Confirmed still accurate:
- `select[name="BuyChassis"|"BuyEngine"|"BuyFWing"|"BuyRWing"|"BuyUnderbody"|"BuySidepods"|"BuyCooling"|"BuyGear"|"BuyBrakes"|"BuySusp"|"BuyElectronics"]`, each `<option>` has `newlvl`, `newwear`, `value` attrs; text has `Replace with level N ($cost)` or `Downgrade to level N (Wear: X%)`.
- Current level: plain `<td align="center">N</td>` right before the select's `<td>`.
- Current wear: `<td align="center">N%</td>` (wrapped in `<font color="orange">` if ≥90%) right after the select's `<td>`.
- Car character (Power/Handling/Accel): table "Current points distribution" → row "Current car character" → three `<td align="center">` values (e.g. 78/82/74).
- Account balance: `<p class="center">Current account balance: $5.902.387</p>`.
- Total cost display: `<input name="total" ... value="$0">`.

## DriverProfile.asp?ID=xxxx

**Confirmed live 2026-07-19 (Jim Buller, ID=29986) — `parseDriverProfileDOM()` in the script now scrapes this passively whenever the page is visited (script `@match`es it), caching into the `/DriProfile` stale-fallback slot for use on other pages when the API token is dead.**
- Skills table `#dvSkillsTable`, each stat in `<td id="Conc"|"Talent"|"Aggr"|"Experience"|"TechI"|"Stamina"|"Charisma"|"Motivation">value&nbsp;</td>` (id attrs are literally these short names — trim the `&nbsp;`).
- Overall: `<th>Overall:</th><td nowrap>87</td>` (no id).
- Reputation: same row pattern, no id.
- Weight(kg) / Age: `<th>Weight(kg):</th><td nowrap>66&nbsp;</td>` rows (label in a real `<th>`, value in the sibling `<td>`).
- Name: `<h1 class="block">Driver profile: Jim Buller</h1>`.
- Contract table: `<th>Salary:</th><td>$967.942</td>`, `<th>Contract length:</th><td>9 races</td>`, `<th>Group:</th><td><a href="Standings.asp?...">Amateur - 3</a></td>`.
- Career info: Number of GPs, Wins, Podiums, Points scored, Pole positions, Fastest laps, Avg pts/race — each its own `<tr><th>Label:</th><td>value</td></tr>`.

## TrackDetails.asp?id=N

**Confirmed live 2026-07-19 (Kaunas, id=50) — `parseTrackDetailsDOM()` now scrapes this passively (script `@match`es it), caching into the `/TrackProfile` stale-fallback slot.**
- Two-column technical-data table, label in `<td align="right">Label:</td>`, value in the immediate next `<td>` sibling.
- Power/Handling/Acceleration are level-dot images (`<img src="/images/lvl.gif">`/`lvl_dark.gif`) but the wrapping `<td class="leftalign" nowrap title="9">` carries the **exact numeric value in its `title` attribute** — read that directly, no need to count dots (unlike Qualify.asp's PHA bars which have no title attr).
- Other rows on this page (exact labels, values are the next `<td>`'s plain text): `Location:`, `Date:`, `Race distance:` (e.g. `264.1km`), `Laps:` (e.g. `80`), `Lap distance:` (`3.301 km`), `Average speed:`, `Grand Prix Held:`, `Number of corners:`, `Time in/out of pits:` (e.g. `11s` — strip the `s`), `Downforce:`/`Overtaking:`/`Suspension rigidity:`/`Fuel consumption:`/`Tyre wear:`/`Grip level:`/`Category:` (plain text, e.g. `Medium`, `Normal`, `non F1`).
- **`Average speed:`/`Lap distance:` now parsed and used** (2026-07-27, `parseTrackDetailsDOM` → `avgSpeed`/`lapDistance`, matching the real `/TrackProfile` API field names exactly) — feeds `estimateLapsPerWeatherPeriod()`, which derives how many laps the Elite race covers per 30-min weather-forecast period on THIS track (lapTime = lapDistance/avgSpeed, laps/period = 1800s/lapTime, corrected by a single real-race calibration ratio from Losail). See the rain-stop-window calc in `renderRaceSetup` and ARCHITECTURE.md iteration 32.
- Track name: `<h1 class="block">Kaunas</h1>` (just the short name, no country suffix here — that's in the `<h2>Next race:` on the Qualify pages instead).
- Records/History tables further down are opponent lap-time data, not consumed.

## Qualify.asp (Practice & Qualify 1)

- Track name: `<h2>Next race: <a href="/TrackDetails.asp?id=10">Spa GP (Belgium)</a></h2>`.
- Track PHA bars: three `<tr>` (Power/Handling/Acceleration), each a sequence of `<img src="/images/lvl.gif">` (filled) vs `<img src="/images/lvl_dark.gif">` (empty) — **count filled images to get the numeric level**, no numeric text present (contrast with TrackDetails.asp above, which does have a `title` attr).
- Weather table (Practice/Q1 vs Q2/Race-start columns): `Temp: 45°C`, `Humidity: 98%` per `<td class="center">`, with a weather icon `<img name="WeatherQ"|"WeatherR" alt="Rain"|"Cloudy"|"Very Cloudy"|...>`. **Confirmed live 2026-07-19**: this is a genuinely separate reading from the 4-segment race forecast below (not derivable from it) — `scrapeSessionTempsFromDOM()` in the script reads these two `<img>`s directly (container `.textContent` regex `Temp:\s*(-?\d+)`, and `alt` containing "Rain" for wet detection) since the API has no field for them. Present on Qualify.asp, Qualify2.asp, and RaceSetup.asp identically.
- Race forecast: 4 time segments (`Start-0h30m`, `0h30m-1h`, `1h-1h30m`, `1h30m-2h`), each cell has `Temp: L°-H°`, `Humidity: L%-H%`, `Rain probability: L%-H%` (or a single value if L=H).
- Car setup section (right column): current level/wear per part in adjacent `<td>`s, input fields `name="FWing"|"RWing"|"Engine"|"Brakes"|"Gear"|"Suspension"` (blank until submitted — this is the *input* form, not a readout).
- Tyre select: `<select name="Tyres">` with option values 1=Extra Soft,2=Soft,3=Medium,4=Hard,6=Rain.
- Car character (Power/Handling/Accel) shown as plain numbers here (unlike the level-dot bars): `<td>78</td>` etc, next to the tyre/risk rows.
- Practice laps done count: `<th colspan="12">Practice laps data (laps done 0/8)</th>`.

## Qualify2.asp

Same track/weather block as Qualify.asp. Additional:
- Fuel input: `<input name="Fuel" ... >&nbsp;(10 - 180 liters)`.
- Q1 lap result summary table (Pos/Lap time/Gap) — shows `-` until Q1 done.
- Starting grid preview table, same shape.

## RaceSetup.asp

- Car setup inputs: `name="FWing"|"RWing"|"Engine"|"Brakes"|"Gear"|"Suspension"`, default `value="0"` (means "use Q2 setup").
- Fuel strategy: `name="FuelStart"` (readonly, computed from Q2), `name="FuelStop1".."FuelStop5"`.
- Tyre strategy selects: `name="StartTyres"|"RainTyres"|"DryTyres"`.
- Wait-to-pit inputs: `name="LapsWaitPitRain"|"LapsWaitPitDry"` (labelled "Wait to pit if it starts/stops raining", default value `3` for both, range 0-80). GAPP has no formula for these two fields (checked `calcs.py`/`data.py`) — the script's own heuristic recommendation for them lives in `renderRaceSetup`, gated on `analyze.maxRain >= 15`.
- Risk inputs: `name="RiskOver"` (overtake), `name="RiskDefend"`, `name="DriverRisk"` (clear+dry = CTR), `name="RiskWet"` (clear+wet), `name="DriverRiskProb"` (malfunctioning).
- Boost laps: `name="BoostLap1"|"BoostLap2"|"BoostLap3"`.
- Start risk: `<select name="StartRisk">` (0=Avoid trouble..3=Force to front).

## StaffAndFacilities.asp

- Staff skills table: `<th>Experience:</th><td width="100">10</td>`, similarly Motivation, Technical skill, Stress handling, Concentration, Efficiency — plain numeric levels, no ids.
- Facility levels table: Windtunnel, Pitstop training center, R&D workshop, R&D design center, Engineering workshop, Alloy and chemical lab, Commercial — same `<th>Label:&nbsp;</th><td>N</td>` pattern.
- Overall staff+facilities level: `<th>Overall:</th><td width="100">5</td>` near top.
- Costs per race: `<th class="center">Staff salary: $115.730 ... Facilities maintenance: $152.650</th>`.
- Max training level: `<p class="orange center">Your maximum level of training is currently 6</p>`.
- Upgrade dropdowns: `<select name="slWindtunnel"|"slPitStop"|"slRDWorkshop"|"slRDDesignCenter"|"slEngineering"|"slLab"|"slCommercial">`, options carry cost in text.
- **Only 3 of the 6 staff skills are actually trainable** (confirmed against the official GPRO wiki, wiki.gpro.net/index.php?title=Staff_and_Facilities, 2026-07-27): Concentration ($750k/session), Stress Handling ($1.2M/session), Efficiency ($1M/session). Technical Skill, Experience, and Motivation are real displayed attributes but have no purchasable training option at all - a past version of `D.staffSkills`/`D.staffPriority` incorrectly ranked all 6 as trainable, see ARCHITECTURE.md Iteration 22.
- Facility level caps per league per the same wiki page: Rookie 20, Amateur 40, Pro 60, Master 80 (matches `gpro-data.js` `leagues[league].facilityMax` already).

## TrainingSession.asp — training effect sourcing

`sessionSkills`/now `D.trainingSessionEffects` (gpro-data.js) is community-sourced, not a verified GPRO formula. GPRO's own wiki (wiki.gpro.net/index.php/Driver_Training) explicitly states: "it may be that the same training will not always affect your drivers statistics in exactly the same way every time" - so a deterministic mapping was never available to source. Current up/down effects sourced from gproracers.forumotion.com/t65-driver-stats (2026-07-27): Fitness ↑Stamina ↓Motivation; Yoga ↑Concentration ↓Aggressiveness/Stamina; PR ↑Charisma ↓Concentration; Tech ↑Technical Insight; Sports Psychologist ↑Motivation; Ninja ↑Aggressiveness. Spa Resort has no community-confirmed effect found anywhere searched - left empty/unconfirmed rather than guessed at.

## Suppliers.asp

**Confirmed live 2026-07-19 — `parseTyreSuppliersDOM()` now scrapes this passively (script `@match`es it), caching into the `/TyreSuppliers` stale-fallback slot.**
- Each supplier is a `<div class="column ...">` inside `#tyresuppliers`, with `<h2>SupplierName</h2>` then a `table.normal` of stat rows.
- Dry performance / Wet performance / Durability / Warmup distance are all level-dot bars (`img.skillbars`), but the wrapping `<td title="N">` carries the exact numeric value in `title` — read that directly, same pattern as TrackDetails.asp's PHA.
- Peak temperature is plain text: `<td>31°</td>`.
- Cost: `<p>Cost per race: <strong>$250.000</strong></p>` (dot-thousands, parse with the usual money regex).
- The manager's currently-signed supplier has an extra `<div ...>Contract active</div>` inside its column and the column has an extra `chosen` class — this is the only way to identify "which supplier is mine" from the DOM (no id is shown per-brand here, unlike the API's `supplierId`).
- Confirmed brand names exactly as altered by GPRO (matches `gpro-data.js` `gapp.stopCalc.tyreSupplierFactor` keys): Pipirelli, Avonn, Dunnolop, Yokomama, Contimental, Hancock, Badyear, Bridgerock, Michelini.

## AvailDrivers.asp / AvailTechDirectors.asp (markets)

- Table rows: `<a href="DriverProfile.asp?ID=NNNN">Name</a>`, Overall, Age, Minimal signing fee, Minimal salary, Offers count.
- Not generally needed for strategy calc — useful only if building a driver/TD shopping assistant.

## Calendar.asp?Group=X

- Race list table: `#`, Nat flag, `<a href="TrackDetails.asp?id=N">Track GP (Country)</a>`, Date, Winner.
- Current/next race row highlighted with `class="yellow"` on the `<td>`s, `<font color="yellow"><b>Today</b></font>` for date.
- **This is the authoritative source for "which 17 tracks this season, in what order"** — better than the hardcoded `SEASON_RACE_LIST` in the script, which will drift every season. Confirms current season (S111) order: Barcelona, Ahvenisto, Magny Cours, Poznan, Al-Ring (labelled "A1-Ring" here), Jyllands-Ringen, Silverstone, Buenos Aires, Austin, Montreal, Spa, Kaunas, Hungaroring, Losail, New Delhi, Yas Marina, Baku City — matches `gpro-data.js` `seasons.S111.tracks` exactly.
- **Now background-fetched (2026-07-27) via `backgroundCacheSeasonTrackSpecs`** (`parseCalendarDOM`), once per season, to pre-cache `avgSpeed`/`lapDistance` for every track via `TrackDetails.asp?id=N` — feeds `estimateLapsPerWeatherPeriod()` so the weather rain-stop-window calc has real per-track data for whichever race comes up next, not just whichever track the narrow "next race" link on gpro.asp happened to point at recently. `Group` param is the raw `/Menu` `group` field (e.g. `Amateur - 3`), not just the league name.

## Standings.asp?Group=X

- Per-manager per-race finishing position/points/grid table, `id="resTd{IDM}_{raceNum}"` with `pos`/`pts`/`grid` attributes — richest structured data on the site, but scoped to opponents, not directly useful for self-strategy.
- Manager money-in-debt indicator: `<font color="orange"><b>N</b></font>` (title has the debt amount).

## EconomyHistory.asp

- Chronological transaction log grouped by race (`<th colspan="5"><b>Season 111, Race 10 - Montreal (Canada)</b></th>`), each row: date/time, description, balance-before, amount (+/-), balance-after.
- Transaction descriptions seen: `Tyre supplier costs`, `Facility costs`, `Salary for your staff`, `Salary for your driver`, `Sponsor money`, `Qualifying position (N)`, `Race N finish position (N)`, `Qualify 1/2 lap costs`, `Car parts costs: <abbrevs>(lvl),...`, `Staff training: X`, `Driver training costs: X`, `Facility upgrade N levels: X`.
- **Useful for auto-calibrating fuel/wear formulas** — car parts costs line shows exactly which parts were bought to what level and the exact $ paid, which could cross-check `PART_COSTS`/`CAR_COSTS` tables in the script live. Not currently consumed by the tool.

## NegotiationsOverview.asp

- Active sponsor contracts table + ongoing negotiations table (progress %, priority, contested Y/N). Car spot names: Engine cover, Sidepods, Nose, Rear wing, Front wing.
- Not consumed by the tool; could inform a future "sponsor priority" advisor.

## TrainingSession.asp

Parsed by `parseTrainingSessionDOM()`. Captured 2026-07-26:
- `<h1 class="block">` → "Driver training: {name}".
- Driver skills: `<TABLE class="squashed leftalign">` with `<th>` (label) / `<td>` (value) pairs: Overall, Concentration, Talent, Aggressiveness, Experience, Technical insight, Stamina, Charisma, Motivation, Reputation. Energy bar: `<div class="barLabel">100%</div>`. Weight/Age in same table.
- Contract: `<table class="squashed">` with Salary, Points bonus, Podium bonus, Win bonus, Races left as `<th>`/`<td>` pairs.
- Career: Trophies, Number of GPs, Wins, Podiums, Points scored, Pole positions, Fastest laps, Av pts/race.
- Training sessions: `<select name="SessionType">` with options: fitness (Fitness class, $750k), yoga (Yoga, $700k), pr (PR Training, $500k), tech (Technical training, $600k), sportspsychologist (Sports psychologist, $400k), ninja (Ninja class, $550k), spa (Spa resort, $500k). Submit button: `<input name="TrainDriver">`.

## AvailDrivers.asp / AvailTechDirectors.asp

**DOM-only as of 2026-07-27 (user requirement - never call `/AvailDrivers`/`/AvailTDs`)**: `parseAvailListDOM()` reads the market table directly off the live page (matches by header text - Overall/OA, Age, Minimal signing fee, Minimal salary, Offers - not fixed column index, since the exact header wording hasn't been captured live for every league). Now also captures each row's raw `<a>` `href` as `row.profileHref`, so the TD profile page URL is **discovered from the live link itself rather than guessed** - the market table already knows the right URL, we just weren't reading it. Result is cached into the stale store so `renderMarketOverview()` (the menu command, callable from any page) can show the last-captured list without ever making an API call.

**Per-candidate full-stat scraping (added iteration 24, 2026-07-27)**: a user-triggered "Scan Full Stats" button (`scanCandidatesFullStats`/`fetchCandidateFullStats`) fetches each *shortlisted* candidate's own profile page (real HTTP page load, not `/backend/api/v2` - doesn't touch the API budget) and parses real attributes - `DriverProfile.asp?ID=N` via the already-confirmed `parseDriverProfileDOM`, and the TD profile page (whatever URL `row.profileHref` captured) via the new `parseTdProfileDOM`. **`parseTdProfileDOM` is UNVERIFIED against a real TD profile page** - no TD profile page has ever been captured in this project. It tries both a label-text (`th`/`td`) pattern and an element-id pattern (mirroring `parseDriverProfileDOM`'s `Conc`/`Talent`/etc ids), logging to console if neither matches so a live-markup mismatch is diagnosable rather than silently returning null forever. Field names used (`leadership`, `mechanics`, `electronics`, `aerodynamics`, `pitCoord`, `motivation`, `experience`) are the exact API field names from `gpro-public-api.yml`'s `TDProfileResponse`/`SortTD` enum, not guessed. Results are cached per candidate ID indefinitely (same "doesn't decay by time" reasoning as other event data in this project) under `/DriProfileScout/{id}`/`/TDProfileScout/{id}` stale-cache keys, separate from the account's own `/DriProfile`/`/TDProfile` cache.

---

## Notes on scraping strategy

- Numeric car-character (Power/Handling/Accel) appears as **plain digits** in some places (UpdateCar.asp, Qualify pages tyre/risk row) but as **filled-vs-empty `lvl.gif` image counts** in the track-PHA bars on Qualify/Qualify2/RaceSetup — don't assume one format site-wide.
- Money is always dot-thousands (`$5.902.387`), matching `parseGproCash()` in the script already.
- **DOM-scraping fallback status (updated 2026-07-19)**: `UpdateCar.asp` (`parseUpdateCarDOM`), `DriverProfile.asp` (`parseDriverProfileDOM`), `TrackDetails.asp` (`parseTrackDetailsDOM`), `Suppliers.asp` (`parseTyreSuppliersDOM`), `StaffAndFacilities.asp` (`parseStaffFacilitiesDOM`), and `Testing.asp` (`parseTestingDOM`, **unverified against a live page - see ARCHITECTURE.md TODO 0b**) all scrape passively via `runPassiveCapture()`/`backgroundCaptureAuxPages()` whenever the script's `@match`ed and the user visits (or has recently visited) that page, writing into the same long-lived `stale_api_*` cache the API uses for graceful degradation. Weather/Q1/Q2 temps are scraped live in-place on Qualify.asp/Qualify2.asp/RaceSetup.asp (`scrapeSessionTempsFromDOM`) but not written to the stale cache. `/Office` is the one remaining category with no DOM fallback at all - its fields (tyre supplier ID, TD/staff info) aren't cleanly exposed anywhere else on the site.
