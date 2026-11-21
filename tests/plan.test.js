// Regression tests for the race planner + data, run by `npm run verify` (node, no dependencies).
// Functions are taken from the userscript source and evaluated with the real gpro-data.js - and
// called with the SAME arguments the live page passes (the S113 R11 Las Vegas bugs slipped through
// because a harness gave the planner Medium's tyre life where the live page passed Rain's).
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ROOT = path.join(__dirname, '..');
global.window = global;
eval(fs.readFileSync(path.join(ROOT, 'gpro-data.js'), 'utf8').replace(/^var GPRO_DATA/m, 'global.GPRO_DATA'));
const src = fs.readFileSync(path.join(ROOT, 'GPRO_Strategy_Tool.user.js'), 'utf8');
function grabFn(name) {
  const a = src.indexOf(' function ' + name + '(');
  if (a < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', a), d = 0;
  for (;; i++) { if (src[i] === '{') d++; else if (src[i] === '}') { d--; if (!d) break; } }
  return src.slice(a, i + 1);
}
const line = (re) => { const l = src.split('\n').find((x) => re.test(x)); if (!l) throw new Error('line not found: ' + re); return l; };
const env = [line(/const TANK_MAX = /), line(/const PART_NAMES = /), line(/const PART_LVL_KEYS\s*=/), line(/const PART_WEAR_KEYS\s*=/),
  line(/const LAPS_PER_PERIOD_FALLBACK = /), line(/const LAPS_PER_PERIOD_CALIBRATION = /), line(/const LAST_STINT_SAFETY = /), line(/const PIT_RESERVE_LAPS = /), line(/const medianOf = /), line(/const WEATHER_MARGIN_MIN = /),
  ...['lookupGappTrack', 'gappLookupByName', 'gappFuelPerKm', 'gappCarPartLvl', 'gappCarPartWear', 'calcCarSetupGappSession', 'calcDriverWearFactor', 'numOrDefault',
    'wetFuelRatio', 'tyreWearLimit', 'weatherChangeEvidence', 'weatherChangeMarginLaps', 'analyzeWeather', 'rainStartEvidence', 'applyRaceStartWeather', 'buildPhaseFuelPlan', 'computeRaceFuelPlan',
    'simulateSavedFuel', 'racePlanProblems', 'calcBoostLapSuggestion'].map(grabFn)].join('\n');
const D = global.GPRO_DATA, GPRO_DATA = D; // eslint-disable-line no-unused-vars
const getRaceLog = () => [], logDebug = () => {}, logError = () => {}; // eslint-disable-line no-unused-vars
const FUEL_BASE = { 'Very Low': 2.0, Low: 2.2, Medium: 2.4, High: 2.6, 'Very High': 2.8 }; // eslint-disable-line no-unused-vars
const RISK_RAIN_WATCH = 20; // eslint-disable-line no-unused-vars
let failed = 0, passed = 0;
function test(name, fn) { try { fn(); passed++; console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); } }
eval(env + `
// ---- S113 R11 Las Vegas, as the live Race Setup page saw it (2026-11-18) ----
const LV = { laps: 50, dry: 4.65, locked: 41, rainLife: 57, mediumLife: 20 };
const lvWeather = { raceQ1RainPLow: 80, raceQ1RainPHigh: 85, raceQ2RainPLow: 10, raceQ2RainPHigh: 20, raceQ3RainPLow: 0, raceQ3RainPHigh: 0, raceQ4RainPLow: 0, raceQ4RainPHigh: 5 };
const lvProfile = () => { const an = analyzeWeather(lvWeather, LV.laps, 18); applyRaceStartWeather(an, LV.laps, true); return an.raceProfile; };
const lvTyre = { bestDry: { name: 'Medium', lifeLaps: LV.mediumLife }, results: [{ name: 'Rain', isRain: true, lifeLaps: LV.rainLife }, { name: 'Medium', lifeLaps: LV.mediumLife }] };
const fillsOf = (plan) => plan.stintFuels.slice(1).map((f, i) => ({ fill: f, lap: plan.stopLaps[i] }));
const problemsOf = (plan, boosts) => racePlanProblems({ laps: LV.laps, phases: lvProfile().phases, fuel: Object.assign({ lockedStart: LV.locked }, plan), fills: fillsOf(plan), boosts, tyre: lvTyre, dryRate: LV.dry, wetRatio: wetFuelRatio('Las Vegas') });

test('wet start: rain L1-18, dry from L19 (18 laps per forecast window)', () => {
  const ph = lvProfile().phases.map((p) => p.condition + p.startLap + '-' + p.endLap).join(' ');
  assert.strictEqual(ph, 'wet1-18 dry19-50');
});
test('live call (chosen compound = Rain) plans a fresh Medium set before 20 dry laps', () => {
  const plan = computeRaceFuelPlan(LV.laps, LV.dry, lvProfile(), 1, LV.locked, LV.locked, LV.rainLife, wetFuelRatio('Las Vegas'), LV.mediumLife);
  assert.deepStrictEqual(plan.stopLaps, [11, 19, 34]); // weather pit at the end of the first dry lap (L19)
  assert.deepStrictEqual(problemsOf(plan, [16, 32, 48]), []);
});
test('self-check catches the v6.44.1 bug (dry phase sized by Rain life: one Medium set for 32 laps)', () => {
  const plan = computeRaceFuelPlan(LV.laps, LV.dry, lvProfile(), 1, LV.locked, LV.locked, LV.rainLife, wetFuelRatio('Las Vegas'));
  assert.deepStrictEqual(plan.stopLaps, [11, 19]);
  assert.ok(problemsOf(plan, []).some((x) => /dry laps on one Medium set/.test(x)), 'expected a tyre-life problem');
});
test('no boost on the locked start fuel; self-check flags one', () => {
  const b = calcBoostLapSuggestion(LV.laps, 3, 'Easy', true, 50, null, 6.118, lvProfile(), LV.laps, [11, 18, 34], 11);
  assert.ok(b.laps.every((l) => l > 11), 'boost laps ' + b.laps);
  const plan = computeRaceFuelPlan(LV.laps, LV.dry, lvProfile(), 1, LV.locked, LV.locked, LV.rainLife, wetFuelRatio('Las Vegas'), LV.mediumLife);
  assert.ok(problemsOf(plan, [2, 9, 16]).some((x) => /locked start-fuel/.test(x)));
});
test('replaying GPRO-saved refuels 33/34 after 41 L: 6 stops (what the page held)', () => {
  const sim = simulateSavedFuel(LV.laps, lvProfile().phases, LV.dry, LV.dry * wetFuelRatio('Las Vegas'), 41, [33, 34, 0, 0, 0], LV.mediumLife);
  assert.strictEqual(sim.totalStops, 6);
});
// S113 R11 Las Vegas REAL result: rain to L19 (dry from L20, one lap past the plan). The 30 L fill
// before the forecast change ran dry on L19 -> fuel stop L19 + weather stop L20 (4 stops, P11).
const lvReal = [{ condition: 'wet', startLap: 1, endLap: 19, laps: 19 }, { condition: 'dry', startLap: 20, endLap: 50, laps: 31 }];
test('Las Vegas real weather: the old 30 L fill makes a fuel stop the lap before the weather stop', () => {
  const sim = simulateSavedFuel(LV.laps, lvReal, LV.dry, LV.dry * wetFuelRatio('Las Vegas'), 41, [30, 79, 81, 0, 0], LV.mediumLife);
  // reproduces the real report: Stop 1 L11 fuel, Stop 2 L19 fuel, Stop 3 L20 weather
  assert.deepStrictEqual(sim.stops.slice(0, 3), [11, 19, 20]);
});
test('fill before a forecast weather change carries a margin: rain one lap longer costs no extra stop', () => {
  const plan = computeRaceFuelPlan(LV.laps, LV.dry, lvProfile(), 1, LV.locked, LV.locked, LV.rainLife, wetFuelRatio('Las Vegas'), LV.mediumLife);
  const fills = plan.stintFuels.slice(1);
  const sim = simulateSavedFuel(LV.laps, lvReal, LV.dry, LV.dry * wetFuelRatio('Las Vegas'), 41, fills.concat([0, 0, 0]).slice(0, 5), LV.mediumLife);
  assert.ok(sim.totalStops <= 3 && !sim.ranOut, 'stops ' + sim.stops + ' fills ' + fills);
});
test('unlocked plan (what Q2 should set): start fuel reaches the weather change with the margin', () => {
  const plan = computeRaceFuelPlan(LV.laps, LV.dry, lvProfile(), 1, null, null, LV.rainLife, wetFuelRatio('Las Vegas'), LV.mediumLife);
  assert.strictEqual(plan.stopLaps[0], 19);
  const wet = LV.dry * wetFuelRatio('Las Vegas');
  assert.ok(plan.stintFuels[0] >= Math.round(21 * wet), 'start ' + plan.stintFuels[0] + ' < 21 wet laps');
});
test('wet laps burn less fuel than dry on every track with both factors', () => {
  const bad = Object.entries(D.gapp.trackData).filter(([, v]) => v[6] > 0 && v[7] > 0 && v[7] >= v[6]).map(([k]) => k);
  assert.deepStrictEqual(bad, []);
});
test('every track has setup, fuel, lap and wear data', () => {
  const miss = Object.entries(D.gapp.trackData).filter(([, v]) => v.length !== 14 || !(v[6] > 0) || !(v[12] > 0) || !(v[13] > 0)).map(([k]) => k);
  assert.deepStrictEqual(miss, []);
  const noWear = Object.keys(D.gapp.trackData).filter((k) => !D.gapp.wearData[k] || D.gapp.wearData[k].length !== 11);
  assert.deepStrictEqual(noWear, []);
});
// Setups = the user's calculator (rejca.cz setup_calc_basic, read 2026-11-18): Las Vegas with the
// real driver/car, Brands Hatch + Melbourne with its default driver - +-1 allowed (rounding).
const near = (a, b) => a.every((x, i) => Math.abs(x - b[i]) <= 1);
const setupOf = (track, T, wet, drv, lv, wr) => { const car = {}; PART_LVL_KEYS.forEach((k, i) => car[k] = lv[i]); PART_WEAR_KEYS.forEach((k, i) => car[k] = wr ? wr[i] : 0);
  const o = calcCarSetupGappSession(track, T, wet, drv, car); return [o['Front Wing'], o['Rear Wing'], o['Engine'], o['Brakes'], o['Gearbox'], o['Suspension']]; };
test('setups match the user\\'s calculator (Las Vegas real driver, Brands Hatch, Melbourne)', () => {
  const real = { concentration: 196, talent: 130, aggressiveness: 0, experience: 118, techInsight: 95, stamina: 3, weight: 83 };
  const def = { concentration: 100, talent: 80, aggressiveness: 0, experience: 50, techInsight: 50, stamina: 50, weight: 75 };
  // part wear feeds the setup formula too: the real car's wear at the time (UpdateCar, 2026-11-18)
  const rl = [2, 4, 2, 2, 3, 2, 2, 3, 4, 3, 2], rw = [73, 42, 83, 85, 23, 60, 38, 64, 32, 46, 32], l1 = Array(11).fill(1);
  [['Las Vegas', 30, false, real, rl, rw, [223, 370, 696, 676, 648, 643]], ['Las Vegas', 34, true, real, rl, rw, [362, 424, 605, 737, 491, 543]], ['Las Vegas', 20, false, real, rl, rw, [179, 315, 732, 616, 688, 703]],
   ['Brands Hatch', 30, false, def, l1, null, [600, 594, 630, 510, 607, 660]], ['Brands Hatch', 34, true, def, l1, null, [745, 658, 548, 571, 450, 555]],
   ['Melbourne', 30, false, def, l1, null, [435, 631, 599, 738, 655, 313]], ['Melbourne', 34, true, def, l1, null, [580, 695, 517, 799, 498, 208]]].forEach(([t, T, w, d, lv, wr, want]) => {
    const got = setupOf(t, T, w, d, lv, wr);
    assert.ok(near(got, want), t + ' ' + T + (w ? ' wet' : ' dry') + ': ' + got.join('/') + ' vs ' + want.join('/'));
  });
});
// Real part wear (S113 R1-R9 dry races, read live from RaceAnalysis 2026-11-18): the raw model must
// stay within 1.5 %-points per part per race on average (it was 1.10).
test('part wear model vs real S113 dry races', () => {
  const R = [['Portimao', [1,1,1,1,1,1,1,1,1,1,1], [0,0,0,0,0,0,0,0,0,0,0], [16,14,16,17,28,14,14,15,21,31,12], [174,130,108]],
    ['Bremgarten', [1,1,1,1,1,1,1,1,1,1,1], [16,14,16,17,28,14,14,15,21,31,12], [39,27,28,29,52,33,23,36,39,56,20], [174,130,109]],
    ['Austin', [1,1,1,1,1,1,1,1,1,1,1], [39,27,28,29,52,33,23,36,39,56,20], [50,49,46,47,65,45,35,54,61,66,30], [174,130,110]],
    ['Bucharest Ring', [1,2,1,1,1,1,1,1,2,1,1], [50,0,46,47,65,45,35,54,0,66,30], [69,38,65,67,89,62,50,82,35,87,47], [174,130,111]],
    ['Mexico City', [1,2,1,1,2,1,1,2,2,2,1], [69,38,65,67,0,62,50,0,35,0,47], [78,54,76,77,14,72,63,20,45,23,59], [174,130,112]],
    ['Oesterreichring', [1,2,1,1,2,1,1,2,2,2,1], [78,54,76,77,14,72,63,20,45,23,59], [92,83,93,97,29,85,77,37,69,37,68], [180,130,113]],
    ['Interlagos', [2,3,2,2,2,2,1,2,3,2,1], [0,0,0,0,29,0,77,37,0,37,68], [25,35,20,16,57,15,91,58,35,63,81], [180,130,114]],
    ['Slovakiaring', [2,3,2,2,2,2,2,3,3,3,2], [34,56,34,32,75,26,0,0,59,0,0], [47,85,49,49,97,37,10,27,77,23,9], [191,130,115]]];
  const errs = [];
  R.forEach(([t, lv, st, fin, d]) => { const w = lookupGappTrack(t, 'wearData').values, df = calcDriverWearFactor({ concentration: d[0], talent: d[1], experience: d[2] });
    PART_NAMES.forEach((n, i) => { if (fin[i] < 100) errs.push(Math.abs(fin[i] - st[i] - w[i] * df)); }); });
  const mae = errs.reduce((a, b) => a + b, 0) / errs.length;
  assert.ok(mae < 1.5, 'mean abs error ' + mae.toFixed(2));
});
`);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
