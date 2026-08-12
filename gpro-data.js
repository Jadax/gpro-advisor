// GPRO Strategy Tool - Data Configuration
// Made with ❤ by Tushant Sharma
// League caps, car part targets, facility targets, and strategy data.

var GPRO_DATA = {
 // ============================================================
 // LEAGUE STRUCTURE & LIMITS
 // ============================================================
 // driverMaxOA corrected 2026-07-27 - wiki caps were stale (showed Amateur 80, real is 110);
 // user confirmed live in-game and supplied the authoritative current values below.
 leagues: {
 Rookie: {
 driverMaxOA: 85,
 facilityMax: 20,
 carPartMax: 9,
 startMoney: 30000000, // $30M ($35M if raced all 17)
 resetsEachSeason: true, // car L1, facilities L0, driver reset if OA>85
 tdAllowed: false,
 description: 'Don\'t spend money unless you have to. Save for promotion.',
 },
 Amateur: {
 driverMaxOA: 110,
 facilityMax: 40,
 carPartMax: 9,
 startMoney: null, // carries over
 resetsEachSeason: false,
 tdAllowed: false,
 description: 'Balanced car build. Start investing in facilities and testing.',
 },
 Pro: {
 driverMaxOA: 135,
 facilityMax: 60,
 carPartMax: 9,
 startMoney: null,
 resetsEachSeason: false,
 tdAllowed: true,
 description: 'TD becomes available. Higher driver OA cap.',
 },
 Master: {
 driverMaxOA: 160,
 facilityMax: 80,
 carPartMax: 9,
 startMoney: null,
 resetsEachSeason: false,
 tdAllowed: true,
 description: 'Push facilities higher. Maximize CCP conversion.',
 },
 Elite: {
 driverMaxOA: 999, // no cap, per user confirmation
 facilityMax: 999, // no practical cap
 carPartMax: 9,
 startMoney: null,
 resetsEachSeason: false,
 tdAllowed: true,
 description: 'Endgame. Max everything. Optimize every detail.',
 },
 },

 // ============================================================
 // CAR PART LEVEL TARGETS PER LEAGUE
 // ============================================================
 // Based on established analysis: upgrade parts only when worn,
 // balance PHA for upcoming tracks, save money for promotion
 carTargets: {
 Rookie: {
 // Don't spend much - car resets anyway
 // Focus on driver, not car
 target: { avg: 2, range: [1, 3] },
 parts: {
 'Chassis': 2, 'Engine': 2, 'Front Wing': 2, 'Rear Wing': 2,
 'Underbody': 2, 'Sidepods': 2, 'Cooling': 2, 'Gearbox': 2,
 'Brakes': 2, 'Suspension': 2, 'Electronics': 2,
 },
 notes: 'Car resets to L1 each season. Only replace worn parts. Save money for Amateur.',
 },
 Amateur: {
 // Balanced L5-7 build, prioritize Engine/Brakes for PHA
 target: { avg: 6, range: [5, 7] },
 parts: {
 'Chassis': 6, 'Engine': 7, 'Front Wing': 6, 'Rear Wing': 6,
 'Underbody': 5, 'Sidepods': 5, 'Cooling': 5, 'Gearbox': 6,
 'Brakes': 7, 'Suspension': 6, 'Electronics': 5,
 },
 notes: 'Engine & Brakes drive Power & Handling (most track-critical). Balance for PHA.',
 },
 Pro: {
 // Push to L7-8, start optimizing PHA per track
 target: { avg: 8, range: [7, 9] },
 parts: {
 'Chassis': 8, 'Engine': 9, 'Front Wing': 8, 'Rear Wing': 8,
 'Underbody': 7, 'Sidepods': 7, 'Cooling': 7, 'Gearbox': 8,
 'Brakes': 9, 'Suspension': 8, 'Electronics': 7,
 },
 notes: 'TD available. Push Engine/Brakes to L9. Balance rest.',
 },
 Master: {
 // Max everything L8-9
 target: { avg: 9, range: [8, 9] },
 parts: {
 'Chassis': 9, 'Engine': 9, 'Front Wing': 9, 'Rear Wing': 9,
 'Underbody': 8, 'Sidepods': 8, 'Cooling': 8, 'Gearbox': 9,
 'Brakes': 9, 'Suspension': 9, 'Electronics': 8,
 },
 notes: 'Near-max build. Optimize PHA per track.',
 },
 Elite: {
 // Everything L9
 target: { avg: 9, range: [9, 9] },
 parts: {
 'Chassis': 9, 'Engine': 9, 'Front Wing': 9, 'Rear Wing': 9,
 'Underbody': 9, 'Sidepods': 9, 'Cooling': 9, 'Gearbox': 9,
 'Brakes': 9, 'Suspension': 9, 'Electronics': 9,
 },
 notes: 'Full L9 build. PHA optimization is everything.',
 },
 },

 // ============================================================
 // PHA CONTRIBUTION PER PART PER LEVEL
 // ============================================================
 // Verified against internal formulas data.py profileFactors (2026-07-17) - matches
 // almost exactly, with a few small secondary-axis contributions our old table zeroed out.
 phaContrib: {
 'Chassis': { power: 0.8, handling: 1.8, accel: 1.4 },
 'Engine': { power: 5.8, handling: 0.6, accel: 2.1 },
 'Front Wing': { power: 0.25, handling: 2.45, accel: 1.2 },
 'Rear Wing': { power: 0.25, handling: 2.45, accel: 1.2 },
 'Underbody': { power: 0.2, handling: 1.2, accel: 0.5 },
 'Sidepods': { power: 0.3, handling: 0.7, accel: 0 },
 'Cooling': { power: 1.2, handling: 0, accel: 0.2 },
 'Gearbox': { power: 3.2, handling: 0.7, accel: 4.1 },
 'Brakes': { power: 0, handling: 2.0, accel: 0 },
 'Suspension': { power: 0, handling: 1.6, accel: 1.2 },
 'Electronics': { power: 1.4, handling: 0, accel: 1.4 },
  },

 // Legacy temperature-based setup constants (used as fallback when GAPP setup data is missing).
 // Q2/Race deltas are 0 for this account's driver (Jim Buller), matching live practice findings.
 setupConstants: {
 parts: ['Front Wing', 'Rear Wing', 'Engine', 'Brakes', 'Gearbox', 'Suspension'],
 baseQ1: { 'Front Wing': 227, 'Rear Wing': 567, 'Engine': 809, 'Brakes': 334, 'Gearbox': 686, 'Suspension': 493 },
 coeff: { 'Front Wing': 4.77, 'Rear Wing': 6.03, 'Engine': -3.13, 'Brakes': 6.0, 'Gearbox': -4.0, 'Suspension': -6.0 },
 q2Delta: { 'Front Wing': 0, 'Rear Wing': 0, 'Engine': 0, 'Brakes': 0, 'Gearbox': 0, 'Suspension': 0 },
 raceDelta: { 'Front Wing': 0, 'Rear Wing': 0, 'Engine': 0, 'Brakes': 0, 'Gearbox': 0, 'Suspension': 0 },
 wetMod: { 'Front Wing': 68, 'Rear Wing': -44, 'Engine': -5, 'Brakes': 5, 'Gearbox': -206, 'Suspension': 6 },
 trackAdj: { 'Front Wing': 54.6, 'Rear Wing': 19.2, 'Engine': 6.5, 'Brakes': -16.0, 'Gearbox': -13.5, 'Suspension': 20.0 },
 montrealPower: 12,
 },

 // Base cost ($) to upgrade each part from level N-1 to N (Edit: first-entry = L1 cost).
 // Used by calcUpgradeCostExact fallback when one specific part's level cost isn't DOM-scraped.
 carCosts: {
 partBaseCost: {
  'Chassis': 1292539, 'Engine': 3311737, 'Front Wing': 1551354,
  'Rear Wing': 1504126, 'Underbody': 510128, 'Sidepods': 459831,
  'Cooling': 454545, 'Gearbox': 3098104, 'Brakes': 697674,
  'Suspension': 1181545, 'Electronics': 938416,
 },
 },

 // Per-part base race wear + track wear scale, used by the legacy (non-GAPP) wear model.
 wearPerLap: {
 base: {
  'Chassis': 21, 'Engine': 37, 'Front Wing': 21, 'Rear Wing': 14,
  'Underbody': 13, 'Sidepods': 12, 'Cooling': 13, 'Gearbox': 16,
  'Brakes': 22, 'Suspension': 19, 'Electronics': 10,
 },
 scale: { 'Low': 0.6, 'Medium': 0.85, 'High': 1.0 },
 },

 // Part upgrade priority order (most impactful for Power PHA first).
 upgradePriority: {
  'Engine': 1, 'Brakes': 2, 'Chassis': 3, 'Front Wing': 3, 'Rear Wing': 3,
  'Suspension': 4, 'Gearbox': 4, 'Electronics': 5, 'Underbody': 6, 'Sidepods': 6, 'Cooling': 6,
 },

 // Wear alert thresholds (% remaining) for fast- and slow-wearing parts.
 wearConstants: {
 fastWearParts: ['Chassis', 'Engine', 'Front Wing', 'Rear Wing', 'Gearbox'],
 slowWearParts: ['Underbody', 'Sidepods', 'Cooling', 'Brakes', 'Suspension', 'Electronics'],
 critical: 10, fastAlert: 30, slowAlert: 15,
 },

 // Legume: street circuits raise braking/susp stress, speedways raise engine stress.
 trackTypeWear: {
 street: { note: 'Street circuits stress brakes & suspension (×1.3-1.5) - prioritise those parts.', brakes: 1.4, susp: 1.4 },
 speedway: { note: 'Speedways stress the engine (×1.4) and reduce braking wear (×0.7).', engine: 1.4, brakes: 0.7 },
 road: { note: 'Road courses are the baseline for part wear.', brakes: 1.0, susp: 1.0, engine: 1.0 },
 },

 // ============================================================
 // FACILITY TARGETS PER LEAGUE
 // ============================================================
 facilityTargets: {
 Rookie: {
 'Pitstop Training Center': 5,
 'Commercial': 5,
 'Engineering': 0,
 'R&D Workshop': 0,
 'R&D Design': 0,
 'Lab': 0,
 'Windtunnel': 0,
 },
 Amateur: {
 'Pitstop Training Center': 20,
 'Commercial': 15,
 'Engineering': 10,
 'R&D Workshop': 5,
 'R&D Design': 5,
 'Lab': 0,
 'Windtunnel': 0,
 },
 Pro: {
 'Pitstop Training Center': 30,
 'Commercial': 25,
 'Engineering': 20,
 'R&D Workshop': 15,
 'R&D Design': 15,
 'Lab': 10,
 'Windtunnel': 5,
 },
 Master: {
 'Pitstop Training Center': 50,
 'Commercial': 40,
 'Engineering': 40,
 'R&D Workshop': 30,
 'R&D Design': 30,
 'Lab': 20,
 'Windtunnel': 15,
 },
 Elite: {
 'Pitstop Training Center': 80,
 'Commercial': 60,
 'Engineering': 60,
 'R&D Workshop': 50,
 'R&D Design': 50,
 'Lab': 40,
 'Windtunnel': 30,
 },
 },

 // ============================================================
 // STAFF TRAINING PRIORITY PER LEAGUE
 // ============================================================
 // Only the 3 actually-trainable skills belong here (see staffSkills' trainable flag above) -
 // Technical Skill/Experience/Motivation were removed 2026-07-27, they were never purchasable.
 // Same order for every league: Concentration first (biggest game-community-consensus impact on
 // pitstop/strategy error reduction), Stress Handling second (pit-time consistency), Efficiency
 // third (wear reduction) - training level is capped by average facility level regardless of
 // league, so a lower league just hits that cap sooner, not a different priority order.
 staffPriority: {
 Rookie: ['Concentration', 'Stress Handling', 'Efficiency'],
 Amateur: ['Concentration', 'Stress Handling', 'Efficiency'],
 Pro: ['Concentration', 'Stress Handling', 'Efficiency'],
 Master: ['Concentration', 'Stress Handling', 'Efficiency'],
 Elite: ['Concentration', 'Stress Handling', 'Efficiency'],
 },

 // ============================================================
 // TRACK PROFILES (17 races per season)
 // Updated with GPRO Analyzer Season data
 // ============================================================
 tracks: {
 'Barcelona GP': { overtaking: 'Hard', grip: 'Low', fuel: 'Medium', tyre: 'High', laps: 65, ctrGain: 2.832, ctrRace: 184.092, avgTemp: 30.46, type: 'road', pha: { power: 11, handling: 13, accel: 8, adv: 7 } },
 'Ahvenisto GP': { overtaking: 'Normal', grip: 'Normal', fuel: 'Medium', tyre: 'Medium', laps: 80, ctrGain: 3.277, ctrRace: 262.175, avgTemp: 25.07, type: 'road', pha: { power: 5, handling: 10, accel: 7, adv: 8 } },
 'Magny Cours GP': { overtaking: 'Hard', grip: 'High', fuel: 'Medium', tyre: 'Medium', laps: 72, ctrGain: 2.928, ctrRace: 210.845, avgTemp: 27.25, type: 'road', pha: { power: 12, handling: 8, accel: 11, adv: 5 } },
 'Poznan GP': { overtaking: 'Hard', grip: 'Normal', fuel: 'Low', tyre: 'High', laps: 75, ctrGain: 2.856, ctrRace: 214.223, avgTemp: 27.66, type: 'road', pha: { power: 7, handling: 14, accel: 8, adv: 13 } },
 'Al-Ring GP': { overtaking: 'Easy', grip: 'Low', fuel: 'Medium', tyre: 'High', laps: 71, ctrGain: 2.714, ctrRace: 192.694, avgTemp: 26.82, type: 'road', pha: { power: 13, handling: 8, accel: 9, adv: 9 } },
 'Jyllands-Ringen GP': { overtaking: 'Normal', grip: 'Normal', fuel: 'Very Low', tyre: 'Very High', laps: 136, ctrGain: 4.111, ctrRace: 559.049, avgTemp: 27.03, type: 'road', pha: { power: 5, handling: 9, accel: 4, adv: 9 } },
 'Silverstone GP': { overtaking: 'Normal', grip: 'Normal', fuel: 'Medium', tyre: 'Medium', laps: 52, ctrGain: 2.302, ctrRace: 119.708, avgTemp: 27.14, type: 'road', pha: { power: 11, handling: 12, accel: 16, adv: 9 } },
 'Buenos Aires GP': { overtaking: 'Very Hard', grip: 'Normal', fuel: 'Medium', tyre: 'High', laps: 72, ctrGain: 3.309, ctrRace: 238.233, avgTemp: 26.31, type: 'road', pha: { power: 12, handling: 11, accel: 9, adv: 4 } },
 'Austin GP': { overtaking: 'Easy', grip: 'High', fuel: 'Medium', tyre: 'High', laps: 56, ctrGain: 3.242, ctrRace: 181.580, avgTemp: 28.42, type: 'road', pha: { power: 11, handling: 18, accel: 10, adv: 15 } },
 'Montreal GP': { overtaking: 'Normal', grip: 'Very Low', fuel: 'Medium', tyre: 'Medium', laps: 69, ctrGain: 2.905, ctrRace: 200.463, avgTemp: 27.52, type: 'street', pha: { power: 12, handling: 7, accel: 13, adv: 7 } },
 'Spa GP': { overtaking: 'Normal', grip: 'Normal', fuel: 'Medium', tyre: 'Medium', laps: 44, ctrGain: 2.543, ctrRace: 111.904, avgTemp: 14.79, type: 'road', pha: { power: 18, handling: 16, accel: 13, adv: 7 } },
 'Kaunas GP': { overtaking: 'Normal', grip: 'Low', fuel: 'Medium', tyre: 'High', laps: 80, ctrGain: 2.908, ctrRace: 232.670, avgTemp: 20.21, type: 'road', pha: { power: 9, handling: 10, accel: 5, adv: 6 } },
 'Hungaroring GP': { overtaking: 'Very Hard', grip: 'Very High', fuel: 'Medium', tyre: 'High', laps: 77, ctrGain: 3.206, ctrRace: 246.852, avgTemp: 25.56, type: 'road', pha: { power: 7, handling: 10, accel: 13, adv: 9 } },
 'Losail GP': { overtaking: 'Hard', grip: 'High', fuel: 'Medium', tyre: 'Medium', laps: 57, ctrGain: 2.600, ctrRace: 148.198, avgTemp: 5.98, type: 'road', pha: { power: 13, handling: 16, accel: 9, adv: 10 } },
 'New Delhi GP': { overtaking: 'Normal', grip: 'Very Low', fuel: 'Medium', tyre: 'High', laps: 60, ctrGain: 2.712, ctrRace: 162.742, avgTemp: 31.24, type: 'road', pha: { power: 11, handling: 15, accel: 10, adv: 9 } },
 'Yas Marina GP': { overtaking: 'Hard', grip: 'High', fuel: 'Medium', tyre: 'Medium', laps: 55, ctrGain: 2.846, ctrRace: 156.526, avgTemp: 23.79, type: 'road', pha: { power: 12, handling: 10, accel: 17, adv: 12 } },
 'Baku City GP': { overtaking: 'Easy', grip: 'High', fuel: 'Medium', tyre: 'Medium', laps: 51, ctrGain: 2.897, ctrRace: 147.757, avgTemp: 29.63, type: 'street', pha: { power: 18, handling: 8, accel: 16, adv: 12 } },
 },

 // ============================================================
 // CAR WEAR MULTIPLIERS PER TRACK
 // Relative wear intensity per track (1.0 = average)
 // Higher = more wear on all parts
 // From GPRO Analyzer Season Car Wear bars
 // ============================================================
 trackWearIntensity: {
 'Barcelona GP': 1.15, // High tyre wear track
 'Ahvenisto GP': 0.95,
 'Magny Cours GP': 1.00,
 'Poznan GP': 1.20, // Very high wear
 'Al-Ring GP': 1.10,
 'Jyllands-Ringen GP': 1.25, // Longest race, high wear
 'Silverstone GP': 0.90,
 'Buenos Aires GP': 1.05,
 'Austin GP': 1.10,
 'Montreal GP': 1.00,
 'Spa GP': 1.00,
 'Kaunas GP': 1.05,
 'Hungaroring GP': 1.20, // Very high tyre wear
 'Losail GP': 0.85,
 'New Delhi GP': 1.10,
 'Yas Marina GP': 0.95,
 'Baku City GP': 0.90,
 },

 // Note: trackFuelConsumption/trackTyreWear tables (fuel/tyre-wear rating per track) used to be
 // duplicated here as separate top-level tables - removed 2026-07-19, confirmed byte-identical to
 // the `fuel`/`tyre` fields already on each entry in `tracks` above, which is what's actually read
 // (via GPRO_Strategy_Tool.user.js's TRACK_PROFILES/SEASON_TRACKS). `trackWearIntensity` below is
 // different: its values are NOT duplicated on `tracks` entries, and it was sitting unused until
 // 2026-07-19 when `lookupSeasonTrack()` was fixed to actually merge it in (see that function) -
 // callers reading `.wearIntensity` were silently getting `undefined` before that fix. Kept here.

 // ============================================================
 // RACE RISK GUIDELINES
 // ============================================================
 risks: {
 Rookie: { max: 0, note: 'Zero risks recommended. 40 is "very high" for Rookies.' },
 Amateur: { max: 20, note: 'Conservative risks. Max 20 for overtaking/defend.' },
 Pro: { max: 30, note: 'Moderate risks. Monitor car wear closely.' },
 Master: { max: 40, note: 'Higher risks acceptable with good car/staff.' },
 Elite: { max: 50, note: 'Aggressive risks possible with max everything.' },
 },

 // ============================================================
 // our calibrated model CALIBRATION DATA (Spa GP, 44 laps, 13.5s pit loss)
 // Driver: Jim Buller (Conc=161, Tal=73, Exp=32, TI=122, Aggr=8, Weight=66)
 // Car: Chassis L5, Engine L7, FW L6, RW L6, UB L6, Sidepods L5, Cooling L5, GB L5, Brakes L8, Susp L6, Elec L4
 // PHA: Power 78, Handling 82, Acceleration 74
 // ============================================================
 gproAnalyzerCalibration: {
 'Spa GP': {
 laps: 44,
 pitLoss: 13.5,
 driver: { name: 'Jim Buller', conc: 161, talent: 73, exp: 32, ti: 122, aggr: 8, weight: 66 },
 car: { power: 78, handling: 82, accel: 74 },
 strategies: {
 baseline: { // CTR=0, Exp=33, TI=123
 'Extra Soft': { stops: 5, fuel: 37, total: 220.60, tcd: 0, fld: 27.58, pits: 192.80 },
 'Soft': { stops: 3, fuel: 55, total: 155.33, tcd: -3.64, fld: 41.37, pits: 117.71 },
 'Medium': { stops: 2, fuel: 73, total: 127.84, tcd: -7.28, fld: 55.38, pits: 79.75 },
 'Hard': { stops: 2, fuel: 73, total: 124.20, tcd: -10.93, fld: 55.38, pits: 79.75 },
 'Rain': { stops: 1, fuel: 44, total: 72.05 },
 },
 ctr10: { // CTR=10
 'Extra Soft': { stops: 5, fuel: 37, total: 221.00, tcd: 0, fld: 27.58, pits: 192.80 },
 'Soft': { stops: 3, fuel: 55, total: 156.09, tcd: -3.64, fld: 41.37, pits: 117.71 },
 'Medium': { stops: 2, fuel: 73, total: 128.57, tcd: -7.28, fld: 55.38, pits: 79.75 },
 'Hard': { stops: 2, fuel: 73, total: 124.93, tcd: -10.93, fld: 55.38, pits: 79.75 },
 'Rain': { stops: 1, fuel: 44, total: 73.06 },
 },
 ctr50: { // CTR=50
 'Extra Soft': { stops: 5, fuel: 37, total: 221.00 },
 'Soft': { stops: 3, fuel: 55, total: 156.09 },
 'Medium': { stops: 2, fuel: 73, total: 128.57 },
 'Hard': { stops: 2, fuel: 73, total: 124.93 },
 'Rain': { stops: 1, fuel: 44, total: 73.06 },
 },
 exp50: { // Exp=50
 'Extra Soft': { stops: 5, fuel: 37, total: 220.94 },
 'Soft': { stops: 3, fuel: 55, total: 156.00 },
 'Medium': { stops: 2, fuel: 73, total: 128.38 },
 'Hard': { stops: 2, fuel: 73, total: 124.74 },
 'Rain': { stops: 1, fuel: 44, total: 72.89 },
 },
 exp100: { // Exp=100
 'Extra Soft': { stops: 5, fuel: 37, total: 220.77 },
 'Soft': { stops: 3, fuel: 55, total: 155.75 },
 'Medium': { stops: 2, fuel: 73, total: 128.04 },
 'Hard': { stops: 2, fuel: 73, total: 124.40 },
 'Rain': { stops: 1, fuel: 44, total: 72.34 },
 },
 exp100ti150: { // Exp=100, TI=150
 'Extra Soft': { stops: 5, fuel: 37, total: 220.60 },
 'Soft': { stops: 3, fuel: 55, total: 155.49 },
 'Medium': { stops: 2, fuel: 73, total: 127.70 },
 'Hard': { stops: 2, fuel: 73, total: 124.05 },
 'Rain': { stops: 1, fuel: 44, total: 71.82 },
 },
 exp100ti200: { // Exp=100, TI=200
 'Extra Soft': { stops: 5, fuel: 37, total: 220.10 },
 'Soft': { stops: 3, fuel: 55, total: 154.90 },
 'Medium': { stops: 2, fuel: 73, total: 126.98 },
 'Hard': { stops: 2, fuel: 73, total: 123.34 },
 'Rain': { stops: 1, fuel: 44, total: 70.79 },
 },
 exp150ti200: { // Exp=150, TI=200
 'Extra Soft': { stops: 5, fuel: 37, total: 219.93 },
 'Soft': { stops: 3, fuel: 55, total: 154.65 },
 'Medium': { stops: 2, fuel: 73, total: 126.57 },
 'Hard': { stops: 2, fuel: 73, total: 122.93 },
 'Rain': { stops: 1, fuel: 44, total: 70.28 },
 },
 conc110Exp150Ti200Aggr50: { // Conc=110, Exp=150, TI=200, Aggr=50
 'Extra Soft': { stops: 5, fuel: 37, total: 220.25 },
 'Soft': { stops: 3, fuel: 55, total: 155.12 },
 'Medium': { stops: 2, fuel: 73, total: 127.28 },
 'Hard': { stops: 2, fuel: 73, total: 123.64 },
 'Rain': { stops: 1, fuel: 44, total: 71.27 },
 },
 conc110Exp150Ti200Aggr100: { // Aggr=100
 'Extra Soft': { stops: 5, fuel: 37, total: 220.38 },
 'Soft': { stops: 3, fuel: 55, total: 155.33 },
 'Medium': { stops: 2, fuel: 73, total: 127.56 },
 'Hard': { stops: 2, fuel: 73, total: 123.92 },
 'Rain': { stops: 1, fuel: 44, total: 71.69 },
 },
 engine6: { // Engine L6 (vs L7 baseline)
 'Extra Soft': { stops: 5, fuel: 37, total: 221.17 },
 'Soft': { stops: 3, fuel: 55, total: 156.45 },
 'Medium': { stops: 2, fuel: 73, total: 128.91 },
 'Hard': { stops: 2, fuel: 73, total: 125.27 },
 'Rain': { stops: 1, fuel: 44, total: 73.61 },
 },
 susp6elec5: { // Susp L6, Elec L5 (vs Elec L4 baseline)
 'Extra Soft': { stops: 5, fuel: 37, total: 220.67 },
 'Soft': { stops: 3, fuel: 55, total: 155.60 },
 'Medium': { stops: 2, fuel: 73, total: 127.84 },
 'Hard': { stops: 2, fuel: 73, total: 124.20 },
 'Rain': { stops: 1, fuel: 44, total: 72.05 },
 },
 susp7elec6: { // Susp L7, Elec L6
 'Extra Soft': { stops: 5, fuel: 37, total: 220.16 },
 'Soft': { stops: 3, fuel: 55, total: 155.00 },
 'Medium': { stops: 2, fuel: 73, total: 127.12 },
 'Hard': { stops: 2, fuel: 73, total: 123.48 },
 'Rain': { stops: 1, fuel: 44, total: 71.03 },
 },
 engine9susp9elec6: { // Engine L9, Susp L9, Elec L6
 'Extra Soft': { stops: 5, fuel: 37, total: 218.99 },
 'Soft': { stops: 3, fuel: 55, total: 153.30 },
 'Medium': { stops: 2, fuel: 73, total: 124.92 },
 'Hard': { stops: 2, fuel: 73, total: 121.27 },
 'Rain': { stops: 1, fuel: 44, total: 67.90 },
 },
 engine9susp9elec9: { // Engine L9, Susp L9, Elec L9
 'Extra Soft': { stops: 5, fuel: 37, total: 217.83 },
 'Soft': { stops: 3, fuel: 55, total: 151.61 },
 'Medium': { stops: 2, fuel: 73, total: 122.81 },
 'Hard': { stops: 2, fuel: 73, total: 119.17 },
 'Rain': { stops: 1, fuel: 44, total: 64.82 },
 },
 },
 // ============================================================
 // NEW: CTR=30 scenario
 // ============================================================
 ctr30: {
 'Extra Soft': { stops: 5, fuel: 37, total: 221.00, tcd: 0, fld: 28.02, pits: 192.98 },
 'Soft': { stops: 4, fuel: 44, total: 185.36, tcd: -3.64, fld: 33.62, pits: 155.38 },
 'Medium': { stops: 3, fuel: 55, total: 152.45, tcd: -7.28, fld: 42.02, pits: 117.71 },
 'Hard': { stops: 2, fuel: 74, total: 124.93, tcd: -10.93, fld: 56.03, pits: 79.82 },
 'Rain': { stops: 1, fuel: 45, total: 73.06 },
 },
 // ============================================================
 // NEW: Aggression sweep at baseline (Exp=33, TI=123, Conc=161)
 // Shows how aggr affects strategy: higher aggr = more fuel, more stops, slower
 // ============================================================
 aggr50: {
 'Extra Soft': { stops: 5, fuel: 37, total: 221.11, tcd: 0, fld: 28.13, pits: 192.98 },
 'Soft': { stops: 3, fuel: 56, total: 156.37, tcd: -3.64, fld: 42.20, pits: 117.81 },
 'Medium': { stops: 2, fuel: 74, total: 128.80, tcd: -7.28, fld: 56.26, pits: 79.82 },
 'Hard': { stops: 2, fuel: 74, total: 125.16, tcd: -10.93, fld: 56.26, pits: 79.82 },
 'Rain': { stops: 1, fuel: 46, total: 73.45 },
 },
 aggr100: {
 'Extra Soft': { stops: 5, fuel: 37, total: 221.25, tcd: 0, fld: 28.27, pits: 192.98 },
 'Soft': { stops: 4, fuel: 45, total: 185.80, tcd: -3.64, fld: 33.92, pits: 155.52 },
 'Medium': { stops: 2, fuel: 74, total: 129.08, tcd: -7.28, fld: 56.54, pits: 79.82 },
 'Hard': { stops: 2, fuel: 74, total: 125.44, tcd: -10.93, fld: 56.54, pits: 79.82 },
 'Rain': { stops: 1, fuel: 46, total: 73.86 },
 },
 aggr150: {
 'Extra Soft': { stops: 5, fuel: 38, total: 221.57, tcd: 0, fld: 28.41, pits: 193.16 },
 'Soft': { stops: 4, fuel: 45, total: 185.97, tcd: -3.64, fld: 34.09, pits: 155.52 },
 'Medium': { stops: 3, fuel: 56, total: 153.14, tcd: -7.28, fld: 42.61, pits: 117.81 },
 'Hard': { stops: 2, fuel: 75, total: 125.78, tcd: -10.93, fld: 56.82, pits: 79.89 },
 'Rain': { stops: 1, fuel: 47, total: 74.31 },
 },
 aggr200: {
 'Extra Soft': { stops: 5, fuel: 38, total: 221.71, tcd: 0, fld: 28.55, pits: 193.16 },
 'Soft': { stops: 4, fuel: 45, total: 186.14, tcd: -3.64, fld: 34.26, pits: 155.52 },
 'Medium': { stops: 3, fuel: 56, total: 153.35, tcd: -7.28, fld: 42.82, pits: 117.81 },
 'Hard': { stops: 2, fuel: 75, total: 126.06, tcd: -10.93, fld: 57.09, pits: 79.89 },
 'Rain': { stops: 1, fuel: 47, total: 74.73 },
 },
 // ============================================================
 // NEW: Experience + Aggression combos
 // ============================================================
 exp50aggr200: {
 'Extra Soft': { stops: 5, fuel: 38, total: 221.65, tcd: 0, fld: 28.49, pits: 193.16 },
 'Soft': { stops: 4, fuel: 45, total: 186.07, tcd: -3.64, fld: 34.19, pits: 155.52 },
 'Medium': { stops: 3, fuel: 56, total: 153.26, tcd: -7.28, fld: 42.73, pits: 117.81 },
 'Hard': { stops: 2, fuel: 75, total: 125.94, tcd: -10.93, fld: 56.98, pits: 79.89 },
 'Rain': { stops: 1, fuel: 47, total: 74.55 },
 },
 exp100aggr200: {
 'Extra Soft': { stops: 5, fuel: 37, total: 221.30, tcd: 0, fld: 28.32, pits: 192.98 },
 'Soft': { stops: 4, fuel: 45, total: 185.86, tcd: -3.64, fld: 33.98, pits: 155.52 },
 'Medium': { stops: 3, fuel: 56, total: 153.01, tcd: -7.28, fld: 42.48, pits: 117.81 },
 'Hard': { stops: 2, fuel: 74, total: 125.53, tcd: -10.93, fld: 56.64, pits: 79.82 },
 'Rain': { stops: 1, fuel: 46, total: 74.01 },
 },
 exp150aggr200: {
 'Extra Soft': { stops: 5, fuel: 37, total: 221.13, tcd: 0, fld: 28.15, pits: 192.98 },
 'Soft': { stops: 4, fuel: 45, total: 185.66, tcd: -3.64, fld: 33.78, pits: 155.52 },
 'Medium': { stops: 2, fuel: 74, total: 128.84, tcd: -7.28, fld: 56.30, pits: 79.82 },
 'Hard': { stops: 2, fuel: 74, total: 125.20, tcd: -10.93, fld: 56.30, pits: 79.82 },
 'Rain': { stops: 1, fuel: 46, total: 73.50 },
 },
 // ============================================================
 // NEW: Technical Director (TD) impact
 // TD Experience reduces pit times; TD Pit Coordination also reduces pit times
 // Baseline TD: Exp=0, PitCoord=0 → Pits: ES=192.98, S=117.71, M/H=79.82, R=38.88
 // ============================================================
 tdExp1: {
 'Extra Soft': { stops: 5, fuel: 37, total: 218.87, tcd: 0, fld: 28.02, pits: 190.85 },
 'Soft': { stops: 3, fuel: 55, total: 154.59, tcd: -3.64, fld: 42.02, pits: 116.21 },
 'Medium': { stops: 2, fuel: 74, total: 127.42, tcd: -7.28, fld: 56.03, pits: 78.67 },
 'Hard': { stops: 2, fuel: 74, total: 123.77, tcd: -10.93, fld: 56.03, pits: 78.67 },
 'Rain': { stops: 1, fuel: 45, total: 72.60 },
 },
 tdExp2: {
 'Extra Soft': { stops: 5, fuel: 37, total: 218.82, tcd: 0, fld: 28.02, pits: 190.80 },
 'Soft': { stops: 3, fuel: 55, total: 154.56, tcd: -3.64, fld: 42.02, pits: 116.18 },
 'Medium': { stops: 2, fuel: 74, total: 127.40, tcd: -7.28, fld: 56.03, pits: 78.65 },
 'Hard': { stops: 2, fuel: 74, total: 123.75, tcd: -10.93, fld: 56.03, pits: 78.65 },
 'Rain': { stops: 1, fuel: 45, total: 72.59 },
 },
 tdExp3: {
 'Extra Soft': { stops: 5, fuel: 37, total: 218.77, tcd: 0, fld: 28.02, pits: 190.76 },
 'Soft': { stops: 3, fuel: 55, total: 154.53, tcd: -3.64, fld: 42.02, pits: 116.15 },
 'Medium': { stops: 2, fuel: 74, total: 127.38, tcd: -7.28, fld: 56.03, pits: 78.63 },
 'Hard': { stops: 2, fuel: 74, total: 123.74, tcd: -10.93, fld: 56.03, pits: 78.63 },
 'Rain': { stops: 1, fuel: 45, total: 72.58 },
 },
 tdExp5: {
 'Extra Soft': { stops: 5, fuel: 37, total: 218.68, tcd: 0, fld: 28.02, pits: 190.66 },
 'Soft': { stops: 3, fuel: 55, total: 154.48, tcd: -3.64, fld: 42.02, pits: 116.10 },
 'Medium': { stops: 2, fuel: 74, total: 127.34, tcd: -7.28, fld: 56.03, pits: 78.59 },
 'Hard': { stops: 2, fuel: 74, total: 123.70, tcd: -10.93, fld: 56.03, pits: 78.59 },
 'Rain': { stops: 1, fuel: 45, total: 72.57 },
 },
 tdPitCoord1: {
 'Extra Soft': { stops: 5, fuel: 37, total: 218.86, tcd: 0, fld: 28.02, pits: 190.84 },
 'Soft': { stops: 3, fuel: 55, total: 154.59, tcd: -3.64, fld: 42.02, pits: 116.20 },
 'Medium': { stops: 2, fuel: 74, total: 127.41, tcd: -7.28, fld: 56.03, pits: 78.67 },
 'Hard': { stops: 2, fuel: 74, total: 123.77, tcd: -10.93, fld: 56.03, pits: 78.67 },
 'Rain': { stops: 1, fuel: 45, total: 72.60 },
 },
 tdPitCoord3: {
 'Extra Soft': { stops: 5, fuel: 37, total: 218.74, tcd: 0, fld: 28.02, pits: 190.73 },
 'Soft': { stops: 3, fuel: 55, total: 154.52, tcd: -3.64, fld: 42.02, pits: 116.14 },
 'Medium': { stops: 2, fuel: 74, total: 127.37, tcd: -7.28, fld: 56.03, pits: 78.62 },
 'Hard': { stops: 2, fuel: 74, total: 123.73, tcd: -10.93, fld: 56.03, pits: 78.62 },
 'Rain': { stops: 1, fuel: 45, total: 72.58 },
 },
 tdPitCoord5: {
 'Extra Soft': { stops: 5, fuel: 37, total: 218.63, tcd: 0, fld: 28.02, pits: 190.62 },
 'Soft': { stops: 3, fuel: 55, total: 154.45, tcd: -3.64, fld: 42.02, pits: 116.07 },
 'Medium': { stops: 2, fuel: 74, total: 127.32, tcd: -7.28, fld: 56.03, pits: 78.58 },
 'Hard': { stops: 2, fuel: 74, total: 123.68, tcd: -10.93, fld: 56.03, pits: 78.58 },
 'Rain': { stops: 1, fuel: 45, total: 72.56 },
 },
 // ============================================================
 // NEW: Detailed pit strategy breakdowns
 // Stint laps, fuel per stint, tyre wear per stint
 // ============================================================
 pitStrategies: {
 'Extra Soft': {
 stints: 6,
 laps: [8, 8, 7, 7, 7, 7],
 fuel: [40.1, 40.1, 35.1, 35.1, 35.1, 35.1],
 tyreWear: [21.3, 21.3, 31.2, 31.2, 31.2, 31.2],
 },
 'Soft': {
 stints: 4,
 laps: [11, 11, 11, 11],
 fuel: [55.1, 55.1, 55.1, 55.1],
 tyreWear: [20.2, 20.2, 20.2, 20.2],
 },
 'Medium': {
 stints: 3,
 laps: [15, 15, 14],
 fuel: [75.0, 75.0, 70.0],
 tyreWear: [19.7, 19.7, 25.0],
 },
 'Hard': {
 stints: 3,
 laps: [15, 15, 14],
 fuel: [75.0, 75.0, 70.0],
 tyreWear: [40.7, 40.7, 44.7],
 },
 'Rain': {
 stints: 2,
 laps: [22, 22],
 fuel: [45.3, 45.3],
 tyreWear: [35.2, 35.2],
 },
 },
 // ============================================================
 // NEW: Car setup reference for Spa
 // FW/RW/Engine/Brakes/Gearbox/Suspension values for different conditions
 // ============================================================
 setupReference: {
 dry: {
 '20C': { q1: { fw: 650, rw: 802, e: 788, b: 358, g: 525, s: 493 }, q2: { fw: 674, rw: 832, e: 770, b: 388, g: 505, s: 463 }, race: { fw: 698, rw: 862, e: 754, b: 418, g: 485, s: 433 } },
 '35C': { q1: { fw: 721, rw: 893, e: 739, b: 448, g: 465, s: 403 }, q2: { fw: 745, rw: 923, e: 723, b: 478, g: 445, s: 373 }, race: { fw: 769, rw: 953, e: 707, b: 508, g: 425, s: 343 } },
 '45C': { q1: { fw: 769, rw: 953, e: 707, b: 508, g: 425, s: 343 }, q2: { fw: 861, rw: 938, e: 687, b: 547, g: 191, s: 318 }, race: { fw: 807, rw: 999, e: 682, b: 556, g: 393, s: 295 } },
 },
 wet: {
 '20C': { q1: { fw: 827, rw: 917, e: 664, b: 423, g: 440, s: 349 }, q2: { fw: 833, rw: 921, e: 667, b: 443, g: 400, s: 344 }, race: { fw: 838, rw: 924, e: 671, b: 463, g: 360, s: 339 } },
 '35C': { q1: { fw: 844, rw: 928, e: 675, b: 483, g: 320, s: 334 }, q2: { fw: 849, rw: 931, e: 679, b: 503, g: 280, s: 329 }, race: { fw: 855, rw: 935, e: 682, b: 523, g: 240, s: 324 } },
 },
 },
 // Calibration reference data (Spa): dry best is 2-stop Hard, Rain always fastest (1-stop),
 // Higher temp lowers Engine/FW/RW and raises Brakes/Susp; the numbered deltas below were trimmed.
 // See this track's original strategy sweep for the per-engine/driver/TD effect sizes.
 },
 'Kaunas GP': {
 laps: 80,
 pitLoss: 11,
 driver: { conc: 161, aggr: 8, exp: 33, ti: 123, weight: 66 },
 car: { engine: 2, susp: 6, elec: 4 },
 tyreSupplier: 'Pipirelli',
 tyreFinalWear: 15,
 avgRaceTemp: 14,
 strategies: {
 baseline: { // CTR=0
 'Extra Soft': { stops: 3, fuel: 50, pitTime: 25.56, tcd: 0, fld: 32.63, pits: 109.67, total: 142.31 },
 'Soft': { stops: 2, fuel: 66, pitTime: 26.13, tcd: 17.11, fld: 43.51, pits: 74.25, total: 134.87 },
 'Medium': { stops: 1, fuel: 99, pitTime: 27.30, tcd: 34.22, fld: 65.26, pits: 38.30, total: 137.79 },
 'Hard': { stops: 1, fuel: 99, pitTime: 27.30, tcd: 51.34, fld: 65.26, pits: 38.30, total: 154.90 },
 'Rain': { stops: 0, fuel: 177, pitTime: 30.07, tcd: 0, fld: 116.36, pits: 0.00, total: 116.36 },
 },
 ctr10: { // CTR=10 (identical result to CTR=30 below — Rain strategy switches to 1-stop)
 'Extra Soft': { stops: 3, fuel: 50, pitTime: 25.56, tcd: 0, fld: 32.63, pits: 109.67, total: 142.31 },
 'Soft': { stops: 2, fuel: 66, pitTime: 26.13, tcd: 17.11, fld: 43.51, pits: 74.25, total: 134.87 },
 'Medium': { stops: 1, fuel: 99, pitTime: 27.30, tcd: 34.22, fld: 65.26, pits: 38.30, total: 137.79 },
 'Hard': { stops: 1, fuel: 99, pitTime: 27.30, tcd: 51.34, fld: 65.26, pits: 38.30, total: 154.90 },
 'Rain': { stops: 1, fuel: 89, pitTime: 26.94, tcd: 0, fld: 58.18, pits: 37.94, total: 96.12 },
 },
 ctr30: { // CTR=30 — same as ctr10 in this sweep
 'Extra Soft': { stops: 3, fuel: 50, pitTime: 25.56, tcd: 0, fld: 32.63, pits: 109.67, total: 142.31 },
 'Soft': { stops: 2, fuel: 66, pitTime: 26.13, tcd: 17.11, fld: 43.51, pits: 74.25, total: 134.87 },
 'Medium': { stops: 1, fuel: 99, pitTime: 27.30, tcd: 34.22, fld: 65.26, pits: 38.30, total: 137.79 },
 'Hard': { stops: 1, fuel: 99, pitTime: 27.30, tcd: 51.34, fld: 65.26, pits: 38.30, total: 154.90 },
 'Rain': { stops: 1, fuel: 89, pitTime: 26.94, tcd: 0, fld: 58.18, pits: 37.94, total: 96.12 },
 },
 ctr50: { // CTR=50 — Medium switches to 2-stop
 'Extra Soft': { stops: 3, fuel: 50, pitTime: 25.56, tcd: 0, fld: 32.63, pits: 109.67, total: 142.31 },
 'Soft': { stops: 2, fuel: 66, pitTime: 26.13, tcd: 17.11, fld: 43.51, pits: 74.25, total: 134.87 },
 'Medium': { stops: 2, fuel: 66, pitTime: 26.13, tcd: 34.22, fld: 43.51, pits: 74.25, total: 151.99 },
 'Hard': { stops: 1, fuel: 99, pitTime: 27.30, tcd: 51.34, fld: 65.26, pits: 38.30, total: 154.90 },
 'Rain': { stops: 1, fuel: 89, pitTime: 26.94, tcd: 0, fld: 58.18, pits: 37.94, total: 96.12 },
 },
 },
 // Additional sweeps captured (Exp 50→200, TI 123→200, Conc 100→200, Aggr 8→100, Engine 2→7,
 // Elec 4→5) show only hundredths-of-a-second deltas from baseline across ~12 more screenshots —
 // not transcribed here, too easy to mis-read a digit by eye at that precision. If needed, export
 // as CSV/XLS from GPRO Analyzer (there's a download button on the page) and paste the raw values
 // instead of screenshots — exact numbers, no transcription risk.
 },
 },

 // ============================================================
 // DRIVER SELECTION ADVICE (for Rookie & Amateur)
 // ============================================================
 // From established analysis
 // Target driver attributes for Rookie/Amateur:
 // targetOA bands corrected 2026-07-27 - see driverMaxOA note above `leagues:`. Each band's min is
 // this tool's own "worth shortlisting" heuristic (a RANGE, not an exact-cap point - matching exact
 // OA was too strict, per the original "No listings match OA 80-80" bug). The `target` attribute
 // numbers are NOT all required at once: per GPRO's Newbie Guide a driver with one or two good
 // skills suffices, so the shortlist (`mkFullStatsTable`) only gates on the single top-priority
 // attribute; the rest are a priority-ordered reference, not a full checklist.
 driverSelection: {
 // Targets calibrated 2026-08-10 from a real 24,846-driver market scrape (gpro-strategy.net
 // find-driver, OA-banded). Previous '200+' concentration floors were unreachable in Rookie
 // (0 of 100 sampled max-OA drivers had it) and too strict in Amateur (only ~20% of max-OA
 // drivers) - which is exactly why the advisor shortlisted nobody. Values below follow real
 // per-band medians; only the top-priority floor gates the shortlist split (per GPRO's own
 // Newbie Guide, "one or two skills will suffice", never every attribute at once).
 //
 // REAL BUG found 2026-08-12: that recalibration only changed concentration's STRING notation
 // ('200+' -> '200') and never actually fixed the underlying number - it's the exact same
 // documented-unreachable threshold as before. Combined with the later "ALL attributes must
 // clear at once" policy (D.driverSelection... every numeric floor gates, see mkFullStatsTable's
 // history in CLAUDE.md), a single always-failing floor collapsed a ~4600-candidate Rookie
 // market down to ~3 matches. No corrected numeric median was ever actually sourced for
 // concentration specifically (only the qualitative "0 of 100 sampled max-OA had 200+" finding),
 // so rather than invent a replacement number, it's qualitative now - same "as high as
 // affordable" treatment already used for Pro/Master/Elite where no trustworthy number exists.
 // Talent/experience/techInsight/aggressiveness/stamina below DO carry real median-derived
 // numeric floors from the same scrape and still gate the shortlist.
  Rookie: {
  // Rookie: Car resets each season. Focus on cheap, balanced driver.
  // Priority: Concentration > Talent > Experience > Tech Insight
  targetOA: { min: 75, max: 85 },
  maxSalary: 2000000, // per GPRO Newbie Guide: don't pay much over $2M/race in Rookie
  maxAge: 36,
  attributes: {
  concentration: { target: 'as high as affordable', priority: 1, note: 'Consistency + error reduction. No trustworthy numeric floor sourced (the old "200+" was empirically unreachable - 0 of 100 sampled max-OA Rookie drivers had it). Train toward 200 via Yoga once owned.' },
  talent: { target: '150+', priority: 2, note: 'Raw speed; untrainable - the ONE attribute with no training path, so market pick is your only chance to get it right. Naturally 200+ in most of the market - treat <150 as a red flag. Real bug fixed 2026-08-12: the sourced floor used to read 60 (a market-median artifact), directly contradicting this note - a 69-talent driver was clearing it and getting recommended as Top Pick.' },
  experience: { target: '90-150', priority: 3, note: 'Grows +1/race; affects strategy and tyre management' },
  techInsight: { target: '80-150', priority: 4, note: 'Setup precision and fuel consumption. Train toward 125 via Technical training' },
  aggressiveness:{ target: '0-49', priority: 5, note: 'Keep low to reduce tyre/parts wear; 100 via Ninja training if raising intentionally' },
  stamina: { target: '0-45', priority: 6, note: 'Train toward 100 via Fitness Class + Testing (2x 50 laps = +5 stamina)' },
  charisma: { target: '0-250', priority: 7, note: 'Helps with sponsor income' },
  motivation: { target: '0-250', priority: 8, note: 'Helps with training speed' },
  },
  budget: 'Save as much as possible. Car resets to L1. Spend only on driver.',
  },
  Amateur: {
  // Amateur: Car carries over. Invest in driver + car balance.
  // Priority: Concentration > Talent > Experience > Tech Insight
  targetOA: { min: 90, max: 110 },
  maxSalary: 2500000,
  maxAge: 37,
  attributes: {
  concentration: { target: 'as high as affordable', priority: 1, note: 'Consistency + error reduction. No trustworthy numeric floor sourced (only ~20% of max-OA Amateur drivers cleared the old "200+"). Train toward 200 via Yoga once owned.' },
  talent: { target: '200+', priority: 2, note: 'Raw speed, untrainable; market median ~205, prefer high. Real bug fixed 2026-08-12: the sourced floor used to read 60, far below this same note\'s own ~205 median - fixed to actually match it.' },
  experience: { target: '90-150', priority: 3, note: 'Grows +1/race; strategy, tyre management, setup precision' },
  techInsight: { target: '80-150', priority: 4, note: 'Setup precision, margin of acceptance, fuel. Train toward 125 via Technical training' },
  aggressiveness:{ target: '0-49', priority: 5, note: 'Keep low to reduce wear; 100 via Ninja training if raising intentionally' },
  stamina: { target: '0-45', priority: 6, note: 'Train toward 100 via Fitness Class + Testing (2x 50 laps = +5 stamina)' },
  charisma: { target: '0-250', priority: 7, note: 'Sponsor income boost' },
  motivation: { target: '0-250', priority: 8, note: 'Affects qualifying/training speed; volatile (spikes with results)' },
  },
  budget: 'Balance car upgrades (L5-7) with driver development. Never go into debt.',
 },
 // Pro/Master/Elite added 2026-07-27, OA bands corrected same date (see note above). Attribute
 // PRIORITY ORDER is the same logical extension of Rookie/Amateur's established order
 // (concentration/consistency stays the top lever at every level), but no community source was
 // found giving precise numeric attribute targets this far up the ladder, unlike Rookie/Amateur -
 // so those are left as "as high as affordable" rather than inventing specific thresholds.
   Pro: {
   targetOA: { min: 110, max: 135 },
   maxSalary: 3500000,
   maxAge: 38,
   attributes: {
  concentration: { target: 'as high as affordable', priority: 1, note: 'Still the top lever for consistency - no sourced numeric target beyond Amateur' },
  stamina: { target: 'as high as affordable', priority: 2, note: 'Race distance/fatigue matters more as pace closes up - "Stamina=Speed" holds at every level' },
  talent: { target: 'as high as affordable', priority: 3, note: 'Raw speed - TD (available from Pro) can partly compensate for setup gaps' },
  experience: { target: 'as high as affordable', priority: 4, note: 'Strategy/tyre management/setup precision' },
  techInsight: { target: 'as high as affordable', priority: 5, note: 'Setup precision, margin of acceptance' },
  aggressiveness:{ target: 'track-dependent', priority: 6, note: 'Higher risk tolerance viable with a stronger car/TD' },
  motivation: { target: 'as high as affordable', priority: 7, note: 'Training speed' },
  charisma: { target: 'as high as affordable', priority: 8, note: 'Sponsor income boost' },
  },
  budget: 'TD becomes available - budget for both driver and TD, don\'t overspend on either alone.',
  },
   Master: {
   targetOA: { min: 130, max: 160 },
   maxSalary: 5000000,
   maxAge: 39,
   attributes: {
  concentration: { target: 'as high as affordable', priority: 1, note: 'Still the top lever for consistency - no sourced numeric target beyond Amateur' },
  stamina: { target: 'as high as affordable', priority: 2, note: 'Race distance/fatigue matters more as pace closes up - "Stamina=Speed" holds at every level' },
  talent: { target: 'as high as affordable', priority: 3, note: 'Raw speed - increasingly decisive as fields tighten' },
  experience: { target: 'as high as affordable', priority: 4, note: 'Strategy/tyre management/setup precision' },
  techInsight: { target: 'as high as affordable', priority: 5, note: 'Setup precision, margin of acceptance' },
  aggressiveness:{ target: 'track-dependent', priority: 6, note: 'Higher risk tolerance viable with a stronger car/TD' },
  motivation: { target: 'as high as affordable', priority: 7, note: 'Training speed' },
  charisma: { target: 'as high as affordable', priority: 8, note: 'Sponsor income boost' },
  },
  budget: 'Facility level cap 80 - push facilities alongside driver quality.',
  },
   Elite: {
   targetOA: { min: 150, max: 999 },
   maxSalary: 8000000,
   maxAge: 40,
   attributes: {
  concentration: { target: 'as high as affordable', priority: 1, note: 'Still the top lever for consistency - no sourced numeric target beyond Amateur' },
  stamina: { target: 'as high as affordable', priority: 2, note: 'Race distance/fatigue matters more as pace closes up - "Stamina=Speed" holds at every level' },
  talent: { target: 'as high as affordable', priority: 3, note: 'Raw speed - decisive at the top end' },
  experience: { target: 'as high as affordable', priority: 4, note: 'Strategy/tyre management/setup precision' },
  techInsight: { target: 'as high as affordable', priority: 5, note: 'Setup precision, margin of acceptance' },
  aggressiveness:{ target: 'track-dependent', priority: 6, note: 'Higher risk tolerance viable with a stronger car/TD' },
  motivation: { target: 'as high as affordable', priority: 7, note: 'Training speed' },
  charisma: { target: 'as high as affordable', priority: 8, note: 'Sponsor income boost' },
  },
  budget: 'Endgame - maximize everything affordable. No practical facility cap, no driver OA cap.',
  },
  },

 // ============================================================
 // TD SELECTION ADVICE (Pro/Master/Elite only - TDs unavailable below Pro)
 // ============================================================
 // Added 2026-07-27, wiki-sourced (wiki.gpro.net/index.php/Technical_Director). **CAUTION - NOT
 // independently confirmed**: the same wiki gave wrong driver OA caps (see driverMaxOA note above),
 // so treat these TD caps (Pro 90, Master 120, Elite none) as unverified against the current season.
 // Skill ranking from the wiki's own quotes: leadership ("lifts everything", a multiplier) and Pit
 // Coordination (direct pit-time effect) rank above the R&D skills, whose relative importance the
 // wiki doesn't specify. TDs aren't trainable, don't decay with age, and contracts can't be renewed
 // - signing is a one-time decision for the contract's life.
 tdSelection: {
 Pro: {
 targetOA: { min: 80, max: 90 },
 skills: {
 leadership: { priority: 1, note: 'Wiki: "acts as a multiplier, the leadership skill lifts everything" - highest-leverage single skill' },
 pitCoord: { priority: 2, note: 'Wiki: directly speeds up pit stop service time - measurable, direct effect' },
 aerodynamics: { priority: 3, note: 'R&D skill affecting car setup - wiki doesn\'t rank relative R&D skill importance' },
 mechanics: { priority: 3, note: 'R&D skill affecting car setup - wiki doesn\'t rank relative R&D skill importance' },
 electronics: { priority: 3, note: 'R&D skill affecting car setup - wiki doesn\'t rank relative R&D skill importance' },
 motivation: { priority: 4, note: 'Lowest-documented-impact TD skill' },
 },
 budget: 'TD OA capped at 90 in Pro (wiki-confirmed) - going over risks losing the TD on relegation. No renewal possible, so budget for a full-contract commitment.',
 },
 Master: {
 targetOA: { min: 90, max: 120 },
 skills: {
 leadership: { priority: 1, note: 'Wiki: "acts as a multiplier, the leadership skill lifts everything" - highest-leverage single skill' },
 pitCoord: { priority: 2, note: 'Wiki: directly speeds up pit stop service time - measurable, direct effect' },
 aerodynamics: { priority: 3, note: 'R&D skill affecting car setup - wiki doesn\'t rank relative R&D skill importance' },
 mechanics: { priority: 3, note: 'R&D skill affecting car setup - wiki doesn\'t rank relative R&D skill importance' },
 electronics: { priority: 3, note: 'R&D skill affecting car setup - wiki doesn\'t rank relative R&D skill importance' },
 motivation: { priority: 4, note: 'Lowest-documented-impact TD skill' },
 },
 budget: 'TD OA capped at 120 in Master (wiki-confirmed, higher than the driver cap of 100) - a strong TD is comparatively more affordable headroom here than a strong driver.',
 },
 Elite: {
 targetOA: { min: 100, max: 999 },
 skills: {
 leadership: { priority: 1, note: 'Wiki: "acts as a multiplier, the leadership skill lifts everything" - highest-leverage single skill' },
 pitCoord: { priority: 2, note: 'Wiki: directly speeds up pit stop service time - measurable, direct effect' },
 aerodynamics: { priority: 3, note: 'R&D skill affecting car setup - wiki doesn\'t rank relative R&D skill importance' },
 mechanics: { priority: 3, note: 'R&D skill affecting car setup - wiki doesn\'t rank relative R&D skill importance' },
 electronics: { priority: 3, note: 'R&D skill affecting car setup - wiki doesn\'t rank relative R&D skill importance' },
 motivation: { priority: 4, note: 'Lowest-documented-impact TD skill' },
 },
 budget: 'No TD OA cap found for Elite in the sources checked - maximize everything affordable.',
 },
 },

 // ============================================================
 // CURRENT SEASON
 // ============================================================
 currentSeason: 'S111',
 currentLeague: 'Amateur',

 // ============================================================
 // SEASON METADATA
 // Tracks change each season. This tracks which tracks are in each season.
 // ============================================================
 seasons: {
 'S111': {
 year: 2026,
 tracks: [
 'Barcelona GP', 'Ahvenisto GP', 'Magny Cours GP', 'Poznan GP',
 'Al-Ring GP', 'Jyllands-Ringen GP', 'Silverstone GP', 'Buenos Aires GP',
 'Austin GP', 'Montreal GP', 'Spa GP', 'Kaunas GP',
 'Hungaroring GP', 'Losail GP', 'New Delhi GP', 'Yas Marina GP', 'Baku City GP',
 ],
 },
 },

 // ============================================================
 // TRACK HISTORY (per-track, per-league aggregate data)
 // From GPRO Analyzer Track History page
 // This data accumulates across seasons for each track.
 // Used for: strategy recommendations, risk assessment, Q1 advice
 // ============================================================
 trackHistory: {
 'Spa GP': {
 raceAnalysis: { total: 3309, rookie: 457, amateur: 1980, pro: 765, master: 93, elite: 14 },
 preRaceUpdate: { total: 229, rookie: 44, amateur: 115, pro: 60, master: 10, elite: 0 },
 q1Risk: {
 // Time penalty in seconds for each risk level
 keepOnTrack: { rookie: 12.38, amateur: 6.01, pro: 2.91, master: 0.97, elite: 0.00 },
 pushLittle: { rookie: 26.75, amateur: 19.14, pro: 10.06, master: 2.91, elite: 0.00 },
 pushLot: { rookie: 31.54, amateur: 36.18, pro: 40.97, master: 43.69, elite: 57.14 },
 pushLimit: { rookie: 29.34, amateur: 38.66, pro: 46.06, master: 52.43, elite: 42.86 },
 driverMistake: { rookie: 0.655, amateur: 0.304, pro: 0.122, master: 0.066, elite: 0.072 },
 },
 raceRisk: {
 // Success rate (%) for each risk type
 overtaking: { rookie: 23.62, amateur: 25.42, pro: 25.90, master: 21.33, elite: 23.79 },
 defensive: { rookie: 22.63, amateur: 27.32, pro: 30.38, master: 32.97, elite: 43.93 },
 clearTrackDry: { rookie: 15.90, amateur: 18.48, pro: 32.28, master: 44.57, elite: 62.21 },
 malfunctioning: { rookie: 6.74, amateur: 10.10, pro: 17.41, master: 28.19, elite: 50.43 },
 clearTrackDry50: { rookie: 2.84, amateur: 6.41, pro: 25.10, master: 53.76, elite: 78.57 },
 },
 raceStrategy: {
 // % of races using each stop count
 oneStop: { rookie: 10.28, amateur: 12.07, pro: 12.03, master: 12.90, elite: 14.29 },
 twoStop: { rookie: 34.79, amateur: 43.89, pro: 68.50, master: 79.57, elite: 64.29 },
 threeStop: { rookie: 46.83, amateur: 39.65, pro: 17.78, master: 6.45, elite: 21.43 },
 fourStop: { rookie: 6.56, amateur: 3.43, pro: 1.70, master: 1.08, elite: 0.00 },
 fiveStop: { rookie: 0.22, amateur: 0.30, pro: 0.00, master: 0.00, elite: 0.00 },
 driverMistake: { rookie: 0.30, amateur: 0.87, pro: 0.92, master: 0.76, elite: 0.50 },
 },
 },
 // Added 2026-08-13 from a gproanalyzer.info screenshot - next race on this account's calendar.
 'Estoril GP': {
 raceAnalysis: { total: 3707, rookie: 488, amateur: 2234, pro: 876, master: 98, elite: 11 },
 preRaceUpdate: { total: 167, rookie: 62, amateur: 78, pro: 23, master: 4, elite: 0 },
 q1Risk: {
 keepOnTrack: { rookie: 14.18, amateur: 7.01, pro: 3.11, master: 0.00, elite: 9.09 },
 pushLittle: { rookie: 30.36, amateur: 22.19, pro: 12.57, master: 5.88, elite: 0.00 },
 pushLot: { rookie: 28.91, amateur: 35.21, pro: 42.16, master: 50.98, elite: 63.64 },
 pushLimit: { rookie: 26.55, amateur: 35.60, pro: 42.16, master: 43.14, elite: 27.27 },
 driverMistake: { rookie: 0.643, amateur: 0.325, pro: 0.147, master: 0.097, elite: 0.079 },
 },
 raceRisk: {
 overtaking: { rookie: 23.51, amateur: 25.33, pro: 26.60, master: 20.02, elite: 24.36 },
 defensive: { rookie: 24.54, amateur: 27.22, pro: 32.50, master: 35.43, elite: 39.27 },
 clearTrackDry: { rookie: 16.78, amateur: 20.27, pro: 35.75, master: 46.82, elite: 49.45 },
 malfunctioning: { rookie: 7.94, amateur: 10.00, pro: 18.10, master: 31.81, elite: 38.82 },
 clearTrackDry50: { rookie: 3.07, amateur: 8.68, pro: 29.45, master: 54.08, elite: 54.55 },
 },
 raceStrategy: {
 oneStop: { rookie: 18.85, amateur: 29.90, pro: 29.34, master: 29.59, elite: 27.27 },
 twoStop: { rookie: 59.02, amateur: 59.80, pro: 61.30, master: 56.12, elite: 72.73 },
 threeStop: { rookie: 14.96, amateur: 6.54, pro: 7.19, master: 13.27, elite: 0.00 },
 fourStop: { rookie: 4.92, amateur: 2.46, pro: 1.48, master: 1.02, elite: 0.00 },
 fiveStop: { rookie: 0.82, amateur: 0.58, pro: 0.23, master: 0.00, elite: 0.00 },
 driverMistake: { rookie: 0.57, amateur: 1.17, pro: 1.44, master: 1.03, elite: 0.73 },
 },
 },
 // Add more tracks here as screenshots are provided
 },

 // ============================================================
 // TRACK HISTORY INSIGHTS (derived from trackHistory data)
 // Pre-computed recommendations per league per track
 // ============================================================
 trackInsights: {
 'Spa GP': {
 Amateur: {
 bestStopCount: 2, // 43.89% use 2-stop (most popular)
 secondBest: 3, // 39.65% use 3-stop
 q1RiskRecommended: 'pushLot', // 36.18% success rate, best ROI
 q1RiskMax: 'pushLimit', // 38.66% success but higher risk
 overtakingRisk: 'moderate', // 25.42% success
 defensiveRisk: 'moderate', // 27.32% success
 clearTrackRisk: 'low', // 18.48% success - avoid CTR
 malfunctionRisk: 'low', // 10.10% success - avoid malfunctioning
 clearTrackDry50: 'very low', // 6.41% - never push CTR>50
 driverMistakeTime: 0.304, // seconds lost on mistake
 },
 },
 },

 // ============================================================
 // TYRE CONSTANTS
 // Only wearThreshold is actually read from here - GPRO_Strategy_Tool.user.js keeps its own
 // working copies of compounds/wearMultipliers/fuelBase/etc (COMPOUNDS, WEAR_MULTIPLIERS,
 // FUEL_BASE) since those are on the calc hot path; duplicating them here too was dead weight
 // (removed 2026-07-19 as dead weight). Don't re-add without wiring
 // .user.js to actually read from here.
 // ============================================================
 tyreConstants: {
 wearThreshold: 15,
 },

 // ============================================================
 // INTERNAL TRACK DATA (internal formulas, calcs.py/data.py)
 // Internal formulas (verified against source).
 // Covers ~60 real GPRO tracks - far broader than our own Montreal/Spa/Kaunas
 // calibration, so used as the primary source for fuel + part wear per track,
 // falling back to our own data when a track isn't in this table.
 // ============================================================
 gapp: {
 // Column index: 0 Wing Base Setup, 1 Engine Base Setup, 2 Brakes Base Setup,
 // 3 Gearbox Base Setup, 4 Suspension Base Setup, 5 Wing Split Base Factor,
 // 6 Base Fuel Use Dry (L/km), 7 Base Fuel Use Wet (L/km), 8 Track Total Distance (km),
 // 9 Tyre Wear Factor, 10 Pit In/Out Time (s), 11 Track Lap Corners, 12 Track Laps, 13 Lap Length (km)
 trackData: {
 "A1-Ring": [249.22, 714.42, 676.29, 789.1, 511.89, 141.46, 0.875, 0.7829, 307.1, 0.89211, 21, 9, 71, 4.33],
 "Adelaide": [631.9, 496.9, 358.33, 549.99, 652.05, 79.46, 0.807, 0.6774, 298.6, 0.94557, 19.5, 12, 79, 3.78],
 "Ahvenisto": [993.04, 466.54, 699.74, 766.1, 240.15, 228.29, 0.8455, 0.796, 243.2, 0.9336, 11.5, 10, 80, 3.04],
 "Anderstorp": [250.72, 699.88, 769.29, 611.18, 107.05, 75.32, 0.9042, 0.785, 281.8, 0.971, 13.5, 10, 70, 4.03],
 "Austin": [521.56, 605.59, 608.9, 640.62, 786.9, 173.6, 0.8617, 0.752, 308.9, 1.00374, 17.5, 20, 56, 5.52],
 "Avus": [302.56, 636.26, 412.4, 387.41, 821.34, 103.25, 0.90563, 0, 312.3, 1.18641, 13, 4, 64, 4.88],
 "Baku City": [362.08, 615.56, 611.02, 706, 716.97, 96.71, 0.89345, 0, 306.3, 1.00055, 17, 20, 51, 6.01],
 "Barcelona": [457.87, 673.95, 503.46, 676.11, 315.93, 140.56, 0.874, 0, 307.3, 1.0933, 21, 16, 65, 4.73],
 "Brands Hatch": [475.32, 647.54, 386.69, 709.4, 641.47, 121.1, 0.8305, 0.6357, 315.5, 1.04047, 25.5, 12, 75, 4.21],
 "Brasilia": [577.88, 409.23, 697.76, 849.61, 784.06, 46.69, 0.8911, 0.6221, 301.1, 1.04035, 13.5, 12, 55, 5.48],
 "Bremgarten": [713.7, 594.03, 589.41, 697.91, 539.29, 138.55, 0.858, 0, 305.8, 1.0813, 17, 16, 42, 7.28],
 "Brno": [489.73, 515.49, 378.53, 555.53, 490.25, 73.58, 0.8324, 0.7015, 308, 0.98793, 14, 15, 57, 5.40],
 "Bucharest Ring": [269.73, 654.11, 711.39, 593.83, 744.57, 77.48, 0.9118, 0.7706, 245.7, 0.9947, 24, 14, 80, 3.07],
 "Buenos Aires": [901.29, 516.57, 272.05, 654.41, 706.34, 190.08, 0.7853, 0.572, 306.6, 0.9795, 19.5, 16, 72, 4.26],
 "Estoril": [438.52, 652.28, 302.24, 705, 575.42, 79.46, 0.8379, 0.7148, 305.2, 1.05901, 22.5, 13, 70, 4.36],
 "Fiorano": [449.29, 619.66, 301.15, 374.52, 895.1, 99.31, 0.9327, 0.872, 238.6, 0.95633, 16.5, 14, 79, 3.02],
 "Fuji": [271.38, 590.54, 633.87, 689.16, 500.84, 117.72, 0.8491, 0.6228, 305.4, 0.976, 18.5, 16, 67, 4.56],
 "Grobnik": [646.19, 384.37, 524.55, 768.66, 500.29, 128.82, 0.8224, 0, 308.4, 1.03798, 13, 15, 74, 4.17],
 "Hockenheim": [444.92, 647.63, 329.61, 789.21, 291.96, -98.2, 0.8693, 0.899, 306.4, 0.96074, 16.5, 12, 67, 4.57],
 "Hungaroring": [853.49, 439.1, 571.56, 434.45, 416.73, 62.53, 0.7657, 0.649, 305.5, 1.06388, 16.5, 14, 77, 3.97],
 "Imola": [459.77, 599.72, 672.31, 615.44, 455.84, 19.18, 0.8557, 0.6079, 305.6, 1.0555, 12, 16, 62, 4.93],
 "Indianapolis": [207.55, 706.52, 465.52, 648.5, 518.59, -35, 0.893, 0, 306.6, 1.01319, 25.5, 13, 73, 4.20],
 "Indianapolis Oval": [-58.62, 730.49, 21.69, 901.36, 304.75, 67.6, 0.9042, 0.749, 321.8, 0.9953, 45, 4, 80, 4.02],
 "Interlagos": [460.91, 578.03, 555.34, 568.26, 318.88, -26.27, 0.8492, 0.6853, 305.9, 1.04207, 18, 14, 71, 4.31],
 "Irungattukottai": [680.12, 470.29, 626.79, 620.22, 536.55, 13.95, 0.8412, 0, 293.6, 0.97159, 14, 12, 79, 3.72],
 "Istanbul": [387.85, 544.46, 700.97, 543.97, 636.53, 118.92, 0.856, 0.694, 309.4, 1.11647, 16, 14, 58, 5.33],
 "Jerez": [717.6, 608.07, 626.86, 701.3, 321.26, 143.33, 0.889, 0.6178, 306.4, 0.9, 18, 14, 69, 4.44],
 "Jyllands-Ringen": [769.66, 414.13, 556.76, 743.56, 524.72, 106.93, 0.826, 0, 184, 0.98582, 19.5, 20, 136, 2.30],
 "Kaunas": [387.37, 635.17, 515.42, 685, 362.96, 91.1, 0.8461, 0.7649, 264.1, 1.0395, 11, 10, 80, 3.30],
 "Kyalami": [777.15, 534.3, 557.47, 528.95, 749.84, 206.85, 0.8016, 0, 306.8, 1.02227, 15, 14, 72, 4.26],
 "Laguna Seca": [481.06, 401.03, 585.51, 619.45, 50.81, 54.38, 0.902, 0.751, 284.5, 1.015, 16.7, 11, 79, 3.60],
 "Magny Cours": [453.62, 564.81, 294.88, 588.24, 560.43, 147.77, 0.865, 0, 305.8, 0.94099, 18, 14, 72, 4.25],
 "Melbourne": [403.36, 619, 614.44, 757.14, 294.52, 8.04, 0.8553, 0, 307.6, 0.97952, 16.5, 17, 58, 5.30],
 "Mexico City": [632.08, 700.96, 470.54, 671.13, 323.13, 48.62, 0.8353, 0.6893, 305, 0.99074, 24, 9, 69, 4.42],
 "Monte Carlo": [1024.73, 373.43, 471.04, 374.23, 494.38, 100.89, 0.8141, 0.621, 262.8, 1.05986, 18, 19, 78, 3.37],
 "Montreal": [335.19, 677.82, 566.84, 718.1, 237.85, -98.13, 0.8553, 0.7349, 305, 1.0831, 16.5, 12, 69, 4.42],
 "Monza": [124.19, 735.83, 496, 868.17, 610.97, 24.64, 0.913, 0, 306.7, 1.0733, 25.5, 13, 53, 5.79],
 "Mugello": [517.88, 805.54, 879.84, 901.34, 590.54, -69.4, 0.8474, 0.6958, 304.3, 1.0235, 13.5, 14, 58, 5.25],
 "New Delhi": [649.99, 556.92, 556.38, 720.3, 150.9, -97.64, 0.8363, 0.768, 308.2, 1.03303, 19, 16, 60, 5.14],
 "Nurburgring": [650.81, 451.94, 626.71, 598, 149.86, 244.17, 0.799, 0, 308.7, 1.0645, 15, 16, 60, 5.15],
 "Oesterreichring": [442.09, 675.58, 496.59, 729.98, 508.34, 85.42, 0.8686, 0.6529, 308.9, 1.08664, 21, 11, 52, 5.94],
 "Paul Ricard": [362.79, 732.67, 301.68, 784.37, 575.27, 182.33, 0.8965, 0.771, 305, 1.09121, 19.5, 11, 79, 3.86],
 "Portimao": [784.36, 392.27, 486.5, 490, 295.42, 180.52, 0.8361, 0.7061, 309.7, 1.0578, 15.5, 18, 66, 4.69],
 "Poznan": [742, 546.02, 379.02, 718.46, 529.96, 182.04, 0.8239, 0, 306.2, 1.08634, 14, 14, 75, 4.08],
 "Rafaela Oval": [86.6, 645.37, 144.79, 781.23, 354.81, 67.6, 0.9058, 0.7695, 317.3, 1.06418, 10, 8, 67, 4.74],
 "Sakhir": [126.91, 406.55, 716.34, 609.56, 240.96, -21.44, 0.912, 0.7124, 308.5, 1.10363, 25.5, 14, 57, 5.41],
 "Sepang": [554, 590.12, 653.69, 746.34, 466.41, 24.6, 0.8422, 0.6161, 310.4, 0.9926, 24, 17, 55, 5.64],
 "Serres": [927.25, 414.83, 503.01, 477.94, 522.69, 177, 0.8633, 0, 254.9, 0.92879, 12, 16, 80, 3.19],
 "Shanghai": [416.43, 529.77, 641.35, 354.61, 114.21, 114.9, 0.9052, 0.6744, 305.2, 1.05878, 24, 10, 56, 5.45],
 "Silverstone": [283.41, 699.48, 590.85, 823.25, 415.1, 18.87, 0.8693, 0.681, 308.3, 1.1123, 22.5, 14, 60, 5.14],
 "Singapore": [865.61, 438.19, 578.15, 598.96, 801.2, 202.04, 0.854, 0.5521, 309.1, 1.04688, 17, 23, 61, 5.07],
 "Slovakiaring": [735.82, 439.66, 609.73, 491.45, 431.92, 184.08, 0.9069, 0.79, 313.9, 1.0652, 19.5, 14, 53, 5.92],
 "Sochi": [675.39, 588.26, 587.66, 696.24, 456.11, 137.97, 0.8404, 0, 310.1, 1.04166, 23, 19, 53, 5.85],
 "Spa": [585.64, 716.49, 446.82, 609.47, 372.54, 50.4, 0.8835, 0.4519, 306.6, 1.04803, 13.5, 22, 44, 6.97],
 "Suzuka": [413.56, 639.98, 515.88, 550.25, 531.13, 47.12, 0.857, 0.5508, 310.6, 1.0326, 15, 14, 53, 5.86],
 "Valencia": [837.83, 445.95, 657.26, 652.58, 335.82, 209.76, 0.8459, 0.56, 310.1, 0.95518, 14.5, 25, 57, 5.44],
 "Yas Marina": [730.05, 459.7, 557.69, 476.1, 419.98, 175.25, 0.8117, 0.7014, 305.5, 0.95151, 18.5, 21, 55, 5.56],
 "Yeongam": [781.67, 480.86, 719.53, 689.5, 420.63, 207.41, 0.8365, 0.7399, 309.2, 1.0452, 23.5, 18, 55, 5.62],
 "Zandvoort": [551.15, 653.24, 415.91, 779.13, 709.95, 5.57, 0.8402, 0.583, 301.8, 1.01818, 22.5, 14, 71, 4.25],
 "Zolder": [669.24, 616.83, 466.06, 628.62, 539.48, 193.3, 0.8286, 0.6365, 298.3, 0.99094, 19.5, 17, 70, 4.26],
 },
 // Column index: 0 Chassis, 1 Engine, 2 Front Wing, 3 Rear Wing, 4 Underbody,
 // 5 Sidepods, 6 Cooling, 7 Gearbox, 8 Brakes, 9 Suspension, 10 Electronics
 // (all whole-race % wear factors at baseline; scaled by levelFactors^CTR × driverFactor)
 wearData: {
 "A1-Ring": [28.36, 50.05, 20.16, 21.20, 20.95, 24.11, 18.28, 35.53, 41.42, 26.86, 21.23],
 "Adelaide": [37.70, 19.20, 39.87, 46.94, 42.56, 25.70, 30.00, 29.09, 23.68, 14.93, 21.45],
 "Ahvenisto": [19.01, 24.24, 26.23, 25.40, 21.43, 19.07, 15.14, 23.54, 30.80, 21.99, 11.30],
 "Anderstorp": [24.06, 49.52, 19.01, 17.68, 41.68, 26.54, 14.50, 40.33, 51.84, 20.75, 12.06],
 "Austin": [17.44, 36.61, 28.31, 28.37, 19.71, 18.62, 19.18, 29.87, 35.69, 15.27, 15.17],
 "Avus": [29.64, 82.95, 16.89, 18.29, 35.86, 17.70, 19.19, 26.28, 23.16, 58.77, 21.23],
 "Baku City": [20.60, 57.51, 19.98, 21.81, 18.45, 23.86, 17.28, 26.63, 46.20, 18.92, 14.28],
 "Barcelona": [26.34, 56.33, 42.82, 50.24, 32.36, 23.23, 22.65, 34.65, 51.35, 40.25, 19.98],
 "Brands Hatch": [11.23, 31.31, 19.87, 24.59, 27.84, 15.26, 12.63, 21.21, 38.03, 38.17, 19.27],
 "Brasilia": [19.54, 38.86, 25.23, 30.88, 20.55, 18.98, 21.96, 32.39, 44.36, 20.66, 17.34],
 "Bremgarten": [38.56, 21.32, 19.58, 18.67, 43.39, 31.77, 13.82, 35.36, 30.61, 42.35, 11.94],
 "Brno": [26.35, 44.57, 28.76, 23.72, 28.54, 27.06, 25.52, 31.26, 35.52, 28.32, 20.39],
 "Bucharest Ring": [27.74, 60.35, 27.63, 30.11, 36.69, 25.61, 21.08, 43.33, 54.42, 31.36, 25.19],
 "Buenos Aires": [30.50, 53.57, 23.70, 29.80, 21.51, 18.41, 25.46, 56.63, 71.40, 50.26, 20.26],
 "Estoril": [22.18, 50.82, 29.57, 24.94, 28.03, 19.58, 14.88, 37.58, 43.71, 33.96, 13.84],
 "Fiorano": [28.04, 44.72, 28.03, 31.01, 23.74, 19.57, 22.70, 36.52, 46.85, 32.30, 22.81],
 "Fuji": [31.62, 36.67, 20.21, 23.61, 23.73, 22.88, 31.20, 27.72, 52.08, 21.95, 20.20],
 "Grobnik": [30.62, 32.49, 21.91, 20.54, 22.98, 29.01, 26.17, 36.01, 20.85, 41.46, 17.98],
 "Hockenheim": [29.56, 61.45, 21.08, 23.00, 23.91, 19.98, 20.60, 36.73, 50.18, 26.15, 17.55],
 "Hungaroring": [25.36, 35.67, 76.04, 69.27, 35.48, 18.68, 15.21, 48.39, 31.48, 52.33, 12.68],
 "Imola": [23.24, 40.44, 39.13, 42.27, 32.05, 18.02, 20.62, 38.27, 47.41, 38.54, 19.74],
 "Indianapolis": [46.17, 59.60, 27.55, 33.99, 40.73, 37.43, 18.05, 46.73, 53.59, 52.02, 15.32],
 "Indianapolis Oval": [28.95, 104.06, 17.52, 20.81, 34.49, 22.38, 26.35, 16.67, 11.85, 31.39, 18.81],
 "Interlagos": [39.75, 54.08, 31.63, 23.78, 45.93, 23.31, 21.24, 32.32, 57.65, 40.91, 19.77],
 "Irungattukottai": [27.62, 49.49, 43.48, 41.08, 36.10, 32.41, 35.08, 44.11, 52.30, 34.09, 20.33],
 "Istanbul": [27.30, 29.74, 17.29, 19.40, 20.07, 20.84, 26.82, 21.30, 44.76, 19.76, 17.08],
 "Jerez": [36.69, 57.14, 38.05, 41.69, 34.46, 29.92, 20.89, 32.79, 50.80, 47.78, 23.66],
 "Jyllands-Ringen": [13.52, 21.75, 28.74, 27.26, 12.18, 10.82, 9.40, 23.12, 33.00, 14.91, 13.35],
 "Kaunas": [24.49, 41.33, 29.17, 25.86, 30.55, 20.88, 14.69, 21.75, 13.33, 44.14, 13.05],
 "Kyalami": [23.08, 33.00, 35.70, 39.81, 20.62, 18.51, 32.57, 46.16, 28.46, 24.41, 21.71],
 "Laguna Seca": [30.15, 37.57, 26.36, 17.55, 17.19, 15.80, 24.43, 39.46, 43.06, 34.92, 9.33],
 "Magny Cours": [23.46, 42.80, 29.12, 25.74, 27.43, 20.76, 21.25, 34.84, 48.36, 37.87, 13.49],
 "Melbourne": [23.02, 47.60, 27.28, 29.87, 22.38, 21.97, 20.66, 32.35, 39.02, 22.36, 18.01],
 "Mexico City": [12.71, 24.40, 16.46, 14.55, 20.39, 14.08, 19.80, 31.90, 13.54, 38.08, 17.14],
 "Monte Carlo": [15.54, 18.39, 56.17, 56.54, 29.15, 10.91, 15.67, 30.24, 49.78, 39.45, 13.51],
 "Montreal": [27.57, 48.18, 28.37, 18.38, 26.64, 19.91, 14.69, 38.86, 51.21, 45.24, 14.35],
 "Monza": [28.95, 55.71, 19.44, 14.83, 26.67, 23.47, 18.02, 42.24, 51.81, 28.46, 19.82],
 "Mugello": [22.47, 21.70, 26.50, 19.14, 27.38, 30.36, 32.44, 36.71, 33.22, 28.03, 17.90],
 "New Delhi": [26.94, 45.64, 37.83, 32.68, 24.35, 16.21, 20.76, 33.69, 45.60, 41.58, 13.05],
 "Nurburgring": [31.20, 46.89, 26.37, 34.61, 29.26, 16.35, 16.63, 31.12, 50.16, 46.50, 11.74],
 "Oesterreichring": [22.07, 49.05, 28.26, 32.38, 23.71, 20.46, 23.16, 27.15, 39.24, 22.56, 13.55],
 "Paul Ricard": [29.27, 59.92, 28.35, 36.55, 32.32, 16.35, 19.74, 30.91, 50.35, 25.54, 12.80],
 "Portimao": [24.21, 21.99, 24.17, 26.23, 45.30, 22.01, 21.43, 23.00, 33.10, 48.73, 18.42],
 "Poznan": [29.64, 41.17, 34.02, 40.39, 36.14, 29.96, 25.52, 31.24, 33.66, 26.08, 21.88],
 "Rafaela Oval": [25.05, 92.29, 14.66, 17.15, 30.10, 17.85, 23.09, 26.84, 25.52, 35.83, 17.32],
 "Sakhir": [27.17, 59.89, 33.04, 25.88, 26.28, 30.85, 36.21, 30.80, 36.12, 35.28, 17.69],
 "Sepang": [25.28, 44.99, 32.81, 26.30, 32.94, 18.28, 31.83, 36.60, 43.17, 26.01, 18.79],
 "Serres": [24.93, 30.63, 25.18, 27.54, 24.22, 20.05, 23.07, 34.23, 28.93, 29.66, 20.60],
 "Shanghai": [20.68, 57.90, 34.12, 39.61, 35.05, 28.21, 26.74, 38.84, 43.94, 48.88, 18.48],
 "Silverstone": [25.02, 53.24, 22.38, 26.88, 28.29, 17.12, 16.41, 37.58, 27.51, 22.26, 12.32],
 "Singapore": [29.44, 22.24, 34.67, 30.37, 34.04, 23.70, 29.27, 29.46, 45.58, 26.95, 25.68],
 "Slovakiaring": [21.45, 46.63, 25.38, 28.82, 37.89, 18.70, 16.21, 45.57, 31.48, 39.40, 15.19],
 "Sochi": [20.78, 44.42, 26.86, 25.93, 24.36, 15.80, 19.08, 30.56, 41.04, 21.77, 16.77],
 "Spa": [28.52, 48.91, 28.05, 32.09, 31.56, 21.31, 18.47, 38.36, 43.34, 46.58, 17.77],
 "Suzuka": [17.35, 33.58, 22.04, 28.97, 23.44, 15.56, 14.46, 37.84, 29.29, 31.75, 15.14],
 "Valencia": [26.29, 26.26, 45.89, 45.89, 21.53, 31.13, 16.20, 26.08, 31.92, 36.84, 21.26],
 "Yas Marina": [22.65, 15.01, 34.76, 39.49, 28.35, 21.12, 28.91, 35.28, 41.03, 30.03, 20.79],
 "Yeongam": [28.45, 43.18, 30.23, 33.70, 20.65, 22.44, 23.28, 25.36, 33.09, 27.45, 19.01],
 "Zandvoort": [39.47, 63.41, 48.26, 38.22, 33.24, 28.26, 26.17, 36.99, 69.52, 54.04, 22.42],
 "Zolder": [17.44, 19.86, 25.24, 22.78, 20.51, 22.81, 21.45, 40.97, 29.02, 31.95, 18.46],
 },
 // Exponent base per car level (1-9) for CTR sensitivity in the wear formula:
 // raceWear = wearData[track][part] * (levelFactors[level-1] ** CTR) * driverFactor
 levelFactors: [1.0193, 1.0100, 1.0073, 1.0053, 1.0043, 1.0037, 1.0043, 1.0097, 1.0052],
 // Power/Handling/Acceleration contribution per part per level (same shape as our phaContrib,
 // slightly more complete - includes small secondary-axis contributions we'd zeroed out)
 profileFactors: {
 'Chassis': [0.8, 1.8, 1.4], 'Engine': [5.8, 0.6, 2.1],
 'Front Wing': [0.25, 2.45, 1.2], 'Rear Wing': [0.25, 2.45, 1.2],
 'Underbody': [0.2, 1.2, 0.5], 'Sidepods': [0.3, 0.7, 0],
 'Cooling': [1.2, 0, 0.2], 'Gearbox': [3.2, 0.7, 4.1],
 'Brakes': [0, 2, 0], 'Suspension': [0, 1.6, 1.2], 'Electronics': [1.4, 0, 1.4],
 },
 // ------------------------------------------------------------
 // Setup formula constants (calcs.py setupCalc). Track base setup values come from
 // trackData[trackName][0..5]: 0 Wing, 1 Engine, 2 Brakes, 3 Gearbox, 4 Suspension, 5 Wing Split.
 // ------------------------------------------------------------
 setupBaseOffsets: {
 wingWeatherDry: 6, wingWeatherWet: 1, wingWeatherOffset: 263,
 engineWeatherDry: -3, engineWeatherWet: 0.7, engineWeatherOffset: -190,
 brakesWeatherDry: 6, brakesWeatherWet: 3.988375441, brakesWeatherOffset: 105.5325924,
 gearsWeatherDry: -4, gearsWeatherWet: -8.0019964182, gearsWeatherOffset: -4.742711704,
 suspensionWeatherDry: -6, suspensionWeatherWet: -1, suspensionWeatherOffset: -257,
 wingDriverMultiplier: -0.001349079032746,
 engineDriverMultiplier: 0.001655723,
 engineDriverOffset: 0.0469416263186552,
 },
 // Elite-level setup adjustments (community-verified, from gpro-strategy.net and GPRO Calculator)
 // Per-1°C temperature adjustment for each part (dry conditions). Use to adjust Q1→Q2→Race
 // when temperatures shift between sessions.
 eliteTempAdjust: {
 FrontWing: 4.17, RearWing: 4.17, Engine: -5, Brakes: 5.83, Gearbox: -5, Suspension: -5.5,
 },
 // Dry↔Wet conversion deltas (applied when weather changes between Q1 and Q2)
 eliteDryWetConversion: {
 dryToWet: { FrontWing: 115, RearWing: 115, Engine: -105, Brakes: 85, Gearbox: -100, Suspension: -120 },
 wetToDry: { FrontWing: -115, RearWing: -115, Engine: 105, Brakes: -85, Gearbox: 100, Suspension: 120 },
 },
 // Wing split optimization: pilot is satisfied with the SUM of FW+RW. Once the sum is right,
 // shift ±50 between front/rear to find driver preference (some prefer more front downforce,
 // others more rear). The optimal split depends on driver talent and track characteristics.
 eliteWingSplit: {
 shiftRange: 50, // recommended shift range to test driver preference
 talentBias: -0.2465, // negative = more rear wing preferred for higher talent
 },
 // Row order: [0]=Wings, [1]=Engine, [2]=Brakes, [3]=Gears, [4]=Suspension
 setupCarLevelOffsets: [
 [-19.74, 30.03, -15.07], // Wings: Chassis, FrontWing&RearWing, Underbody
 [16.04, 4.9, 3.34], // Engine: Engine, Cooling, Electronics
 [6.04, -29.14, 6.11], // Brakes: Chassis, Brakes, Electronics
 [-41, 9], // Gears: Gearbox, Electronics
 [-15.27, -10.72, 6.04, 31], // Suspension: Chassis, Underbody, Sidepods, Suspension
 ],
 setupCarWearOffsets: [
 [0.47, -0.59, 0.32],
 [-0.51, -0.09, -0.04],
 [-0.14, 0.71, -0.09],
 [1.09, -0.14],
 [0.34, 0.23, -0.12, -0.70],
 ],
 // Row order: [0]=Engine (uses driverAggressiveness), [1]=Brakes (driverTalent),
 // [2]=Gears (driverConcentration), [3]=Suspension (driverExperience, driverWeight, +TI if wet)
 setupDriverOffsets: [
 [0.3],
 [-0.5],
 [0.5],
 [0.75, 2],
 ],
 // Wing split (Front vs Rear wing bias) constants
 wingSplit: {
 talentFactor: -0.246534498671854,
 levelFactor: 3.69107049712848,
 setupWingsFactor: -0.189968386659174,
 tempFactor: 0.376337780506523,
 wetOffset: 58.8818967363256,
 },
 // ------------------------------------------------------------
 // Tyre stop-count formula (calcs.py stopCalc/strategyCalc). tyreType index: 0=Extra Soft,
 // 1=Soft, 2=Medium, 3=Hard, 4=Rain (wearFactors), with Rain also using wetFactor=0.73.
 // ------------------------------------------------------------
 stopCalc: {
 baseWear: 129.776458172062,
 trackWearLevelExp: 0.896416176238624, // ^ trackWearLevel (0=Very Low..4=Very High)
 tempExp: 0.988463622, // ^ race temp
 supplierExp: 1.048876356, // ^ tyreSupplierFactor
 tyreTypeExp: 1.355293715, // ^ tyreType index (0-4)
 suspensionExp: 1.009339294, // ^ suspension level
 aggressivenessExp: 0.999670155, // ^ driver aggressiveness
 experienceExp: 1.00022936, // ^ driver experience
 weightExp: 0.999858329, // ^ driver weight
 trackWearLevelMap: { 'Very Low': 0, 'Low': 1, 'Medium': 2, 'High': 3, 'Very High': 4 },
 // Keys match GPRO's actual (deliberately altered) in-game supplier names exactly, per internal model
 tyreSupplierFactor: { 'Pipirelli': 1, 'Avonn': 8, 'Yokomama': 3, 'Dunnolop': 4, 'Contimental': 8, 'Badyear': 7 },
 // Index by compound: 0=ES,1=Soft,2=Medium,3=Hard,4=Rain (used for wearFactor arg, which the
 // source formula receives but never actually applies - kept for fidelity to the original).
 // Rain's *tyreType exponent* (compound index) is 5, not 4 - matches GAPP's own strategyCalc call.
 wearFactors: [0.998163750229071, 0.997064844817654, 0.996380346554349, 0.995862526048112, 0.996087854384523],
 rainTyreTypeIndex: 5,
 },
 // fuelLoadCalc: fuel/km = trackFuelBase(dry/wet, per track) + fuelFactor (driver+car adjustment)
 fuelFactorCoeffs: {
 concentration: -0.000101165467155397, aggressiveness: 0.0000706080613787091,
 experience: -0.0000866455021527332, techInsight: -0.000163915452803369,
 engineLevel: -0.0126912680856842, electronicsLevel: -0.0083557977071091,
 },
 // fuelTimeCalc (FLD - time lost carrying fuel): 0.0025 * (distanceKm^2 * fuelPerKm / stints)
 fuelTimeCalcConstant: 0.0025,
 // compoundCalc (TCD - time lost on a slower compound vs Extra Soft):
 // laps * (corners * lapLengthKm * 0.00018 * (50 - raceTemp) + tyreCompoundSupplierFactor)
 // then TCD(Soft)=that value, TCD(Medium)=2x, TCD(Hard)=3x, TCD(ES)=TCD(Rain)=0
 compoundCalcConstant: 0.00018,
 tyreCompoundSupplierFactor: { 'Pipirelli': 0, 'Avonn': 0.015, 'Yokomama': 0.05, 'Dunnolop': 0.07, 'Contimental': 0.07, 'Badyear': 0.09 },
 // pitTimeCalc: baseline pit time = fuelLoad*fuelInfluence + 24.26 + staff/TD influences.
 // No-TD defaults shown; with-TD values need a live TechDProfile fetch we don't currently make.
 pitTimeCalc: {
 base: 24.26,
 noTd: { fuelInfluence: 0.0355393906609645, concInfluence: -0.0797977676868435 },
 withTd: { fuelInfluence: 0.0314707991001518, concInfluence: -0.0945456184596369, stressInfluence: -0.0355383420267692, tdExpInfluence: -0.00944695128810026, tdPitCoordInfluence: -0.0112688398024834 },
 },
 // Source: internal formulas (verified by reading source
 // source directly on 2026-07-17). Treated as a broad prior against this account's real
 // race results - treat as a much broader prior than our single-track calibration, not gospel.
 },

 // ============================================================
 // STAFF SKILLS (rendering data)
 // ============================================================
 // Bug fixed 2026-07-27: only Concentration, Stress Handling, and Efficiency are actually
 // purchasable training (wiki-confirmed); Technical Skill/Experience/Motivation are real but have
 // no training option. `trainable: true/false` lets the UI separate overview from what's trainable.
 // Costs are the wiki's confirmed per-session prices.
 staffSkills: [
 { key: 'concentration', label: 'Concentration', priority: 1, trainable: true, cost: 750000, weight: 'High - reduces errors in pitstops & strategy' },
 { key: 'stressHandling', label: 'Stress Handling', priority: 2, trainable: true, cost: 1200000, weight: 'High - affects pit-time consistency under pressure' },
 { key: 'efficiency', label: 'Efficiency', priority: 3, trainable: true, cost: 1000000, weight: 'Medium - affects wear reduction effectiveness' },
 { key: 'technicalSkill', label: 'Technical Skill', priority: 4, trainable: false, weight: 'Not purchasable via training - shown for reference only' },
 { key: 'experience', label: 'Experience', priority: 5, trainable: false, weight: 'Not purchasable via training - shown for reference only' },
 { key: 'motivation', label: 'Motivation', priority: 6, trainable: false, weight: 'Not purchasable via training - shown for reference only' },
 ],

 // ============================================================
 // DRIVER TRAINING SESSION EFFECTS (community-sourced, not a GPRO formula)
 // ============================================================
 // GPRO's wiki says training effects aren't fully deterministic, so these are community-consensus
 // directions (from gproracers.forumotion.com/t65-driver-stats, 2026-07-27), not verified formulas.
 // `spa` has no community-confirmed source for its effects - left with an empty list and flagged
 // unconfirmed rather than keeping the old unsourced guess.
 trainingSessionEffects: {
 fitness: { up: ['stamina'], down: ['motivation'], source: 'gproracers.forumotion.com/t65-driver-stats' },
 yoga: { up: ['concentration'], down: ['aggressiveness', 'stamina'], source: 'gproracers.forumotion.com/t65-driver-stats' },
 pr: { up: ['charisma'], down: ['concentration'], source: 'gproracers.forumotion.com/t65-driver-stats' },
 tech: { up: ['techInsight'], down: [], source: 'gproracers.forumotion.com/t65-driver-stats' },
 sportspsychologist: { up: ['motivation'], down: [], source: 'gproracers.forumotion.com/t65-driver-stats' },
 ninja: { up: ['aggressiveness'], down: [], source: 'gproracers.forumotion.com/t65-driver-stats' },
  spa: { up: [], down: [], source: null, note: 'No community-confirmed effects found - unconfirmed, not guessed at' },
  },

  // User-provided optimal-training reference (2026-08-10) - target attribute levels to aim for
  // and the session that raises each one. Separate from the dynamic "weakest skill" advice:
  // this is the manager's own preferred build-out plan for Rookie/Amateur. Presented as guidance,
  // not a verified formula (GPRO's wiki says training isn't perfectly deterministic per session).
  driverOptimalTraining: [
  { skill: 'concentration', label: 'Concentration', target: 200, session: 'Yoga', note: 'Train to 200 via Yoga' },
  { skill: 'stamina', label: 'Stamina', target: 100, session: 'Fitness Class + Testing', note: 'Fitness Class + Testing (2x 50 laps = adds 5 stamina)' },
  { skill: 'techInsight', label: 'Technical Insight', target: 125, session: 'Technical training', note: 'Train to 125 via Technical training' },
  { skill: 'aggressiveness', label: 'Aggression', target: 100, session: 'Ninja training', note: 'Train to 100 via Ninja training' },
  ],

 // Which driver attribute matters most per league, per the same community guide - used to weight
 // "weakest skill" training recommendations toward what's actually relevant at that league instead
 // of just the raw-lowest number (e.g. Talent is untrainable and only matters starting Master/Elite,
 // so flagging it as the #1 "weakest skill" for a Rookie driver is not useful advice).
 driverAttributeLeaguePriority: {
 Rookie: ['concentration', 'stamina', 'experience'],
 Amateur: ['concentration', 'stamina', 'techInsight'],
 Pro: ['concentration', 'stamina', 'aggressiveness'],
 Master: ['concentration', 'talent', 'stamina'],
 Elite: ['talent', 'concentration', 'stamina'],
 },

 // ============================================================
 // FACILITY TARGETS DATA (for rendering)
 // ============================================================
 facilityTargetsData: [
 { key: 'pitstopTrainingCenter', label: 'Pitstop Training Center', targetLvl: 20, priority: 1, note: 'Reduces pitstop time' },
 { key: 'engineering', label: 'Engineering', targetLvl: 15, priority: 2, note: 'Car performance improvements' },
 { key: 'rdWorkshop', label: 'R&D Workshop', targetLvl: 10, priority: 3, note: 'Enables higher car part levels' },
 { key: 'rdDesign', label: 'R&D Design', targetLvl: 10, priority: 4, note: 'Unlocks advanced setups' },
 { key: 'lab', label: 'Lab', targetLvl: 5, priority: 5, note: 'Research efficiency' },
 { key: 'commercial', label: 'Commercial', targetLvl: 15, priority: 6, note: 'Increases sponsorship income' },
 { key: 'windtunnel', label: 'Windtunnel', targetLvl: 0, priority: 7, note: 'Expensive, low priority in Amateur' },
 ],

 // ============================================================
 // NON-LINEAR WEAR MODELS (stolen from GPRO Setup Tool + Elite spreadsheets)
 // ============================================================
 // Temperature wear multiplier: track temp affects tyre and component wear
 // Formula: 1 + (trackTemp - 20) * 0.015 + (riskLevel * 0.08)
 tempWearMultiplier: { baseTemp: 20, tempCoeff: 0.015, riskCoeff: 0.08 },
 // Track type wear classification (affects specific parts differently)
 trackTypeWear: {
 street: { engine: 1.2, suspension: 1.5, brakes: 1.3, note: 'Street circuits: high braking/suspension stress' },
 speedway: { engine: 1.4, brakes: 0.7, cooling: 1.3, note: 'Speedways: engine stress, less braking' },
 road: { note: 'Standard road courses: baseline wear rates' },
 },
 // Overtaking decision matrix thresholds
 overtakingDecision: {
 attackRatio: 1.5,       // reward/risk > 1.5 → attack aggressively
 opportunityRatio: 1.0,  // > 1.0 → look for opportunities
 patienceRatio: 0.7,     // > 0.7 → be patient
 // Race phase aggressiveness multiplier
 phaseMultipliers: [
 { maxPhase: 0.2, multiplier: 0.7, label: 'conservative' },
 { maxPhase: 0.7, multiplier: 1.2, label: 'aggressive' },
 { maxPhase: 1.0, multiplier: 0.9, label: 'calculated' },
 ],
 },
 // Scraped race data from gproanalyzer.info (Season 111, authenticated scrape 2026-07-29)
 scrapedRaceData: {
 season: 111, manager: 'scraped', league: 'Amateur', supplier: 'Pipirelli',
 races: [
 { race: 1, track: 'Barcelona', laps: 65, fuelLkm: 0.729, tyrePkm: 0.779, qPos: 27, rPos: 27, pits: 2, temp: 40.37, humidity: 57.03, dryLaps: 65, rainLaps: 0, setup: { fw: 631, rw: 559, eng: 761, brakes: 550, gb: 609, susp: 447 } },
 { race: 2, track: 'Ahvenisto', laps: 80, fuelLkm: 0.535, tyrePkm: 0.308, qPos: 36, rPos: 36, pits: 1, temp: 23.50, humidity: 57.95, dryLaps: 80, rainLaps: 0, setup: { fw: 999, rw: 999, eng: 410, brakes: 690, gb: 617, susp: 447 } },
 { race: 3, track: 'Magny Cours', laps: 72, fuelLkm: 0.600, tyrePkm: 0.434, qPos: 36, rPos: 36, pits: 1, temp: 30.62, humidity: 37.83, dryLaps: 72, rainLaps: 0, setup: { fw: 807, rw: 641, eng: 512, brakes: 609, gb: 528, susp: 518 } },
 { race: 4, track: 'Poznan', laps: 75, fuelLkm: 0.656, tyrePkm: 0.718, qPos: 20, rPos: 20, pits: 3, temp: 52.28, humidity: 12.73, dryLaps: 75, rainLaps: 0, setup: { fw: 928, rw: 882, eng: 642, brakes: 514, gb: 555, susp: 510 } },
 { race: 5, track: 'A1-Ring', laps: 71, fuelLkm: 0.723, tyrePkm: 0.635, qPos: 21, rPos: 21, pits: 2, temp: 46.66, humidity: 14.27, dryLaps: 71, rainLaps: 0, setup: { fw: 422, rw: 254, eng: 846, brakes: 391, gb: 378, susp: 215 } },
 { race: 6, track: 'Jyllands-Ringen', laps: 136, fuelLkm: 0.662, tyrePkm: 0.531, qPos: 22, rPos: 22, pits: 4, temp: 33.95, humidity: 33.51, dryLaps: 136, rainLaps: 0, setup: { fw: 928, rw: 999, eng: 422, brakes: 514, gb: 441, susp: 410 } },
 { race: 7, track: 'Silverstone', laps: 60, fuelLkm: 0.710, tyrePkm: 0.642, qPos: 25, rPos: 25, pits: 2, temp: 27.45, humidity: 51.73, dryLaps: 60, rainLaps: 0, setup: { fw: 378, rw: 480, eng: 819, brakes: 407, gb: 363, susp: 361 } },
 { race: 8, track: 'Buenos Aires', laps: 72, fuelLkm: 0.626, tyrePkm: 0.665, qPos: 18, rPos: 18, pits: 2, temp: 30.73, humidity: 39.27, dryLaps: 72, rainLaps: 0, setup: { fw: 999, rw: 991, eng: 595, brakes: 714, gb: 537, susp: 555 } },
 { race: 9, track: 'Austin', laps: 56, fuelLkm: 0.680, tyrePkm: 0.908, qPos: 16, rPos: 32, pits: 4, temp: 46.84, humidity: 93.64, dryLaps: 51, rainLaps: 5, setup: { fw: 865, rw: 791, eng: 606, brakes: 714, gb: 407, susp: 724 } },
 { race: 10, track: 'Montreal', laps: 69, fuelLkm: 0.763, tyrePkm: 0.477, qPos: 34, rPos: 34, pits: 2, temp: 43.74, humidity: 42.86, dryLaps: 69, rainLaps: 0, setup: { fw: 432, rw: 826, eng: 674, brakes: 592, gb: 514, susp: 235 } },
 ],
 },
 // Current season's CTR data (added 2026-08-13 from a live gproanalyzer.info screenshot) - this
 // account's ACTUAL current 17-track calendar (Estoril next). The old `seasonCTR`/`seasonPHA`
 // below are tagged Season 111 and cover a completely different track list (Barcelona/Ahvenisto/
 // Magny Cours/...) that doesn't match a single track here - kept as historical record, but
 // superseded for any "upcoming races" lookup. Real season number not yet confirmed by the user
 // (asked 2026-08-13) - rename this key once known.
 currentSeasonCTR: [
 { race: 1, track: 'Estoril', laps: 70, overtaking: 'Normal', grip: 'Low', ctrLap: 2.758, ctrRace: 193.086 },
 { race: 2, track: 'Bremgarten', laps: 42, overtaking: 'Normal', grip: 'Low', ctrLap: 2.373, ctrRace: 99.664 },
 { race: 3, track: 'Zandvoort', laps: 71, overtaking: 'Normal', grip: 'High', ctrLap: 2.619, ctrRace: 185.937 },
 { race: 4, track: 'Zolder', laps: 70, overtaking: 'Hard', grip: 'Low', ctrLap: 2.672, ctrRace: 187.037 },
 { race: 5, track: 'Anderstorp', laps: 70, overtaking: 'Very Hard', grip: 'Low', ctrLap: 2.770, ctrRace: 193.891 },
 { race: 6, track: 'Sochi', laps: 53, overtaking: 'Hard', grip: 'Normal', ctrLap: 3.054, ctrRace: 161.870 },
 { race: 7, track: 'Monza', laps: 53, overtaking: 'Easy', grip: 'Very Low', ctrLap: 2.370, ctrRace: 125.609 },
 { race: 8, track: 'Brno', laps: 57, overtaking: 'Easy', grip: 'Normal', ctrLap: 2.974, ctrRace: 169.524 },
 { race: 9, track: 'Valencia', laps: 57, overtaking: 'Hard', grip: 'Low', ctrLap: 2.886, ctrRace: 164.522 },
 { race: 10, track: 'Indianapolis', laps: 73, overtaking: 'Easy', grip: 'High', ctrLap: 2.941, ctrRace: 214.724 },
 { race: 11, track: 'Mexico City', laps: 69, overtaking: 'Hard', grip: 'Normal', ctrLap: 2.713, ctrRace: 187.221 },
 { race: 12, track: 'Brasilia', laps: 55, overtaking: 'Hard', grip: 'Normal', ctrLap: 2.922, ctrRace: 160.732 },
 { race: 13, track: 'Baku City', laps: 51, overtaking: 'Easy', grip: 'High', ctrLap: 2.897, ctrRace: 147.757 },
 { race: 14, track: 'Shanghai', laps: 56, overtaking: 'Normal', grip: 'High', ctrLap: 2.811, ctrRace: 157.392 },
 { race: 15, track: 'Sepang', laps: 55, overtaking: 'Normal', grip: 'Very High', ctrLap: 2.859, ctrRace: 157.233 },
 { race: 16, track: 'Fuji', laps: 67, overtaking: 'Easy', grip: 'Normal', ctrLap: 3.181, ctrRace: 213.145 },
 { race: 17, track: 'Singapore', laps: 61, overtaking: 'Hard', grip: 'Low', ctrLap: 2.877, ctrRace: 175.520 },
 ],
 // Current season's PHA data (added 2026-08-13, same screenshot source/caveats as currentSeasonCTR
 // above). Only the per-track Power/Handling/Acceleration/Advantage columns are captured - the
 // screenshot's separate "Season" cumulative P/H/A columns weren't self-consistent (the bottom
 // summary row's totals didn't match race 17's own "Season" column), so rather than guess at their
 // meaning they were left out entirely.
 currentSeasonPHA: [
 { race: 1, track: 'Estoril', power: 11, handling: 8, accel: 14, advantage: '+9' },
 { race: 2, track: 'Bremgarten', power: 8, handling: 26, accel: 17, advantage: '+27' },
 { race: 3, track: 'Zandvoort', power: 9, handling: 13, accel: 9, advantage: '+8' },
 { race: 4, track: 'Zolder', power: 11, handling: 9, accel: 10, advantage: '+3' },
 { race: 5, track: 'Anderstorp', power: 9, handling: 11, accel: 9, advantage: '+4' },
 { race: 6, track: 'Sochi', power: 8, handling: 15, accel: 18, advantage: '+13' },
 { race: 7, track: 'Monza', power: 17, handling: 12, accel: 9, advantage: '+13' },
 { race: 8, track: 'Brno', power: 12, handling: 12, accel: 14, advantage: '+4' },
 { race: 9, track: 'Valencia', power: 11, handling: 12, accel: 16, advantage: '+9' },
 { race: 10, track: 'Indianapolis', power: 10, handling: 9, accel: 11, advantage: '+3' },
 { race: 11, track: 'Mexico City', power: 13, handling: 12, accel: 7, advantage: '+7' },
 { race: 12, track: 'Brasilia', power: 16, handling: 15, accel: 7, advantage: '+10' },
 { race: 13, track: 'Baku City', power: 18, handling: 8, accel: 16, advantage: '+12' },
 { race: 14, track: 'Shanghai', power: 9, handling: 16, accel: 15, advantage: '+8' },
 { race: 15, track: 'Sepang', power: 14, handling: 11, accel: 14, advantage: '+3' },
 { race: 16, track: 'Fuji', power: 13, handling: 11, accel: 8, advantage: '+7' },
 { race: 17, track: 'Singapore', power: 7, handling: 11, accel: 17, advantage: '+16' },
 ],
 // Current season's per-track average temperature (added 2026-08-13, same screenshot source) -
 // the "Avg" column from gproanalyzer's Season Weather table. Per-season-instance samples (S97,
 // S91, S87...) and the unlabeled wear-intensity bar shown alongside each row were NOT captured -
 // no printed numbers were visible for those, only colored bars, and this project doesn't guess
 // numeric values from bar length/color.
 currentSeasonAvgTemp: {
 'Estoril': 25.25, 'Bremgarten': 31.92, 'Zandvoort': 26.39, 'Zolder': 31.13, 'Anderstorp': 26.52,
 'Sochi': 22.12, 'Monza': 25.02, 'Brno': 26.15, 'Valencia': 25.95, 'Indianapolis': 29.70,
 'Mexico City': 20.84, 'Brasilia': 31.10, 'Baku City': 29.63, 'Shanghai': 18.93, 'Sepang': 22.37,
 'Fuji': 18.58, 'Singapore': 27.84,
 },
 // Season CTR data scraped from gproanalyzer.info (Season 111, all 17 tracks) - STALE, kept for
 // historical record only. Superseded by currentSeasonCTR above (Season 111's track list doesn't
 // match this account's actual current calendar at all).
 seasonCTR: [
 { race: 1, track: 'Barcelona', laps: 65, overtaking: 'Hard', grip: 'Low', ctrLap: 2.832, ctrRace: 184.092 },
 { race: 2, track: 'Ahvenisto', laps: 80, overtaking: 'Normal', grip: 'Normal', ctrLap: 3.277, ctrRace: 262.175 },
 { race: 3, track: 'Magny Cours', laps: 72, overtaking: 'Hard', grip: 'High', ctrLap: 2.928, ctrRace: 210.845 },
 { race: 4, track: 'Poznan', laps: 75, overtaking: 'Hard', grip: 'Normal', ctrLap: 2.856, ctrRace: 214.223 },
 { race: 5, track: 'A1-Ring', laps: 71, overtaking: 'Easy', grip: 'Low', ctrLap: 2.714, ctrRace: 192.694 },
 { race: 6, track: 'Jyllands-Ringen', laps: 136, overtaking: 'Normal', grip: 'Normal', ctrLap: 4.111, ctrRace: 559.049 },
 { race: 7, track: 'Silverstone', laps: 52, overtaking: 'Normal', grip: 'Normal', ctrLap: 2.302, ctrRace: 119.708 },
 { race: 8, track: 'Buenos Aires', laps: 72, overtaking: 'Very Hard', grip: 'Normal', ctrLap: 3.309, ctrRace: 238.233 },
 { race: 9, track: 'Austin', laps: 56, overtaking: 'Easy', grip: 'High', ctrLap: 3.242, ctrRace: 181.580 },
 { race: 10, track: 'Montreal', laps: 69, overtaking: 'Normal', grip: 'Very Low', ctrLap: 2.905, ctrRace: 200.463 },
 { race: 11, track: 'Spa', laps: 44, overtaking: 'Normal', grip: 'Normal', ctrLap: 2.543, ctrRace: 111.904 },
 { race: 12, track: 'Kaunas', laps: 80, overtaking: 'Normal', grip: 'Low', ctrLap: 2.908, ctrRace: 232.670 },
 { race: 13, track: 'Hungaroring', laps: 77, overtaking: 'Very Hard', grip: 'Very High', ctrLap: 3.206, ctrRace: 246.852 },
 { race: 14, track: 'Losail', laps: 57, overtaking: 'Hard', grip: 'High', ctrLap: 2.600, ctrRace: 148.198 },
 { race: 15, track: 'New Delhi', laps: 60, overtaking: 'Normal', grip: 'Very Low', ctrLap: 2.712, ctrRace: 162.742 },
 { race: 16, track: 'Yas Marina', laps: 55, overtaking: 'Hard', grip: 'High', ctrLap: 2.846, ctrRace: 156.526 },
 { race: 17, track: 'Baku City', laps: 51, overtaking: 'Easy', grip: 'High', ctrLap: 2.897, ctrRace: 147.757 },
 ],
 // Season PHA (Track Power/Handling/Acceleration requirements, Season 111) - STALE, kept for
 // historical record only. Superseded by currentSeasonPHA above.
 seasonPHA: [
 { race: 1, track: 'Barcelona', power: 11, handling: 13, accel: 8, advantage: '+7' },
 { race: 2, track: 'Ahvenisto', power: 5, handling: 10, accel: 7, advantage: '+8' },
 { race: 3, track: 'Magny Cours', power: 12, handling: 8, accel: 11, advantage: '+5' },
 { race: 4, track: 'Poznan', power: 7, handling: 14, accel: 8, advantage: '+13' },
 { race: 5, track: 'A1-Ring', power: 13, handling: 8, accel: 9, advantage: '+9' },
 { race: 6, track: 'Jyllands-Ringen', power: 5, handling: 9, accel: 4, advantage: '+9' },
 { race: 7, track: 'Silverstone', power: 11, handling: 12, accel: 16, advantage: '+9' },
 { race: 8, track: 'Buenos Aires', power: 12, handling: 11, accel: 9, advantage: '+4' },
 { race: 9, track: 'Austin', power: 11, handling: 18, accel: 10, advantage: '+15' },
 { race: 10, track: 'Montreal', power: 12, handling: 7, accel: 13, advantage: '+7' },
 { race: 11, track: 'Spa', power: 18, handling: 16, accel: 13, advantage: '+7' },
 { race: 12, track: 'Kaunas', power: 9, handling: 10, accel: 5, advantage: '+6' },
 { race: 13, track: 'Hungaroring', power: 7, handling: 10, accel: 13, advantage: '+9' },
 { race: 14, track: 'Losail', power: 13, handling: 16, accel: 9, advantage: '+10' },
 { race: 15, track: 'New Delhi', power: 11, handling: 15, accel: 10, advantage: '+9' },
 { race: 16, track: 'Yas Marina', power: 12, handling: 10, accel: 17, advantage: '+12' },
 { race: 17, track: 'Baku City', power: 18, handling: 8, accel: 16, advantage: '+12' },
 ],
 // Reverse-engineered formulas from gproanalyzer.info calculators
 // Tested by submitting multiple input combinations via authenticated session
 calculatorFormulas: {
 // CTR Time Gain: CT/100 × ctrGainPerLap × laps = total race time gain
 // Verified: CT=100 → 2.712 s/lap × 60 laps = 162.742 s/race
 ctrTimeGainPerLap: 2.712,
 // Time Lost Due To Pitting: pitLoss / laps × factor × stops × [pitFactor]
 // Verified: pitLoss=15, laps=60 → 2.833 s/lap (factor=1/3.53)
 pitTimeLossFactor: 0.2833,
 // Time Lost Due To FLD: fuel × 0.003857 × (laps/60)^0.5 × (trackDist/300)
 // Verified: fuel=100 → 0.214 s/lap at 60 laps
 fldFuelFactor: 0.003857,
 // Test Points per lap (linear scaling with laps)
 testPointsPerLap: {
 chassis: 1.3, engine: 1.3, fw: 1.3, rw: 3.2,
 ub: 0.4, sidepods: 0.4, cooling: 0.4, gb: 3.2,
 brakes: 0.4, susp: 0.4, elec: 3.2,
 // Integer thresholds (appear at specific lap counts)
 brakesInt: 2, suspInt: 2, coolingInt: 2,
 },
 // Car base costs ($M) for level 1 upgrade
 carBaseCosts: {
 chassis: 1.29, engine: 3.31, fw: 1.55, rw: 1.50, ub: 0.51,
 sidepods: 0.46, cooling: 0.45, gb: 3.10, brakes: 0.70, susp: 1.18, elec: 0.94,
 },
 // Sponsor negotiation answers (from gproanalyzer.info/sponsor.php)
 // Maps characteristic values (1-7) to answer text
 sponsorAnswers: {
 // Car spot placement based on image (ima) characteristic
 carSpot: { 1: 'Front wing', 2: 'Front wing', 3: 'Rear wing', 4: 'Nose', 5: 'Sidepods', 6: 'Sidepods', 7: 'Engine cover' },
 // Season expectations based on expectations (exp) characteristic
 expectations: { 1: 'Relegate with cash', 2: 'Relegate with cash', 3: 'Low table position', 4: 'Low table position', 5: 'Mid table position', 6: 'Promotion / top 4 / championship win', 7: 'Promotion / top 4 / championship win' },
 // Driver popularity based on image (ima) characteristic
 popularity: { 1: 'My driver is hated by the fans', 2: 'My driver is hated by the fans', 3: 'My driver is not very popular with the fans', 4: 'My driver is not very popular with the fans', 5: 'My driver is liked by the fans', 6: 'My driver is quite popular with the fans', 7: 'My driver is a favourite of the fans' },
 // Amount satisfaction based on patience (pat) characteristic
 amount: { 1: 'OK', 2: 'OK', 3: 'A bit too low', 4: 'A bit too low', 5: 'Far too low', 6: 'Far too low', 7: 'Unacceptable' },
 // Contract duration satisfaction based on patience (pat) characteristic
 duration: { 1: 'OK', 2: 'OK', 3: 'OK', 4: 'OK', 5: 'A bit too low', 6: 'A bit too low', 7: 'Far too low' },
 },
 },
 // Tyre supplier data scraped from gprohub.net (authenticated session, Season 111)
 // Complete supplier stats: durability, compound difference, peak temp, performance, cost, warmup
 tyreSuppliers: [
 { name: 'Pipirelli', id: 1, durability: 2, compoundDiff: 0, peakTemp: 31, dryPerf: 2, rainPerf: 2, cost: 250000, warmup: 7 },
 { name: 'Yokomama', id: 2, durability: 7, compoundDiff: 0.05, peakTemp: 27, dryPerf: 3, rainPerf: 1, cost: 2610000, warmup: 3 },
 { name: 'Dunnolop', id: 3, durability: 4, compoundDiff: 0.07, peakTemp: 21, dryPerf: 4, rainPerf: 3, cost: 2510000, warmup: 6 },
 { name: 'Badyear', id: 4, durability: 5, compoundDiff: 0.09, peakTemp: 23, dryPerf: 5, rainPerf: 6, cost: 4770000, warmup: 4 },
 { name: 'Michelini', id: 5, durability: 2, compoundDiff: 0.075, peakTemp: 15, dryPerf: 8, rainPerf: 8, cost: 8000000, warmup: 1 },
 { name: 'Bridgerock', id: 6, durability: 8, compoundDiff: 0.08, peakTemp: 26, dryPerf: 6, rainPerf: 5, cost: 7000000, warmup: 5 },
 { name: 'Hancock', id: 7, durability: 1, compoundDiff: 0, peakTemp: 11, dryPerf: 7, rainPerf: 4, cost: 4440000, warmup: 2 },
 { name: 'Contimental', id: 8, durability: 6, compoundDiff: 0.07, peakTemp: 37, dryPerf: 7, rainPerf: 2, cost: 3330000, warmup: 8 },
 { name: 'Avonn', id: 9, durability: 8, compoundDiff: 0.015, peakTemp: 33, dryPerf: 1, rainPerf: 7, cost: 1620000, warmup: 5 },
 ],
 // Tyre compound wear factors (from gprohub.net props data)
 // factor = base^(type_value) — lower factor = faster wear
 tyreCompoundFactors: {
 'Extra Soft': { type: 0, factor: 0.998163750229071 },
 'Soft': { type: 1, factor: 0.997064844817654 },
 'Medium': { type: 2, factor: 0.996380346554349 },
 'Hard': { type: 3, factor: 0.995862526048112 },
 'Rain': { type: 5, factor: 0.996087854384523 },
 },
};
