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
  notes: 'Targets are recommendations, NOT caps - GPRO allows parts up to L9 in every league. Car resets each season in Rookie: only replace worn parts, save money for Amateur.',
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
 'Bremgarten GP': {
 laps: 42,
 pitLoss: 17,
 tyreFinalWear: 15,
 driver: { name: 'Kyle Manning', conc: 224, talent: 48, exp: 86, ti: 100, aggr: 0, weight: 92, stamina: 15, charisma: 159, motivation: 108 },
 car: { power: 0, handling: 0, accel: 0 },
 avgRaceTemp: 10,
 // gproanalyzer Race Strategy sweep (CTR=0). Lost-time totals (tcd+fld+pits).
 strategies: {
 baseline: { // CTR=0, dry race
 'Extra Soft': { stops: 2, fuel: 80.3, total: 148.06 },
 'Soft': { stops: 2, fuel: 80.3, total: 183.29 },
 'Medium': { stops: 1, fuel: 0, total: 207.13 },
 'Hard': { stops: 1, fuel: 0, total: 242.36 },
 'Rain': { stops: 0, fuel: 0, total: 159.17 },
 },
 },
 // gproanalyzer pit-strategy detail (Extra Soft: 3 stints of 14 laps, 17.9% final wear, 80.3L/stint)
 pitStrategies: {
 'Extra Soft': {
 stints: 3,
 laps: [14, 14, 14],
 fuel: [80.3, 80.3, 80.3],
 tyreWear: [17.9, 17.9, 17.9],
 },
 },
 // gproanalyzer car setup: Q1/Q2 ran wet, Race dry (10C). FW/RW/E/B/G/S order.
 setupReference: {
 dry: {
 '10C': { q1: { fw: 0, rw: 0, e: 0, b: 0, g: 0, s: 0 }, q2: { fw: 0, rw: 0, e: 0, b: 0, g: 0, s: 0 }, race: { fw: 718, rw: 728, e: 662, b: 621, g: 752, s: 729 } },
 },
 wet: {
 '11C': { q1: { fw: 936, rw: 904, e: 486, b: 710, g: 699, s: 537 }, q2: { fw: 0, rw: 0, e: 0, b: 0, g: 0, s: 0 }, race: { fw: 0, rw: 0, e: 0, b: 0, g: 0, s: 0 } },
 '13C': { q1: { fw: 0, rw: 0, e: 0, b: 0, g: 0, s: 0 }, q2: { fw: 939, rw: 905, e: 488, b: 718, g: 683, s: 535 }, race: { fw: 0, rw: 0, e: 0, b: 0, g: 0, s: 0 } },
  },
  },
  },
  // ============================================================
  // Zandvoort GP — captured from GPRO Analyzer (Season 112, Race 3)
  // Driver: Takashi Oshima (Rookie), Car: L1 all except Engine L2 + Brakes L2, Supplier: Pipirelli
  // ============================================================
  'Zandvoort GP': {
  laps: 71,
  pitLoss: 22.5,
  tyreFinalWear: 15,
  driver: { name: 'Takashi Oshima', conc: 203, talent: 57, exp: 94, ti: 145, aggr: 0, weight: 87, stamina: 12, charisma: 52, motivation: 116 },
  car: { power: 0, handling: 0, accel: 0 },
  avgRaceTemp: 32,
  // gproanalyzer Race Strategy sweep (CTR=0, dry). Lost-time totals (tcd+fld+pits).
  // GAPP formula diverges on Extra Soft (GAPP=5 vs GPRO=4) and Hard (GAPP=2 vs GPRO=1)
  // at these driver/car levels — calibration overrides.
  strategies: {
  baseline: { // CTR=0, dry race
  'Extra Soft': { stops: 4, fuel: 45, total: 224.13 },
  'Soft': { stops: 3, fuel: 57, total: 199.75 },
  'Medium': { stops: 2, fuel: 76, total: 180.74 },
  'Hard': { stops: 1, fuel: 114, total: 175.01 },
  'Rain': { stops: 1, fuel: 76, total: 105.27 },
  },
  },
  // gproanalyzer pit-strategy detail — REFERENCE ONLY, not yet consumed by any code path
  // (lookupCalibratedTyreResults reads `.strategies` only). Kept for future stint-level work.
  pitStrategies: {
  'Extra Soft': {
  stints: 5,
  laps: [15, 14, 14, 14, 14],
  fuel: [47.2, 44.1, 44.1, 44.1, 44.1],
  tyreWear: [24.5, 29.6, 29.6, 29.6, 29.6],
  },
  },
  // gproanalyzer car setup reference (Pipirelli, Takashi Oshima, L1 car except Engine L2 +
  // Brakes L2) — REFERENCE ONLY, not yet consumed by any code path.
  setupReference: {
  dry: {
  '35C': { q1: { fw: 586, rw: 840, e: 676, b: 544, g: 756, s: 742 } },
  '31C': { q2: { fw: 567, rw: 815, e: 689, b: 520, g: 772, s: 766 } },
  '32C': { race: { fw: 571, rw: 821, e: 686, b: 526, g: 768, s: 760 } },
  },
  },
  }, 'Kaunas GP': {
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
 // The shortlist applies the configured numeric attribute floors together. Qualitative targets
 // such as as-high-as-affordable remain guidance rather than numeric gates.

 driverSelection: {
 // Targets calibrated 2026-08-10 from a real 24,846-driver market scrape (gpro-strategy.net
 // find-driver, OA-banded). Previous '200+' concentration floors were unreachable in Rookie
 // (0 of 100 sampled max-OA drivers had it) and too strict in Amateur (only ~20% of max-OA
 // drivers) - which is exactly why the advisor shortlisted nobody. Values below follow real
 // per-band medians; all numeric floors are applied together, per the current shortlist policy.

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
 "Bremgarten": [713.7, 594.03, 589.41, 697.91, 539.29, 138.55, 0.858, 0.71, 305.8, 1.0813, 17, 16, 42, 7.28], // wetFuelPerKm inferred from comparable tracks; runtime falls back to dry when unavailable
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

  // OA (Overall) calculator weights, ported from the BLACK STAR RACING Heino.xlsx "OA" sheet
  // (GPRO Single by Jay v1.69.11.A). OA = SUM(attr x weight), no constant term. Validated against
  // that sheet's own example driver (conc 199, tal 234, agr 25, exp 84, TI 107, sta 37, cha 64,
  // mot 0, rep 0, weight 80): 199*0.16651 + 234*0.24954 + 25*0.14528 + 84*0.08419 + 107*0.12491
  // + 37*0.14545 + 64*0.08312 + 0*0.08357 + 0*0 + 80*(-0.08636) = 119.38971 = the sheet's OA.
  // Presented as community-derived guidance, not a confirmed GPRO formula.
  driverOaCalc: {
  weight: {
  concentration: 0.16651,
  talent: 0.24954,
  aggressiveness: 0.14528,
  experience: 0.08419,
  techInsight: 0.12491,
  stamina: 0.14545,
  charisma: 0.08312,
  motivation: 0.08357,
  reputation: 0,
  weight: -0.08636,
  },
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
  // ============================================================
  // EXCEL PORT: BLACK STAR RACING Heino.xlsx ("GPRO Single by Jay" v1.69.11.A)
  // ============================================================
  prizeMoney: {
  qual: {
  Elite: [2500000,2250000,2000000,1850000,1800000,1750000,1700000,1650000,1600000,1550000,1500000,1450000,1400000,1350000,1300000,1250000,1200000,1150000,1100000,1050000,1000000,950000,900000,850000,800000,750000,700000,650000,600000,550000,500000,450000,400000,350000,300000,250000,200000,150000,100000,50000],
  Master: [2000000,1800000,1600000,1480000,1440000,1400000,1360000,1320000,1280000,1240000,1200000,1160000,1120000,1080000,1040000,1000000,960000,920000,880000,840000,800000,760000,720000,680000,640000,600000,560000,520000,480000,440000,400000,360000,320000,280000,240000,200000,160000,120000,80000,40000],
  Pro: [1500000,1350000,1200000,1110000,1080000,1050000,1020000,990000,960000,930000,900000,870000,840000,810000,780000,750000,720000,690000,660000,630000,600000,570000,540000,510000,480000,450000,420000,390000,360000,330000,300000,270000,240000,210000,180000,150000,120000,90000,60000,30000],
  Amateur: [1000000,900000,800000,740000,720000,700000,680000,660000,640000,620000,600000,580000,560000,540000,520000,500000,480000,460000,440000,420000,400000,380000,360000,340000,320000,300000,280000,260000,240000,220000,200000,180000,160000,140000,120000,100000,80000,60000,40000,20000],
  Rookie: [500000,450000,400000,370000,360000,350000,340000,330000,320000,310000,300000,290000,280000,270000,260000,250000,240000,230000,220000,210000,200000,190000,180000,170000,160000,150000,140000,130000,120000,110000,100000,90000,80000,70000,60000,50000,40000,30000,20000,10000],
  },
  race: {
  Elite: [22000000,21620513,21341026,21061538,20782051,20502564,20223077,19943590,19664103,19384616,19105129,18825642,18546155,18266668,17987181,17707694,17428207,17148720,16869233,16589746,16310259,16030772,15751285,15471798,15192311,14912824,14633337,14353850,14074363,13794876,13515389,13235902,12956415,12676928,12397441,12117954,11838467,11558980,11279493,11000006],
  Master: [18000000,17671795,17443590,17215385,16987179,16758973,16530767,16302561,16074355,15846149,15617943,15389737,15161531,14933325,14705119,14476913,14248707,14020501,13792295,13564089,13335883,13107677,12879471,12651265,12423059,12194853,11966647,11738441,11510235,11282029,11053823,10825617,10597411,10369205,10140999,9912793,9684587,9456381,9228175,8999969],
  Pro: [15000000,14710256,14520513,14330769,14141026,13951283,13761540,13571797,13382054,13192311,13002568,12812825,12623082,12433339,12243596,12053853,11864110,11674367,11484624,11294881,11105138,10915395,10725652,10535909,10346166,10156423,9966680,9776937,9587194,9397451,9207708,9017965,8828222,8638479,8448736,8258993,8069250,7879507,7689764,7500021],
  Amateur: [12000000,11748718,11597436,11446154,11294872,11143590,10992308,10841026,10689744,10538462,10387180,10235898,10084616,9933334,9782052,9630770,9479488,9328206,9176924,9025642,8874360,8723078,8571796,8420514,8269232,8117950,7966668,7815386,7664104,7512822,7361540,7210258,7058976,6907694,6756412,6605130,6453848,6302566,6151284,6000002],
  Rookie: [8000000,7800000,7700000,7600000,7500000,7400000,7300000,7200000,7100000,7000000,6900000,6800000,6700000,6600000,6500000,6400000,6300000,6200000,6100000,6000000,5900000,5800000,5700000,5600000,5500000,5400000,5300000,5200000,5100000,5000000,4900000,4800000,4700000,4600000,4500000,4400000,4300000,4200000,4100000,4000000],
  },
  },
  partCosts: {
  "Chassis": [1292539,1600810,1982603,2455453,3041079,3766376,4664657,5777178,7155035],
  "Engine": [3311737,4101586,5079815,6291350,7791873,9650191,11951762,14802257,18332595],
  "Front Wing": [1551345,1921352,2379594,2947128,3650018,4520547,5598697,6933986,8587742],
  "Rear Wing": [1504126,1862860,2307152,2857408,3538900,4382928,5428256,6722895,8326305],
  "Underbody": [510128,631794,782476,969097,1200226,1486480,1841005,2280085,2823885],
  "Sidepods": [459831,569501,705327,873547,1081888,1339918,1659488,2055276,2545459],
  "Cooling": [454545,562954,697219,863505,1069451,1324515,1640412,2031650,2516199],
  "Gearbox": [3098104,3873002,4752127,5885509,7289203,9027678,11180779,13847395,17149999],
  "Brakes": [697674,864069,1070150,1325380,1641484,2032978,2517843,3118349,3862075],
  "Suspension": [1181545,1463343,1812351,2244597,2779933,3442947,4264090,5281075,6540611],
  "Electronics": [938416,1162228,1439420,1782721,2207900,2734484,3386658,4194376,5194735],
  "TOTAL": [14999991,18613501,23008237,28495699,35291960,43709048,54133654,67044530,83034649],
  },
  validationFeedback: {
  "Downforce (Fwing/ Rwing)": {"1":"The car could have a bit more speed on the straights","2":"The car is lacking some speed on the straights","3":"I am really missing a lot of speed on the straights","-1":"I am missing a bit of grip on the curves","-2":"The car is very unstable in many corners","-3":"I cannot drive the car, there is no grip on it"},
  "Engine": {"1":"Try to favor a bit more the low revs","2":"The engine revs are to high","3":"No No No! Favor a lot more to the low revs","-1":"I feel that I do not have ennough engine power on the straights","-2":"The engine power on the straights is not sufficient","-3":"You should try to favor a lot more the high revs"},
  "Brakes": {"1":"Put the balance a bit more to the back","2":"I think the brake effectiveness could be higher if we move the balance to the back","3":"Please move the balance a lot more to the back","-1":"I would like to have the balance a bit more to the front","-2":"I think the brake effectiveness could be higher if we move the balance to the front","-3":"I would feel a lot more comfortable to move the balance to the front"},
  "Gear": {"1":"I cannot take advantage of the power of the engine. Put the gear ratio a bit lower","2":"The gear ratio is too high","3":"Please enter the ratio between the gears much lower","-1":"I am very often in the red. Put the gear ratio a bit higher","-2":"The gear ratio is too low","-3":"It feel like the engine is going to explode. Put a lot higher ratio between gears"},
  "Suspension": {"1":"The car is too rigid. Lower a bit the rigidity","2":"The suspension rigidity is too high","3":"The car is far too rigid. Lower a lot the rigidity","-1":"I think with a bit more rigid suspension I wille be able to go faster","-2":"The suspension rigidity is too low","-3":"The suspension rigidity should be a lot higher"},
  },
  trackPub: {
  "A1-Ring": {"raceKm":307.1,"laps":71,"lapKm":4.325,"avgSpeed":232.22,"corners":9,"pitSec":21,"power":13,"handling":8,"accel":9,"downforce":"Low","overtaking":"Easy","suspRigidity":"Medium","fuelCons":"High","tyreWear":"Medium","grip":"Low","blockPass":1.2601,"energy":100,"blockPassByLeague":{"Rookie":0.8573,"Amateur":1.5293,"Pro":1.8269,"Master":2.2103,"Elite":2.8619},"eliteQ1":67.611,"qTemp":14,"raceRef":"S57, R4"},
  "Adelaide": {"raceKm":298.6,"laps":79,"lapKm":3.78,"avgSpeed":193.33,"corners":12,"pitSec":19.5,"power":8,"handling":9,"accel":10,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Medium","fuelCons":"Low","tyreWear":"Medium","grip":"Low","blockPass":2.3759,"energy":null,"blockPassByLeague":{"Rookie":1.8031,"Amateur":2.7723,"Pro":3.2813,"Master":3.9627,"Elite":4.496},"eliteQ1":69.761,"qTemp":10,"raceRef":"S45, R15"},
  "Ahvenisto": {"raceKm":243.2,"laps":80,"lapKm":3.04,"avgSpeed":150.95,"corners":10,"pitSec":11.5,"power":5,"handling":10,"accel":7,"downforce":"High","overtaking":"Normal","suspRigidity":"Soft","fuelCons":"Medium","tyreWear":"High","grip":"Normal","blockPass":2.5791,"energy":null,"blockPassByLeague":{"Rookie":1.9158,"Amateur":3.0568,"Pro":3.4303,"Master":3.9234,"Elite":4.6916},"eliteQ1":72.662,"qTemp":31,"raceRef":"S28, R16"},
  "Anderstorp": {"raceKm":281.8,"laps":70,"lapKm":4.026,"avgSpeed":207.25,"corners":10,"pitSec":13.5,"power":9,"handling":11,"accel":9,"downforce":"Low","overtaking":"Very Hard","suspRigidity":"Soft","fuelCons":"High","tyreWear":"Medium","grip":"Low","blockPass":3.7225,"energy":null,"blockPassByLeague":{"Rookie":3.0044,"Amateur":4.4156,"Pro":4.9164,"Master":5.1483,"Elite":6.2317},"eliteQ1":70.012,"qTemp":9,"raceRef":"S58, R16"},
  "Austin": {"raceKm":308.9,"laps":56,"lapKm":5.516,"avgSpeed":194.19,"corners":20,"pitSec":17.5,"power":11,"handling":18,"accel":10,"downforce":"Medium","overtaking":"Easy","suspRigidity":"Hard","fuelCons":"Medium","tyreWear":"Medium","grip":"High","blockPass":0.9819,"energy":null,"blockPassByLeague":{"Rookie":0.5888,"Amateur":1.1633,"Pro":1.4882,"Master":2.0868,"Elite":2.4033},"eliteQ1":103.626,"qTemp":21,"raceRef":"S49, R17"},
  "Avus": {"raceKm":312.3,"laps":64,"lapKm":4.88,"avgSpeed":303.15,"corners":4,"pitSec":13,"power":22,"handling":3,"accel":9,"downforce":"Low","overtaking":"Easy","suspRigidity":"Hard","fuelCons":"Very High","tyreWear":"Low","grip":"Normal","blockPass":0.6661,"energy":null,"blockPassByLeague":{"Rookie":0.5643,"Amateur":0.6756,"Pro":0.7369,"Master":0.9316,"Elite":1.4988},"eliteQ1":59.498,"qTemp":32,"raceRef":"S67, R17"},
  "Baku City": {"raceKm":306.3,"laps":51,"lapKm":6.006,"avgSpeed":213.94,"corners":20,"pitSec":17,"power":18,"handling":8,"accel":16,"downforce":"Medium","overtaking":"Easy","suspRigidity":"Hard","fuelCons":"High","tyreWear":"Very High","grip":"High","blockPass":0.9138,"energy":null,"blockPassByLeague":{"Rookie":0.5431,"Amateur":0.9819,"Pro":1.1777,"Master":1.402,"Elite":1.5115},"eliteQ1":103.001,"qTemp":45,"raceRef":"S53, R11"},
  "Barcelona": {"raceKm":307.3,"laps":65,"lapKm":4.728,"avgSpeed":221.28,"corners":16,"pitSec":21,"power":11,"handling":13,"accel":8,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Soft","fuelCons":"High","tyreWear":"Medium","grip":"Low","blockPass":2.6653,"energy":null,"blockPassByLeague":{"Rookie":2.0086,"Amateur":3.4972,"Pro":3.5171,"Master":3.8732,"Elite":5.1249},"eliteQ1":77.741,"qTemp":10,"raceRef":"S53, R1"},
  "Brands Hatch": {"raceKm":315.5,"laps":75,"lapKm":4.207,"avgSpeed":213.29,"corners":12,"pitSec":25.5,"power":10,"handling":12,"accel":8,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Medium","fuelCons":"Low","tyreWear":"Low","grip":"Normal","blockPass":2.0843,"energy":null,"blockPassByLeague":{"Rookie":1.4367,"Amateur":2.5546,"Pro":3.0518,"Master":3.7554,"Elite":4.3427},"eliteQ1":71.439,"qTemp":40,"raceRef":"S49, R2"},
  "Brasilia": {"raceKm":301.1,"laps":55,"lapKm":5.475,"avgSpeed":208.11,"corners":12,"pitSec":13.5,"power":16,"handling":15,"accel":7,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Hard","fuelCons":"High","tyreWear":"Medium","grip":"Normal","blockPass":2.1849,"energy":null,"blockPassByLeague":{"Rookie":1.6547,"Amateur":2.5476,"Pro":2.8882,"Master":3.3784,"Elite":4.7218},"eliteQ1":95.54,"qTemp":35,"raceRef":"S29, R2"},
  "Bremgarten": {"raceKm":305.8,"laps":42,"lapKm":7.281,"avgSpeed":262.9,"corners":16,"pitSec":17,"power":8,"handling":26,"accel":17,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Medium","fuelCons":"Medium","tyreWear":"Medium","grip":"Low","blockPass":1.2366,"energy":null,"blockPassByLeague":{"Rookie":0.9039,"Amateur":1.2992,"Pro":1.4676,"Master":1.7892,"Elite":1.7481},"eliteQ1":99.706,"qTemp":45,"raceRef":"S68, R11"},
  "Brno": {"raceKm":308,"laps":57,"lapKm":5.404,"avgSpeed":210.14,"corners":15,"pitSec":14,"power":12,"handling":12,"accel":14,"downforce":"Medium","overtaking":"Easy","suspRigidity":"Medium","fuelCons":"Medium","tyreWear":"High","grip":"Normal","blockPass":0.8096,"energy":null,"blockPassByLeague":{"Rookie":0.5412,"Amateur":1.0134,"Pro":1.1686,"Master":1.6356,"Elite":2.2477},"eliteQ1":92.902,"qTemp":26,"raceRef":"S49, R1"},
  "Bucharest Ring": {"raceKm":245.7,"laps":80,"lapKm":3.071,"avgSpeed":149.64,"corners":14,"pitSec":24,"power":8,"handling":6,"accel":8,"downforce":"Low","overtaking":"Easy","suspRigidity":"Hard","fuelCons":"Very High","tyreWear":"Low","grip":"Normal","blockPass":1.1493,"energy":null,"blockPassByLeague":{"Rookie":0.7862,"Amateur":1.3875,"Pro":1.6365,"Master":2.0247,"Elite":2.4968},"eliteQ1":73.971,"qTemp":12,"raceRef":"S62, R1"},
  "Buenos Aires": {"raceKm":306.6,"laps":72,"lapKm":4.258,"avgSpeed":187.83,"corners":16,"pitSec":19.5,"power":12,"handling":11,"accel":9,"downforce":"High","overtaking":"Very Hard","suspRigidity":"Hard","fuelCons":"Very Low","tyreWear":"High","grip":"Normal","blockPass":3.2211,"energy":null,"blockPassByLeague":{"Rookie":2.5424,"Amateur":3.8446,"Pro":4.1186,"Master":4.4048,"Elite":5.5765},"eliteQ1":81.835,"qTemp":11,"raceRef":"S43, R10"},
  "Estoril": {"raceKm":305.2,"laps":70,"lapKm":4.36,"avgSpeed":226.02,"corners":13,"pitSec":22.5,"power":11,"handling":8,"accel":14,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Medium","fuelCons":"Medium","tyreWear":"Medium","grip":"Low","blockPass":1.7489,"energy":null,"blockPassByLeague":{"Rookie":1.2055,"Amateur":2.2459,"Pro":2.6379,"Master":2.9988,"Elite":4.0182},"eliteQ1":70.598,"qTemp":7,"raceRef":"S41, R9"},
  "Fiorano": {"raceKm":238.6,"laps":79,"lapKm":3.02,"avgSpeed":187.5,"corners":14,"pitSec":16.5,"power":8,"handling":6,"accel":7,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Hard","fuelCons":"Very High","tyreWear":"High","grip":"Low","blockPass":2.5308,"energy":null,"blockPassByLeague":{"Rookie":1.8859,"Amateur":2.9823,"Pro":3.2749,"Master":3.5891,"Elite":4.4485},"eliteQ1":58.191,"qTemp":null,"raceRef":"S39, R8"},
  "Fuji": {"raceKm":305.4,"laps":67,"lapKm":4.558,"avgSpeed":196.33,"corners":16,"pitSec":18.5,"power":13,"handling":11,"accel":8,"downforce":"Low","overtaking":"Easy","suspRigidity":"Medium","fuelCons":"Medium","tyreWear":"Medium","grip":"Normal","blockPass":1.0652,"energy":null,"blockPassByLeague":{"Rookie":0.7342,"Amateur":1.2548,"Pro":1.5399,"Master":2.0187,"Elite":2.71},"eliteQ1":84.307,"qTemp":13,"raceRef":"S44, R17"},
  "Grobnik": {"raceKm":308.4,"laps":74,"lapKm":4.168,"avgSpeed":216.89,"corners":15,"pitSec":13,"power":8,"handling":15,"accel":7,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Medium","fuelCons":"Low","tyreWear":"Very High","grip":"Very High","blockPass":2.6766,"energy":null,"blockPassByLeague":{"Rookie":1.9267,"Amateur":2.8902,"Pro":3.1453,"Master":3.6462,"Elite":3.8607},"eliteQ1":69.414,"qTemp":39,"raceRef":"S66, R6"},
  "Hockenheim": {"raceKm":306.4,"laps":67,"lapKm":4.573,"avgSpeed":241.98,"corners":12,"pitSec":16.5,"power":12,"handling":9,"accel":11,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Soft","fuelCons":"High","tyreWear":"Medium","grip":"High","blockPass":1.8841,"energy":null,"blockPassByLeague":{"Rookie":1.3793,"Amateur":2.3502,"Pro":2.677,"Master":3.2226,"Elite":3.8934},"eliteQ1":68.035,"qTemp":22,"raceRef":"S65, R13"},
  "Hungaroring": {"raceKm":305.5,"laps":77,"lapKm":3.968,"avgSpeed":193.43,"corners":14,"pitSec":16.5,"power":7,"handling":10,"accel":13,"downforce":"High","overtaking":"Very Hard","suspRigidity":"Medium","fuelCons":"Very Low","tyreWear":"Very Low","grip":"Very High","blockPass":3.4506,"energy":null,"blockPassByLeague":{"Rookie":2.7445,"Amateur":4.1882,"Pro":4.5612,"Master":5.293,"Elite":6.5368},"eliteQ1":73.71,"qTemp":null,"raceRef":"S15, R12"},
  "Imola": {"raceKm":305.6,"laps":62,"lapKm":4.929,"avgSpeed":218.85,"corners":16,"pitSec":12,"power":12,"handling":13,"accel":9,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Medium","fuelCons":"Medium","tyreWear":"Medium","grip":"Low","blockPass":2.581,"energy":null,"blockPassByLeague":{"Rookie":2.0159,"Amateur":2.9922,"Pro":3.2716,"Master":3.9291,"Elite":5.293},"eliteQ1":81.164,"qTemp":null,"raceRef":"S16, R9"},
  "Indianapolis": {"raceKm":306.6,"laps":73,"lapKm":4.2,"avgSpeed":212.6,"corners":13,"pitSec":25.5,"power":10,"handling":9,"accel":11,"downforce":"Low","overtaking":"Easy","suspRigidity":"Medium","fuelCons":"High","tyreWear":"Medium","grip":"High","blockPass":1.1198,"energy":null,"blockPassByLeague":{"Rookie":0.7647,"Amateur":1.3537,"Pro":1.5973,"Master":2.1448,"Elite":3.0162},"eliteQ1":71.428,"qTemp":36,"raceRef":"S52, R17"},
  "Indianapolis Oval": {"raceKm":804.4,"laps":200,"lapKm":4.022,"avgSpeed":425.41,"corners":4,"pitSec":45,"power":17,"handling":9,"accel":2,"downforce":"Low","overtaking":"Very Easy","suspRigidity":"Soft","fuelCons":"Very High","tyreWear":"Low","grip":"Low","blockPass":0.2237,"energy":null,"blockPassByLeague":{"Rookie":0.1805,"Amateur":0.2589,"Pro":0.2674,"Master":0.3273,"Elite":0.3998},"eliteQ1":36.885,"qTemp":24,"raceRef":"S47, R15"},
  "Interlagos": {"raceKm":305.9,"laps":71,"lapKm":4.308,"avgSpeed":219.37,"corners":14,"pitSec":18,"power":12,"handling":9,"accel":10,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Soft","fuelCons":"Medium","tyreWear":"Medium","grip":"High","blockPass":1.8192,"energy":null,"blockPassByLeague":{"Rookie":1.3649,"Amateur":2.2478,"Pro":2.5483,"Master":3.037,"Elite":3.8238},"eliteQ1":70.93,"qTemp":null,"raceRef":"S16, R17"},
  "Irungattukottai": {"raceKm":293.6,"laps":79,"lapKm":3.716,"avgSpeed":172.25,"corners":12,"pitSec":14,"power":8,"handling":12,"accel":7,"downforce":"Medium","overtaking":"Easy","suspRigidity":"Medium","fuelCons":"Medium","tyreWear":"High","grip":"High","blockPass":1.2579,"energy":null,"blockPassByLeague":{"Rookie":0.8669,"Amateur":1.5438,"Pro":1.7186,"Master":2.2354,"Elite":3.3412},"eliteQ1":77.808,"qTemp":28,"raceRef":"S29, R14"},
  "Istanbul": {"raceKm":309.4,"laps":58,"lapKm":5.334,"avgSpeed":231.53,"corners":14,"pitSec":16,"power":13,"handling":10,"accel":14,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Medium","fuelCons":"Medium","tyreWear":"Medium","grip":"High","blockPass":1.5754,"energy":null,"blockPassByLeague":{"Rookie":1.0543,"Amateur":2.0449,"Pro":2.3918,"Master":2.9656,"Elite":4.4765},"eliteQ1":84.195,"qTemp":14,"raceRef":"S45, R5"},
  "Jeddah": {"raceKm":308.7,"laps":50,"lapKm":6.174,"avgSpeed":241.82,"corners":27,"pitSec":21,"power":20,"handling":12,"accel":11,"downforce":"Low","overtaking":"Normal","suspRigidity":"Meduim","fuelCons":"Very High","tyreWear":"High","grip":"Normal","blockPass":null,"energy":null,"blockPassByLeague":{"Rookie":null,"Amateur":null,"Pro":null,"Master":null,"Elite":null},"eliteQ1":null,"qTemp":null,"raceRef":""},
  "Jerez": {"raceKm":306.4,"laps":69,"lapKm":4.441,"avgSpeed":203.19,"corners":14,"pitSec":18,"power":8,"handling":16,"accel":8,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Soft","fuelCons":"High","tyreWear":"Very High","grip":"Low","blockPass":2.394,"energy":null,"blockPassByLeague":{"Rookie":1.7658,"Amateur":2.9497,"Pro":3.2089,"Master":3.7726,"Elite":4.1881},"eliteQ1":79.648,"qTemp":17,"raceRef":"S67, R7"},
  "Jyllands-Ringen": {"raceKm":312.8,"laps":136,"lapKm":2.3,"avgSpeed":153.1,"corners":20,"pitSec":19.5,"power":5,"handling":9,"accel":4,"downforce":"High","overtaking":"Normal","suspRigidity":"Medium","fuelCons":"Low","tyreWear":"High","grip":"Normal","blockPass":3.4758,"energy":null,"blockPassByLeague":{"Rookie":2.1824,"Amateur":3.8901,"Pro":4.3188,"Master":4.4151,"Elite":4.2586},"eliteQ1":54.068,"qTemp":6,"raceRef":"S60, R3"},
  "Kaunas": {"raceKm":264.1,"laps":80,"lapKm":3.301,"avgSpeed":186.66,"corners":10,"pitSec":11,"power":9,"handling":10,"accel":5,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Medium","fuelCons":"Medium","tyreWear":"High","grip":"Low","blockPass":2.525,"energy":null,"blockPassByLeague":{"Rookie":1.766,"Amateur":3.1151,"Pro":3.397,"Master":3.8031,"Elite":4.9425},"eliteQ1":62.816,"qTemp":14,"raceRef":"S44, R1"},
  "Kyalami": {"raceKm":306.8,"laps":72,"lapKm":4.261,"avgSpeed":235.6,"corners":14,"pitSec":15,"power":9,"handling":12,"accel":9,"downforce":"High","overtaking":"Hard","suspRigidity":"Hard","fuelCons":"Very Low","tyreWear":"Medium","grip":"Very Low","blockPass":2.7789,"energy":null,"blockPassByLeague":{"Rookie":2.1407,"Amateur":3.3389,"Pro":3.4913,"Master":3.6368,"Elite":4.9777},"eliteQ1":65.176,"qTemp":9,"raceRef":"S59, R7 WET"},
  "Laguna Seca": {"raceKm":284.5,"laps":79,"lapKm":3.601,"avgSpeed":183.62,"corners":11,"pitSec":16.7,"power":11,"handling":8,"accel":7,"downforce":"Medium","overtaking":"Easy","suspRigidity":"Soft","fuelCons":"Very High","tyreWear":"High","grip":"Very Low","blockPass":1.4027,"energy":null,"blockPassByLeague":{"Rookie":0.9136,"Amateur":1.8555,"Pro":2.0688,"Master":2.5436,"Elite":3.2851},"eliteQ1":70.781,"qTemp":null,"raceRef":"S43, R11"},
  "Las Vegas": {"raceKm":305.9,"laps":50,"lapKm":6.118,"avgSpeed":null,"corners":17,"pitSec":23,"power":12,"handling":11,"accel":20,"downforce":"Low","overtaking":"Easy","suspRigidity":"Medium","fuelCons":"High","tyreWear":"Medium","grip":"Low","blockPass":null,"energy":null,"blockPassByLeague":{"Rookie":null,"Amateur":null,"Pro":null,"Master":null,"Elite":null},"eliteQ1":93.517,"qTemp":null,"raceRef":"S96, R5"},
  "Losail": {"raceKm":306.7,"laps":57,"lapKm":5.381,"avgSpeed":235.94,"corners":16,"pitSec":24,"power":13,"handling":16,"accel":9,"downforce":"High","overtaking":"Hard","suspRigidity":"Soft","fuelCons":"Low","tyreWear":"Medium","grip":"High","blockPass":null,"energy":null,"blockPassByLeague":{"Rookie":null,"Amateur":null,"Pro":null,"Master":null,"Elite":null},"eliteQ1":82.23,"qTemp":null,"raceRef":"S95, R11"},
  "Magny Cours": {"raceKm":305.8,"laps":72,"lapKm":4.247,"avgSpeed":211.47,"corners":14,"pitSec":18,"power":12,"handling":8,"accel":11,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Medium","fuelCons":"Medium","tyreWear":"Medium","grip":"High","blockPass":2.7121,"energy":null,"blockPassByLeague":{"Rookie":1.9459,"Amateur":3.5645,"Pro":3.9412,"Master":4.1725,"Elite":5.884},"eliteQ1":72.748,"qTemp":28,"raceRef":"S60, R4"},
  "Melbourne": {"raceKm":307.6,"laps":58,"lapKm":5.303,"avgSpeed":221.86,"corners":17,"pitSec":16.5,"power":12,"handling":15,"accel":10,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Soft","fuelCons":"Medium","tyreWear":"Medium","grip":"Low","blockPass":2.5158,"energy":null,"blockPassByLeague":{"Rookie":1.8734,"Amateur":3.1902,"Pro":3.3819,"Master":3.8997,"Elite":4.6459},"eliteQ1":86.443,"qTemp":null,"raceRef":"S43, R1"},
  "Mexico City": {"raceKm":305,"laps":69,"lapKm":4.42,"avgSpeed":227.84,"corners":9,"pitSec":24,"power":13,"handling":12,"accel":7,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Soft","fuelCons":"Low","tyreWear":"Medium","grip":"Normal","blockPass":2.5091,"energy":null,"blockPassByLeague":{"Rookie":1.7672,"Amateur":3.0818,"Pro":3.5979,"Master":4.1456,"Elite":5.2613},"eliteQ1":70.18,"qTemp":null,"raceRef":"S14, R17"},
  "Miami": {"raceKm":308.4,"laps":57,"lapKm":5.411,"avgSpeed":231.24,"corners":19,"pitSec":17,"power":14,"handling":13,"accel":11,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Hard","fuelCons":"Low","tyreWear":"Low","grip":"High","blockPass":null,"energy":null,"blockPassByLeague":{"Rookie":null,"Amateur":null,"Pro":null,"Master":null,"Elite":null},"eliteQ1":85.418,"qTemp":null,"raceRef":"S93, R3"},
  "Monte Carlo": {"raceKm":262.8,"laps":78,"lapKm":3.369,"avgSpeed":157.19,"corners":19,"pitSec":18,"power":7,"handling":7,"accel":12,"downforce":"High","overtaking":"Very Hard","suspRigidity":"Medium","fuelCons":"Low","tyreWear":"Medium","grip":"Normal","blockPass":4.1566,"energy":null,"blockPassByLeague":{"Rookie":3.2305,"Amateur":5.1126,"Pro":5.7785,"Master":5.8971,"Elite":6.32},"eliteQ1":76.895,"qTemp":12,"raceRef":"S45, R8"},
  "Montreal": {"raceKm":305,"laps":69,"lapKm":4.42,"avgSpeed":214.41,"corners":12,"pitSec":16.5,"power":12,"handling":7,"accel":13,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Soft","fuelCons":"Medium","tyreWear":"Medium","grip":"Very Low","blockPass":1.8025,"energy":null,"blockPassByLeague":{"Rookie":1.2738,"Amateur":2.3036,"Pro":2.5564,"Master":3.1067,"Elite":4.1812},"eliteQ1":75.564,"qTemp":null,"raceRef":"S39, R2"},
  "Monza": {"raceKm":306.7,"laps":53,"lapKm":5.787,"avgSpeed":263.67,"corners":13,"pitSec":25.5,"power":17,"handling":12,"accel":9,"downforce":"Low","overtaking":"Easy","suspRigidity":"Medium","fuelCons":"Very High","tyreWear":"Medium","grip":"Very Low","blockPass":0.9798,"energy":null,"blockPassByLeague":{"Rookie":0.6976,"Amateur":1.2201,"Pro":1.4278,"Master":1.7533,"Elite":2.7189},"eliteQ1":79.872,"qTemp":12,"raceRef":"S43, R8"},
  "Mugello": {"raceKm":304.3,"laps":58,"lapKm":5.247,"avgSpeed":250.91,"corners":14,"pitSec":13.5,"power":11,"handling":13,"accel":12,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Medium","fuelCons":"Medium","tyreWear":"Medium","grip":"High","blockPass":2.486,"energy":null,"blockPassByLeague":{"Rookie":1.9575,"Amateur":2.8825,"Pro":3.1101,"Master":3.759,"Elite":4.5732},"eliteQ1":75.823,"qTemp":12,"raceRef":"S44, R13"},
  "New Delhi": {"raceKm":308.2,"laps":60,"lapKm":5.137,"avgSpeed":232.5,"corners":16,"pitSec":19,"power":11,"handling":15,"accel":10,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Soft","fuelCons":"Medium","tyreWear":"Very High","grip":"Very Low","blockPass":1.2944,"energy":null,"blockPassByLeague":{"Rookie":0.9751,"Amateur":1.523,"Pro":1.6514,"Master":2.1594,"Elite":2.6507},"eliteQ1":80.15,"qTemp":12,"raceRef":"S45, R17"},
  "Nurburgring": {"raceKm":308.7,"laps":60,"lapKm":5.145,"avgSpeed":228.07,"corners":16,"pitSec":15,"power":12,"handling":12,"accel":13,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Soft","fuelCons":"Very Low","tyreWear":"Low","grip":"Normal","blockPass":1.8861,"energy":null,"blockPassByLeague":{"Rookie":1.3524,"Amateur":2.4587,"Pro":2.8773,"Master":3.2701,"Elite":4.2615},"eliteQ1":82.453,"qTemp":null,"raceRef":"S15, R8"},
  "Oesterreichring": {"raceKm":308.9,"laps":52,"lapKm":5.94,"avgSpeed":271.2,"corners":11,"pitSec":21,"power":19,"handling":14,"accel":9,"downforce":"Medium","overtaking":"Easy","suspRigidity":"Medium","fuelCons":"High","tyreWear":"Medium","grip":"Low","blockPass":0.8698,"energy":null,"blockPassByLeague":{"Rookie":0.5676,"Amateur":1.0626,"Pro":1.3452,"Master":1.8826,"Elite":2.855},"eliteQ1":78.937,"qTemp":null,"raceRef":"S16, R6"},
  "Paul Ricard": {"raceKm":305,"laps":79,"lapKm":3.861,"avgSpeed":231.3,"corners":11,"pitSec":19.5,"power":9,"handling":11,"accel":8,"downforce":"Medium","overtaking":"Easy","suspRigidity":"Medium","fuelCons":"High","tyreWear":"Very High","grip":"Very High","blockPass":1.2203,"energy":null,"blockPassByLeague":{"Rookie":0.7919,"Amateur":1.6116,"Pro":1.8458,"Master":2.2381,"Elite":2.9994},"eliteQ1":60.681,"qTemp":22,"raceRef":"S54, R2"},
  "Portimao": {"raceKm":309.7,"laps":66,"lapKm":4.692,"avgSpeed":204.31,"corners":18,"pitSec":15.5,"power":9,"handling":14,"accel":11,"downforce":"High","overtaking":"Easy","suspRigidity":"Soft","fuelCons":"Medium","tyreWear":"High","grip":"Low","blockPass":1.1322,"energy":null,"blockPassByLeague":{"Rookie":0.7667,"Amateur":1.3399,"Pro":1.5763,"Master":2.1522,"Elite":2.6198},"eliteQ1":83.529,"qTemp":29,"raceRef":"S44, R16"},
  "Poznan": {"raceKm":306.2,"laps":75,"lapKm":4.083,"avgSpeed":220.33,"corners":14,"pitSec":14,"power":7,"handling":14,"accel":8,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Medium","fuelCons":"Low","tyreWear":"Medium","grip":"Normal","blockPass":2.5637,"energy":null,"blockPassByLeague":{"Rookie":2.1236,"Amateur":2.8697,"Pro":3.0851,"Master":3.4273,"Elite":4.701},"eliteQ1":67.011,"qTemp":18,"raceRef":"S68, R13"},
  "Rafaela Oval": {"raceKm":317.3,"laps":67,"lapKm":4.736,"avgSpeed":341.7,"corners":8,"pitSec":10,"power":18,"handling":10,"accel":6,"downforce":"Low","overtaking":"Very Easy","suspRigidity":"Medium","fuelCons":"Very High","tyreWear":"High","grip":"Normal","blockPass":0.1527,"energy":null,"blockPassByLeague":{"Rookie":0.125,"Amateur":0.1593,"Pro":0.1786,"Master":0.229,"Elite":0.2476},"eliteQ1":53.291,"qTemp":29,"raceRef":"S68, R2"},
  "Sakhir": {"raceKm":308.5,"laps":57,"lapKm":5.412,"avgSpeed":241.92,"corners":14,"pitSec":25.5,"power":16,"handling":11,"accel":9,"downforce":"Low","overtaking":"Normal","suspRigidity":"Soft","fuelCons":"Very High","tyreWear":"Medium","grip":"Very High","blockPass":1.5942,"energy":null,"blockPassByLeague":{"Rookie":1.0839,"Amateur":2.0302,"Pro":2.3374,"Master":2.9007,"Elite":3.8938},"eliteQ1":82.063,"qTemp":11,"raceRef":"S64, R1"},
  "Sepang": {"raceKm":310.4,"laps":55,"lapKm":5.644,"avgSpeed":220.14,"corners":17,"pitSec":24,"power":14,"handling":11,"accel":14,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Medium","fuelCons":"Medium","tyreWear":"Medium","grip":"Very High","blockPass":1.6115,"energy":null,"blockPassByLeague":{"Rookie":1.1413,"Amateur":2.0023,"Pro":2.2024,"Master":2.7908,"Elite":4.0554},"eliteQ1":93.239,"qTemp":null,"raceRef":"S14, R1"},
  "Serres": {"raceKm":254.9,"laps":80,"lapKm":3.186,"avgSpeed":201.82,"corners":16,"pitSec":12,"power":5,"handling":10,"accel":9,"downforce":"High","overtaking":"Hard","suspRigidity":"Medium","fuelCons":"Medium","tyreWear":"Medium","grip":"Normal","blockPass":3.8186,"energy":null,"blockPassByLeague":{"Rookie":3.1736,"Amateur":4.0474,"Pro":4.6049,"Master":4.8617,"Elite":4.309},"eliteQ1":56.403,"qTemp":19,"raceRef":"S44, R5"},
  "Shanghai": {"raceKm":305.2,"laps":56,"lapKm":5.45,"avgSpeed":221.9,"corners":10,"pitSec":24,"power":9,"handling":16,"accel":15,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Soft","fuelCons":"Very High","tyreWear":"Medium","grip":"High","blockPass":1.2089,"energy":null,"blockPassByLeague":{"Rookie":0.8453,"Amateur":1.4924,"Pro":1.7505,"Master":2.2835,"Elite":3.3067},"eliteQ1":90.233,"qTemp":33,"raceRef":"S56, R1"},
  "Silverstone": {"raceKm":306.3,"laps":52,"lapKm":5.89,"avgSpeed":266.09,"corners":18,"pitSec":24.5,"power":11,"handling":12,"accel":16,"downforce":"Meduim","overtaking":"Normal","suspRigidity":"Medium","fuelCons":"High","tyreWear":"Low","grip":"Normal","blockPass":1.5246,"energy":null,"blockPassByLeague":{"Rookie":1.1163,"Amateur":1.8717,"Pro":2.1676,"Master":2.7732,"Elite":3.1931},"eliteQ1":81.737,"qTemp":null,"raceRef":"S14, R11"},
  "Singapore": {"raceKm":309.1,"laps":61,"lapKm":5.067,"avgSpeed":218.72,"corners":23,"pitSec":17,"power":7,"handling":11,"accel":17,"downforce":"High","overtaking":"Hard","suspRigidity":"Hard","fuelCons":"Medium","tyreWear":"High","grip":"Low","blockPass":2.3918,"energy":null,"blockPassByLeague":{"Rookie":1.8322,"Amateur":2.8813,"Pro":3.0542,"Master":3.6942,"Elite":4.9773},"eliteQ1":84.297,"qTemp":10,"raceRef":"S52, R8"},
  "Slovakiaring": {"raceKm":313.9,"laps":53,"lapKm":5.923,"avgSpeed":225.97,"corners":14,"pitSec":19.5,"power":17,"handling":10,"accel":15,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Medium","fuelCons":"High","tyreWear":"High","grip":"High","blockPass":1.8724,"energy":null,"blockPassByLeague":{"Rookie":1.2286,"Amateur":2.31,"Pro":2.5588,"Master":3.0225,"Elite":3.4693},"eliteQ1":95.794,"qTemp":null,"raceRef":"S56, R17"},
  "Sochi": {"raceKm":310.1,"laps":53,"lapKm":5.851,"avgSpeed":209.09,"corners":19,"pitSec":23,"power":8,"handling":15,"accel":18,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Medium","fuelCons":"Low","tyreWear":"High","grip":"Normal","blockPass":2.187,"energy":null,"blockPassByLeague":{"Rookie":1.6861,"Amateur":2.3503,"Pro":2.6092,"Master":3.1955,"Elite":2.8443},"eliteQ1":102.045,"qTemp":23,"raceRef":"S45, R2"},
  "Spa": {"raceKm":306.6,"laps":44,"lapKm":6.968,"avgSpeed":241.1,"corners":22,"pitSec":13.5,"power":18,"handling":16,"accel":13,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Medium","fuelCons":"High","tyreWear":"Medium","grip":"Normal","blockPass":1.3786,"energy":null,"blockPassByLeague":{"Rookie":1.0258,"Amateur":1.7489,"Pro":1.8794,"Master":2.3704,"Elite":3.0431},"eliteQ1":105.213,"qTemp":null,"raceRef":"S14, R9"},
  "Suzuka": {"raceKm":310.6,"laps":53,"lapKm":5.86,"avgSpeed":236.83,"corners":14,"pitSec":15,"power":11,"handling":18,"accel":13,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Medium","fuelCons":"Medium","tyreWear":"Medium","grip":"Very High","blockPass":2.5821,"energy":null,"blockPassByLeague":{"Rookie":1.966,"Amateur":3.195,"Pro":3.4345,"Master":4.362,"Elite":4.9937},"eliteQ1":90.112,"qTemp":12,"raceRef":"S40, R1"},
  "Valencia": {"raceKm":310.1,"laps":57,"lapKm":5.44,"avgSpeed":217.26,"corners":25,"pitSec":14.5,"power":11,"handling":12,"accel":16,"downforce":"High","overtaking":"Hard","suspRigidity":"Medium","fuelCons":"Medium","tyreWear":"Medium","grip":"Low","blockPass":2.6716,"energy":null,"blockPassByLeague":{"Rookie":1.9823,"Amateur":3.3515,"Pro":3.6388,"Master":4.0586,"Elite":5.3052},"eliteQ1":91.184,"qTemp":null,"raceRef":"S39, R12"},
  "Yas Marina": {"raceKm":305.5,"laps":55,"lapKm":5.555,"avgSpeed":218.8,"corners":21,"pitSec":18.5,"power":12,"handling":10,"accel":17,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Medium","fuelCons":"Low","tyreWear":"Medium","grip":"High","blockPass":2.0586,"energy":null,"blockPassByLeague":{"Rookie":1.5843,"Amateur":2.4403,"Pro":2.6495,"Master":3.2398,"Elite":4.366},"eliteQ1":92.699,"qTemp":9,"raceRef":"S45, R1"},
  "Yeongam": {"raceKm":309.2,"laps":55,"lapKm":5.622,"avgSpeed":216.75,"corners":18,"pitSec":23.5,"power":11,"handling":15,"accel":13,"downforce":"High","overtaking":"Normal","suspRigidity":"Medium","fuelCons":"Medium","tyreWear":"High","grip":"Normal","blockPass":1.413,"energy":null,"blockPassByLeague":{"Rookie":1.0585,"Amateur":1.6362,"Pro":1.7867,"Master":2.3437,"Elite":2.616},"eliteQ1":94.438,"qTemp":null,"raceRef":"S37, R12"},
  "Zandvoort": {"raceKm":301.8,"laps":71,"lapKm":4.251,"avgSpeed":235.49,"corners":14,"pitSec":22.5,"power":9,"handling":13,"accel":9,"downforce":"Medium","overtaking":"Normal","suspRigidity":"Hard","fuelCons":"Low","tyreWear":"Medium","grip":"High","blockPass":1.7871,"energy":null,"blockPassByLeague":{"Rookie":1.2923,"Amateur":2.2422,"Pro":2.5443,"Master":2.9091,"Elite":3.1103},"eliteQ1":64.807,"qTemp":35,"raceRef":"S51, R10"},
  "Zolder": {"raceKm":298.3,"laps":70,"lapKm":4.261,"avgSpeed":227.91,"corners":17,"pitSec":19.5,"power":11,"handling":9,"accel":10,"downforce":"Medium","overtaking":"Hard","suspRigidity":"Medium","fuelCons":"Low","tyreWear":"Medium","grip":"Low","blockPass":2.4469,"energy":null,"blockPassByLeague":{"Rookie":1.8623,"Amateur":2.9429,"Pro":3.2872,"Master":3.9031,"Elite":4.6603},"eliteQ1":68.009,"qTemp":13,"raceRef":"S62, R16"},
  },
  trackHistoryRisk: {
  "Adelaide": {"Race Analysis":{"total":1915,"rookie":278,"amateur":1185,"pro":402,"master":47,"elite":3},"Pre-Race update":{"total":60,"rookie":27,"amateur":25,"pro":7,"master":1,"elite":0},"Keep on track":{"rookie":0.1705,"amateur":0.057,"pro":0.0342,"master":0.0417,"elite":0},"Push a little":{"rookie":0.2754,"amateur":0.1992,"pro":0.1491,"master":0.1042,"elite":0},"Push a lot":{"rookie":0.3016,"amateur":0.3653,"pro":0.3888,"master":0.4375,"elite":0.3333},"Push to limit":{"rookie":0.2525,"amateur":0.3785,"pro":0.4279,"master":0.4167,"elite":0.6667},"DM (sec)":{"rookie":0.684,"amateur":0.344,"pro":0.16,"master":0.144,"elite":0.065},"OT":{"rookie":21.43,"amateur":28.36,"pro":25.98,"master":20.41,"elite":20},"DF":{"rookie":23.46,"amateur":30.88,"pro":32.44,"master":30.92,"elite":20},"CT (dry)":{"rookie":18.91,"amateur":29.97,"pro":49.62,"master":57.08,"elite":100},"CT (malf)":{"rookie":8.01,"amateur":11.7,"pro":22.24,"master":32.13,"elite":100},"CTd >50":{"rookie":0.0504,"amateur":0.2253,"pro":0.4478,"master":0.5106,"elite":0.6667},"1 stop":{"rookie":0.2518,"amateur":0.2987,"pro":0.3682,"master":0.2766,"elite":0.3333},"2 stops":{"rookie":0.3381,"amateur":0.3966,"pro":0.3831,"master":0.4681,"elite":0.3333},"3 stops":{"rookie":0.2122,"amateur":0.1612,"pro":0.1468,"master":0.1489,"elite":0.3333},"4 stops":{"rookie":0.1475,"amateur":0.1122,"pro":0.0896,"master":0.1064,"elite":0},"5 stops":{"rookie":0.0216,"amateur":0.0253,"pro":0.01,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.54,"amateur":1.47,"pro":1.96,"master":1.87,"elite":1}},
  "Ahvenisto": {"Race Analysis":{"total":1956,"rookie":288,"amateur":1201,"pro":416,"master":48,"elite":3},"Pre-Race update":{"total":62,"rookie":21,"amateur":33,"pro":4,"master":4,"elite":0},"Keep on track":{"rookie":0.1165,"amateur":0.0551,"pro":0.0286,"master":0,"elite":0},"Push a little":{"rookie":0.2298,"amateur":0.1945,"pro":0.1024,"master":0.0577,"elite":0},"Push a lot":{"rookie":0.4078,"amateur":0.3428,"pro":0.419,"master":0.4808,"elite":0.3333},"Push to limit":{"rookie":0.246,"amateur":0.4076,"pro":0.45,"master":0.4615,"elite":0.6667},"DM (sec)":{"rookie":0.738,"amateur":0.397,"pro":0.172,"master":0.107,"elite":0.221},"OT":{"rookie":23.78,"amateur":29.89,"pro":29.89,"master":21.75,"elite":12.33},"DF":{"rookie":24.8,"amateur":29.82,"pro":32.16,"master":35.54,"elite":13},"CT (dry)":{"rookie":20.77,"amateur":31.88,"pro":49.1,"master":55.29,"elite":64.67},"CT (malf)":{"rookie":9.62,"amateur":13.05,"pro":18.91,"master":30.44,"elite":36.33},"CTd >50":{"rookie":0.0625,"amateur":0.2673,"pro":0.5288,"master":0.625,"elite":0.6667},"1 stop":{"rookie":0.2188,"amateur":0.2839,"pro":0.274,"master":0.4583,"elite":0.3333},"2 stops":{"rookie":0.5104,"amateur":0.5462,"pro":0.5745,"master":0.4167,"elite":0.6667},"3 stops":{"rookie":0.1875,"amateur":0.1482,"pro":0.137,"master":0.125,"elite":0},"4 stops":{"rookie":0.0313,"amateur":0.015,"pro":0.012,"master":0,"elite":0},"5 stops":{"rookie":0.0313,"amateur":0.0042,"pro":0.0024,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.43,"amateur":1.18,"pro":1.65,"master":1.21,"elite":0.33}},
  "Austin": {"Race Analysis":{"total":1487,"rookie":206,"amateur":931,"pro":313,"master":31,"elite":6},"Pre-Race update":{"total":47,"rookie":18,"amateur":14,"pro":13,"master":1,"elite":1},"Keep on track":{"rookie":0.1205,"amateur":0.0434,"pro":0.0061,"master":0,"elite":0},"Push a little":{"rookie":0.2679,"amateur":0.1767,"pro":0.0982,"master":0,"elite":0},"Push a lot":{"rookie":0.2902,"amateur":0.3376,"pro":0.411,"master":0.4688,"elite":0.2857},"Push to limit":{"rookie":0.3214,"amateur":0.4423,"pro":0.4847,"master":0.5313,"elite":0.7143},"DM (sec)":{"rookie":0.677,"amateur":0.295,"pro":0.12,"master":0.05,"elite":0.067},"OT":{"rookie":21.86,"amateur":31.58,"pro":29.81,"master":24.16,"elite":36.67},"DF":{"rookie":20.63,"amateur":28.93,"pro":29.59,"master":40.84,"elite":37.5},"CT (dry)":{"rookie":19.82,"amateur":31.31,"pro":49.02,"master":46.61,"elite":84.67},"CT (malf)":{"rookie":9.58,"amateur":11.89,"pro":21.9,"master":20.1,"elite":65.5},"CTd >50":{"rookie":0.0485,"amateur":0.2245,"pro":0.4984,"master":0.5161,"elite":1},"1 stop":{"rookie":0.034,"amateur":0.0333,"pro":0.0511,"master":0,"elite":0},"2 stops":{"rookie":0.4272,"amateur":0.4425,"pro":0.5623,"master":0.8065,"elite":0.5},"3 stops":{"rookie":0.4417,"amateur":0.4479,"pro":0.3514,"master":0.1613,"elite":0.1667},"4 stops":{"rookie":0.0485,"amateur":0.0602,"pro":0.0319,"master":0.0323,"elite":0.3333},"5 stops":{"rookie":0.0146,"amateur":0.0043,"pro":0.0032,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.49,"amateur":1.05,"pro":1.12,"master":0.9,"elite":1}},
  "Avus": {"Race Analysis":{"total":673,"rookie":81,"amateur":418,"pro":151,"master":18,"elite":5},"Pre-Race update":{"total":19,"rookie":8,"amateur":9,"pro":2,"master":0,"elite":0},"Keep on track":{"rookie":0.1124,"amateur":0.0422,"pro":0.0196,"master":0,"elite":0},"Push a little":{"rookie":0.2472,"amateur":0.1827,"pro":0.085,"master":0,"elite":0},"Push a lot":{"rookie":0.3708,"amateur":0.37,"pro":0.4902,"master":0.4444,"elite":0.2},"Push to limit":{"rookie":0.2697,"amateur":0.4052,"pro":0.4052,"master":0.5556,"elite":0.8},"DM (sec)":{"rookie":0.46,"amateur":0.345,"pro":0.188,"master":0.182,"elite":0.043},"OT":{"rookie":22.94,"amateur":27.83,"pro":25.79,"master":18,"elite":30},"DF":{"rookie":25.32,"amateur":26.31,"pro":25.95,"master":32.33,"elite":34},"CT (dry)":{"rookie":17.51,"amateur":20.51,"pro":33.28,"master":41.39,"elite":80},"CT (malf)":{"rookie":7.33,"amateur":10.57,"pro":16.35,"master":22.56,"elite":75},"CTd >50":{"rookie":0.0617,"amateur":0.1029,"pro":0.298,"master":0.4444,"elite":0.8},"1 stop":{"rookie":0.284,"amateur":0.4689,"pro":0.4106,"master":0.5,"elite":0.6},"2 stops":{"rookie":0.4938,"amateur":0.4402,"pro":0.5364,"master":0.5,"elite":0.4},"3 stops":{"rookie":0.1852,"amateur":0.0789,"pro":0.0397,"master":0,"elite":0},"4 stops":{"rookie":0,"amateur":0.0048,"pro":0.0066,"master":0,"elite":0},"5 stops":{"rookie":0.0123,"amateur":0,"pro":0,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.51,"amateur":1.17,"pro":1.68,"master":1.17,"elite":0.8}},
  "Baku City": {"Race Analysis":{"total":1546,"rookie":149,"amateur":979,"pro":361,"master":54,"elite":3},"Pre-Race update":{"total":41,"rookie":14,"amateur":18,"pro":6,"master":3,"elite":0},"Keep on track":{"rookie":0.135,"amateur":0.0562,"pro":0.0136,"master":0,"elite":0},"Push a little":{"rookie":0.2577,"amateur":0.1655,"pro":0.0845,"master":0.0351,"elite":0},"Push a lot":{"rookie":0.3436,"amateur":0.343,"pro":0.4142,"master":0.2456,"elite":0},"Push to limit":{"rookie":0.2638,"amateur":0.4353,"pro":0.4877,"master":0.7193,"elite":1},"DM (sec)":{"rookie":0.631,"amateur":0.283,"pro":0.106,"master":0.068,"elite":0},"OT":{"rookie":24.56,"amateur":28.36,"pro":29.45,"master":24.26,"elite":10},"DF":{"rookie":23.57,"amateur":26.03,"pro":29.7,"master":41.07,"elite":13.33},"CT (dry)":{"rookie":17,"amateur":22.03,"pro":36.06,"master":53.91,"elite":57},"CT (malf)":{"rookie":8.28,"amateur":10.48,"pro":16.88,"master":28.59,"elite":37},"CTd >50":{"rookie":0.0403,"amateur":0.1267,"pro":0.3629,"master":0.6667,"elite":0.6667},"1 stop":{"rookie":0.0201,"amateur":0.0082,"pro":0.0332,"master":0.0556,"elite":0},"2 stops":{"rookie":0.3826,"amateur":0.4065,"pro":0.3352,"master":0.4259,"elite":0.3333},"3 stops":{"rookie":0.3221,"amateur":0.4423,"pro":0.5983,"master":0.5,"elite":0.6667},"4 stops":{"rookie":0.1745,"amateur":0.1134,"pro":0.0249,"master":0,"elite":0},"5 stops":{"rookie":0.0403,"amateur":0.0143,"pro":0.0083,"master":0.0185,"elite":0},"Driver Mistake (avg)":{"rookie":0.34,"amateur":0.92,"pro":1.07,"master":0.83,"elite":0.33}},
  "Brands Hatch": {"Race Analysis":{"total":1858,"rookie":269,"amateur":1126,"pro":417,"master":41,"elite":5},"Pre-Race update":{"total":71,"rookie":31,"amateur":27,"pro":10,"master":3,"elite":0},"Keep on track":{"rookie":0.1867,"amateur":0.0564,"pro":0.0328,"master":0,"elite":0},"Push a little":{"rookie":0.2567,"amateur":0.2108,"pro":0.0984,"master":0.0909,"elite":0},"Push a lot":{"rookie":0.3133,"amateur":0.3495,"pro":0.4122,"master":0.4318,"elite":0.2},"Push to limit":{"rookie":0.2433,"amateur":0.3833,"pro":0.4567,"master":0.4773,"elite":0.8},"DM (sec)":{"rookie":0.613,"amateur":0.35,"pro":0.159,"master":0.104,"elite":0.069},"OT":{"rookie":23.18,"amateur":28.53,"pro":28.54,"master":27.47,"elite":22.25},"DF":{"rookie":24.77,"amateur":28.56,"pro":33.4,"master":44.47,"elite":15.5},"CT (dry)":{"rookie":19.08,"amateur":28.57,"pro":44.6,"master":44.56,"elite":49.25},"CT (malf)":{"rookie":8.1,"amateur":11.06,"pro":19.37,"master":21.91,"elite":33.75},"CTd >50":{"rookie":0.0372,"amateur":0.1794,"pro":0.3885,"master":0.3659,"elite":0.4},"1 stop":{"rookie":0.3123,"amateur":0.3135,"pro":0.2878,"master":0.3415,"elite":0.2},"2 stops":{"rookie":0.316,"amateur":0.4023,"pro":0.4532,"master":0.3902,"elite":0.6},"3 stops":{"rookie":0.2119,"amateur":0.1741,"pro":0.2014,"master":0.2195,"elite":0.2},"4 stops":{"rookie":0.1301,"amateur":0.0879,"pro":0.0504,"master":0.0488,"elite":0},"5 stops":{"rookie":0.0112,"amateur":0.0115,"pro":0.0024,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.55,"amateur":1.31,"pro":1.69,"master":1.37,"elite":1.2}},
  "Brasilia": {"Race Analysis":{"total":2072,"rookie":259,"amateur":1269,"pro":487,"master":51,"elite":6},"Pre-Race update":{"total":319,"rookie":65,"amateur":177,"pro":71,"master":5,"elite":1},"Keep on track":{"rookie":0.0996,"amateur":0.0518,"pro":0.0161,"master":0.0185,"elite":0},"Push a little":{"rookie":0.274,"amateur":0.1802,"pro":0.0726,"master":0.0185,"elite":0},"Push a lot":{"rookie":0.3665,"amateur":0.3465,"pro":0.4355,"master":0.3889,"elite":0.5},"Push to limit":{"rookie":0.2598,"amateur":0.4215,"pro":0.4758,"master":0.5741,"elite":0.5},"DM (sec)":{"rookie":0.601,"amateur":0.343,"pro":0.162,"master":0.109,"elite":0.226},"OT":{"rookie":21.85,"amateur":25.96,"pro":27.12,"master":22.88,"elite":22.17},"DF":{"rookie":22.49,"amateur":29.29,"pro":31.63,"master":44.96,"elite":38.5},"CT (dry)":{"rookie":19.58,"amateur":23.55,"pro":40.59,"master":48.94,"elite":40.33},"CT (malf)":{"rookie":7.36,"amateur":10.99,"pro":18.12,"master":32.45,"elite":35.83},"CTd >50":{"rookie":0.0811,"amateur":0.1379,"pro":0.3922,"master":0.549,"elite":0.5},"1 stop":{"rookie":0.1236,"amateur":0.1978,"pro":0.1643,"master":0.1961,"elite":0.5},"2 stops":{"rookie":0.5753,"amateur":0.6281,"pro":0.7105,"master":0.6471,"elite":0.5},"3 stops":{"rookie":0.1969,"amateur":0.1466,"pro":0.115,"master":0.1569,"elite":0},"4 stops":{"rookie":0.0618,"amateur":0.0189,"pro":0.0082,"master":0,"elite":0},"5 stops":{"rookie":0.0116,"amateur":0.0024,"pro":0,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.35,"amateur":0.76,"pro":1,"master":0.76,"elite":0.33}},
  "Bremgarten": {"Race Analysis":{"total":1642,"rookie":196,"amateur":977,"pro":411,"master":53,"elite":5},"Pre-Race update":{"total":62,"rookie":20,"amateur":35,"pro":6,"master":1,"elite":0},"Keep on track":{"rookie":0.1667,"amateur":0.0879,"pro":0.0312,"master":0,"elite":0},"Push a little":{"rookie":0.3472,"amateur":0.2381,"pro":0.1367,"master":0.0741,"elite":0},"Push a lot":{"rookie":0.2361,"amateur":0.3567,"pro":0.4484,"master":0.3704,"elite":0.4},"Push to limit":{"rookie":0.25,"amateur":0.3172,"pro":0.3837,"master":0.5556,"elite":0.6},"DM (sec)":{"rookie":0.829,"amateur":0.384,"pro":0.173,"master":0.075,"elite":0.044},"OT":{"rookie":20.88,"amateur":26.53,"pro":26.26,"master":18.26,"elite":37.6},"DF":{"rookie":19.8,"amateur":25.87,"pro":28.29,"master":39.38,"elite":39.8},"CT (dry)":{"rookie":15.44,"amateur":21.45,"pro":34.84,"master":40.36,"elite":74},"CT (malf)":{"rookie":5.63,"amateur":10.84,"pro":15.6,"master":19.08,"elite":50.8},"CTd >50":{"rookie":0.0255,"amateur":0.0901,"pro":0.3139,"master":0.5094,"elite":0.8},"1 stop":{"rookie":0.1224,"amateur":0.1648,"pro":0.1776,"master":0.1698,"elite":0.2},"2 stops":{"rookie":0.3878,"amateur":0.435,"pro":0.5085,"master":0.5472,"elite":0.4},"3 stops":{"rookie":0.25,"amateur":0.1771,"pro":0.146,"master":0.0755,"elite":0.2},"4 stops":{"rookie":0.0969,"amateur":0.1003,"pro":0.0754,"master":0.0755,"elite":0},"5 stops":{"rookie":0.1276,"amateur":0.1126,"pro":0.0827,"master":0.1132,"elite":0.2},"Driver Mistake (avg)":{"rookie":0.36,"amateur":0.85,"pro":1.04,"master":0.72,"elite":0.8}},
  "Brno": {"Race Analysis":{"total":998,"rookie":123,"amateur":646,"pro":205,"master":22,"elite":2},"Pre-Race update":{"total":28,"rookie":4,"amateur":16,"pro":8,"master":0,"elite":0},"Keep on track":{"rookie":0.2283,"amateur":0.071,"pro":0.0282,"master":0,"elite":0},"Push a little":{"rookie":0.2598,"amateur":0.1798,"pro":0.1221,"master":0.0909,"elite":0},"Push a lot":{"rookie":0.2677,"amateur":0.3595,"pro":0.4178,"master":0.5,"elite":0},"Push to limit":{"rookie":0.2441,"amateur":0.3897,"pro":0.4319,"master":0.4091,"elite":1},"DM (sec)":{"rookie":0.671,"amateur":0.388,"pro":0.152,"master":0.065,"elite":0.042},"OT":{"rookie":22.47,"amateur":31.41,"pro":31.99,"master":22.91,"elite":30},"DF":{"rookie":27.07,"amateur":29.48,"pro":30.89,"master":34.36,"elite":10},"CT (dry)":{"rookie":19.23,"amateur":30.66,"pro":44.81,"master":53.64,"elite":1},"CT (malf)":{"rookie":11.26,"amateur":12.34,"pro":20.94,"master":44.55,"elite":1},"CTd >50":{"rookie":0.0488,"amateur":0.1997,"pro":0.3561,"master":0.3636,"elite":0},"1 stop":{"rookie":0.2114,"amateur":0.1827,"pro":0.1415,"master":0.3636,"elite":0},"2 stops":{"rookie":0.374,"amateur":0.469,"pro":0.4341,"master":0.3182,"elite":1},"3 stops":{"rookie":0.2683,"amateur":0.2647,"pro":0.3512,"master":0.3182,"elite":0},"4 stops":{"rookie":0.0976,"amateur":0.0604,"pro":0.0634,"master":0,"elite":0},"5 stops":{"rookie":0,"amateur":0.0108,"pro":0,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.46,"amateur":1.09,"pro":1.47,"master":1.18,"elite":1.5}},
  "Bucharest Ring": {"Race Analysis":{"total":1189,"rookie":153,"amateur":730,"pro":270,"master":32,"elite":4},"Pre-Race update":{"total":59,"rookie":20,"amateur":29,"pro":10,"master":0,"elite":0},"Keep on track":{"rookie":0.0983,"amateur":0.0501,"pro":0.0107,"master":0,"elite":0},"Push a little":{"rookie":0.3468,"amateur":0.1726,"pro":0.0536,"master":0.0313,"elite":0},"Push a lot":{"rookie":0.3179,"amateur":0.332,"pro":0.375,"master":0.2813,"elite":0.5},"Push to limit":{"rookie":0.237,"amateur":0.4453,"pro":0.5607,"master":0.6875,"elite":0.5},"DM (sec)":{"rookie":0.493,"amateur":0.253,"pro":0.122,"master":0.059,"elite":0.113},"OT":{"rookie":22.21,"amateur":32.1,"pro":31.58,"master":25.47,"elite":14.75},"DF":{"rookie":22.02,"amateur":30.21,"pro":31.47,"master":30.19,"elite":26.75},"CT (dry)":{"rookie":17.44,"amateur":30.92,"pro":45.06,"master":61.53,"elite":31.25},"CT (malf)":{"rookie":6.17,"amateur":12.2,"pro":17.06,"master":33.75,"elite":23.25},"CTd >50":{"rookie":0.0327,"amateur":0.2644,"pro":0.4852,"master":0.6875,"elite":0.25},"1 stop":{"rookie":0.3529,"amateur":0.4205,"pro":0.5148,"master":0.4688,"elite":0.5},"2 stops":{"rookie":0.451,"amateur":0.3918,"pro":0.337,"master":0.4063,"elite":0.5},"3 stops":{"rookie":0.085,"amateur":0.0575,"pro":0.0667,"master":0.0938,"elite":0},"4 stops":{"rookie":0.098,"amateur":0.1068,"pro":0.0741,"master":0.0313,"elite":0},"5 stops":{"rookie":0,"amateur":0.0192,"pro":0.0037,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.48,"amateur":1.56,"pro":1.81,"master":1.56,"elite":0}},
  "Buenos Aires": {"Race Analysis":{"total":1405,"rookie":181,"amateur":848,"pro":331,"master":43,"elite":2},"Pre-Race update":{"total":47,"rookie":19,"amateur":15,"pro":9,"master":4,"elite":0},"Keep on track":{"rookie":0.14,"amateur":0.0313,"pro":0.0176,"master":0,"elite":0},"Push a little":{"rookie":0.255,"amateur":0.1866,"pro":0.0765,"master":0.0213,"elite":0},"Push a lot":{"rookie":0.33,"amateur":0.3615,"pro":0.3882,"master":0.3191,"elite":0.5},"Push to limit":{"rookie":0.275,"amateur":0.4206,"pro":0.5176,"master":0.6596,"elite":0.5},"DM (sec)":{"rookie":0.525,"amateur":0.271,"pro":0.11,"master":0.122,"elite":0},"OT":{"rookie":19.22,"amateur":25.57,"pro":23.42,"master":17.84,"elite":22.5},"DF":{"rookie":20.51,"amateur":29.72,"pro":32.15,"master":37.4,"elite":33},"CT (dry)":{"rookie":15.12,"amateur":23.09,"pro":36.73,"master":47.79,"elite":78},"CT (malf)":{"rookie":4.57,"amateur":10.03,"pro":15.05,"master":25.49,"elite":60},"CTd >50":{"rookie":0.0331,"amateur":0.1462,"pro":0.3384,"master":0.5349,"elite":1},"1 stop":{"rookie":0.0552,"amateur":0.1733,"pro":0.1903,"master":0.2093,"elite":0.5},"2 stops":{"rookie":0.5028,"amateur":0.5436,"pro":0.4864,"master":0.4884,"elite":0},"3 stops":{"rookie":0.1492,"amateur":0.1274,"pro":0.1631,"master":0.2326,"elite":0},"4 stops":{"rookie":0.1657,"amateur":0.0991,"pro":0.1088,"master":0.0465,"elite":0},"5 stops":{"rookie":0.0939,"amateur":0.0436,"pro":0.0483,"master":0,"elite":0.5},"Driver Mistake (avg)":{"rookie":0.46,"amateur":1.18,"pro":1.56,"master":1.12,"elite":1.5}},
  "Fiorano": {"Race Analysis":{"total":1169,"rookie":173,"amateur":698,"pro":266,"master":29,"elite":3},"Pre-Race update":{"total":35,"rookie":9,"amateur":18,"pro":7,"master":1,"elite":0},"Keep on track":{"rookie":0.2033,"amateur":0.0838,"pro":0.033,"master":0,"elite":0},"Push a little":{"rookie":0.2747,"amateur":0.2235,"pro":0.1538,"master":0.0333,"elite":0},"Push a lot":{"rookie":0.2912,"amateur":0.3059,"pro":0.3993,"master":0.4,"elite":0.3333},"Push to limit":{"rookie":0.2308,"amateur":0.3869,"pro":0.4139,"master":0.5667,"elite":0.6667},"DM (sec)":{"rookie":0.605,"amateur":0.351,"pro":0.128,"master":0.054,"elite":0.027},"OT":{"rookie":20.84,"amateur":30.5,"pro":27.71,"master":24.31,"elite":38},"DF":{"rookie":20.75,"amateur":30.98,"pro":32,"master":25.28,"elite":31.33},"CT (dry)":{"rookie":16.87,"amateur":30.09,"pro":42.32,"master":46.9,"elite":49.67},"CT (malf)":{"rookie":9.02,"amateur":12.08,"pro":14.92,"master":30.66,"elite":50.33},"CTd >50":{"rookie":0.0578,"amateur":0.2335,"pro":0.4398,"master":0.4828,"elite":0.6667},"1 stop":{"rookie":0.2254,"amateur":0.3295,"pro":0.3083,"master":0.3103,"elite":0.6667},"2 stops":{"rookie":0.4277,"amateur":0.4026,"pro":0.4549,"master":0.3793,"elite":0},"3 stops":{"rookie":0.1214,"amateur":0.0802,"pro":0.0714,"master":0.1379,"elite":0},"4 stops":{"rookie":0.1098,"amateur":0.0731,"pro":0.0865,"master":0,"elite":0},"5 stops":{"rookie":0.1098,"amateur":0.1074,"pro":0.0752,"master":0.1724,"elite":0.3333},"Driver Mistake (avg)":{"rookie":0.49,"amateur":1.61,"pro":1.79,"master":1.86,"elite":1.67}},
  "Grobnik": {"Race Analysis":{"total":1084,"rookie":131,"amateur":672,"pro":252,"master":28,"elite":1},"Pre-Race update":{"total":43,"rookie":18,"amateur":23,"pro":1,"master":1,"elite":0},"Keep on track":{"rookie":0.1544,"amateur":0.0633,"pro":0.0277,"master":0,"elite":0},"Push a little":{"rookie":0.255,"amateur":0.1827,"pro":0.0632,"master":0.0345,"elite":0},"Push a lot":{"rookie":0.3289,"amateur":0.3324,"pro":0.4348,"master":0.3793,"elite":0},"Push to limit":{"rookie":0.2617,"amateur":0.4216,"pro":0.4743,"master":0.5862,"elite":1},"DM (sec)":{"rookie":0.532,"amateur":0.259,"pro":0.115,"master":0.065,"elite":0.021},"OT":{"rookie":20.63,"amateur":25.43,"pro":25.04,"master":21.79,"elite":21},"DF":{"rookie":21.17,"amateur":27.24,"pro":30.88,"master":37.29,"elite":7},"CT (dry)":{"rookie":15.73,"amateur":20.52,"pro":33.05,"master":51.75,"elite":87},"CT (malf)":{"rookie":8.49,"amateur":9.76,"pro":15.79,"master":21.32,"elite":80},"CTd >50":{"rookie":0.0382,"amateur":0.0863,"pro":0.2976,"master":0.6786,"elite":1},"1 stop":{"rookie":0.0153,"amateur":0.0491,"pro":0.0873,"master":0.1786,"elite":0},"2 stops":{"rookie":0.5649,"amateur":0.6592,"pro":0.5833,"master":0.3571,"elite":1},"3 stops":{"rookie":0.1985,"amateur":0.183,"pro":0.2302,"master":0.2857,"elite":0},"4 stops":{"rookie":0.145,"amateur":0.0833,"pro":0.0794,"master":0.1786,"elite":0},"5 stops":{"rookie":0.0305,"amateur":0.0164,"pro":0.0119,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.36,"amateur":1.03,"pro":1.2,"master":0.75,"elite":0}},
  "Indianapolis": {"Race Analysis":{"total":1244,"rookie":172,"amateur":755,"pro":280,"master":33,"elite":4},"Pre-Race update":{"total":59,"rookie":18,"amateur":27,"pro":11,"master":3,"elite":0},"Keep on track":{"rookie":0.1263,"amateur":0.0652,"pro":0.0172,"master":0,"elite":0},"Push a little":{"rookie":0.3105,"amateur":0.1765,"pro":0.0859,"master":0.0278,"elite":0},"Push a lot":{"rookie":0.3368,"amateur":0.3274,"pro":0.433,"master":0.4722,"elite":0.5},"Push to limit":{"rookie":0.2263,"amateur":0.4309,"pro":0.4639,"master":0.5,"elite":0.5},"DM (sec)":{"rookie":0.64,"amateur":0.311,"pro":0.15,"master":0.133,"elite":0},"OT":{"rookie":22.52,"amateur":28.44,"pro":27.61,"master":19.67,"elite":14},"DF":{"rookie":22.72,"amateur":27.28,"pro":29.23,"master":38.21,"elite":2},"CT (dry)":{"rookie":18.14,"amateur":25.57,"pro":38.31,"master":55.79,"elite":33},"CT (malf)":{"rookie":7.16,"amateur":11.08,"pro":15.59,"master":35,"elite":57.5},"CTd >50":{"rookie":0.0465,"amateur":0.1338,"pro":0.2929,"master":0.4848,"elite":0.25},"1 stop":{"rookie":0.2616,"amateur":0.3907,"pro":0.325,"master":0.303,"elite":0.5},"2 stops":{"rookie":0.3314,"amateur":0.3311,"pro":0.4179,"master":0.4545,"elite":0.25},"3 stops":{"rookie":0.25,"amateur":0.2066,"pro":0.225,"master":0.2424,"elite":0.25},"4 stops":{"rookie":0.1221,"amateur":0.0384,"pro":0.025,"master":0,"elite":0},"5 stops":{"rookie":0.0233,"amateur":0.0212,"pro":0.0036,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.58,"amateur":1.16,"pro":1.71,"master":1.21,"elite":1.5}},
  "Interlagos": {"Race Analysis":{"total":846,"rookie":120,"amateur":522,"pro":179,"master":21,"elite":4},"Pre-Race update":{"total":40,"rookie":13,"amateur":19,"pro":6,"master":1,"elite":1},"Keep on track":{"rookie":0.0902,"amateur":0.0388,"pro":0.0162,"master":0.0909,"elite":0.2},"Push a little":{"rookie":0.2707,"amateur":0.1146,"pro":0.0378,"master":0,"elite":0},"Push a lot":{"rookie":0.3459,"amateur":0.3512,"pro":0.3892,"master":0.2273,"elite":0.4},"Push to limit":{"rookie":0.2932,"amateur":0.4954,"pro":0.5568,"master":0.6818,"elite":0.4},"DM (sec)":{"rookie":0.433,"amateur":0.231,"pro":0.091,"master":0.056,"elite":0.078},"OT":{"rookie":22.45,"amateur":29.64,"pro":26.9,"master":23.38,"elite":17.5},"DF":{"rookie":24,"amateur":30.21,"pro":30.88,"master":40.24,"elite":40},"CT (dry)":{"rookie":19.35,"amateur":26.44,"pro":43.55,"master":52.19,"elite":67.25},"CT (malf)":{"rookie":8.91,"amateur":11.96,"pro":22.44,"master":34.62,"elite":87.25},"CTd >50":{"rookie":0.0417,"amateur":0.2222,"pro":0.4749,"master":0.619,"elite":0.75},"1 stop":{"rookie":0.1583,"amateur":0.2088,"pro":0.1732,"master":0.2381,"elite":0.5},"2 stops":{"rookie":0.4,"amateur":0.4502,"pro":0.5251,"master":0.5238,"elite":0.25},"3 stops":{"rookie":0.2917,"amateur":0.2337,"pro":0.2458,"master":0.2381,"elite":0.25},"4 stops":{"rookie":0.075,"amateur":0.0747,"pro":0.0447,"master":0,"elite":0},"5 stops":{"rookie":0.0333,"amateur":0.0096,"pro":0.0112,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.49,"amateur":1.38,"pro":1.41,"master":1,"elite":0.75}},
  "Irungattukottai": {"Race Analysis":{"total":1803,"rookie":230,"amateur":1127,"pro":400,"master":42,"elite":4},"Pre-Race update":{"total":66,"rookie":19,"amateur":29,"pro":15,"master":3,"elite":0},"Keep on track":{"rookie":0.1446,"amateur":0.045,"pro":0.0289,"master":0,"elite":0},"Push a little":{"rookie":0.3092,"amateur":0.1799,"pro":0.0916,"master":0.0222,"elite":0},"Push a lot":{"rookie":0.257,"amateur":0.3391,"pro":0.4193,"master":0.4222,"elite":0.5},"Push to limit":{"rookie":0.2892,"amateur":0.436,"pro":0.4602,"master":0.5556,"elite":0.5},"DM (sec)":{"rookie":0.626,"amateur":0.32,"pro":0.151,"master":0.117,"elite":0},"OT":{"rookie":23.37,"amateur":29.39,"pro":29.4,"master":21.38,"elite":10},"DF":{"rookie":23.37,"amateur":28.14,"pro":29.33,"master":40.02,"elite":24},"CT (dry)":{"rookie":19.66,"amateur":26.94,"pro":45.06,"master":53.95,"elite":53.25},"CT (malf)":{"rookie":8.8,"amateur":12.57,"pro":20.98,"master":32.1,"elite":53.25},"CTd >50":{"rookie":0.0739,"amateur":0.2263,"pro":0.4775,"master":0.5952,"elite":0.5},"1 stop":{"rookie":0.0391,"amateur":0.0603,"pro":0.05,"master":0.0476,"elite":0},"2 stops":{"rookie":0.4435,"amateur":0.4907,"pro":0.4525,"master":0.5,"elite":0.75},"3 stops":{"rookie":0.3261,"amateur":0.26,"pro":0.295,"master":0.2857,"elite":0.25},"4 stops":{"rookie":0.1348,"amateur":0.1579,"pro":0.185,"master":0.1667,"elite":0},"5 stops":{"rookie":0.013,"amateur":0.0169,"pro":0.015,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.32,"amateur":1.08,"pro":1.33,"master":0.88,"elite":1}},
  "Istanbul": {"Race Analysis":{"total":2190,"rookie":303,"amateur":1336,"pro":495,"master":52,"elite":4},"Pre-Race update":{"total":48,"rookie":22,"amateur":22,"pro":1,"master":3,"elite":0},"Keep on track":{"rookie":0.1323,"amateur":0.0523,"pro":0.0161,"master":0.0182,"elite":0},"Push a little":{"rookie":0.2892,"amateur":0.1885,"pro":0.1109,"master":0.0545,"elite":0},"Push a lot":{"rookie":0.3108,"amateur":0.3623,"pro":0.3851,"master":0.3455,"elite":0.75},"Push to limit":{"rookie":0.2677,"amateur":0.3969,"pro":0.4879,"master":0.5818,"elite":0.25},"DM (sec)":{"rookie":0.625,"amateur":0.331,"pro":0.157,"master":0.084,"elite":0},"OT":{"rookie":24.11,"amateur":30,"pro":27.86,"master":22.69,"elite":37.25},"DF":{"rookie":23.96,"amateur":29.81,"pro":29.78,"master":34.6,"elite":59.75},"CT (dry)":{"rookie":20.38,"amateur":30.13,"pro":45.51,"master":47.71,"elite":57.25},"CT (malf)":{"rookie":7.96,"amateur":11.81,"pro":20.51,"master":23.88,"elite":26.25},"CTd >50":{"rookie":0.066,"amateur":0.2597,"pro":0.4747,"master":0.5577,"elite":0.5},"1 stop":{"rookie":0.066,"amateur":0.1205,"pro":0.1374,"master":0.1154,"elite":0.25},"2 stops":{"rookie":0.5215,"amateur":0.6018,"pro":0.7131,"master":0.7308,"elite":0.75},"3 stops":{"rookie":0.3432,"amateur":0.238,"pro":0.1333,"master":0.1538,"elite":0},"4 stops":{"rookie":0.0429,"amateur":0.0299,"pro":0.0101,"master":0,"elite":0},"5 stops":{"rookie":0.0066,"amateur":0.0052,"pro":0.004,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.46,"amateur":0.98,"pro":1.06,"master":0.79,"elite":1.25}},
  "Jerez": {"Race Analysis":{"total":941,"rookie":127,"amateur":590,"pro":197,"master":24,"elite":3},"Pre-Race update":{"total":22,"rookie":11,"amateur":7,"pro":4,"master":0,"elite":0},"Keep on track":{"rookie":0.1957,"amateur":0.0419,"pro":0.0149,"master":0,"elite":0},"Push a little":{"rookie":0.2754,"amateur":0.2044,"pro":0.1194,"master":0,"elite":0},"Push a lot":{"rookie":0.2609,"amateur":0.3434,"pro":0.3781,"master":0.4167,"elite":0.3333},"Push to limit":{"rookie":0.2681,"amateur":0.4104,"pro":0.4876,"master":0.5833,"elite":0.6667},"DM (sec)":{"rookie":0.588,"amateur":0.311,"pro":0.138,"master":0.08,"elite":0.101},"OT":{"rookie":22.57,"amateur":26.8,"pro":25.64,"master":18.73,"elite":38},"DF":{"rookie":22.84,"amateur":31.19,"pro":31.59,"master":42.09,"elite":40},"CT (dry)":{"rookie":18.96,"amateur":25.46,"pro":32.68,"master":52.91,"elite":52},"CT (malf)":{"rookie":6.51,"amateur":10.88,"pro":14.52,"master":38.36,"elite":52},"CTd >50":{"rookie":0.0472,"amateur":0.1441,"pro":0.264,"master":0.5833,"elite":0.6667},"1 stop":{"rookie":0.2047,"amateur":0.1441,"pro":0.198,"master":0.125,"elite":0},"2 stops":{"rookie":0.4488,"amateur":0.6153,"pro":0.5279,"master":0.4167,"elite":0.3333},"3 stops":{"rookie":0.2598,"amateur":0.1797,"pro":0.2183,"master":0.2917,"elite":0.6667},"4 stops":{"rookie":0.063,"amateur":0.0424,"pro":0.0558,"master":0.1667,"elite":0},"5 stops":{"rookie":0.0157,"amateur":0.0068,"pro":0,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.55,"amateur":1.31,"pro":1.46,"master":1.04,"elite":1.33}},
  "Jyllands-Ringen": {"Race Analysis":{"total":1120,"rookie":137,"amateur":686,"pro":255,"master":40,"elite":2},"Pre-Race update":{"total":42,"rookie":18,"amateur":16,"pro":7,"master":1,"elite":0},"Keep on track":{"rookie":0.1161,"amateur":0.0613,"pro":0.0382,"master":0,"elite":0},"Push a little":{"rookie":0.3419,"amateur":0.1724,"pro":0.0725,"master":0,"elite":0},"Push a lot":{"rookie":0.2839,"amateur":0.3718,"pro":0.3969,"master":0.3415,"elite":0.5},"Push to limit":{"rookie":0.2581,"amateur":0.3946,"pro":0.4924,"master":0.6585,"elite":0.5},"DM (sec)":{"rookie":0.463,"amateur":0.186,"pro":0.074,"master":0.054,"elite":0.03},"OT":{"rookie":19.31,"amateur":26.23,"pro":28.96,"master":25.43,"elite":14.5},"DF":{"rookie":17.07,"amateur":26.54,"pro":30.48,"master":40,"elite":52.5},"CT (dry)":{"rookie":15.6,"amateur":21.02,"pro":33.41,"master":45.68,"elite":55},"CT (malf)":{"rookie":6.99,"amateur":9.39,"pro":15.35,"master":23.48,"elite":27.5},"CTd >50":{"rookie":0.0146,"amateur":0.0685,"pro":0.2784,"master":0.6,"elite":1},"1 stop":{"rookie":0.4015,"amateur":0.5131,"pro":0.6235,"master":0.8,"elite":1},"2 stops":{"rookie":0.4818,"amateur":0.4227,"pro":0.3137,"master":0.2,"elite":0},"3 stops":{"rookie":0.0876,"amateur":0.0437,"pro":0.0627,"master":0,"elite":0},"4 stops":{"rookie":0.0292,"amateur":0.0087,"pro":0,"master":0,"elite":0},"5 stops":{"rookie":0,"amateur":0.0058,"pro":0,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.33,"amateur":1.07,"pro":1.59,"master":1.25,"elite":1}},
  "Kaunas": {"Race Analysis":{"total":1507,"rookie":226,"amateur":925,"pro":314,"master":39,"elite":3},"Pre-Race update":{"total":62,"rookie":26,"amateur":27,"pro":8,"master":1,"elite":0},"Keep on track":{"rookie":0.123,"amateur":0.0473,"pro":0.0248,"master":0,"elite":0},"Push a little":{"rookie":0.2817,"amateur":0.1649,"pro":0.0807,"master":0.075,"elite":0},"Push a lot":{"rookie":0.3452,"amateur":0.3613,"pro":0.4224,"master":0.425,"elite":0},"Push to limit":{"rookie":0.25,"amateur":0.4265,"pro":0.472,"master":0.5,"elite":1},"DM (sec)":{"rookie":0.479,"amateur":0.273,"pro":0.147,"master":0.164,"elite":0.013},"OT":{"rookie":21.84,"amateur":29.37,"pro":28.48,"master":30.1,"elite":20.33},"DF":{"rookie":21.69,"amateur":29.38,"pro":29.68,"master":38.1,"elite":19.33},"CT (dry)":{"rookie":19.52,"amateur":30.35,"pro":42.81,"master":63.26,"elite":92.67},"CT (malf)":{"rookie":6.9,"amateur":10.74,"pro":18.93,"master":30.92,"elite":60},"CTd >50":{"rookie":0.0708,"amateur":0.2097,"pro":0.3854,"master":0.7692,"elite":1},"1 stop":{"rookie":0.1283,"amateur":0.1784,"pro":0.1752,"master":0.0769,"elite":0},"2 stops":{"rookie":0.5664,"amateur":0.5654,"pro":0.5796,"master":0.6154,"elite":0},"3 stops":{"rookie":0.2434,"amateur":0.2086,"pro":0.2229,"master":0.3077,"elite":1},"4 stops":{"rookie":0.0531,"amateur":0.0281,"pro":0.0191,"master":0,"elite":0},"5 stops":{"rookie":0,"amateur":0.013,"pro":0.0032,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.49,"amateur":1.32,"pro":1.58,"master":1.44,"elite":1}},
  "Kyalami": {"Race Analysis":{"total":2562,"rookie":355,"amateur":1574,"pro":565,"master":63,"elite":5},"Pre-Race update":{"total":75,"rookie":23,"amateur":39,"pro":13,"master":0,"elite":0},"Keep on track":{"rookie":0.1693,"amateur":0.0614,"pro":0.026,"master":0.0317,"elite":0},"Push a little":{"rookie":0.254,"amateur":0.1971,"pro":0.1073,"master":0.0794,"elite":0.2},"Push a lot":{"rookie":0.2725,"amateur":0.3379,"pro":0.436,"master":0.3651,"elite":0.2},"Push to limit":{"rookie":0.3042,"amateur":0.4036,"pro":0.4308,"master":0.5238,"elite":0.6},"DM (sec)":{"rookie":0.557,"amateur":0.286,"pro":0.129,"master":0.088,"elite":0.059},"OT":{"rookie":23.72,"amateur":26.35,"pro":26.29,"master":17.08,"elite":12},"DF":{"rookie":23.58,"amateur":30.15,"pro":31.06,"master":34.79,"elite":31.8},"CT (dry)":{"rookie":18.68,"amateur":27.17,"pro":42.3,"master":51.95,"elite":42.2},"CT (malf)":{"rookie":7.14,"amateur":11.28,"pro":19.28,"master":31.67,"elite":40.2},"CTd >50":{"rookie":0.0648,"amateur":0.1976,"pro":0.4407,"master":0.6032,"elite":0.4},"1 stop":{"rookie":0.0873,"amateur":0.1404,"pro":0.0867,"master":0.1111,"elite":0.2},"2 stops":{"rookie":0.4563,"amateur":0.4911,"pro":0.6124,"master":0.4921,"elite":0.6},"3 stops":{"rookie":0.3296,"amateur":0.2948,"pro":0.2566,"master":0.3492,"elite":0.2},"4 stops":{"rookie":0.0789,"amateur":0.0534,"pro":0.0372,"master":0.0476,"elite":0},"5 stops":{"rookie":0.031,"amateur":0.0121,"pro":0.0053,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.61,"amateur":1.18,"pro":1.38,"master":1,"elite":0.6}},
  "Laguna Seca": {"Race Analysis":{"total":1166,"rookie":156,"amateur":702,"pro":270,"master":36,"elite":2},"Pre-Race update":{"total":50,"rookie":7,"amateur":37,"pro":5,"master":1,"elite":0},"Keep on track":{"rookie":0.0982,"amateur":0.0568,"pro":0.0036,"master":0,"elite":0},"Push a little":{"rookie":0.2515,"amateur":0.18,"pro":0.0909,"master":0.0811,"elite":0},"Push a lot":{"rookie":0.3129,"amateur":0.3532,"pro":0.4364,"master":0.3784,"elite":0.5},"Push to limit":{"rookie":0.3374,"amateur":0.41,"pro":0.4691,"master":0.5405,"elite":0.5},"DM (sec)":{"rookie":0.521,"amateur":0.288,"pro":0.132,"master":0.129,"elite":0},"OT":{"rookie":23.02,"amateur":29.48,"pro":32.18,"master":23.56,"elite":10},"DF":{"rookie":22.58,"amateur":28.11,"pro":30.09,"master":33.72,"elite":60},"CT (dry)":{"rookie":18.33,"amateur":28.03,"pro":47.26,"master":69.08,"elite":50},"CT (malf)":{"rookie":6.68,"amateur":9.79,"pro":19.99,"master":29.64,"elite":50},"CTd >50":{"rookie":0.0513,"amateur":0.1966,"pro":0.5037,"master":0.8611,"elite":0.5},"1 stop":{"rookie":0.1026,"amateur":0.1296,"pro":0.0704,"master":0.0833,"elite":0.5},"2 stops":{"rookie":0.5705,"amateur":0.6823,"pro":0.7296,"master":0.7222,"elite":0},"3 stops":{"rookie":0.2821,"amateur":0.161,"pro":0.1778,"master":0.1667,"elite":0.5},"4 stops":{"rookie":0.0256,"amateur":0.0185,"pro":0.0222,"master":0.0278,"elite":0},"5 stops":{"rookie":0.0064,"amateur":0.0071,"pro":0,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.48,"amateur":1.17,"pro":1.56,"master":1.03,"elite":0.5}},
  "Melbourne": {"Race Analysis":{"total":1273,"rookie":165,"amateur":784,"pro":292,"master":29,"elite":3},"Pre-Race update":{"total":43,"rookie":21,"amateur":14,"pro":7,"master":1,"elite":0},"Keep on track":{"rookie":0.1774,"amateur":0.0476,"pro":0.0368,"master":0,"elite":0},"Push a little":{"rookie":0.3226,"amateur":0.1992,"pro":0.0903,"master":0,"elite":0},"Push a lot":{"rookie":0.2688,"amateur":0.3709,"pro":0.4114,"master":0.2667,"elite":0},"Push to limit":{"rookie":0.2312,"amateur":0.3822,"pro":0.4615,"master":0.7333,"elite":1},"DM (sec)":{"rookie":0.673,"amateur":0.309,"pro":0.129,"master":0.075,"elite":0.041},"OT":{"rookie":21.18,"amateur":26.69,"pro":27.93,"master":24.69,"elite":16.33},"DF":{"rookie":23.75,"amateur":30.15,"pro":33.27,"master":37.9,"elite":9.67},"CT (dry)":{"rookie":18.28,"amateur":29.4,"pro":45.2,"master":59.1,"elite":3.67},"CT (malf)":{"rookie":7.03,"amateur":10.15,"pro":17.95,"master":38.1,"elite":3.67},"CTd >50":{"rookie":0.0667,"amateur":0.2653,"pro":0.476,"master":0.7241,"elite":0},"1 stop":{"rookie":0.0545,"amateur":0.1135,"pro":0.1507,"master":0.1724,"elite":0},"2 stops":{"rookie":0.503,"amateur":0.5702,"pro":0.6062,"master":0.5517,"elite":0.6667},"3 stops":{"rookie":0.2848,"amateur":0.2628,"pro":0.1986,"master":0.2414,"elite":0.3333},"4 stops":{"rookie":0.1152,"amateur":0.0395,"pro":0.0377,"master":0.0345,"elite":0},"5 stops":{"rookie":0.0061,"amateur":0.0102,"pro":0.0034,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.62,"amateur":1.08,"pro":1.26,"master":0.93,"elite":0.33}},
  "Mexico City": {"Race Analysis":{"total":2766,"rookie":352,"amateur":1718,"pro":614,"master":76,"elite":6},"Pre-Race update":{"total":82,"rookie":29,"amateur":36,"pro":14,"master":3,"elite":0},"Keep on track":{"rookie":0.1706,"amateur":0.061,"pro":0.0255,"master":0,"elite":0},"Push a little":{"rookie":0.2835,"amateur":0.2161,"pro":0.1242,"master":0.0633,"elite":0},"Push a lot":{"rookie":0.336,"amateur":0.3449,"pro":0.4299,"master":0.3924,"elite":0.5},"Push to limit":{"rookie":0.21,"amateur":0.378,"pro":0.4204,"master":0.5443,"elite":0.5},"DM (sec)":{"rookie":0.687,"amateur":0.37,"pro":0.174,"master":0.128,"elite":0.207},"OT":{"rookie":22.44,"amateur":26.82,"pro":25.33,"master":19.7,"elite":32.5},"DF":{"rookie":23.01,"amateur":29.63,"pro":31.45,"master":39.59,"elite":49.83},"CT (dry)":{"rookie":18.04,"amateur":27.08,"pro":41.82,"master":56.3,"elite":64.67},"CT (malf)":{"rookie":7.18,"amateur":9.99,"pro":17.28,"master":27.85,"elite":48.17},"CTd >50":{"rookie":0.0284,"amateur":0.1519,"pro":0.3616,"master":0.6579,"elite":0.6667},"1 stop":{"rookie":0.2614,"amateur":0.397,"pro":0.4691,"master":0.5526,"elite":0.6667},"2 stops":{"rookie":0.4773,"amateur":0.4336,"pro":0.399,"master":0.3421,"elite":0.3333},"3 stops":{"rookie":0.1364,"amateur":0.1222,"pro":0.0912,"master":0.1053,"elite":0},"4 stops":{"rookie":0.0824,"amateur":0.0349,"pro":0.0293,"master":0,"elite":0},"5 stops":{"rookie":0.0256,"amateur":0.0058,"pro":0.0065,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.73,"amateur":1.43,"pro":1.8,"master":1.33,"elite":1.17}},
  "Montreal": {"Race Analysis":{"total":2035,"rookie":258,"amateur":1299,"pro":418,"master":56,"elite":4},"Pre-Race update":{"total":75,"rookie":26,"amateur":38,"pro":8,"master":3,"elite":0},"Keep on track":{"rookie":0.1232,"amateur":0.0561,"pro":0.0329,"master":0,"elite":0},"Push a little":{"rookie":0.3169,"amateur":0.181,"pro":0.0892,"master":0,"elite":0},"Push a lot":{"rookie":0.2641,"amateur":0.3328,"pro":0.4249,"master":0.3559,"elite":0},"Push to limit":{"rookie":0.2958,"amateur":0.4301,"pro":0.4531,"master":0.6441,"elite":1},"DM (sec)":{"rookie":0.525,"amateur":0.298,"pro":0.137,"master":0.066,"elite":0.072},"OT":{"rookie":23.4,"amateur":28.66,"pro":29.39,"master":22.71,"elite":55},"DF":{"rookie":23.82,"amateur":29,"pro":31,"master":37.91,"elite":43.75},"CT (dry)":{"rookie":18.35,"amateur":27.27,"pro":42.69,"master":62.91,"elite":96.25},"CT (malf)":{"rookie":7.43,"amateur":11.28,"pro":19.46,"master":31.95,"elite":27.5},"CTd >50":{"rookie":0.0581,"amateur":0.1809,"pro":0.4187,"master":0.7321,"elite":1},"1 stop":{"rookie":0.093,"amateur":0.1678,"pro":0.1938,"master":0.1429,"elite":0},"2 stops":{"rookie":0.5039,"amateur":0.5558,"pro":0.5789,"master":0.5,"elite":0.5},"3 stops":{"rookie":0.2907,"amateur":0.2333,"pro":0.1866,"master":0.3036,"elite":0.25},"4 stops":{"rookie":0.0775,"amateur":0.0308,"pro":0.0359,"master":0.0357,"elite":0.25},"5 stops":{"rookie":0.0039,"amateur":0.0069,"pro":0,"master":0.0179,"elite":0},"Driver Mistake (avg)":{"rookie":0.44,"amateur":1.13,"pro":1.27,"master":1.05,"elite":2.5}},
  "Mugello": {"Race Analysis":{"total":1443,"rookie":189,"amateur":908,"pro":308,"master":34,"elite":4},"Pre-Race update":{"total":45,"rookie":19,"amateur":17,"pro":8,"master":1,"elite":0},"Keep on track":{"rookie":0.1683,"amateur":0.0584,"pro":0.0158,"master":0,"elite":0},"Push a little":{"rookie":0.2548,"amateur":0.2043,"pro":0.1424,"master":0,"elite":0},"Push a lot":{"rookie":0.3077,"amateur":0.3416,"pro":0.4335,"master":0.4286,"elite":0.25},"Push to limit":{"rookie":0.2692,"amateur":0.3957,"pro":0.4082,"master":0.5714,"elite":0.75},"DM (sec)":{"rookie":0.646,"amateur":0.355,"pro":0.186,"master":0.062,"elite":0},"OT":{"rookie":24.13,"amateur":26.83,"pro":26.59,"master":19.09,"elite":37.5},"DF":{"rookie":24.72,"amateur":28.89,"pro":32.69,"master":36.26,"elite":35},"CT (dry)":{"rookie":19.93,"amateur":25.53,"pro":41.35,"master":48.79,"elite":40},"CT (malf)":{"rookie":8.68,"amateur":10.98,"pro":19.53,"master":21.32,"elite":35},"CTd >50":{"rookie":0.0476,"amateur":0.1707,"pro":0.4091,"master":0.5,"elite":0.5},"1 stop":{"rookie":0.0899,"amateur":0.1993,"pro":0.3149,"master":0.2059,"elite":0.25},"2 stops":{"rookie":0.455,"amateur":0.4901,"pro":0.4708,"master":0.5294,"elite":0.25},"3 stops":{"rookie":0.3069,"amateur":0.1894,"pro":0.1364,"master":0.2059,"elite":0.5},"4 stops":{"rookie":0.1058,"amateur":0.1035,"pro":0.0714,"master":0.0294,"elite":0},"5 stops":{"rookie":0.0053,"amateur":0.0088,"pro":0.0032,"master":0.0294,"elite":0},"Driver Mistake (avg)":{"rookie":0.52,"amateur":1.18,"pro":1.52,"master":1.59,"elite":1}},
  "New Delhi": {"Race Analysis":{"total":1949,"rookie":288,"amateur":1203,"pro":407,"master":47,"elite":4},"Pre-Race update":{"total":57,"rookie":23,"amateur":28,"pro":3,"master":3,"elite":0},"Keep on track":{"rookie":0.1576,"amateur":0.0617,"pro":0.0195,"master":0,"elite":0},"Push a little":{"rookie":0.2669,"amateur":0.1755,"pro":0.1146,"master":0.04,"elite":0},"Push a lot":{"rookie":0.3151,"amateur":0.3412,"pro":0.4073,"master":0.32,"elite":0.75},"Push to limit":{"rookie":0.2605,"amateur":0.4216,"pro":0.4585,"master":0.64,"elite":0.25},"DM (sec)":{"rookie":0.492,"amateur":0.26,"pro":0.122,"master":0.084,"elite":0},"OT":{"rookie":22.11,"amateur":28.64,"pro":28.01,"master":22.94,"elite":6},"DF":{"rookie":21.13,"amateur":28.09,"pro":31.24,"master":29.57,"elite":42.75},"CT (dry)":{"rookie":17.19,"amateur":24.74,"pro":41.23,"master":44.6,"elite":19.25},"CT (malf)":{"rookie":6.8,"amateur":10.46,"pro":18.05,"master":27.02,"elite":16.25},"CTd >50":{"rookie":0.059,"amateur":0.1978,"pro":0.4324,"master":0.5745,"elite":0.25},"1 stop":{"rookie":0.0382,"amateur":0.0366,"pro":0.0688,"master":0.1064,"elite":0.25},"2 stops":{"rookie":0.4618,"amateur":0.5237,"pro":0.4521,"master":0.3191,"elite":0.25},"3 stops":{"rookie":0.3264,"amateur":0.3342,"pro":0.4152,"master":0.5745,"elite":0.25},"4 stops":{"rookie":0.1181,"amateur":0.0715,"pro":0.0491,"master":0,"elite":0.25},"5 stops":{"rookie":0.0313,"amateur":0.0249,"pro":0.0123,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.38,"amateur":1.06,"pro":1.28,"master":1.02,"elite":0.25}},
  "Nurburgring": {"Race Analysis":{"total":874,"rookie":125,"amateur":526,"pro":201,"master":19,"elite":3},"Pre-Race update":{"total":20,"rookie":10,"amateur":7,"pro":3,"master":0,"elite":0},"Keep on track":{"rookie":0.1852,"amateur":0.0638,"pro":0.0196,"master":0,"elite":0},"Push a little":{"rookie":0.2519,"amateur":0.2026,"pro":0.0735,"master":0.0526,"elite":0.3333},"Push a lot":{"rookie":0.3407,"amateur":0.3659,"pro":0.4363,"master":0.5263,"elite":0.3333},"Push to limit":{"rookie":0.2222,"amateur":0.3677,"pro":0.4706,"master":0.4211,"elite":0.3333},"DM (sec)":{"rookie":0.728,"amateur":0.338,"pro":0.152,"master":0.122,"elite":0},"OT":{"rookie":21.69,"amateur":29.93,"pro":29,"master":20.56,"elite":20},"DF":{"rookie":25.17,"amateur":29.02,"pro":33.96,"master":31.88,"elite":20},"CT (dry)":{"rookie":17.86,"amateur":29.06,"pro":43.85,"master":64.94,"elite":100},"CT (malf)":{"rookie":8.15,"amateur":11.94,"pro":19.43,"master":34.81,"elite":100},"CTd >50":{"rookie":0.064,"amateur":0.1445,"pro":0.3134,"master":0.6842,"elite":0.3333},"1 stop":{"rookie":0.272,"amateur":0.3916,"pro":0.4527,"master":0.3158,"elite":0.6667},"2 stops":{"rookie":0.528,"amateur":0.4943,"pro":0.4776,"master":0.6316,"elite":0.3333},"3 stops":{"rookie":0.168,"amateur":0.1008,"pro":0.0697,"master":0.0526,"elite":0},"4 stops":{"rookie":0.008,"amateur":0.0095,"pro":0,"master":0,"elite":0},"5 stops":{"rookie":0.008,"amateur":0.0019,"pro":0,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.44,"amateur":0.95,"pro":1.23,"master":1.26,"elite":1}},
  "Portimao": {"Race Analysis":{"total":1961,"rookie":265,"amateur":1215,"pro":429,"master":48,"elite":4},"Pre-Race update":{"total":68,"rookie":26,"amateur":25,"pro":17,"master":0,"elite":0},"Keep on track":{"rookie":0.134,"amateur":0.0589,"pro":0.0247,"master":0,"elite":0},"Push a little":{"rookie":0.2921,"amateur":0.2097,"pro":0.1031,"master":0.0625,"elite":0},"Push a lot":{"rookie":0.2921,"amateur":0.3395,"pro":0.4126,"master":0.375,"elite":0},"Push to limit":{"rookie":0.2818,"amateur":0.3919,"pro":0.4596,"master":0.5625,"elite":1},"DM (sec)":{"rookie":0.622,"amateur":0.296,"pro":0.122,"master":0.058,"elite":0},"OT":{"rookie":21.42,"amateur":30.72,"pro":29.06,"master":21.51,"elite":36.67},"DF":{"rookie":22.2,"amateur":28.83,"pro":28.64,"master":26.79,"elite":36.67},"CT (dry)":{"rookie":17.59,"amateur":29.41,"pro":44.34,"master":57.3,"elite":63.33},"CT (malf)":{"rookie":7.04,"amateur":10.77,"pro":17.43,"master":30.93,"elite":53.33},"CTd >50":{"rookie":0.0528,"amateur":0.2189,"pro":0.4079,"master":0.6458,"elite":0.5},"1 stop":{"rookie":0.1094,"amateur":0.1473,"pro":0.2005,"master":0.25,"elite":0.25},"2 stops":{"rookie":0.4868,"amateur":0.4313,"pro":0.4103,"master":0.2917,"elite":0.5},"3 stops":{"rookie":0.2868,"amateur":0.3399,"pro":0.345,"master":0.4583,"elite":0.25},"4 stops":{"rookie":0.0792,"amateur":0.0519,"pro":0.0373,"master":0,"elite":0},"5 stops":{"rookie":0.0075,"amateur":0.0214,"pro":0.0023,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.5,"amateur":1.28,"pro":1.68,"master":1.67,"elite":1}},
  "Poznan": {"Race Analysis":{"total":1363,"rookie":165,"amateur":867,"pro":298,"master":31,"elite":2},"Pre-Race update":{"total":37,"rookie":8,"amateur":21,"pro":6,"master":2,"elite":0},"Keep on track":{"rookie":0.1098,"amateur":0.0541,"pro":0.023,"master":0,"elite":0},"Push a little":{"rookie":0.2659,"amateur":0.1791,"pro":0.0888,"master":0.0303,"elite":0},"Push a lot":{"rookie":0.3121,"amateur":0.3581,"pro":0.4013,"master":0.303,"elite":0.5},"Push to limit":{"rookie":0.3121,"amateur":0.4088,"pro":0.4868,"master":0.6667,"elite":0.5},"DM (sec)":{"rookie":0.526,"amateur":0.26,"pro":0.102,"master":0.078,"elite":0.084},"OT":{"rookie":22.12,"amateur":27,"pro":25.16,"master":27.61,"elite":15},"DF":{"rookie":24.19,"amateur":30.29,"pro":29.79,"master":47.13,"elite":15},"CT (dry)":{"rookie":19.41,"amateur":26.98,"pro":41.67,"master":63.35,"elite":65},"CT (malf)":{"rookie":8.75,"amateur":12.34,"pro":17.66,"master":39.55,"elite":55},"CTd >50":{"rookie":0.0545,"amateur":0.1926,"pro":0.4228,"master":0.8065,"elite":0.5},"1 stop":{"rookie":0.0606,"amateur":0.1753,"pro":0.1644,"master":0.129,"elite":0},"2 stops":{"rookie":0.5152,"amateur":0.4475,"pro":0.4597,"master":0.4516,"elite":0.5},"3 stops":{"rookie":0.297,"amateur":0.293,"pro":0.3154,"master":0.3871,"elite":0.5},"4 stops":{"rookie":0.0909,"amateur":0.0438,"pro":0.0537,"master":0,"elite":0},"5 stops":{"rookie":0.0121,"amateur":0.0311,"pro":0.0067,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.66,"amateur":1.42,"pro":1.7,"master":1.68,"elite":1.5}},
  "Rafaela Oval": {"Race Analysis":{"total":1709,"rookie":246,"amateur":1054,"pro":368,"master":38,"elite":3},"Pre-Race update":{"total":52,"rookie":22,"amateur":22,"pro":8,"master":0,"elite":0},"Keep on track":{"rookie":0.153,"amateur":0.1097,"pro":0.0984,"master":0.1053,"elite":0},"Push a little":{"rookie":0.2649,"amateur":0.2426,"pro":0.2207,"master":0.2105,"elite":0.3333},"Push a lot":{"rookie":0.3358,"amateur":0.2909,"pro":0.375,"master":0.5,"elite":0.6667},"Push to limit":{"rookie":0.2463,"amateur":0.3569,"pro":0.3059,"master":0.1842,"elite":0},"DM (sec)":{"rookie":0.933,"amateur":0.986,"pro":0.766,"master":0.688,"elite":1.582},"OT":{"rookie":21.8,"amateur":29.69,"pro":29.35,"master":18.5,"elite":6.67},"DF":{"rookie":21.12,"amateur":25.7,"pro":28.36,"master":22.18,"elite":66.67},"CT (dry)":{"rookie":18.57,"amateur":25.28,"pro":41.33,"master":53.32,"elite":33.33},"CT (malf)":{"rookie":8.17,"amateur":10.97,"pro":19.96,"master":33.76,"elite":83.33},"CTd >50":{"rookie":0.0813,"amateur":0.2068,"pro":0.4484,"master":0.5789,"elite":0.3333},"1 stop":{"rookie":0.0407,"amateur":0.0598,"pro":0.0788,"master":0.1316,"elite":0},"2 stops":{"rookie":0.4715,"amateur":0.5057,"pro":0.4864,"master":0.4737,"elite":1},"3 stops":{"rookie":0.2846,"amateur":0.2856,"pro":0.337,"master":0.3158,"elite":0},"4 stops":{"rookie":0.0935,"amateur":0.0987,"pro":0.0842,"master":0.0789,"elite":0},"5 stops":{"rookie":0.0407,"amateur":0.0294,"pro":0.0109,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.72,"amateur":1.49,"pro":1.41,"master":0.82,"elite":0.33}},
  "Sakhir": {"Race Analysis":{"total":2078,"rookie":285,"amateur":1300,"pro":440,"master":48,"elite":5},"Pre-Race update":{"total":51,"rookie":23,"amateur":21,"pro":6,"master":1,"elite":0},"Keep on track":{"rookie":0.1429,"amateur":0.0553,"pro":0.0291,"master":0.0408,"elite":0},"Push a little":{"rookie":0.2727,"amateur":0.1658,"pro":0.0605,"master":0.0204,"elite":0},"Push a lot":{"rookie":0.276,"amateur":0.3399,"pro":0.4103,"master":0.4694,"elite":0.4},"Push to limit":{"rookie":0.3084,"amateur":0.4391,"pro":0.5,"master":0.4694,"elite":0.6},"DM (sec)":{"rookie":0.648,"amateur":0.339,"pro":0.152,"master":0.079,"elite":0},"OT":{"rookie":21.8,"amateur":28.66,"pro":27.76,"master":22.21,"elite":26.6},"DF":{"rookie":22.7,"amateur":28.55,"pro":31.08,"master":29.31,"elite":33.2},"CT (dry)":{"rookie":17.08,"amateur":26.22,"pro":41.47,"master":45.04,"elite":55.2},"CT (malf)":{"rookie":7.79,"amateur":11.09,"pro":17.19,"master":25.85,"elite":31.6},"CTd >50":{"rookie":0.0316,"amateur":0.1846,"pro":0.4341,"master":0.5,"elite":0.6},"1 stop":{"rookie":0.1088,"amateur":0.1477,"pro":0.1364,"master":0.1667,"elite":0.2},"2 stops":{"rookie":0.4596,"amateur":0.5869,"pro":0.625,"master":0.5833,"elite":0.6},"3 stops":{"rookie":0.3544,"amateur":0.2285,"pro":0.2182,"master":0.2292,"elite":0.2},"4 stops":{"rookie":0.0667,"amateur":0.0292,"pro":0.0136,"master":0.0208,"elite":0},"5 stops":{"rookie":0.007,"amateur":0.0038,"pro":0.0045,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.5,"amateur":1.15,"pro":1.22,"master":1.19,"elite":1.4}},
  "Sepang": {"Race Analysis":{"total":2319,"rookie":292,"amateur":1469,"pro":490,"master":63,"elite":5},"Pre-Race update":{"total":68,"rookie":28,"amateur":31,"pro":8,"master":1,"elite":0},"Keep on track":{"rookie":0.0938,"amateur":0.0513,"pro":0.0141,"master":0,"elite":0},"Push a little":{"rookie":0.3313,"amateur":0.162,"pro":0.0723,"master":0.0156,"elite":0},"Push a lot":{"rookie":0.2813,"amateur":0.342,"pro":0.4116,"master":0.3125,"elite":0},"Push to limit":{"rookie":0.2938,"amateur":0.4447,"pro":0.502,"master":0.6719,"elite":1},"DM (sec)":{"rookie":0.644,"amateur":0.283,"pro":0.124,"master":0.09,"elite":0.015},"OT":{"rookie":23.09,"amateur":28.9,"pro":28.28,"master":23.27,"elite":27.2},"DF":{"rookie":22.43,"amateur":28.71,"pro":30.64,"master":37.7,"elite":48.6},"CT (dry)":{"rookie":17.96,"amateur":25.25,"pro":39.22,"master":47.53,"elite":58.2},"CT (malf)":{"rookie":8.61,"amateur":11.16,"pro":18,"master":27.45,"elite":48.2},"CTd >50":{"rookie":0.0445,"amateur":0.1259,"pro":0.3265,"master":0.5556,"elite":0.8},"1 stop":{"rookie":0.1541,"amateur":0.1797,"pro":0.1245,"master":0.1429,"elite":0.2},"2 stops":{"rookie":0.4486,"amateur":0.4649,"pro":0.5408,"master":0.5873,"elite":0.8},"3 stops":{"rookie":0.2603,"amateur":0.2982,"pro":0.2959,"master":0.2381,"elite":0},"4 stops":{"rookie":0.0822,"amateur":0.0436,"pro":0.0327,"master":0.0317,"elite":0},"5 stops":{"rookie":0.0205,"amateur":0.0061,"pro":0.0041,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.42,"amateur":1.18,"pro":1.55,"master":1.14,"elite":0.8}},
  "Serres": {"Race Analysis":{"total":1882,"rookie":265,"amateur":1162,"pro":404,"master":49,"elite":2},"Pre-Race update":{"total":64,"rookie":28,"amateur":30,"pro":5,"master":1,"elite":0},"Keep on track":{"rookie":0.1604,"amateur":0.0587,"pro":0.0098,"master":0,"elite":0},"Push a little":{"rookie":0.3038,"amateur":0.1904,"pro":0.132,"master":0.02,"elite":0},"Push a lot":{"rookie":0.2491,"amateur":0.3398,"pro":0.4254,"master":0.4,"elite":0},"Push to limit":{"rookie":0.2867,"amateur":0.4111,"pro":0.4328,"master":0.58,"elite":1},"DM (sec)":{"rookie":0.639,"amateur":0.286,"pro":0.113,"master":0.083,"elite":0},"OT":{"rookie":19.99,"amateur":26.28,"pro":26.63,"master":19.29,"elite":20},"DF":{"rookie":20.25,"amateur":29.37,"pro":30.11,"master":38.57,"elite":20},"CT (dry)":{"rookie":15.63,"amateur":28.17,"pro":43.88,"master":51.2,"elite":100},"CT (malf)":{"rookie":5.72,"amateur":11.79,"pro":17.61,"master":30.2,"elite":55},"CTd >50":{"rookie":0.0415,"amateur":0.2117,"pro":0.4208,"master":0.6327,"elite":1},"1 stop":{"rookie":0.0981,"amateur":0.185,"pro":0.1856,"master":0.2857,"elite":0},"2 stops":{"rookie":0.3774,"amateur":0.3916,"pro":0.4134,"master":0.3061,"elite":0.5},"3 stops":{"rookie":0.4113,"amateur":0.358,"pro":0.3713,"master":0.3878,"elite":0.5},"4 stops":{"rookie":0.0642,"amateur":0.0508,"pro":0.0223,"master":0.0204,"elite":0},"5 stops":{"rookie":0.0189,"amateur":0.0086,"pro":0.0025,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.56,"amateur":1.51,"pro":1.86,"master":1.27,"elite":0}},
  "Shanghai": {"Race Analysis":{"total":1930,"rookie":272,"amateur":1179,"pro":428,"master":45,"elite":6},"Pre-Race update":{"total":102,"rookie":29,"amateur":52,"pro":17,"master":4,"elite":0},"Keep on track":{"rookie":0.1229,"amateur":0.0512,"pro":0.0157,"master":0,"elite":0},"Push a little":{"rookie":0.2591,"amateur":0.1657,"pro":0.0809,"master":0,"elite":0},"Push a lot":{"rookie":0.3422,"amateur":0.3607,"pro":0.4247,"master":0.4082,"elite":0.3333},"Push to limit":{"rookie":0.2757,"amateur":0.4224,"pro":0.4787,"master":0.5918,"elite":0.6667},"DM (sec)":{"rookie":0.604,"amateur":0.356,"pro":0.174,"master":0.143,"elite":0.168},"OT":{"rookie":23.86,"amateur":27.93,"pro":27.71,"master":22.6,"elite":12.5},"DF":{"rookie":23.25,"amateur":28.86,"pro":30.72,"master":37.13,"elite":34.67},"CT (dry)":{"rookie":17.5,"amateur":25.93,"pro":40.68,"master":58.67,"elite":29.83},"CT (malf)":{"rookie":7.28,"amateur":11.09,"pro":16.89,"master":40.69,"elite":36.5},"CTd >50":{"rookie":0.0404,"amateur":0.1747,"pro":0.4159,"master":0.6667,"elite":0.3333},"1 stop":{"rookie":0.1397,"amateur":0.2841,"pro":0.257,"master":0.3111,"elite":0.3333},"2 stops":{"rookie":0.4963,"amateur":0.5165,"pro":0.5958,"master":0.6,"elite":0.6667},"3 stops":{"rookie":0.2831,"amateur":0.1561,"pro":0.1098,"master":0.0889,"elite":0},"4 stops":{"rookie":0.0588,"amateur":0.0314,"pro":0.0187,"master":0,"elite":0},"5 stops":{"rookie":0.0037,"amateur":0.0059,"pro":0.007,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.43,"amateur":1.11,"pro":1.29,"master":1.09,"elite":0.5}},
  "Singapore": {"Race Analysis":{"total":2094,"rookie":286,"amateur":1272,"pro":479,"master":52,"elite":5},"Pre-Race update":{"total":69,"rookie":26,"amateur":32,"pro":11,"master":0,"elite":0},"Keep on track":{"rookie":0.1218,"amateur":0.056,"pro":0.0163,"master":0,"elite":0},"Push a little":{"rookie":0.3141,"amateur":0.181,"pro":0.0959,"master":0,"elite":0},"Push a lot":{"rookie":0.3045,"amateur":0.3512,"pro":0.4469,"master":0.4231,"elite":0.2},"Push to limit":{"rookie":0.2596,"amateur":0.4118,"pro":0.4408,"master":0.5769,"elite":0.8},"DM (sec)":{"rookie":0.534,"amateur":0.232,"pro":0.085,"master":0.055,"elite":0.059},"OT":{"rookie":20.81,"amateur":26.46,"pro":25.54,"master":18,"elite":11.6},"DF":{"rookie":20.59,"amateur":29.25,"pro":31.34,"master":40.08,"elite":8.8},"CT (dry)":{"rookie":16.65,"amateur":25.81,"pro":42.5,"master":50.25,"elite":31},"CT (malf)":{"rookie":7.23,"amateur":10.3,"pro":17.84,"master":30.88,"elite":23.6},"CTd >50":{"rookie":0.0175,"amateur":0.1816,"pro":0.4342,"master":0.5577,"elite":0.2},"1 stop":{"rookie":0.035,"amateur":0.0519,"pro":0.096,"master":0.1346,"elite":0.2},"2 stops":{"rookie":0.3462,"amateur":0.3711,"pro":0.3111,"master":0.2692,"elite":0.2},"3 stops":{"rookie":0.1958,"amateur":0.2563,"pro":0.3194,"master":0.3269,"elite":0.2},"4 stops":{"rookie":0.2168,"amateur":0.1494,"pro":0.119,"master":0.1154,"elite":0.2},"5 stops":{"rookie":0.1469,"amateur":0.1494,"pro":0.1524,"master":0.1538,"elite":0.2},"Driver Mistake (avg)":{"rookie":0.58,"amateur":1.4,"pro":1.78,"master":1.12,"elite":0.8}},
  "Slovakiaring": {"Race Analysis":{"total":1296,"rookie":177,"amateur":813,"pro":276,"master":28,"elite":2},"Pre-Race update":{"total":54,"rookie":21,"amateur":22,"pro":8,"master":3,"elite":0},"Keep on track":{"rookie":0.1111,"amateur":0.0419,"pro":0.0282,"master":0,"elite":0},"Push a little":{"rookie":0.2576,"amateur":0.1305,"pro":0.0775,"master":0,"elite":0},"Push a lot":{"rookie":0.3889,"amateur":0.3892,"pro":0.4261,"master":0.3226,"elite":0},"Push to limit":{"rookie":0.2424,"amateur":0.4383,"pro":0.4683,"master":0.6774,"elite":1},"DM (sec)":{"rookie":0.503,"amateur":0.31,"pro":0.168,"master":0.084,"elite":0},"OT":{"rookie":24.01,"amateur":27.28,"pro":26.6,"master":25.87,"elite":10},"DF":{"rookie":25.33,"amateur":29.24,"pro":33.49,"master":34.39,"elite":10},"CT (dry)":{"rookie":18.23,"amateur":28.57,"pro":41.71,"master":53.96,"elite":30},"CT (malf)":{"rookie":7.63,"amateur":11.29,"pro":15.38,"master":38.57,"elite":0},"CTd >50":{"rookie":0.0452,"amateur":0.1833,"pro":0.308,"master":0.4643,"elite":0},"1 stop":{"rookie":0.1469,"amateur":0.2276,"pro":0.2681,"master":0.2857,"elite":0.5},"2 stops":{"rookie":0.3955,"amateur":0.4859,"pro":0.4746,"master":0.5714,"elite":0.5},"3 stops":{"rookie":0.3672,"amateur":0.2423,"pro":0.2319,"master":0.0357,"elite":0},"4 stops":{"rookie":0.0847,"amateur":0.0246,"pro":0.0181,"master":0.1071,"elite":0},"5 stops":{"rookie":0,"amateur":0.0074,"pro":0,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.56,"amateur":1.05,"pro":1.22,"master":1.46,"elite":1.5}},
  "Sochi": {"Race Analysis":{"total":1916,"rookie":272,"amateur":1204,"pro":389,"master":44,"elite":7},"Pre-Race update":{"total":44,"rookie":20,"amateur":15,"pro":8,"master":1,"elite":0},"Keep on track":{"rookie":0.1644,"amateur":0.0509,"pro":0.0202,"master":0,"elite":0},"Push a little":{"rookie":0.2432,"amateur":0.1674,"pro":0.1184,"master":0.0667,"elite":0},"Push a lot":{"rookie":0.339,"amateur":0.3667,"pro":0.4081,"master":0.3778,"elite":0.1429},"Push to limit":{"rookie":0.2534,"amateur":0.4151,"pro":0.4534,"master":0.5556,"elite":0.8571},"DM (sec)":{"rookie":0.562,"amateur":0.289,"pro":0.144,"master":0.069,"elite":0.042},"OT":{"rookie":23.19,"amateur":27.37,"pro":26.46,"master":21.89,"elite":7},"DF":{"rookie":22.74,"amateur":30.49,"pro":33.37,"master":41.92,"elite":30.33},"CT (dry)":{"rookie":19.23,"amateur":26.98,"pro":40.54,"master":45.21,"elite":51.17},"CT (malf)":{"rookie":7.31,"amateur":9.52,"pro":20.28,"master":24.24,"elite":35.5},"CTd >50":{"rookie":0.0625,"amateur":0.1777,"pro":0.3316,"master":0.4318,"elite":0.5714},"1 stop":{"rookie":0.1324,"amateur":0.2027,"pro":0.2622,"master":0.1818,"elite":0.2857},"2 stops":{"rookie":0.5147,"amateur":0.6088,"pro":0.5064,"master":0.6591,"elite":0.4286},"3 stops":{"rookie":0.2206,"amateur":0.1387,"pro":0.2082,"master":0.1591,"elite":0.2857},"4 stops":{"rookie":0.0735,"amateur":0.0316,"pro":0.0206,"master":0,"elite":0},"5 stops":{"rookie":0.0147,"amateur":0.0091,"pro":0.0026,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.49,"amateur":1.14,"pro":1.47,"master":1.52,"elite":1.29}},
  "Suzuka": {"Race Analysis":{"total":1624,"rookie":215,"amateur":1006,"pro":354,"master":45,"elite":4},"Pre-Race update":{"total":40,"rookie":16,"amateur":19,"pro":3,"master":2,"elite":0},"Keep on track":{"rookie":0.1299,"amateur":0.0595,"pro":0.0224,"master":0,"elite":0},"Push a little":{"rookie":0.303,"amateur":0.1717,"pro":0.112,"master":0.0426,"elite":0},"Push a lot":{"rookie":0.2814,"amateur":0.358,"pro":0.4034,"master":0.383,"elite":0},"Push to limit":{"rookie":0.2857,"amateur":0.4107,"pro":0.4622,"master":0.5745,"elite":1},"DM (sec)":{"rookie":0.681,"amateur":0.339,"pro":0.14,"master":0.128,"elite":0.05},"OT":{"rookie":26.43,"amateur":26.15,"pro":25.71,"master":20.43,"elite":45},"DF":{"rookie":25.04,"amateur":30.22,"pro":29.89,"master":36.88,"elite":42.5},"CT (dry)":{"rookie":21.13,"amateur":25.25,"pro":38.65,"master":48.43,"elite":66.25},"CT (malf)":{"rookie":9.33,"amateur":10.38,"pro":16.94,"master":26.88,"elite":38.75},"CTd >50":{"rookie":0.0791,"amateur":0.1421,"pro":0.3192,"master":0.5778,"elite":0.75},"1 stop":{"rookie":0.2186,"amateur":0.2266,"pro":0.1921,"master":0.2,"elite":0.25},"2 stops":{"rookie":0.3581,"amateur":0.5388,"pro":0.6808,"master":0.6667,"elite":0.25},"3 stops":{"rookie":0.3302,"amateur":0.1958,"pro":0.113,"master":0.1333,"elite":0.5},"4 stops":{"rookie":0.0465,"amateur":0.0268,"pro":0.0113,"master":0,"elite":0},"5 stops":{"rookie":0,"amateur":0.006,"pro":0.0028,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.42,"amateur":1.01,"pro":1.14,"master":0.53,"elite":0.75}},
  "Yas Marina": {"Race Analysis":{"total":2656,"rookie":347,"amateur":1651,"pro":581,"master":70,"elite":7},"Pre-Race update":{"total":70,"rookie":35,"amateur":23,"pro":10,"master":1,"elite":1},"Keep on track":{"rookie":0.144,"amateur":0.0597,"pro":0.0186,"master":0,"elite":0},"Push a little":{"rookie":0.2435,"amateur":0.1816,"pro":0.0846,"master":0.0282,"elite":0},"Push a lot":{"rookie":0.3141,"amateur":0.3722,"pro":0.3706,"master":0.3099,"elite":0.375},"Push to limit":{"rookie":0.2984,"amateur":0.3865,"pro":0.5262,"master":0.662,"elite":0.625},"DM (sec)":{"rookie":0.606,"amateur":0.288,"pro":0.101,"master":0.057,"elite":0.052},"OT":{"rookie":21.9,"amateur":27.32,"pro":27.39,"master":22.4,"elite":14.86},"DF":{"rookie":23.4,"amateur":29.9,"pro":32.21,"master":34.53,"elite":41},"CT (dry)":{"rookie":19.48,"amateur":28.05,"pro":45.31,"master":46.89,"elite":45.57},"CT (malf)":{"rookie":8.38,"amateur":11.94,"pro":22.17,"master":24.73,"elite":50.71},"CTd >50":{"rookie":0.0749,"amateur":0.2174,"pro":0.4733,"master":0.5429,"elite":0.4286},"1 stop":{"rookie":0.1066,"amateur":0.0927,"pro":0.074,"master":0.1,"elite":0},"2 stops":{"rookie":0.3718,"amateur":0.3943,"pro":0.4905,"master":0.4571,"elite":0.1429},"3 stops":{"rookie":0.3573,"amateur":0.3961,"pro":0.3494,"master":0.3857,"elite":0.7143},"4 stops":{"rookie":0.1268,"amateur":0.0878,"pro":0.0757,"master":0.0429,"elite":0.1429},"5 stops":{"rookie":0.0144,"amateur":0.017,"pro":0.0069,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.45,"amateur":1.25,"pro":1.31,"master":0.96,"elite":0.14}},
  "Yeongam": {"Race Analysis":{"total":3047,"rookie":374,"amateur":1904,"pro":667,"master":94,"elite":8},"Pre-Race update":{"total":132,"rookie":48,"amateur":61,"pro":20,"master":3,"elite":0},"Keep on track":{"rookie":0.1327,"amateur":0.0631,"pro":0.0175,"master":0,"elite":0},"Push a little":{"rookie":0.2986,"amateur":0.1985,"pro":0.1077,"master":0.0515,"elite":0},"Push a lot":{"rookie":0.327,"amateur":0.3481,"pro":0.4294,"master":0.3505,"elite":0.375},"Push to limit":{"rookie":0.2417,"amateur":0.3903,"pro":0.4454,"master":0.5979,"elite":0.625},"DM (sec)":{"rookie":0.65,"amateur":0.318,"pro":0.123,"master":0.068,"elite":0.083},"OT":{"rookie":24.21,"amateur":28.22,"pro":27.02,"master":20.6,"elite":13.75},"DF":{"rookie":24.46,"amateur":28.01,"pro":29.31,"master":40.7,"elite":28.5},"CT (dry)":{"rookie":20.07,"amateur":25.46,"pro":39.66,"master":45.91,"elite":44.25},"CT (malf)":{"rookie":9.43,"amateur":11.6,"pro":17.18,"master":26.57,"elite":49},"CTd >50":{"rookie":0.0856,"amateur":0.1717,"pro":0.3988,"master":0.5213,"elite":0.5},"1 stop":{"rookie":0.0615,"amateur":0.1203,"pro":0.1934,"master":0.2021,"elite":0.25},"2 stops":{"rookie":0.4465,"amateur":0.4968,"pro":0.4993,"master":0.4362,"elite":0.375},"3 stops":{"rookie":0.3262,"amateur":0.2826,"pro":0.2654,"master":0.3191,"elite":0.25},"4 stops":{"rookie":0.1123,"amateur":0.0741,"pro":0.036,"master":0.0319,"elite":0.125},"5 stops":{"rookie":0.0134,"amateur":0.0142,"pro":0.003,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.46,"amateur":1.25,"pro":1.63,"master":1.24,"elite":0.5}},
  "Zandvoort": {"Race Analysis":{"total":986,"rookie":132,"amateur":594,"pro":229,"master":30,"elite":1},"Pre-Race update":{"total":41,"rookie":14,"amateur":17,"pro":8,"master":2,"elite":0},"Keep on track":{"rookie":0.0753,"amateur":0.0376,"pro":0.0211,"master":0.0313,"elite":0},"Push a little":{"rookie":0.3288,"amateur":0.18,"pro":0.0549,"master":0,"elite":0},"Push a lot":{"rookie":0.3219,"amateur":0.3584,"pro":0.3797,"master":0.25,"elite":0},"Push to limit":{"rookie":0.274,"amateur":0.4239,"pro":0.5443,"master":0.7188,"elite":1},"DM (sec)":{"rookie":0.525,"amateur":0.244,"pro":0.117,"master":0.105,"elite":0},"OT":{"rookie":21.49,"amateur":27.34,"pro":29.14,"master":19.97,"elite":100},"DF":{"rookie":21.68,"amateur":27.97,"pro":33.62,"master":34.03,"elite":100},"CT (dry)":{"rookie":16.32,"amateur":22.52,"pro":33.13,"master":52.93,"elite":0},"CT (malf)":{"rookie":6.23,"amateur":10.63,"pro":15.43,"master":27.77,"elite":0},"CTd >50":{"rookie":0.0303,"amateur":0.1178,"pro":0.3188,"master":0.6333,"elite":0},"1 stop":{"rookie":0.1591,"amateur":0.2525,"pro":0.1878,"master":0.2333,"elite":1},"2 stops":{"rookie":0.6061,"amateur":0.6077,"pro":0.6987,"master":0.7333,"elite":0},"3 stops":{"rookie":0.1818,"amateur":0.1145,"pro":0.1048,"master":0.0333,"elite":0},"4 stops":{"rookie":0.0227,"amateur":0.0152,"pro":0.0087,"master":0,"elite":0},"5 stops":{"rookie":0,"amateur":0.0067,"pro":0,"master":0,"elite":0},"Driver Mistake (avg)":{"rookie":0.39,"amateur":1.05,"pro":1.24,"master":1.1,"elite":1}},
  "Zolder": {"Race Analysis":{"total":1754,"rookie":249,"amateur":1090,"pro":365,"master":47,"elite":3},"Pre-Race update":{"total":60,"rookie":24,"amateur":30,"pro":6,"master":0,"elite":0},"Keep on track":{"rookie":0.1472,"amateur":0.055,"pro":0.0135,"master":0.0426,"elite":0},"Push a little":{"rookie":0.317,"amateur":0.1901,"pro":0.0946,"master":0,"elite":0},"Push a lot":{"rookie":0.2906,"amateur":0.3559,"pro":0.427,"master":0.4894,"elite":0.3333},"Push to limit":{"rookie":0.2453,"amateur":0.3991,"pro":0.4649,"master":0.4681,"elite":0.6667},"DM (sec)":{"rookie":0.482,"amateur":0.247,"pro":0.099,"master":0.047,"elite":0.14},"OT":{"rookie":21.76,"amateur":26.22,"pro":24.41,"master":21.13,"elite":19.67},"DF":{"rookie":21.18,"amateur":29.22,"pro":33.25,"master":42.85,"elite":53.33},"CT (dry)":{"rookie":17.2,"amateur":27.25,"pro":38.85,"master":40.06,"elite":76.67},"CT (malf)":{"rookie":8.34,"amateur":12.1,"pro":19.58,"master":24.79,"elite":70},"CTd >50":{"rookie":0.0402,"amateur":0.1954,"pro":0.3918,"master":0.4255,"elite":0.6667},"1 stop":{"rookie":0.1084,"amateur":0.1908,"pro":0.1644,"master":0.1702,"elite":0},"2 stops":{"rookie":0.498,"amateur":0.4917,"pro":0.5726,"master":0.5319,"elite":0.3333},"3 stops":{"rookie":0.2731,"amateur":0.2532,"pro":0.2301,"master":0.2766,"elite":0.3333},"4 stops":{"rookie":0.0803,"amateur":0.056,"pro":0.0274,"master":0,"elite":0.3333},"5 stops":{"rookie":0.004,"amateur":0.0037,"pro":0,"master":0.0213,"elite":0},"Driver Mistake (avg)":{"rookie":0.54,"amateur":1.37,"pro":1.48,"master":1.17,"elite":0.67}},
  },

};
