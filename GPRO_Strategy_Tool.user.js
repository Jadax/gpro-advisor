// ==UserScript==
// @name GPRO Strategy Tool
// @namespace https://gpro.net
// @version 6.8.2
// @description Fuel setup, weather analysis, car upgrade recommendations for GPRO. Author: Tushant Sharma.
// @author Tushant Sharma
// @match https://www.gpro.net/gb/gpro.asp
// @match https://www.gpro.net/gb/Qualify.asp
// @match https://www.gpro.net/gb/Qualify2.asp
// @match https://www.gpro.net/gb/RaceSetup.asp
// @match https://www.gpro.net/gb/UpdateCar.asp
// @match https://www.gpro.net/gb/StaffAndFacilities.asp
// @match https://www.gpro.net/gb/DriverProfile.asp*
// @match https://www.gpro.net/gb/TrackDetails.asp*
// @match https://www.gpro.net/gb/Suppliers.asp
// @match https://www.gpro.net/gb/Testing.asp
// @match https://www.gpro.net/gb/TrainingSession.asp
// @match https://www.gpro.net/gb/AvailDrivers.asp*
// @match https://www.gpro.net/gb/AvailTechDirectors.asp*
// @match https://www.gpro.net/gb/NegotiationsOverview.asp
// @match https://www.gpro.net/gb/NegotiateSponsor.asp*
// @match https://app.gpro.net/*
// @grant GM_xmlhttpRequest
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_registerMenuCommand
// @grant GM_setClipboard
// @connect gpro.net
// @connect www.gpro.net
// @connect app.gpro.net
// @require file:///G:/My%20Drive/VibeCoding/GPRO%20Tool/gpro-data.js?v=5.4.0
// @run-at document-idle
// ==/UserScript==

// GPRO Strategy Tool v6.6.0
// Made with ❤ by Tushant Sharma
// A comprehensive strategy tool for Grand Prix Racing Online providing
// fuel calculations, tyre strategy, car setup recommendations,
// weather analysis, and car parts wear prediction.

(function () {
 'use strict';
 const D = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA) ? GPRO_DATA : {};

 // Every GM_xmlhttpRequest must set this - without a timeout a hung request never settles and
 // any `await` on it blocks that render path permanently.
 const NET_TIMEOUT_MS = 20000;
 const TANK_MAX = 180;
 const PART_NAMES = ['Chassis','Engine','Front Wing','Rear Wing','Underbody','Sidepods','Cooling','Gearbox','Brakes','Suspension','Electronics'];
 const PART_LVL_KEYS = ['lvlChassis','lvlEngine','lvlFWing','lvlRWing','lvlUnderbody','lvlSidepods','lvlCooling','lvlGear','lvlBrakes','lvlSusp','lvlElectronics'];
 const PART_WEAR_KEYS = ['usaChassis','usaEngine','usaFWing','usaRWing','usaUnderbody','usaSidepods','usaCooling','usaGear','usaBrakes','usaSusp','usaElectronics'];
 const PART_OPT_KEYS = ['chassisOptions','engineOptions','fWingOptions','rWingOptions','underbodyOptions','sidepodsOptions','coolingOptions','gearOptions','brakesOptions','suspOptions','electronicsOptions'];
 const FAST_WEAR = D.wearConstants?.fastWearParts || ['Chassis','Engine','Front Wing','Rear Wing','Gearbox'];
 const CRITICAL_WEAR = D.wearConstants?.critical ?? 10;
 const FAST_ALERT = D.wearConstants?.fastAlert ?? 30;
 const SLOW_ALERT = D.wearConstants?.slowAlert ?? 15;

 const COMPOUNDS = D.tyreConstants?.compounds || {
 'Extra Soft': { tyreLife: 12, speedDelta: -1.5, gripLevel: 'Very High' },
 'Soft': { tyreLife: 18, speedDelta: -0.8, gripLevel: 'High' },
 'Medium': { tyreLife: 26, speedDelta: 0, gripLevel: 'Medium' },
 'Hard': { tyreLife: 38, speedDelta: 0.5, gripLevel: 'Low' },
 'Rain': { tyreLife: 22, speedDelta: 0, gripLevel: 'Rain' },
 };
 const WEAR_MULTIPLIERS = D.tyreConstants?.wearMultipliers || {
 'Very Low': 0.67, 'Low': 0.83, 'Medium': 1.0, 'High': 1.25, 'Very High': 1.54,
 };
 const FUEL_BASE = D.tyreConstants?.fuelBase || {
 'Very Low': 1.8, 'Low': 2.0, 'Medium': 2.4, 'High': 2.8, 'Very High': 3.2,
 };

 // ============================================================
 // STORAGE
 // ============================================================
 function getToken() { return GM_getValue('gpro_token', ''); }
 function getLang() {
 const m = location.pathname.match(/\/(\w{2})\//);
 return m ? m[1] : 'gb';
 }
 // Use the page's own host for API calls (www.gpro.net vs gpro.net matters -
 // the backend only reliably answers/CORS-allows the host you're actually on).
 function getApiHost() {
 return location.hostname && location.hostname.endsWith('gpro.net') ? location.hostname : 'gpro.net';
 }

 function formatTimestamp(ts) {
 if (!ts) return '—';
 const d = new Date(ts);
 return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
 }

 function formatRelativeTime(ts) {
 if (!ts) return '—';
 const diffSec = Math.max(0, (Date.now() - ts) / 1000);
 if (diffSec < 60) return 'Just now';
 const min = Math.floor(diffSec / 60);
 if (min < 60) return `${min}m ago`;
 const hr = Math.floor(min / 60);
 if (hr < 24) return `${hr}h ago`;
 const day = Math.floor(hr / 24);
 return `${day}d ago`;
 }


 function getCtr() { return parseInt(GM_getValue('gpro_ctr', '0'), 10) || 0; }
 function setCtr(v) { GM_setValue('gpro_ctr', String(parseInt(v, 10) || 0)); }

 // Severity-tagged logging - the whole file used to log everything (retries, network failures,
 // parser diagnostics) through console.log with no way to filter devtools by severity. Genuine
 // failures now go through logError; verbose parse/fallback tracing stays console.log by design.
 function logError(...args) { console.error('[GPRO]', ...args); }

 // Verbose parser/fallback tracing. Was 27 bare console.log calls firing on every page load for
 // every user; that's devtools noise nobody asked for in a shipped build, and it made real errors
 // harder to spot. Off by default - enable with `localStorage.gproDebug = '1'` (or the Tampermonkey
 // menu) when actually diagnosing a parse failure. logError stays unconditional.
 const DEBUG = (() => { try { return localStorage.getItem('gproDebug') === '1'; } catch (e) { return false; } })();
 function logDebug(...args) { if (DEBUG) console.log('[GPRO]', ...args); }

 // Money strings from GPRO are dot-thousands, e.g. "$5.902.387" - never reinvent this parse.
 function parseGproCash(str) {
 if (str == null) return 0;
 const digits = String(str).replace(/[^0-9]/g, '');
 return digits ? parseInt(digits, 10) : 0;
 }

 // ============================================================
 // API CLIENT WITH CACHING
 // ============================================================
 // Bumped from 5 to 20 minutes - GPRO's API token is capped at ~100 requests per race, and the old
 // 5-minute TTL meant every page revisit past that window re-fetched all 6-7 endpoints again, easily
 // burning through the budget over a normal race-weekend browsing session. 20 minutes still catches
 // real mid-session changes (weather updates, car wear from a race) without re-fetching on every click.
 const CACHE_TTL = 20 * 60 * 1000;

 // Hard per-race request budget, enforced below the game's real ~100 cap. Once hit, apiGet stops
 // making live requests entirely and falls straight to cache/stale data - "no more API calls unless
 // absolutely necessary" per explicit instruction. Not auto-reset (no reliable "new race started"
 // signal without spending a request to check) - reset manually via the Tampermonkey menu each race
 // weekend, or "Clear Cache" resets it too since a blown budget usually means a fresh start is due.
 // Lowered from 85 - DOM-first resolution (getDataSmart) now covers most of what used to force a
 // real API call every page load, so the remaining real usage per race should be small; keeping the
 // budget itself tight too is a second independent safety net in case DOM/stale coverage has a gap.
 const API_CALL_BUDGET = 40;
 function getApiCallCount() { return parseInt(GM_getValue('gpro_api_call_count', '0')) || 0; }
 function incApiCallCount() { GM_setValue('gpro_api_call_count', String(getApiCallCount() + 1)); }
 function resetApiCallCount() { GM_setValue('gpro_api_call_count', '0'); }

 function getCachedData(key) {
 try {
 const raw = GM_getValue('cache_' + key, null);
 if (!raw) return null;
 const cached = JSON.parse(raw);
 if (Date.now() - cached.time > CACHE_TTL) return null;
 return cached.data;
 } catch (e) { return null; }
 }

 function setCachedData(key, data) {
 try {
 GM_setValue('cache_' + key, JSON.stringify({ time: Date.now(), data }));
 } catch (e) { /* storage full, ignore */ }
 }

 // Long-lived fallback cache: no TTL, survives token expiry. Written on every
 // successful fetch, read only when a live request fails, so the panel keeps
 // showing (visibly stale) data instead of going blank when the token dies.
 function getStaleData(endpoint) {
 try {
 const raw = GM_getValue('stale_api_' + endpoint, null);
 if (!raw) return null;
 return JSON.parse(raw); // { time, data }
 } catch (e) { return null; }
 }

 function setStaleData(endpoint, data) {
 try {
 GM_setValue('stale_api_' + endpoint, JSON.stringify({ time: Date.now(), data }));
 } catch (e) { /* storage full, ignore */ }
 }

 // Resolves with stale data (marked __stale/__staleTime) if available, otherwise rejects with the original error.
 function fallbackOrReject(endpoint, err, resolve, reject) {
 const stale = getStaleData(endpoint);
 if (stale) {
 resolve(Object.assign({}, stale.data, { __stale: true, __staleTime: stale.time, __staleReason: err.message }));
 return;
 }
 reject(err);
 }

 function apiGet(endpoint, retries = 2) {
 return new Promise((resolve, reject) => {
 const token = getToken();
  if (!token) return fallbackOrReject(endpoint, new Error('No API token set — using cached data only. Visit the relevant pages to refresh.'), resolve, reject);

 // Check cache first
 const cacheKey = 'api_' + endpoint;
 const cached = getCachedData(cacheKey);
 if (cached) {
 resolve(cached);
 return;
 }

 // Hard budget cap - don't even attempt the request once we're at the limit, just degrade to
 // stale/cache like any other failure mode. Only counts real attempts (cache hits above never
 // reach here), so this tracks actual API spend, not total apiGet() calls. Also respects GPRO's
 // OWN authoritative `apiRequestsRemaining` (from /Office, see onload below) when we have it -
 // that's real, ours is just an estimate that can't account for calls this script didn't make
 // (other tabs).
 const realRemaining = GM_getValue('gpro_api_requests_remaining', null);
 if (getApiCallCount() >= API_CALL_BUDGET || (realRemaining !== null && parseInt(realRemaining) <= 3)) {
 return fallbackOrReject(endpoint, new Error(`API call budget reached (${API_CALL_BUDGET}/race, GPRO reports ${realRemaining ?? '?'} left) - reset via Tampermonkey menu once a new race has started`), resolve, reject);
 }
 incApiCallCount();

 const lang = getLang();
 const url = `https://${getApiHost()}/${lang}/backend/api/v2${endpoint}`;
 GM_xmlhttpRequest({
 method: 'GET',
 url: url,
 // Real bug fixed 2026-07-29: no timeout was set and no ontimeout handler existed, so a request
 // that never came back left the awaiting caller (init()) hanging forever - the panel sat on
 // "Loading..." with no error, no fallback to stale cache, and no retry button.
 timeout: NET_TIMEOUT_MS,
 headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' },
 ontimeout() { fallbackOrReject(endpoint, new Error(`Request timed out after ${NET_TIMEOUT_MS / 1000}s - using cached data if available.`), resolve, reject); },
 onload(r) {
 // Check HTTP status first
 if (r.status === 502 || r.status === 503 || r.status === 429) {
 if (retries > 0) {
 logDebug(`${r.status} on ${endpoint}, retrying (${retries} left)...`);
 setTimeout(() => apiGet(endpoint, retries - 1).then(resolve).catch(reject), 1500);
 return;
 }
 return fallbackOrReject(endpoint, new Error(`Server error (${r.status}) on ${endpoint} - try again in a moment`), resolve, reject);
 }
 if (r.status === 401 || r.status === 403) {
 return fallbackOrReject(endpoint, new Error('Token expired — using cached data.'), resolve, reject);
 }
 try {
 const d = JSON.parse(r.responseText);
 if (d.loggedOut) return fallbackOrReject(endpoint, new Error('Token expired — using cached data.'), resolve, reject);
 // /Office's response carries GPRO's OWN authoritative remaining-request count
 // (`apiRequestsRemaining` - confirmed in gpro-public-api.yml) - capture it whenever we get
 // it so the real number can be shown instead of just our own estimate.
 if (endpoint === '/Office' && d.apiRequestsRemaining !== undefined) {
 GM_setValue('gpro_api_requests_remaining', String(d.apiRequestsRemaining));
 }
 // Cache successful response (both short-lived and long-lived fallback)
 setCachedData(cacheKey, d);
 setStaleData(endpoint, d);
 resolve(d);
 } catch (e) { fallbackOrReject(endpoint, new Error('Invalid API response'), resolve, reject); }
 },
 onerror() {
 if (retries > 0) {
 logDebug(`Network error on ${endpoint}, retrying (${retries} left)...`);
 setTimeout(() => apiGet(endpoint, retries - 1).then(resolve).catch(reject), 1500);
 return;
 }
 fallbackOrReject(endpoint, new Error('Network error - are you logged in?'), resolve, reject);
 }
 });
 });
 }

 // DOM-first data resolver: "no API calls unless we don't have a backup plan" (explicit constraint,
 // 2026-07-19 - the API token is capped at ~100 calls/race and automatic per-page-load fetching blew
 // straight through that). Tries a live parse of the CURRENT page (zero network cost) first, then any
 // previously-captured stale/background data (also zero network cost, regardless of age - a slightly
 // old driver profile beats spending a real request), and only calls the real API as a genuine last
 // resort. Use this instead of calling apiGet() directly wherever a DOM or stale substitute exists.
 async function getDataSmart(endpoint, domParseFn) {
 if (domParseFn) {
 let domData = null;
 try { domData = domParseFn(); } catch (e) { /* ignore, fall through */ }
 if (domData) return domData;
 }
 const stale = getStaleData(endpoint);
 if (stale) {
 return Object.assign({}, stale.data, { __stale: true, __staleTime: stale.time });
 }
 return apiGet(endpoint).catch(() => null);
 }

 // Strict DOM-only resolution - live DOM parse, then the DOM-fed stale cache (written by
 // runPassiveCapture/backgroundCaptureAuxPages when the user visits/passively background-fetches
 // the dedicated page), but NEVER falls through to a real API call. Used for the categories the
 // user asked to keep off the API budget entirely: Practice/Weather, Track Profile, Driver
 // Profile, Tyre Suppliers, Staff/Facilities, Car Data, Testing.
 // Returns null (same contract as getDataSmart, not a truthy sentinel object) when nothing's
 // available yet, so every existing `if (track)`/`track || {}` falsy-check throughout the file
 // keeps working unchanged - the difference from getDataSmart is purely "never call the API",
 // not a different return shape callers need to special-case.
 function getDataDomOnly(endpoint, domParseFn) {
 if (domParseFn) {
 let domData = null;
 try { domData = domParseFn(); } catch (e) { /* ignore, fall through */ }
 // Real bug: a successful live parse was returned to the caller but never persisted, so
 // e.g. visiting Qualify.asp (which live-parses car data via parseQualifyCarDOM) never
 // updated the stale cache the Home dashboard's freshness table reads - the dashboard kept
 // showing "Missing"/old data even right after a page that visibly had fresh data on it.
 // Persist every successful live parse here, same as passive capture does, so any page with
 // a working domParseFn also doubles as a capture point for the dashboard/other pages.
 if (domData) { setStaleData(endpoint, domData); return domData; }
 }
 const stale = getStaleData(endpoint);
 if (stale) {
 return Object.assign({}, stale.data, { __stale: true, __staleTime: stale.time });
 }
 return null;
 }

 // ============================================================
 // STAFF/TD INFO (for gapp.pitTimeCalc - see calcTyreStrategyGapp)
 // Field names confirmed 2026-07-19 against gpro-public-api.yml (official OpenAPI spec, sitting in
 // repo root unreferenced until now - always check it before guessing a new field/endpoint name).
 // Staff concentration/stress live on /StaffAndFacilities (`concentration`, `stressHandling`), NOT
 // on /Office as previously guessed - `office` only has `tdId`. TD endpoint is `/TDProfile`, not
 // `/TechDProfile` (previous guess, silently 404'd - never triggered in practice since Amateur can't
 // sign a TD at all, so `tdId` was always empty and this branch never ran).
 // ============================================================
 async function buildStaffTdInfo(office, staff) {
 if (!office && !staff) return null;
 const staffConcentration = parseInt(staff && staff.concentration) || 0;
 const staffStress = parseInt(staff && staff.stressHandling) || 0;
 const tdId = office && office.tdId;
 let tdExperience = 0, tdPitCoordination = 0, hasTd = false;
 if (tdId) {
 // DOM-first: try stale cache from background capture, then API as last resort
 const td = await getDataSmart('/TDProfile').catch(() => null);
 if (td) {
  tdExperience = parseInt(td.experience) || 0;
  tdPitCoordination = parseInt(td.pitCoord) || 0;
  hasTd = true;
 }
 }
 return { staffConcentration, staffStress, tdExperience, tdPitCoordination, hasTd };
 }

 // ============================================================
 // PAGE DETECTION
 // ============================================================
 function detectPage() {
 const h = location.href;
 if (h.includes('gpro.asp') && !h.includes('Qualify') && !h.includes('RaceSetup') && !h.includes('UpdateCar') && !h.includes('StaffAnd')) return 'home';
 if (h.includes('Qualify.asp') && !h.includes('Qualify2')) return 'qualify1';
 if (h.includes('Qualify2.asp')) return 'qualify2';
 if (h.includes('RaceSetup.asp')) return 'raceSetup';
 if (h.includes('UpdateCar.asp')) return 'updateCar';
 if (h.includes('StaffAndFacilities.asp')) return 'staff';
 if (h.includes('TrainingSession.asp')) return 'training';
 if (h.includes('AvailDrivers.asp')) return 'marketDrivers';
 if (h.includes('AvailTechDirectors.asp')) return 'marketTDs';
  if (h.includes('NegotiationsOverview.asp')) return 'negotiations';
  if (h.includes('NegotiateSponsor.asp')) return 'negotiateSponsor';
  if (h.includes('DriverProfile.asp')) return 'driverOffer';
  return null;
 }

 // ============================================================
 // INLINE STYLE HELPERS
 // ============================================================
 function barStyle(pct, color) {
 return `height:100%;border-radius:7px;background:${color};width:${Math.min(100, Math.max(0, pct))}%;transition:width 0.3s;`;
 }

 // ============================================================
 // VISUAL REFRESH (2026-07-29) — warmer, softer, snappier chrome around the same semantic
 // verdict colors (good/warn/bad/info) used in hundreds of call sites throughout this file.
 // Deliberately NOT touching those hues here - only the structural "chrome" (panel/header/
 // section/row/bar styling), which is fully centralized through ST/mkSection/mkRow/mkRec/
 // barStyle/mkInlineBar, so this one edit reaches every rendered panel without needing to touch
 // each render* function individually.
 // ============================================================
 const PALETTE = {
 bg: '#12151d', // panel background - warm-neutral near-black, softer than flat slate
 bgCard: '#1a1f2b', // section "card" background, one step lighter than the panel
 bgCardHover: '#20263480',
 border: '#262c3b',
 borderSoft: '#1f2430',
 text: '#e9ebf2', // warm off-white, easier on the eyes than pure white
 textDim: '#9aa3b8',
 textMuted: '#6b7386',
 accent: '#5aa3f5', // primary blue accent (kept close to gpro.net's own brand blue)
 accentSoft: '#5aa3f533',
 warm: '#f5b942', // warm amber highlight, used sparingly for a friendly touch
 };

 // Injects one shared <style> block (scrollbar, transitions, hover states, keyframes) so the
 // hundreds of inline `style="..."` attributes throughout this file don't each need their own
 // hover/transition rules. Idempotent - safe to call on every createPanel().
 function injectGlobalStyles() {
 if (document.getElementById('gpro-global-style')) return;
 const style = document.createElement('style');
 style.id = 'gpro-global-style';
 style.textContent = `
 @keyframes gpro-fade-in { from { opacity:0; transform:translateY(-4px) scale(0.99); } to { opacity:1; transform:translateY(0) scale(1); } }
 #gpro-panel { animation: gpro-fade-in 0.18s ease-out; }
 #gpro-panel * { box-sizing:border-box; }
 #gpro-panel ::-webkit-scrollbar { width:8px; height:8px; }
 #gpro-panel ::-webkit-scrollbar-track { background:transparent; }
 #gpro-panel ::-webkit-scrollbar-thumb { background:${PALETTE.border}; border-radius:8px; }
 #gpro-panel ::-webkit-scrollbar-thumb:hover { background:${PALETTE.accent}77; }
 #gpro-panel .gpro-card { background:${PALETTE.bgCard}; border:1px solid ${PALETTE.borderSoft}; border-radius:10px; padding:9px 11px; margin-bottom:10px; transition:border-color 0.15s ease, transform 0.15s ease; }
 #gpro-panel .gpro-icon-btn { cursor:pointer; color:${PALETTE.textDim}; border-radius:6px; padding:2px 6px; line-height:1; transition:background 0.15s ease, color 0.15s ease; }
 #gpro-panel .gpro-icon-btn:hover { background:#ffffff14; color:${PALETTE.text}; }
 #gpro-panel button { transition:filter 0.15s ease, transform 0.1s ease, opacity 0.15s ease; }
 #gpro-panel button:hover:not(:disabled) { filter:brightness(1.12); }
 #gpro-panel button:active:not(:disabled) { transform:translateY(1px); }
 #gpro-panel button:disabled { opacity:0.55; cursor:not-allowed; }
 #gpro-panel a { transition:color 0.15s ease; }
 #gpro-panel [data-jump-to] { transition:transform 0.12s ease, filter 0.12s ease; }
 #gpro-panel [data-jump-to]:hover { transform:translateY(-1px); filter:brightness(1.15); }
 #gpro-panel details summary { transition:color 0.15s ease; }
 #gpro-panel table tr:hover td { background:#ffffff08; }
 `;
 document.head.appendChild(style);
 }

 const ST = {
 panel: `position:fixed;top:50px;right:10px;z-index:99999;width:370px;max-height:88vh;overflow-y:auto;background:${PALETTE.bg};color:${PALETTE.text};border-radius:14px;box-shadow:0 20px 50px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);font-family:-apple-system,system-ui,"Segoe UI",sans-serif;font-size:12px;line-height:1.55;transition:max-height 0.25s ease;-webkit-font-smoothing:antialiased;`,
 header: `background:linear-gradient(135deg,#1d3a5f,#0d1420);padding:11px 14px;border-radius:14px 14px 0 0;display:flex;justify-content:space-between;align-items:center;cursor:move;user-select:none;border-bottom:2px solid ${PALETTE.warm}55;`,
 headerH3: `margin:0;font-size:14px;color:${PALETTE.text};font-weight:700;letter-spacing:0.2px;`,
 closeBtn: `cursor:pointer;color:${PALETTE.textDim};font-size:20px;padding:0 4px;line-height:1;`,
 body: 'padding:12px;',
 section: 'margin-bottom:12px;',
 sectionTitle: `font-size:11px;font-weight:700;color:${PALETTE.accent};text-transform:uppercase;letter-spacing:0.7px;padding-left:8px;margin-bottom:8px;border-left:3px solid ${PALETTE.accent};`,
 row: 'display:flex;justify-content:space-between;align-items:baseline;padding:3px 0;',
 label: `color:${PALETTE.textDim};`,
 value: `color:${PALETTE.text};font-weight:600;`,
 rec: 'padding:7px 11px;margin:5px 0;border-radius:8px;font-size:11px;border-left:3px solid;line-height:1.5;',
 barOuter: `height:12px;background:${PALETTE.borderSoft};border-radius:7px;overflow:hidden;margin:3px 0;`,
 partRow: `display:flex;align-items:center;gap:4px;padding:5px 0;border-bottom:1px solid ${PALETTE.borderSoft};`,
 wearBar: `height:6px;background:${PALETTE.borderSoft};border-radius:3px;overflow:hidden;`,
 loading: `text-align:center;padding:30px;color:${PALETTE.textMuted};`,
 };

 // Semantic verdict colors - single source of truth. These carry MEANING (used at hundreds of
 // call sites), unlike PALETTE's chrome colors; don't re-declare them inline or change the hues
 // casually. Was duplicated verbatim in mkRec and mkDecisionBoard until 2026-07-29.
 const VERDICT = { good: '#10b981', warn: '#f59e0b', bad: '#ef4444', info: '#3b82f6' };

 // Escapes text before it goes into an innerHTML template. Everything this tool renders is built
 // by string-concatenating into innerHTML, and some of those strings are SCRAPED off gpro.net
 // pages (driver/TD names from market listings, track names, sponsor text). Those are
 // game-generated today so there's no known live injection path, but nothing structurally
 // prevents one: a scraped string containing markup would be re-parsed as HTML on insertion.
 // Use this for any value that originates from scraped page content rather than from our own code.
 function esc(v) {
 if (v === null || v === undefined) return '';
 return String(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
 }

 function mkRec(text, type) {
 const colors = VERDICT;
 const c = colors[type] || colors.info;
 return `<div style="${ST.rec}border-color:${c};background:${c}14;">${text}</div>`;
 }

 // Small non-blocking badge shown when one or more inputs fell back to stale cached data
 // (e.g. token expired). Silent by design - doesn't interrupt the panel, just discloses it.
 function mkStaleBanner(...sources) {
 const stale = sources.filter(s => s && s.__stale);
 if (stale.length === 0) return '';
 const oldest = Math.min(...stale.map(s => s.__staleTime));
 return `<div style="font-size:9px;color:#f59e0b;background:#f59e0b11;border-left:3px solid #f59e0b;padding:4px 8px;margin-bottom:8px;border-radius:0 4px 4px 0;">🟡 Using cached data from ${formatTimestamp(oldest)} — fresh data will load on next page visit.</div>`;
 }

 function mkRow(label, value) {
 return `<div style="${ST.row}"><span style="${ST.label}">${label}</span><span style="${ST.value}">${value}</span></div>`;
 }

 // Tiny inline bar for season overview tables - renders a coloured bar proportional to value (0-1)
 function mkInlineBar(ratio, color, widthPx) {
 const w = widthPx || 26;
 return `<span style="display:inline-block;width:${w}px;height:4px;background:${PALETTE.borderSoft};border-radius:3px;overflow:hidden;vertical-align:middle;margin-right:3px;"><span style="display:block;height:100%;width:${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%;background:${color};border-radius:3px;transition:width 0.3s ease;"></span></span>`;
 }

 // GAPP's stop counts are primary; this shows our own calibrated stop counts alongside for
 // visibility (a numeric check at Spa found GAPP runs ~2x fewer stops for dry compounds than
 // our calibrated numbers - worth keeping visible even though GAPP now drives the rec).
 function mkGappStopsCrossCheck(tyre) {
 if (!tyre || !tyre.ownCrossCheck) return '';
 const parts = Object.entries(tyre.ownCrossCheck).map(([name, stops]) => `${name}=${stops}`).join(', ');
 return `<div style="font-size:9px;color:#6b7280;margin-top:2px;">own-calibration stop-count cross-check: ${parts}</div>`;
 }

 // Visibility into whether TD/staff pit-time influence is actually active. Amateur league can't
 // sign a TD at all, so this will read "no TD" until the account is promoted to Pro+.
 function mkTdStatusNote(staffTd) {
 if (!staffTd) return '';
 const status = staffTd.hasTd
 ? `TD active (exp=${staffTd.tdExperience}, pitCoord=${staffTd.tdPitCoordination})`
 : 'no TD (Amateur league, or none signed)';
 return `<div style="font-size:9px;color:#6b7280;margin-top:2px;">Pit-time influence: staff conc=${staffTd.staffConcentration}, stress=${staffTd.staffStress} | ${status}</div>`;
 }

 // Which model actually drove this tyre recommendation - priority is per-track formula >
 // calibrated data (fallback only, not ground truth) > generic own formula.
 function mkTyreSourceNote(tyre) {
 if (!tyre || !tyre.source) return '';
 const label = tyre.source === 'gapp' ? 'per-track formula'
 : tyre.source === 'calibrated' ? 'calibrated data (no per-track data - calibrated fallback)'
 : 'generic formula (no per-track data available)';
 let html = `<div style="font-size:9px;color:#60a5fa;margin-top:2px;">Recommendation source: ${label}</div>`;
 if (tyre.supplierFactorUnknown) {
 html += `<div style="font-size:9px;color:#f59e0b;margin-top:2px;">Tyre supplier "${tyre.supplierFactorUnknown}" has no verified wear/compound factor data yet - using the less-precise fallback above instead of the per-track formula.</div>`;
 }
 if (tyre.calibratedDivergence && tyre.calibratedDivergence.length) {
 html += `<div style="font-size:9px;color:#f59e0b;margin-top:2px;">Per-track vs calibrated model disagree on stop count - ${tyre.calibratedDivergence.join('; ')}</div>`;
 }
 return html;
 }

 // Shared weather-forecast section, used by both renderQualify and renderRaceSetup.
 // rainLabel/showAvg let each call site keep its existing summary-line wording.
 function mkWeatherForecastSection(analyze, opts) {
 if (!analyze) return '';
 opts = opts || {};
 const rainLabel = opts.rainLabel || 'RAIN PLAN';
 const avgSuffix = opts.showAvg === false ? '' : ` | Avg: ${analyze.avgTemp.toFixed(0)}°C`;
 let segHtml = '';
 analyze.segs.forEach(s => {
 const c = s.rainMax >= 40 ? '#ef4444' : s.rainMax >= 15 ? '#f59e0b' : '#10b981';
 segHtml += mkRow(`${s.name}`, `${s.tempAvg.toFixed(0)}°C | Rain ${s.rainMin}-${s.rainMax}%`) +
 `<div style="${ST.barOuter}"><div style="${barStyle(Math.min(100, s.rainMax), c)}"></div></div>`;
 });
 return mkSection('Weather Forecast', segHtml +
 mkRec(`${analyze.commitRain ? rainLabel : 'DRY PLAN'} - Max rain: ${analyze.maxRain}%${avgSuffix}`, analyze.commitRain ? 'bad' : 'good'), opts.id);
 }

 // Shared compound-comparison table, used by both renderQualify and renderRaceSetup (was
 // byte-identical copy-pasted markup in both).
 function mkTyreResultsTable(results) {
 let t = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:10px;">`;
 t += `<tr style="color:#60a5fa;font-weight:700;"><td style="padding:3px;">Compound</td><td>Stops</td><td>Fuel</td><td>TCD</td><td>FLD</td><td>Pits</td><td>Total</td></tr>`;
 results.forEach((r, i) => {
 const best = i === 0;
 const bg = best ? '#10b98122' : 'transparent';
 t += `<tr style="background:${bg};${best ? 'font-weight:700;color:#10b981;' : ''}"><td style="padding:3px;">${r.name}</td><td>${r.stops}</td><td>${r.fuelPerStint}L</td><td>${r.tcd}s</td><td>${r.fld}s</td><td>${r.pits}s</td><td>${r.total}s</td></tr>`;
 });
 t += `</table></div>`;
 return t;
 }

 // Wing split ("gadget" calculator from our toolset, ): half
 // the Front/Rear wing gap. Recovered from the already-computed setup values rather than
 // recomputing gapp's internal wingSplit term separately, so it can never disagree with the
 // Front/Rear numbers actually shown in the table above it.
 function wingSplitLabel(setupSession) {
 if (!setupSession) return '';
 const fw = setupSession['Front Wing'], rw = setupSession['Rear Wing'];
 if (fw == null || rw == null) return '';
 const split = Math.round((fw - rw) / 2);
 return `<div style="font-size:9px;color:#6b7280;margin-top:2px;">Wing split: ${split >= 0 ? '+' : ''}${split} (FW ${fw} / RW ${rw})</div>`;
 }

 // "Happy range" (our toolset gadget, ): how far the submitted setup can
 // drift from the ideal before performance suffers - wider for a more technically skilled driver.
 // calcHappyRange() was computed but never actually rendered anywhere (found during the same
 // 2026-07-19 dead-code audit that found calcDowngradeWear/getUpgradeCost/mkBar orphaned) despite
 // being a real, distinct calculation from calcMarginOfAcceptance (a single overall number) - this
 // is the per-part tolerance width. Shown as a compact reference line, not per-part in the table,
 // to avoid a wall of extra numbers next to the setup itself.
 function mkHappyRangeLabel(driver) {
 const hr = calcHappyRange(driver);
 if (!hr) return '';
 const ma = calcMarginOfAcceptance(driver);
 const maLabel = ma !== null ? ` MA=${ma}` : '';
 return `<div style="font-size:9px;color:#6b7280;margin-top:2px;">Happy range (acceptable deviation): Wings ±${hr['Front Wing']}, Other ±${hr['Engine']}${maLabel} - smaller = more precise setup needed (driven by driver experience/tech insight).</div>`;
 }

 // Shared car-setup table, used by both renderQualify (1 column: whichever session is active) and
 // renderRaceSetup (3 columns: Q1/Q2/Race) - was two near-identical hand-built HTML strings
 // (initial render + in-place-update-on-weather-change, x2 pages = 4 copies of this markup).
 // columns: [{ key: 'Q1', label: 'Q1 (25°C ☀️)', highlight?: bool }, ...] - key indexes into
 // setup[key][part]; highlight bolds/greens that column (Qualify's single column, RaceSetup's
 // Race column).
 function mkSetupTableInner(setup, columns) {
 let t = `<table style="width:100%;border-collapse:collapse;font-size:10px;">`;
 t += `<tr style="color:#60a5fa;font-weight:700;"><td style="padding:3px;">Part</td>`;
 columns.forEach(c => { t += `<td>${c.label}</td>`; });
 t += `</tr>`;
 SETUP_PARTS.forEach(part => {
 t += `<tr><td style="padding:3px;color:#d1d5db;">${part}</td>`;
 columns.forEach(c => {
 const style = c.highlight ? 'text-align:center;color:#10b981;font-weight:700;' : 'text-align:center;color:#f9fafb;';
 t += `<td style="${style}">${setup[c.key] ? setup[c.key][part] : '?'}</td>`;
 });
 t += `</tr>`;
 });
 t += `</table>`;
 return t;
 }

 // Shared clipboard-copy button wiring: flashes "✓ Copied!" then reverts, falls back to alert()
 // if GM_setClipboard is unavailable/fails. Was reimplemented separately per render page.
 // idleLabel: string shown after the "✓ Copied!" flash reverts. Pass null/omit to restore the
 // button's own original innerHTML instead (renderRaceSetup's three buttons each need their own
 // original label back, not a shared one). flashBg: optional background color applied during the
 // flash (reverted alongside the label).
 function wireCopyButton(btn, getText, idleLabel, flashBg) {
 if (!btn) return;
 btn.addEventListener('click', () => {
 const str = getText();
 if (!str) return;
 const restoreLabel = idleLabel != null ? idleLabel : btn.innerHTML;
 const origBg = btn.style.background;
 try {
 GM_setClipboard(str);
 btn.innerHTML = '✓ Copied!';
 if (flashBg) btn.style.background = flashBg;
 setTimeout(() => { btn.innerHTML = restoreLabel; if (flashBg) btn.style.background = origBg; }, 1500);
 } catch (e) {
 alert('Copy failed: ' + e.message + '\n\n' + str);
 }
 });
 }

 function mkSection(title, content, id) {
 return `<div${id ? ` id="${id}"` : ''} class="gpro-card" style="${ST.section}"><div style="${ST.sectionTitle}">${title}</div>${content}</div>`;
 }

 // Decision-summary board (following the pattern of our Cockpit, ): one
 // verdict tile per section, click-to-jump. tiles: [{ id, label, verdict, tone }] where tone is
 // 'good'/'warn'/'bad'/'info' (matches mkRec's palette) and id matches the target mkSection's id.
 function mkDecisionBoard(tiles) {
 const present = tiles.filter(t => t && t.verdict);
 if (!present.length) return '';
 const colors = VERDICT;
 const cells = present.map(t => `<div data-jump-to="${t.id}" style="cursor:pointer;flex:1;min-width:90px;background:${colors[t.tone] || colors.info}14;border:1px solid ${colors[t.tone] || colors.info}44;border-radius:9px;padding:7px 9px;">
 <div style="font-size:9px;color:${PALETTE.textDim};text-transform:uppercase;letter-spacing:.03em;">${t.label}</div>
 <div style="font-size:11px;color:${colors[t.tone] || colors.info};font-weight:700;margin-top:2px;">${t.verdict}</div>
 </div>`).join('');
 return `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">${cells}</div>`;
 }

 // Wires click-to-jump for a decision board rendered into `h` - call after body(h).
 function wireDecisionBoard() {
 document.querySelectorAll('[data-jump-to]').forEach(el => {
 el.addEventListener('click', () => {
 const target = document.getElementById(el.getAttribute('data-jump-to'));
 if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
 });
 });
 }

 // ============================================================
 // WEATHER DATA EXTRACTION (handles multiple API response formats)
 // ============================================================
 function extractWeather(practice) {
 if (!practice) return null;
 // Try practice.weather first
 if (practice.weather && typeof practice.weather === 'object') {
 // Check it has actual weather fields
 if (practice.weather.raceQ1TempLow !== undefined || practice.weather.raceQ1RainPLow !== undefined) {
 return practice.weather;
 }
 }
 // Try practice itself (weather fields may be at top level)
 if (practice.raceQ1TempLow !== undefined || practice.raceQ1RainPLow !== undefined) {
 return practice;
 }
 // Try practice.forecast
 if (practice.forecast && typeof practice.forecast === 'object') {
 return practice.forecast;
 }
 // Try nested weather under race setup
 if (practice.raceSetup && practice.raceSetup.weather) {
 return practice.raceSetup.weather;
 }
 return null;
 }

 // The API only exposes the 4 race-forecast segments (raceQ1..raceQ4) - it has no field for the
 // page's single-value "Practice/Qualify 1" and "Qualify 2/Race start" temp boxes. GAPP's own
 // reference implementation (calcs.py) gets these by scraping the DOM directly: the text next to
 // `img[name="WeatherQ"]` is the Practice/Q1 temp, `img[name="WeatherR"]` is Q2/race-start. Do the
 // same here so our Q1/Q2 setup temps match GAPP (and the real page) exactly instead of being
 // approximated from segment 1's range.
 function scrapeSessionTempsFromDOM() {
 try {
 let q1 = null, q2 = null, q1Rain = null, q2Rain = null;
 document.querySelectorAll('img[name="WeatherQ"], img[name="WeatherR"]').forEach((img) => {
 const container = img.closest('td') || img.parentElement;
 const txt = container ? container.textContent : '';
 const m = txt && txt.match(/Temp:\s*(-?\d+)/);
 const isRain = /rain/i.test(img.getAttribute('alt') || '');
 if (img.getAttribute('name') === 'WeatherQ') { if (m) q1 = parseInt(m[1]); q1Rain = isRain; }
 else if (img.getAttribute('name') === 'WeatherR') { if (m) q2 = parseInt(m[1]); q2Rain = isRain; }
 });
 return (q1 !== null || q2 !== null) ? { q1, q2, q1Rain, q2Rain } : null;
 } catch (e) { return null; }
 }

 // ============================================================
 // PASSIVE PAGE CAPTURE - DriverProfile.asp / TrackDetails.asp / Suppliers.asp aren't advisor pages
 // (no panel shown there), but visiting them is a free chance to grab real page data and stash it
 // in the long-lived stale cache, so it's available as fallback on the advisor pages later if the
 // API token has expired. This directly answers "if the token isn't working, go to the pages and
 // scrape/cache/capture" - capture happens silently whenever the user happens to browse there.
 // ============================================================
 function parseDriverProfileDOM(root) {
 root = root || document;
 try {
 const num = (id) => {
 const el = root.getElementById(id);
 if (!el) return null;
 const v = parseInt((el.textContent || '').replace(/[^\d]/g, ''));
 return isNaN(v) ? null : v;
 };
 const conc = num('Conc'), talent = num('Talent'), aggr = num('Aggr'), experience = num('Experience'),
 techI = num('TechI'), stamina = num('Stamina'), charisma = num('Charisma'), motivation = num('Motivation');
 if (conc === null && talent === null && experience === null) return null;
 let weight = null, reputation = null;
 root.querySelectorAll('th').forEach((th) => {
 if (/Weight\(kg\)/i.test(th.textContent)) {
 const td = th.parentElement.querySelector('td');
 if (td) weight = parseInt((td.textContent || '').replace(/[^\d]/g, '')) || null;
 } else if (/^Reputation/i.test(th.textContent.trim())) {
 // Added 2026-08-11 for the market custom-filter bar (matches GPRO's own Supporter-only
 // "Rep" filter column) - same "<th> label, no id" pattern as Weight above, confirmed in
 // docs/page-structures.md against both DriverProfile.asp and TrainingSession.asp.
 const td = th.parentElement.querySelector('td');
 if (td) reputation = parseInt((td.textContent || '').replace(/[^\d]/g, '')) || null;
 }
 });
  const h1 = root.querySelector('h1.block');
  const driverName = h1 ? h1.textContent.replace(/Driver profile:/i, '').trim() : '';
  return { concentration: conc, talent, aggressiveness: aggr, experience, techInsight: techI, stamina, charisma, motivation, weight, reputation, driverName };
  } catch (e) { return null; }
  }

  // Parser for the "Place your offer" contract form on DriverProfile.asp (only present when the
  // driver is a free agent you can bid on). Reads the game's own validation values directly:
  //   1) the driver's asking salary from the submit button's `SubmitForm(<ask>)` onclick
  //   2) the manager's cash from the hidden `managersCash` field - it caps every bonus
  //   3) the current per-field values already in the form
  //   4) the live "Current offer cost" and "Next offer cost increment in" counter
  //   5) how many competing managers have already placed offers (and their group codes)
  // Returns null if there's no offer form on the page (e.g. driver already under your contract).
  function parseDriverOfferDOM(root) {
  root = root || document;
  try {
  const form = root.querySelector('form[name="formOffer"]');
  if (!form) return null;
  const val = (name) => {
  const el = form.querySelector(`input[name="${name}"]`);
  return el ? (el.value || '') : '';
  };
  const submitBtn = form.querySelector('input[name="OfferContract"]');
  let ask = null;
  if (submitBtn) {
  const m = (submitBtn.getAttribute('onclick') || '').match(/SubmitForm\((\d+)\)/);
  if (m) ask = parseInt(m[1], 10);
  }
  if (ask == null) ask = parseInt(val('SalaryRace')) || null;
  const cash = parseGproCash(val('managersCash'));
  const visSel = form.querySelector('select[name="slVisibility"]');
  const visibility = visSel && visSel.selectedIndex >= 0 ? (visSel.options[visSel.selectedIndex].textContent || '').trim() : '';
  const champDisabled = (() => { const c = form.querySelector('input[name="BonusChamp"]'); return c ? !!c.disabled : true; })();
  const costEl = root.getElementById('snOfferCost');
  const offerCostText = costEl ? (costEl.textContent || '').trim() : '';
  const offerCost = parseGproCash(offerCostText);
  const timerEl = root.getElementById('dvTimeRemainig');
  const timerText = timerEl ? (timerEl.textContent || '').trim() : '';
  // Competing offers: "Total offers: N" + the "Offers from" list (manager + group code like R149).
  let totalOffers = 0;
  Array.from(root.querySelectorAll('p, div')).forEach((el) => {
  const m = (el.textContent || '').match(/Total offers:\s*(\d+)/i);
  if (m && parseInt(m[1]) > totalOffers) totalOffers = parseInt(m[1]);
  });
  const groupCodes = [];
  let scans = 0;
  Array.from(root.querySelectorAll('td')).forEach((td) => {
  if (scans > 60) return;
  const t = (td.textContent || '').replace(/\s+/g, '').trim();
  if (/^(R|A|P|M|E)\d+$/.test(t)) { scans++; if (!groupCodes.includes(t)) groupCodes.push(t); }
  });
  const current = {
  salary: parseGproCash(val('SalaryRace')),
  signFee: parseGproCash(val('SignFee')),
  bonusWin: parseGproCash(val('BonusRace')),
  bonusPodium: parseGproCash(val('BonusPodium')),
  bonusPoint: parseGproCash(val('BonusPoint')),
  bonusChamp: parseGproCash(val('BonusChamp')),
  races: parseInt(val('NbRaces')) || null,
  };
  return { driverName: (root.querySelector('h1.block') || {}).textContent ? root.querySelector('h1.block').textContent.replace(/Driver profile:/i, '').trim() : '', ask, cash, visibility, champDisabled, offerCost, offerCostText, timerText, totalOffers, groupCodes, current };
  } catch (e) { return null; }
  }

 // TD profile page parser - UNVERIFIED against a real live page (no TD profile page has ever been
 // captured in this project, unlike DriverProfile.asp). The exact page URL isn't guessed either -
 // callers must pass the real href captured from the TD market table's own link
 // (parseAvailListDOM's row.profileHref) rather than a hardcoded path. Field names/labels here
 // (Leadership, Mechanics, Electronics, Aerodynamics, Pit Coordination, Motivation, Experience,
 // Overall, Age) are the exact API field names confirmed in gpro-public-api.yml's
 // TDProfileResponse/SortTD enum, tried as both th/td label text AND element ids (mirroring
 // parseDriverProfileDOM's id-based lookup) since we don't know which pattern the real page uses.
 function parseTdProfileDOM(root) {
 root = root || document;
 try {
 const out = {};
 const labelMap = {
 'overall': 'overall', 'leadership': 'leadership', 'mechanics': 'mechanics', 'mechanical': 'mechanics',
 'electronics': 'electronics', 'aerodynamics': 'aerodynamics', 'experience': 'experience', 'exp': 'experience',
 'pitcoordination': 'pitCoord', 'pitcoord': 'pitCoord', 'pitstop': 'pitCoord',
 'motivation': 'motivation', 'age': 'age',
 };
 root.querySelectorAll('th').forEach((th) => {
 const label = th.textContent.replace(/:/g, '').replace(/\s+/g, '').toLowerCase();
 const td = th.parentElement.querySelector('td');
 if (!td || !labelMap[label]) return;
 const v = parseInt((td.textContent || '').replace(/[^\d]/g, ''));
 if (!isNaN(v)) out[labelMap[label]] = v;
 });
 if (Object.keys(out).length === 0) {
 // Fallback: try element ids the same shape as parseDriverProfileDOM's (Conc/Talent/etc)
 const idMap = { Leadership: 'leadership', Mechanics: 'mechanics', Electronics: 'electronics', Aero: 'aerodynamics', Experience: 'experience', PitCoord: 'pitCoord', Motivation: 'motivation' };
 Object.entries(idMap).forEach(([id, key]) => {
 const el = root.getElementById(id);
 if (!el) return;
 const v = parseInt((el.textContent || '').replace(/[^\d]/g, ''));
 if (!isNaN(v)) out[key] = v;
 });
 }
 if (Object.keys(out).length === 0) { logDebug('[GPRO][parseTdProfileDOM] no recognizable fields found - page markup unconfirmed'); return null; }
 const h1 = root.querySelector('h1.block');
 out.tdName = h1 ? h1.textContent.replace(/technical director profile:/i, '').trim() : '';
 return out;
 } catch (e) { return null; }
 }

 function parseTrackDetailsDOM(root) {
 root = root || document;
 try {
 const getValCell = (label) => {
 const tds = root.querySelectorAll('td[align="right"]');
 for (const td of tds) {
 if (td.textContent.trim() === label) return td.nextElementSibling;
 }
 return null;
 };
 const textOf = (label) => { const el = getValCell(label); return el ? el.textContent.trim() : null; };
 const titleOf = (label) => { const el = getValCell(label); return el ? el.getAttribute('title') : null; };
 const laps = parseInt(textOf('Laps:')) || null;
 if (!laps) return null;
 const pitsStr = textOf('Time in/out of pits:');
 const timeInOutPits = pitsStr ? parseFloat(pitsStr) : null;
 const trackPower = parseInt(titleOf('Power:')) || null;
 const trackHandl = parseInt(titleOf('Handling:')) || null;
 const trackAccel = parseInt(titleOf('Acceleration:')) || null;
 const fuelConsumption = textOf('Fuel consumption:');
 const tyreWear = textOf('Tyre wear:');
 // Field names match the real /TrackProfile API response (`overtaking`, `gripLevel` - confirmed
 // in gpro-public-api.yml) so DOM- and API-sourced track data are interchangeable. Used by the
 // Driver Strategy risk advisor (overtake/defend depend heavily on passing difficulty; grip trims
 // both dials on slippery tracks).
 const overtaking = textOf('Overtaking:');
 const gripLevel = textOf('Grip level:');
 // Added 2026-07-27 to derive a per-track weather-period lap conversion (see
 // estimateLapsPerWeatherPeriod/renderRaceSetup's rain-stop-window calc) instead of a single
 // flat constant calibrated from one track. Field names match the real /TrackProfile API
 // response exactly (`avgSpeed`, `lapDistance` - confirmed in gpro-public-api.yml) so DOM- and
 // API-sourced track data stay interchangeable, same convention as overtaking/gripLevel above.
 const avgSpeedStr = textOf('Average speed:');
 const avgSpeed = avgSpeedStr ? parseFloat(avgSpeedStr) : null;
 const lapDistanceStr = textOf('Lap distance:');
 const lapDistance = lapDistanceStr ? parseFloat(lapDistanceStr) : null;
 const h1 = root.querySelector('h1.block');
 const trackName = h1 ? h1.textContent.trim() : '';
 return { laps, timeInOutPits, trackPower, trackHandl, trackAccel, fuelConsumption, tyreWear, overtaking, gripLevel, avgSpeed, lapDistance, trackName };
 } catch (e) { return null; }
 }

 // Calendar.asp?Group=X - season's 17 races in order, each a link to TrackDetails.asp?id=N (per
 // docs/page-structures.md). Added 2026-07-27 as the season-wide track-specs pre-cache source (see
 // backgroundCacheSeasonTrackSpecs) - lets estimateLapsPerWeatherPeriod() have real per-track
 // avgSpeed/lapDistance data for EVERY race in the season, not just whichever one the existing
 // "next race" link on gpro.asp happened to point at recently.
 function parseCalendarDOM(root) {
 root = root || document;
 try {
 const races = [];
 root.querySelectorAll('a[href*="TrackDetails.asp?id="]').forEach((a) => {
 const idMatch = a.getAttribute('href').match(/id=(\d+)/i);
 if (!idMatch) return;
 const name = a.textContent.trim();
 if (name) races.push({ id: parseInt(idMatch[1]), name });
 });
 return races.length ? races : null;
 } catch (e) { return null; }
 }

 function parseTyreSuppliersDOM(root) {
 root = root || document;
 try {
 const suppliers = [];
 let active = null;
 // #tyresuppliers .column was confirmed live 2026-07-19; fall back to any .column that has
 // both an <h2> and a "Dry performance" row if that container id ever changes, rather than
 // silently returning null with no diagnostic - a live-markup mismatch here previously had no
 // visible symptom other than the Home dashboard quietly saying "Missing" forever.
 let cols = root.querySelectorAll('#tyresuppliers .column');
 if (!cols.length) {
 cols = Array.from(root.querySelectorAll('.column')).filter(c => c.querySelector('h2') && /Dry performance/i.test(c.textContent));
 }
 if (!cols.length) { logDebug('[GPRO][parseTyreSuppliersDOM] no supplier columns found - page markup may have changed'); return null; }
 cols.forEach((col) => {
 const h2 = col.querySelector('h2');
 if (!h2) return;
 const name = h2.textContent.trim();
 let dry = null, wet = null, peakTemperature = null, durability = null, warmupDistance = null;
 col.querySelectorAll('table.normal tr').forEach((tr) => {
 const label = (tr.children[0] && tr.children[0].textContent || '').trim();
 const valTd = tr.children[1];
 if (!valTd) return;
 const titleEl = valTd.querySelector('[title]');
 const title = titleEl ? parseInt(titleEl.getAttribute('title')) : null;
 if (/Dry performance/i.test(label)) dry = title;
 else if (/Wet performance/i.test(label)) wet = title;
 else if (/Peak temperature/i.test(label)) peakTemperature = parseInt(valTd.textContent) || null;
 else if (/Durability/i.test(label)) durability = title;
 else if (/Warmup distance/i.test(label)) warmupDistance = title;
 });
 const costMatch = (col.textContent.match(/Cost per race:\s*\$([\d.]+)/) || [])[1];
 const costPerRace = costMatch ? parseInt(costMatch.replace(/\./g, '')) : null;
 const supplierObj = { name, dryPerformance: dry, wetPerformance: wet, peakTemperature, durability, warmupDistance, costPerRace };
 suppliers.push(supplierObj);
 if (/Contract active/i.test(col.textContent)) active = supplierObj;
 });
 return suppliers.length ? { suppliers, activeSupplierName: active ? active.name : null } : null;
 } catch (e) { return null; }
 }

  // Staff concentration/stress from StaffAndFacilities.asp - plain digit values, not level-dot bars.
  // Field names match the real /StaffAndFacilities API response so DOM- and API-sourced data are
  // interchangeable. Expanded 2026-07-19 to cover everything renderStaff needs (fixed init()
  // fetching /Office instead of /StaffAndFacilities). Reads `<th>Label:</th><td>N</td>` pairs from
  // both the staff-skills and facility-levels tables.
  function parseStaffFacilitiesDOM(root) {
 root = root || document;
 try {
 const out = {};
 const staffLabels = {
 'overall': 'overall', 'experience': 'experience', 'motivation': 'motivation',
 'technicalskill': 'technicalSkill', 'stresshandling': 'stressHandling',
 'concentration': 'concentration', 'efficiency': 'efficiency',
 };
 const facilityLabels = {
 'windtunnel': 'windtunnel', 'pitstoptrainingcenter': 'pitstopTrainingCenter',
 'r&dworkshop': 'rdWorkshop', 'r&ddesigncenter': 'rdDesign', 'r&ddesign': 'rdDesign',
 'engineeringworkshop': 'engineering', 'engineering': 'engineering',
 'alloyandchemicallab': 'lab', 'lab': 'lab', 'commercial': 'commercial',
 };
 root.querySelectorAll('th').forEach((th) => {
 const label = th.textContent.replace(/:/g, '').replace(/\s+/g, '').toLowerCase();
 const td = th.parentElement.querySelector('td');
 if (!td) return;
 const val = parseInt(td.textContent) || 0;
 if (staffLabels[label]) out[staffLabels[label]] = val;
 else if (facilityLabels[label]) out[facilityLabels[label]] = val;
 });
 return Object.keys(out).length ? out : null;
 } catch (e) { return null; }
 }

 // Parses NegotiationsOverview.asp DOM for car spots and ongoing negotiations.
 // Replaces the /NegOverview API call with zero-budget DOM scraping.
 function parseNegOverviewDOM(root) {
 root = root || document;
 try {
 const out = { carSpots: [], carSpotsTaken: 0, ongNegs: [], comms: [] };

 // Car spots: table rows with car spot name, sponsor, amount, races left, satisfaction
 const tables = root.querySelectorAll('table');
 tables.forEach(table => {
 const headers = [];
 table.querySelectorAll('tr:first-child th, tr:first-child td').forEach(th => {
  headers.push(th.textContent.trim().toLowerCase());
 });
 // Look for car spots table (has "car spot" or "sponsor" in headers)
 const hasCarSpots = headers.some(h => h.includes('car spot') || h.includes('sponsor'));
 if (hasCarSpots) {
  table.querySelectorAll('tr').forEach((tr, i) => {
  if (i === 0) return; // skip header
  const cells = tr.querySelectorAll('td');
  if (cells.length >= 4) {
   const spotName = cells[0]?.textContent?.trim() || '';
   const sponsorName = cells[1]?.textContent?.trim() || '';
   const amount = cells[2]?.textContent?.trim() || '';
   const racesLeft = cells[3]?.textContent?.trim() || '';
   const satisfaction = cells[4]?.textContent?.trim() || '';
   if (spotName) {
    const empty = !sponsorName || sponsorName === '(empty)' || sponsorName === '';
    out.carSpots.push({
     carSpotName: spotName,
     sponsorId: empty ? null : 1,
     name: empty ? '' : sponsorName,
     amount: amount,
     racesLeft: parseInt(racesLeft) || 0,
     satisfaction: satisfaction,
    });
    if (!empty) out.carSpotsTaken++;
   }
  }
  });
 }
 });

 // Ongoing negotiations: table rows with sponsor, spot, amount, duration, progress, priority
 tables.forEach(table => {
 const headers = [];
 table.querySelectorAll('tr:first-child th, tr:first-child td').forEach(th => {
  headers.push(th.textContent.trim().toLowerCase());
 });
 const hasNegs = headers.some(h => h.includes('negotiation') || h.includes('progress'));
 if (hasNegs && !headers.some(h => h.includes('car spot'))) {
  table.querySelectorAll('tr').forEach((tr, i) => {
  if (i === 0) return;
  const cells = tr.querySelectorAll('td');
  if (cells.length >= 5) {
   const name = cells[0]?.textContent?.trim() || '';
   const spot = cells[1]?.textContent?.trim() || '';
   const amount = cells[2]?.textContent?.trim() || '';
   const duration = cells[3]?.textContent?.trim() || '';
   const progress = cells[4]?.textContent?.trim() || '';
   if (name) {
    out.ongNegs.push({
     name, carSpotName: spot, amount, duration, progress,
     priority: cells[5]?.textContent?.trim() || '',
     contested: cells[6]?.textContent?.trim() || '',
     attention: progress.includes('?') || progress.includes('stalled'),
     sponsorId: 1,
    });
   }
  }
  });
 }
 });

 // Recent messages
 const msgEls = root.querySelectorAll('.message, [class*="message"], [class*="comm"]');
 msgEls.forEach(el => {
 const text = el.textContent?.trim();
 if (text && text.length > 5 && text.length < 500) {
  out.comms.push({ msg: text, dt: '' });
 }
 });

 return out;
 } catch (e) { return null; }
 }

 // Parses NegotiateSponsor.asp — the page where a single sponsor's negotiation is conducted.
 // Extracts the sponsor's identity, the negotiation progress, and any questions the sponsor
 // is currently asking (each question + its answer options). Replaces the /NegotiateSponsor
 // API call with zero-budget DOM scraping so the advisor works on the live page directly.
 function parseNegotiateSponsorDOM(root) {
 root = root || document;
 try {
 const out = { sponsorName: '', negotiation: 0, progress: 0, questions: [], characteristics: {} };

 const h1 = root.querySelector('h1.block');
 if (h1) out.sponsorName = h1.textContent.replace(/negotiat.*with/i, '').replace(/sponsor/i, '').trim();

 // Negotiation progress is often a "progress" figure or percentage on the page.
 const progEl = Array.from(root.querySelectorAll('td,th,p,span')).find(el => /progress/i.test(el.textContent || ''));
 if (progEl) {
  const p = (progEl.parentElement ? progEl.parentElement.textContent : progEl.textContent) || '';
  const m = p.match(/(\d+)\s*%|\b(\d{1,2})\s*\/\s*(\d{1,2})\b/);
  if (m) out.progress = parseInt(m[1] || m[2] || '0');
 }

 // Negotiation questions: GPRO asks up to 5. Each is a question string with radio/answer options.
 // Detect by looking for the known question stems.
 const questionStems = [
  'Which area of the car would our advertisement be placed on?',
  'What are you expecting to achieve next season?',
  'How popular is your driver with the fans?',
  'What do you think of the amount per race we proposed?',
  'What do you think of the contract duration we proposed?',
 ];
 questionStems.forEach(q => {
  const found = root.querySelectorAll('td,th,label,p,span');
  for (const el of found) {
   if ((el.textContent || '').trim().includes(q)) {
    // Gather nearby answer options (labels next to inputs)
    const options = [];
    const container = el.closest('tr') || el.parentElement || root;
    container.querySelectorAll('input[type="radio"], input[type="checkbox"], label, td').forEach(opt => {
     const t = (opt.textContent || opt.value || '').trim();
     if (t && t.length > 2 && t.length < 120 && !t.includes(q) && options.length < 10) {
      if (!options.includes(t)) options.push(t);
     }
    });
    out.questions.push({ question: q, options });
    break;
   }
  }
 });

 // Sponsor characteristics (exposed on NegotiateSponsor.asp as th(label)+td(value) pairs:
 // Finances / Expectations / Patience / Reputation / Image / Negotiation, each a 1-7 scale).
 // Walk every label cell and read the ADJACENT value cell (not the same cell).
 const charLabels = { 'finances': 'finances', 'expectations': 'expectations', 'patience': 'patience', 'reputation': 'reputation', 'image': 'image', 'negotiation': 'negotiation' };
 root.querySelectorAll('th,td').forEach(el => {
  const raw = (el.textContent || '').trim();
  const label = raw.replace(/[:\s]/g, '').toLowerCase();
  for (const [lbl, key] of Object.entries(charLabels)) {
   if (label === lbl) {
    // Read adjacent cell value in the same row
    const row = el.closest('tr');
    let valCell = el.nextElementSibling;
    if (!valCell && row) valCell = row.querySelector('td');
    const valTxt = valCell ? (valCell.textContent || '').trim() : '';
    const m = valTxt.match(/\d{1,2}/);
    if (m) out.characteristics[key] = parseInt(m[0]);
    break;
   }
  }
 });
 // Best-effort: some layouts put the number right after the label in one cell.
 ['finances','expectations','patience','reputation','image','negotiation'].forEach(key => {
  if (out.characteristics[key] == null) {
   const el = Array.from(root.querySelectorAll('th,td')).find(e => {
    const t = (e.textContent || '').toLowerCase().replace(/[:\s]/g, '');
    return t.startsWith(key) && /\d/.test(t);
   });
   if (el) {
    const m = (el.textContent || '').match(/\d{1,2}/);
    if (m) { const v = parseInt(m[0]); if (v >= 1 && v <= 7) out.characteristics[key] = v; }
   }
  }
 });

 return out;
 } catch (e) { return null; }
 }

 // Weather from Qualify.asp/Qualify2.asp/RaceSetup.asp, shaped to match what extractWeather()
 // expects at the top level of a /Practice response (raceQ{1-4}TempLow/High/RainPLow/RainPHigh/
 // HumLow/HumHigh) - lets a background-fetched Qualify.asp page fully stand in for a failed
 // /Practice call, not just the Q1/Q2 temp boxes scrapeSessionTempsFromDOM() already handles live.
 function parseWeatherDOM(root) {
 root = root || document;
 try {
 const segCells = Array.from(root.querySelectorAll('td')).filter((td) => /Rain probability/i.test(td.textContent));
 if (segCells.length < 4) return null;
 const out = {};
 segCells.slice(0, 4).forEach((td, i) => {
 const txt = td.textContent;
 const tempM = txt.match(/Temp:\s*(-?\d+)\D*(-?\d+)?/);
 const humM = txt.match(/Humidity:\s*(-?\d+)%?\D*(-?\d+)?/);
 const rainM = txt.match(/Rain probability:\s*(-?\d+)%?\D*(-?\d+)?/);
 const n = i + 1;
 const tL = tempM ? parseInt(tempM[1]) : null;
 out[`raceQ${n}TempLow`] = tL;
 out[`raceQ${n}TempHigh`] = tempM && tempM[2] !== undefined ? parseInt(tempM[2]) : tL;
 const hL = humM ? parseInt(humM[1]) : null;
 out[`raceQ${n}HumLow`] = hL;
 out[`raceQ${n}HumHigh`] = humM && humM[2] !== undefined ? parseInt(humM[2]) : hL;
 const rL = rainM ? parseInt(rainM[1]) : 0;
 out[`raceQ${n}RainPLow`] = rL;
 out[`raceQ${n}RainPHigh`] = rainM && rainM[2] !== undefined ? parseInt(rainM[2]) : rL;
 });
 return out;
 } catch (e) { return null; }
 }

 // Car part levels/wear + car character (P/H/A) straight from Qualify.asp/Qualify2.asp's own
 // "Setup related parts" table - both pages render this table with real numbers, so on-page
 // requests never need to hit /UpdateCar at all. NOT present on RaceSetup.asp (only editable input
 // boxes there, no readout), so only wire this in for the qualify1/qualify2 init branch.
 function parseQualifyCarDOM(root) {
 root = root || document;
 try {
 const nameToIdx = { chassis: 0, engine: 1, 'front wing': 2, 'rear wing': 3, underbody: 4,
 sidepods: 5, cooling: 6, gear: 7, brakes: 8, suspension: 9, electronics: 10 };
 const car = {};
 let found = false;
 root.querySelectorAll('td[bgcolor="#1B2D47"]').forEach((td) => {
 const label = td.textContent.replace(/ /g, ' ').trim().replace(/:$/, '').toLowerCase();
 const idx = nameToIdx[label];
 if (idx === undefined) return;
 const lvlTd = td.nextElementSibling;
 const wearTd = lvlTd ? lvlTd.nextElementSibling : null;
 if (!lvlTd || !wearTd) return;
 car[PART_LVL_KEYS[idx]] = parseInt(lvlTd.textContent) || 0;
 car[PART_WEAR_KEYS[idx]] = parseInt(wearTd.textContent) || 0;
 found = true;
 });
 if (!found) return null;
 root.querySelectorAll('td[bgcolor="#1B2D47"]').forEach((td) => {
 const label = td.textContent.trim().replace(/:$/, '').toLowerCase();
 if (label !== 'power' && label !== 'handling' && label !== 'acceleration') return;
 const valTd = td.nextElementSibling;
 const v = valTd ? parseInt(valTd.textContent) || 0 : 0;
 if (label === 'power') car.carPower = v; else if (label === 'handling') car.carHandl = v; else car.carAccel = v;
 });
 return car;
 } catch (e) { return null; }
 }

 // Weather + track name straight from the CURRENT Qualify.asp/Qualify2.asp/RaceSetup.asp page -
 // whichever of those three the user is actually on, its own weather widget/forecast is exactly
 // the /Practice data, at zero network cost.
 function buildLivePracticeDOM() {
 const w = parseWeatherDOM(document);
 if (!w) return null;
 const h2 = document.querySelector('h2');
 const m = h2 && h2.textContent.match(/Next race:\s*(.+)/i);
 if (m) w.trackName = m[1].trim();
 return w;
 }

 // Testing.asp's completed-stints table, shaped to match what calcTyreStrategyGapp/calcFuelSimple
 // read off a /Testing response (testing.stintsDone[].setFuel/fuelLeft/lapsDone). UNVERIFIED
 // against a live Testing.asp page (this project has no way to hold a real session open there) -
 // written defensively with multiple fallback text patterns, same style as parseUpdateCarDOM's
 // cash-parsing, rather than committing to brittle exact selectors we can't confirm. If this
 // silently returns null on a real page, that's a signal to capture the real markup into
 // docs/page-structures.md and fix the patterns here - getDataDomOnly() falls back to the DOM-fed
 // stale cache (or ultimately shows "no data yet") rather than ever guessing at fuel numbers.
 function parseTestingDOM(root) {
 root = root || document;
 try {
 const h2 = root.querySelector('h2');
 const trackM = h2 && h2.textContent.match(/(?:Next race|Testing at|Track):?\s*(.+)/i);
 const trackName = trackM ? trackM[1].trim() : null;

 // Each completed stint is typically a table row with "Laps done" (e.g. "12/15"), a fuel-set
 // amount, and fuel remaining - look for rows containing a laps-done-style fraction plus two
 // nearby numeric fuel figures, rather than assuming a specific table id/class.
 const stintsDone = [];
 root.querySelectorAll('tr').forEach((tr) => {
 const text = tr.textContent || '';
 const lapsM = text.match(/(\d+)\s*\/\s*(\d+)/);
 if (!lapsM) return;
 const nums = Array.from(text.matchAll(/(?<![\d.])(\d{1,3})(?:\s*[Ll])?(?![\d.])/g)).map(m => parseInt(m[1]));
 // Heuristic: the laps-done fraction contributes 2 of the matched numbers; look for at least
 // 2 more plausible fuel-litre values (0-180, GPRO's tank cap) elsewhere in the row.
 const fuelCandidates = nums.filter(n => n > 0 && n <= 180 && n !== parseInt(lapsM[1]) && n !== parseInt(lapsM[2]));
 if (fuelCandidates.length >= 2) {
 stintsDone.push({ lapsDone: `${lapsM[1]}/${lapsM[2]}`, setFuel: fuelCandidates[0], fuelLeft: fuelCandidates[1] });
 }
 });

 if (!trackName && !stintsDone.length) return null;
 return { trackName, stintsDone };
 } catch (e) { return null; }
 }

 // Parses the TrainingSession.asp DOM to extract driver skills, training sessions, and contract.
 function parseTrainingSessionDOM(root) {
 root = root || document;
 try {
 const out = { skills: {}, sessions: [], contract: {}, career: {}, energy: null, driverName: '' };

 // Driver name from <h1>
 const h1 = root.querySelector('h1.block');
 if (h1) out.driverName = h1.textContent.replace(/Driver training:/i, '').trim();

 // Energy bar
 const barLabel = root.querySelector('.barLabel');
 if (barLabel) {
 const em = barLabel.textContent.match(/(\d+)/);
 if (em) out.energy = parseInt(em[1]);
 }

 // Skills from <th>/<td> pairs in the skills table
 const skillMap = {
 'overall': 'overall', 'concentration': 'concentration', 'talent': 'talent',
 'aggressiveness': 'aggressiveness', 'experience': 'experience',
 'technicalinsight': 'techInsight', 'stamina': 'stamina',
 'charisma': 'charisma', 'motivation': 'motivation',
 'reputation': 'reputation',
 };
 root.querySelectorAll('th').forEach(th => {
 const label = th.textContent.replace(/:/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, '').toLowerCase();
 const td = th.parentElement && th.parentElement.querySelector('td');
 if (!td) return;
 const val = parseInt((td.textContent || '').replace(/[^\d]/g, ''));
 if (skillMap[label] && !isNaN(val)) out.skills[skillMap[label]] = val;
 });

 // Weight and age (separate rows)
 root.querySelectorAll('th').forEach(th => {
 const label = th.textContent.replace(/:/g, '').replace(/\s+/g, '').toLowerCase();
 const td = th.parentElement && th.parentElement.querySelector('td');
 if (!td) return;
 const val = parseInt((td.textContent || '').replace(/[^\d]/g, ''));
 if (label === 'weightkg') out.weight = val || null;
 if (label === 'age') out.age = val || null;
 });

 // Contract details
 const contractMap = { 'salary': 'salary', 'pointsbonus': 'pointsBonus', 'podiumbonus': 'podiumBonus', 'winbonus': 'winBonus', 'trophybonus': 'trophyBonus', 'racesleft': 'racesLeft' };
 root.querySelectorAll('th').forEach(th => {
 const label = th.textContent.replace(/:/g, '').replace(/\s+/g, '').toLowerCase();
 const td = th.parentElement && th.parentElement.querySelector('td');
 if (!td) return;
 const raw = (td.textContent || '').trim();
 const val = parseInt(raw.replace(/[^\d]/g, ''));
 if (contractMap[label]) out.contract[contractMap[label]] = val || 0;
 });

 // Career stats
 const careerMap = { 'trophies': 'trophies', 'numberofgps': 'gPs', 'wins': 'wins', 'podiums': 'podiums', 'pointsscored': 'points', 'polepositions': 'poles', 'fastestlaps': 'fastestLaps', 'avpts/race': 'avPtsRace' };
 root.querySelectorAll('th').forEach(th => {
 const label = th.textContent.replace(/:/g, '').replace(/\s+/g, '').toLowerCase();
 const td = th.parentElement && th.parentElement.querySelector('td');
 if (!td) return;
 const raw = (td.textContent || '').trim();
 if (careerMap[label]) {
 if (label === 'avpts/race') out.career[careerMap[label]] = parseFloat(raw) || 0;
 else out.career[careerMap[label]] = parseInt(raw.replace(/[^\d]/g, '')) || 0;
 }
 });

 // Training sessions from the <select> dropdown
 const sel = root.querySelector('select[name="SessionType"]');
 if (sel) {
 const costMap = { 'fitness': 750000, 'yoga': 700000, 'pr': 500000, 'tech': 600000, 'sportspsychologist': 400000, 'ninja': 550000, 'spa': 500000 };
 Array.from(sel.options).forEach(opt => {
 out.sessions.push({ id: opt.value, label: opt.text, cost: costMap[opt.value] || 0 });
 });
 }

 return out;
 } catch (e) { return null; }
 }

 // Runs once per passive page load (DriverProfile/TrackDetails/Suppliers/StaffAndFacilities) - no
 // extra panel, just capture into the stale-fallback cache.
 // Foundational storage piece for a possible future driver attribute-drift estimator: persists
 // one snapshot per driver per day, capped at 60
 // entries (~2 months of daily visits) per driver, keyed by driver ID so scouted drivers get their
 // own history alongside the account's own. Deliberately storage-only for now - no drift
 // *prediction* is built on top of this yet (that needs a real methodology, not a guess), but the
 // data has to start accumulating before that can ever be built at all.
 const DRIVER_HISTORY_MAX = 60;
 function appendDriverSnapshot(driverId, attrs) {
 if (!driverId || !attrs) return;
 try {
 const key = 'gpro_driver_history_' + driverId;
 const raw = GM_getValue(key, null);
 const history = raw ? JSON.parse(raw) : [];
 const today = new Date().toISOString().slice(0, 10);
 const last = history[history.length - 1];
 const snapshot = { date: today, time: Date.now(), ...attrs };
 if (last && last.date === today) {
 history[history.length - 1] = snapshot; // same-day revisit: replace, don't duplicate
 } else {
 history.push(snapshot);
 if (history.length > DRIVER_HISTORY_MAX) history.shift();
 }
 GM_setValue(key, JSON.stringify(history));
 } catch (e) { /* storage full or similar - drop silently, same as other cache writes */ }
 }

 function runPassiveCapture() {
 const path = location.pathname;
 if (path.includes('DriverProfile.asp')) {
 const d = parseDriverProfileDOM();
 if (d) {
 // DriverProfile.asp?ID=N can show ANY driver's profile (e.g. scouting a target from the
 // new Driver Market page), but the generic '/DriProfile' stale-cache slot is read
 // everywhere else (Q1/Q2/RaceSetup setup+strategy calcs) assuming it's always the
 // account's OWN driver. Without this check, visiting a scouted driver's profile would
 // silently overwrite the account's own cached driver data with someone else's attributes,
 // corrupting every calculation that depends on driver stats until the next real /DriProfile
 // API refresh. Only cache here when there's no ?ID= param (own profile via normal
 // navigation) or it matches the last-known own driver ID from /Office.
 const urlId = new URLSearchParams(location.search).get('ID') || new URLSearchParams(location.search).get('id');
 const ownOffice = getStaleData('/Office');
 const ownDriId = ownOffice && ownOffice.data && ownOffice.data.driId;
 if (!urlId || (ownDriId && String(urlId) === String(ownDriId))) {
 setStaleData('/DriProfile', d);
 }
 // Snapshot goes to per-driver history regardless of own-vs-scouted (that's the whole
 // point - scouted drivers need history too), keyed by whichever ID this profile actually
 // is (fall back to the own driver ID only when the page has no ?ID= of its own).
 appendDriverSnapshot(urlId || ownDriId, d);
 }
 } else if (path.includes('TrackDetails.asp')) {
 const t = parseTrackDetailsDOM();
 if (t) setStaleData('/TrackProfile', t);
 } else if (path.includes('Suppliers.asp')) {
 const s = parseTyreSuppliersDOM();
 if (s) setStaleData('/TyreSuppliers', s);
 } else if (path.includes('StaffAndFacilities.asp')) {
 const staff = parseStaffFacilitiesDOM();
 if (staff) setStaleData('/StaffAndFacilities', staff);
 } else if (path.includes('Testing.asp')) {
 const t = parseTestingDOM();
 if (t) setStaleData('/Testing', t);
 }
 }

 // Runs async jobs with a hard cap on how many are in flight at once. Every fan-out point in this
 // file previously fired its whole batch simultaneously - up to 30 parallel page fetches from the
 // market full-stat scan and 17 from the season track-specs pre-cache. That is a lot of
 // simultaneous load to put on gpro.net from one browser tab, risks tripping rate limiting, and
 // gains little over a small pool since the bottleneck is the server, not us.
 async function mapLimit(items, limit, fn) {
 const results = new Array(items.length);
 let next = 0;
 const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
 while (true) {
 const i = next++;
 if (i >= items.length) return;
 try { results[i] = { status: 'fulfilled', value: await fn(items[i], i) }; }
 catch (e) { results[i] = { status: 'rejected', reason: e }; }
 }
 });
 await Promise.all(workers);
 return results;
 }
 const NET_CONCURRENCY = 4;
 // Pre-scan preview table cap only (mkShortlistSection's initial mkMarketTable, before any profile
 // fetch has happened) - purely a display truncation, not a filtering decision.
 const MARKET_SCAN_MAX = 60;
 // Real full-stat scan safety cap (2026-08-11, v6.8.1): since whole-market auto-pagination (v6.8.0)
 // a "market" can now be 700+ candidates, so scanning must be narrowed by the CHEAP filter-bar
 // fields (Age/Salary/Offers - no profile fetch needed) BEFORE any expensive per-candidate scan
 // runs (see cheapFilteredRows) - that's the real reduction. This is only the hard backstop for
 // whatever's left after that narrowing, so scanning never fetches an unbounded number of profile
 // pages if the user clears every cheap filter on a huge market. Raised from 60 (2026-08-11,
 // explicit user request: "I want the advisor to automatically filter all the drivers... giving me
 // all drivers that fulfil the filter requirements" - a 60-cap silently dropped valid candidates
 // even after cheap pre-filtering).
 const MARKET_FULL_SCAN_MAX = 300;

 // Fetches an arbitrary same-site page's HTML in the background (no navigation) so its DOM can be
 // parsed the same way as a real visit. Used by "Update All Data" to reach DriverProfile.asp/
 // TrackDetails.asp/Suppliers.asp without making the user actually click through to them.
 function fetchPageHTML(path) {
 return new Promise((resolve, reject) => {
 const url = `https://${getApiHost()}/${getLang()}/${path}`;
 GM_xmlhttpRequest({
 method: 'GET', url,
 // `timeout` must be set for the ontimeout handler below to ever fire - it was declared
 // without one until 2026-07-29, so background page fetches could hang indefinitely.
 timeout: NET_TIMEOUT_MS,
 onload(r) { (r.status >= 200 && r.status < 300) ? resolve(r.responseText) : reject(new Error(`HTTP ${r.status} fetching ${path}`)); },
 onerror() { reject(new Error(`Network error fetching ${path}`)); },
 ontimeout() { reject(new Error(`Timeout fetching ${path}`)); },
 });
 });
 }

 // Background-fetches and parses DriverProfile.asp/TrackDetails.asp/Suppliers.asp (the 3 pages that
 // only get scraped passively when the user happens to visit them) so "Update All Data" refreshes
 // their stale-fallback cache without requiring a manual visit. Driver ID and track ID are read from
 // links already present on gpro.asp itself (`DriverProfile.asp?ID=N`, `TrackDetails.asp?id=N`) -
 // both are always on the home page, so no extra request is needed to discover them.
 async function backgroundCaptureAuxPages() {
 const results = { driver: false, track: false, suppliers: false, staff: false, weather: false, testing: false, td: false, neg: false };
 const driverLink = document.querySelector('a[href*="DriverProfile.asp?ID="]');
 const trackLink = document.querySelector('a[href*="TrackDetails.asp?id="]');
 const tdLink = document.querySelector('a[href*="TDProfile.asp"]');
 const driverId = driverLink && (driverLink.getAttribute('href').match(/ID=(\d+)/) || [])[1];
 const trackId = trackLink && (trackLink.getAttribute('href').match(/id=(\d+)/) || [])[1];
 const tdId = tdLink && (tdLink.getAttribute('href').match(/ID=(\d+)/i) || [])[1];

 const jobs = [];
 if (driverId) {
 jobs.push(fetchPageHTML(`DriverProfile.asp?ID=${driverId}`).then((html) => {
 const doc = new DOMParser().parseFromString(html, 'text/html');
 const d = parseDriverProfileDOM(doc);
 if (d) { setStaleData('/DriProfile', d); results.driver = true; }
 }).catch((e) => logError('background DriverProfile fetch failed:', e.message)));
 }
 if (trackId) {
 jobs.push(fetchPageHTML(`TrackDetails.asp?id=${trackId}`).then((html) => {
 const doc = new DOMParser().parseFromString(html, 'text/html');
 const t = parseTrackDetailsDOM(doc);
 if (t) { setStaleData('/TrackProfile', t); results.track = true; }
 }).catch((e) => logError('background TrackDetails fetch failed:', e.message)));
 }
 jobs.push(fetchPageHTML('Suppliers.asp').then((html) => {
 const doc = new DOMParser().parseFromString(html, 'text/html');
 const s = parseTyreSuppliersDOM(doc);
 if (s) { setStaleData('/TyreSuppliers', s); results.suppliers = true; }
 }).catch((e) => logError('background Suppliers fetch failed:', e.message)));
 jobs.push(fetchPageHTML('StaffAndFacilities.asp').then((html) => {
 const doc = new DOMParser().parseFromString(html, 'text/html');
 const staff = parseStaffFacilitiesDOM(doc);
 if (staff) { setStaleData('/StaffAndFacilities', staff); results.staff = true; }
 }).catch((e) => logError('background StaffAndFacilities fetch failed:', e.message)));
 jobs.push(fetchPageHTML('Testing.asp').then((html) => {
 const doc = new DOMParser().parseFromString(html, 'text/html');
 const t = parseTestingDOM(doc);
 if (t) { setStaleData('/Testing', t); results.testing = true; }
 }).catch((e) => logError('background Testing fetch failed:', e.message)));
 // Qualify.asp carries the same weather forecast used on Qualify2/RaceSetup - fetching it here
 // means /Practice has a fallback even if the user hasn't opened a qualify page this race weekend.
 jobs.push(fetchPageHTML('Qualify.asp').then((html) => {
 const doc = new DOMParser().parseFromString(html, 'text/html');
 const w = parseWeatherDOM(doc);
 if (w) { setStaleData('/Practice', w); results.weather = true; }
 }).catch((e) => logError('background Qualify weather fetch failed:', e.message)));
 // TD profile: parse if link is visible on page
 if (tdId) {
 jobs.push(fetchPageHTML(`TDProfile.asp?ID=${tdId}`).then((html) => {
 const doc = new DOMParser().parseFromString(html, 'text/html');
 const td = parseTdProfileDOM(doc);
 if (td) { setStaleData('/TDProfile', td); results.td = true; }
 }).catch((e) => logError('background TDProfile fetch failed:', e.message)));
 }
 // NegotiationsOverview: parse sponsor/car-spot data
 jobs.push(fetchPageHTML('NegotiationsOverview.asp').then((html) => {
 const doc = new DOMParser().parseFromString(html, 'text/html');
 const neg = parseNegOverviewDOM(doc);
 if (neg) { setStaleData('/NegOverview', neg); results.neg = true; }
 }).catch((e) => logError('background NegotiationsOverview fetch failed:', e.message)));

 await Promise.allSettled(jobs);
 return results;
 }

 // Pre-caches avgSpeed/lapDistance (etc) for every track in the season, via Calendar.asp - so
 // estimateLapsPerWeatherPeriod() has real per-track data for WHICHEVER race comes up next,
 // instead of depending on the narrow "next race" link on gpro.asp having been background-
 // captured recently (backgroundCaptureAuxPages only ever knows about the single upcoming race).
 // Added 2026-07-27 per explicit user request: "this track information is there for every race,
 // which we pull from calendar... before every race we pull the actual race info". Runs at most
 // once per season (tracked via gpro_season_specs_cached_season) - track physical specs (lap
 // distance, corners, etc.) don't change race to race, so there's no reason to ever refetch a
 // track that's already cached. groupStr is the raw `/Menu` `group` field (e.g. "Amateur - 3")
 // needed for Calendar.asp's own Group query param.
 async function backgroundCacheSeasonTrackSpecs(groupStr) {
 if (!groupStr) return { attempted: 0, cached: 0 };
 const seasonKey = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.currentSeason) || 'unknown';
 const doneFor = GM_getValue('gpro_season_specs_cached_season', '');
 if (doneFor === `${seasonKey}|${groupStr}`) return { attempted: 0, cached: 0 };
 try {
 const calHtml = await fetchPageHTML(`Calendar.asp?Group=${encodeURIComponent(groupStr)}`);
 const calDoc = new DOMParser().parseFromString(calHtml, 'text/html');
 const races = parseCalendarDOM(calDoc);
 if (!races) return { attempted: 0, cached: 0 };
 const missing = races.filter(r => {
 const cached = getStaleData(`/TrackSpecs/${encodeURIComponent(r.name)}`);
 return !cached || !cached.data || cached.data.avgSpeed == null || cached.data.lapDistance == null;
 });
 let cachedCount = races.length - missing.length;
 if (missing.length) {
 const results = await mapLimit(missing, NET_CONCURRENCY, async (r) => {
 const html = await fetchPageHTML(`TrackDetails.asp?id=${r.id}`);
 const doc = new DOMParser().parseFromString(html, 'text/html');
 const t = parseTrackDetailsDOM(doc);
 if (t) { setStaleData(`/TrackSpecs/${encodeURIComponent(r.name)}`, t); return true; }
 return false;
 });
 cachedCount += results.filter(r => r.status === 'fulfilled' && r.value).length;
 }
 if (cachedCount >= races.length) GM_setValue('gpro_season_specs_cached_season', `${seasonKey}|${groupStr}`);
 return { attempted: missing.length, cached: cachedCount, total: races.length };
 } catch (e) { logError('background season track-specs fetch failed:', e.message); return { attempted: 0, cached: 0 }; }
 }

 // Resolves the effective wet/dry flag for a session dropdown (Q1/Q2). Auto-detects from the
 // weather widget (DOM rain icon first, forecast rain% as fallback) and keeps following that
 // detection on every page load UNTIL the user manually touches the dropdown at least once -
 // after that their choice sticks (tracked by a separate "_manual" flag) instead of being
 // silently overwritten by the auto-detect on the next reload.
 function resolveSessionWet(gmKey, autoValue) {
 const manual = GM_getValue(gmKey + '_manual', '0') === '1';
 if (manual) return GM_getValue(gmKey, '0') === '1';
 const val = autoValue === null || autoValue === undefined ? false : autoValue;
 GM_setValue(gmKey, val ? '1' : '0');
 return val;
 }
 function setSessionWetManual(gmKey, wet) {
 GM_setValue(gmKey, wet ? '1' : '0');
 GM_setValue(gmKey + '_manual', '1');
 }

  // Estimates Elite laps per 30-min weather period for THIS track (weather transitions land on
  // the same ABSOLUTE lap for every league, not a fraction of each race's distance). Derived per-
  // track from TrackDetails.asp "Average speed"/"Lap distance": lapTime = lapDistance/avgSpeed,
  // laps/period = 1800s/lapTime, then corrected by a single real calibration ratio (Losail:
  // formula ~22.2 vs user's ground-truth 20). Two-point derivation, not verified - revisit if a
  // different track falls outside the window. Falls back to the flat Losail constant when the
  // track details aren't available.
  const LAPS_PER_PERIOD_FALLBACK = 20;
 const LAPS_PER_PERIOD_CALIBRATION = 20 / ((1800 / (5.381 / 239.08 * 3600)));
 function estimateLapsPerWeatherPeriod(track) {
 let avgSpeed = track && parseFloat(track.avgSpeed);
 let lapDistance = track && parseFloat(track.lapDistance);
 // The currently-resolved `track` object (getDataDomOnly('/TrackProfile')) might be a stale
 // cache captured before avgSpeed/lapDistance were added to the parser, or might be API-sourced
 // (no DOM fallback for those two fields via the API path). Fall back to the season-wide
 // per-track cache (backgroundCacheSeasonTrackSpecs, keyed by track name) before giving up.
 if ((!avgSpeed || !lapDistance) && track && (track.trackName || track.name)) {
 const specs = getStaleData(`/TrackSpecs/${encodeURIComponent(track.trackName || track.name)}`);
 if (specs && specs.data) {
 avgSpeed = avgSpeed || parseFloat(specs.data.avgSpeed);
 lapDistance = lapDistance || parseFloat(specs.data.lapDistance);
 }
 }
 if (!avgSpeed || !lapDistance) return LAPS_PER_PERIOD_FALLBACK;
 const lapTimeSeconds = (lapDistance / avgSpeed) * 3600;
 if (!lapTimeSeconds || !isFinite(lapTimeSeconds)) return LAPS_PER_PERIOD_FALLBACK;
 const raw = 1800 / lapTimeSeconds;
 return Math.max(1, Math.round(raw * LAPS_PER_PERIOD_CALIBRATION));
 }

 // ============================================================
 // WEATHER STRATEGY
 // ============================================================
 function analyzeWeather(weather) {
 if (!weather) return null;
 const segs = [];
 for (let i = 1; i <= 4; i++) {
 const rL = weather[`raceQ${i}RainPLow`] || 0;
 const rH = weather[`raceQ${i}RainPHigh`] || 0;
 const tL = weather[`raceQ${i}TempLow`] || 0;
 const tH = weather[`raceQ${i}TempHigh`] || 0;
 const hL = weather[`raceQ${i}HumLow`] || 0;
 const hH = weather[`raceQ${i}HumHigh`] || 0;
 segs.push({ name: `Seg ${i}`, rainMax: Math.max(rL, rH), rainMin: Math.min(rL, rH), tempAvg: (tL + tH) / 2, humAvg: (hL + hH) / 2 });
 }
 const maxRain = Math.max(...segs.map(s => s.rainMax));
 const avgTemp = segs.reduce((a, s) => a + s.tempAvg, 0) / segs.length;
 const hasRain = segs.filter(s => s.rainMax >= 40);
 // commitRain drives the STARTING tyre recommendation, so it must reflect race-START
 // conditions (segment 1) only - not "rain hits 40% at any point in the race". A track that's
 // dry at the start and only risks rain in the final segment should start on dry tyres and
 // switch mid-race (see the separate "Rain Strategy" pit-timing section), not start on Rain.
 const startRainRisk = segs[0].rainMax;
 return { segs, maxRain, avgTemp, hasRain, startRainRisk, commitRain: startRainRisk >= 40 };
 }

 // ============================================================
 // TYRE STRATEGY (based on real GPRO mechanics)
 // Formula: Total Lost Time = TCD + FLD + Pits
 // TCD = Tyre Compound Degradation (time lost running on worn tyres)
 // FLD = Fuel Load Degradation (time lost carrying fuel weight)
 // Pits = pit lane loss × stops + refueling time
 //
 // CTR (Clear Track Risk) multiplies tyre wear rate:
 // wearMult = 1 + CTR / 50 (CTR=0 → 1.0x, CTR=30 → 1.6x)
 //
 // Factors: track wear, supplier durability, driver attributes,
 // car suspension, temperature vs supplier peak temp, CTR
 // ============================================================
 function calcTyreStrategy(track, testing, weather, car, driver, supplier, ctr) {
 const laps = track ? parseInt(track.laps) || 0 : 0;
 const pitLoss = track ? parseFloat(track.timeInOutPits) || 20 : 20;
 const consStr = track ? track.fuelConsumption : 'Medium';
 const wearStr = track ? track.tyreWear : 'Medium';
 const trackTempAvg = weather ? ((weather.raceQ1TempLow + weather.raceQ1TempHigh) / 2 || 25) : 25;
 const ctrValue = ctr || 0;

 // === FUEL PER LAP ===
 let fuelPerLap = null;
 if (testing && testing.stintsDone && testing.stintsDone.length > 0) {
 const last = testing.stintsDone[testing.stintsDone.length - 1];
 const fs = parseInt(last.setFuel) || 0;
 const fl = parseInt(last.fuelLeft) || 0;
 const ld = parseInt((last.lapsDone || '0/0').split('/')[0]) || 1;
 if (fs > fl && ld > 0) fuelPerLap = (fs - fl) / ld;
 }
 if (!fuelPerLap) {
 // Prefer GAPP's per-track fuel-per-km data (real number for the actual track) over the
 // Very Low..Very High bucket guess
 const gappTrack = lookupGappTrack(track && track.trackName, 'trackData');
 fuelPerLap = gappTrack ? gappTrack.values[6] * gappTrack.values[13] : (FUEL_BASE[consStr] || 2.4);
 const driConc = driver ? (parseInt(driver.concentration) || 100) : 100;
 const driAggr = driver ? (parseInt(driver.aggressiveness) || 50) : 50;
 const driExp = driver ? (parseInt(driver.experience) || 50) : 50;
 const driTech = driver ? (parseInt(driver.techInsight) || 50) : 50;
 fuelPerLap *= (1.0 - (driConc - 100) * 0.001)
 * (1.0 + (driAggr - 50) * 0.002)
 * (1.0 - (driExp - 50) * 0.001)
 * (1.0 - (driTech - 50) * 0.001);
 if (car) {
 const engLvl = parseInt(car.lvlEngine) || 1;
 fuelPerLap *= (1.0 - (engLvl - 1) * 0.005);
 }
 }

 // === TYRE WEAR MULTIPLIER ===
 // Base from track wear rating
 let baseWearMult = WEAR_MULTIPLIERS[wearStr] || 1.0;

 // Supplier durability (1-8): higher = more durable = tyres last longer
 const supDurability = supplier ? (parseInt(supplier.durability) || 4) : 4;
 const supDurabilityMult = 0.7 + (supDurability - 1) * 0.086;

 // Temperature effect: deviation from supplier peak temp increases wear
 const supPeakTemp = supplier ? (parseInt(supplier.peakTemperature) || 25) : 25;
 const tempDeviation = Math.abs(trackTempAvg - supPeakTemp);
 const tempMult = 1.0 + tempDeviation * 0.008;

 // Driver factors
 const driAggr = driver ? (parseInt(driver.aggressiveness) || 50) : 50;
 const driExp = driver ? (parseInt(driver.experience) || 50) : 50;
 const driWeight = driver ? (parseInt(driver.weight) || 75) : 75;
 const aggrWearFactor = 1.0 + (driAggr - 50) * 0.004;
 const expWearFactor = 1.0 - (driExp - 50) * 0.002;
 const weightFactor = 1.0 + (driWeight - 75) * 0.002;

 // Car suspension level (higher = less wear)
 const suspLevel = car ? (parseInt(car.lvlSusp) || 1) : 1;
 const suspFactor = 1.0 - (suspLevel - 1) * 0.008;

 // CTR multiplier: higher CTR = more aggressive driving = faster wear
 // CTR=0 → 1.0x, CTR=30 → 1.6x (calibrated by Tushant Sharma)
 const ctrMult = 1.0 + ctrValue / 50;

 // Combined wear multiplier
 const combinedWearMult = baseWearMult * supDurabilityMult * tempMult *
 aggrWearFactor * expWearFactor * weightFactor * suspFactor * ctrMult;

 // === COMPOUND ANALYSIS ===
 const results = [];
 const dryCompounds = ['Extra Soft', 'Soft', 'Medium', 'Hard'];

 // Total race fuel with 3% safety margin
 const totalFuel = Math.ceil(fuelPerLap * laps * 1.03);

 const compoundWearRates = D.tyreConstants?.compoundWearRates || {
 'Extra Soft': 5.65, 'Soft': 4.10, 'Medium': 3.02, 'Hard': 2.23, 'Rain': 3.50,
 };
 // Enhance with scraped tyre compound factors (from gprohub.net) if available
 // Lower factor = faster wear. Convert factor to effective wear rate adjustment
 if (D.tyreCompoundFactors) {
  for (const [name, info] of Object.entries(D.tyreCompoundFactors)) {
   if (compoundWearRates[name] !== undefined) {
    // Factor 0.998 = fast wear (ES), 0.9959 = slow wear (Hard)
    // Map factor range to wear rate multiplier: 0.998→1.3, 0.996→1.0, 0.995→0.8
    const factorM = 1.0 + (info.factor - 0.996) * 150;
    compoundWearRates[name] = compoundWearRates[name] * factorM;
   }
  }
 }
 const CTR_WEAR_ADD = D.tyreConstants?.ctrWearAdd ?? 0.01;
 const compoundSpeedDelta = D.tyreConstants?.compoundSpeedDelta || {
 'Extra Soft': -1.5, 'Soft': -0.8, 'Medium': 0, 'Hard': 0.5, 'Rain': 0,
 };

 for (const [name, spec] of Object.entries(COMPOUNDS)) {
 const isRain = name === 'Rain';

 // Base wear rate for this compound
 const baseWearRate = compoundWearRates[name] || 3.0;

 // Calculate effective wear rate per lap
 // wearPerLap = baseWearRate × combinedWearMult + CTR effect
 const wearPerLap = (baseWearRate * combinedWearMult) + (ctrValue * CTR_WEAR_ADD);

 // Determine optimal number of stops
 // Strategy: pit when tyre wear reaches threshold (e.g., 15%)
 // Final wear = 100 - (wearPerLap × lapsPerStint)
 // We want final wear >= 15% for optimal performance
 let bestTotal = Infinity;
 let bestConfig = null;

 // Try different stop strategies (0 to 6 stops)
 for (let stops = 0; stops <= 6; stops++) {
 const stints = stops + 1;
 const lapsPerStint = Math.ceil(laps / stints);

 // Calculate final wear for this stint length
 const finalWear = 100 - (wearPerLap * lapsPerStint);

 // If final wear is too low, this strategy won't work
 // (tyres would be too worn, causing slow laps or DNF)
 if (finalWear < 5 && stops < 6) continue;

 // Fuel per stint
 const fuelPerStint = Math.ceil(totalFuel / stints);
 if (fuelPerStint > TANK_MAX) continue;

  // === TCD: Tyre Compound Degradation ===
  // TCD increases as final wear decreases (more time on worn tyres)
  // TCD = 0 when final wear is high, increases as wear approaches 0
  // Use scraped supplier compoundDiff if available (from gprohub.net)
  const supplierCompoundDiff = (supplier && D.tyreSuppliers)
   ? (D.tyreSuppliers.find(s => s.name === supplier.name)?.compoundDiff || 0)
   : 0;
  const wearPenalty = Math.max(0, (100 - finalWear) / 100);
  const speedDelta = compoundSpeedDelta[name] || 0;
  const tcd = stops * wearPenalty * Math.abs(speedDelta) * 2 + (supplierCompoundDiff * laps * 0.1);

 // === FLD: Fuel Load Degradation ===
 // FLD = fuel weight penalty per lap × total laps
 const avgFuelLoad = fuelPerStint / 2;
 const fldPerLap = (avgFuelLoad * 0.75 * 0.03) / TANK_MAX * 100;
 const fld = fldPerLap * laps;

 // === PITS: Pit stop time loss ===
 const refuelTimePerStop = fuelPerStint * 0.1;
 const pits = stops * (pitLoss + refuelTimePerStop);

 // Total time lost
 const total = tcd + fld + pits;

 if (total < bestTotal) {
 bestTotal = total;
 bestConfig = {
 stops,
 fuelPerStint,
 stints,
 lapsPerStint,
 tcd,
 fld,
 pits,
 total,
 finalWear: Math.max(0, finalWear),
 };
 }
 }

 if (bestConfig) {
 results.push({
 name,
 stops: bestConfig.stops,
 fuelPerStint: bestConfig.fuelPerStint,
 stints: bestConfig.stints,
 lapsPerStint: bestConfig.lapsPerStint,
 total: bestConfig.total.toFixed(1),
 tcd: bestConfig.tcd.toFixed(1),
 fld: bestConfig.fld.toFixed(1),
 pits: bestConfig.pits.toFixed(1),
 finalWear: bestConfig.finalWear.toFixed(1),
 isRain,
 });
 }
 }

 return finalizeTyreStrategy(results, weather, trackTempAvg, laps, pitLoss, fuelPerLap, totalFuel, combinedWearMult, ctrValue, supplier, supDurability, supPeakTemp, 'own');
 }

 // Shared "pick the best strategy" tail, used by both the legacy calibrated model above and
 // the GAPP-formula model below - keeps the recommendation logic in exactly one place.
 function finalizeTyreStrategy(results, weather, trackTempAvg, laps, pitLoss, fuelPerLap, totalFuel, combinedWearMult, ctrValue, supplier, supDurability, supPeakTemp, source) {
 // Sort by total lost time (lower = better)
 results.sort((a, b) => parseFloat(a.total) - parseFloat(b.total));

 const dryResults = results.filter(r => !r.isRain);
 const bestDry = dryResults[0];
 const bestWet = results.find(r => r.isRain);

 // === FINAL RECOMMENDATION ===
 const analyze = analyzeWeather(weather);
 let finalRec;
 let recReason;

 if (analyze && analyze.commitRain) {
 finalRec = bestWet ? bestWet.name : 'Rain';
 recReason = `Rain expected at race start (${analyze.startRainRisk}%) - Rain tyres mandatory`;
 } else if (analyze && analyze.maxRain >= 30) {
 finalRec = `${bestDry.name}`;
 recReason = `Start on ${bestDry.name} (dry at start) - rain risk rises later in the race (up to ${analyze.maxRain}%), watch for a pit-to-Rain window`;
 } else if (analyze && analyze.maxRain >= 15) {
 finalRec = `${bestDry.name}`;
 recReason = `Low rain risk (${analyze.maxRain}%) - ${bestDry.name} optimal`;
 } else {
 let tempRec = 'Medium';
 if (trackTempAvg < 10) tempRec = 'Extra Soft';
 else if (trackTempAvg < 20) tempRec = 'Soft';
 else if (trackTempAvg < 30) tempRec = 'Medium';
 else tempRec = 'Hard';

 if (bestDry.name === tempRec) {
 finalRec = bestDry.name;
 recReason = `Temperature check agrees (${trackTempAvg.toFixed(0)}°C → ${tempRec})`;
 } else {
 finalRec = bestDry.name;
 recReason = `Calculated: ${bestDry.name} (temp rule suggests ${tempRec} at ${trackTempAvg.toFixed(0)}°C)`;
 }
 }

 return {
 results,
 bestDry,
 bestWet,
 finalRec,
 recReason,
 laps,
 pitLoss,
 fuelPerLap: fuelPerLap.toFixed(2),
 totalFuel,
 trackTemp: trackTempAvg.toFixed(0),
 combinedWearMult: combinedWearMult !== null ? combinedWearMult.toFixed(2) : null,
 ctrValue,
 supplierInfo: supplier ? {
 name: supplier.name,
 durability: supDurability,
 peakTemp: supPeakTemp,
 } : null,
 source,
 };
 }

 // ============================================================
 // GAPP-DERIVED TYRE STRATEGY (calcs.py stopCalc/fuelLoadCalc/fuelTimeCalc/compoundCalc)
 // Uses the exact per-track stop-count formula (exponential decay across track wear/temp/
 // supplier/compound/suspension/driver) instead of our flat compound-wear-rate model. Falls
 // back to null (caller uses the legacy model) when track/driver/car/supplier data isn't
 // available, or the tyre supplier name isn't one GAPP has factors for.
 // ============================================================
 // Case/whitespace-insensitive dict lookup - GPRO's supplier names come from a live API field
 // we can't fully verify offline, so don't let a trivial spelling/case mismatch silently kill
 // the whole GAPP tyre calc.
 function gappLookupByName(dict, name) {
 if (!dict || !name) return undefined;
 if (dict[name] !== undefined) return dict[name];
 const norm = String(name).trim().toLowerCase();
 for (const key of Object.keys(dict)) {
 if (key.toLowerCase() === norm) return dict[key];
 }
 return undefined;
 }

 function calcTyreStrategyGapp(track, testing, weather, car, driver, supplier, ctr, staffTd) {
 const gapp = typeof GPRO_DATA !== 'undefined' ? GPRO_DATA.gapp : null;
 const trackName = track && track.trackName;
 const gappTrack = lookupGappTrack(trackName, 'trackData');
 if (!gapp) { logDebug('[GPRO][gapp tyre] no GPRO_DATA.gapp loaded'); return null; }
 if (!gappTrack) { logDebug(`[GPRO][gapp tyre] track "${trackName}" not found in gapp.trackData`); return null; }
 if (!driver) { logDebug('[GPRO][gapp tyre] no driver data'); return null; }
 if (!car) { logDebug('[GPRO][gapp tyre] no car data'); return null; }
 if (!supplier || !supplier.name) { logDebug('[GPRO][gapp tyre] no supplier data (supplier.name missing)'); return null; }
 const sc = gapp.stopCalc;
 const supFactor = gappLookupByName(sc.tyreSupplierFactor, supplier.name);
 const supCompoundFactor = gappLookupByName(gapp.tyreCompoundSupplierFactor, supplier.name);
 if (supFactor === undefined || supCompoundFactor === undefined) {
 logDebug(`[GPRO][gapp tyre] supplier name "${supplier.name}" doesn't match any known key (${Object.keys(sc.tyreSupplierFactor).join(', ')}) - using legacy`);
 return null;
 }

 const t = gappTrack.values;
 const trackDistanceTotal = t[8], trackFuelDry = t[6], trackFuelWet = t[7], trackWearFactor = t[9], trackCorners = t[11], trackLaps = t[12], lapLength = t[13];
 const laps = track ? (parseInt(track.laps) || trackLaps) : trackLaps;
 const pitInOut = track ? (parseFloat(track.timeInOutPits) || 20) : 20;
 const wearRatingStr = track ? (track.tyreWear || 'Medium') : 'Medium';
 const wearLevelLookup = gappLookupByName(sc.trackWearLevelMap, wearRatingStr);
 const trackWearLevel = wearLevelLookup !== undefined ? wearLevelLookup : 2;
 const rTemp = weather ? ((weather.raceQ1TempLow + weather.raceQ1TempHigh) / 2 || 25) : 25;

 const conc = parseInt(driver.concentration) || 100;
 const aggr = parseInt(driver.aggressiveness) || 50;
 const exp = parseInt(driver.experience) || 50;
 const ti = parseInt(driver.techInsight || driver.technicalInsight) || 50;
 const weight = parseInt(driver.weight) || 75;
 const suspLvl = gappCarPartLvl(car, 'Suspension');
 const engLvl = gappCarPartLvl(car, 'Engine');
 const elecLvl = gappCarPartLvl(car, 'Electronics');
 const ctrValue = ctr || 0;
 const wearLimit = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.tyreConstants) ? GPRO_DATA.tyreConstants.wearThreshold : 15;

 function stopsFor(tyreTypeIdx, wetFactor) {
 const productFactors = Math.pow(sc.trackWearLevelExp, trackWearLevel) * Math.pow(sc.tempExp, rTemp) * Math.pow(sc.supplierExp, supFactor) *
 Math.pow(sc.tyreTypeExp, tyreTypeIdx) * Math.pow(sc.suspensionExp, suspLvl) * Math.pow(sc.aggressivenessExp, aggr) *
 Math.pow(sc.experienceExp, exp) * Math.pow(sc.weightExp, weight);
 const stops = Math.ceil(trackDistanceTotal / ((productFactors * sc.baseWear * trackWearFactor * wetFactor) * ((100 - wearLimit) / 100))) - 1;
 return Math.max(0, stops);
 }

 const ff = gapp.fuelFactorCoeffs;
 const fuelFactor = ff.concentration * conc + ff.aggressiveness * aggr + ff.experience * exp + ff.techInsight * ti + ff.engineLevel * engLvl + ff.electronicsLevel * elecLvl;

 let testingFuelPerLap = null;
 if (testing && testing.stintsDone && testing.stintsDone.length > 0) {
 const last = testing.stintsDone[testing.stintsDone.length - 1];
 const fs = parseInt(last.setFuel) || 0;
 const fl = parseInt(last.fuelLeft) || 0;
 const ld = parseInt((last.lapsDone || '0/0').split('/')[0]) || 1;
 if (fs > fl && ld > 0) testingFuelPerLap = (fs - fl) / ld;
 }
 const fuelPerLapDry = testingFuelPerLap || (trackDistanceTotal * (trackFuelDry + fuelFactor) / laps);

 const compounds = [
 { name: 'Extra Soft', idx: 0, wetFactor: 1 },
 { name: 'Soft', idx: 1, wetFactor: 1 },
 { name: 'Medium', idx: 2, wetFactor: 1 },
 { name: 'Hard', idx: 3, wetFactor: 1 },
 { name: 'Rain', idx: sc.rainTyreTypeIndex, wetFactor: 0.73 },
 ];

 const results = [];
 const pt = gapp.pitTimeCalc;
 compounds.forEach(c => {
 const isRain = c.name === 'Rain';
 const stops = stopsFor(c.idx, c.wetFactor);
 const stints = stops + 1;
 const lapsPerStint = Math.ceil(laps / stints);
 const trackFuelBase = isRain ? trackFuelWet : trackFuelDry;
 const fuelPerStint = testingFuelPerLap
 ? Math.ceil(testingFuelPerLap * lapsPerStint)
 : Math.ceil(trackDistanceTotal * (trackFuelBase + fuelFactor) / stints);
 if (fuelPerStint > TANK_MAX || fuelPerStint <= 0) return; // infeasible for this stint count

 let tcd = 0;
 if (!isRain && c.idx > 0) {
 const oneStepTcd = laps * ((trackCorners * lapLength * gapp.compoundCalcConstant * (50 - rTemp)) + supCompoundFactor);
 tcd = oneStepTcd * c.idx; // Soft=1x, Medium=2x, Hard=3x the one-step time loss vs Extra Soft
 }
 const fld = gapp.fuelTimeCalcConstant * (trackDistanceTotal * trackDistanceTotal * (trackFuelBase + fuelFactor) / stints);
 const hasTd = !!(staffTd && staffTd.hasTd);
 const infl = hasTd ? pt.withTd : pt.noTd;
 const staffConc = (staffTd && staffTd.staffConcentration) || 0;
 const staffStress = (staffTd && staffTd.staffStress) || 0;
 const tdExp = (staffTd && staffTd.tdExperience) || 0;
 const tdPitCoord = (staffTd && staffTd.tdPitCoordination) || 0;
 // Floor at 15s/stop - confirmed via our StrategyService (`max(15.0, $pitTime)`,
 // ) as a real sanity clamp GPRO's own pit stop can't go below. Our
 // GAPP-derived coefficients are a different calibration, but this floor is a fact about the
 // game itself, not something tied to either project's specific coefficients.
 const pitTimePerStop = Math.max(15, (fuelPerStint * infl.fuelInfluence) + pt.base + (infl.concInfluence * staffConc) +
 (hasTd ? (infl.stressInfluence * staffStress) + (infl.tdExpInfluence * tdExp) + (infl.tdPitCoordInfluence * tdPitCoord) : 0));
 const pits = stops * (pitTimePerStop + pitInOut);
 const total = tcd + fld + pits;

 results.push({
 name: c.name, stops, fuelPerStint, stints, lapsPerStint,
 total: total.toFixed(1), tcd: tcd.toFixed(1), fld: fld.toFixed(1), pits: pits.toFixed(1),
 finalWear: wearLimit.toFixed(1), isRain,
 });
 });
 if (results.length === 0) return null;

 const totalFuel = Math.ceil(fuelPerLapDry * laps * 1.03);
 return finalizeTyreStrategy(results, weather, rTemp, laps, pitInOut, fuelPerLapDry, totalFuel, null, ctrValue, supplier, parseInt(supplier.durability) || 4, parseInt(supplier.peakTemperature) || 25, 'gapp');
 }

 // Real per-compound total-time data from GPRO Analyzer (internal formulas has none of this -
 // it's OUR OWN captured data in GPRO_DATA.gproAnalyzerCalibration, currently Spa GP + Kaunas GP
 // only). This is actual observed race-strategy output for this exact driver/car, not a formula
 // estimate - so it outranks even GAPP when we have it for the current track.
 function lookupCalibratedTyreResults(trackName, ctr) {
 if (!trackName || typeof GPRO_DATA === 'undefined' || !GPRO_DATA.gproAnalyzerCalibration) return null;
 let calib = null;
 const firstWord = trackName.split(' ')[0];
 for (const [key, data] of Object.entries(GPRO_DATA.gproAnalyzerCalibration)) {
 if (trackName.includes(key.split(' ')[0]) || key.includes(firstWord)) { calib = data; break; }
 }
 if (!calib || !calib.strategies) return null;
 const ctrValue = ctr || 0;
 let scenarioKey = 'baseline';
 if (ctrValue >= 40 && calib.strategies.ctr50) scenarioKey = 'ctr50';
 else if (ctrValue >= 20 && calib.strategies.ctr30) scenarioKey = 'ctr30';
 else if (ctrValue >= 5 && calib.strategies.ctr10) scenarioKey = 'ctr10';
 const scenario = calib.strategies[scenarioKey] || calib.strategies.baseline;
 if (!scenario) return null;
 return {
 laps: calib.laps, pitLoss: calib.pitLoss,
 results: Object.entries(scenario).map(([name, s]) => ({
 name, stops: s.stops, fuelPerStint: s.fuel, stints: s.stops + 1,
 lapsPerStint: calib.laps ? Math.ceil(calib.laps / (s.stops + 1)) : 0,
 total: (s.total || 0).toFixed(1), tcd: (s.tcd || 0).toFixed(1),
 fld: (s.fld || 0).toFixed(1), pits: (s.pits || 0).toFixed(1),
 finalWear: '15.0', isRain: name === 'Rain',
 })),
 };
 }

 // Priority: (1) Per-track formula (real per-track data + verified formulae), (2) our calibrated model
 // calibrated data as fallback when GAPP has nothing for this track, (3) our own generic formula.
 // our calibrated model is NOT treated as ground truth - it's a single observation and can itself be
 // wrong (different car/driver/setup than yours). When both GAPP and calibrated data exist for a track,
 // both are computed and compared; if they diverge a lot per compound, `calibratedDivergence` is set and
 // both stop counts are surfaced in the UI instead of silently picking one.
 function calcTyreStrategySmart(track, testing, weather, car, driver, supplier, ctr, staffTd) {
 const trackName = track && track.trackName;
 const legacyResult = calcTyreStrategy(track, testing, weather, car, driver, supplier, ctr);
 const calibrated = lookupCalibratedTyreResults(trackName, ctr);
 const gappResult = calcTyreStrategyGapp(track, testing, weather, car, driver, supplier, ctr, staffTd);
 let result = gappResult || (calibrated
 ? finalizeTyreStrategy(calibrated.results, weather, parseFloat(legacyResult.trackTemp), calibrated.laps || legacyResult.laps,
 calibrated.pitLoss || legacyResult.pitLoss, parseFloat(legacyResult.fuelPerLap), legacyResult.totalFuel, null, ctr || 0,
 supplier, supplier ? (parseInt(supplier.durability) || 4) : null, supplier ? (parseInt(supplier.peakTemperature) || 25) : null, 'calibrated')
 : legacyResult);

 if (result !== legacyResult) {
 result.ownCrossCheck = {};
 legacyResult.results.forEach(r => { result.ownCrossCheck[r.name] = r.stops; });
 }

 // 3 of GPRO's 9 real tyre suppliers (Hancock, Bridgerock, Michelini - confirmed to exist per
 // docs/page-structures.md) have no disclosed numeric factor anywhere we've found, so
 // calcTyreStrategyGapp silently returns null for them and falls back to legacy/calibrated.
 // Surface that here instead of a console-only note, so the user knows why the per-track
 // formula wasn't used rather than assuming it just wasn't available at all.
 if (!gappResult && supplier && supplier.name) {
 const gapp = typeof GPRO_DATA !== 'undefined' ? GPRO_DATA.gapp : null;
 const known = gapp && gapp.stopCalc && gapp.stopCalc.tyreSupplierFactor;
 if (known && !Object.keys(known).some(k => k.toLowerCase() === String(supplier.name).trim().toLowerCase())) {
 result.supplierFactorUnknown = supplier.name;
 }
 }

 if (gappResult && calibrated) {
 result.calibratedCrossCheck = {};
 let divergent = [];
 calibrated.results.forEach(cr => {
 result.calibratedCrossCheck[cr.name] = cr.stops;
 const gr = gappResult.results.find(r => r.name === cr.name);
 if (gr && Math.abs(gr.stops - cr.stops) >= 1) {
 divergent.push(`${cr.name}: gapp=${gr.stops} vs our calibrated model=${cr.stops}`);
 }
 });
 if (divergent.length) result.calibratedDivergence = divergent;
 }
 return result;
 }


 // ============================================================
 // CAR SETUP CALCULATOR
 // ============================================================
 // Temperature coefficients derived by Tushant Sharma from Montreal calibration data
 // Each part has a base value at 0°C and a coefficient per °C
 const SETUP_PARTS = D.setupConstants?.parts || ['Front Wing', 'Rear Wing', 'Engine', 'Brakes', 'Gearbox', 'Suspension'];
 const SETUP_BASE_Q1 = D.setupConstants?.baseQ1 || { 'Front Wing': 227, 'Rear Wing': 567, 'Engine': 809, 'Brakes': 334, 'Gearbox': 686, 'Suspension': 493 };
 const SETUP_COEFF = D.setupConstants?.coeff || { 'Front Wing': 4.77, 'Rear Wing': 6.03, 'Engine': -3.13, 'Brakes': 6.0, 'Gearbox': -4.0, 'Suspension': -6.0 };
 const SETUP_Q2_DELTA = D.setupConstants?.q2Delta || { 'Front Wing': 0, 'Rear Wing': 0, 'Engine': 0, 'Brakes': 0, 'Gearbox': 0, 'Suspension': 0 };
 const SETUP_RACE_DELTA = D.setupConstants?.raceDelta || { 'Front Wing': 0, 'Rear Wing': 0, 'Engine': 0, 'Brakes': 0, 'Gearbox': 0, 'Suspension': 0 };
 const SETUP_WET_MOD = D.setupConstants?.wetMod || { 'Front Wing': 68, 'Rear Wing': -44, 'Engine': -5, 'Brakes': 5, 'Gearbox': -206, 'Suspension': 6 };
 const SETUP_TRACK_ADJ = D.setupConstants?.trackAdj || { 'Front Wing': 54.6, 'Rear Wing': 19.2, 'Engine': 6.5, 'Brakes': -16.0, 'Gearbox': -13.5, 'Suspension': 20.0 };
 const MONTREAL_POWER = D.setupConstants?.montrealPower ?? 12;

 function calcCarSetup(q1Temp, q2Temp, raceTemp, q1Wet, q2Wet, raceWet, trackPower) {
 const sessions = [
 { name: 'Q1', temp: q1Temp, delta: {}, isWet: q1Wet || false },
 { name: 'Q2', temp: q2Temp, delta: SETUP_Q2_DELTA, isWet: q2Wet || false },
 { name: 'Race', temp: raceTemp, delta: Object.fromEntries(SETUP_PARTS.map(p => [p, (SETUP_Q2_DELTA[p]||0) + (SETUP_RACE_DELTA[p]||0)])), isWet: raceWet || false },
 ];
 const powerDiff = (trackPower || MONTREAL_POWER) - MONTREAL_POWER;
 const results = {};
 for (const ses of sessions) {
 results[ses.name] = {};
 for (const part of SETUP_PARTS) {
 let base = SETUP_BASE_Q1[part] || 0;
 const coeff = SETUP_COEFF[part] || 0;
 const delta = ses.delta[part] || 0;
 base += (SETUP_TRACK_ADJ[part] || 0) * powerDiff;
 const wetMod = ses.isWet ? (SETUP_WET_MOD[part] || 0) : 0;
 results[ses.name][part] = Math.round(base + coeff * ses.temp + delta + wetMod);
 }
 }
 return results;
 }

 // ============================================================
 // GAPP-DERIVED SETUP FORMULA (driver-skill + car-level/wear aware)
 // Source: internal formulas calcs.py setupCalc, verified by reading source directly
 // (2026-07-17). Falls back to the legacy temperature-only calcCarSetup() above when the
 // track isn't in GPRO_DATA.gapp.trackData or when driver/car data isn't loaded yet.
 // ============================================================
 function gappCarPartLvl(car, partName) {
 if (!car) return 0;
 const idx = PART_NAMES.indexOf(partName);
 return idx >= 0 ? (parseInt(car[PART_LVL_KEYS[idx]]) || 0) : 0;
 }
 function gappCarPartWear(car, partName) {
 if (!car) return 0;
 const idx = PART_NAMES.indexOf(partName);
 return idx >= 0 ? (parseInt(car[PART_WEAR_KEYS[idx]]) || 0) : 0;
 }

 function calcCarSetupGappSession(trackName, sessionTemp, isWet, driver, car) {
 const gapp = typeof GPRO_DATA !== 'undefined' ? GPRO_DATA.gapp : null;
 const gappTrack = lookupGappTrack(trackName, 'trackData');
 if (!gapp) { logDebug('[GPRO][gapp setup] no GPRO_DATA.gapp loaded'); return null; }
 if (!gappTrack) { logDebug(`[GPRO][gapp setup] track "${trackName}" not found in gapp.trackData`); return null; }
 if (!driver) { logDebug('[GPRO][gapp setup] no driver data'); return null; }
 if (!car) { logDebug('[GPRO][gapp setup] no car data'); return null; }
 // Only reject if car is essentially empty (no part levels at all, e.g. the {lvlEngine,lvlSusp}
 // minimal fallback used before /UpdateCar has ever loaded). Missing individual parts already
 // default to 0 contribution via gappCarPartLvl, so don't require every field to be present.
 const anyLevelPresent = PART_LVL_KEYS.some(k => parseInt(car[k]) > 0);
 if (!anyLevelPresent) { logDebug('[GPRO][gapp setup] car object has no part levels at all - using legacy'); return null; }

 const t = gappTrack.values;
 const trackBaseWings = t[0] * 2, trackBaseEngine = t[1], trackBaseBrakes = t[2], trackBaseGears = t[3], trackBaseSusp = t[4], trackBaseWingSplit = t[5];
 const o = gapp.setupBaseOffsets, cl = gapp.setupCarLevelOffsets, cw = gapp.setupCarWearOffsets, dOff = gapp.setupDriverOffsets, ws = gapp.wingSplit;
 const T = Math.round(parseFloat(sessionTemp) || 25);

 const talent = parseInt(driver.talent) || 50;
 const aggr = parseInt(driver.aggressiveness) || 50;
 const exp = parseInt(driver.experience) || 50;
 const conc = parseInt(driver.concentration) || 100;
 const ti = parseInt(driver.techInsight || driver.technicalInsight) || 50;
 const weight = parseInt(driver.weight) || 75;
 const lvl = (name) => gappCarPartLvl(car, name);
 const wear = (name) => gappCarPartWear(car, name);
 const clamp = (v) => Math.max(0, Math.min(999, Math.round(v)));

 // Oval tracks (Indianapolis Oval, Rafaela Oval) scale down the driver-skill contribution to
 // setup - from our own SetupCalculatorService (disclosed public default 0.39,
 // applied to each part's driver-contribution term). Approximated here at whole-term granularity
 // (applied more selectively per sub-term in some models) since our formula combines each part's
 // driver contribution into a single expression - not independently verified against real oval
 // race data, but a coarse trackMult beats applying full-weight driver skill to a mechanic these
 // formulas weren't tuned for.
 const trackMult = (trackName === 'Indianapolis Oval' || trackName === 'Rafaela Oval') ? 0.39 : 1.0;

 // Wings (Front/Rear split around a shared base)
 let setupWeather = isWet ? ((o.wingWeatherWet * T) + o.wingWeatherOffset) * 2 : o.wingWeatherDry * T * 2;
 let setupDriver = talent * (trackBaseWings + setupWeather) * o.wingDriverMultiplier * trackMult;
 let setupCarLevel = cl[0][0] * lvl('Chassis') + cl[0][1] * lvl('Front Wing') + cl[0][1] * lvl('Rear Wing') + cl[0][2] * lvl('Underbody');
 let setupCarWear = cw[0][0] * wear('Chassis') + cw[0][1] * wear('Front Wing') + cw[0][1] * wear('Rear Wing') + cw[0][2] * wear('Underbody');
 const setupWings = (trackBaseWings + setupWeather + setupDriver + setupCarLevel + setupCarWear) / 2;
 let setupWingSplit = trackBaseWingSplit + (talent * ws.talentFactor) + (ws.levelFactor * (lvl('Front Wing') + lvl('Rear Wing')) / 2) + (setupWings * ws.setupWingsFactor) + (T * ws.tempFactor);
 if (isWet) setupWingSplit += ws.wetOffset;

 // Engine
 setupWeather = isWet ? (o.engineWeatherWet * T) + o.engineWeatherOffset : o.engineWeatherDry * T;
 setupDriver = ((dOff[0][0] * aggr) + (exp * (((trackBaseEngine + setupWeather) * o.engineDriverMultiplier) + o.engineDriverOffset))) * trackMult;
 setupCarLevel = cl[1][0] * lvl('Engine') + cl[1][1] * lvl('Cooling') + cl[1][2] * lvl('Electronics');
 setupCarWear = cw[1][0] * wear('Engine') + cw[1][1] * wear('Cooling') + cw[1][2] * wear('Electronics');
 const setupEng = trackBaseEngine + setupWeather + setupDriver + setupCarLevel + setupCarWear;

 // Brakes
 setupWeather = isWet ? (o.brakesWeatherWet * T) + o.brakesWeatherOffset : o.brakesWeatherDry * T;
 setupDriver = dOff[1][0] * talent * trackMult;
 setupCarLevel = cl[2][0] * lvl('Chassis') + cl[2][1] * lvl('Brakes') + cl[2][2] * lvl('Electronics');
 setupCarWear = cw[2][0] * wear('Chassis') + cw[2][1] * wear('Brakes') + cw[2][2] * wear('Electronics');
 const setupBra = trackBaseBrakes + setupWeather + setupDriver + setupCarLevel + setupCarWear;

 // Gears
 setupWeather = isWet ? (o.gearsWeatherWet * T) + o.gearsWeatherOffset : o.gearsWeatherDry * T;
 setupDriver = dOff[2][0] * conc * trackMult;
 setupCarLevel = cl[3][0] * lvl('Gearbox') + cl[3][1] * lvl('Electronics');
 setupCarWear = cw[3][0] * wear('Gearbox') + cw[3][1] * wear('Electronics');
 const setupGea = trackBaseGears + setupWeather + setupDriver + setupCarLevel + setupCarWear;

 // Suspension
 setupWeather = isWet ? (o.suspensionWeatherWet * T) + o.suspensionWeatherOffset : o.suspensionWeatherDry * T;
 setupDriver = (dOff[3][0] * exp * trackMult) + (dOff[3][1] * weight) + (isWet ? ti * 0.11 : 0);
 setupCarLevel = cl[4][0] * lvl('Chassis') + cl[4][1] * lvl('Underbody') + cl[4][2] * lvl('Sidepods') + cl[4][3] * lvl('Suspension');
 setupCarWear = cw[4][0] * wear('Chassis') + cw[4][1] * wear('Underbody') + cw[4][2] * wear('Sidepods') + cw[4][3] * wear('Suspension');
 const setupSus = trackBaseSusp + setupWeather + setupDriver + setupCarLevel + setupCarWear;

 return {
 'Front Wing': clamp(setupWings + setupWingSplit), 'Rear Wing': clamp(setupWings - setupWingSplit),
 'Engine': clamp(setupEng), 'Brakes': clamp(setupBra),
 'Gearbox': clamp(setupGea), 'Suspension': clamp(setupSus),
 };
 }

 // Tries the GAPP driver+car-aware formula per session; falls back to the legacy
 // temperature-only calcCarSetup() (same shape) when track/driver/car data isn't available.
 function calcCarSetupSmart(q1Temp, q2Temp, raceTemp, q1Wet, q2Wet, raceWet, trackPower, trackName, driver, car) {
 const q1 = calcCarSetupGappSession(trackName, q1Temp, q1Wet, driver, car);
 const q2 = calcCarSetupGappSession(trackName, q2Temp, q2Wet, driver, car);
 const race = calcCarSetupGappSession(trackName, raceTemp, raceWet, driver, car);
 if (q1 && q2 && race) return { Q1: q1, Q2: q2, Race: race, source: 'gapp' };
 const legacy = calcCarSetup(q1Temp, q2Temp, raceTemp, q1Wet, q2Wet, raceWet, trackPower);
 legacy.source = 'legacy';
  return legacy;
  }

  // ============================================================
  // ELITE-LEVEL SETUP HELPERS
  // ============================================================

  // Wing split optimization suggestion: the pilot is satisfied with FW+RW sum, but individual
  // values affect balance. Suggest testing ±shiftRange to find driver preference.
  function calcWingSplitSuggestion(driver, setup) {
  if (!driver || !setup) return null;
  const fw = setup['Front Wing'] || 0;
  const rw = setup['Rear Wing'] || 0;
  const talent = parseInt(driver.talent) || 50;
  const shiftRange = D.gapp?.eliteWingSplit?.shiftRange || 50;
  // Higher talent drivers tend to prefer more rear wing (lower talent bias = more rear)
  const talentBias = D.gapp?.eliteWingSplit?.talentBias || -0.2465;
  const bias = Math.round(talent * talentBias);
  return {
  sum: fw + rw,
  currentFw: fw, currentRw: rw,
  suggestMoreRear: { fw: fw + bias, rw: rw - bias },
  suggestMoreFront: { fw: fw - bias, rw: rw + bias },
  note: `Test ±${shiftRange} shift from equal split. FW+RW sum = ${fw + rw} (pilot satisfied when sum is right). Talent ${talent} → bias ${bias > 0 ? '+' : ''}${bias} toward ${bias > 0 ? 'front' : 'rear'} wing.`,
  };
  }

  // ============================================================
  // MARGIN OF ACCEPTANCE (elite-verified formula)
  // ============================================================
  // MA = 135 - 0.3 × Technical Knowledge - 0.1 × Experience
  // Source: gpro-strategy.net, cross-validated with GPRO Calculator's own implementation.
  // Smaller MA = driver notices smaller setup errors = more precise setup needed = better driver.
  // Example: TechInsight=175, Experience=25 → MA = 135 - 52.5 - 2.5 = 80
  // Example: TechInsight=25, Experience=175 → MA = 135 - 7.5 - 17.5 = 110
  function calcMarginOfAcceptance(driver) {
  if (!driver) return null;
  const techKnowledge = parseInt(driver.techInsight || driver.technicalInsight) || 50;
  const experience = parseInt(driver.experience) || 50;
  return Math.round(135 - 0.3 * techKnowledge - 0.1 * experience);
  }

 // ============================================================
 // DRIVER STRATEGY (RaceSetup.asp risk block) - overtake/defend/start-approach/problem-pit-laps
 // ported from our own risk advisor (2026-07-19), a fully-disclosed
 // public heuristic (not a hidden-secrets formula, and per its own docstring "Heuristic advisor, not
 // a game formula" - same status as our own reasoning, just much better-considered). Adapted to our
 // driver-object field names and GAPP's 0-250 raw driver-stat scale. Dry/wet clear-track risk still
 // has no equivalent there (out of that advisor's scope by design - "driver energy... only affects
 // clear-track risk, which this advisor doesn't cover") so those two stay our own simpler heuristic,
 // reusing the CTR already configured in Settings for consistency with the tyre/fuel calcs.
 // ============================================================
 const RISK_OVERTAKE_BASE = { 'Very Easy': 20, 'Easy': 30, 'Normal': 40, 'Hard': 55, 'Very Hard': 65 };
 const RISK_DEFEND_BASE = { 'Very Easy': 50, 'Easy': 45, 'Normal': 40, 'Hard': 30, 'Very Hard': 25 };
 const RISK_GRIP_FACTOR = { 'Very Low': 0.82, 'Low': 0.91 };
 const RISK_TYRE_WEAR_FACTOR = { 'Very High': 0.93, 'High': 0.97 };
 const RISK_ATTR_SCALE = 2.5; // GPRO driver skills run 0-250; internal math uses 0-100
 const RISK_RAIN_WATCH = 30; // rain% from which a "dry" forecast still warrants caution
 const RISK_SHORT_RACE_KM = 293, RISK_LONG_RACE_KM = 310; // ~mean +/- 0.5 SD across GPRO's track pool
 const RISK_MIN = 5, RISK_MAX = 70;

 function calcDriverStrategyRecommendation(driver, ctr, track, raceWet, rainAvg, distanceKm) {
 const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
 const n = (key) => clamp((parseFloat(driver && driver[key]) || 125) / RISK_ATTR_SCALE, 0, 100);
 const overtaking = track && RISK_OVERTAKE_BASE[track.overtaking] !== undefined ? track.overtaking : 'Normal';
 const grip = (track && track.gripLevel) || '';
 const tyreWear = (track && track.tyreWear) || '';

 // Wet races shift weight to talent ("talent truly shines through" in tricky conditions);
 // dry races lean on concentration + experience.
 let composure = raceWet
 ? 0.30 * n('concentration') + 0.40 * n('talent') + 0.20 * n('experience') + 0.10 * n('motivation')
 : 0.40 * n('concentration') + 0.20 * n('talent') + 0.30 * n('experience') + 0.10 * n('motivation');
 // Aggression backed by experience buys attacking pace (overtake only); the share beyond it is
 // the mistake trap and trims overall margin.
 const aggGap = Math.max(0, n('aggressiveness') - n('experience'));
 const aggCovered = Math.min(n('aggressiveness'), n('experience'));
 composure = clamp(composure - 0.3 * aggGap, 0, 100);

 let mult = 0.55 + 0.80 * composure / 100;
 if (raceWet) mult *= 0.85;
 else if (rainAvg >= RISK_RAIN_WATCH) mult *= 0.92;
 mult *= RISK_GRIP_FACTOR[grip] || 1;
 mult *= RISK_TYRE_WEAR_FACTOR[tyreWear] || 1;
 const longRace = distanceKm >= RISK_LONG_RACE_KM;
 if (longRace) mult *= 0.90 + 0.10 * n('stamina') / 100;

 const snap = (v) => clamp(Math.round(v / 5) * 5, RISK_MIN, RISK_MAX);
 const overtakeRisk = snap(RISK_OVERTAKE_BASE[overtaking] * mult * (1 + 0.10 * aggCovered / 100));
 const defendRisk = snap(RISK_DEFEND_BASE[overtaking] * mult);

 // Start approach: composure + a bonus where hard passing makes grid position durable, trimmed if
 // a wet start meets low talent (0-3 matches GPRO's StartRisk select).
 let startScore = composure + 0.15 * aggCovered;
 startScore += overtaking === 'Hard' || overtaking === 'Very Hard' ? 10 : overtaking === 'Normal' ? 5 : 0;
 if (raceWet && n('talent') < 70) startScore -= 15;
 const startRisk = startScore >= 75 ? 3 : startScore >= 55 ? 2 : startScore >= 35 ? 1 : 0;
 const startRiskLabel = ['Avoid trouble', 'Maintain his position', 'Overtake where possible', 'Force his way to the front'][startRisk];

 const dryRisk = clamp(ctr || 0, 0, 100);
 const wetRisk = clamp(Math.round((ctr || 0) * 0.5), 0, 100);
 const malfunctionRisk = 10;

 // Break-even for "pit on a solvable problem" ("If Yes, enter pits only if more than N laps
 // remaining"): a repair stop costs pit-lane transit + ~15s repair; a limping car loses ~4.5s/lap
 // (official tutorial: 3-6s).
 const pitLoss = (track && parseFloat(track.timeInOutPits)) || 20;
 const problemPitLaps = clamp(Math.ceil((pitLoss + 15) / 4.5), 5, 12);

 return { overtakeRisk, defendRisk, dryRisk, wetRisk, malfunctionRisk, startRisk, startRiskLabel, problemPitLaps, overtaking, longRace };
 }

 // Plain-language "race engineer" summary of calcDriverStrategyRecommendation's dials.
 // Reimplemented (2026-07-19) directly against our actual current
 // RiskAdvisorService::phrase() source (previously this was built from the README's description
 // only, which turned out to undersell it - the real version has a per-rating-tier lead sentence
 // plus up to 2 caveats from a richer, ordered list, not just grip/long-race). Purely a template
 // over numbers already computed here - no LLM involved, degrades to a generic sentence if driver
 // data is thin.
 function mkRaceEngineerNarrative(rec, track, driver, raceWet) {
 if (!rec) return '';
 const trackName = (track && (track.name || track.trackName)) || 'this track';
 const overtaking = rec.overtaking;
 const grip = (track && track.gripLevel) || '';
 const tyreWear = (track && track.tyreWear) || '';
 const n = (key) => Math.max(0, Math.min(100, (parseFloat(driver && driver[key]) || 125) / RISK_ATTR_SCALE));

 let lead;
 if (overtaking === 'Very Easy') {
 lead = `Passing at ${trackName} comes cheap, so I'd keep overtake modest at ${rec.overtakeRisk} and put the effort into defending at ${rec.defendRisk}. And remember these dials only act in traffic - on a track this open, the lap time lives in your clear-track risk.`;
 } else if (overtaking === 'Easy') {
 lead = `Passing at ${trackName} comes cheap, so I'd keep overtake modest at ${rec.overtakeRisk} and put the effort into defending at ${rec.defendRisk} - your position is what's under threat here.`;
 } else if (overtaking === 'Hard' || overtaking === 'Very Hard') {
 lead = `Overtaking at ${trackName} is ${overtaking.toLowerCase()}, so I'd push overtake up to ${rec.overtakeRisk} to make moves stick - and since the track already makes you hard to pass, ${rec.defendRisk} on defence is plenty.`;
 } else {
 lead = `${trackName} is neutral for passing - a balanced ${rec.overtakeRisk} overtake / ${rec.defendRisk} defend split fits.`;
 }

 // Same priority order and 2-caveat cap as the source: wet/rain-watch, grip, aggression gap,
 // tyre wear, long-race stamina, falling back to a confidence read when nothing else applies.
 const caveats = [];
 if (raceWet) {
 const tal = n('talent');
 caveats.push(tal >= 70
 ? `It's a wet race and talent at ${Math.round(tal)} thrives in the spray, so I've only trimmed lightly.`
 : tal < 40
 ? `It's a wet race and with talent at ${Math.round(tal)} I'd stay well clear of trouble - both numbers are trimmed.`
 : `It's a wet race, so I've trimmed both - talent at ${Math.round(tal)} buys some margin, but not enough to push.`);
 }
 if (grip === 'Very Low' || grip === 'Low') {
 caveats.push(`Grip here is ${grip.toLowerCase()} - sliding cars punish ambition, so I've shaved both numbers.`);
 }
 const aggGap = Math.max(0, n('aggressiveness') - n('experience'));
 if (aggGap > 15) {
 caveats.push(`Watch the temper: aggressiveness ${Math.round(n('aggressiveness'))} against experience ${Math.round(n('experience'))} invites mistakes, so I held back a notch.`);
 }
 if (tyreWear === 'Very High') {
 caveats.push(`Tyre wear runs very high here - pushing chews the rubber you'll need at the end of each stint.`);
 }
 if (rec.longRace && n('stamina') < 60) {
 caveats.push(`It's a long race and stamina at ${Math.round(n('stamina'))} will fade late - another reason to stay tidy.`);
 }
 if (!caveats.length) {
 const conc = n('concentration'), exp = n('experience');
 caveats.push((conc + exp) / 2 >= 70
 ? `Concentration ${Math.round(conc)} and experience ${Math.round(exp)} give plenty of margin for these numbers.`
 : `The driver is the ceiling here - train concentration and experience before pushing these dials higher.`);
 }

 return `${lead} ${caveats.slice(0, 2).join(' ')}`;
 }

 // Pit-count tie-breaker note, driven by how hard passing is at this track. Suppressed when rain
 // is likely, since a wet race rewrites the whole plan anyway. Ported from our
 // RiskAdvisorService::strategyTip() () - a heuristic, not a game formula.
 function calcStrategyTip(overtaking, raceWet, rainAvg) {
 if (raceWet || rainAvg >= RISK_RAIN_WATCH) return null;
 if (overtaking === 'Hard' || overtaking === 'Very Hard') {
 return "Unsure between two strategies? Take the one with fewer pit stops - every stop drops you into traffic you can't easily clear when passing is this hard.";
 }
 if (overtaking === 'Very Easy' || overtaking === 'Easy') {
 return 'If two strategies are close on paper, the extra pit stop is affordable here - fresh tyres and clean air beat track position when passing is easy.';
 }
 return 'If two strategies are within a few seconds, prefer the one with fewer stops - track position still breaks ties.';
 }

 // Narrative on how race distance affects driver energy - only flagged for the short/long tails
 // (normal-length races say nothing). from our own RiskAdvisorService::distanceTip()
 // () - same RISK_SHORT_RACE_KM/RISK_LONG_RACE_KM bands already used elsewhere
 // in this file for calcDriverStrategyRecommendation's own long-race multiplier.
 function calcDistanceTip(distanceKm, stamina) {
 if (!distanceKm || distanceKm <= 0) return '';
 if (distanceKm < RISK_SHORT_RACE_KM) {
 return 'This is a short race, well under the usual length, so it spends less driver energy. You can carry higher clear-track risk for the extra pace and place your boost laps freely - there\'ll still be energy left to convert it.';
 }
 if (distanceKm > RISK_LONG_RACE_KM) {
 const staminaN = (parseFloat(stamina) || 125) / RISK_ATTR_SCALE;
 const staminaNote = staminaN < 60 ? " And with this driver's stamina, he'll fade late - lean conservative." : '';
 return `This is a long race, well over the usual length, so it drains more driver energy. Keep clear-track risk in check and budget your boost laps - a driver who runs flat crawls home.${staminaNote}`;
 }
 return '';
 }

 // "Time gain due to CTR" gadget (from our toolset, ).
 // seasonTrack.ctrGain/.ctrRace (GPRO Analyzer season data, see gpro-data.js) are gain-at-CTR=100
 // figures (confirmed ctrRace = ctrGain * laps for every track in the table); time gained at an
 // arbitrary CTR scales roughly linearly with it, per general understanding - own
 // simple scaling assumption, not a disclosed formula, flagged as such in the UI.
 function calcCtrTimeGain(seasonTrack, ctr) {
 if (!seasonTrack || seasonTrack.ctrGain == null) return null;
 const frac = Math.max(0, Math.min(100, ctr || 0)) / 100;
 return { perLap: +(seasonTrack.ctrGain * frac).toFixed(3), total: +(seasonTrack.ctrRace * frac).toFixed(1) };
 }

  // Boost-lap placement (3 sets of 3 laps): pays where pace converts into something - passing
  // chances in a pack, track position through the pit cycle (overcut via boosted in-laps), or gap
  // defence in the closing laps. Also from our own RiskAdvisorService.
  function calcBoostLapSuggestion(laps, stops, overtaking, raceWet, rainAvg, trackFuelRating, lapLengthKm) {
  if (laps < 12) return { laps: [], note: 'Too few laps to plan boost sets - place them by feel.' };
  const easyPassing = overtaking === 'Very Easy' || overtaking === 'Easy';
  const stintLen = Math.floor(laps / Math.max(1, stops + 1));
  const candidates = [];
  if (easyPassing) candidates.push(2);
  for (let i = 1; i <= stops; i++) candidates.push(i * stintLen - 2);
  candidates.push(laps - 2);
  if (!easyPassing) candidates.push(2);
  candidates.push(Math.floor(laps / 2));

  const picked = [];
  for (let lap of candidates) {
  lap = Math.max(1, Math.min(laps - 2, lap));
  if (picked.some(taken => Math.abs(taken - lap) < 3)) continue;
  picked.push(lap);
  if (picked.length === 3) break;
  }
  picked.sort((a, b) => a - b);

  let note = easyPassing
  ? 'One set early while the field is still packed - passing is cheap here, so pace turns straight into positions - then boost into the pit windows.'
  : (stops > 0
  ? 'Boost the in-laps before the stops to jump the cars around you through the pit cycle; any spare set defends the final laps.'
  : 'No stops to play with, so spread the sets - one early, one mid-race, one to bring it home.');
  if (raceWet || rainAvg >= RISK_RAIN_WATCH) note += ' Rain could move the pit laps - treat these as dry-plan numbers.';
  // Real GPRO formula (confirmed via our disclosed BoostFuelService, reviewed
  // 2026-07-19): extra fuel = ROUNDUP(boost_laps * lap_length_km * a per-track dry/wet
  // coefficient). The exact per-track coefficient is not disclosed by any source we've checked
  // (not in GAPP's trackData, not in our public code). Estimate: boost burns ~12% extra
  // fuel per boosted lap, scaled by the track's fuel consumption rating (FUEL_BASE). This is a
  // rough approximation, not a verified formula - flagged as such below.
  if (trackFuelRating && lapLengthKm && lapLengthKm > 0) {
  const fuelBase = FUEL_BASE[trackFuelRating] || FUEL_BASE['Medium'];
  const estExtraFuel = Math.ceil(picked.length * lapLengthKm * fuelBase * 0.12);
  note += ` Estimated extra fuel for ${picked.length} boosted laps: ~${estExtraFuel}L (${(fuelBase * 0.12).toFixed(2)}L/km boost coefficient × ${lapLengthKm.toFixed(1)}km × ${picked.length} laps). Rough estimate - per-track coefficient not officially disclosed.`;
  } else {
  note += ' Boosts burn extra fuel per the real GPRO formula (laps x lap length x a per-track coefficient) - budget for it, but we don\'t have enough track data to estimate the amount here.';
  }

  // Race phase aggressiveness from Elite decision matrix
  const phaseData = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.overtakingDecision && GPRO_DATA.overtakingDecision.phaseMultipliers) ? GPRO_DATA.overtakingDecision.phaseMultipliers : null;
  let phaseGuidance = '';
  if (phaseData) {
  const earlyEnd = Math.round(laps * phaseData[0].maxPhase);
  const midEnd = Math.round(laps * phaseData[1].maxPhase);
  phaseGuidance = `Phase guidance: Laps 1-${earlyEnd} ${phaseData[0].label} (×${phaseData[0].multiplier}), laps ${earlyEnd+1}-${midEnd} ${phaseData[1].label} (×${phaseData[1].multiplier}), laps ${midEnd+1}-${laps} ${phaseData[2].label} (×${phaseData[2].multiplier}).`;
  note += ` ${phaseGuidance}`;
  }

  return { laps: picked, note };
  }

 // ============================================================
 // HAPPY RANGE
 // ============================================================
 // Driver's acceptable wear range based on Experience and Technical Insight
 // Higher Exp/TI = lower happy range = driver notices smaller wear changes
 function calcHappyRange(driver) {
 if (!driver) return null;
 const exp = parseInt(driver.experience) || 50;
 const ti = parseInt(driver.techInsight) || 50;
 const wings = Math.round(136.5 - 0.0952 * exp - 0.3067 * ti);
 const other = wings - 2;
 return {
 'Front Wing': wings, 'Rear Wing': wings,
 'Engine': other, 'Brakes': other, 'Gearbox': other, 'Suspension': other,
 };
 }

 // ============================================================
 // CAR COSTS MATRIX
 // ============================================================
 // Base cost to upgrade from level N-1 to level N (in $M, from GPRO UpdateCar page)
 const PART_BASE_COST = D.carCosts?.partBaseCost || {
 'Chassis': 1292539, 'Engine': 3311737, 'Front Wing': 1551354,
 'Rear Wing': 1504126, 'Underbody': 510128, 'Sidepods': 459831,
 'Cooling': 454545, 'Gearbox': 3098104, 'Brakes': 697674,
 'Suspension': 1181545, 'Electronics': 938416,
 };

 function calcUpgradeCostExact(part, targetLvl) {
 const base = PART_BASE_COST[part];
 if (!base) return 0;
 let total = 0;
 for (let i = 1; i <= targetLvl; i++) {
 total += Math.round(Math.pow(1.2385, i - 1) * base);
 }
 return total;
 }

 // Note: getUpgradeCost/calcDowngradeWear (formula-estimated upgrade cost/downgrade wear) were
 // removed 2026-07-19, confirmed dead - analyzeCar's real upgrade/downgrade recommendations use
 // calcUpgradeCostExact and DOM-scraped option data (parseUpdateCarDOM reads real cost/wear
 // straight out of UpdateCar.asp's own dropdown text, e.g. "$X - Wear: Y%") instead, which is
 // authoritative rather than a formula guess - these two were superseded, not a missed feature.

 // ============================================================
 // CAR PARTS WEAR PREDICTOR
 // ============================================================
 // Base race wear per part at CTR=0, Conc=100, Tal=50, Exp=50 (baseline driver)
 // Calibrated by Tushant Sharma from Montreal data across multiple driver configurations
 const PART_BASE_RACE_WEAR = D.partWearPrediction?.baseRaceWear || {
 'Chassis': 21, 'Engine': 37, 'Front Wing': 21, 'Rear Wing': 14,
 'Underbody': 20, 'Sidepods': 15, 'Cooling': 11, 'Gearbox': 29,
 'Brakes': 36, 'Suspension': 35, 'Electronics': 10,
 };
 const PART_CTR_WEAR = D.partWearPrediction?.ctrWear || {
 'Chassis': 0.10, 'Engine': 0.16, 'Front Wing': 0.10, 'Rear Wing': 0.06,
 'Underbody': 0.08, 'Sidepods': 0.08, 'Cooling': 0.04, 'Gearbox': 0.14,
 'Brakes': 0.46, 'Suspension': 0.12, 'Electronics': 0.06,
 };

 // Driver wear factor: higher attributes = lower factor = less wear
 // Derived by Tushant Sharma from driver attribute analysis
 // Car Wear effects per attribute point (from zero baseline):
 // Concentration: ~0.025% per point
 // Talent: ~0.024% per point
 // Experience: ~0.021% per point
 function calcDriverWearFactor(driver) {
 if (!driver) return 1.0;
 const conc = parseInt(driver.concentration) || 100;
 const talent = parseInt(driver.talent) || 50;
 const exp = parseInt(driver.experience) || 50;
 // Using additive model from zero baseline
 const concEffect = conc * 0.00025;
 const talentEffect = talent * 0.00024;
 const expEffect = exp * 0.00021;
 // Total reduction (higher = less wear)
 const reduction = concEffect + talentEffect + expEffect;
 return Math.max(0.5, 1.0 - reduction);
 }

 // Computes Predicted whole-race wear % for one part, or null if track/data unavailable.
 // Own calibration stays PRIMARY here too - a numeric check at Montreal showed GAPP's wearData
 // runs a consistent ~25-30% higher than our our calibrated model-calibrated numbers across all 11
 // parts (same "systematically different, not obviously wrong, but not proven either" pattern
 // as the tyre-stop formula) - so it's exposed as a cross-check, not swapped in as primary,
 // since these numbers directly drive real-money upgrade/downgrade recommendations.
 function gappPartRaceWear(gappWear, levelFactors, partIdx, lvl, ctr, driverFactor) {
 if (!gappWear || !levelFactors) return null;
 const clampedLvl = Math.min(9, Math.max(1, lvl || 1));
 const levelExp = Math.pow(levelFactors[clampedLvl - 1], ctr);
 return Math.round(gappWear.values[partIdx] * levelExp * driverFactor);
 }



 // Per-track wear data is PRIMARY here whenever the track is found (falls back to our
 // Montreal-only calibration otherwise). NOTE: a numeric check at Montreal found GAPP's numbers
 // run a consistent ~25-30% higher than our our calibrated model calibration across all 11 parts - own
 // calibration is attached as `ownRaceWear` for display so the discrepancy stays visible.
 function calcPartsWear(carData, driver, ctr, trackName) {
 if (!carData) return null;
 const driverFactor = calcDriverWearFactor(driver);
 const gappWear = lookupGappTrack(trackName, 'wearData');
 const levelFactors = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.gapp) ? GPRO_DATA.gapp.levelFactors : null;
 const parts = PART_NAMES.map((name, i) => {
 const lvl = parseInt(carData[PART_LVL_KEYS[i]]) || 0;
 const wear = parseInt(carData[PART_WEAR_KEYS[i]]) || 0;
 const baseRace = PART_BASE_RACE_WEAR[name] || 0;
 const ctrEffect = PART_CTR_WEAR[name] || 0;
 // CTR effect also scales with driver factor (better drivers handle CTR better)
 const ownRaceWear = Math.round(driverFactor * (baseRace + ctr * ctrEffect));
 const gappRaceWear = gappPartRaceWear(gappWear, levelFactors, i, lvl, ctr, driverFactor);
 const raceWear = gappRaceWear !== null ? gappRaceWear : ownRaceWear;
 const endWear = wear + raceWear;
 return { name, lvl, wear, raceWear, endWear, over: endWear > 100, level: lvl, gappRaceWear, ownRaceWear };
 });
 return parts;
 }

 // ============================================================
 // UPDATE CAR DOM PARSER
 // ============================================================
 // Parses real dropdown data from UpdateCar.asp page for accurate costs
 function parseUpdateCarDOM() {
 const result = { parts: [], cash: 0 };

 // First try direct DOM element containing "Current account balance"
 const allPs = document.querySelectorAll('p');
 for (const p of allPs) {
 const txt = p.textContent || '';
 if (/current account balance/i.test(txt)) {
 const m = txt.match(/\$([\d.]+)/);
 if (m) {
 const v = parseGproCash(m[0]);
 if (v > 100) { result.cash = v; break; }
 }
 }
 }

 // Fallback: try text patterns on body (handles dot and comma separators)
 if (result.cash === 0) {
 const allText = document.body.innerText;
 const cashPatterns = [
 /Current account balance:\s*\$?([\d.,]+)/i,
 /Account balance:\s*\$?([\d.,]+)/i,
 /Balance:\s*\$?([\d.,]+)/i,
 /Cash:\s*\$?([\d.,]+)/i,
 /Money:\s*\$?([\d.,]+)/i,
 /Available:\s*\$?([\d.,]+)/i,
 ];
 for (const pat of cashPatterns) {
 const m = allText.match(pat);
 if (m) {
 const v = parseGproCash(m[0]);
 if (v > 100) { result.cash = v; break; }
 }
 }
 }

 // Real bug fixed 2026-07-31: removed a third fallback that took the LARGEST dollar amount
 // anywhere on the page as "cash" if the two targeted patterns above both failed. UpdateCar.asp
 // is full of dollar figures that aren't cash - every part's upgrade/replace option carries its
 // own cost (e.g. a level-9 part option can run into the millions, easily larger than the real
 // balance) - so this could silently report a part's price as the account balance. A wrong
 // number for a financial figure is worse than no number: better to return 0 (falls through to
 // the last known-good cached value) than guess.
 // Find all part rows - each has a select dropdown (name="BuyChassis", "BuyEngine", etc. on UpdateCar.asp)
 const selects = document.querySelectorAll('select[name^="Buy"], select[id^="Buy"]');
 const nameMap = {
 'BuyChassis': 'Chassis', 'BuyEngine': 'Engine', 'BuyFWing': 'Front Wing',
 'BuyRWing': 'Rear Wing', 'BuyUnderbody': 'Underbody', 'BuySidepods': 'Sidepods',
 'BuyCooling': 'Cooling', 'BuyGear': 'Gearbox', 'BuyBrakes': 'Brakes',
 'BuySusp': 'Suspension', 'BuyElectronics': 'Electronics',
 };
 selects.forEach(sel => {
 const key = sel.name || sel.id;
 const partName = nameMap[key];
 if (!partName) return;
 const opts = [];
 Array.from(sel.options).forEach(opt => {
 if (opt.value === '0' || opt.value === '') return;
 const text = opt.text.trim();
 const costMatch = text.match(/\$([\d.,]+)/);
 const wearMatch = text.match(/Wear:\s*(\d+)%/);
 const lvlMatch = text.match(/level\s*(\d+)/i);
 opts.push({
 text,
 value: parseInt(opt.value) || 0,
 cost: costMatch ? parseInt(costMatch[1].replace(/[.,]/g, '')) : 0,
 wear: wearMatch ? parseInt(wearMatch[1]) : null,
 newLvl: lvlMatch ? parseInt(lvlMatch[1]) : null,
 isDowngrade: text.toLowerCase().includes('downgrade'),
 isReplace: text.toLowerCase().includes('replace'),
 });
 });
 let currentLevel = 0;
 let currentWear = 0;
 const row = sel.closest('tr');
 if (row) {
 const cells = row.querySelectorAll('td');
 cells.forEach(td => {
 if (td.querySelector('select')) return; // skip the dropdown cell - its option text contains stray "%" matches
 const t = td.textContent.trim();
 const wearFont = td.querySelector('font[color]');
 if (wearFont) {
 const wm = wearFont.textContent.match(/(\d+)%/);
 if (wm) currentWear = parseInt(wm[1]) || 0;
 }
 if (currentWear === 0) {
 const wm2 = t.match(/(\d{1,3})%/);
 if (wm2) {
 const val = parseInt(wm2[1]);
 if (val >= 0 && val <= 100) currentWear = val;
 }
 }
 });
 const selectCell = sel.closest('td');
 if (selectCell && selectCell.previousElementSibling) {
 const prevTd = selectCell.previousElementSibling;
 const lvlText = prevTd.textContent.trim();
 const lvlM = lvlText.match(/(\d+)/);
 if (lvlM) currentLevel = parseInt(lvlM[1]) || 0;
 }
 if (currentLevel === 0) {
 const allCells = Array.from(cells);
 for (let ci = 0; ci < allCells.length; ci++) {
 const t = allCells[ci].textContent.trim();
 if (/^\d{1,2}$/.test(t) && parseInt(t) > 0 && parseInt(t) <= 10) {
 const nextCell = allCells[ci + 1];
 if (nextCell && nextCell.querySelector('select')) {
 currentLevel = parseInt(t) || 0;
 break;
 }
 }
 }
 }
 }
 result.parts.push({ name: partName, opts, currentLevel, currentWear });
 });

 if (result.parts.length > 0) {
 const zeroLvl = result.parts.filter(p => p.currentLevel === 0).length;
 const zeroWear = result.parts.filter(p => p.currentWear === 0).length;
 logDebug(`DOM parse: ${result.parts.length} parts found, ${zeroLvl} missing levels, ${zeroWear} missing wear`);
 } else {
 logError('DOM parse: NO selects found with name/id starting with "Buy"');
 logDebug('All selects on page:', Array.from(document.querySelectorAll('select')).map(s => s.name || s.id || '(unnamed)').join(', '));
 }

 // Text-based fallback: if levels or wear are still 0, scan page text for "PartName: <level>" patterns
 const textFallbackParts = result.parts.filter(p => p.currentLevel === 0 || p.currentWear === 0);
 if (textFallbackParts.length > 0) {
 const allText = document.body.innerText;
 for (const p of textFallbackParts) {
 if (p.currentLevel === 0) {
 const nameEsc = p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 const lvlRe = new RegExp(nameEsc + '[:\\s]+(\\d{1,2})\\b', 'i');
 const m = allText.match(lvlRe);
 if (m) {
 const v = parseInt(m[1]);
 if (v > 0 && v <= 10) { p.currentLevel = v; logDebug(`Text fallback: ${p.name} level ${v}`); }
 }
 }
 if (p.currentWear === 0) {
 const nameEsc = p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 const wearRe = new RegExp(nameEsc + '.*?(\\d{1,3})%', 'is');
 const m = allText.match(wearRe);
 if (m) {
 const v = parseInt(m[1]);
 if (v >= 0 && v <= 100) { p.currentWear = v; logDebug(`Text fallback: ${p.name} wear ${v}%`); }
 }
 }
 }
 }

 // If still no parts found, try scanning ALL table rows on the page
 if (result.parts.length === 0) {
 logDebug('Trying table row fallback for levels...');
 const allRows = document.querySelectorAll('tr');
 for (const row of allRows) {
 const tds = row.querySelectorAll('td');
 if (tds.length < 3) continue;
 const rowText = row.textContent;
 for (const name of PART_NAMES) {
 if (!rowText.toLowerCase().includes(name.toLowerCase())) continue;
 const existing = result.parts.find(p => p.name === name);
 if (existing && existing.currentLevel > 0) continue;
 const numbers = [];
 tds.forEach(td => {
 const t = td.textContent.trim();
 if (/^\d{1,2}$/.test(t)) numbers.push(parseInt(t));
 });
 const sel = row.querySelector('select');
 if (sel && numbers.length > 0) {
 const lvl = numbers.find(n => n > 0 && n <= 10);
 if (lvl !== undefined) {
 if (existing) existing.currentLevel = lvl;
 else result.parts.push({ name, opts: [], currentLevel: lvl, currentWear: 0 });
 logDebug(`Table fallback: ${name} level ${lvl}`);
 }
 }
 }
 }
 }

 // Also parse car character (Power/Handling/Acceleration) from DOM
 const allText = document.body.innerText;
 const charMatch = allText.match(/Power[:\s]*(\d+).*?Handling[:\s]*(\d+).*?Acceleration[:\s]*(\d+)/is);
 if (charMatch) {
 result.carPower = parseInt(charMatch[1]) || 0;
 result.carHandling = parseInt(charMatch[2]) || 0;
 result.carAcceleration = parseInt(charMatch[3]) || 0;
 }

 return result;
 }

 // ============================================================
 // CAR UPGRADE RECOMMENDER
 // ============================================================
  // League-specific targets - D.carTargets has real per-league part-level tables
  // (Rookie/Amateur/Pro/Master/Elite, all same {target,parts,notes} shape), now actually usable
  // since detectLeagueFresh() gives the real league instead of assuming Amateur. Falls back to
  // Amateur's targets if the league is unknown/unset or GPRO_DATA didn't
 // load, same as before this change - so behavior for anyone not yet passing a real league is
 // unchanged.
 const AMATEUR_CAR_TARGETS = {
 'Chassis': 6, 'Engine': 7, 'Front Wing': 6, 'Rear Wing': 6,
 'Underbody': 5, 'Sidepods': 5, 'Cooling': 5, 'Gearbox': 6,
 'Brakes': 7, 'Suspension': 6, 'Electronics': 5,
 };
 function getLeagueCarTargets(league) {
 const fromData = typeof GPRO_DATA !== 'undefined' && GPRO_DATA.carTargets && GPRO_DATA.carTargets[league];
 if (fromData && fromData.parts) return fromData;
 const amateur = typeof GPRO_DATA !== 'undefined' && GPRO_DATA.carTargets && GPRO_DATA.carTargets.Amateur;
 return (amateur && amateur.parts) ? amateur : { parts: AMATEUR_CAR_TARGETS, notes: '' };
 }
 const UPGRADE_PRIORITY = D.upgradePriority || {
 'Engine': 1, 'Brakes': 2, 'Chassis': 3, 'Front Wing': 3, 'Rear Wing': 3,
 'Suspension': 4, 'Gearbox': 4, 'Electronics': 5, 'Underbody': 6, 'Sidepods': 6, 'Cooling': 6,
 };
 const BASE_WEAR_PER_LAP = D.wearPerLap?.base || {
 'Chassis': 0.48, 'Engine': 0.80, 'Front Wing': 0.45, 'Rear Wing': 0.52,
 'Underbody': 0.52, 'Sidepods': 0.34, 'Cooling': 0.30, 'Gearbox': 0.64,
 'Brakes': 0.70, 'Suspension': 0.77, 'Electronics': 0.30,
 };
 const WEAR_SCALE = D.wearPerLap?.scale || { 'Low': 0.6, 'Medium': 0.85, 'High': 1.0 };

 // ============================================================
 // SEASON TRACK DATA — loaded from gpro-data.js via @require
 // Merges track profiles with wear intensity from separate map
 // ============================================================
 const _rawTracks = D.tracks || {};
 const _wearIntensity = D.trackWearIntensity || {};
 const SEASON_TRACKS = {};
 for (const [name, data] of Object.entries(_rawTracks)) {
 SEASON_TRACKS[name] = { ...data, wearIntensity: _wearIntensity[name] || data.wearIntensity || 1.0 };
 }

 function lookupSeasonTrack(trackName) {
 if (!trackName) return null;
 const tracks = SEASON_TRACKS;
 // Match by partial name (e.g. "Montreal" matches "Montreal GP")
 for (const [key, data] of Object.entries(tracks)) {
 if (trackName.includes(key.split(' ')[0]) || key.includes(trackName.split(' ')[0])) {
 // GPRO_DATA.tracks (the normal, loaded path) has no wearIntensity field of its own - only
 // the rarely-hit hardcoded SEASON_TRACKS fallback did, so callers reading stData.wearIntensity
 // got `undefined` whenever GPRO_DATA loaded successfully (the common case). Fixed 2026-07-19
 // by merging in the previously-unused GPRO_DATA.trackWearIntensity table, which was sitting
 // dead with the exact same per-track values the fallback had.
 const wearIntensity = data.wearIntensity != null ? data.wearIntensity : (D.trackWearIntensity && D.trackWearIntensity[key]);
 return { name: key, ...data, wearIntensity };
 }
 }
 return null;
 }

 function lookupTrackInsight(trackName, league) {
 if (!trackName || typeof GPRO_DATA === 'undefined' || !GPRO_DATA.trackInsights) return null;
 const lg = league || (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.currentLeague) || 'Amateur';
 for (const [key, data] of Object.entries(GPRO_DATA.trackInsights)) {
 if (trackName.includes(key.split(' ')[0]) || key.includes(trackName.split(' ')[0])) {
 return data[lg] || null;
 }
 }
 return null;
 }

 // Cost-efficiency helper for upgrades: computes PHA impact per level increase.
 // Uses the profileFactors (PHA contribution per part per level) to estimate how much
 // a level increase improves the car's PHA match for a given track.
 function calcUpgradePhaImpact(partName) {
 const pf = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.gapp) ? GPRO_DATA.gapp.profileFactors : null;
 if (!pf || !pf[partName]) return 0;
 const contrib = pf[partName]; // [power, handling, accel]
 return Math.abs(contrib[0]) + Math.abs(contrib[1]) + Math.abs(contrib[2]);
 }

 // Looks up a track in the GAPP-sourced dataset (trackData/wearData), fuzzy-matched by first word
 // (e.g. "Kaunas GP" -> "Kaunas", "Al-Ring GP" -> tries "A1-Ring" too since GPRO's league page and
 // GAPP's data spell it differently).
 function lookupGappTrack(trackName, table) {
 if (!trackName || typeof GPRO_DATA === 'undefined' || !GPRO_DATA.gapp || !GPRO_DATA.gapp[table]) return null;
 const data = GPRO_DATA.gapp[table];
 const nameLower = trackName.toLowerCase();
 const firstWord = trackName.split(' ')[0];
 const firstWordLower = firstWord.toLowerCase();
 for (const key of Object.keys(data)) {
 const keyLower = key.toLowerCase();
 if (nameLower.includes(keyLower) || keyLower.includes(firstWordLower) || firstWord.replace(/^Al-/i, 'A1-').toLowerCase() === keyLower) {
 return { key, values: data[key] };
 }
 }
 return null;
 }

 function analyzeCar(carData, domData, trackData, driver, ctr, league) {
 if (!carData) return null;
 const leagueTargets = getLeagueCarTargets(league);
 const cash = parseInt(carData.cash) || 0;
 const laps = trackData ? parseInt(trackData.laps) || 0 : 0;
 const trackWearStr = trackData ? (trackData.tyreWear || 'Medium') : 'Medium';
 let trackWearScale = WEAR_SCALE[trackWearStr] || 0.85;
 // Boost wear scale by season wear intensity if available
 const trackName = trackData ? (trackData.name || trackData.trackName || '') : '';
 const seasonTrack = lookupSeasonTrack(trackName);
 if (seasonTrack && seasonTrack.wearIntensity) {
 trackWearScale *= seasonTrack.wearIntensity;
 }
 // Per-track wear data is PRIMARY here, driving the real-money recommendations below.
 // NOTE: a numeric check at Montreal found it runs ~25-30% higher than our our calibrated model
 // calibration - own calibration is attached as `ownTotalRaceWear` for visibility.
 const gappWear = lookupGappTrack(trackName, 'wearData');
 const levelFactors = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.gapp) ? GPRO_DATA.gapp.levelFactors : null;
 const driverFactor = calcDriverWearFactor(driver);
 const ctrValueCar = ctr || 0;

 const parts = PART_NAMES.map((name, i) => {
 const lvl = parseInt(carData[PART_LVL_KEYS[i]]) || 0;
 const wear = parseInt(carData[PART_WEAR_KEYS[i]]) || 0;
 const remaining = 100 - wear;
 const target = leagueTargets.parts[name] || 6;
 const priority = UPGRADE_PRIORITY[name] || 99;

 const wearPerLap = (BASE_WEAR_PER_LAP[name] || 0.5) * trackWearScale;
 const ownTotalRaceWear = laps > 0 ? wearPerLap * laps : 0;
 const gappRaceWear = gappPartRaceWear(gappWear, levelFactors, i, lvl, ctrValueCar, driverFactor);
 const totalRaceWear = gappRaceWear !== null ? gappRaceWear : ownTotalRaceWear;
 const endWear = Math.min(100, wear + totalRaceWear);

 // Parse all options from DOM
 let opts = [];
 if (domData && domData.parts) {
 const domPart = domData.parts.find(p => p.name === name);
 if (domPart) opts = domPart.opts;
 }
 if (opts.length === 0 && carData[PART_OPT_KEYS[i]]) {
 opts = (carData[PART_OPT_KEYS[i]] || []).map(o => ({
 text: o.text || '', value: parseInt(o.value?.value || o.value) || 0,
 cost: parseInt(o.value?.cost || o.cost) || 0, wear: o.value?.newWear || null,
 newLvl: parseInt(o.value?.value || o.value) || 0,
 isDowngrade: (o.text || '').toLowerCase().includes('downgrade'),
 isReplace: (o.text || '').toLowerCase().includes('replace'),
 isUpgrade: parseInt(o.value?.value || o.value) > lvl,
 })).filter(o => o.value !== 0);
 }
 opts.forEach(o => { o.isUpgrade = o.newLvl > lvl; o.isSameLevel = o.newLvl === lvl; o.isLowerLevel = o.newLvl < lvl; });

 const isFast = FAST_WEAR.includes(name);
 const alertPct = isFast ? FAST_ALERT : SLOW_ALERT;

 // Non-linear performance loss (from Elite spreadsheet models)
 // wear < 30 → 0, < 50 → (wear-30)*0.5, < 70 → 10+(wear-50)*1.0, < 85 → 30+(wear-70)*1.5, ≥ 85 → 52.5+(wear-85)*2.0
 const perfLoss = wear < 30 ? 0 : wear < 50 ? (wear - 30) * 0.5 : wear < 70 ? 10 + (wear - 50) * 1.0 : wear < 85 ? 30 + (wear - 70) * 1.5 : 52.5 + (wear - 85) * 2.0;
 // Exponential failure risk
 const failRisk = wear < 60 ? 0 : wear < 70 ? 5 : wear < 80 ? 15 : wear < 90 ? 40 : wear < 95 ? 75 : 95;

 return { name, idx: i, lvl, wear, remaining, endWear, totalRaceWear, gappRaceWear, ownTotalRaceWear, opts, isFast, alertPct, target, priority,
 critical: remaining <= CRITICAL_WEAR, flagged: remaining <= alertPct,
 belowTarget: lvl < target, atTarget: lvl >= target,
 willFail: laps > 0 && endWear >= 100, atRisk: laps > 0 && endWear >= 85,
 perfLoss: Math.round(perfLoss * 10) / 10, failRisk };
 });

 let runCash = cash;
 const recs = [];

  // Real bug fixed 2026-07-27: within a tier, static `priority` is the sole tie-breaker (the old
  // willFail/critical/flagged chaining let a low-wear part starve a more important Engine). But
  // priority-only over-corrected: a part already at ~0% remaining wear (essentially failed before
  // the race) must always be funded first, before static importance. So an ultra-urgent carve-out
  // (remaining <= ULTRA_URGENT_WEAR) wins regardless; below that extreme, priority still governs.
  const ULTRA_URGENT_WEAR = 5; // remaining % - essentially already fully worn, not just "will wear out later"
 const tierOf = (p) => {
 if (p.willFail) return p.remaining <= ULTRA_URGENT_WEAR ? 0 : 1;
 if (p.critical) return 2;
 if (p.flagged) return 3;
 return 4;
 };
 const actionable = parts.filter(p => p.willFail || p.critical || p.flagged || p.belowTarget)
 .sort((a, b) => {
 const ta = tierOf(a), tb = tierOf(b);
 if (ta !== tb) return ta - tb;
 return a.priority - b.priority;
 });

 actionable.forEach(p => {
 // All affordable upgrades (higher level), cheapest first
 const upgrades = p.opts.filter(o => o.isUpgrade && o.cost <= runCash)
 .sort((a, b) => (a.cost || 0) - (b.cost || 0));

 // Same-level replacements (cheaper, resets wear)
 const replacements = p.opts.filter(o => o.isSameLevel && !o.isDowngrade && o.cost <= runCash)
 .sort((a, b) => (a.cost || 0) - (b.cost || 0));

 // Downgrades: free or cheap, lower level but get wear down
 // Include both "Replace with level X" where X < current AND "Downgrade to level X"
 const downgrades = p.opts.filter(o => o.isLowerLevel)
 .sort((a, b) => {
 // Prefer free downgrades first, then by level (higher level = less performance loss)
 const aCost = a.isDowngrade ? 0 : a.cost;
 const bCost = b.isDowngrade ? 0 : b.cost;
 if (aCost !== bCost) return aCost - bCost;
 return (b.newLvl || 0) - (a.newLvl || 0);
 });

 // Also: free downgrades only (these cost $0)
 const freeDowngrades = p.opts.filter(o => o.isDowngrade && o.cost === 0)
 .sort((a, b) => (b.newLvl || 0) - (a.newLvl || 0));

 // Find best free downgrade that survives the race
 const surviveDowngrades = freeDowngrades.filter(o => {
 if (!o.wear && o.wear !== 0) return true; // unknown wear, assume OK
 let projectedRaceWear;
 if (gappWear && levelFactors) {
 const dgLvl = Math.min(9, Math.max(1, o.newLvl || 1));
 projectedRaceWear = gappWear.values[p.idx] * Math.pow(levelFactors[dgLvl - 1], ctrValueCar) * driverFactor;
 } else {
 projectedRaceWear = laps > 0 ? (BASE_WEAR_PER_LAP[p.name] || 0.5) * trackWearScale * laps : 0;
 }
 const raceEndWear = o.wear + projectedRaceWear;
 return raceEndWear < 95;
 });

 // === DECISION LOGIC ===
 if (p.willFail) {
 // Part WILL FAIL this race — must fix.
 // Real bug fixed 2026-07-27: this always preferred ANY affordable upgrade over a same-level
 // replace, even when the replace was cheaper - a same-level replace resets wear just as
 // effectively as an upgrade for the purpose of "does it survive the race", so defaulting to
 // upgrade wasted budget that mattered when multiple parts are competing for a tight budget
 // (a real user's manual choice - same-level Engine replace at $3.31M instead of the $4.1M
 // upgrade this logic would have picked - was the objectively better call given three other
 // parts also needed funding that race). Now picks whichever of the cheapest upgrade or
 // cheapest same-level replace actually costs less.
 const bestUpgrade = upgrades[0] || null;
 const bestReplace = replacements[0] || null;
 const useReplace = bestReplace && (!bestUpgrade || bestReplace.cost <= bestUpgrade.cost);
 if (useReplace) {
 const cost = bestReplace.cost || 0;
 runCash -= cost;
 recs.push({ part: p, verdict: 'REPLACE',
 detail: `FAIL at ~${Math.round(p.endWear)}%! Replace L${p.lvl} — $${cost.toLocaleString()} (resets wear, cheaper than upgrading)`,
 cost, newLvl: bestReplace.newLvl, newWear: bestReplace.wear, remainingCash: runCash, color: '#ef4444' });
 } else if (bestUpgrade) {
 const cost = bestUpgrade.cost || 0;
 runCash -= cost;
 recs.push({ part: p, verdict: 'UPGRADE',
 detail: `FAIL at ~${Math.round(p.endWear)}%! Upgrade to L${bestUpgrade.newLvl} — $${cost.toLocaleString()} (resets wear)`,
 cost, newLvl: bestUpgrade.newLvl, newWear: bestUpgrade.wear, remainingCash: runCash, color: '#ef4444' });
 } else if (surviveDowngrades.length > 0) {
 const best = surviveDowngrades[0];
 recs.push({ part: p, verdict: 'DOWNGRADE',
 detail: `FAIL at ~${Math.round(p.endWear)}%! FREE downgrade to L${best.newLvl} (Wear: ${best.wear ?? '?'}%) — survives race`,
 cost: 0, newLvl: best.newLvl, newWear: best.wear, remainingCash: runCash, color: '#f59e0b' });
 } else if (freeDowngrades.length > 0) {
 const best = freeDowngrades[0];
 recs.push({ part: p, verdict: 'DOWNGRADE',
 detail: `FAIL at ~${Math.round(p.endWear)}%! FREE downgrade to L${best.newLvl} (Wear: ${best.wear ?? '?'}%) — best available option`,
 cost: 0, newLvl: best.newLvl, newWear: best.wear, remainingCash: runCash, color: '#f59e0b' });
 } else {
 // Nothing affordable at any level, including a same-level wear-reset. Rather than a bare
 // "no affordable option" (which tells the user nothing they can act on), show what the
 // cheapest real fix would actually cost so they know the size of the gap, and be explicit
 // about the consequence (part failure mid-race is a DNF/retirement risk, not just a stat).
 const cheapestOverall = p.opts.filter(o => (o.isUpgrade || o.isSameLevel) && o.cost > 0)
 .sort((a, b) => (a.cost || 0) - (b.cost || 0))[0];
 const gapNote = cheapestOverall
 ? ` Cheapest real fix (L${cheapestOverall.newLvl}) costs $${cheapestOverall.cost.toLocaleString()} - $${(cheapestOverall.cost - runCash).toLocaleString()} short of your $${runCash.toLocaleString()} budget.`
 : ` No fix option was readable from this page at all.`;
 recs.push({ part: p, verdict: 'CRITICAL',
 detail: `FAIL at ~${Math.round(p.endWear)}%! This part is projected to break mid-race (real DNF/retirement risk), not just lose performance.${gapNote} Consider: sell/downgrade a lower-priority part instead to free up cash, or accept the failure risk this race and prioritize fixing it before the next.`,
 cost: 0, remainingCash: runCash, color: '#ef4444' });
 }
 } else if (p.critical) {
 // Part critically worn — replace if possible
 if (replacements.length > 0) {
 const best = replacements[0];
 const cost = best.cost || 0;
 runCash -= cost;
 recs.push({ part: p, verdict: 'REPLACE',
 detail: `Only ${p.remaining}% left! Replace L${p.lvl} — $${cost.toLocaleString()}`,
 cost, newLvl: best.newLvl, newWear: best.wear, remainingCash: runCash, color: '#ef4444' });
 } else if (upgrades.length > 0) {
 const best = upgrades[0];
 const cost = best.cost || 0;
 runCash -= cost;
 recs.push({ part: p, verdict: 'UPGRADE',
 detail: `Only ${p.remaining}% left! Upgrade to L${best.newLvl} — $${cost.toLocaleString()}`,
 cost, newLvl: best.newLvl, newWear: best.wear, remainingCash: runCash, color: '#ef4444' });
 } else {
 recs.push({ part: p, verdict: 'WAIT',
 detail: `${p.remaining}% remaining — no affordable option. Budget: $${runCash.toLocaleString()}`,
 cost: 0, remainingCash: runCash, color: '#f59e0b' });
 }
 } else if (p.atRisk || p.flagged) {
 // Part at risk — upgrade if affordable
 if (upgrades.length > 0) {
 const best = upgrades[0];
 const cost = best.cost || 0;
 runCash -= cost;
 recs.push({ part: p, verdict: 'UPGRADE',
 detail: `End wear ~${Math.round(p.endWear)}% — Upgrade to L${best.newLvl} — $${cost.toLocaleString()} (${Math.round(cost/cash*100)}% budget)`,
 cost, newLvl: best.newLvl, newWear: best.wear, remainingCash: runCash, color: '#10b981' });
 } else if (replacements.length > 0 && p.remaining <= 30) {
 const best = replacements[0];
 const cost = best.cost || 0;
 runCash -= cost;
 recs.push({ part: p, verdict: 'REPLACE',
 detail: `${p.remaining}% remaining — Replace L${p.lvl} — $${cost.toLocaleString()}`,
 cost, newLvl: best.newLvl, newWear: best.wear, remainingCash: runCash, color: '#3b82f6' });
 } else {
 recs.push({ part: p, verdict: 'WAIT',
 detail: `End wear ~${Math.round(p.endWear)}% — no affordable fix. Budget: $${runCash.toLocaleString()}`,
 cost: 0, remainingCash: runCash, color: '#f59e0b' });
 }
 } else if (p.belowTarget) {
 // Below league target — recommend upgrade or save
 // Upgrade ROI: performanceGain = (maxLevel - currentLevel) * 5; roi = (gain * 1000) / cost
 const upgradeRoi = upgrades.length > 0 ? (() => {
 const best = upgrades[0];
 const gain = (15 - p.lvl) * 5; // simplified: max level ~15
 const cost = best.cost || 1;
 return Math.round((gain * 1000) / cost * 100) / 100;
 })() : null;
 if (upgrades.length > 0) {
 const best = upgrades[0];
 const cost = best.cost || 0;
 runCash -= cost;
 const roiLabel = upgradeRoi !== null ? ` (ROI: ${upgradeRoi})` : '';
 recs.push({ part: p, verdict: 'UPGRADE',
 detail: `Below target (L${p.lvl}→L${p.target}) — Upgrade to L${best.newLvl} — $${cost.toLocaleString()}${roiLabel}`,
 cost, newLvl: best.newLvl, newWear: best.wear, remainingCash: runCash, color: '#10b981' });
 } else {
 const cheapest = p.opts.filter(o => o.isUpgrade).sort((a, b) => (a.cost || Infinity) - (b.cost || Infinity));
 const need = cheapest.length > 0 ? cheapest[0].cost : (calcUpgradeCostExact(p.name, p.lvl + 1) - calcUpgradeCostExact(p.name, p.lvl));
 const affordStr = need <= runCash ? '— you can afford this now!' : `— need $${(need - runCash).toLocaleString()} more`;
 recs.push({ part: p, verdict: 'SAVE',
 detail: `Below target (L${p.lvl}→L${p.target}) — next upgrade $${need.toLocaleString()} ${affordStr}`.trim(),
 cost: 0, remainingCash: runCash, color: '#8b5cf6' });
 }
 }
 });

 // PHA-alignment note on upgrade/replace recs - ported from PartUpgradeAdvisorService
 // (): only added when the specific level change already being recommended
 // would flip the car from not-PHA-similar to PHA-similar against this track, never a generic
 // claim. Uses D.phaContrib (same GAPP-verified table as the Car Advisor's reference table).
 const trackPhaForAlign = trackData && (trackData.trackPower || trackData.trackHandl || trackData.trackAccel)
 ? { power: parseInt(trackData.trackPower) || 0, handling: parseInt(trackData.trackHandl) || 0, accel: parseInt(trackData.trackAccel) || 0 }
 : null;
 const carPhaForAlign = { power: parseInt(carData.carPower) || 0, handling: parseInt(carData.carHandl) || 0, accel: parseInt(carData.carAccel) || 0 };
 if (trackPhaForAlign) {
 recs.forEach(r => {
 if (r.verdict !== 'UPGRADE' && r.verdict !== 'REPLACE') return;
 const alignment = calcPartUpgradeAlignment(trackPhaForAlign, carPhaForAlign, r.part.name, r.part.lvl);
 if (alignment) r.phaAlignment = alignment.rationale;
 });
 }

 const sortOrder = { FAIL: 0, CRITICAL: 1, UPGRADE: 2, REPLACE: 3, DOWNGRADE: 4, WAIT: 5, SAVE: 6 };
 recs.sort((a, b) => (sortOrder[a.verdict] || 99) - (sortOrder[b.verdict] || 99));

 // Cost-efficiency ranking: for parts that need upgrading, rank by PHA impact per dollar
 const upgradeRecs = recs.filter(r => r.verdict === 'UPGRADE' && r.cost > 0);
 upgradeRecs.forEach(r => {
 r.phaImpact = calcUpgradePhaImpact(r.part.name);
 r.costEfficiency = r.cost > 0 ? (r.phaImpact / (r.cost / 1000000)).toFixed(2) : '0';
 });

 // League-specific upgrade strategy notes
 const leagueUpgradeNotes = [];
 if (league === 'Amateur') {
 leagueUpgradeNotes.push('Amateur: focus on Engine/Gearbox first (highest PHA power impact per dollar)');
 leagueUpgradeNotes.push('Save cash for L5+ Engine/Gearbox upgrades - biggest performance leap in Amateur');
 } else if (league === 'Rookie') {
 leagueUpgradeNotes.push('Rookie: prioritize wear-critical parts (Brakes, Suspension) to avoid race failures');
 }

 return { parts, recs, cash, projectedCash: runCash, trackWear: trackWearStr, laps, league: league || 'Amateur', leagueNotes: leagueTargets.notes || '', upgradePhaEfficiency: upgradeRecs, leagueUpgradeNotes };
 }

  // ============================================================
  // PHA BARS
  // ============================================================
  // Rank-based PHA match: 'perfect' = car and track agree on the full Power/Handling/Accel
  // priority order, 'top' = they agree on which matters most, 'none' = no alignment. Uses
  // competition ranking (ties share a rank, e.g. 1,1,3) because the old Array.sort()-based
  // ranking was wrong on ties - equal values got an arbitrary order, so 'perfect' could misfire
  // on e.g. a fresh 6/6/6 car. A tied #1 on either side can only ever be 'perfect', never 'top'.
  function calcPhaMatch(carData, trackPha) {
 if (!carData || !trackPha) return null;
 const competitionRank = (vals) => {
 const entries = Object.entries(vals);
 const ranks = {};
 entries.forEach(([attr, v]) => {
 ranks[attr] = 1 + entries.filter(([, v2]) => v2 > v).length;
 });
 return ranks;
 };
 const attrsAtRank = (ranks, r) => Object.keys(ranks).filter(a => ranks[a] === r).sort();
 const car = { power: parseInt(carData.carPower) || 0, handling: parseInt(carData.carHandl) || 0, accel: parseInt(carData.carAccel) || 0 };
 const trk = { power: trackPha.power || 0, handling: trackPha.handling || 0, accel: trackPha.accel || 0 };
 const carRanks = competitionRank(car);
 const trackRanks = competitionRank(trk);
 const perfect = Object.keys(trk).every(attr => carRanks[attr] === trackRanks[attr]);
 const trackTop = attrsAtRank(trackRanks, 1);
 const carTop = attrsAtRank(carRanks, 1);
 const top = !perfect && trackTop.length === 1 && trackTop[0] === carTop[0] && carTop.length === 1;
 return { level: perfect ? 'perfect' : top ? 'top' : 'none', carRanks, trackRanks };
 }

 // "PHA-similar" - a stricter, distinct check from calcPhaMatch's perfect/top/none tiers, ported
 // from PhaMatchService's own definition (): true only when BOTH car and track
 // have a fully distinct (no-tie) P/H/A ordering AND their top-2 attributes coincide in order
 // (with 3 attributes, a matching top-2 forces the third to match too). A tied ordering on either
 // side is never similar - there's no exploitable ranking to align to.
 function calcPhaSimilar(carPha, trackPha) {
 if (!carPha || !trackPha) return false;
 const order = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
 const hasTies = (sorted) => sorted.some((e, i) => i > 0 && e[1] === sorted[i - 1][1]);
 const carSorted = order(carPha), trackSorted = order(trackPha);
 if (hasTies(carSorted) || hasTies(trackSorted)) return false;
 return carSorted[0][0] === trackSorted[0][0] && carSorted[1][0] === trackSorted[1][0];
 }

 // Hypothetical car PHA after changing one part by `delta` levels, using D.phaContrib (GAPP-
 // verified power/handling/accel-per-level table, see the reference table on the Car Advisor
 // page). Ported from PartUpgradeAdvisorService::carAfterSwap() ().
 function carAfterPartSwap(carPha, part, delta) {
 const c = (D.phaContrib && D.phaContrib[part]) || { power: 0, handling: 0, accel: 0 };
 return {
 power: (carPha.power || 0) + c.power * delta,
 handling: (carPha.handling || 0) + c.handling * delta,
 accel: (carPha.accel || 0) + c.accel * delta,
 };
 }

 // Suggests a +/-1 level swap for a part already flagged for replacement, ONLY when that specific
 // shift would flip the car from not-PHA-similar to PHA-similar against this track - matches
 // PartUpgradeAdvisorService::bestOption() exactly (): if the car already
 // aligns, or no single-step swap helps, returns null rather than a claim we can't back up.
 function calcPartUpgradeAlignment(trackPha, carPha, part, currentLevel) {
 if (!trackPha || !carPha || calcPhaSimilar(carPha, trackPha)) return null;
 for (const delta of [-1, 1]) {
 const targetLevel = currentLevel + delta;
 if (targetLevel < 1 || targetLevel > 9) continue;
 const shiftedCar = carAfterPartSwap(carPha, part, delta);
 if (calcPhaSimilar(shiftedCar, trackPha)) {
 const c = (D.phaContrib && D.phaContrib[part]) || { power: 0, handling: 0, accel: 0 };
 const strongest = Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
 const strongestLabel = strongest === 'power' ? 'Power' : strongest === 'handling' ? 'Handling' : 'Acceleration';
 return { suggestedLevel: targetLevel, delta, rationale: `Replacing with a ${delta > 0 ? 'higher' : 'lower'}-level ${part} realigns your car - ${part} leans into ${strongestLabel}.` };
 }
 }
 return null;
 }

 // "Push or hold?" checklist - turns several independent signals into one read for how much CTR
 // risk to carry this race. Modeled on our Push/hold checklist ():
 // more signals in your favour -> more risk is justified; a full sweep is a green light. Signals
 // that can't be evaluated (missing data) are omitted, not counted against you.
 function calcPushOrHoldSignal(carData, track, trackPha, tyreResult, wearParts) {
 const signals = [];
 const phaMatch = calcPhaMatch(carData, trackPha);
 if (phaMatch) {
 signals.push({ label: 'Car/track PHA match', met: phaMatch.level !== 'none', detail: phaMatch.level === 'perfect' ? 'Perfect match' : phaMatch.level === 'top' ? 'Top attribute matches' : 'No alignment' });
 }
 if (tyreResult && tyreResult.source) {
 signals.push({ label: 'Tyre strategy confidence', met: tyreResult.source === 'gapp' || tyreResult.source === 'calibrated', detail: tyreResult.source === 'gapp' ? 'Per-track formula' : tyreResult.source === 'calibrated' ? 'Calibrated cross-check' : 'Generic fallback only' });
 }
 if (Array.isArray(wearParts) && wearParts.length) {
 const worst = Math.max(...wearParts.map(p => p.endWear));
 signals.push({ label: 'Car wear headroom', met: worst < 90, detail: `Worst part ends race at ${worst}%` });
 }
 if (!signals.length) return null;
 const metCount = signals.filter(s => s.met).length;
 const verdict = metCount === signals.length ? 'Green light - all signals favour pushing.'
 : metCount === 0 ? 'Hold back - no signals favour a push this weekend.'
 : `${metCount}/${signals.length} signals favour pushing - moderate risk is reasonable.`;
 return { signals, metCount, total: signals.length, verdict };
 }

 // ============================================================
 // RENDER: QUALIFY
 // ============================================================
 function renderQualify(practice, track, driver, supplier, isQ2, carData, staffTd) {
 const weather = extractWeather(practice);
 const analyze = analyzeWeather(weather);
 const car = carData || (practice ? { lvlEngine: practice.lvlEngine, lvlSusp: practice.lvlSusp } : null);
 const ctr = getCtr();
 const tyre = calcTyreStrategySmart(track, null, weather, car, driver, supplier, ctr, staffTd);

 let h = mkStaleBanner(practice, track, driver, carData);

 h += mkDecisionBoard([
 analyze ? { id: 'gpro-sec-weather', label: 'Weather', verdict: analyze.commitRain ? 'RAIN' : 'DRY', tone: analyze.commitRain ? 'bad' : 'good' } : null,
 tyre ? { id: 'gpro-sec-tyre-rec', label: 'Tyre', verdict: tyre.finalRec, tone: tyre.source === 'gapp' ? 'good' : tyre.source === 'calibrated' ? 'warn' : 'info' } : null,
 { id: 'gpro-sec-setup', label: 'Setup', verdict: 'view', tone: 'info' },
 ]);

 // Weather
 h += mkWeatherForecastSection(analyze, { id: 'gpro-sec-weather' });

  // Q1/Q2 Weather inputs - auto-detected from the weather widget (DOM rain icon, falling back to
  // race-start forecast rain%) until the user manually overrides a dropdown at least once.
  const qDomTemps = scrapeSessionTempsFromDOM();
  const autoQ1Wet = qDomTemps && qDomTemps.q1Rain !== null ? qDomTemps.q1Rain : !!(analyze && analyze.segs[0].rainMax >= 40);
  const autoQ2Wet = qDomTemps && qDomTemps.q2Rain !== null ? qDomTemps.q2Rain : !!(analyze && analyze.segs[0].rainMax >= 40);
  const q1WetQ = resolveSessionWet('gpro_q1_wet', autoQ1Wet);
  const q2WetQ = resolveSessionWet('gpro_q2_wet', autoQ2Wet);
  h += `<div style="${ST.section}"><div style="${ST.sectionTitle}">Session Weather (auto-detected, override below)</div>`;
  h += `<div style="display:flex;gap:12px;align-items:center;font-size:11px;">`;
  // Only show the weather dropdown for the current session
  if (!isQ2) h += `<span style="color:#d1d5db;">Q1: <select id="gpro-q1-weather-q" style="font-size:10px;background:#1f2937;color:#f9fafb;border:1px solid #374151;border-radius:3px;"><option value="0"${!q1WetQ ? ' selected' : ''}>☀️ Dry</option><option value="1"${q1WetQ ? ' selected' : ''}>🌧️ Wet</option></select></span>`;
  if (isQ2) h += `<span style="color:#d1d5db;">Q2: <select id="gpro-q2-weather-q" style="font-size:10px;background:#1f2937;color:#f9fafb;border:1px solid #374151;border-radius:3px;"><option value="0"${!q2WetQ ? ' selected' : ''}>☀️ Dry</option><option value="1"${q2WetQ ? ' selected' : ''}>🌧️ Wet</option></select></span>`;
  h += `</div></div>`;

 // Car Setup for this session - Q1 page uses Q1 temp/weather, Q2 page uses Q2 temp/weather (was
 // always showing Q1's numbers/label on the Q2 page regardless of `isQ2`).
 let q1Temp = 25, q2Temp = 25;
 const domTemps = qDomTemps;
 if (weather) {
 // No API field exists for the game's "Practice/Qualify 1" / "Qualify 2/Race start" temp boxes,
 // only the 4 race-forecast segments (raceQ1..raceQ4). Prefer the DOM scrape (matches GAPP's own
 // approach exactly) and fall back to approximating from segment 1's low/high range.
 q1Temp = (domTemps && domTemps.q1 !== null) ? domTemps.q1 : (parseFloat(weather.raceQ1TempLow) || 25);
 q2Temp = (domTemps && domTemps.q2 !== null) ? domTemps.q2 : (parseFloat(weather.raceQ1TempHigh) || 25);
 } else if (track) {
 q1Temp = q2Temp = parseFloat(track.trackTemp || track.temperature) || 25;
 }
 const sessionTemp = isQ2 ? q2Temp : q1Temp;
 const sessionWet = isQ2 ? q2WetQ : q1WetQ;
 const sessionLabel = isQ2 ? 'Q2' : 'Q1';
 const trackPower = parseInt(track && (track.trackPower || track.power)) || MONTREAL_POWER;
 const qualTrackName = (practice||{}).trackName || (track||{}).trackName || '';
 const setup = calcCarSetupSmart(sessionTemp, sessionTemp, sessionTemp, sessionWet, false, false, trackPower, qualTrackName, driver, car);
 if (setup) {
 let setupHtml = `<div data-setup-table style="overflow-x:auto;">` +
 mkSetupTableInner(setup, [{ key: 'Q1', label: `${sessionLabel} (${sessionTemp.toFixed(0)}°C ${sessionWet ? '🌧️' : '☀️'})`, highlight: true }]) +
 `</div>`;
  setupHtml += `<div style="font-size:9px;color:#6b7280;margin-top:2px;">Setup source: ${setup.source === 'gapp' ? 'driver+car-aware (per-track)' : 'temperature-only (legacy)'}</div>`;
  setupHtml += wingSplitLabel(setup.Q1);
  setupHtml += mkHappyRangeLabel(driver);
  // Track evolution note (from Elite: Q2 ~0.6% faster from rubber)
  if (isQ2) {
  setupHtml += `<div style="font-size:9px;color:#10b981;margin-top:4px;padding:3px 6px;background:#1e293b;border-radius:3px;border-left:2px solid #10b981;">📊 Track evolution: Q2 runs ~0.6% faster from rubber build-up. Grip increases as more cars run — late Q2 laps benefit from this.</div>`;
  }
  setupHtml += `<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap;">`;
 setupHtml += `<button id="gpro-copy-q1" style="background:#3b82f6;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;">📋 Copy ${sessionLabel} Setup</button>`;
 setupHtml += `</div>`;
  setupHtml += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">Track-adjusted (P=${trackPower}). ${sessionWet ? 'Wet modifiers applied.' : 'Dry setup.'}</div>`;
  // Setup difficulty indicator (from Elite: tracks with extreme grip/overtaking are harder to set up)
  {
  const trackGrip = (practice && practice.grip) || (track && track.gripLevel) || '';
  const trackOA = (practice && practice.overtaking) || (track && track.overtakingDifficulty) || '';
  let difficulty = 'Normal';
  let diffColor = '#10b981';
  if (trackGrip === 'Very High' || trackOA === 'Very Hard' || trackOA === 'Hard') {
  difficulty = 'Hard';
  diffColor = '#ef4444';
  } else if (trackGrip === 'High' || trackOA === 'Hard') {
  difficulty = 'Medium';
  diffColor = '#f59e0b';
  } else if (trackGrip === 'Low' || trackOA === 'Easy') {
  difficulty = 'Easy';
  diffColor = '#3b82f6';
  }
  setupHtml += `<div style="font-size:9px;color:${diffColor};margin-top:2px;">⚡ Setup Difficulty: ${difficulty} ${difficulty === 'Hard' ? '— small setup errors cost more time' : difficulty === 'Easy' ? '— forgiving setup window' : ''}</div>`;
  }
  h += mkSection('Car Setup', setupHtml, 'gpro-sec-setup');
 }

 // Tyre - page-specific recommendation
 if (tyre) {
 const q2Wet = GM_getValue('gpro_q2_wet', '0') === '1';
 let tyreRec = tyre.finalRec;
 let tyreReason = tyre.recReason;
 if (isQ2 && q2Wet) {
 tyreRec = 'Rain';
 tyreReason = 'Q2 is wet - Rain tyres mandatory';
 } else if (!isQ2 && !q2Wet && tyre.bestDry) {
 tyreRec = tyre.bestDry.name;
 tyreReason = `Q1 is dry - fastest dry compound (${tyre.bestDry.name})`;
 }
 h += `<div id="gpro-sec-tyre-rec" data-tyre-rec>${mkRec(`<strong>${tyreRec}</strong><br><span style="font-size:10px;">${tyreReason}</span>`, 'good')}${mkTyreSourceNote(tyre)}</div>`;
 // Q2's own form has a "First stint fuel" field (this is what starts the race) - surface it
 // directly instead of making the user cross-reference the tyre table below.
 if (isQ2) {
 const chosen = tyre.results.find(r => r.name === tyreRec) || tyre.results[0];
 if (chosen) {
 h += `<div data-first-stint-fuel>${mkRec(`<strong>First Stint Fuel: ${chosen.fuelPerStint}L</strong><br><span style="font-size:10px;">Enter this in Q2's "First stint fuel" field - covers ${chosen.lapsPerStint} laps on ${chosen.name} before the first planned pit</span>`, 'good')}</div>`;
 }
 }
 h += mkSection('Tyre Details',
 mkRow('Fuel/Lap', `${tyre.fuelPerLap}L`) +
 mkRow('Total Fuel', `${tyre.totalFuel}L`) +
 `<div data-wear-factor>` + mkRow('Wear Factor', tyre.combinedWearMult !== null ? `${tyre.combinedWearMult}x` : 'N/A') + `</div>` +
 mkGappStopsCrossCheck(tyre) + mkTdStatusNote(staffTd)
 );
 h += `<div data-tyre-table>${mkTyreResultsTable(tyre.results)}</div>`;

 // Tyre strategy insights (from Elite tyre analysis)
 if (tyre.results && tyre.results.length > 0) {
 const best = tyre.results[0];
 const worst = tyre.results[tyre.results.length - 1];
 const timeDiff = worst.total - best.total;
 const stopDiff = worst.stops - best.stops;
 let tyreInsight = '';
 if (timeDiff < 5) {
 tyreInsight = 'All compounds are very close in total time — choose based on race risk tolerance.';
 } else if (timeDiff < 15) {
 tyreInsight = `Best compound saves ~${timeDiff.toFixed(1)}s over worst. Moderate advantage.`;
 } else {
 tyreInsight = `Best compound saves ~${timeDiff.toFixed(1)}s over worst. Significant advantage — stick with recommended.`;
 }
 if (stopDiff > 1) {
 tyreInsight += ` Fewer stops = less pit time but higher tyre wear risk.`;
 }
 h += `<div style="font-size:9px;color:#9ca3af;margin-top:4px;padding:4px 8px;background:#1e293b;border-radius:4px;">🏎 ${tyreInsight}</div>`;
 }

 // Rain tyre recommendation for Qualify
 if (analyze && analyze.maxRain >= 40) {
 h += `<div style="margin-top:8px;padding:6px;background:#1e293b;border-radius:4px;font-size:10px;">`;
 h += `<div style="color:#60a5fa;font-weight:700;margin-bottom:4px;">🌧️ Rain Qualifying Plan:</div>`;
 // Q1 weather is from practice (use dropdown), Q2 weather is from race start
 const q1WetSaved = GM_getValue('gpro_q1_wet', '0') === '1';
 const q2WetSaved = GM_getValue('gpro_q2_wet', '0') === '1';
 if (q1WetSaved) {
 h += `<div style="color:#f59e0b;">Q1: Start on <strong>Rain tyres</strong> (manual selection)</div>`;
 h += `<div style="color:#d1d5db;">Practice laps: Use Hard or Medium to save Rain tyres</div>`;
 } else {
 h += `<div style="color:#10b981;">Q1: Dry conditions - use <strong>${tyre.finalRec}</strong></div>`;
 h += `<div style="color:#9ca3af;">Practice on Hard/Medium to test setup, qualify on ${tyre.finalRec}</div>`;
 }
 if (q2WetSaved || (analyze.segs[0] && analyze.segs[0].rainMax >= 40)) {
 h += `<div style="color:#f59e0b;">Q2: Switch to <strong>Rain tyres</strong> (rain expected at race start)</div>`;
 }
  h += `</div>`;
  }
  }

  // Track-specific setup tips (from Elite track analysis)
  if (qualTrackName) {
  const prof = TRACK_PROFILES[qualTrackName] || {};
  const tips = [];
  if (prof.grip === 'Very High' || prof.grip === 'High') tips.push('High grip track — setup window is narrower. Be precise with adjustments.');
  if (prof.grip === 'Very Low' || prof.grip === 'Low') tips.push('Low grip track — setup is more forgiving. Small errors cost less time.');
  if (prof.overtaking === 'Very Hard' || prof.overtaking === 'Hard') tips.push('Hard overtaking — qualifying position is crucial. Push for a good Q2 time.');
  if (prof.overtaking === 'Easy') tips.push('Easy overtaking — qualifying less critical. Can afford to be strategic.');
  if (prof.tyre === 'Very High' || prof.tyre === 'High') tips.push('High tyre wear — race strategy matters more than qualifying pace.');
  if (prof.fuel === 'High' || prof.fuel === 'Very High') tips.push('High fuel consumption — fuel load affects handling. Test fuel-heavy setup in practice.');
  if (tips.length > 0) {
  let tipsHtml = `<div style="font-size:9px;color:#9ca3af;margin-top:6px;padding:4px 8px;background:#1e293b;border-radius:4px;">`;
  tipsHtml += `<div style="color:#60a5fa;font-weight:600;margin-bottom:2px;">📊 Track Tips:</div>`;
  tips.forEach(t => { tipsHtml += `<div style="color:#d1d5db;margin:1px 0;">• ${t}</div>`; });
  tipsHtml += `</div>`;
  h += tipsHtml;
  }
  }

 body(h);

 // Q1/Q2 weather dropdown handlers - recalculate in-place (no reload)
 setTimeout(() => {
 const q1wq = document.getElementById('gpro-q1-weather-q');
 const q2wq = document.getElementById('gpro-q2-weather-q');
 const updateSetupInPlace = () => {
 const q1w = document.getElementById('gpro-q1-weather-q');
 const q2w = document.getElementById('gpro-q2-weather-q');
 // Q1's dropdown isn't rendered on the Q2 page (see above) - don't let its absence there
 // silently overwrite the stored Q1 wet flag back to "dry, manually set" every time the Q2
 // dropdown changes.
 const newQ1Wet = q1w ? q1w.value === '1' : q1WetQ;
 const newQ2Wet = q2w ? q2w.value === '1' : q2WetQ;
 if (q1w) setSessionWetManual('gpro_q1_wet', newQ1Wet);
 setSessionWetManual('gpro_q2_wet', newQ2Wet);
 const curSessionTemp = isQ2 ? q2Temp : q1Temp;
 const curSessionWet = isQ2 ? newQ2Wet : newQ1Wet;
 const newSetup = calcCarSetupSmart(curSessionTemp, curSessionTemp, curSessionTemp, curSessionWet, false, false, trackPower, qualTrackName, driver, car);
 if (newSetup) {
 const setupTable = document.querySelector('[data-setup-table]');
 if (setupTable) {
 setupTable.innerHTML = mkSetupTableInner(newSetup, [{ key: 'Q1', label: `${sessionLabel} (${curSessionTemp.toFixed(0)}°C ${curSessionWet ? '🌧️' : '☀️'})`, highlight: true }]);
 }
 }
 // Update tyre recommendation
 const newTyreRec = calcTyreStrategySmart(track, null, weather, car, driver, supplier, 0, staffTd);
 const recEl = document.querySelector('[data-tyre-rec]');
 if (recEl && newTyreRec) {
 let tr = newTyreRec.finalRec;
 let trReason = newTyreRec.recReason;
 if (isQ2 && newQ2Wet) { tr = 'Rain'; trReason = 'Q2 is wet - Rain tyres mandatory'; }
 else if (!isQ2 && !newQ1Wet && newTyreRec.bestDry) { tr = newTyreRec.bestDry.name; trReason = `Q1 is dry - fastest dry compound (${newTyreRec.bestDry.name})`; }
 recEl.innerHTML = mkRec(`<strong>${tr}</strong><br><span style="font-size:10px;">${trReason}</span>`, 'good') + mkTyreSourceNote(newTyreRec);
 if (isQ2) {
 const fuelEl = document.querySelector('[data-first-stint-fuel]');
 const chosen = newTyreRec.results.find(r => r.name === tr) || newTyreRec.results[0];
 if (fuelEl && chosen) {
 fuelEl.innerHTML = mkRec(`<strong>First Stint Fuel: ${chosen.fuelPerStint}L</strong><br><span style="font-size:10px;">Enter this in Q2's "First stint fuel" field - covers ${chosen.lapsPerStint} laps on ${chosen.name} before the first planned pit</span>`, 'good');
 }
 }
 }
 };
 if (q1wq) q1wq.addEventListener('change', updateSetupInPlace);
 if (q2wq) q2wq.addEventListener('change', updateSetupInPlace);
 // Copy this session's setup button (Q1 page copies Q1, Q2 page copies Q2)
 wireCopyButton(document.getElementById('gpro-copy-q1'), () => {
 const curQ1Wet = GM_getValue('gpro_q1_wet', '0') === '1';
 const curQ2Wet = GM_getValue('gpro_q2_wet', '0') === '1';
 const curTemp = isQ2 ? q2Temp : q1Temp;
 const curWet = isQ2 ? curQ2Wet : curQ1Wet;
 const s = calcCarSetupSmart(curTemp, curTemp, curTemp, curWet, false, false, trackPower, qualTrackName, driver, car);
 return s ? `FW=${s.Q1['Front Wing']} RW=${s.Q1['Rear Wing']} E=${s.Q1['Engine']} B=${s.Q1['Brakes']} G=${s.Q1['Gearbox']} S=${s.Q1['Suspension']}` : '';
 }, `📋 Copy ${sessionLabel} Setup`);
 }, 100);
 }

 // ============================================================
 // RENDER: RACE SETUP
 // ============================================================
  function renderRaceSetup(practice, track, testing, driver, supplier, carData, staffTd, league) {
  const weather = extractWeather(practice);
  const analyze = analyzeWeather(weather);
  // Early raceTemp computation — needed by unified strategy section before the full
  // DOM-temp block below. Uses same avg-of-8-values formula as the later authoritative copy.
  let raceTemp = 25;
  if (weather) {
  const t1L = parseFloat(weather.raceQ1TempLow) || 25, t1H = parseFloat(weather.raceQ1TempHigh) || 25;
  const t2L = parseFloat(weather.raceQ2TempLow) || 25, t2H = parseFloat(weather.raceQ2TempHigh) || 25;
  const t3L = parseFloat(weather.raceQ3TempLow) || 25, t3H = parseFloat(weather.raceQ3TempHigh) || 25;
  const t4L = parseFloat(weather.raceQ4TempLow) || 25, t4H = parseFloat(weather.raceQ4TempHigh) || 25;
  raceTemp = ((t1L + t1H) / 2 + (t2L + t2H) / 2 + (t3L + t3H) / 2 + (t4L + t4H) / 2) / 4;
  } else if (track) {
  raceTemp = parseFloat(track.trackTemp || track.temperature) || 25;
  }
  // Use full car data from /UpdateCar for levels, wear, and PHA
 const car = carData || (practice ? { lvlEngine: practice.lvlEngine, lvlSusp: practice.lvlSusp } : null);
 // Auto-detect CTR from DOM (name="DriverRisk" on RaceSetup.asp) — user sets this in-game,
 // never enters it manually. Falls back to 0 if not on the page or not set yet.
 const domCtrEl = document.querySelector('input[name="DriverRisk"]');
 if (domCtrEl) { const v = parseInt(domCtrEl.value) || 0; setCtr(v); }
 const ctr = getCtr();
 const tyre = calcTyreStrategySmart(track, testing, weather, car, driver, supplier, ctr, staffTd);
 // Fuel plan must match the tyre strategy actually recommended (stints/stops depend on which
 // compound is chosen) rather than an independently-computed generic fuel estimate - otherwise
 // Fuel Strategy and Tyre Details can show two different fuel/lap and total-fuel numbers for the
 // same race. GAPP's own tyre-stop formula already accounts for fuel load in its lost-time calc
 // (fuelPerLap/totalFuel/laps below all come straight from `tyre`), so derive the fuel plan from
 // the selected compound's stop count instead of a separate model.
 const chosenTyreResult = tyre && tyre.results.find(r => r.name === tyre.finalRec);
 // RaceSetup.asp's "Start fuel" field is READ-ONLY - it's whatever amount was actually typed into
 // Q2's "First stint fuel" field, not something chosen here. If that doesn't match an even split of
 // totalFuel/stints (it usually won't, since Q2 and Race Setup can compute their fuel plan from
 // slightly different tyre-calc inputs - e.g. Testing stint data only feeds the Race Setup call),
 // the rest of this plan must build around the REAL committed start fuel, not recompute a
 // hypothetical one - otherwise this section just shows a number that contradicts what's already
 // locked in on the car. Caveat: this even-split-of-the-remainder approach assumes a fully dry
 // race; a rain-affected race changes fuel/lap per compound mid-race and needs a real per-segment
 // gapp calc this doesn't attempt yet.
 const domFuelStartEl = document.querySelector('input[name="FuelStart"]');
 const domFuelStart = domFuelStartEl ? parseInt(domFuelStartEl.value) || null : null;
 const fuel = (tyre && chosenTyreResult) ? (() => {
 const laps = tyre.laps;
 const totalFuel = tyre.totalFuel;
 const fuelPerLap = parseFloat(tyre.fuelPerLap);
 const stops = chosenTyreResult.stops;
 const stints = stops + 1;
 if (domFuelStart && stints > 1) {
 const stint1Fuel = domFuelStart;
 const stint1Laps = Math.round(stint1Fuel / fuelPerLap);
 const remainingLaps = Math.max(0, laps - stint1Laps);
 let remainingStints = stints - 1;
 const remainingFuel = Math.max(0, totalFuel - stint1Fuel);
 // GPRO caps fuel per stint at TANK_MAX (180L, see RaceSetup.asp's own "(max 180 liters)" note
 // on each FuelStop field) - confirmed against our StrategyService, which bumps the
 // stop count until fuelPerStint fits. A large stint1Fuel spread thin over few remaining stints
 // could otherwise recommend an amount the game would reject.
 let perStintFuel = Math.ceil(remainingFuel / remainingStints);
 while (perStintFuel > TANK_MAX && remainingStints < laps) {
 remainingStints++;
 perStintFuel = Math.ceil(remainingFuel / remainingStints);
 }
 const stopLaps = [stint1Laps];
 for (let i = 1; i < remainingStints; i++) stopLaps.push(stint1Laps + Math.round((remainingLaps / remainingStints) * i));
 return { laps, fuelPerLap: tyre.fuelPerLap, totalFuel, stints: remainingStints + 1, stops: remainingStints, fuelPerStint: perStintFuel, stint1Fuel, stopLaps, fromDomFuelStart: true };
 }
 const fuelPerStint = Math.ceil(totalFuel / stints);
 const stopLaps = [];
 for (let i = 1; i <= stops; i++) stopLaps.push(Math.round((laps / stints) * i));
 return { laps, fuelPerLap: tyre.fuelPerLap, totalFuel, stints, stops, fuelPerStint, stopLaps };
 })() : (() => {
 // Fallback: compute from tyre strategy data when DOM FuelStart is unavailable
 if (!tyre || !chosenTyreResult) return null;
 const laps = tyre.laps;
 const totalFuel = tyre.totalFuel;
 const fuelPerLap = parseFloat(tyre.fuelPerLap) || 0;
 const stops = chosenTyreResult.stops;
 const stints = stops + 1;
 const fuelPerStint = Math.ceil(totalFuel / stints);
 const stopLaps = [];
 for (let i = 1; i <= stops; i++) stopLaps.push(Math.round((laps / stints) * i));
 return { laps, fuelPerLap, totalFuel, stints, stops, fuelPerStint, stopLaps };
 })();

  let h = mkStaleBanner(practice, track, testing, driver, carData);

  // Quick Race Summary — one-glance overview of key decisions
  {
  const summaryItems = [];
  const trackName = (practice||{}).trackName || (track||{}).trackName || '?';
  const laps = parseInt(track && track.laps) || 0;
  if (tyre && chosenTyreResult) {
  summaryItems.push({ icon: '🏎', label: chosenTyreResult.name, detail: `${chosenTyreResult.stops} stop${chosenTyreResult.stops !== 1 ? 's' : ''}` });
  }
  if (fuel) {
  summaryItems.push({ icon: '⛽', label: `${fuel.totalFuel}L`, detail: `${fuel.fuelPerLap}L/lap` });
  if (tyre && chosenTyreResult && chosenTyreResult.stops > 0) {
   // Different fuel for race start (from Q2) vs remaining stints
   if (fuel.stint1Fuel && fuel.stint1Fuel !== fuel.fuelPerStint) {
     summaryItems.push({ icon: '🔄', label: `${fuel.stint1Fuel}L start`, detail: `then ${fuel.fuelPerStint}L × ${chosenTyreResult.stops} more stops` });
   } else {
    const stintFuel = Math.ceil(fuel.totalFuel / (chosenTyreResult.stops + 1));
    summaryItems.push({ icon: '🔄', label: `${stintFuel}L/stint`, detail: `${chosenTyreResult.stops + 1} stints` });
   }
  }
  }
  if (analyze) {
  summaryItems.push({ icon: analyze.commitRain ? '🌧' : '☀', label: analyze.commitRain ? 'RAIN' : 'DRY', detail: analyze.commitRain ? 'Wet strategy' : 'Dry strategy' });
  }
  const wearParts = car ? calcPartsWear(car, driver, ctr, trackName) : null;
  if (wearParts) {
  const failCount = wearParts.filter(p => p.willFail).length;
  if (failCount > 0) summaryItems.push({ icon: '🔧', label: `${failCount} FAIL`, detail: 'parts need swap' });
  }
  if (summaryItems.length > 0) {
  h += `<div style="padding:8px 12px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:6px;border:1px solid #334155;margin-bottom:8px;">`;
  h += `<div style="font-size:10px;color:#60a5fa;font-weight:700;margin-bottom:6px;">🏁 RACE QUICK SUMMARY — ${trackName} (${laps} laps)</div>`;
  h += `<div style="display:flex;flex-wrap:wrap;gap:8px;">`;
  summaryItems.forEach(item => {
  h += `<div style="padding:4px 8px;background:#0f172a;border-radius:4px;border:1px solid #334155;font-size:10px;">`;
  h += `<span style="color:#9ca3af;">${item.icon}</span> <span style="color:#f1f5f9;font-weight:600;">${item.label}</span>`;
  h += `<span style="color:#6b7280;margin-left:4px;">${item.detail}</span>`;
  h += `</div>`;
  });
  h += `</div></div>`;
  }
  }

  // Track info - compact (game already shows full details)
 const trackPower = parseInt(track && (track.trackPower || track.power)) || 0;
 const trackHandl = parseInt(track && (track.trackHandl || track.handling)) || 0;
 const trackAccel = parseInt(track && (track.trackAccel || track.acceleration)) || 0;
 const carPower = parseInt(car && (car.carPower || car.power)) || 0;
 const carHandl = parseInt(car && (car.carHandl || car.handling)) || 0;
 const carAccel = parseInt(car && (car.carAccel || car.acceleration)) || 0;

 // Decision-summary board: one verdict
 // tile per section below, click-to-jump. Reuses the same pure calc functions the detailed
 // sections below call again - cheap and side-effect-free, so no behavior change to those.
 {
 const trackPhaForBoard = (trackPower || trackHandl || trackAccel) ? { power: trackPower, handling: trackHandl, accel: trackAccel } : null;
 const phaMatchForBoard = calcPhaMatch(car, trackPhaForBoard);
 const wearPartsForBoard = car ? calcPartsWear(car, driver, ctr, (practice||{}).trackName || (track||{}).trackName) : null;
 const pushHoldForBoard = calcPushOrHoldSignal(car, track, trackPhaForBoard, tyre, wearPartsForBoard);
  h += mkDecisionBoard([
  analyze ? { id: 'gpro-sec-weather', label: 'Weather', verdict: analyze.commitRain ? 'RAIN' : 'DRY', tone: analyze.commitRain ? 'bad' : 'good' } : null,
  phaMatchForBoard ? { id: 'gpro-sec-pha', label: 'PHA Match', verdict: phaMatchForBoard.level === 'none' ? 'No match' : phaMatchForBoard.level, tone: phaMatchForBoard.level === 'perfect' ? 'good' : phaMatchForBoard.level === 'top' ? 'warn' : 'bad' } : null,
  pushHoldForBoard ? { id: 'gpro-sec-strategy', label: 'Strategy', verdict: `${pushHoldForBoard.metCount}/${pushHoldForBoard.total}`, tone: pushHoldForBoard.metCount === pushHoldForBoard.total ? 'good' : pushHoldForBoard.metCount === 0 ? 'bad' : 'warn' } : null,
  { id: 'gpro-sec-setup', label: 'Setup', verdict: 'view', tone: 'info' },
  ]);
 }

 h += mkSection('Track',
 mkRow('Name', (practice||{}).trackName || (track||{}).trackName || '?') +
 mkRow('Laps', (track||{}).laps || '?') +
 mkRow('Pit Loss', `${(track||{}).timeInOutPits || '?'}s`)
 );

 // Weather
 h += mkWeatherForecastSection(analyze, { rainLabel: 'RAIN PLAN COMMITTED', showAvg: false, id: 'gpro-sec-weather' });

   // === UNIFIED RACE STRATEGY ===
   // Combines push-or-hold, tyre compound, fuel plan, rain transition, and wait-to-pit into
   // one coherent section instead of scattering related data across 4+ separate blocks.
   {
  // Push-or-Hold signals (formerly standalone section)
  const trackPhaForStrategy = (trackPower || trackHandl || trackAccel) ? { power: trackPower, handling: trackHandl, accel: trackAccel } : null;
  const wearPartsForStrategy = car ? calcPartsWear(car, driver, ctr, (practice||{}).trackName || (track||{}).trackName) : null;
  const pushHold = calcPushOrHoldSignal(car, track, trackPhaForStrategy, tyre, wearPartsForStrategy);

  // Drying race detection (from old Fuel Strategy)
  const isDryingRace = analyze && analyze.commitRain && analyze.segs.some(s => s.rainMax < 20);
  let dryingFuelData = null;
  if (isDryingRace && tyre && tyre.bestWet && tyre.bestDry) {
  const laps = parseInt(track.laps) || 0;
  const segs = analyze.segs;
  let drySegIdx = segs.findIndex(s => s.rainMax < 20);
  if (drySegIdx === -1) drySegIdx = segs.length;
  // Real fix 2026-07-27: weather transitions land on the same ABSOLUTE lap for every league on a
  // track (per GPRO wiki), NOT a fraction of each race's own distance - so dividing this race's
  // laps by 4 was wrong (gave 29 for a real Losail 57-lap race whose true window was 40-46).
  // Now uses estimateLapsPerWeatherPeriod(track) instead of Losail's flat "20". Bounds capped to
  // this race's own total laps.
  const TRANSITION_WINDOW_LAPS = 6;
  const lapsPerPeriod = estimateLapsPerWeatherPeriod(track);
  const earliestStopLap = drySegIdx > 0 ? Math.min(laps, drySegIdx * lapsPerPeriod) : 0;
  const latestStopLap = drySegIdx > 0 ? Math.min(laps, earliestStopLap + TRANSITION_WINDOW_LAPS) : 0;
  const rainLaps = latestStopLap;
  const dryLaps = laps - rainLaps;
  const wetPerLap = tyre.bestWet.fuelPerStint / Math.max(1, tyre.bestWet.lapsPerStint);
  const dryPerLap = tyre.bestDry.fuelPerStint / Math.max(1, tyre.bestDry.lapsPerStint);
  const wetFuel = Math.ceil(wetPerLap * rainLaps);
  const dryFuel = Math.ceil(dryPerLap * dryLaps);
  dryingFuelData = { rainLaps, dryLaps, earliestStopLap, latestStopLap, wetFuel, dryFuel, totalFuel: wetFuel + dryFuel, dryCompoundName: tyre.bestDry.name };
  }

  let strategyHtml = '';

  // 0. Weather progression analysis (from Elite weather models)
  if (weather) {
  const quarters = [];
  for (let i = 1; i <= 4; i++) {
  const low = parseInt(weather[`raceQ${i}RainPLow`] || 0);
  const high = parseInt(weather[`raceQ${i}RainPHigh`] || 0);
  quarters.push({ q: i, low, high, avg: Math.round((low + high) / 2), delta: high - low });
  }
  const avgRain = quarters.reduce((s, q) => s + q.avg, 0) / 4;
  const maxQ = quarters.reduce((max, q) => q.avg > max.avg ? q : max, quarters[0]);
  const trend = quarters[3].avg - quarters[0].avg;
  let progNote = '';
  if (Math.abs(trend) > 15) {
  const dir = trend > 0 ? 'increasing' : 'decreasing';
  progNote = `Rain trend: ${dir} through race (${quarters[0].avg}%→${quarters[3].avg}%). ${trend > 0 ? 'Plan wet tyres later.' : 'Rain may clear - consider staying dry.'}`;
  } else if (maxQ.avg > 50) {
  progNote = `Peak rain Q${maxQ.q} (${maxQ.avg}%). ${maxQ.q <= 2 ? 'Early rain risk - consider starting on wets.' : 'Mid/later rain - keep dry tyres but be ready.'}`;
  } else if (avgRain < 15) {
  progNote = 'Low rain probability across all quarters. Dry strategy throughout.';
  }
  if (progNote) {
  strategyHtml += `<div style="font-size:9px;color:#60a5fa;margin-top:4px;padding:4px 8px;background:#1e293b;border-radius:4px;">📊 Weather Progression: ${progNote}</div>`;
  }
  }

  // 1. Push-or-Hold verdict banner
  if (pushHold) {
  const phColor = pushHold.metCount === pushHold.total ? '#10b981' : pushHold.metCount === 0 ? '#ef4444' : '#f59e0b';
  strategyHtml += `<div style="padding:6px 10px;border-radius:6px;background:#1e293b;margin-bottom:8px;border-left:3px solid ${phColor};">`;
  strategyHtml += `<div style="color:${phColor};font-weight:700;font-size:11px;">🏁 ${pushHold.metCount}/${pushHold.total} signals — ${pushHold.metCount === pushHold.total ? 'PUSH' : pushHold.metCount === 0 ? 'HOLD' : 'MODERATE RISK'}</div>`;
  strategyHtml += `<div style="font-size:9px;color:#9ca3af;margin-top:2px;">${pushHold.verdict}</div>`;
  strategyHtml += `</div>`;
  }

  // 2. Race context badges
  {
  const weatherLabel = analyze && analyze.commitRain ? 'RAIN' : 'DRY';
  const weatherColor = analyze && analyze.commitRain ? '#60a5fa' : '#10b981';
  strategyHtml += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">`;
  strategyHtml += `<div style="padding:3px 8px;border-radius:4px;background:#1e293b;font-size:10px;"><span style="color:#9ca3af;">Weather:</span> <span style="color:${weatherColor};font-weight:700;">${weatherLabel}</span></div>`;
  if (tyre) {
  strategyHtml += `<div style="padding:3px 8px;border-radius:4px;background:#1e293b;font-size:10px;"><span style="color:#9ca3af;">Compound:</span> <span style="color:#f9fafb;font-weight:700;">${tyre.finalRec}</span></div>`;
  strategyHtml += `<div style="padding:3px 8px;border-radius:4px;background:#1e293b;font-size:10px;"><span style="color:#9ca3af;">Stops:</span> <span style="color:#f9fafb;font-weight:700;">${chosenTyreResult ? chosenTyreResult.stops : '?'}</span></div>`;
  strategyHtml += `<div style="padding:3px 8px;border-radius:4px;background:#1e293b;font-size:10px;"><span style="color:#9ca3af;">Laps:</span> <span style="color:#f9fafb;font-weight:700;">${tyre.laps}</span></div>`;
  }
  strategyHtml += `</div>`;
  }

  // 3. Fuel plan (integrated)
  if (dryingFuelData) {
  const df = dryingFuelData;
  strategyHtml += `<div style="margin-bottom:6px;">`;
  strategyHtml += mkRow('Total Fuel', `<strong>${df.totalFuel}L</strong> (wet+dry combined)`);
  strategyHtml += mkRow('Rain Stop Window', `Lap ${df.earliestStopLap}-${df.latestStopLap} (forecast can't pin an exact lap - see GPRO's own weather rules)`);
  strategyHtml += mkRow('Start Fuel (Q2)', `<strong>${df.wetFuel}L</strong> — Rain tyres, ${df.rainLaps} wet laps (fuelled for the later/safer end of the window)`);
  strategyHtml += mkRow('Stop 1 Fuel', `<strong>${df.dryFuel}L</strong> — ${df.dryCompoundName} tyres, ${df.dryLaps} dry laps`);
  strategyHtml += mkRow('Wet Fuel/Lap', `${(df.wetFuel / df.rainLaps).toFixed(2)}L`);
  strategyHtml += mkRow('Dry Fuel/Lap', `${(df.dryFuel / df.dryLaps).toFixed(2)}L`);
  strategyHtml += mkRow('Pit Stops', '1 (wet → dry compound switch)');
  strategyHtml += `</div>`;
  } else if (fuel) {
  const stintsLabel = fuel.fromDomFuelStart
  ? `${fuel.stint1Fuel}L (start, from Q2) + ${fuel.stints - 1} x ${fuel.fuelPerStint}L`
  : `${fuel.stints} x ${fuel.fuelPerStint}L`;
   strategyHtml += `<div style="margin-bottom:6px;">`;
   strategyHtml += mkRow('Total Fuel', `${fuel.totalFuel}L`);
   strategyHtml += mkRow('Fuel/Lap', `${fuel.fuelPerLap}L`);
   strategyHtml += mkRow('Stints', stintsLabel);
   strategyHtml += mkRow('Pit Stops', `${fuel.stops}`);
   if (fuel.stopLaps.length) strategyHtml += mkRow('Est. Pit Laps', fuel.stopLaps.join(', '));
   // Pit window calculator (from Elite): optimal lap range for each pit stop
   // Based on tyre durability model: tyres should pit between 50-80% remaining
   if (fuel.stopLaps.length > 0 && track) {
   const laps = parseInt(track.laps) || 0;
   const trackName = (practice||{}).trackName || (track||{}).trackName || '';
   const trackTemp = raceTemp || 25;
   const tempCoeff = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.tempWearMultiplier) ? GPRO_DATA.tempWearMultiplier.tempCoeff : 0.015;
   const tempMult = 1 + (trackTemp - 20) * tempCoeff;
   const gappWearF = lookupGappTrack(trackName, 'tyreWearFactor') || 1.0;
   const intensityV = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.trackWearIntensity) ? (GPRO_DATA.trackWearIntensity[trackName] || 1.0) : 1.0;
   const baseWearLap = 0.5 * gappWearF * intensityV * tempMult;
   // Pit window: when tyre hits 50% (optimal) to 80% (latest safe)
   const earlyPitLap = baseWearLap > 0 ? Math.ceil(50 / (baseWearLap * 100)) : null;
   const latePitLap = baseWearLap > 0 ? Math.ceil(20 / (baseWearLap * 100)) : null;
   if (earlyPitLap && latePitLap && latePitLap <= laps) {
   strategyHtml += mkRow('Pit Window', `<span style="color:#10b981;">lap ${earlyPitLap}</span> (optimal) to <span style="color:#f59e0b;">lap ${latePitLap}</span> (latest safe)`);
   }
   }
    strategyHtml += `</div>`;
   }

   // Fuel temperature normalization note (from Elite fuel models)
   // Hot tracks = fuel is less dense = slightly more volume per lap; cold tracks = opposite
   if (fuel && track) {
   const trackTemp = raceTemp || 25;
   if (trackTemp >= 30) {
   strategyHtml += `<div style="font-size:9px;color:#f59e0b;margin-top:4px;">🌡 Hot track (${trackTemp}°C): fuel is less dense — actual fuel/lap may be ~1-2% higher than calculated. Consider adding 1-2L extra.</div>`;
   } else if (trackTemp <= 10) {
   strategyHtml += `<div style="font-size:9px;color:#60a5fa;margin-top:4px;">❄ Cold track (${trackTemp}°C): fuel is denser — actual fuel/lap may be ~1-2% lower. Standard load should suffice.</div>`;
   }
   }

   // 4. Recommendation banner
  if (dryingFuelData) {
  strategyHtml += mkRec(`Load <strong>${dryingFuelData.wetFuel}L</strong> for Q2 start (Rain), then <strong>${dryingFuelData.dryFuel}L</strong> at the stop (${dryingFuelData.dryCompoundName}). GPRO pits you automatically somewhere between lap ${dryingFuelData.earliestStopLap}-${dryingFuelData.latestStopLap} - the forecast can't pin an exact lap, only that rain stops sometime within that window.`, 'good');
  } else if (fuel) {
  strategyHtml += mkRec(
  (fuel.fromDomFuelStart
  ? `Start fuel: <strong>${fuel.stint1Fuel}L</strong> (locked from Q2) — load <strong>${fuel.fuelPerStint}L</strong> per remaining stop`
  : `Load <strong>${fuel.fuelPerStint}L</strong> per stint (${fuel.stops} stop${fuel.stops === 1 ? '' : 's'})`) +
  (fuel.stopLaps.length ? ` — auto-pits around lap ${fuel.stopLaps.join('/')}` : ''), 'good');
   } else {
   strategyHtml += mkRec('Complete testing to get fuel data', 'warn');
   }

    // 5. Rain transition details (if drying race)
  if (dryingFuelData) {
  const df = dryingFuelData;
  const pitLoss = parseFloat(track.timeInOutPits) || 13.5;
  strategyHtml += `<div style="margin-top:8px;padding:6px;background:#1e293b;border-radius:4px;font-size:10px;">`;
  strategyHtml += `<div style="color:#60a5fa;font-weight:700;margin-bottom:4px;">🌧️ Rain → Dry Transition:</div>`;
  strategyHtml += `<div style="color:#d1d5db;">1. <strong>Start on Rain tyres</strong> (rain ${analyze.segs[0].rainMin}-${analyze.segs[0].rainMax}%)</div>`;
  strategyHtml += `<div style="color:#d1d5db;">2. <strong>Stop 1 fuel: ${df.dryFuel}L</strong> — auto-pit somewhere between lap ${df.earliestStopLap}-${df.latestStopLap}</div>`;
  strategyHtml += `<div style="color:#d1d5db;">3. <strong>Switch to ${df.dryCompoundName}</strong> for remaining ~${df.dryLaps} laps</div>`;
  strategyHtml += `<div style="color:#9ca3af;margin-top:4px;">⚡ Pit loss: ${pitLoss}s</div>`;
  strategyHtml += `</div>`;
  } else if (analyze && analyze.maxRain >= 40 && tyre && tyre.bestDry) {
  // Full-race rain plan (rain all race, no drying)
  const laps = parseInt(track.laps) || 0;
  const pitLoss = parseFloat(track.timeInOutPits) || 13.5;
  strategyHtml += `<div style="margin-top:8px;padding:6px;background:#1e293b;border-radius:4px;font-size:10px;">`;
  strategyHtml += `<div style="color:#60a5fa;font-weight:700;margin-bottom:4px;">🌧️ Rain All Race:</div>`;
  strategyHtml += `<div style="color:#d1d5db;">Start and stay on <strong>Rain</strong> tyres for all ${laps} laps.</div>`;
  strategyHtml += `<div style="color:#d1d5db;">If rain clears mid-race, switch to <strong>${tyre.bestDry.name}</strong> at the next fuel stop.</div>`;
  strategyHtml += `<div style="color:#9ca3af;margin-top:4px;">⚡ Pit loss: ${pitLoss}s</div>`;
  strategyHtml += `</div>`;
  }

  // 6. Wait-to-pit heuristics (if rain risk)
  if (analyze && analyze.maxRain >= 15) {
  const segs = analyze.segs;
  const startRain = segs[0].rainMax;
  const waitStartRain = startRain >= 60 ? 0 : startRain >= 30 ? 1 : 2;
  let maxDrop = 0;
  for (let i = 1; i < segs.length; i++) maxDrop = Math.max(maxDrop, segs[i - 1].rainMax - segs[i].rainMax);
  const waitStopRain = maxDrop >= 30 ? 1 : maxDrop >= 15 ? 2 : 3;
  strategyHtml += `<div style="margin-top:8px;padding:6px;background:#1e293b;border-radius:4px;font-size:10px;">`;
  strategyHtml += `<div style="color:#f59e0b;font-weight:700;margin-bottom:4px;">⏱️ Wait-to-Pit:</div>`;
  strategyHtml += mkRow('If it starts raining', `${waitStartRain} laps`);
  strategyHtml += `<div style="font-size:9px;color:#9ca3af;padding-left:4px;margin-bottom:4px;">Rain risk ${startRain}% — ${startRain >= 60 ? 'react immediately' : startRain >= 30 ? 'brief confirmation wait' : 'wait to avoid false alarm'}</div>`;
  strategyHtml += mkRow('If it stops raining', `${waitStopRain} laps`);
  strategyHtml += `<div style="font-size:9px;color:#9ca3af;padding-left:4px;">Steepest drop: ${maxDrop}pp — ${maxDrop >= 30 ? 'dries fast' : maxDrop >= 15 ? 'moderate' : 'gradual, longer buffer'}</div>`;
  strategyHtml += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">Own heuristic — no exact formula for these fields.</div>`;
  strategyHtml += `</div>`;
  }

  // 7. Expandable details: Push-or-Hold signals + Tyre table + Cross-checks
  if (pushHold && pushHold.signals.length) {
  strategyHtml += `<details style="margin-top:8px;"><summary style="cursor:pointer;color:#60a5fa;font-size:10px;font-weight:700;">Push-or-Hold Signals</summary>`;
  pushHold.signals.forEach(s => { strategyHtml += mkRow(`${s.met ? '✅' : '❌'} ${s.label}`, s.detail); });
  strategyHtml += `</details>`;
  }
  if (tyre && tyre.results) {
  strategyHtml += `<div style="margin-top:8px;" data-tyre-table>`;
  strategyHtml += mkTyreResultsTable(tyre.results);
  strategyHtml += `</div>`;
  strategyHtml += mkGappStopsCrossCheck(tyre) + mkTdStatusNote(staffTd);
  }
  if (tyre) strategyHtml += mkTyreSourceNote(tyre);
   if (fuel && fuel.fromDomFuelStart) {
   strategyHtml += `<div style="font-size:9px;color:#f59e0b;margin-top:4px;">Start fuel locked from Q2 — simple dry-race split. If rain changes compound mid-race, fuel/lap changes too.</div>`;
   }
   // Track evolution note (from Elite: Q2 ~0.6% faster from rubber)
   if (track && tyre && tyre.laps) {
   strategyHtml += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">Track evolves: rubber builds up, adding ~0.6% grip in Q2. Late boost laps benefit from this grip increase.</div>`;
   }
   // Weather severity indicator (from Elite weather analysis)
   if (weather) {
   let maxRainChance = 0;
   for (let i = 1; i <= 4; i++) {
   const high = parseInt(weather[`raceQ${i}RainPHigh`] || 0);
   if (high > maxRainChance) maxRainChance = high;
   }
   if (maxRainChance >= 70) {
   strategyHtml += `<div style="font-size:9px;color:#ef4444;font-weight:600;margin-top:4px;">🌧 HIGH RAIN RISK (${maxRainChance}%): Prepare for wet tyres. Rain strategy above is your primary plan.</div>`;
   } else if (maxRainChance >= 40) {
   strategyHtml += `<div style="font-size:9px;color:#f59e0b;margin-top:4px;">☁ MODERATE RAIN RISK (${maxRainChance}%): Monitor weather quarters. Keep dry strategy but be ready to pivot.</div>`;
   } else if (maxRainChance >= 20) {
   strategyHtml += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">☁ LOW RAIN RISK (${maxRainChance}%): Dry strategy likely, but watch for late showers.</div>`;
   }
   }
   strategyHtml += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">You set fuel amounts per stint on RaceSetup.asp — the game pits automatically when fuel runs low, weather forces a tyre change, or a mechanical issue occurs.</div>`;

  h += mkSection('Race Strategy', strategyHtml, 'gpro-sec-strategy');

  }

 // === DRIVER STRATEGY (RaceSetup.asp "Driver strategy" risk block) ===
 // Overtake/defend/start-approach/problem-pit-laps from our own RiskAdvisorService
 // (disclosed public heuristic - see calcDriverStrategyRecommendation for full rationale). Dry/wet
 // clear-track risk stay our own simple heuristic (out of that advisor's scope), reusing the CTR
 // already configured in Settings so what's submitted matches what the tyre/fuel calcs assumed.
 {
 const gappTrackForRisk = lookupGappTrack((practice||{}).trackName || (track||{}).trackName, 'trackData');
 const distanceKm = gappTrackForRisk ? gappTrackForRisk.values[8] : (parseFloat((track||{}).raceDistance) || 300);
 const raceWetForRisk = !!(analyze && analyze.commitRain);
 const rainAvgForRisk = analyze ? analyze.maxRain : 0;
 const driverRiskRec = calcDriverStrategyRecommendation(driver, ctr, track, raceWetForRisk, rainAvgForRisk, distanceKm);
 let drHtml = '';
 drHtml += mkRec(mkRaceEngineerNarrative(driverRiskRec, track, driver, raceWetForRisk), 'info');
 drHtml += mkRow('...when attempting to overtake', `${driverRiskRec.overtakeRisk}`);
 drHtml += mkRow('...when defending his position', `${driverRiskRec.defendRisk}`);
 drHtml += mkRow('...when the track is clear and dry', `${driverRiskRec.dryRisk}`);
 drHtml += mkRow('...when the track is clear and wet', `${driverRiskRec.wetRisk}`);
 drHtml += mkRow('...if the car is malfunctioning', `${driverRiskRec.malfunctionRisk}`);
 drHtml += mkRow('Start of race', driverRiskRec.startRiskLabel);
 drHtml += mkRow('Pit on solvable problem if >', `${driverRiskRec.problemPitLaps} laps remaining`);
 const strategyTip = calcStrategyTip(driverRiskRec.overtaking, raceWetForRisk, rainAvgForRisk);
 if (strategyTip) drHtml += `<div style="font-size:9px;color:#9ca3af;padding-left:4px;margin-top:2px;">💡 ${strategyTip}</div>`;
 const distanceTip = calcDistanceTip(distanceKm, driver && driver.stamina);
 if (distanceTip) drHtml += `<div style="font-size:9px;color:#9ca3af;padding-left:4px;margin-top:2px;">⏱️ ${distanceTip}</div>`;
 const ctrGainForRisk = calcCtrTimeGain(lookupSeasonTrack((practice||{}).trackName || (track||{}).trackName), ctr);
 if (ctrGainForRisk) {
 drHtml += mkRow(`Time gain from CTR ${ctr}`, `~${ctrGainForRisk.total}s (${ctrGainForRisk.perLap}s/lap)`);
 drHtml += `<div style="font-size:9px;color:#f59e0b;padding-left:4px;">Own linear-scaling estimate from GPRO Analyzer's CTR=100 season data - not a disclosed formula.</div>`;
 }
  drHtml += `<div style="font-size:9px;color:#9ca3af;padding-left:4px;">Track passing: ${driverRiskRec.overtaking}${driverRiskRec.longRace ? ' | long race - stamina factored in' : ''}</div>`;

  // Overtaking Decision Matrix (from Elite spreadsheet models)
  // reward/risk ratio → decision: >1.5 attack, >1.0 opportunities, >0.7 patient, else defend
  {
  const overtakingDifficulty = { 'Very Easy': 20, 'Easy': 35, 'Normal': 50, 'Hard': 65, 'Very Hard': 80 };
  const diffVal = overtakingDifficulty[driverRiskRec.overtaking] || 50;
  const rewardBase = 80 - (diffVal * 0.3);
  const riskBase = 30 + (diffVal * 0.3);
  const ratio = riskBase > 0 ? rewardBase / riskBase : 1.0;
  const decision = ratio > 1.5 ? 'Attack aggressively — high reward, manageable risk' : ratio > 1.0 ? 'Look for opportunities — reward outweighs risk' : ratio > 0.7 ? 'Be patient — wait for mistakes' : 'Focus on defense — risk outweighs reward';
  const decColor = ratio > 1.5 ? '#10b981' : ratio > 1.0 ? '#f59e0b' : ratio > 0.7 ? '#f59e0b' : '#ef4444';
  drHtml += `<div style="margin-top:6px;padding:4px 8px;background:#1e293b;border-radius:4px;font-size:10px;border-left:3px solid ${decColor};">`;
  drHtml += `<div style="color:${decColor};font-weight:700;">⚡ Overtake Decision: ${decision}</div>`;
  drHtml += `<div style="color:#9ca3af;font-size:9px;">Reward/Risk ratio: ${ratio.toFixed(2)} (reward: ${Math.round(rewardBase)}, risk: ${Math.round(riskBase)})</div>`;
  drHtml += `</div>`;
  }

  drHtml += `<div style="font-size:9px;color:#f59e0b;margin-top:4px;">Overtake/defend/start/problem-pit from our own disclosed risk heuristic (not a game formula, not GAPP). Dry/wet clear-track risk still our own simple CTR-based estimate.</div>`;

 // Historical cross-check (D.trackHistory/D.trackInsights - real GPRO Analyzer success-rate
 // data, was sitting completely unused via lookupTrackHistory/lookupTrackInsight until found
 // during a 2026-07-19 dead-code audit). Currently only covers Spa GP; gracefully absent
 // elsewhere. This is a plain historical cross-check, not a replacement for the risk dials
 // above - shown separately so the two don't get confused as the same claim.
 {
 const histTrackName = (practice||{}).trackName || (track||{}).trackName || '';
 const insight = lookupTrackInsight(histTrackName, league);
 if (insight) {
 let histHtml = '';
 histHtml += mkRow('Overtaking success rate', insight.overtakingRisk);
 histHtml += mkRow('Defending success rate', insight.defensiveRisk);
 histHtml += mkRow('Clear-track (dry) success rate', insight.clearTrackRisk);
 histHtml += mkRow('Malfunction-risk success rate', insight.malfunctionRisk);
 histHtml += mkRow('Most common strategy', `${insight.bestStopCount}-stop`);
 drHtml += `<details style="margin-top:6px;"><summary style="cursor:pointer;color:#60a5fa;font-size:10px;font-weight:700;">Historical cross-check (${league || 'Amateur'}, ${histTrackName})</summary>${histHtml}<div style="font-size:9px;color:#6b7280;margin-top:2px;">From GPRO Analyzer's crowd-sourced race history, not a live formula - a reference point, not a recommendation.</div></details>`;
 }
 }

  if (chosenTyreResult && tyre) {
  const boostTrackName = (practice||{}).trackName || (track||{}).trackName || '';
  const boostTrackProf = TRACK_PROFILES[boostTrackName] || {};
  const boostLapLength = gappTrackForRisk && tyre.laps ? gappTrackForRisk.values[8] / tyre.laps : null;
  const boost = calcBoostLapSuggestion(tyre.laps, chosenTyreResult.stops, driverRiskRec.overtaking, raceWetForRisk, rainAvgForRisk, boostTrackProf.fuel, boostLapLength);
  if (boost.laps.length) {
  drHtml += mkRow('Suggested boost laps', boost.laps.join(', '));
  drHtml += `<div style="font-size:9px;color:#9ca3af;padding-left:4px;">${boost.note}</div>`;
  }

  }
  h += mkSection('Driver Strategy', drHtml, 'gpro-sec-driver-strategy');
  }

 // === CAR SETUP TABLE ===
 // Q1 uses practice temp, Q2 uses raceQ1 temp (Q2 & race start share weather), Race uses avg
 let q1Temp = 25, q2Temp = 25;
 let raceWet = false;
 const rSegs = [];
 // Auto-detect Q1/Q2 wet state (DOM rain icon, falling back to race-start forecast rain%), kept
 // in sync on every load until the user manually overrides a dropdown at least once.
 const rsDomTemps = scrapeSessionTempsFromDOM();
 const rsAutoQ1Wet = rsDomTemps && rsDomTemps.q1Rain !== null ? rsDomTemps.q1Rain : !!(analyze && analyze.segs[0].rainMax >= 40);
 const rsAutoQ2Wet = rsDomTemps && rsDomTemps.q2Rain !== null ? rsDomTemps.q2Rain : !!(analyze && analyze.segs[0].rainMax >= 40);
 let q1Wet = resolveSessionWet('gpro_q1_wet', rsAutoQ1Wet);
 let q2Wet = resolveSessionWet('gpro_q2_wet', rsAutoQ2Wet);
 if (weather) {
 // GAPP's own reference implementation (calcs.py) scrapes the page's single-value "Practice/
 // Qualify 1" and "Qualify 2/Race start" temp boxes directly from the DOM (img[name=WeatherQ]/
 // [name=WeatherR]) - there's no API field for them, only the 4 race-forecast segments. Match
 // that exactly when the widget is on this page; otherwise fall back to approximating from
 // segment 1's low/high range.
 const domTemps = rsDomTemps;
 const pTL = parseFloat(weather.raceQ1TempLow) || 25;
 const pTH = parseFloat(weather.raceQ1TempHigh) || 25;
 q1Temp = (domTemps && domTemps.q1 !== null) ? domTemps.q1 : pTL;
 q2Temp = (domTemps && domTemps.q2 !== null) ? domTemps.q2 : pTH;
 // Race temperature: matches GAPP's rTemp exactly - average of all 8 low/high values across the
 // 4 real race-forecast segments (not q1Temp/q2Temp, which are the pre-race window, not the race).
 const t1L = pTL, t1H = pTH;
 const t2L = parseFloat(weather.raceQ2TempLow) || 25;
 const t2H = parseFloat(weather.raceQ2TempHigh) || 25;
 const t3L = parseFloat(weather.raceQ3TempLow) || 25;
 const t3H = parseFloat(weather.raceQ3TempHigh) || 25;
 const t4L = parseFloat(weather.raceQ4TempLow) || 25;
 const t4H = parseFloat(weather.raceQ4TempHigh) || 25;
 raceTemp = ((t1L + t1H) / 2 + (t2L + t2H) / 2 + (t3L + t3H) / 2 + (t4L + t4H) / 2) / 4;
 // Race wet setup flag: the race only gets ONE setup submitted before the start, so this must
 // reflect start-of-race conditions (segment 1), same as the tyre "commitRain" logic - not "rain
 // touches 40% at any point in the 2h race", which was flipping the whole setup to wet-weather
 // coefficients even for races that start dry and only risk rain in the final segment.
 for (let i = 1; i <= 4; i++) {
 rSegs.push(Math.max(parseInt(weather[`raceQ${i}RainPLow`] || 0), parseInt(weather[`raceQ${i}RainPHigh`] || 0)));
 }
 raceWet = rSegs[0] >= 40;
 } else if (track) {
 const t = parseFloat(track.trackTemp || track.temperature) || 25;
 q1Temp = q2Temp = raceTemp = t;
 }
 const setupTrackPower = trackPower || MONTREAL_POWER;
 const raceTrackName = (practice && practice.trackName) || (track && track.trackName) || '';
 let setup = calcCarSetupSmart(q1Temp, q2Temp, raceTemp, q1Wet, q2Wet, raceWet, setupTrackPower, raceTrackName, driver, car);
 // Shared column spec for mkSetupTableInner - used by both the initial render below and
 // updateRaceSetupInPlace's post-weather-change table rebuild further down.
 const raceSetupColumns = (curQ1Wet, curQ2Wet, curRaceWet) => [
 { key: 'Q1', label: `Q1 (${q1Temp.toFixed(0)}°C) <select id="gpro-q1-weather" style="font-size:9px;background:#1f2937;color:#f9fafb;border:1px solid #374151;border-radius:3px;"><option value="0"${!curQ1Wet ? ' selected' : ''}>☀️ Dry</option><option value="1"${curQ1Wet ? ' selected' : ''}>🌧️ Wet</option></select>` },
 { key: 'Q2', label: `Q2 (${q2Temp.toFixed(0)}°C) <select id="gpro-q2-weather" style="font-size:9px;background:#1f2937;color:#f9fafb;border:1px solid #374151;border-radius:3px;"><option value="0"${!curQ2Wet ? ' selected' : ''}>☀️ Dry</option><option value="1"${curQ2Wet ? ' selected' : ''}>🌧️ Wet</option></select>` },
 { key: 'Race', label: `Race (${raceTemp.toFixed(0)}°C ${curRaceWet ? '🌧️' : '☀️'})`, highlight: true },
 ];
 if (setup) {
 const ma = calcMarginOfAcceptance(driver);
 let setupHtml = `<div data-setup-table style="overflow-x:auto;">` + mkSetupTableInner(setup, raceSetupColumns(q1Wet, q2Wet, raceWet)) + `</div>`;
 if (ma !== null) {
 const maColor = ma <= 60 ? '#10b981' : ma <= 90 ? '#f59e0b' : '#ef4444';
 setupHtml += `<div style="margin-top:6px;font-size:10px;"><span style="color:#9ca3af;">Margin of Acceptance:</span> <span style="color:${maColor};font-weight:700;">${ma}</span> <span style="color:#6b7280;">(${ma <= 60 ? 'precise' : ma <= 90 ? 'moderate' : 'wide'} - smaller = better)</span></div>`;
 }
 // Elite wing split optimization: pilot satisfied with FW+RW sum; shift ±50 to find preference
 {
 const ws = calcWingSplitSuggestion(driver, setup && setup.Race);
 if (ws) {
 setupHtml += `<div style="margin-top:4px;font-size:9px;color:#6b7280;">Wing split: FW ${ws.currentFw} / RW ${ws.currentRw} (sum ${ws.sum}) — ${ws.note}</div>`;
 }
 }
 // Copy setup buttons
 const setupStr = `FW=${setup.Race['Front Wing']} RW=${setup.Race['Rear Wing']} E=${setup.Race['Engine']} B=${setup.Race['Brakes']} G=${setup.Race['Gearbox']} S=${setup.Race['Suspension']}`;
 setupHtml += `<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap;">`;
 setupHtml += `<button id="gpro-copy-race" style="background:#10b981;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;">📋 Copy Race Setup</button>`;
 setupHtml += `<button id="gpro-copy-q1" style="background:#3b82f6;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;">📋 Copy Q1</button>`;
 setupHtml += `<button id="gpro-copy-q2" style="background:#8b5cf6;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;">📋 Copy Q2</button>`;
 setupHtml += `</div>`;
 h += mkSection('Car Setup', setupHtml +
  `<span style="font-size:9px;color:#6b7280;">Track-adjusted (P=${trackPower}). 🌧️=Wet modifiers applied. Setup source: ${setup.source === 'gapp' ? 'driver+car-aware (per-track)' : 'temperature-only (legacy)'}.</span>` +
 wingSplitLabel(setup.Race) + mkHappyRangeLabel(driver), 'gpro-sec-setup');
 }

  // Car Parts Wear prediction lives on UpdateCar.asp only (where it drives real upgrade/downgrade
  // recommendations) - not needed here on RaceSetup.asp.

  // Race Weekend Checklist — quick pre-race "don't forget" summary
  {
  const checks = [];
  if (fuel && fuel.fromDomFuelStart) checks.push({ ok: true, text: `Start fuel: ${fuel.stint1Fuel}L (locked from Q2)` });
  else if (fuel) checks.push({ ok: false, text: `Enter start fuel in Q2: ~${fuel.fuelPerStint}L per stint` });
  if (chosenTyreResult) checks.push({ ok: true, text: `Tyre: ${chosenTyreResult.name} (${chosenTyreResult.stops} stop${chosenTyreResult.stops !== 1 ? 's' : ''})` });
  if (analyze && analyze.commitRain) checks.push({ ok: false, text: 'Rain expected — load Rain tyres' });
  if (car) {
  const wearParts = calcPartsWear(car, driver, ctr, (practice||{}).trackName || (track||{}).trackName);
  const failParts = wearParts.filter(p => p.willFail);
  if (failParts.length > 0) checks.push({ ok: false, text: `${failParts.length} part(s) will fail: ${failParts.map(p => p.name).join(', ')}` });
  }
  if (driver) {
  const conc = parseInt(driver.concentration) || 50;
  if (conc < 60) checks.push({ ok: false, text: `Low concentration (${conc}) — higher error risk` });
  }
  if (checks.length > 0) {
  let checkHtml = `<div style="display:flex;flex-wrap:wrap;gap:4px;">`;
  checks.forEach(c => {
  const color = c.ok ? '#10b981' : '#f59e0b';
  checkHtml += `<div style="padding:3px 8px;background:#1e293b;border-radius:4px;font-size:9px;border-left:2px solid ${color};"><span style="color:${c.ok ? '#10b981' : '#f59e0b'};">${c.ok ? '✅' : '⚠️'}</span> <span style="color:#d1d5db;">${c.text}</span></div>`;
  });
  checkHtml += `</div>`;
  h += `<div style="margin-bottom:8px;"><div style="font-size:10px;color:#60a5fa;font-weight:700;margin-bottom:4px;">🏁 Race Weekend Checklist</div>${checkHtml}</div>`;
  }
   }

  body(h);
 wireDecisionBoard();

 // Setup copy button handlers - getText reads `setup` live (not captured at wire-time), so a
 // weather-driven recalculation via updateRaceSetupInPlace (which reassigns `setup`) is reflected.
 const setupCopyText = (session) => {
 const values = setup[session];
 return values ? `FW=${values['Front Wing']} RW=${values['Rear Wing']} E=${values['Engine']} B=${values['Brakes']} G=${values['Gearbox']} S=${values['Suspension']}` : '';
 };
 setTimeout(() => {
 wireCopyButton(document.getElementById('gpro-copy-race'), () => setupCopyText('Race'), null, '#059669');
 wireCopyButton(document.getElementById('gpro-copy-q1'), () => setupCopyText('Q1'), null, '#059669');
 wireCopyButton(document.getElementById('gpro-copy-q2'), () => setupCopyText('Q2'), null, '#059669');
 // Weather dropdown handlers - recalculate setup in-place (no reload)
 const updateRaceSetupInPlace = () => {
 const q1w = document.getElementById('gpro-q1-weather');
 const q2w = document.getElementById('gpro-q2-weather');
 const newQ1Wet = q1w ? q1w.value === '1' : false;
 const newQ2Wet = q2w ? q2w.value === '1' : false;
 setSessionWetManual('gpro_q1_wet', newQ1Wet);
 setSessionWetManual('gpro_q2_wet', newQ2Wet);
 const newRaceWet = rSegs[0] >= 40;
 const newSetup = calcCarSetupSmart(q1Temp, q2Temp, raceTemp, newQ1Wet, newQ2Wet, newRaceWet, setupTrackPower, raceTrackName, driver, car);
 if (newSetup) {
 setup = newSetup; // keep the Copy buttons in sync with what's actually shown after a weather change
 const setupTable = document.querySelector('[data-setup-table]');
 if (setupTable) {
 setupTable.innerHTML = mkSetupTableInner(newSetup, raceSetupColumns(newQ1Wet, newQ2Wet, newRaceWet));
 // Re-attach event handlers to new dropdowns
 const newQ1w = document.getElementById('gpro-q1-weather');
 const newQ2w = document.getElementById('gpro-q2-weather');
 if (newQ1w) newQ1w.addEventListener('change', updateRaceSetupInPlace);
 if (newQ2w) newQ2w.addEventListener('change', updateRaceSetupInPlace);
 }
 }
 };
 const q1Weather = document.getElementById('gpro-q1-weather');
 const q2Weather = document.getElementById('gpro-q2-weather');
 if (q1Weather) q1Weather.addEventListener('change', updateRaceSetupInPlace);
 if (q2Weather) q2Weather.addEventListener('change', updateRaceSetupInPlace);
 }, 200);
 }



 // ============================================================
 // MULTI-RACE WEAR PLANNER
 // Projects car wear forward across the next N upcoming races using Per-track wear data.
 // Inspired by our multi-race wear projection tool ().
 // ============================================================
 function calcMultiRaceWearProjection(carData, driver, ctr, currentTrackName, numRaces) {
 if (!carData) return null;
 const races = numRaces || 4;
 const currentIdx = SEASON_RACE_LIST.findIndex(t => currentTrackName && currentTrackName.includes(t.name.split(' ')[0]));
 const upcoming = [];
 for (let i = currentIdx + 1; i < SEASON_RACE_LIST.length && upcoming.length < races; i++) {
 upcoming.push(SEASON_RACE_LIST[i]);
 }
 if (!upcoming.length) return null;

 const driverFactor = calcDriverWearFactor(driver);
 const projection = [];
 const runningWear = {};
 PART_NAMES.forEach((name, i) => { runningWear[name] = parseInt(carData[PART_WEAR_KEYS[i]]) || 0; });

 upcoming.forEach(race => {
 const trackName = race.name;
 const gappWear = lookupGappTrack(trackName, 'wearData');
 const levelFactors = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.gapp) ? GPRO_DATA.gapp.levelFactors : null;
 const raceLaps = race.laps || (TRACK_PROFILES[trackName] && TRACK_PROFILES[trackName].laps) || 60;
 const parts = PART_NAMES.map((name, i) => {
 const lvl = parseInt(carData[PART_LVL_KEYS[i]]) || 0;
 const startWear = runningWear[name];
 let raceWear;
 if (gappWear && levelFactors) {
 raceWear = gappWear.values[i] * Math.pow(levelFactors[Math.min(lvl, 9) - 1], ctr || 0) * driverFactor;
 } else {
 const wearIntensity = D.trackWearIntensity?.[trackName] || 1.0;
 const baseWear = (BASE_WEAR_PER_LAP[name] || 0.5) * wearIntensity;
  raceWear = baseWear * raceLaps;
  }
  // Wear acceleration: higher wear → faster degradation (non-linear)
  // wear > 70 → ×1.5, wear > 50 → ×1.2, else ×1.0
  const wearAccel = startWear > 70 ? 1.5 : startWear > 50 ? 1.2 : 1.0;
  const adjustedRaceWear = raceWear * wearAccel;
  const endWear = Math.min(100, startWear + adjustedRaceWear);
  runningWear[name] = endWear;
  return { name, startWear: Math.round(startWear), endWear: Math.round(endWear), raceWear: Math.round(adjustedRaceWear), willFail: endWear >= 100, atRisk: endWear >= 85, wearAccel };
 });
 const willFailCount = parts.filter(p => p.willFail).length;
 const atRiskCount = parts.filter(p => p.atRisk && !p.willFail).length;
 projection.push({ trackName, laps: raceLaps, parts, willFailCount, atRiskCount });
 });
 return projection;
 }

 // ============================================================
 // RENDER: UPDATE CAR
 // ============================================================
 function renderUpdateCar(car, trackData, driver, league) {
 const domData = parseUpdateCarDOM();
 // Now DOM-only for car data (no /UpdateCar API call - see init()'s updateCar branch): if the
 // page's own DOM parse found nothing AND there's no cached car object either, there's genuinely
 // no data to show - say so plainly instead of silently rendering an all-zero-parts analysis.
 const hasAnyCarData = (domData.parts && domData.parts.length > 0) || (car && PART_LVL_KEYS.some(k => car[k]));
 if (!hasAnyCarData) {
 body(mkRec('No car data found on this page yet. If this page just loaded, wait a moment and click Retry.', 'warn') +
 `<div style="margin-top:8px;"><button id="gpro-retry" style="background:#374151;color:#d1d5db;border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;">Retry</button></div>`);
 setTimeout(() => { document.getElementById('gpro-retry')?.addEventListener('click', () => location.reload()); }, 100);
 return;
 }
 logDebug('API car levels:', PART_LVL_KEYS.map(k => `${k}=${car?.[k] ?? 'null'}`).join(', '));
 logDebug('API car wear:', PART_WEAR_KEYS.map(k => `${k}=${car?.[k] ?? 'null'}`).join(', '));
 logDebug('API car cash:', car?.cash ?? 'null', '| DOM cash:', domData.cash);
 logDebug('DOM parts:', domData.parts.map(p => `${p.name}: lvl=${p.currentLevel} wear=${p.currentWear}`).join(' | '));
 // Real bug fixed 2026-07-31: this only overwrote the cached/API cash figure when the fresh
 // DOM reading was GREATER than what was already cached - a heuristic meant to avoid clobbering
 // a real value with a failed-parse zero, but cash is a live balance that legitimately goes DOWN
 // whenever the user spends money. Once any purchase happened, domData.cash (fresh, lower, TRUE)
 // could never pass `> apiCash` (stale, higher, from before the purchase) - so the panel got
 // permanently stuck showing the old higher balance, persisting it back into the cache on every
 // subsequent visit (reported: panel showed $9,794,534 while the account was actually down to
 // $7,382,670). We're live on UpdateCar.asp right now, so a valid DOM reading is always the most
 // authoritative source available - it should simply win, not just when it happens to be bigger.
 if (domData.cash > 100 && car) car.cash = domData.cash;

 // Merge DOM-parsed levels/wear with API data (DOM is authoritative)
 if (car && domData.parts && domData.parts.length > 0) {
 domData.parts.forEach(dp => {
 const idx = PART_NAMES.indexOf(dp.name);
 if (idx >= 0) {
 // Use DOM level if API returned 0 or missing
 const apiLvl = parseInt(car[PART_LVL_KEYS[idx]]) || 0;
 if (dp.currentLevel > 0 && (apiLvl === 0 || apiLvl === undefined)) {
 car[PART_LVL_KEYS[idx]] = dp.currentLevel;
 } else if (dp.currentLevel > 0) {
 car[PART_LVL_KEYS[idx]] = dp.currentLevel; // DOM is authoritative
 }
 // Use DOM wear if API returned 0 or missing
 const apiWear = parseInt(car[PART_WEAR_KEYS[idx]]) || 0;
 if (dp.currentWear > 0 && (apiWear === 0 || apiWear === undefined)) {
 car[PART_WEAR_KEYS[idx]] = dp.currentWear;
 } else if (dp.currentWear > 0) {
 car[PART_WEAR_KEYS[idx]] = dp.currentWear; // DOM is authoritative
 }
 }
 });
 // Also merge car character from DOM
 if (domData.carPower) car.carPower = domData.carPower;
 if (domData.carHandling) car.carHandl = domData.carHandling;
 if (domData.carAcceleration) car.carAccel = domData.carAcceleration;
 }

 // Cache car data for use on Q1/Race pages (API may not return levels/wear)
 if (car) {
 const cachedCar = {};
 PART_LVL_KEYS.forEach((k, i) => { cachedCar[k] = car[k] || 0; });
 PART_WEAR_KEYS.forEach((k, i) => { cachedCar[k] = car[k] || 0; });
 cachedCar.carPower = car.carPower || 0;
 cachedCar.carHandl = car.carHandl || 0;
 cachedCar.carAccel = car.carAccel || 0;
 cachedCar.cash = car.cash || 0;
 try { GM_setValue('gpro_cached_car', JSON.stringify(cachedCar)); } catch(e) {}
 // Real bug: this GM key (read by getCachedCarData()/mergeWithCachedCarData()) was the ONLY
 // place car data ever got cached - nothing ever wrote to the generic '/UpdateCar' stale slot
 // that getDataDomOnly('/UpdateCar') and the Home dashboard's freshness table read. So "Car Data"
 // showed Missing forever no matter how many times UpdateCar.asp/Qualify.asp were visited. Write
 // both so the two systems agree.
 setStaleData('/UpdateCar', cachedCar);
 }

 const ctrUpdateCar = getCtr();
 const analysis = analyzeCar(car, domData, trackData, driver, ctrUpdateCar, league);
 if (!analysis) { body(mkRec('No car data available', 'warn')); return; }

 let h = '';

 // Cash
 h += mkSection(`Cash (${analysis.league} league targets)`,
 mkRow('Available', `$${analysis.cash.toLocaleString()}`) +
 mkRow('After Recommendations', `$${analysis.projectedCash.toLocaleString()}`) +
 (analysis.leagueNotes ? `<div style="font-size:9px;color:#6b7280;margin-top:4px;">${analysis.leagueNotes}</div>` : '')
 );

 // Parts overview table with wear predictions
 if (trackData) {
 const trackName = trackData.name || trackData.trackName || 'Next Race';
 const stData = lookupSeasonTrack(trackName);
 const wearCtx = stData ? `, ${analysis.trackWear} wear (${stData.wearIntensity}x intensity)` : `, ${analysis.trackWear} wear`;
 const tempCtx = stData ? ` | Avg temp: ${stData.avgTemp}C` : '';
 const ctrCtx = stData ? ` | CTR: +${stData.ctrGain}s/lap` : '';
 const hasCrossCheck = analysis.parts.some(p => p.gappRaceWear !== null);
 // One-line severity headline, matching our WearAdvisorService::headline()
 // concept () - a plain-language summary before the per-part table, not a
 // new wear calculation (uses the willFail/atRisk flags already computed above).
 const willFailCount = analysis.parts.filter(p => p.willFail).length;
 const atRiskCount = analysis.parts.filter(p => p.atRisk && !p.willFail).length;
 const headline = willFailCount > 0
 ? `${willFailCount} part${willFailCount === 1 ? '' : 's'} will not survive the race - ${willFailCount === 1 ? 'swap it' : 'swap them'}.`
 : atRiskCount > 0
 ? 'No mandatory swaps, but some parts will finish in the red.'
 : 'All parts will finish comfortably.';
 const headlineTone = willFailCount > 0 ? 'bad' : atRiskCount > 0 ? 'warn' : 'good';
 let tblPrefix = mkRec(headline, headlineTone);
 let tbl = `<table style="width:100%;border-collapse:collapse;font-size:9px;">`;
 tbl += `<tr style="color:#60a5fa;font-weight:700;"><td style="padding:2px 4px;">Part</td><td>Lvl</td><td>Now</td><td>End</td><td title="Performance loss (seconds/lap at current wear)">Perf</td><td title="Failure risk at current wear">Risk</td>${hasCrossCheck ? '<td title="own calibration cross-check end wear">End (own)</td>' : ''}<td>Target</td><td>Status</td></tr>`;
 analysis.parts.forEach(p => {
 const endColor = p.endWear >= 100 ? '#ef4444' : p.endWear >= 85 ? '#f59e0b' : '#10b981';
 const status = p.willFail ? 'FAIL' : p.atRisk ? 'risk' : 'ok';
 const statusColor = p.willFail ? '#ef4444' : p.atRisk ? '#f59e0b' : '#6b7280';
 const wearBar = `<span style="display:inline-block;width:30px;height:4px;background:#374151;border-radius:2px;overflow:hidden;vertical-align:middle;"><span style="display:block;height:100%;width:${Math.min(100, p.wear)}%;background:${p.remaining <= 30 ? '#ef4444' : '#10b981'};"></span></span>`;
 const ownEnd = p.gappRaceWear !== null ? Math.min(100, p.wear + p.ownTotalRaceWear) : null;
 // Performance loss (non-linear) and failure risk (exponential) from elite models
 const perfLoss = p.perfLoss !== undefined ? p.perfLoss : 0;
 const failRisk = p.failRisk !== undefined ? p.failRisk : 0;
 const perfColor = perfLoss >= 30 ? '#ef4444' : perfLoss >= 10 ? '#f59e0b' : '#6b7280';
 const riskColor = failRisk >= 40 ? '#ef4444' : failRisk >= 15 ? '#f59e0b' : '#6b7280';
 tbl += `<tr style="color:#d1d5db;"><td style="padding:2px 4px;">${p.name}</td><td>L${p.lvl}</td><td>${wearBar} ${p.remaining}%</td><td style="color:${endColor};font-weight:${p.willFail ? 700 : 400};">${Math.round(p.endWear)}%</td><td style="color:${perfColor};font-size:8px;">${perfLoss > 0 ? `+${perfLoss.toFixed(1)}s` : '-'}</td><td style="color:${riskColor};font-size:8px;">${failRisk > 0 ? `${failRisk}%` : '-'}</td>${hasCrossCheck ? `<td style="color:#9ca3af;">${ownEnd !== null ? Math.round(ownEnd) + '%' : '-'}</td>` : ''}<td>L${p.target}</td><td style="color:${statusColor};font-weight:${status === 'FAIL' ? 700 : 400};">${status}</td></tr>`;
 });
 tbl += `</table>`;
 h += mkSection(`${trackName} (${analysis.laps} laps${wearCtx}${tempCtx}${ctrCtx})`, tblPrefix + tbl +
 `<div style="font-size:8px;color:#6b7280;margin-top:3px;">End wear = current + estimated wear over ${analysis.laps} laps. FAIL = will break mid-race. Only one upgrade per race.${hasCrossCheck ? ' "End" uses gapp (track-specific); "(own)" is our calibration cross-check.' : ''}</div>`);
 } else {
 // No track data — show parts without predictions
 let tbl = `<table style="width:100%;border-collapse:collapse;font-size:9px;">`;
 tbl += `<tr style="color:#60a5fa;font-weight:700;"><td style="padding:2px 4px;">Part</td><td>Lvl</td><td>Wear</td><td>Target</td></tr>`;
 analysis.parts.forEach(p => {
 tbl += `<tr style="color:#d1d5db;"><td style="padding:2px 4px;">${p.name}</td><td>L${p.lvl}</td><td>${p.remaining}%</td><td>L${p.target}</td></tr>`;
 });
 tbl += `</table>`;
 h += mkSection('Parts Overview', tbl);
 }

 // Recommendations
 if (analysis.recs.length > 0) {
 let recsHtml = '';
 analysis.recs.forEach(r => {
 const rc = r.color === '#ef4444' ? 'bad' : r.color === '#f59e0b' ? 'warn' : 'info';
 let text = `<strong>${r.part.name}</strong> (L${r.part.lvl}, ${r.part.remaining}%): ${r.verdict}`;
 if (r.verdict === 'FAIL') {
 text += `<br><span style="font-size:10px;color:#ef4444;font-weight:700;">${r.detail}</span>`;
 } else if (r.verdict === 'CRITICAL') {
 text += `<br><span style="font-size:10px;color:#ef4444;">${r.detail}</span>`;
 } else if (r.verdict === 'UPGRADE' || r.verdict === 'REPLACE') {
 text += `<br><span style="font-size:10px;">${r.detail}</span>`;
 text += `<br><span style="font-size:10px;color:#6b7280;">Cash after: $${r.remainingCash.toLocaleString()}</span>`;
 if (r.phaAlignment) text += `<br><span style="font-size:10px;color:#60a5fa;">🎯 ${r.phaAlignment}</span>`;
 } else if (r.verdict === 'DOWNGRADE') {
 text += `<br><span style="font-size:10px;color:#f59e0b;">${r.detail}</span>`;
 text += `<br><span style="font-size:10px;color:#6b7280;">⚠ Loses performance — free option to survive race</span>`;
 } else if (r.verdict === 'WAIT') {
 text += `<br><span style="font-size:10px;color:#f59e0b;">${r.detail}</span>`;
 } else if (r.verdict === 'SAVE') {
 text += `<br><span style="font-size:10px;color:#8b5cf6;">${r.detail}</span>`;
 } else {
 text += `<br><span style="font-size:10px;color:#6b7280;">${r.detail}</span>`;
 }
 recsHtml += mkRec(text, rc);
 });
 h += mkSection('Recommendations', recsHtml);
 // Summary of parts not needing action
 const okParts = analysis.parts.filter(p => !analysis.recs.find(r => r.part.name === p.name));
 if (okParts.length > 0) {
 h += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">${okParts.length} parts OK (no action needed): ${okParts.map(p => p.name).join(', ')}</div>`;
 }
 h += `<div style="font-size:9px;color:#6b7280;margin-top:2px;">Wear projections: ${lookupGappTrack(trackData ? (trackData.name || trackData.trackName || '') : '', 'wearData') ? 'track-specific (per-track)' : 'generic (own Montreal-calibrated fallback)'}${driver ? '' : ' (driver data unavailable, using default wear-reduction factor)'}</div>`;
 }

 // PHA contribution reference table (our Cockpit README, ,
 // flags this as a useful one-click reference). D.phaContrib was GAPP-verified
 // (internal formulas data.py profileFactors, checked 2026-07-17) but never actually
 // rendered anywhere until now - found sitting unused while researching the testing-decay TODO.
 if (D.phaContrib) {
 let phaTbl = `<table style="width:100%;border-collapse:collapse;font-size:9px;">`;
 phaTbl += `<tr style="color:#60a5fa;font-weight:700;"><td style="padding:2px 4px;">Part</td><td>Power</td><td>Handling</td><td>Accel</td></tr>`;
 PART_NAMES.forEach(name => {
 const c = D.phaContrib[name];
 if (!c) return;
 phaTbl += `<tr style="color:#d1d5db;"><td style="padding:2px 4px;">${name}</td><td style="text-align:center;color:#ef4444;">${c.power}</td><td style="text-align:center;color:#3b82f6;">${c.handling}</td><td style="text-align:center;color:#f59e0b;">${c.accel}</td></tr>`;
 });
 phaTbl += `</table>`;
 h += `<details style="margin-top:8px;"><summary style="cursor:pointer;color:#60a5fa;font-size:11px;font-weight:700;padding:4px 0;">PHA Contribution per Level (reference)</summary>${phaTbl}<div style="font-size:8px;color:#6b7280;margin-top:3px;">How much Power/Handling/Acceleration each part gains per level upgraded. Verified.</div></details>`;
 }

  // === MULTI-RACE WEAR PLANNER ===
 // Projects car wear forward across the next 4 upcoming races, inspired by our
 // multi-race wear projection (). Uses Per-track wear data when
 // available, falls back to own calibration. Each race chains from the previous one's end wear.
 const currentTrackName = trackData ? (trackData.name || trackData.trackName) : '';
 const projection = calcMultiRaceWearProjection(car, driver, ctrUpdateCar, currentTrackName, 4);
 if (projection && projection.length) {
 let mpTbl = `<table style="width:100%;border-collapse:collapse;font-size:9px;">`;
 mpTbl += `<tr style="color:#60a5fa;font-weight:700;"><td style="padding:2px 4px;">Part</td>`;
 projection.forEach(p => { mpTbl += `<td style="text-align:center;">${p.trackName.split(' ')[0]}<br><span style="font-size:8px;color:#6b7280;">${p.laps}L</span></td>`; });
 mpTbl += `</tr>`;
 PART_NAMES.forEach(name => {
 mpTbl += `<tr style="color:#d1d5db;"><td style="padding:2px 4px;">${name}</td>`;
 projection.forEach(p => {
 const pp = p.parts.find(x => x.name === name);
 if (!pp) { mpTbl += `<td style="text-align:center;">-</td>`; return; }
 const color = pp.willFail ? '#ef4444' : pp.atRisk ? '#f59e0b' : '#10b981';
 // Wear acceleration indicator: show if degradation is accelerating non-linearly
 const accelIcon = pp.wearAccel > 1.2 ? ' 🔥' : pp.wearAccel > 1.0 ? ' ⚡' : '';
 mpTbl += `<td style="text-align:center;color:${color};font-weight:${pp.willFail ? 700 : 400};">${pp.startWear}%→${pp.endWear}%${pp.willFail ? ' ❌' : pp.atRisk ? ' ⚠' : ''}${accelIcon}</td>`;
 });
 mpTbl += `</tr>`;
 });
 mpTbl += `</table>`;
 const anyFail = projection.some(p => p.willFailCount > 0);
 const anyRisk = projection.some(p => p.atRiskCount > 0);
 const tone = anyFail ? 'bad' : anyRisk ? 'warn' : 'good';
 const headline = anyFail
 ? `${projection.filter(p => p.willFailCount > 0).map(p => p.trackName.split(' ')[0]).join(', ')}: parts will fail`
 : anyRisk ? 'Parts finish in the red at some tracks' : 'All parts survive the next ' + projection.length + ' races comfortably';
 h += mkSection('Multi-Race Wear Projection (next ' + projection.length + ')', mkRec(headline, tone) + mpTbl +
 `<div style="font-size:8px;color:#6b7280;margin-top:3px;">Track-specific wear data when available; own calibration fallback otherwise. Chains forward from current wear. ❌ = fails mid-race, ⚠ = ends above 85%. 🔥 = high wear acceleration (>70%), ⚡ = moderate acceleration (>50%).</div>`);
 }

 // Track type wear classification (from Elite spreadsheet models)
 // Street circuits: high braking/suspension stress (×1.3-1.5)
 // Speedways: high engine stress, less braking (×1.4 engine, ×0.7 brakes)
 // Road courses: baseline wear rates
 if (trackData && (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.trackTypeWear)) {
 const trackType = trackData.type || 'road';
 const typeData = GPRO_DATA.trackTypeWear[trackType];
 if (trackType !== 'road' && typeData && typeData.note) {
 h += mkSection('Track Type Wear Note', `<div style="font-size:9px;color:#f59e0b;padding:4px 8px;background:#1e293b;border-radius:4px;border-left:3px solid #f59e0b;">${typeData.note}. Prioritize the affected parts above.</div>`);
  }
  }

  // Real Race Wear Data (from scraped gproanalyzer.info Season 111)
  // Shows actual per-part wear from your last 10 races for calibration reference
  if (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.scrapedRaceData && GPRO_DATA.scrapedRaceData.races) {
  const races = GPRO_DATA.scrapedRaceData.races.slice(-5); // Last 5 races
  let wearHtml = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:8px;">';
  wearHtml += '<tr style="color:#60a5fa;font-weight:700;"><td style="padding:2px;">Race</td><td style="text-align:center;">FW</td><td style="text-align:center;">RW</td><td style="text-align:center;">UB</td><td style="text-align:center;">GB</td><td style="text-align:center;">Brk</td><td style="text-align:center;">Susp</td></tr>';
  races.forEach(r => {
   wearHtml += `<tr><td style="padding:2px;color:#d1d5db;">R${r.race} ${r.track.split(' ')[0]}</td><td style="text-align:center;color:#9ca3af;">${r.setup.fw}</td><td style="text-align:center;color:#9ca3af;">${r.setup.rw}</td><td style="text-align:center;color:#9ca3af;">${r.setup.ub || '?'}</td><td style="text-align:center;color:#9ca3af;">${r.setup.gb || '?'}</td><td style="text-align:center;color:#9ca3af;">${r.setup.brakes || '?'}</td><td style="text-align:center;color:#9ca3af;">${r.setup.susp || '?'}</td></tr>`;
  });
  wearHtml += '</table></div>';
  h += mkSection('Recent Race Setups (Reference)', wearHtml + `<span style="font-size:8px;color:#6b7280;">Actual setups used in your last 5 races (scraped from gproanalyzer.info). Use as calibration reference for future races.</span>`);
  }

  // Upgrade Timing Intelligence (from Elite: optimize when to spend cash)
 // Cross-references upcoming tracks' wear data with current part wear to recommend timing
 if (projection && projection.length > 0 && analysis.recs.length > 0) {
 const upgradeRecs = analysis.recs.filter(r => r.verdict === 'UPGRADE' || r.verdict === 'SAVE');
  if (upgradeRecs.length > 0) {
  const highWearUpcoming = projection.some(p => p.willFailCount > 0 || p.atRiskCount > 0);
  const timingNotes = [];
  upgradeRecs.forEach(r => {
  const partProj = projection.map(p => { const part = p.parts.find(x => x.name === r.part.name); return part ? { ...part, trackName: p.trackName } : null; }).filter(Boolean);
 const nextFail = partProj.find(pp => pp.willFail);
 const nextRisk = partProj.find(pp => pp.atRisk);
 if (nextFail) {
 timingNotes.push(`<span style="color:#ef4444;font-weight:600;">${r.part.name}</span>: UPGRADE NOW — will fail at ${nextFail.trackName.split(' ')[0]} (Race #${projection.indexOf(nextFail) + 1})`);
 } else if (nextRisk && r.verdict === 'SAVE') {
 timingNotes.push(`<span style="color:#f59e0b;">${r.part.name}</span>: Save cash now, upgrade before ${nextRisk.trackName.split(' ')[0]} (Race #${projection.indexOf(nextRisk) + 1}) — ends at risk`);
 } else if (r.verdict === 'SAVE' && !highWearUpcoming) {
 timingNotes.push(`<span style="color:#10b981;">${r.part.name}</span>: No rush — parts survive next ${projection.length} races. Save for higher-impact upgrade.`);
 }
 });
 if (timingNotes.length > 0) {
 h += mkSection('Upgrade Timing', `<div style="font-size:9px;color:#d1d5db;">${timingNotes.map(n => `<div style="margin:2px 0;padding:2px 4px;">• ${n}</div>`).join('')}</div>`);
 }
 }
  }

  // Car PHA display (power/handling/acceleration from part levels)
  if (car) {
  const carPower = parseInt(car.carPower) || 0;
  const carHandl = parseInt(car.carHandl) || 0;
  const carAccel = parseInt(car.carAccel) || 0;
  const phaHtml = `<div style="display:flex;gap:12px;flex-wrap:wrap;">
   <div style="flex:1;min-width:80px;text-align:center;padding:6px;background:#1e293b;border-radius:6px;">
   <div style="font-size:9px;color:#6b7280;">Power</div>
   <div style="font-size:16px;font-weight:700;color:#ef4444;">${carPower}</div></div>
   <div style="flex:1;min-width:80px;text-align:center;padding:6px;background:#1e293b;border-radius:6px;">
   <div style="font-size:9px;color:#6b7280;">Handling</div>
   <div style="font-size:16px;font-weight:700;color:#3b82f6;">${carHandl}</div></div>
   <div style="flex:1;min-width:80px;text-align:center;padding:6px;background:#1e293b;border-radius:6px;">
   <div style="font-size:9px;color:#6b7280;">Acceleration</div>
   <div style="font-size:16px;font-weight:700;color:#10b981;">${carAccel}</div></div></div>`;
  h += mkSection('Car PHA', phaHtml + `<span style="font-size:9px;color:#6b7280;">Power=Chassis+Engine+FW+RW, Handling=UB+Sidepods+Cooling+GB, Accel=Brakes+Susp+Elec. Track-match matters for setup.</span>`);
  }

  // Upcoming Track PHA Requirements (from scraped seasonPHA data)
  if (car && typeof GPRO_DATA !== 'undefined' && GPRO_DATA.seasonPHA) {
  const carPower = parseInt(car.carPower) || 0;
  const carHandl = parseInt(car.carHandl) || 0;
  const carAccel = parseInt(car.carAccel) || 0;
  let phaHtml = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:9px;">';
  phaHtml += '<tr style="color:#60a5fa;font-weight:700;"><td style="padding:2px;">Track</td><td style="text-align:center;">Need P</td><td style="text-align:center;">Need H</td><td style="text-align:center;">Need A</td><td style="text-align:center;">Your P</td><td style="text-align:center;">Your H</td><td style="text-align:center;">Your A</td><td style="text-align:center;">Best Match</td></tr>';
  GPRO_DATA.seasonPHA.slice(0, 5).forEach(t => {
   const match = carPower >= t.power && carHandl >= t.handling && carAccel >= t.accel;
   const best = carPower >= carHandl && carPower >= carAccel ? 'Power' : carHandl >= carAccel ? 'Handling' : 'Acceleration';
   const trackBest = t.power >= t.handling && t.power >= t.accel ? 'Power' : t.handling >= t.accel ? 'Handling' : 'Acceleration';
   phaHtml += `<tr style="${match ? 'background:rgba(16,185,129,0.08);' : ''}"><td style="padding:2px;color:#d1d5db;">R${t.race} ${t.track}</td><td style="text-align:center;color:${carPower >= t.power ? '#10b981' : '#ef4444'};">${t.power}</td><td style="text-align:center;color:${carHandl >= t.handling ? '#10b981' : '#ef4444'};">${t.handling}</td><td style="text-align:center;color:${carAccel >= t.accel ? '#10b981' : '#ef4444'};">${t.accel}</td><td style="text-align:center;color:#9ca3af;">${carPower}</td><td style="text-align:center;color:#9ca3af;">${carHandl}</td><td style="text-align:center;color:#9ca3af;">${carAccel}</td><td style="text-align:center;color:#60a5fa;font-size:8px;">${trackBest}</td></tr>`;
  });
  phaHtml += '</table></div>';
  h += mkSection('Upcoming Track PHA Requirements', phaHtml + `<span style="font-size:9px;color:#6b7280;">Green = your car meets the track requirement. Red = deficit. Consider upgrading parts that feed the track's dominant attribute.</span>`);
  }

  // Happy Range display (driver's acceptable wear range)
  if (driver) {
  const hr = calcHappyRange(driver);
  if (hr) {
  const hrHtml = `<div style="display:flex;gap:4px;flex-wrap:wrap;">
   ${Object.entries(hr).map(([part, range]) => `<div style="padding:3px 6px;background:#1e293b;border-radius:4px;font-size:9px;"><span style="color:#9ca3af;">${part}:</span> <span style="color:${range > 100 ? '#ef4444' : '#10b981'};">±${range}</span></div>`).join('')}
   </div>`;
  h += mkSection('Driver Happy Range', hrHtml + `<span style="font-size:9px;color:#6b7280;">Parts within ±${hr['Front Wing'] || '?'} of ideal are "happy" — driver notices smaller changes. Based on Exp=${driver.experience || '?'} + TechInsight=${driver.techInsight || '?'}. Keep parts in this range.</span>`);
  }
  }

  // Test Points preview for next race
  if (trackData && car) {
  const trackName = trackData.trackName || trackData.name || '';
  const tp = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.calculatorFormulas) ? GPRO_DATA.calculatorFormulas.testPointsPerLap : null;
  if (tp) {
  const raceLaps = parseInt(trackData.laps) || 60;
  const parts = ['Chassis','Engine','Front Wing','Rear Wing','Underbody','Sidepods','Cooling','Gearbox','Brakes','Suspension','Electronics'];
  const tpKeys = ['chassis','engine','fw','rw','ub','sidepods','cooling','gb','brakes','susp','elec'];
  let tpHtml = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:9px;">';
  tpHtml += '<tr style="color:#60a5fa;font-weight:700;"><td style="padding:2px;">Part</td><td style="text-align:center;">Lvl</td><td style="text-align:center;">Pts/Lap</td><td style="text-align:center;">Total</td></tr>';
  let totalPts = 0;
  parts.forEach((part, i) => {
   const lvl = parseInt(car[PART_LVL_KEYS[i]]) || 0;
   const ptsPerLap = tp[tpKeys[i]] || 0;
   const total = +(ptsPerLap * raceLaps).toFixed(1);
   totalPts += total;
   tpHtml += `<tr><td style="padding:2px;color:#d1d5db;">${part}</td><td style="text-align:center;color:#9ca3af;">L${lvl}</td><td style="text-align:center;color:#9ca3af;">${ptsPerLap}</td><td style="text-align:center;color:#60a5fa;font-weight:600;">${total}</td></tr>`;
  });
  tpHtml += `<tr style="border-top:1px solid #374151;"><td style="padding:2px;color:#f9fafb;font-weight:600;">Total</td><td></td><td></td><td style="text-align:center;color:#60a5fa;font-weight:700;">${totalPts.toFixed(1)}</td></tr>`;
  tpHtml += '</table></div>';
  h += mkSection(`Test Points Preview (${raceLaps} laps)`, tpHtml + `<span style="font-size:9px;color:#6b7280;">Estimated test points from this race (${trackName}). Points scale linearly with laps. Higher-level parts gain more per lap.</span>`);
  }
  }

  // Upgrade Cost breakdown (from gproanalyzer.info/carcosts.php)
  if (analysis && analysis.recs.length > 0) {
  const upgradeParts = analysis.recs.filter(r => r.verdict === 'UPGRADE' && r.cost > 0);
  if (upgradeParts.length > 0) {
  let costHtml = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:9px;">';
  costHtml += '<tr style="color:#60a5fa;font-weight:700;"><td style="padding:2px;">Part</td><td style="text-align:center;">Level</td><td style="text-align:center;">Cost</td><td style="text-align:center;">% of Cash</td></tr>';
  let totalCost = 0;
  const cash = car ? (parseInt(car.cash) || 0) : 0;
  upgradeParts.forEach(r => {
   const cost = r.cost || 0;
   totalCost += cost;
   const pct = cash > 0 ? ((cost / cash) * 100).toFixed(1) : '?';
   const lvl = parseInt(r.part && r.part.lvl) || 0;
   costHtml += `<tr><td style="padding:2px;color:#d1d5db;">${r.part.name}</td><td style="text-align:center;color:#9ca3af;">L${lvl}→L${lvl+1}</td><td style="text-align:center;color:#f59e0b;font-weight:600;">$${(cost/1e6).toFixed(2)}M</td><td style="text-align:center;color:#ef4444;">${pct}%</td></tr>`;
  });
  costHtml += `<tr style="border-top:1px solid #374151;"><td style="padding:2px;color:#f9fafb;font-weight:600;">Total</td><td></td><td style="text-align:center;color:#f59e0b;font-weight:700;">$${(totalCost/1e6).toFixed(2)}M</td><td style="text-align:center;color:${cash > totalCost ? '#10b981' : '#ef4444'};">${cash > totalCost ? 'Affordable' : 'Over budget'}</td></tr>`;
  costHtml += '</table></div>';
  h += mkSection('Upgrade Cost Breakdown', costHtml);
  }
  }

  // Note
  h += mkSection('Rules', mkRec('One car update per race. Debt = relegation. Recommendations never cross $0.', 'info'));

   body(h);
  }

 // ============================================================
 // TOKEN MODAL
 // ============================================================
  function showTokenModal() {
  const old = document.getElementById('gpro-token-modal');
  if (old) old.remove();
  const d = document.createElement('div');
  d.id = 'gpro-token-modal';
  d.setAttribute('style', 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:999999;display:flex;justify-content:center;align-items:center;font-family:system-ui,-apple-system,sans-serif;');
   d.innerHTML = `<div style="background:#111827;border-radius:12px;padding:24px;width:440px;max-width:92%;box-shadow:0 8px 32px rgba(0,0,0,0.6);color:#e5e7eb;">
  <h2 style="color:#60a5fa;margin:0 0 8px;font-size:18px;font-weight:700;">GPRO Strategy Tool</h2>
  <p style="color:#9ca3af;font-size:12px;margin:4px 0 12px;">All recommendations are computed from live DOM data — no API token required. CTR (clear track risk) is auto-detected from the Race page when set.</p>
  <label style="display:block;color:#9ca3af;font-size:12px;margin:10px 0 4px;">Driver offer aggressiveness:</label>
  <select id="gpro-bid-strategy" style="width:100%;background:#1f2937;color:#e5e7eb;border:1px solid #374151;border-radius:6px;padding:8px;font-size:13px;">
  <option value="value">Value — lowball ~50% of his ask (risks losing the driver)</option>
  <option value="balanced" selected>Balanced — fair, budget-friendly (~100–125%)</option>
  <option value="aggressive">Aggressive — ~200% of his ask (must-win)</option>
  </select>
  <div style="display:flex;gap:8px;margin-top:14px;">
  <button id="gpro-token-ok" style="background:#2563eb;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">OK</button>
  </div>
  </div>`;
  document.body.appendChild(d);
  try { document.getElementById('gpro-bid-strategy').value = GM_getValue('gpro_bid_strategy', 'balanced'); } catch (e) {}
  document.getElementById('gpro-bid-strategy').onchange = () => { try { GM_setValue('gpro_bid_strategy', document.getElementById('gpro-bid-strategy').value); } catch (e) {} };
  document.getElementById('gpro-token-ok').onclick = () => d.remove();
  }

 // ============================================================
 // RENDER: HOMEPAGE (gpro.asp) - DATA STATUS DASHBOARD
 // ============================================================
 // Fetches all API endpoints and shows a live data status overview
 // with an "Update All" button for a single-click refresh.
 async function renderHome(forceBackground) {
 body(`<div style="${ST.loading}">Fetching all data...</div>`);

 // volatility: 'session' = genuinely time-sensitive (weather forecasts drift day to day, testing
 // stints happen repeatedly) - age-based "Stale" still means something real here.
 // 'event' = only ever changes when a specific in-game action happens (driver/staff training,
 // facility upgrade, car part purchase, signing a new driver/TD/supplier, wear accumulating over
 // a completed race) - elapsed time alone tells you nothing, since nothing changes between races
 // just by waiting. Age-decaying these to "Stale" was actively misleading: a driver profile
 // captured 3 days ago is exactly as correct as one captured 3 minutes ago, right up until the
 // user actually trains that driver - at which point it's revisiting the source page (which
 // recaptures automatically) that matters, not the clock.
 const endpoints = {
 practice: { ep: '/Practice', label: 'Practice / Weather', icon: '🌤️', visit: 'Qualify.asp, Qualify2.asp, or RaceSetup.asp', volatility: 'session' },
 track: { ep: '/TrackProfile', label: 'Track Profile', icon: '🏁', visit: 'TrackDetails.asp', volatility: 'event' },
 driver: { ep: '/DriProfile', label: 'Driver Profile', icon: '👤', visit: 'DriverProfile.asp', volatility: 'event' },
 office: { ep: '/Office', label: 'Office / Tyre Supplier', icon: '🏢', volatility: 'event' },
 car: { ep: '/UpdateCar', label: 'Car Data (Wear/Levels)', icon: '🏎️', visit: 'Qualify.asp, Qualify2.asp, or UpdateCar.asp', volatility: 'event' },
 testing: { ep: '/Testing', label: 'Testing / Fuel Data', icon: '🧪', visit: 'Testing.asp', volatility: 'session' },
 suppliers: { ep: '/TyreSuppliers', label: 'Tyre Suppliers', icon: '🛞', visit: 'Suppliers.asp', volatility: 'event' },
  staff: { ep: '/StaffAndFacilities', label: 'Staff / Facilities', icon: '👷', visit: 'StaffAndFacilities.asp', volatility: 'event' },
  finance: { ep: '/NegOverview', label: 'Finance / Sponsors', icon: '💰', visit: 'NegotiationsOverview.asp', volatility: 'event' },
  };

 let data = {};
 let errors = {};
 const startTime = Date.now();

 // Refresh the cached cash figure straight off this page's own "Money:" row every time it loads -
 // gpro.asp is visited far more often than UpdateCar.asp, so this is the highest-frequency point
 // to keep getCachedCarData().cash correct (see parseHomeMoneyDOM/updateCachedCash).
 updateCachedCash(parseHomeMoneyDOM());

 try {
 // DOM-only for every endpoint here except Office (see getDataDomOnly - no DOM source exists
 // anywhere on the site for Office's fields, confirmed 2026-07-19). This dashboard used to spend
 // up to 7 real API calls just to show a status table on every single visit to gpro.asp, the
 // most-visited page every race - now it only ever reports what's already been DOM-captured
 // (live parse when the current page happens to supply it, otherwise the DOM-fed stale cache
 // from runPassiveCapture/backgroundCaptureAuxPages), same data, zero budget cost. "Missing"
 // rows below mean "visit that page once" rather than "the API is down".
 const domParsers = { practice: buildLivePracticeDOM, testing: parseTestingDOM, car: parseQualifyCarDOM };
 const keys = Object.keys(endpoints);
 const results = await Promise.allSettled(
 keys.map(key => {
 const fetcher = (key === 'office' || key === 'finance') ? getDataSmart(endpoints[key].ep) : Promise.resolve(getDataDomOnly(endpoints[key].ep, domParsers[key]));
 return fetcher.then(d => { data[key] = d; return d; });
 })
 );
 results.forEach((r, i) => { if (r.status === 'rejected') errors[keys[i]] = r.reason && r.reason.message || 'Unknown error'; });

 // Build status panel - styled as a "Data Freshness" table (label / last-updated / pill status)
 // rather than a flat icon list, so it's readable at a glance instead of needing to parse
 // per-row colored dots and inline error text.
 let h = '';
 const freshRows = Object.entries(endpoints).map(([key, cfg]) => {
 const d = data[key];
 const stale = d && d.__stale;
 const ok = d && !d.loggedOut;
 const time = stale ? d.__staleTime : (ok ? Date.now() : null);
 const ageMs = time ? Date.now() - time : Infinity;
 // "Fresh" (green) covers both a live fetch this load AND a stale-fallback that's still
 // recent (e.g. a background DOM capture that ran minutes ago) - only genuinely old fallback
 // data or a total miss gets flagged.
 let statusLabel, statusColor, statusBg;
 if (!ok) { statusLabel = 'Missing'; statusColor = '#ef4444'; statusBg = 'rgba(239,68,68,0.12)'; }
 else if (cfg.volatility === 'event') {
 // No age decay - this only changes on a real in-game action, not by the clock ticking.
 statusLabel = 'Captured'; statusColor = '#10b981'; statusBg = 'rgba(16,185,129,0.12)';
 } else if (ageMs <= 2 * 3600 * 1000) { statusLabel = 'Fresh'; statusColor = '#10b981'; statusBg = 'rgba(16,185,129,0.12)'; }
 else { statusLabel = 'Stale'; statusColor = '#f59e0b'; statusBg = 'rgba(245,158,11,0.12)'; }
 const reason = !ok ? (errors[key] || (cfg.visit ? `No data captured yet - visit ${cfg.visit} once` : null)) : (stale && cfg.volatility !== 'event' ? d.__staleReason : null);
 return `<tr>
 <td style="padding:6px 4px;color:#d1d5db;font-size:11px;white-space:nowrap;">${cfg.icon} ${cfg.label}</td>
 <td style="padding:6px 4px;color:#6b7280;font-size:10px;white-space:nowrap;">${time ? formatRelativeTime(time) : '—'}</td>
 <td style="padding:6px 4px;text-align:right;"><span style="display:inline-block;padding:2px 10px;border-radius:999px;background:${statusBg};color:${statusColor};font-size:10px;font-weight:700;">${statusLabel}</span></td>
 </tr>${reason ? `<tr><td colspan="3" style="padding:0 4px 6px;font-size:9px;color:#6b7280;">${reason}</td></tr>` : ''}`;
 }).join('');
 h += mkSection('Data Freshness',
 `<div style="font-size:10px;color:#9ca3af;margin-bottom:8px;">Fetched ${Object.keys(data).length}/${Object.keys(endpoints).length} endpoints in ${Date.now() - startTime}ms</div>` +
 `<div style="font-size:9px;color:#6b7280;margin-bottom:6px;">"Captured" rows (Track/Driver/Office/Car/Suppliers/Staff) don't age by the clock - they only change when you train, upgrade, sign, or the wear from a race lands, not by waiting. "Fresh"/"Stale" (Weather, Testing) are genuinely time-sensitive and do decay.</div>` +
 `<table style="width:100%;border-collapse:collapse;">
 <thead><tr style="border-bottom:1px solid #1f2937;">
 <th style="text-align:left;padding:4px;font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Data</th>
 <th style="text-align:left;padding:4px;font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Last Updated</th>
 <th style="text-align:right;padding:4px;font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Status</th>
 </tr></thead>
 <tbody>${freshRows}</tbody>
 </table>` +
 `<div id="gpro-bg-capture-status" style="font-size:9px;color:#6b7280;margin-top:6px;">🔄 Refreshing Driver/Track/Supplier data in the background...</div>`
 );

 // Token status — API token is optional (DOM-parsed data is primary)
 const token = getToken();
 const callCount = getApiCallCount();
 const budgetColor = callCount >= API_CALL_BUDGET ? '#ef4444' : callCount >= API_CALL_BUDGET * 0.8 ? '#f59e0b' : '#10b981';
 const realRemaining = GM_getValue('gpro_api_requests_remaining', null);
 const realColor = realRemaining !== null && parseInt(realRemaining) <= 15 ? '#ef4444' : realRemaining !== null && parseInt(realRemaining) <= 35 ? '#f59e0b' : '#10b981';
 h += mkSection('API Token (optional)',
 mkRow('Status', token ? `<span style="color:#10b981;">Active</span>` : `<span style="color:#6b7280;">Not set (DOM-parsing only)</span>`) +
 mkRow('Token', token ? token.substring(0, 8) + '...' : '—') +
 mkRow('API Calls This Race', `<span style="color:${budgetColor};">${callCount}/${API_CALL_BUDGET}</span>`) +
 (realRemaining !== null ? mkRow('GPRO-Reported Remaining', `<span style="color:${realColor};">${realRemaining}</span>`) : '')
 );

 // Data updated status with timestamp
 const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
 h += mkSection('Data Updated',
 mkRow('Time', `<span style="color:#10b981;">${now}</span>`) +
 mkRow('Sources', `${Object.keys(data).length}/${Object.keys(endpoints).length} loaded`) +
 `<div style="margin-top:6px;font-size:9px;color:#6b7280;">Navigate to other pages for strategy advice.</div>`
 );

 // Upgrade the button section
 h += `<div style="margin-top:10px;">`;
 h += `<button id="gpro-update-all" style="width:100%;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;font-weight:700;font-size:12px;letter-spacing:0.3px;">🔄 Update All Data</button>`;
 h += `</div>`;

 body(h);

 // Background-fetch DriverProfile.asp/TrackDetails.asp/Suppliers.asp/StaffAndFacilities.asp/
 // Qualify.asp (no navigation) so their DOM-scraped fallback data stays fresh without the user
 // manually visiting those pages. Throttled to once per 30 min (bypassed by an explicit "Update
 // All Data" click) - these are real HTTP requests too, and simply landing on gpro.asp repeatedly
 // shouldn't silently re-fire 5 of them every time.
 const lastBgCapture = parseInt(GM_getValue('gpro_bg_capture_last', '0')) || 0;
 const bgCaptureDue = forceBackground || (Date.now() - lastBgCapture > 30 * 60 * 1000);
 const bgStatusEl = document.getElementById('gpro-bg-capture-status');
 if (bgCaptureDue) {
 GM_setValue('gpro_bg_capture_last', String(Date.now()));
 backgroundCaptureAuxPages().then((r) => {
 const el = document.getElementById('gpro-bg-capture-status');
 if (!el) return;
 const parts = [
 r.driver ? 'Driver ✅' : 'Driver ❌',
 r.track ? 'Track ✅' : 'Track ❌',
 r.suppliers ? 'Suppliers ✅' : 'Suppliers ❌',
 r.staff ? 'Staff ✅' : 'Staff ❌',
 r.weather ? 'Weather ✅' : 'Weather ❌',
 ];
 el.textContent = `Background capture: ${parts.join(' | ')}`;
 });
 // Season track-specs pre-cache (Calendar.asp -> every track's avgSpeed/lapDistance) - see
 // backgroundCacheSeasonTrackSpecs. Independent of the per-race capture above; no-ops instantly
 // once the season's already fully cached (tracked via GM value), so this is cheap on every
 // subsequent call despite living inside the same 30-min-throttled block.
  detectLeagueFresh().then((info) => {
  if (info && info.group) backgroundCacheSeasonTrackSpecs(info.group);
  });
 } else if (bgStatusEl) {
 bgStatusEl.textContent = `Background capture skipped (ran ${formatRelativeTime(lastBgCapture)} - throttled to every 30 min, click Update All Data to force).`;
 }

 // Update All button handler
 setTimeout(() => {
 const btn = document.getElementById('gpro-update-all');
 if (btn) btn.addEventListener('click', async () => {
 btn.textContent = '⏳ Fetching...';
 btn.disabled = true;
 btn.style.background = '#374151';
 // API endpoint data still respects the 20-min cache even here (this button doesn't bypass
 // it - forcing a real re-fetch every click would blow through the request budget fast).
 // Only the DriverProfile/TrackDetails/Suppliers/Staff/Weather background capture is forced.
 await renderHome(true);
 });
 }, 50);

 } catch (err) {
 body(mkRec(`<strong>Error:</strong> ${err.message}`, 'bad') +
 `<div style="margin-top:8px;display:flex;gap:6px;">` +
 `<button id="gpro-retry-home" style="background:#374151;color:#d1d5db;border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;">Retry</button>` +
 `<button id="gpro-cfg-home" style="background:#374151;color:#d1d5db;border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;">Settings</button></div>`);
 setTimeout(() => {
 document.getElementById('gpro-retry-home')?.addEventListener('click', () => renderHome());
 document.getElementById('gpro-cfg-home')?.addEventListener('click', showTokenModal);
 }, 100);
 }
 }

 // ============================================================
 // STAFF & FACILITIES IDEAL LEVELS
 // Canonical data lives in gpro-data.js (staffSkills/facilityTargetsData/carIdealLevels) - not duplicated here.
 const STAFF_SKILLS = D.staffSkills || [
 { key: 'concentration', label: 'Concentration', priority: 1, trainable: true, weight: 'High' },
 { key: 'stressHandling', label: 'Stress Handling', priority: 2, trainable: true, weight: 'High' },
 { key: 'efficiency', label: 'Efficiency', priority: 3, trainable: true, weight: 'Medium' },
 { key: 'technicalSkill', label: 'Technical Skill', priority: 4, trainable: false, weight: 'Not purchasable via training' },
 { key: 'experience', label: 'Experience', priority: 5, trainable: false, weight: 'Not purchasable via training' },
 { key: 'motivation', label: 'Motivation', priority: 6, trainable: false, weight: 'Not purchasable via training' },
 ];
 const FACILITY_TARGETS = D.facilityTargetsData || [
 { key: 'pitstopTrainingCenter', label: 'Pitstop Training Center', targetLvl: 20, priority: 1, note: 'Reduces pitstop time' },
 { key: 'engineering', label: 'Engineering', targetLvl: 15, priority: 2, note: 'Car performance' },
 { key: 'rdWorkshop', label: 'R&D Workshop', targetLvl: 10, priority: 3, note: 'Enables higher part levels' },
 { key: 'rdDesign', label: 'R&D Design', targetLvl: 10, priority: 4, note: 'Unlocks advanced setups' },
 { key: 'lab', label: 'Lab', targetLvl: 5, priority: 5, note: 'Research efficiency' },
 { key: 'commercial', label: 'Commercial', targetLvl: 15, priority: 6, note: 'Sponsorship income' },
 { key: 'windtunnel', label: 'Windtunnel', targetLvl: 0, priority: 7, note: 'Low priority in Amateur' },
 ];
 // ============================================================
 // RENDER: STAFF & FACILITIES (StaffAndFacilities.asp)
 // ============================================================
 // Real league detection (unblocks the multi-league TODO's prerequisite) - /Menu's `group` field
 // is e.g. "Rookie - 31" (confirmed via gpro-public-api.yml's MenuResponse example, reviewed
 // 2026-07-19); splitting on " - " gives the league name directly in the exact casing
 // D.leagues/D.risks/D.facilityTargets/D.staffPriority/D.driverSelection already key by, so no
 // abbreviation-guessing (class: "Ro" etc) needed.
  // League is season-changing data (promotion/demotion between seasons) and therefore must NEVER
  // come from the eternal stale /Menu cache: getStaleData('/Menu') has no TTL, so a cached copy
  // from a previous league (e.g. "Amateur - 3" captured before a demotion to Rookie) would pin
  // the wrong league forever - getDataSmart('/Menu') serves that stale copy before ever re-calling
  // the API. Real bug fixed 2026-08-10: the market advisor kept showing Amateur guidance after
  // the account demoted to Rookie. Resolve fresh instead, cheapest first:
  //   1) current page's own group link (<a href="Standings.asp?Group=Rookie - 31">) - free, always current
  //   2) apiGet('/Menu') - short-lived 20-min cache, then the real API
  //   3) eternal stale /Menu only if the API genuinely fails (flagged, not silent)
  function parseLeagueGroupFromDom() {
  try {
  // Scan EVERY Standings.asp?Group= link on the current page, not just the first - a page can
  // carry several (sidebar + manager-info table + driver-contract table), and the first in DOM
  // order isn't necessarily the manager's own group. Keep only ones whose league name is one we
  // actually know about (so a stray link to some other group can't override the real league),
  // then pick the league that appears most often across those links.
  const known = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.leagues) ? Object.keys(GPRO_DATA.leagues) : ['Rookie', 'Amateur', 'Pro', 'Master', 'Elite'];
  const links = Array.from(document.querySelectorAll('a[href*="Standings.asp"][href*="Group="]'));
  const candidates = [];
  links.forEach((a) => {
  const href = a.getAttribute('href') || '';
  const m = href.match(/Group=([^&]+)/i);
  if (!m) return;
  let group = m[1];
  try { group = decodeURIComponent(group).replace(/\+/g, ' ').trim(); } catch (e) { /* keep raw */ }
  const league = String(group).split(' - ')[0].trim();
  if (known.indexOf(league) !== -1) candidates.push({ group, league });
  });
  if (!candidates.length) return null;
  const freq = {};
  candidates.forEach((c) => { freq[c.league] = (freq[c.league] || 0) + 1; });
  const best = candidates.slice().sort((x, y) => (freq[y.league] || 0) - (freq[x.league] || 0))[0];
  logDebug('parseLeagueGroupFromDom ->', best.group, 'from', links.length, 'standings links');
  return best.group;
  } catch (e) { return null; }
  }

  async function detectLeagueFresh() {
  // Priority: trust a live page reading over any cached value. When we DO get a fresh group
  // (DOM or real API), also write it back into the eternal stale /Menu cache so every other
  // consumer of getDataSmart('/Menu') - background track-specs pre-cache, renderHome, etc -
  // self-corrects instead of staying permanently pinned to a previous season's league.
  const domGroup = parseLeagueGroupFromDom();
  if (domGroup) {
  setStaleData('/Menu', { group: domGroup });
  return { league: String(domGroup).split(' - ')[0].trim() || null, group: domGroup, source: 'DOM' };
  }
  try {
  const menu = await apiGet('/Menu');
  const group = menu && menu.group ? String(menu.group) : null;
  if (group) {
  // Only persist a group that came from a real API response - if the request failed and
  // fallbackOrReject resolved the eternal stale value (marked __stale) it's not trustworthy
  // enough to rewrite over itself, but it's still the best we have for THIS call.
  return { league: String(group).split(' - ')[0].trim(), group, source: menu.__stale ? 'stale' : 'API' };
  }
  return { league: null, group: null, source: 'none' };
  } catch (e) {
  return { league: null, group: null, source: 'none' };
  }
  }

  // Small diagnostic line showing which league the panel resolved and where that value came from
  // (page / live API / stale cache). Makes a wrong-league panel diagnosable at a glance instead
  // of silently trusting a cached value - this exact confusion (Rookie account shown Amateur
  // guidance) is what detectLeagueFresh() was built to fix.
  function leagueSourceLine(leagueInfo) {
  const league = leagueInfo && leagueInfo.league;
  if (!league) {
  return `<div style="font-size:9px;color:#ef4444;margin:4px 0;">League: unknown - no group link on this page and /Menu unavailable. Edit "What to look for" below, or set currentLeague in gpro-data.js.</div>`;
  }
  const srcText = { DOM: 'read off this page', API: 'live from API', stale: '⚠ from cached /Menu - may be out of date' }[leagueInfo.source] || leagueInfo.source;
  const color = leagueInfo.source === 'stale' ? '#f59e0b' : '#9ca3af';
  return `<div style="font-size:9px;color:${color};margin:4px 0;">League: <b>${esc(league)}</b> (${srcText})</div>`;
  }

 function renderStaff(staffData, league) {
 let h = '';

  // League context (D.leagues/D.risks were sitting unused until this league was actually
  // detectable - see detectLeagueFresh). Informational only; doesn't change any calculation,
 // just surfaces the real caps/risk-ceiling for the account's actual league instead of leaving
 // the user to assume Amateur.
 if (league && D.leagues && D.leagues[league]) {
 const lg = D.leagues[league];
 const riskInfo = D.risks && D.risks[league];
 h += mkSection(`League: ${league}`,
 mkRow('Driver OA cap', lg.driverMaxOA) +
 mkRow('Facility level cap', lg.facilityMax) +
 mkRow('TD allowed', lg.tdAllowed ? 'Yes' : 'No') +
 (riskInfo ? mkRow('Typical CTR risk ceiling', `${riskInfo.max} (${riskInfo.note})`) : '') +
 `<div style="font-size:9px;color:#6b7280;margin-top:4px;">${lg.description}</div>`
 );
 }

 // Parse staff from API data or DOM
 const staff = staffData || {};
 const skills = [
 { key: 'overall', label: 'Overall' },
 { key: 'experience', label: 'Experience' },
 { key: 'motivation', label: 'Motivation' },
 { key: 'technicalSkill', label: 'Technical Skill' },
 { key: 'stressHandling', label: 'Stress Handling' },
 { key: 'concentration', label: 'Concentration' },
 { key: 'efficiency', label: 'Efficiency' },
 ];

 // League-aware staff priority: D.staffPriority[league] is an array of skill labels in
 // priority order (different shape from STAFF_SKILLS' Amateur-only {key,priority} list) -
 // matched via each skill's own `label` since that's what both shapes share. Falls back to
 // STAFF_SKILLS' Amateur priorities when the league is unknown or has no entry.
 const leaguePriorityList = league && D.staffPriority && D.staffPriority[league];
 function staffPriorityFor(skillKey, skillLabel) {
 if (leaguePriorityList) {
 const idx = leaguePriorityList.indexOf(skillLabel);
 return idx === -1 ? 99 : idx + 1;
 }
 return STAFF_SKILLS.find(sk => sk.key === skillKey)?.priority || 99;
 }

 // Staff skill overview
 let staffHtml = '';
 skills.forEach(s => {
 const val = parseInt(staff[s.key]) || 0;
 const isTarget = s.key !== 'overall';
 const target = isTarget ? staffPriorityFor(s.key, s.label) : null;
 staffHtml += `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid #1f2937;font-size:11px;">
 <span style="width:100px;color:#d1d5db;">${s.label}</span>
 <div style="flex:1;">
 <div style="${ST.wearBar}"><div style="height:100%;border-radius:3px;background:${val >= 20 ? '#10b981' : val >= 10 ? '#f59e0b' : '#ef4444'};width:${Math.min(100, val * 2.5)}%"></div></div>
 </div>
 <span style="width:24px;text-align:right;color:#f9fafb;font-weight:600;">${val}</span>
 </div>`;
 });
 h += mkSection('Staff Skills', staffHtml);

 // Training level cap = average facility level (game documentation: "Staff and Facilities" - training
 // level is capped by the average of your facility levels), computed here (moved up from
 // further below) so the Training Priority section can use the REAL cap instead of a hardcoded
 // "20" that assumed Amateur's typical average and was simply wrong whenever a manager's actual
 // facility average differed from 20 - a real bug, not just an Amateur-vs-other-league gap.
 const facilities = [
 { key: 'windtunnel', label: 'Windtunnel' },
 { key: 'pitstopTrainingCenter', label: 'Pitstop Training Center' },
 { key: 'rdWorkshop', label: 'R&D Workshop' },
 { key: 'rdDesign', label: 'R&D Design' },
 { key: 'engineering', label: 'Engineering' },
 { key: 'lab', label: 'Lab' },
 { key: 'commercial', label: 'Commercial' },
 ];
 const avgFacLevel = facilities.reduce((a, f) => a + (parseInt(staff[f.key]) || 0), 0) / facilities.length;
 const maxTraining = Math.floor(avgFacLevel);

 // Training recommendations - order by the league's real priority list when we have one.
 // Real bug fixed 2026-07-27 (confirmed against the official GPRO wiki,
 // wiki.gpro.net/index.php?title=Staff_and_Facilities): only Concentration/Stress Handling/
 // Efficiency are actually purchasable training - Technical Skill/Experience/Motivation have no
 // training-session option at all, so they're filtered out here instead of being recommended as
 // if trainable. Same priority order across every league (training is capped by average facility
 // level, not by league directly) - Concentration first per community consensus on pit/strategy
 // error impact, Stress Handling second, Efficiency third.
 const orderedStaffSkills = (leaguePriorityList
 ? leaguePriorityList.map(label => STAFF_SKILLS.find(sk => sk.label === label)).filter(Boolean)
 : STAFF_SKILLS).filter(s => s.trainable !== false);
 let trainHtml = '';
 orderedStaffSkills.forEach(s => {
 const val = parseInt(staff[s.key]) || 0;
 const isMaxed = val >= maxTraining;
 const status = isMaxed ? '✅ MAXED' : `Training to ${maxTraining}... (${maxTraining - val} more)`;
 const color = isMaxed ? '#10b981' : '#f59e0b';
 const costStr = s.cost ? ` — $${s.cost.toLocaleString()}/session` : '';
 trainHtml += `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #1f2937;font-size:11px;">
 <span style="width:4px;height:4px;border-radius:50%;background:${color};flex-shrink:0;"></span>
 <span style="width:110px;color:#d1d5db;">${s.label}${costStr}</span>
 <span style="color:${color};flex:1;font-weight:600;">${status}</span>
 </div>`;
 });
 h += mkSection('Training Priority', trainHtml +
 `<span style="font-size:9px;color:#6b7280;">Only Concentration/Stress Handling/Efficiency are actually purchasable training (source: <a href="https://wiki.gpro.net/index.php?title=Staff_and_Facilities" target="_blank" style="color:#60a5fa;">GPRO Wiki</a>) - Technical Skill/Experience/Motivation aren't trainable at all, shown in Staff Skills above for reference only. Max training level = average of facility levels (currently ${maxTraining}).</span>`);

 // D.facilityTargets[league] is real per-league data (flat label->targetLevel), matched via
 // each facility's own `label` since that table has no `key` field. Falls back to
 // FACILITY_TARGETS' Amateur-only {key,targetLvl} shape when the league is unknown.
 const leagueFacilityTargets = league && D.facilityTargets && D.facilityTargets[league];
 const facilityMax = (league && D.leagues && D.leagues[league] && D.leagues[league].facilityMax) || 40;
 let facHtml = '';
 facilities.forEach(f => {
 const val = parseInt(staff[f.key]) || 0;
 const targetLvl = leagueFacilityTargets ? (leagueFacilityTargets[f.label] || 0) : (FACILITY_TARGETS.find(ft => ft.key === f.key)?.targetLvl || 0);
 const atTarget = val >= targetLvl;
 const color = atTarget ? '#10b981' : val >= targetLvl * 0.5 ? '#f59e0b' : '#ef4444';
 facHtml += `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #1f2937;font-size:11px;">
 <span style="width:130px;color:#d1d5db;">${f.label}</span>
 <div style="flex:1;">
 <div style="${ST.wearBar}"><div style="height:100%;border-radius:3px;background:${color};width:${Math.min(100, val / facilityMax * 100)}%"></div></div>
 </div>
 <span style="width:24px;text-align:right;color:#f9fafb;font-weight:600;">L${val}</span>
 <span style="width:24px;text-align:right;color:#6b7280;font-size:9px;">→${targetLvl}</span>
 </div>`;
 });
 h += mkSection('Facilities', facHtml +
 `<span style="font-size:9px;color:#6b7280;">${league || 'Amateur'} max: L${facilityMax}. Targets for balanced development.</span>`);

  h += mkSection('Training Level',
  mkRow('Average Facility Level', maxTraining.toFixed(0)) +
  mkRow('Max Training Level', `${maxTraining} (skill cap)`) +
   `<span style="font-size:9px;color:#6b7280;">Training level = average of all facility levels. Raise facilities to train staff higher.</span>`
   );

  // Facility Upgrade Priority (from gproanalyzer.info data + league targets)
  // Shows which facility gives the best ROI for training level improvement
  if (leagueFacilityTargets) {
  const facList = facilities.map(f => {
   const val = parseInt(staff[f.key]) || 0;
   const target = leagueFacilityTargets[f.label] || 0;
   const gap = Math.max(0, target - val);
   // Cost to upgrade = $500K per level (approximate GPRO facility cost)
   const costPerLevel = 500000;
   const totalCost = gap * costPerLevel;
   // Impact on avg = gap / numFacilities (improves average by 1 level per upgrade)
   const impactPerUpgrade = 1 / facilities.length;
   const roi = gap > 0 ? (impactPerUpgrade / (costPerLevel / 1e6)).toFixed(3) : '0';
   return { ...f, val, target, gap, totalCost, roi };
  }).filter(f => f.gap > 0).sort((a, b) => b.gap - a.gap);

  if (facList.length > 0) {
   let facHtml = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:9px;">';
   facHtml += '<tr style="color:#60a5fa;font-weight:700;"><td style="padding:2px;">Facility</td><td style="text-align:center;">Lvl</td><td style="text-align:center;">Target</td><td style="text-align:center;">Gap</td><td style="text-align:center;">Cost</td></tr>';
   facList.forEach(f => {
    facHtml += `<tr><td style="padding:2px;color:#d1d5db;">${f.label}</td><td style="text-align:center;color:#9ca3af;">L${f.val}</td><td style="text-align:center;color:#9ca3af;">L${f.target}</td><td style="text-align:center;color:${f.gap > 5 ? '#ef4444' : '#f59e0b'};">+${f.gap}</td><td style="text-align:center;color:#f59e0b;">$${(f.totalCost/1e6).toFixed(1)}M</td></tr>`;
   });
   facHtml += '</table></div>';
   h += mkSection('Facility Upgrade Priority', facHtml + `<span style="font-size:9px;color:#6b7280;">Sorted by gap to league target. Each upgrade costs ~$500K/level and raises training cap by ~${(1/facilities.length).toFixed(2)} levels.</span>`);
  }
  }

  body(h);
  }

 // ============================================================
 // RENDER: TRAINING SESSION (TrainingSession.asp)
 // ============================================================
 // Parses driver skills, contract, training sessions from DOM and shows training advice.
 function renderTraining(league) {
 const data = parseTrainingSessionDOM(document);
 if (!data) {
 body(mkRec('No training data found. Make sure you are on TrainingSession.asp.', 'warn') +
 `<div style="margin-top:8px;"><button id="gpro-retry" style="background:#374151;color:#d1d5db;border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;">Retry</button></div>`);
 setTimeout(() => { document.getElementById('gpro-retry')?.addEventListener('click', () => location.reload()); }, 100);
 return;
 }
 let h = '';

 // Driver overview
 h += mkSection('Driver', mkRow('Name', esc(data.driverName) || '?') +
 mkRow('Overall', data.skills.overall || '?') +
 mkRow('Energy', data.energy != null ? `${data.energy}%` : '?') +
 (data.age ? mkRow('Age', data.age) : '') +
 (data.weight ? mkRow('Weight', `${data.weight} kg`) : ''));

 // Career stats
 if (data.career && Object.keys(data.career).length) {
 let careerHtml = '';
 if (data.career.gPs) careerHtml += mkRow('GPs', data.career.gPs);
 if (data.career.wins) careerHtml += mkRow('Wins', data.career.wins);
 if (data.career.podiums) careerHtml += mkRow('Podiums', data.career.podiums);
 if (data.career.points) careerHtml += mkRow('Points', data.career.points);
 if (data.career.poles) careerHtml += mkRow('Poles', data.career.poles);
 if (data.career.fastestLaps) careerHtml += mkRow('Fastest Laps', data.career.fastestLaps);
 if (data.career.avPtsRace) careerHtml += mkRow('Av Pts/Race', data.career.avPtsRace);
 if (data.career.trophies) careerHtml += mkRow('Trophies', data.career.trophies);
 if (careerHtml) h += mkSection('Career', careerHtml);
 }

 // Contract
 if (data.contract && Object.keys(data.contract).length) {
 let conHtml = '';
 if (data.contract.salary) conHtml += mkRow('Salary', '$' + data.contract.salary.toLocaleString());
 if (data.contract.racesLeft) conHtml += mkRow('Races Left', data.contract.racesLeft);
 if (data.contract.pointsBonus) conHtml += mkRow('Points Bonus', '$' + data.contract.pointsBonus.toLocaleString());
 if (data.contract.podiumBonus) conHtml += mkRow('Podium Bonus', '$' + data.contract.podiumBonus.toLocaleString());
 if (data.contract.winBonus) conHtml += mkRow('Win Bonus', '$' + data.contract.winBonus.toLocaleString());
 if (conHtml) h += mkSection('Contract', conHtml);
 }

 // Skills breakdown
 const skillOrder = ['concentration', 'talent', 'aggressiveness', 'experience', 'techInsight', 'stamina', 'charisma', 'motivation'];
 const skillLabels = { concentration: 'Concentration', talent: 'Talent', aggressiveness: 'Aggressiveness', experience: 'Experience', techInsight: 'Technical Insight', stamina: 'Stamina', charisma: 'Charisma', motivation: 'Motivation' };
 let skillsHtml = '';
 skillOrder.forEach(sk => {
 const val = data.skills[sk];
 if (val != null) {
 const color = val >= 100 ? '#10b981' : val >= 50 ? '#f59e0b' : '#ef4444';
 skillsHtml += `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid #1f2937;font-size:11px;">
 <span style="width:120px;color:#d1d5db;">${skillLabels[sk]}</span>
 <div style="flex:1;"><div style="${ST.wearBar}"><div style="height:100%;border-radius:3px;background:${color};width:${Math.min(100, val / 2)}%"></div></div></div>
 <span style="width:30px;text-align:right;color:#f9fafb;font-weight:600;">${val}</span>
 </div>`;
 }
 });
 if (skillsHtml) h += mkSection('Skills', skillsHtml);

 // Session-to-skill mapping - was previously this project's own unsourced guess. Replaced
 // 2026-07-27 with D.trainingSessionEffects (gpro-data.js), sourced from a community reference
 // (gproracers.forumotion.com/t65-driver-stats) with up/down directions instead of a flat list -
 // GPRO's own wiki says the exact effect isn't perfectly deterministic session-to-session, so this
 // is presented as community consensus, not a verified formula, and cited as such below.
 const sessionEffects = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.trainingSessionEffects) || {};

 // Training sessions + recommendations
 if (data.sessions.length) {
 let sessHtml = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:10px;">';
 sessHtml += '<tr style="color:#60a5fa;font-weight:700;"><td style="padding:3px;">Session</td><td style="text-align:center;">Cost</td><td style="padding:3px;">Reported effect</td></tr>';
 data.sessions.forEach(s => {
 const eff = sessionEffects[s.id];
 let effectStr = 'Unconfirmed';
 if (eff) {
 const upStr = eff.up.map(a => skillLabels[a] || a).join(', ');
 const downStr = eff.down.map(a => skillLabels[a] || a).join(', ');
 effectStr = [upStr ? `↑ ${upStr}` : '', downStr ? `↓ ${downStr}` : ''].filter(Boolean).join(', ') || 'Unconfirmed';
 }
 sessHtml += `<tr><td style="padding:3px;color:#d1d5db;">${s.label}</td><td style="text-align:center;color:#9ca3af;">$${s.cost.toLocaleString()}</td><td style="padding:3px;color:#6b7280;font-size:9px;">${effectStr}</td></tr>`;
 });
 sessHtml += '</table></div>';
  h += mkSection('Available Training',
  sessHtml + `<div style="font-size:9px;color:#6b7280;margin-top:4px;">Community-reported effects (source: <a href="https://gproracers.forumotion.com/t65-driver-stats" target="_blank" style="color:#60a5fa;">gproracers.forumotion.com</a>), not a verified formula - GPRO's own wiki says the exact effect isn't perfectly consistent session to session.</div>`);
  }

  // Optimal-training reference (user-provided 2026-08-10): target attribute levels to aim for and
  // the session that raises each one, shown against the driver's current skill values so the gap
  // to each target is visible at a glance. Guidance, not a verified formula.
  const optimalTraining = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.driverOptimalTraining) || [];
  if (optimalTraining.length) {
  let optHtml = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:10px;">';
  optHtml += '<tr style="color:#60a5fa;font-weight:700;"><td style="padding:3px;">Skill</td><td style="text-align:center;">Now</td><td style="text-align:center;">Target</td><td style="text-align:center;">Gap</td><td style="padding:3px;">Session</td></tr>';
  optimalTraining.forEach(ot => {
  const now = data.skills[ot.skill];
  const gap = now != null ? Math.max(0, ot.target - now) : null;
  const gapStr = gap == null ? '?' : gap === 0 ? '<span style="color:#10b981;">Met</span>' : `+${gap}`;
  optHtml += `<tr><td style="padding:3px;color:#d1d5db;">${ot.label}</td><td style="text-align:center;color:#9ca3af;">${now != null ? now : '?'}</td><td style="text-align:center;color:#f59e0b;font-weight:600;">${ot.target}</td><td style="text-align:center;color:${gap === 0 ? '#10b981' : '#ef4444'};font-weight:600;">${gapStr}</td><td style="padding:3px;color:#6b7280;font-size:9px;">${ot.session}</td></tr>`;
  });
  optHtml += '</table></div>';
  h += mkSection('Driver Optimal Training', optHtml + `<div style="font-size:9px;color:#6b7280;margin-top:4px;">${optimalTraining.map(o => `${o.label} to ${o.target} via ${o.session}`).join(' • ')} - guidance, not a verified formula.</div>`);
  }


 // Training recommendations — map weakest skills to best session, weighted by which attributes
 // actually matter at this driver's league (D.driverAttributeLeaguePriority) instead of pure
 // raw-lowest-value, per the same community guide - e.g. Talent is untrainable and mostly
 // irrelevant to flag for a Rookie driver even if it's numerically their lowest stat.
 const leagueAttrPriority = league && typeof GPRO_DATA !== 'undefined' && GPRO_DATA.driverAttributeLeaguePriority
 && GPRO_DATA.driverAttributeLeaguePriority[league];
  const skillValues = skillOrder.map(sk => ({ key: sk, label: skillLabels[sk], val: data.skills[sk] || 0 })).filter(s => s.val > 0 && s.key !== 'aggressiveness');
 if (skillValues.length) {
 const sorted = [...skillValues].sort((a, b) => {
 if (leagueAttrPriority) {
 const pa = leagueAttrPriority.indexOf(a.key), pb = leagueAttrPriority.indexOf(b.key);
 // League-relevant attributes sort first (by relevance rank), then by raw value within
 // that group; anything not in the league's priority list falls back after, by raw value.
 if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
 }
 return a.val - b.val;
 });
 const weakest = sorted.slice(0, 3);
 let recHtml = '<div style="font-size:10px;color:#d1d5db;">';
 recHtml += `<div style="color:#f59e0b;font-weight:600;margin-bottom:4px;">${leagueAttrPriority ? `Priority skills for ${league} league` : 'Weakest skills (biggest training impact)'}:</div>`;
 weakest.forEach((s, i) => {
 // Find best (cheapest) session that reports increasing this skill
 let bestSession = null;
 let bestCost = Infinity;
 data.sessions.forEach(sess => {
 const eff = sessionEffects[sess.id];
 if (eff && eff.up.includes(s.key) && sess.cost < bestCost) {
 bestSession = sess;
 bestCost = sess.cost;
 }
 });
 const tradeoffSess = bestSession && sessionEffects[bestSession.id];
 const tradeoff = tradeoffSess && tradeoffSess.down.length ? ` (trade-off: ↓ ${tradeoffSess.down.map(a => skillLabels[a] || a).join(', ')})` : '';
 const rec = bestSession ? ` → ${bestSession.label} ($${bestSession.cost.toLocaleString()})${tradeoff}` : ' → no session with a confirmed effect on this skill';
 recHtml += `<div style="padding:2px 0;">${i + 1}. <span style="color:#ef4444;font-weight:600;">${s.label}</span> — ${s.val}${rec}</div>`;
 });
 recHtml += '</div>';
  h += mkSection(leagueAttrPriority ? `Training Recommendation (${league})` : 'Training Recommendation', recHtml);
  }

  // Track-Specific Training Advice (using scraped season CTR/PHA data)
  // Shows which skills matter most for upcoming tracks based on overtaking difficulty and grip
  if (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.seasonCTR) {
  const upcomingTracks = GPRO_DATA.seasonCTR.slice(0, 5); // Next 5 races
  let trackHtml = '<div style="font-size:10px;color:#d1d5db;">';
  trackHtml += '<div style="color:#f59e0b;font-weight:600;margin-bottom:4px;">Upcoming Track Analysis:</div>';
  upcomingTracks.forEach(t => {
   const overtakingBonus = t.overtaking === 'Easy' || t.overtaking === 'Very Easy' ? 'Aggression valuable' : t.overtaking === 'Hard' || t.overtaking === 'Very Hard' ? 'Concentration critical' : 'Balanced approach';
   trackHtml += `<div style="padding:2px 0;font-size:9px;"><span style="color:#60a5fa;font-weight:600;">R${t.race} ${t.track}</span> — ${t.overtaking} overtaking, ${t.grip} grip — ${overtakingBonus}</div>`;
  });
  trackHtml += '</div>';
  h += mkSection('Track-Specific Training Focus', trackHtml + `<span style="font-size:9px;color:#6b7280;">Based on scraped gproanalyzer.info Season 111 CTR data. Easy overtaking = aggression matters more. Hard overtaking = concentration matters more. Grip level affects tyre management skill importance.</span>`);
  }

  // Budget check
 if (data.contract.salary) {
 const canAffordSessions = Math.floor(data.contract.salary / 750000);
 h += mkRec(`Salary: $${data.contract.salary.toLocaleString()} — can theoretically fund ~${canAffordSessions} most expensive sessions. Only 1 session per race.`, 'info');
 }

 h += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">Training advice is community consensus (see sources above), weighted by your league's priority attributes when your league is detected${league ? ` (currently ${league})` : ''} - not a verified GPRO formula. Each training session may not affect skills identically every time.</div>`;

 body(h);
 }

 // ============================================================
 // RENDER: DRIVER / TD MARKET PAGE (AvailDrivers.asp / AvailTechDirectors.asp)
 // ============================================================
 // Shown when the user physically visits a market page — same data as the menu command
 // but using DOM-parsed data when available, falling back to API.
 async function renderMarketPage(type) {
 createPanel(type === 'drivers' ? 'Driver Market Advisor' : 'TD Market Advisor');
 body(`<div style="${ST.loading}">Loading market data (fetching every market page - this covers the whole market, not just this one)...</div>`);
 try {
 // DOM-only for page 1 (the live page IS the data source), then a real-HTTP (never API) fetch of
 // every remaining page - see fetchRemainingMarketPages. Real user complaint (2026-08-11): "why
 // can the filter not filter out every driver... it clearly only filters the drivers on that
 // page" - having to manually click through and re-apply the filter bar on every page was the
 // exact bug. domRows below is now the WHOLE market, not just whatever page the user landed on.
  const idKey = type === 'drivers' ? 'driId' : 'tdId';
  const page1Rows = parseAvailListDOM(document, idKey);
  let restRows = [];
  try { restRows = await fetchRemainingMarketPages(type, idKey); }
  catch (e) { logError('fetchRemainingMarketPages failed:', e.message); }
  const domRows = page1Rows ? mergeMarketRows(page1Rows, restRows, idKey) : (restRows.length ? restRows : null);
  const marketEndpoint = type === 'drivers' ? '/AvailDrivers' : '/AvailTDs';
  // Merge into the accumulated stale cache too (by ID), so renderMarketOverview() (callable from
  // any page via the Tampermonkey menu, without an API call) stays in sync with whatever the most
  // recent full market fetch found - candidates hired/withdrawn since a prior visit still won't
  // linger forever since a fresh full fetch now happens on every visit here.
  const marketKey = type === 'drivers' ? 'drivers' : 'tds';
  const prevMarket = getStaleData(marketEndpoint);
  const prevRows = (prevMarket && prevMarket.data && prevMarket.data[marketKey]) || [];
  const allRows = domRows ? mergeMarketRows(prevRows, domRows, idKey) : prevRows;
  if (domRows) setStaleData(marketEndpoint, { [marketKey]: allRows });
  const leagueInfo = await detectLeagueFresh();
  let h = '';
  const league = leagueInfo.league || (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.currentLeague) || 'Amateur';
 const emptyReason = 'Could not read the market table on this page - if this just loaded, wait a moment and click Retry.';
 const cachedCarForMarket = getCachedCarData();
 const marketCash = cachedCarForMarket && cachedCarForMarket.cash > 0 ? cachedCarForMarket.cash : null;
 // Hoisted out of the if/else below so the post-body() wiring section can reference whichever
 // one applies without a ReferenceError (const inside each branch would go out of scope).
 let sel = null, tdSel = null;

  if (type === 'drivers') {
  const drivers = domRows || [];
  h += mkDecisionBoard([{ id: 'gpro-sec-market-drivers', label: 'Drivers', verdict: `${drivers.length} listed`, tone: drivers.length ? 'info' : 'warn' }]);
  h += leagueSourceLine(leagueInfo);
  sel = D.driverSelection && D.driverSelection[league];
  h += mkSection(`Available Drivers (${drivers.length})`,
  drivers.length ? mkShortlistSection(drivers, 'driId', sel && sel.targetOA, marketCash, league, 'driver', 'drivers', sel && Object.entries(sel.attributes)) : mkRec(emptyReason, 'warn'),
  'gpro-sec-market-drivers');
  if (allRows.length > drivers.length) {
  h += `<div style="font-size:9px;color:#6b7280;margin-top:2px;">${allRows.length - drivers.length} more candidate(s) remembered from a previous visit are no longer listed (hired/withdrawn) and excluded above - the ${drivers.length} shown is the full CURRENT market, fetched across every page.</div>`;
  }

 // Driver selection criteria
 if (sel) {
 let selHtml = `<div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">Target OA: ${sel.targetOA.min}-${sel.targetOA.max}</div>`;
 Object.entries(sel.attributes).sort((a, b) => a[1].priority - b[1].priority).forEach(([attr, info]) => {
 selHtml += mkRow(`${info.priority}. ${attr}`, `${info.target}`);
 selHtml += `<div style="font-size:9px;color:#6b7280;padding-left:8px;margin-bottom:2px;">${info.note}</div>`;
 });
 selHtml += `<div style="font-size:9px;color:#9ca3af;margin-top:4px;">${sel.budget}</div>`;
 h += `<details style="margin-top:8px;"><summary style="cursor:pointer;color:#60a5fa;font-size:11px;font-weight:700;padding:4px 0;">What to look for (${league} league)</summary>${selHtml}</details>`;
 } else if (league) {
 // D.driverSelection only has calibrated targets for Rookie/Amateur so far - rather than
 // silently omitting the section for Pro/Master/Elite (which reads as "nothing to shortlist"),
 // say plainly that the guidance doesn't exist yet for this league.
 h += `<div style="font-size:9px;color:#f59e0b;margin-top:8px;">No target-attribute guidance calibrated yet for ${league} league (only Rookie/Amateur so far) - the driver list above is still real, just without a "what to look for" checklist.</div>`;
 }
   } else {
  const tds = domRows || [];
  h += mkDecisionBoard([{ id: 'gpro-sec-market-tds', label: 'TDs', verdict: `${tds.length} listed`, tone: tds.length ? 'info' : 'warn' }]);
  h += leagueSourceLine(leagueInfo);
  tdSel = D.tdSelection && D.tdSelection[league];
  h += mkSection(`Available Technical Directors (${tds.length})`,
  tds.length ? mkShortlistSection(tds, 'tdId', tdSel && tdSel.targetOA, marketCash, league, 'TD', 'tds', tdSel && Object.entries(tdSel.skills)) : mkRec(emptyReason, 'warn'),
  'gpro-sec-market-tds');
  if (allRows.length > tds.length) {
  h += `<div style="font-size:9px;color:#6b7280;margin-top:2px;">${allRows.length - tds.length} more candidate(s) remembered from a previous visit are no longer listed (hired/withdrawn) and excluded above - the ${tds.length} shown is the full CURRENT market, fetched across every page.</div>`;
  }
 if (tdSel) {
 let tdSelHtml = `<div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">Target OA: ${tdSel.targetOA.min}-${tdSel.targetOA.max}</div><div style="font-size:9px;color:#f59e0b;margin-bottom:4px;">⚠️ TD OA caps are wiki-sourced and NOT independently confirmed - this project's driver OA caps came from the same wiki and turned out to be wrong (corrected 2026-07-27 via live in-game confirmation). Verify against what the game actually lets you sign before relying on this.</div>`;
 Object.entries(tdSel.skills).sort((a, b) => a[1].priority - b[1].priority).forEach(([skill, info]) => {
 tdSelHtml += mkRow(`${info.priority}. ${skill}`, '');
 tdSelHtml += `<div style="font-size:9px;color:#6b7280;padding-left:8px;margin-bottom:2px;">${info.note}</div>`;
 });
 tdSelHtml += `<div style="font-size:9px;color:#9ca3af;margin-top:4px;">${tdSel.budget}</div>`;
 h += `<details style="margin-top:8px;"><summary style="cursor:pointer;color:#60a5fa;font-size:11px;font-weight:700;padding:4px 0;">What to look for in a TD (${league} league)</summary>${tdSelHtml}</details>`;
 } else if (league === 'Rookie' || league === 'Amateur') {
 h += `<div style="font-size:9px;color:#6b7280;margin-top:8px;">TDs aren't available until Pro league.</div>`;
 }
 }

 h += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">Value = OA per $1M salary. 🕐 = retiring soon. Skill/range filters are GPRO Supporters-only via the API.</div>`;
 body(h);
 wireDecisionBoard();
 if (type === 'drivers' && sel) {
 wireScanFullStatsButton('drivers', 'driId', domRows || [], Object.entries(sel.attributes), league, true);
 } else if (type === 'tds' && tdSel) {
 wireScanFullStatsButton('tds', 'tdId', domRows || [], Object.entries(tdSel.skills), league, true);
 }
 } catch (err) {
 body(mkRec(`<strong>Error:</strong> ${err.message}`, 'bad'));
 }
 }

 // ============================================================
 // CACHED CAR DATA (from UpdateCar DOM for use on Q1/Race pages)
 // ============================================================
 function getCachedCarData() {
 try {
 const raw = GM_getValue('gpro_cached_car', null);
 return raw ? JSON.parse(raw) : null;
 } catch (e) { return null; }
 }

 // Parses the account balance directly off gpro.asp's own manager-info table - confirmed markup:
 // <tr><td>Money:</td><td><a href="EconomyHistory.asp">$7.382.670</a></td></tr>. Added 2026-07-31:
 // gpro.asp is visited far more often than UpdateCar.asp (every race check vs only when actively
 // managing the car), so refreshing cash here keeps getCachedCarData().cash correct even on race
 // weekends where the user never opens the Car Advisor at all.
 function parseHomeMoneyDOM(root) {
 root = root || document;
 try {
 const tds = root.querySelectorAll('td');
 for (const td of tds) {
 if (td.textContent.trim() === 'Money:') {
 const valTd = td.nextElementSibling;
 if (!valTd) return null;
 const v = parseGproCash(valTd.textContent);
 return v > 0 ? v : null;
 }
 }
 return null;
 } catch (e) { return null; }
 }

 // Writes a freshly-read cash figure into the same cache slot renderUpdateCar maintains, so every
 // consumer of getCachedCarData().cash (Car Advisor, Market shortlist affordability, etc.) sees it
 // regardless of which page last refreshed it.
 function updateCachedCash(cash) {
 if (!(cash > 0)) return;
 try {
 const cached = getCachedCarData() || {};
 cached.cash = cash;
 GM_setValue('gpro_cached_car', JSON.stringify(cached));
 } catch (e) {}
 }

 // Resolves which tyre supplier is actually signed. The API path matches by numeric id
 // (office.tyreSupplierId -> supplierData.suppliers[].id); the DOM-capture path (Suppliers.asp,
 // getDataSmart's stale-cache tier) has no numeric ids, just names, and marks the active one via
 // `activeSupplierName`. Support both so a fully DOM-sourced office/suppliers pair still resolves.
 function resolveActiveSupplier(office, supplierData) {
 if (!supplierData || !supplierData.suppliers) return null;
 const supplierId = office ? office.tyreSupplierId : null;
 if (supplierId) {
 const byId = supplierData.suppliers.find(s => s.id === parseInt(supplierId));
 if (byId) return byId;
 }
 if (supplierData.activeSupplierName) {
 return supplierData.suppliers.find(s => s.name === supplierData.activeSupplierName) || null;
 }
 return null;
 }

 function mergeWithCachedCarData(apiCar) {
 const cached = getCachedCarData();
 if (!cached) return apiCar;
 const merged = apiCar || {};
 // If API has 0 for levels/wear, use cached data
 PART_LVL_KEYS.forEach((k, i) => {
 const apiVal = parseInt(merged[k]) || 0;
 const cachedVal = parseInt(cached[k]) || 0;
 merged[k] = apiVal > 0 ? apiVal : cachedVal;
 });
 PART_WEAR_KEYS.forEach((k, i) => {
 const apiVal = parseInt(merged[k]) || 0;
 const cachedVal = parseInt(cached[k]) || 0;
 merged[k] = apiVal > 0 ? apiVal : cachedVal;
 });
 if (!merged.carPower && cached.carPower) merged.carPower = cached.carPower;
 if (!merged.carHandl && cached.carHandl) merged.carHandl = cached.carHandl;
 if (!merged.carAccel && cached.carAccel) merged.carAccel = cached.carAccel;
 return merged;
 }

  // ============================================================
  // RENDER: DRIVER OFFER (DriverProfile.asp "Place your offer" form)
  // ============================================================
  // Advises on the contract-offer form a free-agent driver shows you. All numbers are read live
  // off the page (driver's ask, your cash, current form values) so the advice reflects the real
  // caps the game's own SubmitForm validation enforces - nothing guessed.
  function renderDriverOffer() {
  createPanel('Driver Offer Advisor');
  body(`<div style="${ST.loading}">Reading offer form...</div>`);
  try {
  const offer = parseDriverOfferDOM(document);
  if (!offer) {
  body(mkRec('No contract-offer form found on this page - either this driver is already under your contract or the page just loaded. Click Retry or reload.', 'warn') +
  `<div style="margin-top:8px;"><button id="gpro-retry" style="background:#374151;color:#d1d5db;border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;">Retry</button></div>`);
  setTimeout(() => { document.getElementById('gpro-retry')?.addEventListener('click', () => location.reload()); }, 100);
  return;
  }
  let h = '';
  const ask = offer.ask || 0;
  const cash = offer.cash || 0;

  // Game caps from the page's own validation JS:
  //   max bonus per win/podium/point = floor(managersCash / 17)
  //   max championship bonus        = floor(managersCash / 2)  (Elite-only field)
  //   salary outside 0.3x..5x of the ask triggers a "please confirm"
  //   signing fee < 0.3x salary warns; signing fee must be < 3.0x salary (tooltip)
  const maxRaceBonus = Math.floor(cash / 17);
  const maxChampBonus = Math.floor(cash / 2);

  // Driver/ask/competition/offer-cost detail cards removed from the visible panel per explicit
  // user request 2026-07-31 ("pointless waste... I only need the recommended offers part") -
  // same "UI stays copy-paste-simple" precedent as the other advisors (see CLAUDE.md). All of
  // this is still parsed and used internally below to compute the recommendation - only the
  // separate display cards for it are gone, not the data itself.

  // ---- Recommended offer ----
  // HONESTY NOTE: GPRO's driver-choice model is closed, and rival bid amounts aren't visible, so
  // there is NO proven "win" number and no tool can give you one. This is a transparent heuristic
  // anchored on the driver's asking salary, and it's tunable - you decide how competitive you want
  // to be (a "value" bid vs. a "must-win" bid). All values are held inside the game's own
  // validation caps (read off this page), and the default is a fair, budget-friendly deal - not an
  // attempt to brute-force someone else's bid, which nobody can see anyway.
  const contested = offer.totalOffers > 0;
  // Nightly tuning via Settings (gpro_bid_strategy): value=0.5x ask, balanced=1.0x (default,
  // material deal), aggressive=2.0x. Balanced picks 1.25x when contested, 1.0x when calm.
  let bidStrat = contested ? 1.25 : 1.0;
  try {
  const s = GM_getValue('gpro_bid_strategy', 'balanced');
  bidStrat = s === 'value' ? 0.5 : s === 'aggressive' ? 2.0 : s === 'balanced' ? (contested ? 1.25 : 1.0) : bidStrat;
  } catch (e) {}
  let recSalary = Math.max(Math.round(ask * 0.5 / 10000) * 10000, Math.round((ask * bidStrat) / 10000) * 10000);
  // Don't blow your whole cash on one season-long salary; sanity-cap at ~70% of held cash.
  const seasonCap = Math.floor(cash * 0.7);
  recSalary = Math.min(recSalary, seasonCap);
  // Signing fee: generous but capped well inside the <3x rule - 1x salary is a genuinely strong
  // but sane offer that won't overpay on an untested salary.
  const recSignFee = Math.min(Math.round((recSalary * 1.0) / 5000) * 5000, recSalary * 3);
  // Bonuses: keep them modest (result-only upside), never near the legal max - that's the "proven
  // top-tools overpay" trap with zero upside unless the driver actually delivers.
  const recWinBonus = Math.min(Math.round((recSalary * 0.4) / 5000) * 5000, maxRaceBonus);
  const recPodiumBonus = Math.min(Math.round((recSalary * 0.25) / 5000) * 5000, maxRaceBonus);
  const recPointBonus = Math.min(Math.round((recSalary * 0.2) / 5000) * 5000, maxRaceBonus);
  const recRaces = 17;
  const recChampBonus = 0;

  // Budget check: total season commitment = salary*races + fee + offer cost.
  const total = recSalary * recRaces + recSignFee + offer.offerCost;
  const affordable = total <= cash;
  const bufNote = affordable ? '' : mkRec('This recommended offer exceeds the cash you hold — trim salary/races below to stay solvent.', 'bad');

  h += mkSection('Recommended offer' + (contested ? ' (driver is contested)' : ''),
  mkRow('Salary per race', '$' + recSalary.toLocaleString() + `<span style="color:#9ca3af;font-size:9px;"> (~${Math.round(recSalary / Math.max(1, ask) * 10) / 10}x his $${ask.toLocaleString()} ask)</span>`) +
  mkRow('Signing on fee', '$' + recSignFee.toLocaleString() + `<span style="color:#9ca3af;font-size:9px;"> (${recSignFee === 0 ? 'must be > 0' : Math.round(recSignFee / recSalary * 10) / 10 + 'x salary — keep < 3x'})</span>`) +
  mkRow('Bonus per win', '$' + recWinBonus.toLocaleString() + '<span style="color:#6b7280;font-size:9px;"> result-only</span>') +
  mkRow('Bonus per podium', '$' + recPodiumBonus.toLocaleString() + '<span style="color:#6b7280;font-size:9px;"> result-only</span>') +
  mkRow('Points bonus', '$' + recPointBonus.toLocaleString() + '<span style="color:#6b7280;font-size:9px;"> result-only</span>') +
  mkRow('Championship bonus', offer.champDisabled ? '0 (not offered below Elite)' : '$0') +
  mkRow('Contract length', recRaces + ' races (max - locks the driver in)') +
  mkRow('Visibility', offer.visibility || 'Public offer') +
  mkRow('Est. total commitment', '$' + total.toLocaleString() + (affordable ? '' : ' ❌ exceeds cash')) +
  bufNote +
  `<div style="font-size:9px;color:#f59e0b;margin-top:2px;">⚠ Heuristic, not proven: no tool can see rivals' bids, so there's no verified "win" bid. This is a fair, budget-friendly default. To change your aggressiveness, use the Settings menu.</div>` +
  // GPRO wiki (Staff_Markets, confirmed 2026-07-31): "Maximum of 4 total offers per market
  // (drivers and TDs combined)" - a real constraint worth surfacing here since it bears
  // directly on whether this specific offer is worth spending a slot on, not just its price.
  `<div style="font-size:9px;color:#6b7280;margin-top:2px;">You can have at most 4 open offers total (drivers + TDs combined) per market - spend slots on drivers you'd actually sign.</div>`);

  body(h);
  } catch (err) {
  body(mkRec(`<strong>Error:</strong> ${err.message}`, 'bad'));
  }
  }

  // ============================================================
  // INIT
  // ============================================================
  async function init() {
  const page = detectPage();
 if (!page) return;
 const PAGE_TITLES = {
 home: 'GPRO Dashboard',
 qualify1: 'Q1 Advisor',
 qualify2: 'Q2 Advisor',
 raceSetup: 'Race Advisor',
 updateCar: 'Car Advisor',
 staff: 'Staff Advisor',
 training: 'Training Advisor',
 marketDrivers: 'Driver Market Advisor',
 marketTDs: 'TD Market Advisor',
   negotiations: 'Sponsor Advisor',
   negotiateSponsor: 'Sponsor Negotiation Advisor',
   driverOffer: 'Driver Offer Advisor',
  };
 createPanel(PAGE_TITLES[page] || 'GPRO Strategy Tool');
 // Show loading progress
 const loadingMsgs = {
 home: 'Fetching Practice, Track, Driver, Office, Car, Testing...',
 qualify1: 'Fetching Practice, Track, Driver, Office, Car...',
 qualify2: 'Fetching Practice, Track, Driver, Office, Car...',
 raceSetup: 'Fetching Practice, Track, Testing, Driver, Office, Car...',
 updateCar: 'Fetching Car + Track data...',
 staff: 'Fetching Staff & Facilities data...',
 training: 'Parsing driver training data...',
 marketDrivers: 'Fetching available drivers...',
 marketTDs: 'Fetching available TDs...',
 negotiations: 'Loading sponsor data...',
 };
 body(`<div style="text-align:center;padding:26px 12px;">
 <div style="color:${PALETTE.text};font-size:13px;font-weight:700;margin-bottom:6px;">Loading ${PAGE_TITLES[page] || 'data'}...</div>
 <div style="color:${PALETTE.textMuted};font-size:10px;">${loadingMsgs[page] || 'Fetching data...'}</div>
 <div style="margin-top:14px;height:4px;background:${PALETTE.borderSoft};border-radius:4px;overflow:hidden;">
 <div style="height:100%;background:linear-gradient(90deg,${PALETTE.accent},${PALETTE.warm});animation:gpro-loading 1.4s ease-in-out infinite;border-radius:4px;width:55%;"></div>
 </div>
 </div>
 <style>@keyframes gpro-loading{0%{transform:translateX(-120%)}100%{transform:translateX(280%)}}</style>`);
 try {
 if (page === 'home') {
 await renderHome();
 } else if (page === 'qualify1' || page === 'qualify2') {
 // DOM-only for everything except Office (see below): weather + car setup/levels/wear are
 // directly readable off this exact page (Qualify.asp/Qualify2.asp show their own "Setup
 // related parts" table and weather widget). Track/Driver/Staff/Suppliers have no live-DOM
 // substitute on THIS page, but getDataDomOnly still resolves them from the DOM-fed stale
 // cache (populated by runPassiveCapture/backgroundCaptureAuxPages visiting/background-
 // fetching TrackDetails.asp/DriverProfile.asp/StaffAndFacilities.asp/Suppliers.asp) -
 // never a live API call. Office is the one confirmed exception: its fields (TD id, staff
 // conc/stress used in pit-time calc) have no DOM source anywhere on the site (checked
 // 2026-07-19 - see docs/page-structures.md), so it alone keeps the API fallback.
 const [practice, track, driver, office, staff, car, supplierData] = await Promise.all([
 getDataDomOnly('/Practice', buildLivePracticeDOM), getDataDomOnly('/TrackProfile'),
 getDataDomOnly('/DriProfile'), getDataSmart('/Office'), getDataDomOnly('/StaffAndFacilities'),
 getDataDomOnly('/UpdateCar', parseQualifyCarDOM), getDataDomOnly('/TyreSuppliers')
 ]);
 const supplier = resolveActiveSupplier(office, supplierData);
 const staffTd = await buildStaffTdInfo(office, staff);
 renderQualify(practice, track, driver, supplier, page === 'qualify2', mergeWithCachedCarData(car), staffTd);
 } else if (page === 'raceSetup') {
 // Same DOM-only policy as Qualify above, plus Testing (fuel-stint data) now has a real
 // parser (parseTestingDOM) fed by visiting/background-fetching Testing.asp, so it's
 // DOM-only too - Office remains the one confirmed no-DOM-source exception.
  const [practice, track, testing, driver, office, staff, car, supplierData, leagueInfo] = await Promise.all([
  getDataDomOnly('/Practice', buildLivePracticeDOM), getDataDomOnly('/TrackProfile'),
  getDataDomOnly('/Testing', parseTestingDOM), getDataDomOnly('/DriProfile'),
  getDataSmart('/Office'), getDataDomOnly('/StaffAndFacilities'), getDataDomOnly('/UpdateCar'),
  getDataDomOnly('/TyreSuppliers'), detectLeagueFresh()
  ]);
  const supplier = resolveActiveSupplier(office, supplierData);
  const staffTd = await buildStaffTdInfo(office, staff);
  renderRaceSetup(practice, track, testing, driver, supplier, mergeWithCachedCarData(car), staffTd, leagueInfo.league);
 } else if (page === 'updateCar') {
 // DOM-only for car data: UpdateCar.asp's own "Setup related parts" table already gives
 // levels/wear/cash/upgrade-options, and renderUpdateCar's own parseUpdateCarDOM() merge
 // always prefers DOM values anyway (see that function) - so starting from an empty/cached
 // base and letting the merge populate it skips a real API call entirely for a page we're
 // always physically on when this runs. getCachedCarData() (this project's separate
 // long-lived DOM-fed car cache, populated by prior visits to this same page) is the base
 // rather than {} purely for continuity if any single DOM field is momentarily unreadable.
  const [track, driver, leagueInfo] = await Promise.all([
  getDataDomOnly('/TrackProfile'), getDataDomOnly('/DriProfile'), detectLeagueFresh()
  ]);
  const car = getCachedCarData() || {};
  renderUpdateCar(car, track, driver, leagueInfo.league);
 } else if (page === 'staff') {
 // Real bug fixed 2026-07-19: this branch was fetching /Office, but staff skills and
 // facility levels live on /StaffAndFacilities (CLAUDE.md already documented this exact
 // /Office-vs-/StaffAndFacilities mix-up once before for a different call site - this one
 // had the same mistake, unnoticed because /Office's fields happened not to throw, they
 // just silently produced an all-undefined staff object). Now DOM-only via the expanded
 // parseStaffFacilitiesDOM (we're always physically on StaffAndFacilities.asp here).
  const [staff, leagueInfo] = await Promise.all([
  Promise.resolve(getDataDomOnly('/StaffAndFacilities', parseStaffFacilitiesDOM)),
  detectLeagueFresh(),
  ]);
  if (!staff) {
  body(mkRec('No staff/facilities data found on this page yet. If this page just loaded, wait a moment and click Retry.', 'warn') +
  `<div style="margin-top:8px;"><button id="gpro-retry" style="background:#374151;color:#d1d5db;border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;">Retry</button></div>`);
  setTimeout(() => { document.getElementById('gpro-retry')?.addEventListener('click', () => location.reload()); }, 100);
  return;
  }
  renderStaff(staff, leagueInfo.league);
  } else if (page === 'training') {
  const leagueInfo = await detectLeagueFresh();
  renderTraining(leagueInfo.league);
  } else if (page === 'marketDrivers' || page === 'marketTDs') {
  renderMarketPage(page === 'marketDrivers' ? 'drivers' : 'tds');
   } else if (page === 'negotiations') {
   renderSponsorOverview();
   } else if (page === 'negotiateSponsor') {
   renderNegotiateSponsor();
   } else if (page === 'driverOffer') {
   renderDriverOffer();
   }
 } catch (err) {
 body(mkRec(`<strong>Error:</strong> ${err.message}`, 'bad') +
 `<div style="margin-top:8px;display:flex;gap:6px;">` +
 `<button id="gpro-retry" style="background:#374151;color:#d1d5db;border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;">Retry</button>` +
 `<button id="gpro-cfg" style="background:#374151;color:#d1d5db;border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;">Settings</button></div>`);
 setTimeout(() => {
 document.getElementById('gpro-retry')?.addEventListener('click', init);
 document.getElementById('gpro-cfg')?.addEventListener('click', showTokenModal);
 }, 100);
 }
 }

 function createPanel(title) {
 injectGlobalStyles();
 const existing = document.getElementById('gpro-panel');
 if (existing) existing.remove();
 const panelTitle = title || 'GPRO Strategy Tool';
 const d = document.createElement('div');
 d.id = 'gpro-panel';
 d.setAttribute('style', ST.panel);
 d.innerHTML = `<div id="gpro-hdr" style="${ST.header}"><h3 style="${ST.headerH3}">${panelTitle}</h3><div style="display:flex;align-items:center;gap:2px;"><span id="gpro-col" class="gpro-icon-btn" style="font-size:14px;" title="Collapse/Expand">▼</span><span id="gpro-cls" class="gpro-icon-btn" style="font-size:16px;" title="Close">×</span></div></div><div id="gpro-bdy" style="${ST.body}"><div style="${ST.loading}">Loading data...</div></div>`;
 document.body.appendChild(d);
 // Collapse toggle
 const colBtn = document.getElementById('gpro-col');
 const bdy = document.getElementById('gpro-bdy');
 let collapsed = false;
 colBtn.addEventListener('click', () => {
 collapsed = !collapsed;
 bdy.style.transition = 'opacity 0.15s ease';
 bdy.style.opacity = collapsed ? '0' : '1';
 setTimeout(() => { bdy.style.display = collapsed ? 'none' : 'block'; }, collapsed ? 150 : 0);
 colBtn.textContent = collapsed ? '▶' : '▼';
 d.style.maxHeight = collapsed ? '50px' : '88vh';
 });
 // Close button
 document.getElementById('gpro-cls').addEventListener('click', () => {
 d.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
 d.style.opacity = '0';
 d.style.transform = 'translateY(-6px)';
 setTimeout(() => { d.style.display = 'none'; }, 150);
 });
 // Drag
 const hdr = document.getElementById('gpro-hdr');
 let ox, oy, drag = false;
 hdr.addEventListener('mousedown', e => { drag = true; ox = e.clientX - d.getBoundingClientRect().left; oy = e.clientY - d.getBoundingClientRect().top; e.preventDefault(); });
 document.addEventListener('mousemove', e => { if (!drag) return; d.style.left = (e.clientX - ox) + 'px'; d.style.top = (e.clientY - oy) + 'px'; d.style.right = 'auto'; });
 document.addEventListener('mouseup', () => drag = false);
 }

 function body(html) {
 const b = document.getElementById('gpro-bdy');
 if (b) b.innerHTML = html;
 }

 // ============================================================
 // SEASON OVERVIEW — loaded from gpro-data.js
 // ============================================================
 const _currentSeasonTracks = (D.seasons?.[D.currentSeason]?.tracks) || [];
 const SEASON_RACE_LIST = _currentSeasonTracks.map((name, i) => {
 const t = D.tracks?.[name] || {};
 return { id: i + 1, name, laps: t.laps || 0 };
 });
 const TRACK_PROFILES = {};
 if (D.tracks) {
 for (const [name, data] of Object.entries(D.tracks)) {
 TRACK_PROFILES[name] = { overtaking: data.overtaking || 'Normal', grip: data.grip || 'Normal', fuel: data.fuel || 'Medium', tyre: data.tyre || 'Medium', avgTemp: data.avgTemp, ctrGain: data.ctrGain, ctrRace: data.ctrRace, laps: data.laps, wearIntensity: D.trackWearIntensity?.[name] || 1.0 };
 }
 }

 async function renderSeasonOverview() {
 createPanel('Season Overview');
 body(`<div style="${ST.loading}">Loading season data...</div>`);
 try {
 // DOM-only here too (Season Overview only needs the current track's name) - same policy as
 // the rest of the tool.
 const practice = getDataDomOnly('/Practice', buildLivePracticeDOM);
 const track = getDataDomOnly('/TrackProfile');
 const currentTrack = (practice && practice.trackName) || (track && track.trackName) || '?';
 const currentRaceIdx = SEASON_RACE_LIST.findIndex(t => currentTrack.includes(t.name.split(' ')[0]));

 let h = '';
 h += mkSection('Season Overview', `<div style="font-size:10px;color:#9ca3af;">Current race: <strong style="color:#10b981;">${currentTrack}</strong> (Race #${currentRaceIdx + 1 || '?'})</div>`);

 // Season table - Overtaking/Grip/Tyre/Fuel/Avg Temp/CTR Gain are all season-level rollups
 // from GPRO Analyzer season data (GPRO_DATA.tracks via SEASON_TRACKS/TRACK_PROFILES), in the
 // spirit of our Season CTR/PHA/Weather/Wear/Fuel/Tyre tools (reviewed
 // 2026-07-19) - one combined table rather than separate pages per stat.
 const RATING_MAP = { 'Very Low': 0.2, 'Low': 0.4, 'Medium': 0.6, 'High': 0.8, 'Very High': 1.0 };
 let table = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:10px;">`;
 table += `<tr style="color:#60a5fa;font-weight:700;"><td style="padding:3px;">#</td><td>Track</td><td>Laps</td><td>OA</td><td>Grip</td><td>Tyre</td><td>Wear</td><td>Fuel</td><td>Strategy</td><td>Avg°C</td><td>CTR Gain</td><td>Status</td></tr>`;
 SEASON_RACE_LIST.forEach((t, i) => {
 const isCurrent = i === currentRaceIdx;
 const isPast = currentRaceIdx >= 0 && i < currentRaceIdx;
 const prof = TRACK_PROFILES[t.name] || {};
 const status = isCurrent ? '<span style="color:#10b981;font-weight:700;">▶ NOW</span>' : isPast ? '<span style="color:#6b7280;">done</span>' : '<span style="color:#60a5fa;">upcoming</span>';
 const bg = isCurrent ? '#10b98122' : 'transparent';
 const tR = RATING_MAP[prof.tyre] || 0.6;
 const fR = RATING_MAP[prof.fuel] || 0.6;
 const tC = tR >= 0.8 ? '#ef4444' : tR >= 0.6 ? '#f59e0b' : '#10b981';
 const fC = fR >= 0.8 ? '#ef4444' : fR >= 0.6 ? '#f59e0b' : '#10b981';
 const wi = prof.wearIntensity || 1.0;
 const wiC = wi >= 1.15 ? '#ef4444' : wi >= 1.05 ? '#f59e0b' : wi >= 0.95 ? '#10b981' : '#3b82f6';
 // Tire strategy recommendation (from Elite calibration data): high tyre wear → more stops/harder compound
 const tyreRating = prof.tyre || 'Medium';
 const recommendedCompound = tyreRating === 'Very High' ? 'Hard' : tyreRating === 'High' ? 'Medium' : tyreRating === 'Medium' ? 'Soft' : 'Soft';
 const estimatedStops = tyreRating === 'Very High' ? '3-4' : tyreRating === 'High' ? '2-3' : tyreRating === 'Medium' ? '1-2' : '1';
 const stratColor = tyreRating === 'Very High' ? '#ef4444' : tyreRating === 'High' ? '#f59e0b' : '#10b981';
 table += `<tr style="background:${bg};"><td style="padding:3px;color:#d1d5db;">${i + 1}</td><td style="color:#d1d5db;">${t.name}</td><td style="text-align:center;">${t.laps || prof.laps || '?'}</td><td style="text-align:center;color:#9ca3af;">${prof.overtaking || '?'}</td><td style="text-align:center;color:#9ca3af;">${prof.grip || '?'}</td><td style="text-align:center;color:${tC};">${mkInlineBar(tR, tC)}${prof.tyre || '?'}</td><td style="text-align:center;color:${wiC};">${mkInlineBar(wi / 1.5, wiC)}${wi.toFixed(2)}x</td><td style="text-align:center;color:${fC};">${mkInlineBar(fR, fC)}${prof.fuel || '?'}</td><td style="text-align:center;font-size:9px;"><span style="color:${stratColor};">${recommendedCompound}</span> <span style="color:#6b7280;">${estimatedStops}st</span></td><td style="text-align:center;color:#9ca3af;">${prof.avgTemp != null ? prof.avgTemp.toFixed(0) + '°' : '?'}</td><td style="text-align:center;color:#9ca3af;">${prof.ctrGain != null ? prof.ctrGain.toFixed(2) + 's/lap' : '?'}</td><td style="text-align:center;">${status}</td></tr>`;
 });
 table += `</table></div>`;
 h += mkSection('All 17 Races', table + `<span style="font-size:9px;color:#6b7280;">Track profiles from GPRO Analyzer season data. Bars show relative severity: <span style="color:#10b981;">Low</span> / <span style="color:#f59e0b;">Medium</span> / <span style="color:#ef4444;">High</span>. Wear is the per-track intensity multiplier (1.0x = average). CTR Gain is seconds/lap at CTR=100.</span>`);

 // Strategy note
 if (currentRaceIdx >= 0) {
 const remaining = SEASON_RACE_LIST.length - currentRaceIdx - 1;
 h += mkSection('Season Progress', `<div style="font-size:11px;color:#d1d5db;">Race ${currentRaceIdx + 1} of ${SEASON_RACE_LIST.length} • ${remaining} races remaining</div>`);
 }

 // Season weather patterns (from Elite seasonal analysis)
 // Shows temperature range and rain risk pattern across the season
 {
 const upcomingTracks = SEASON_RACE_LIST.slice(currentRaceIdx >= 0 ? currentRaceIdx : 0);
 const tempRange = upcomingTracks.map(t => {
 const prof = TRACK_PROFILES[t.name] || {};
 return prof.avgTemp || 25;
 });
 const minTemp = Math.min(...tempRange);
 const maxTemp = Math.max(...tempRange);
 const avgTemp = tempRange.reduce((a, b) => a + b, 0) / tempRange.length;
 const hotRaces = upcomingTracks.filter(t => (TRACK_PROFILES[t.name] || {}).avgTemp >= 30).length;
 const coldRaces = upcomingTracks.filter(t => (TRACK_PROFILES[t.name] || {}).avgTemp <= 10).length;
 let weatherNote = `Upcoming temps: ${minTemp.toFixed(0)}°C to ${maxTemp.toFixed(0)}°C (avg ${avgTemp.toFixed(0)}°C)`;
 if (hotRaces > 0) weatherNote += ` • ${hotRaces} hot race${hotRaces > 1 ? 's' : ''} (≥30°C)`;
 if (coldRaces > 0) weatherNote += ` • ${coldRaces} cold race${coldRaces > 1 ? 's' : ''} (≤10°C)`;
 const weatherColor = avgTemp >= 28 ? '#ef4444' : avgTemp >= 20 ? '#f59e0b' : '#10b981';
 h += mkSection('Season Weather Pattern', `<div style="font-size:10px;color:${weatherColor};padding:4px 8px;background:#1e293b;border-radius:4px;">🌡 ${weatherNote}</div>`);
 }

 // Fuel efficiency rating per track (from Elite fuel models)
 // Shows which tracks are most/least fuel efficient for planning
 {
 const fuelRatings = SEASON_RACE_LIST.map(t => {
 const prof = TRACK_PROFILES[t.name] || {};
 const fuelRating = prof.fuel || 'Medium';
 const fuelMap = { 'Very Low': 0.2, 'Low': 0.4, 'Medium': 0.6, 'High': 0.8, 'Very High': 1.0 };
 return { name: t.name, rating: fuelRating, value: fuelMap[fuelRating] || 0.6 };
 }).sort((a, b) => b.value - a.value);
 const topFuel = fuelRatings.slice(0, 3);
 const bottomFuel = fuelRatings.slice(-3).reverse();
 let fuelHtml = `<div style="font-size:9px;color:#d1d5db;">`;
 fuelHtml += `<div style="margin-bottom:4px;"><span style="color:#ef4444;">⛽ Most fuel-hungry:</span> ${topFuel.map(t => `<span style="color:#f59e0b;">${t.name.split(' ')[0]}</span> (${t.rating})`).join(', ')}</div>`;
 fuelHtml += `<div><span style="color:#10b981;">⛽ Most fuel-efficient:</span> ${bottomFuel.map(t => `<span style="color:#10b981;">${t.name.split(' ')[0]}</span> (${t.rating})`).join(', ')}</div>`;
 fuelHtml += `</div>`;
 h += mkSection('Fuel Efficiency Rating', fuelHtml);
 }

 body(h);
 } catch (err) {
 body(mkRec(`<strong>Error:</strong> ${err.message}`, 'bad'));
 }
 }

 // Sponsor negotiation-answer advice, following the pattern of our SponsorAdvisorService
 // (): that service's own docstring calls its question->characteristic mapping
 // "user-supplied, cross-checked against in-game text" - a analysis-derived heuristic, not an
 // officially confirmed formula, same status as our own heuristics elsewhere
 // (calcDriverStrategyRecommendation). Reimplemented independently from the established mapping
 // (not copied), flagged the same way in the UI. profile fields are 0-6 from the API
 // (NegoSignSponsorProfileResponse), +1 to match the 1-7 scale GPRO shows in-game.
 function calcSponsorAnswerAdvice(profile) {
 if (!profile) return null;
 const c = {
  finances: (parseInt(profile.finances) || 0) + 1,
  expectations: (parseInt(profile.expectations) || 0) + 1,
  patience: (parseInt(profile.patience) || 0) + 1,
  reputation: (parseInt(profile.reputation) || 0) + 1,
  image: (parseInt(profile.image) || 0) + 1,
  negotiation: (parseInt(profile.negotiation) || 0) + 1,
 };
 // Use scraped sponsor answers from gproanalyzer.info as source of truth
 const sa = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.sponsorAnswers) || {};
 const carSpotFor = (image) => (sa.carSpot && sa.carSpot[image]) || (image <= 1 ? 'Front wing' : image === 2 ? 'Rear wing' : image === 3 ? 'Nose' : image <= 5 ? 'Sidepods' : 'Engine cover');
 const expectationFor = (exp) => (sa.expectations && sa.expectations[exp]) || (exp <= 2 ? 'Relegate with cash' : exp <= 4 ? 'Low table position' : exp === 5 ? 'Mid table position' : 'Promotion / top 4 / championship win');
 const popularityFor = (image) => (sa.popularity && sa.popularity[image]) || (image <= 2 ? 'My driver is hated by the fans' : image <= 4 ? 'My driver is not very popular with the fans' : image === 5 ? 'My driver is liked by the fans' : image === 6 ? 'My driver is quite popular with the fans' : 'My driver is a favourite of the fans');
 const amountFor = (pat) => (sa.amount && sa.amount[pat]) || (pat <= 2 ? 'OK' : pat <= 4 ? 'A bit too low' : pat <= 6 ? 'Far too low' : 'Unacceptable');
 const durationFor = (pat) => (sa.duration && sa.duration[pat]) || (pat <= 4 ? 'OK' : pat <= 6 ? 'A bit too low' : 'Far too low');
 return {
  characteristics: c,
  answers: {
  'Which area of the car would our advertisement be placed on?': carSpotFor(c.image),
  'What are you expecting to achieve next season?': expectationFor(c.expectations),
  'How popular is your driver with the fans?': popularityFor(c.image),
  'What do you think of the amount per race we proposed?': amountFor(c.patience),
   'What do you think of the contract duration we proposed?': durationFor(c.patience),
   },
  };
 }

 // ============================================================
 // RENDER: NEGOTIATE SPONSOR (NegotiateSponsor.asp)
 // ============================================================
 // Live-advisor shown when the manager is actually on a single sponsor's
 // negotiation page. Reads the questions the sponsor is asking (DOM parse),
 // then recommends the ideal answer for each, weighing:
 //   * the sponsor's own characteristics (finances/expectations/patience/image)
 //   * the manager's league ambition (from current league + where promotion/
 //     relegation sit) so e.g. "what do you expect next season?" matches a
 //     realistic goal rather than a generic pick.
 // Backend reason, simple copy-answer UI.
 async function renderNegotiateSponsor() {
 createPanel('Sponsor Negotiation Advisor');
 body(`<div style="${ST.loading}">Reading negotiation...</div>`);
 try {
 const data = parseNegotiateSponsorDOM(document);
 if (!data || !data.questions.length) {
  body(mkRec('No negotiation questions found on this page. If this just loaded, wait a moment and click Retry.', 'warn') +
   `<div style="margin-top:8px;"><button id="gpro-retry" style="background:#374151;color:#d1d5db;border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;">Retry</button></div>`);
  setTimeout(() => { document.getElementById('gpro-retry')?.addEventListener('click', () => location.reload()); }, 100);
  return;
 }
 let h = '';
 const sc = data.characteristics || {};
 h += mkSection('Sponsor', mkRow('Sponsor', data.sponsorName || '?') +
  (data.progress ? mkRow('Negotiation Progress', `${data.progress}%`) : ''));

 // Show all 6 sponsor characteristics up front so the user can see they drive the advice.
 const charOrder = [
  ['finances', 'Finances'], ['expectations', 'Expectations'], ['patience', 'Patience'],
  ['reputation', 'Reputation'], ['image', 'Image'], ['negotiation', 'Negotiation'],
 ];
 const hasChars = charOrder.some(([k]) => sc[k] != null);
 if (hasChars) {
  let charHtml = '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
  charOrder.forEach(([k, label]) => {
   const v = sc[k];
   const color = v == null ? '#6b7280' : v >= 6 ? '#10b981' : v >= 4 ? '#f59e0b' : '#ef4444';
   charHtml += `<div style="padding:3px 7px;background:#1e293b;border-radius:4px;font-size:9px;border:1px solid #334155;"><span style="color:#9ca3af;">${label}:</span> <span style="color:${color};font-weight:700;">${v ?? '?'}</span><span style="color:#6b7280;">/7</span></div>`;
  });
  charHtml += '</div>';
  h += mkSection('Sponsor Profile (characteristics)', charHtml +
   `<span style="font-size:9px;color:#6b7280;">Each is a 1-7 scale. Higher finances/reputation = deeper pockets/prestige; higher negotiation = tougher to please; higher expectations = wants more from you; lower patience = answer & move fast. These drive every reply below.</span>`);
 }

  // Manager's realistic season goal (context for "what to expect next season").
  // Trains off current league + its target OA / promotion posture so the pick is
  // grounded in the manager's own ambition, not a coin-flip.
  const leagueInfo = await detectLeagueFresh();
  const league = leagueInfo.league || (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.currentLeague) || 'Amateur';
 const lgCfg = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.leagues) ? GPRO_DATA.leagues[league] : null;
 const managerGoal = lgCfg && lgCfg.resetsEachSeason
  ? 'Promotion / top 4 / championship win'
  : 'Mid table position / consolidate';
 const sa = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.sponsorAnswers) || {};
 const c = data.characteristics || {};

 h += mkSection('Recommended Answers',
  data.questions.map(q => {
   // Map sponsor characteristics -> chosen answer, adjusted by manager context.
   let answer = '';
   let why = '';
   if (q.question.includes('Which area of the car')) {
   const image = c.image || 4;
   answer = (sa.carSpot && sa.carSpot[image]) || (image <= 1 ? 'Front wing' : image === 2 ? 'Rear wing' : image === 3 ? 'Nose' : image <= 5 ? 'Sidepods' : 'Engine cover');
   why = `Sponsor's image characteristic is ${image}; place the ad where they want it to maximise the deal.`;
   } else if (q.question.includes('expecting to achieve')) {
   // Match the answer to the sponsor's expectation characteristic where available,
   // else fall back to the manager's realistic goal.
   const exp = c.expectations;
   answer = (exp && sa.expectations && sa.expectations[exp]) ? sa.expectations[exp] : managerGoal;
   why = exp
   ? `Sponsor's expectation level is ${exp}/7 - answer to match so the negotiation keeps progressing.${c.finances >= 6 ? ' They have deep pockets (finances ' + c.finances + '/7), so promising a strong finish is credible.' : ''}`
   : `Based on your ${league} league posture: ${answer.toLowerCase()} is a realistic, credible goal.`;
   } else if (q.question.includes('popular is your driver')) {
   // Reputation + driver charisma weigh how the sponsor perceives your driver's appeal.
   const popularity = c.image || 4;
   answer = (sa.popularity && sa.popularity[popularity]) || 'My driver is not very popular with the fans';
   const reputationNote = c.reputation >= 6 ? ` High sponsor reputation (${c.reputation}/7) means they care about image - frame your driver positively.` : (c.reputation != null ? ` Sponsor reputation ${c.reputation}/7.` : '');
   why = `Chosen from the sponsor's image/perception rating.${reputationNote}`;
   } else if (q.question.includes('amount per race')) {
   const pat = c.patience;
   answer = (sa.amount && sa.amount[pat]) || 'A bit too low';
   why = `Sponsor patience is ${pat}/7; the amount answer tracks their patience to keep the deal alive. Mixture of finances ${c.finances ?? '?'} and negotiation ${c.negotiation ?? '?'} shows how hard you can push on money.`;
   } else if (q.question.includes('contract duration')) {
   const pat = c.patience;
   answer = (sa.duration && sa.duration[pat]) || 'OK';
   why = `Sponsor patience is ${pat}/7; a patient sponsor accepts longer terms, an impatient one wants a short commitment. Negotiation ${c.negotiation ?? '?'}/7 shows how much room you have.`;
   } else {
   answer = 'Match the sponsor\u2019s stated preference (consistent with your plans)';
   why = 'No specific guidance matched this question - answer honestly and consistently to protect reputation.';
   }
   return `<div style="margin:6px 0;padding:6px;background:#1e293b;border-radius:4px;">` +
    `<div style="font-size:10px;color:#60a5fa;font-weight:700;margin-bottom:2px;">${q.question}</div>` +
    `<div style="font-size:11px;color:#10b981;font-weight:600;">Ideal reply: ${answer}</div>` +
    `<div style="font-size:9px;color:#6b7280;margin-top:2px;">${why}</div>` +
    (q.options && q.options.length ? `<div style="font-size:9px;color:#9ca3af;margin-top:3px;">Options: ${q.options.join(' • ')}</div>` : '') +
    `</div>`;
  }).join('') +
  `<span style="font-size:9px;color:#f59e0b;">Answering before the next race keeps the negotiation moving; answer honestly and consistently to protect reputation.</span>`);

 body(h);
 } catch (err) {
 body(mkRec(`<strong>Error:</strong> ${err.message}`, 'bad'));
 }
 }

 // ============================================================
 // RENDER: SPONSOR OVERVIEW (menu command, /NegOverview)
 // ============================================================
 // Surfaces GPRO's own /NegOverview data (car spots, ongoing negotiations, recent sponsor
 // messages), plus a per-sponsor negotiation-answer suggestion (calcSponsorAnswerAdvice) for any
 // negotiation GPRO itself flags as needing attention - fetched via /NegotiateSponsor?id=, one
 // call per flagged negotiation (bounded by GPRO's own maxNegotiations, typically <=5). The
 // suggestion is explicitly labelled as a analysis-derived heuristic (see
 // calcSponsorAnswerAdvice), not an officially confirmed formula.
 async function renderSponsorOverview() {
 createPanel('Sponsor Overview');
 body(`<div style="${ST.loading}">Loading sponsor data...</div>`);
 try {
 // Use getDataSmart for graceful fallback to cached data if token is expired
 const neg = await getDataSmart('/NegOverview').catch(() => ({}));
 if (!neg || !neg.carSpots) {
  body(mkRec('No sponsor data available. Visit NegotiationsOverview.asp once to capture data, or check your API token.', 'warn'));
  return;
 }
 let h = '';

 const spots = neg.carSpots || [];
 const taken = neg.carSpotsTaken != null ? neg.carSpotsTaken : spots.filter(s => s.sponsorId).length;
 const negsForBoard = neg.ongNegs || [];
 const attentionCount = negsForBoard.filter(n => n.attention).length;
 h += mkDecisionBoard([
 spots.length ? { id: 'gpro-sec-sponsor-spots', label: 'Car Spots', verdict: `${taken}/${spots.length}`, tone: taken === spots.length ? 'good' : taken === 0 ? 'bad' : 'warn' } : null,
 { id: 'gpro-sec-sponsor-negs', label: 'Negotiations', verdict: negsForBoard.length ? `${negsForBoard.length} active` : 'none', tone: attentionCount > 0 ? 'warn' : 'info' },
 ]);
 let spotsTable = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:10px;">`;
 spotsTable += `<tr style="color:#60a5fa;font-weight:700;"><td style="padding:3px;">Car Spot</td><td>Sponsor</td><td>Amount</td><td>Races Left</td><td>Satisfaction</td></tr>`;
 spots.forEach(s => {
 const empty = !s.sponsorId;
 const bg = empty ? 'transparent' : '#10b98111';
 spotsTable += `<tr style="background:${bg};"><td style="padding:3px;color:#d1d5db;">${s.carSpotName || '?'}</td><td style="color:${empty ? '#6b7280' : '#f9fafb'};">${empty ? '(empty)' : s.name}</td><td style="text-align:center;color:#9ca3af;">${empty ? '-' : (typeof s.amount === 'number' ? '$' + s.amount.toLocaleString() : s.amount)}</td><td style="text-align:center;color:#9ca3af;">${s.racesLeft}</td><td style="text-align:center;color:#9ca3af;">${s.satisfaction}</td></tr>`;
 });
 spotsTable += `</table></div>`;
 h += mkSection(`Car Spots (${taken}/${spots.length} filled)`, spotsTable, 'gpro-sec-sponsor-spots');

 const negs = neg.ongNegs || [];
 if (negs.length) {
 let negTable = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:10px;">`;
 negTable += `<tr style="color:#60a5fa;font-weight:700;"><td style="padding:3px;">Sponsor</td><td>Spot</td><td>Amount</td><td>Duration</td><td>Progress</td><td>Priority</td><td>Contested</td></tr>`;
 negs.forEach(n => {
 const needsAttention = !!n.attention;
 negTable += `<tr style="${needsAttention ? 'background:#f59e0b22;' : ''}"><td style="padding:3px;color:#d1d5db;">${needsAttention ? '⚠️ ' : ''}${n.name}</td><td style="color:#9ca3af;">${n.carSpotName || '?'}</td><td style="text-align:center;color:#9ca3af;">${typeof n.amount === 'number' ? '$' + n.amount.toLocaleString() : n.amount}</td><td style="text-align:center;color:#9ca3af;">${n.duration}</td><td style="text-align:center;color:#9ca3af;">${n.progress}</td><td style="text-align:center;color:#9ca3af;">${n.priority}</td><td style="text-align:center;color:#9ca3af;">${n.contested}</td></tr>`;
 });
 negTable += `</table></div>`;
 h += mkSection('Ongoing Negotiations', negTable + `<span style="font-size:9px;color:#6b7280;">⚠️ = GPRO flags this negotiation as needing your attention (a question is pending or progress stalled).</span>`, 'gpro-sec-sponsor-negs');

 // Per-sponsor negotiation-answer advice - only for negotiations GPRO itself flags as
 // needing attention, one API call each (bounded by GPRO's maxNegotiations, usually <=5).
 const flagged = negs.filter(n => n.attention && n.sponsorId);
 if (flagged.length) {
 const profiles = await Promise.all(flagged.map(n =>
 getDataSmart(`/NegotiateSponsor?id=${n.sponsorId}`).catch(() => null)
 ));
 let adviceHtml = '';
 flagged.forEach((n, i) => {
 const advice = calcSponsorAnswerAdvice(profiles[i]);
 if (!advice) return;
 adviceHtml += `<div style="margin:6px 0;padding:6px;background:#1e293b;border-radius:4px;">`;
 adviceHtml += `<div style="color:#60a5fa;font-weight:700;font-size:11px;margin-bottom:4px;">${n.name}</div>`;
 Object.entries(advice.answers).forEach(([q, a]) => {
 adviceHtml += mkRow(q, `<strong style="color:#10b981;">${a}</strong>`);
 });
 adviceHtml += `</div>`;
 });
 if (adviceHtml) {
 h += mkSection('Suggested Negotiation Answers', adviceHtml +
 `<div style="font-size:9px;color:#f59e0b;margin-top:4px;">analysis-derived heuristic (our own established mapping) - not an officially confirmed GPRO formula. Only shown for questions actually pending; GPRO doesn't always ask all 5.</div>`,
 'gpro-sec-sponsor-advice');
 }
 }
 } else {
 h += mkSection('Ongoing Negotiations', mkRec('No active negotiations.', 'info'));
 }

 const comms = neg.comms || [];
 if (comms.length) {
 let commsHtml = '';
 comms.slice(0, 10).forEach(c => {
 commsHtml += `<div style="font-size:10px;color:#d1d5db;margin:4px 0;padding-left:6px;border-left:2px solid #374151;">${c.msg}<div style="font-size:9px;color:#6b7280;">${c.dt || ''}${c.season ? ` - S${c.season} R${c.race}` : ''}</div></div>`;
 });
 h += mkSection('Recent Sponsor Messages', commsHtml);
 }

 h += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">Car spots/negotiations/messages are GPRO's own data. Negotiation-answer suggestions (above, when shown) are a analysis-derived heuristic, not an officially confirmed formula - use judgment.</div>`;

 body(h);
 wireDecisionBoard();
 } catch (err) {
 body(mkRec(`<strong>Error:</strong> ${err.message}`, 'bad'));
 }
 }

  // ============================================================
  // RENDER: DRIVER & TD MARKET (menu command, /AvailDrivers + /AvailTDs)
  // ============================================================
  // Read-only market browser. Default (unauthenticated-filter) response only: /AvailDrivers and
  // /AvailTDs support skill/range filtering but those query params are GPRO-Supporters-only per
  // the API spec, so this shows GPRO's own default page (OA-descending, ~20 results, capped at
  // the token account's league). Value column is plain arithmetic (OA per $1M salary).
  // DOM-only parser - per user request these must never call the API. Matches table columns by
  // header text (multiple fallback spellings) since column order/labels haven't been captured
  // live for every league. UNVERIFIED against a live page, flag if wrong.
  function parseAvailListDOM(root, idKey) {
 root = root || document;
 try {
 const table = Array.from(root.querySelectorAll('table')).find(t => /Overall|OA/i.test(t.textContent) && t.querySelector('a[href*="ID="]'));
 if (!table) return null;
 const headerCells = Array.from(table.querySelectorAll('tr')[0] ? table.querySelectorAll('tr')[0].querySelectorAll('th,td') : []);
 const colFor = (labels) => headerCells.findIndex(c => labels.some(l => c.textContent.trim().toLowerCase().replace(/[.:]/g, '') === l));
 const idxOA = colFor(['overall', 'oa']);
 const idxAge = colFor(['age']);
 const idxSignFee = colFor(['minimal signing fee', 'signing fee', 'sign fee']);
 const idxSalary = colFor(['minimal salary', 'salary']);
 const idxOffers = colFor(['offers']);
 const rows = [];
 table.querySelectorAll('tr').forEach((tr, i) => {
 if (i === 0) return; // header row
 const link = tr.querySelector('a[href*="ID="]');
 if (!link) return;
 const idMatch = link.getAttribute('href').match(/ID=(\d+)/i);
 if (!idMatch) return;
 const cells = tr.querySelectorAll('td');
 const cellText = (idx) => (idx >= 0 && cells[idx]) ? cells[idx].textContent.trim() : null;
 const row = { name: link.textContent.trim() };
 row[idKey] = parseInt(idMatch[1]);
 row.OA = cellText(idxOA);
 row.age = cellText(idxAge);
 row.signFee = cellText(idxSignFee);
 row.salary = cellText(idxSalary);
 row.offers = cellText(idxOffers);
 // Captured so full-stat scraping can discover the real TD profile page URL from the live
 // link itself instead of guessing it (driver profile URL - DriverProfile.asp - is already
 // confirmed elsewhere in this file; TD's was not, until now).
 row.profileHref = link.getAttribute('href');
 rows.push(row);
 });
  return rows.length ? rows : null;
  } catch (e) { return null; }
  }

  // Safety cap on how many market pages fetchRemainingMarketPages will auto-fetch. GPRO pages the
  // market list at ~20 rows/page with no page-count exposed anywhere on the page itself, so "the
  // next page came back empty" is the only reliable stop signal - this cap just guards against that
  // signal never firing (a parser bug, an unexpected page format) looping forever. 15 pages covers
  // ~300 candidates, comfortably above any real league's market size.
  const MARKET_PAGE_FETCH_MAX = 15;

  // Fetches every remaining page of the market list in the background so the shortlist/filter bar
  // covers the WHOLE market, not just whichever page the user happened to land on. Real user
  // complaint (2026-08-11): "why can the filter not filter out every driver... it clearly only
  // filters the drivers on that page" - clicking Apply on AvailDrivers.asp used to only ever see
  // that one page's ~20 rows, so a candidate who'd pass the filter but happened to sit on page 3
  // was invisible unless the user manually paged there first and re-applied. Page 1 is the live DOM
  // already parsed by the caller. Probes page 2 alone first (most leagues' markets fit on a single
  // page, so this avoids firing a whole batch of requests that would all come back empty in the
  // common case); once page 2 proves non-empty, continues in NET_CONCURRENCY-bounded batches (same
  // politeness pattern as scanCandidatesFullStats), stopping the moment any page in a batch comes
  // back with zero rows - real HTTP page loads, never the API, so this never touches the per-race
  // token budget.
  async function fetchRemainingMarketPages(type, idKey) {
  const basePath = type === 'drivers' ? 'AvailDrivers.asp' : 'AvailTechDirectors.asp';
  const fetchOnePage = async (p) => {
  try {
  const html = await fetchPageHTML(`${basePath}?Page=${p}`);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return parseAvailListDOM(doc, idKey);
  } catch (e) { logError(`market page ${p} fetch failed:`, e.message); return null; }
  };
  const collected = [];
  const page2 = await fetchOnePage(2);
  if (!page2 || !page2.length) return collected;
  collected.push(...page2);
  let page = 3;
  while (page <= MARKET_PAGE_FETCH_MAX) {
  const batchPages = [];
  for (let i = 0; i < NET_CONCURRENCY && (page + i) <= MARKET_PAGE_FETCH_MAX; i++) batchPages.push(page + i);
  const results = await mapLimit(batchPages, NET_CONCURRENCY, fetchOnePage);
  let hitEmpty = false;
  results.forEach((r) => {
  const rows = r.status === 'fulfilled' ? r.value : null;
  if (rows && rows.length) collected.push(...rows);
  else hitEmpty = true;
  });
  if (hitEmpty) break;
  page += batchPages.length;
  }
  return collected;
  }

  // Accumulates market-list rows across page visits instead of letting each visit clobber the
  // previous one. GPRO's market list is paginated, so paging through the whole market must merge
  // each page into the stale cache by ID - otherwise the menu command (renderMarketOverview) could
  // only ever show the LAST page visited. Incoming rows win for a duplicate ID (fresh salary/
  // offers/retiring flags are the newest reading), but rows not present on the current page are
  // kept, not dropped. Added 2026-08-10.
  function mergeMarketRows(existing, incoming, idKey) {
  const byId = new Map();
  (existing || []).forEach((r) => { if (r && r[idKey] != null) byId.set(r[idKey], r); });
  (incoming || []).forEach((r) => { if (r && r[idKey] != null) byId.set(r[idKey], r); });
  return Array.from(byId.values());
  }

  function mkMarketTable(rows, idKey, targetOA) {
 let t = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:10px;">`;
 t += `<tr style="color:#60a5fa;font-weight:700;"><td style="padding:3px;">Name</td><td>Nat</td><td>OA</td><td>Age</td><td>Salary</td><td>Sign Fee</td><td>Offers</td><td>Value</td>${targetOA ? '<td>Match</td>' : ''}</tr>`;
 // Sort by OA descending for better visibility
 const sorted = [...rows].sort((a, b) => (parseFloat(b.OA) || 0) - (parseFloat(a.OA) || 0));
 sorted.forEach(r => {
 const oa = parseFloat(r.OA) || 0;
 const salaryM = parseGproCash(r.salary) / 1e6;
 const value = salaryM > 0 ? (oa / salaryM).toFixed(1) : '-';
 const nameCell = (idKey === 'driId' && r.driId)
 ? `<a href="DriverProfile.asp?ID=${r.driId}" style="color:#d1d5db;text-decoration:underline;">${esc(r.name)}</a>`
 : esc(r.name);
 // Auto-match against target OA range
 let matchCell = '';
 if (targetOA) {
 const inRange = oa >= targetOA.min && oa <= targetOA.max;
 const matchColor = inRange ? '#10b981' : oa < targetOA.min ? '#f59e0b' : '#ef4444';
 const matchLabel = inRange ? '✅' : oa < targetOA.min ? `-${targetOA.min - oa}` : `+${oa - targetOA.max}`;
 matchCell = `<td style="text-align:center;color:${matchColor};font-weight:600;font-size:9px;">${matchLabel}</td>`;
 }
 t += `<tr style="${targetOA && oa >= targetOA.min && oa <= targetOA.max ? 'background:rgba(16,185,129,0.08);' : ''}"><td style="padding:3px;color:#d1d5db;">${nameCell}${r.retiring === '1' || r.retiring === true ? ' 🕐' : ''}</td><td style="text-align:center;color:#9ca3af;">${r.natCode || '?'}</td><td style="text-align:center;color:#10b981;font-weight:700;">${r.OA}</td><td style="text-align:center;color:#9ca3af;">${r.age}</td><td style="text-align:center;color:#9ca3af;">${r.salary}</td><td style="text-align:center;color:#9ca3af;">${r.signFee}</td><td style="text-align:center;color:#9ca3af;">${r.offers}</td><td style="text-align:center;color:#60a5fa;">${value}</td>${matchCell}</tr>`;
 });
 t += `</table></div>`;
 return t;
 }

 // Extracts a numeric floor from a target string like '200+' -> 200, '150-200' -> 150,
 // '0-49' -> 0 (a no-op floor - always passes). Qualitative strings ('as high as affordable',
 // 'track-dependent') return null, meaning "no sourced numeric threshold to filter on".
 function parseMinFromTarget(targetStr) {
 if (typeof targetStr !== 'string') return null;
 const m = targetStr.match(/^(\d+)/);
 return m ? parseInt(m[1]) : null;
 }

 // Extracts a numeric ceiling from a target string like '0-49' -> 49, '150-200' -> 200,
 // '200' -> 200. For "keep low" attributes (aggressiveness, stamina - dir:'max' fields) the
 // meaningful sourced number is the UPPER bound of the range, not the lower one (which is usually
 // just 0 and would be a no-op). '200+' has no upper bound and returns null, same as qualitative
 // strings.
 function parseMaxFromTarget(targetStr) {
 if (typeof targetStr !== 'string') return null;
 const m = targetStr.match(/(\d+)\s*$/);
 return m ? parseInt(m[1]) : null;
 }

 // ============================================================
 // CUSTOM FILTER BAR (2026-08-11, explicit user request) - GPRO gates its own per-attribute
 // market filters (Con/Tal/Agr/Exp/TechI/Sta/Cha/Mot/Rep/Wei/Age/Min salary/Offers, visible on
 // AvailDrivers.asp/AvailTechDirectors.asp) behind Supporter status. This replicates the same
 // filtering client-side, for free, over whatever's currently loaded - no Supporter account
 // needed. `dir:'max'` fields (Age/Salary/Offers/Aggressiveness/Weight) are "lower is better,
 // keep below"; `dir:'min'` fields are "higher is better, keep above" - matches the direction
 // GPRO's own UI implies for each column and D.driverSelection's existing keep-low/keep-high
 // targets (e.g. aggressiveness '0-49').
 // ============================================================
 const BASE_FILTER_FIELDS = [
 { key: 'age', label: 'Age', dir: 'max', needsScan: false, get: (r) => parseInt(r.age) || null },
 { key: 'salary', label: 'Salary ($k)', dir: 'max', needsScan: false, scale: 1000, get: (r) => { const v = parseGproCash(r.salary); return v > 0 ? v : null; } },
 { key: 'offers', label: 'Offers', dir: 'max', needsScan: false, get: (r) => parseInt(r.offers) },
 ];
 const DRIVER_ATTR_FILTER_FIELDS = [
 { key: 'concentration', label: 'Con', dir: 'min', needsScan: true },
 { key: 'talent', label: 'Tal', dir: 'min', needsScan: true },
 { key: 'aggressiveness', label: 'Agr', dir: 'max', needsScan: true },
 { key: 'experience', label: 'Exp', dir: 'min', needsScan: true },
 { key: 'techInsight', label: 'Tech', dir: 'min', needsScan: true },
 { key: 'stamina', label: 'Sta', dir: 'min', needsScan: true },
 { key: 'charisma', label: 'Cha', dir: 'min', needsScan: true },
 { key: 'motivation', label: 'Mot', dir: 'min', needsScan: true },
 { key: 'reputation', label: 'Rep', dir: 'min', needsScan: true },
 { key: 'weight', label: 'Wei', dir: 'max', needsScan: true },
 ];
 const TD_ATTR_FILTER_FIELDS = [
 { key: 'leadership', label: 'Lead', dir: 'min', needsScan: true },
 { key: 'mechanics', label: 'Mech', dir: 'min', needsScan: true },
 { key: 'electronics', label: 'Elec', dir: 'min', needsScan: true },
 { key: 'aerodynamics', label: 'Aero', dir: 'min', needsScan: true },
 { key: 'pitCoord', label: 'PitCo', dir: 'min', needsScan: true },
 { key: 'motivation', label: 'Mot', dir: 'min', needsScan: true },
 ];
 function filterFieldsFor(idKey) {
 return BASE_FILTER_FIELDS.concat(idKey === 'driId' ? DRIVER_ATTR_FILTER_FIELDS : TD_ATTR_FILTER_FIELDS);
 }

 // Renders the filter bar's number inputs. Real bug fixed 2026-08-11: attribute fields used to be
 // disabled/unfillable until a SEPARATE "Scan Full Stats" button had already been clicked - "half
 // the filters can't even be filled out" was the exact complaint. Every field is now always
 // fillable; Apply Filters (see applyFilterBar below) scans automatically the first time it's
 // needed, so filling in e.g. a Concentration minimum and clicking Apply just works in one step
 // instead of requiring a separate scan-then-filter sequence.
 // `defaults` (added 2026-08-11, per explicit user request) pre-fills each field's starting value
 // from this league's sourced minimums (D.driverSelection[league].attributes / maxSalary / maxAge
 // etc, built by the caller) - but every input stays a plain editable <input>, so the user can
 // change or blank out any value before clicking Apply. This replaces the old behaviour where those
 // same sourced minimums were silently re-enforced as a fixed, non-editable backend gate (see
 // mkFullStatsTable).
 function mkFilterBar(sectionId, idKey, defaults) {
 const fields = filterFieldsFor(idKey);
 const d = defaults || {};
 const inputs = fields.map((f) => {
 const dv = d[f.key];
 const valueAttr = (dv != null && isFinite(dv)) ? ` value="${dv}"` : '';
 return `<div style="display:flex;flex-direction:column;gap:1px;min-width:52px;">
 <label style="font-size:8px;color:${PALETTE.textDim};">${esc(f.label)} ${f.dir === 'max' ? '≤' : '≥'}</label>
 <input type="number" data-filter-field="${f.key}" placeholder="any"${valueAttr} style="width:100%;background:${PALETTE.bgCard};color:${PALETTE.text};border:1px solid ${PALETTE.border};border-radius:4px;padding:2px 4px;font-size:10px;">
 </div>`;
 }).join('');
 return `<div id="gpro-filterbar-${sectionId}" style="margin:6px 0;padding:7px 8px;background:${PALETTE.bgCard};border:1px solid ${PALETTE.borderSoft};border-radius:8px;">
 <div style="font-size:9px;color:${PALETTE.textDim};margin-bottom:5px;">Custom filters (replaces GPRO's Supporter-only market filters - free here). Pre-filled with this league's sourced minimums where known - change any value freely, or clear it to drop that constraint. Con/Tal/etc trigger a one-time profile scan automatically the first time you apply one.</div>
 <div style="display:flex;flex-wrap:wrap;gap:6px;">${inputs}</div>
 <button id="gpro-filterapply-${sectionId}" style="width:100%;margin-top:6px;background:${PALETTE.accent};color:#fff;border:none;padding:5px;border-radius:6px;cursor:pointer;font-size:10px;font-weight:600;">Apply Filters</button>
 <div id="gpro-filterstatus-${sectionId}" style="font-size:9px;color:${PALETTE.textDim};margin-top:4px;"></div>
 </div>`;
 }

 // Pure filter: keeps rows passing every field the user actually entered a value for. Fields
 // needing a scan are skipped entirely for rows with no fullStats yet (rather than treating
 // "unknown" as a fail, which would silently hide every un-scanned candidate).
 function applyCustomFilters(rows, idKey, values) {
 const fields = filterFieldsFor(idKey);
 return rows.filter((r) => fields.every((f) => {
 const raw = values[f.key];
 if (raw === undefined || raw === null || raw === '') return true;
 const threshold = parseFloat(raw) * (f.scale || 1);
 if (isNaN(threshold)) return true;
 const actual = f.get ? f.get(r) : (r.fullStats ? r.fullStats[f.key] : null);
 if (actual === null || actual === undefined || isNaN(actual)) return true; // unknown -> don't exclude
 return f.dir === 'max' ? actual <= threshold : actual >= threshold;
 }));
 }

 // Real bug fixed 2026-07-27: GPRO's own default market page is ALREADY sorted descending and
 // capped near the league's max OA ("A request with no query parameters will return... descending
 // order, with an OA range which upper limit is the maximum OA of the Token's account league" -
 // gpro-public-api.yml), so an OA-range filter alone barely narrows anything - almost every listed
 // row is already near the top of the allowed range by construction. Per user request, minimum
 // filtering now happens on REAL scraped attributes (concentration/talent/etc for drivers,
 // leadership/etc for TDs) instead, via the numeric floors in D.driverSelection[league].attributes/
 // D.tdSelection[league].skills where a numeric target exists (see parseMinFromTarget). The OA
 // range and cash balance are still shown as context but no longer gate what's shown - they're not
 // the real bottleneck once actual attributes are available.
 function mkShortlistSection(rows, idKey, targetOA, cash, league, cfgLabel, sectionId, priorityEntries) {
 if (!rows.length) return '';
 if (!targetOA) {
 return mkMarketTable(rows, idKey, targetOA) +
 `<div style="font-size:9px;color:#f59e0b;margin-top:4px;">No ${cfgLabel} guidance calibrated yet for ${league || 'your'} league - showing the full unfiltered list.</div>`;
 }
  // Politeness cap on real page fetches per scan - not an API budget concern, but still real
  // traffic against gpro.net, so bounded regardless of how many rows the market lists. Sort by OA
  // desc BEFORE capping so accumulation never pushes the best candidates out of scan range - GPRO
  // lists pages OA-descending, but merged rows arrive in page-visit order, which can interleave.
  const sortedByOA = [...rows].sort((a, b) => (parseFloat(b.OA) || 0) - (parseFloat(a.OA) || 0));
  const capped = sortedByOA.slice(0, MARKET_SCAN_MAX);
  // Direction-aware sourced defaults (fixed 2026-08-11): 'min' fields (concentration, talent, exp,
  // techInsight...) read the LOWER bound of the target range ('90-150' -> 90); "keep low" fields
  // (aggressiveness, stamina - dir:'max') read the UPPER bound instead ('0-49' -> 49), since their
  // lower bound is always a meaningless 0. Reading every field the same way (as the old code did)
  // silently dropped aggressiveness/stamina from the filter bar entirely, since their 0-floor got
  // filtered out as a no-op. Charisma/motivation ('0-250', dir:'min') correctly stay unfilled -
  // that range spans the whole attribute scale, i.e. genuinely no constraint.
  const attrFieldDefs = filterFieldsFor(idKey);
  const floors = (priorityEntries || []).map(([key, info]) => {
  const fieldDef = attrFieldDefs.find(f => f.key === key);
  if (!fieldDef) return null;
  const val = fieldDef.dir === 'max' ? parseMaxFromTarget(info.target) : parseMinFromTarget(info.target);
  return (val != null && val > 0) ? [key, info.priority, val, fieldDef.dir] : null;
  }).filter(Boolean);
  const floorNote = floors.length
  ? `Filter bar below is pre-filled with this league's sourced targets (${floors.map(([k, , m, dir]) => `${k} ${dir === 'max' ? '≤' : '≥'} ${m}`).join(', ')}) - edit any value freely, or clear it to drop that constraint.`
  : `No numeric targets sourced for ${cfgLabel} at ${league} league yet - filter bar below starts empty; results rank by Match Score once you scan.`;
 let h = `<div style="font-size:9px;color:#9ca3af;margin-bottom:2px;">Target OA ${targetOA.min}-${targetOA.max} for ${league}${cash != null ? `, cash on hand $${cash.toLocaleString()}` : ' (cash balance unknown - visit UpdateCar.asp once to see it here)'}</div>`;
 // League salary/age guidance (from D.driverSelection/tdSelection) - flags rows the manager
 // likely can't sustain, matching competitor tools' salary/age filters without needing supporters.
 const selCaps = (cfgLabel === 'driver' && (typeof GPRO_DATA !== 'undefined') && GPRO_DATA.driverSelection && GPRO_DATA.driverSelection[league]);
 const capMaxSalary = selCaps ? selCaps.maxSalary : null;
 const capMaxAge = selCaps ? selCaps.maxAge : null;
 if (cfgLabel === 'driver' && (capMaxSalary || capMaxAge)) {
  const overSal = capMaxSalary ? rows.filter(r => parseGproCash(r.salary) > capMaxSalary).length : 0;
  const overAge = capMaxAge ? rows.filter(r => (parseInt(r.age) || 0) > capMaxAge).length : 0;
  let capNotes = ['Per-league guidance:'];
  if (capMaxSalary) capNotes.push(`salary ≤ $${(capMaxSalary/1e6).toFixed(1)}M (${overSal} over)`);
  if (capMaxAge) capNotes.push(`age ≤ ${capMaxAge} (${overAge} over)`);
  h += `<div style="font-size:9px;color:#9ca3af;margin-bottom:2px;">${capNotes.join(' • ')}</div>`;
 }
 // OA cap validation (from gpro-pitwall) - flag drivers above this league's max OA,
 // which GPRO will not let you sign, so they're interesting to look at but unusable.
 const leagueCap = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.leagues && GPRO_DATA.leagues[league]) ? GPRO_DATA.leagues[league].driverMaxOA : null;
 if (cfgLabel === 'driver' && leagueCap && leagueCap < 999) {
 const overCap = rows.filter(r => (parseFloat(r.OA) || 0) > leagueCap);
 if (overCap.length) {
  h += `<div style="font-size:9px;color:#ef4444;margin-bottom:4px;">⚠️ ${overCap.length} listed above ${league}'s driver OA cap (${leagueCap}) - GPRO won't let you sign these, so they're look-don't-touch.</div>`;
 }
 }
 // Filter bar defaults: sourced attribute floors (Rookie/Amateur drivers today - see
 // gpro-data.js), plus salary/age caps for drivers. All pre-filled but user-editable - see
 // mkFilterBar. Per-league guidance note above already explains these to the user in prose.
 const filterDefaults = {};
 floors.forEach(([k, , m]) => { filterDefaults[k] = m; });
 if (cfgLabel === 'driver' && capMaxSalary) filterDefaults.salary = Math.round(capMaxSalary / 1000);
 if (cfgLabel === 'driver' && capMaxAge) filterDefaults.age = capMaxAge;
 h += `<div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">${floorNote}</div>`;
 h += mkFilterBar(sectionId, idKey, filterDefaults);
 h += `<div id="gpro-shortlist-${sectionId}">${mkMarketTable(capped, idKey, targetOA)}</div>`;
 // Scanning is now narrowed by the CHEAP (no-scan) filter bar fields - Age/Salary/Offers - BEFORE
 // any profile page gets fetched (see cheapFilteredRows), so a 700+ candidate market becomes
 // scannable without fetching hundreds of pages. Preview the count using today's pre-filled
 // defaults so the button is honest about roughly how many profile fetches it's about to do.
 const cheapPreview = applyCustomFilters(rows, idKey, { age: filterDefaults.age, salary: filterDefaults.salary });
 h += `<button id="gpro-scan-${sectionId}" data-section="${sectionId}" style="width:100%;margin-top:6px;background:#374151;color:#d1d5db;border:none;padding:6px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">🔍 Scan Full Stats & Filter (~${cheapPreview.length} of ${rows.length} match today's Age/Salary filter above - edit those first to narrow further, then this fetches each match's profile page)</button>`;
 h += `<div id="gpro-scan-status-${sectionId}" style="font-size:9px;color:#6b7280;margin-top:4px;"></div>`;
 return h;
 }

 // Fetches ONE candidate's full profile page (real HTTP page load, never /backend/api/v2 - doesn't
 // touch the API budget) and parses their real attributes. Cached indefinitely per candidate ID
 // (same "event data doesn't decay by time" reasoning as the rest of this project - a driver's
 // concentration doesn't change by waiting, only by training) under a scout-specific endpoint key
 // so it never collides with the account's own cached '/DriProfile'/'/TDProfile'.
 async function fetchCandidateFullStats(kind, id, profileHref) {
 const endpoint = kind === 'driver' ? `/DriProfileScout/${id}` : `/TDProfileScout/${id}`;
 const cached = getStaleData(endpoint);
 if (cached) return cached.data;
 try {
 const path = kind === 'driver' ? `DriverProfile.asp?ID=${id}` : profileHref;
 if (!path) return null;
 const html = await fetchPageHTML(path);
 const doc = new DOMParser().parseFromString(html, 'text/html');
 const stats = kind === 'driver' ? parseDriverProfileDOM(doc) : parseTdProfileDOM(doc);
 if (stats) setStaleData(endpoint, stats);
 return stats;
 } catch (e) { logError(`full-stat fetch failed for ${kind} ${id}:`, e.message); return null; }
 }

  // `rows` is expected to already be narrowed by the cheap filter-bar fields (see
  // cheapFilteredRows) - MARKET_FULL_SCAN_MAX here is only a hard backstop for whatever's left
  // after that, sorted by OA-desc so any truncation keeps the strongest candidates. Returns
  // `truncated: true` on the result so the caller can tell the user honestly if not everyone got
  // scanned, instead of silently dropping candidates.
  async function scanCandidatesFullStats(rows, idKey) {
  const kind = idKey === 'driId' ? 'driver' : 'td';
  const sorted = [...rows].sort((a, b) => (parseFloat(b.OA) || 0) - (parseFloat(a.OA) || 0));
  const capped = sorted.slice(0, MARKET_FULL_SCAN_MAX);
  const results = await mapLimit(capped, NET_CONCURRENCY, (r) => fetchCandidateFullStats(kind, r[idKey], r.profileHref));
  const scanned = capped.map((r, i) => Object.assign({}, r, { fullStats: results[i].status === 'fulfilled' ? results[i].value : null }));
  scanned.truncatedFrom = sorted.length > capped.length ? sorted.length : null;
  return scanned;
  }

  // Weighted-sum match score (0-100) of real scraped attributes against this league's ideal
  // target, weighted by priority order (D.driverSelection[league].attributes /
  // D.tdSelection[league].skills). Applies age + weight penalties like pitwall's
  // RecruitmentService: age -2/yr over ideal, +0.5/yr under; weight -0.5/kg over ideal,
  // +0.125/kg under. RELATIVE ranking tool only (higher = better fit), not a verified game
  // formula; raw number has no absolute meaning. Returns null if no usable data.
  function recruitmentScore(row, priorityEntries, league) {
 if (!row || !priorityEntries || !priorityEntries.length) return null;
 const stats = row.fullStats;
 if (!stats) return null;
 const maxP = Math.max(...priorityEntries.map(([, info]) => info.priority));
 const maxWeighted = priorityEntries.reduce((s, [, info]) => s + 250 * (maxP - info.priority + 1), 0);
 let hit = 0;
 priorityEntries.forEach(([key, info]) => {
  const v = stats[key];
  if (typeof v === 'number') hit += Math.min(1, v / 250) * (maxP - info.priority + 1);
 });
 let base = maxWeighted > 0 ? (hit / maxWeighted) * 100 : 0;
 // Age penalty: drivers too old are a worse long-term bet (pitwall -2/yr). Ideal age ~28.
 const age = parseInt(row.age) || 0;
 if (age > 0) base -= Math.max(0, age - 28) * 2;
 // Weight penalty: heavier drivers wear tyres/car faster (pitwall -0.5/kg over 78 ideal).
 const weight = parseInt(stats.weight) || 0;
 if (weight > 78) base -= (weight - 78) * 0.5;
 return Math.round(Math.max(0, Math.min(100, base)));
 }

 // Driver performance scores (concept from gprohub.net "Performance Scores").
 // Computes 0-100 weighted ratings from a driver's real attributes so the market
 // advisor can compare candidates on race/qualifying/tyre-management merit,
 // not just raw OA. Heuristic from GPRO attribute semantics, clearly flagged.
 // GPRO attributes run 0-250; we normalise by ATTRIBUTE_SCALE (2.5) to 0-100.
 function calcDriverPerformanceScores(stats) {
 if (!stats) return null;
 const attrs = ['concentration','talent','aggressiveness','experience','techInsight','stamina','charisma','motivation'];
 const n = {};
 attrs.forEach(k => n[k] = Math.max(0, Math.min(100, (parseInt(stats[k]) || 0) / 2.5)));
 const c = n.concentration, t = n.talent, a = n.aggressiveness, e = n.experience, te = n.techInsight;
 const scores = {
 dry:   0.40*c + 0.25*t + 0.25*e + 0.10*te,
 wet:   0.20*c + 0.45*t + 0.25*e + 0.10*te,
 quali: 0.30*c + 0.35*t + 0.20*e + 0.15*te,
 race:  0.35*c + 0.25*t + 0.20*e + 0.20*te,
 ovt:   0.30*e + 0.35*a + 0.20*t + 0.15*c,
 tyre:  0.30*e + 0.30*c + 0.20*te + 0.20*t - 0.10*a,
 carWear: 0.25*t + 0.30*te + 0.25*e + 0.20*a,
 };
 Object.keys(scores).forEach(k => scores[k] = Math.round(Math.max(0, Math.min(100, scores[k]))));
 return scores;
 }

 // Compact inline bar for a performance score value (0-100).
 function mkPerfBar(val) {
 const color = val >= 75 ? '#10b981' : val >= 50 ? '#f59e0b' : '#ef4444';
 return `<span style="display:inline-block;min-width:24px;text-align:right;color:${color};font-weight:600;font-size:9px;">${val}</span>`;
 }

 // Renders one scored table (used for both the "meets the floor" and "below the floor" groups).
 function mkScoredTable(rows, idKey, priorityEntries, league) {
 const scored = rows.map(r => ({ row: r, score: recruitmentScore(r, priorityEntries, league) }));
 scored.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
 let t = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:10px;">`;
 t += `<tr style="color:#60a5fa;font-weight:700;"><td style="padding:3px;">Name</td><td>OA</td><td>Salary</td><td>Age</td><td>Fit</td>${idKey === 'driId' ? '<td colspan="4" style="text-align:center;font-size:9px;">Perf (Dry/Wet/Qua/Rac/OVT/Tyr/Wear)</td>' : ''}</tr>`;
 scored.forEach(({ row: r, score }) => {
 const nameCell = (idKey === 'driId' && r.driId)
 ? `<a href="DriverProfile.asp?ID=${r.driId}" style="color:#d1d5db;text-decoration:underline;">${esc(r.name)}</a>`
 : esc(r.name);
 const scoreColor = score == null ? '#6b7280' : score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
 const scoreCell = score != null ? `<strong>${score}</strong>` : `<span style="color:#6b7280;">unavailable</span>`;
 const fold = score == null ? '0' : `${Math.round(score / 10) * 10}%`;
 const barCell = `<div style="width:40px;height:4px;background:#1f2937;border-radius:2px;margin:3px auto 0;overflow:hidden;"><div style="height:100%;width:${Math.min(100,score||0)}%;background:${scoreColor};"></div></div>`;
 let perfCell = '';
 if (idKey === 'driId') {
 const ps = calcDriverPerformanceScores(r.fullStats);
 if (ps) {
  perfCell = `<td style="text-align:center;color:#9ca3af;font-size:8px;">${mkPerfBar(ps.dry)}</td><td style="text-align:center;color:#9ca3af;font-size:8px;">${mkPerfBar(ps.wet)}</td><td style="text-align:center;color:#9ca3af;font-size:8px;">${mkPerfBar(ps.quali)}</td><td style="text-align:center;color:#9ca3af;font-size:8px;">${mkPerfBar(ps.race)}</td><td style="text-align:center;color:#9ca3af;font-size:8px;">${mkPerfBar(ps.ovt)}</td><td style="text-align:center;color:#9ca3af;font-size:8px;">${mkPerfBar(ps.tyre)}</td><td style="text-align:center;color:#9ca3af;font-size:8px;">${mkPerfBar(ps.carWear)}</td>`;
 } else {
  perfCell = `<td colspan="4" style="text-align:center;color:#6b7280;font-size:8px;">scan to see ratings</td>`;
 }
 }
 t += `<tr><td style="padding:3px;color:#d1d5db;">${nameCell}</td><td style="text-align:center;color:#10b981;font-weight:700;">${r.OA}</td><td style="text-align:center;color:#9ca3af;">${r.salary}</td><td style="text-align:center;color:#9ca3af;">${r.age ?? ''}</td><td style="text-align:center;color:${scoreColor};font-weight:600;font-size:10px;">${scoreCell}${score != null ? barCell : ''}</td>${perfCell}</tr>`;
 });
 t += `</table></div>`;
 return t;
 }

  // Renders scanned results as a single ranked table. Real bug fixed 2026-08-11: this function used
  // to re-derive its OWN fixed floor set from priorityEntries (D.driverSelection[league].attributes)
  // and re-apply it as a hard, non-editable "meets ALL minimums" gate on top of whatever the caller
  // already filtered - so a candidate who passed the user's own (possibly lowered/edited) filter-bar
  // threshold could still get silently bucketed into "below" by the original sourced minimum
  // underneath. User's exact complaint: "update the numbers as I want without it failing because in
  // the backend we have the fixed minimums." Filtering is now entirely the filter bar's job (see
  // applyCustomFilters / filterAndRenderMarket, pre-filled from these same sourced minimums but
  // fully editable) - rows arriving here have already been filtered, so this just ranks them.
  function mkFullStatsTable(rows, idKey, priorityEntries, league) {
  let h = mkScoredTable(rows, idKey, priorityEntries, league);
  h += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">Match Score = weighted sum of each candidate's real attributes (scraped from their profile page), weighted by this league's priority order. Relative ranking only, not a percentage or verified formula. Filtering (including any minimums) is controlled by the filter bar above.</div>`;
  return h;
  }

 // Narrows `rows` to only the CHEAP filter-bar fields (Age/Salary/Offers - already on the market
 // row, no profile fetch needed) using whatever's CURRENTLY in the bar, before any expensive
 // per-candidate scan runs. Added 2026-08-11 (v6.8.1) alongside whole-market auto-pagination
 // (v6.8.0): once a "market" can be 700+ candidates, scanning everyone unconditionally isn't
 // practical, but the cheap fields alone (e.g. Rookie's sourced salary ≤$2M/age ≤36 defaults)
 // typically cut that down by more than half before a single network request goes out - real
 // reduction happens here, MARKET_FULL_SCAN_MAX is only the backstop for what's left.
 function cheapFilteredRows(sectionId, idKey, rows) {
 const bar = document.getElementById(`gpro-filterbar-${sectionId}`);
 if (!bar) return rows;
 const fields = filterFieldsFor(idKey);
 const cheapValues = {};
 bar.querySelectorAll('[data-filter-field]').forEach((inp) => {
 const fieldDef = fields.find(f => f.key === inp.getAttribute('data-filter-field'));
 if (fieldDef && !fieldDef.needsScan && inp.value !== '') cheapValues[fieldDef.key] = inp.value;
 });
 return applyCustomFilters(rows, idKey, cheapValues);
 }

 // Runs the real profile scan (shared by both entry points below) and updates `state`/`container`
 // in place. Cheap to call more than once - scanCandidatesFullStats caches per candidate ID, so a
 // second scan (e.g. triggered by Apply Filters after the standalone button already ran one) just
 // reads the cache instead of re-fetching. `rows` should already be cheap-filtered by the caller
 // (see cheapFilteredRows) - this only applies the MARKET_FULL_SCAN_MAX backstop on top.
 async function runMarketScan(idKey, rows, container, state, priorityEntries, league, statusEl) {
 if (statusEl) statusEl.textContent = `⏳ Fetching ${Math.min(rows.length, MARKET_FULL_SCAN_MAX)} candidate profiles (narrowed by today's Age/Salary/Offers filter)...`;
 const enriched = await scanCandidatesFullStats(rows, idKey);
 state.rows = enriched;
 state.hasScanned = true;
 const gotStats = enriched.filter(r => r.fullStats).length;
 let msg = `Scanned ${enriched.length} candidates - got real stats for ${gotStats}.`;
 if (gotStats < enriched.length) msg += ' Some profile pages could not be read (parser may need verifying against real markup).';
 if (enriched.truncatedFrom) msg += ` Only the top ${enriched.length} by OA were scanned out of ${enriched.truncatedFrom} that matched your Age/Salary/Offers filter - narrow those further (e.g. lower the salary cap) to bring the rest into range.`;
 if (statusEl) statusEl.textContent = msg;
 return enriched;
 }

 // Reads the filter bar's CURRENT values (whatever the user has typed/edited, pre-filled from
 // sourced minimums but never overridden by them - see mkFilterBar) and (re)renders the container
 // with rows narrowed to those matching every filled-in field. Shared by both entry points below so
 // scanning from either one filters identically afterwards - only the visible filter bar decides
 // what "passes", never a hidden fixed backend minimum (that was the exact bug fixed 2026-08-11).
 function filterAndRenderMarket(sectionId, idKey, container, state, priorityEntries, league) {
 const bar = document.getElementById(`gpro-filterbar-${sectionId}`);
 const statusEl = document.getElementById(`gpro-filterstatus-${sectionId}`);
 if (!bar || !container) return;
 const values = {};
 bar.querySelectorAll('[data-filter-field]').forEach((inp) => { values[inp.getAttribute('data-filter-field')] = inp.value; });
 const filtered = applyCustomFilters(state.rows, idKey, values);
 container.innerHTML = state.hasScanned ? mkFullStatsTable(filtered, idKey, priorityEntries, league) : mkMarketTable(filtered, idKey, null);
 if (statusEl) statusEl.textContent = `Showing ${filtered.length} of ${state.rows.length}${state.hasScanned ? ' scanned' : ' listed'} candidates matching your filters.`;
 }

 // Real bug fixed 2026-08-11: attribute filters (Con/Tal/etc) used to only work AFTER a separate
 // "Scan Full Stats" button had already been clicked - "half the filters can't even be filled out"
 // was the exact complaint, since those inputs were disabled until then. Apply Filters is now
 // self-sufficient: if the user filled in any field that needs real scraped stats and no scan has
 // run yet, it scans automatically first, then filters - one button, one step, regardless of which
 // fields were used.
 async function applyFilterBar(sectionId, idKey, rows, container, state, priorityEntries, league) {
 const bar = document.getElementById(`gpro-filterbar-${sectionId}`);
 const applyBtn = document.getElementById(`gpro-filterapply-${sectionId}`);
 const statusEl = document.getElementById(`gpro-filterstatus-${sectionId}`);
 if (!bar || !container) return;
 const values = {};
 bar.querySelectorAll('[data-filter-field]').forEach((inp) => { values[inp.getAttribute('data-filter-field')] = inp.value; });
 const fields = filterFieldsFor(idKey);
 const needsScanNow = !state.hasScanned && fields.some((f) => f.needsScan && values[f.key] !== undefined && values[f.key] !== '');
 if (needsScanNow) {
 if (applyBtn) applyBtn.disabled = true;
 try {
 const narrowed = cheapFilteredRows(sectionId, idKey, rows);
 await runMarketScan(idKey, narrowed, container, state, priorityEntries, league, statusEl);
 } catch (e) {
 if (statusEl) statusEl.textContent = `Scan failed: ${e.message}`;
 if (applyBtn) applyBtn.disabled = false;
 return;
 }
 if (applyBtn) applyBtn.disabled = false;
 }
 filterAndRenderMarket(sectionId, idKey, container, state, priorityEntries, league);
 }

 // Cheap-filters, scans, and renders in one step - the body of the standalone "Scan Full Stats &
 // Filter" button's click handler, pulled out so it can also fire automatically on page load (see
 // autoStart below) without a synthetic click.
 async function runScanAndFilter(sectionId, idKey, rows, container, state, priorityEntries, league, btn) {
 if (btn) btn.disabled = true;
 const statusEl = document.getElementById(`gpro-scan-status-${sectionId}`);
 try {
 const narrowed = cheapFilteredRows(sectionId, idKey, rows);
 await runMarketScan(idKey, narrowed, container, state, priorityEntries, league, statusEl);
 filterAndRenderMarket(sectionId, idKey, container, state, priorityEntries, league);
 if (btn) btn.remove();
 } catch (e) {
 if (statusEl) statusEl.textContent = `Scan failed: ${e.message}`;
 if (btn) { btn.disabled = false; btn.textContent = '🔍 Retry scan'; }
 }
 }

 // Wires both entry points for one market section (drivers or TDs) after body(h) has rendered it:
 // the standalone "Scan Full Stats & Filter" button (scans immediately, then applies whatever's
 // currently in the filter bar - pre-filled with sourced minimums, but respects any edits already
 // made) and the filter bar's Apply button (scans only if a filled-in field needs it - see
 // applyFilterBar). rows = the FULL row list shown; priorityEntries = Object.entries of
 // D.driverSelection[league].attributes or D.tdSelection[league].skills.
 // `autoStart` (2026-08-11, explicit user request - "that's the automated search and filtering I
 // want you to do when I open the driver market up"): when the league has sourced numeric targets
 // pre-filled into the filter bar (Rookie/Amateur drivers today), the scan+filter now runs
 // immediately on page load instead of waiting for a click - the user's very first view of the
 // market is already narrowed to real, scanned candidates matching those defaults. Leagues with no
 // sourced targets (filter bar starts empty) skip auto-start, since there'd be nothing to filter by
 // and it would just burn requests scanning the entire market unfiltered.
 function wireScanFullStatsButton(sectionId, idKey, rows, priorityEntries, league, autoStart) {
 const btn = document.getElementById(`gpro-scan-${sectionId}`);
 const container = document.getElementById(`gpro-shortlist-${sectionId}`);
 // Filter state: starts as the FULL unfiltered row list (Age/Salary/Offers filters need no scan
 // and can therefore reach beyond the OA-capped subset), then narrows to whatever the last scan
 // returned once one runs (attribute filters can only ever cover the scanned pool). `hasScanned`
 // decides which renderer (mkMarketTable vs mkFullStatsTable) the filtered view re-uses. Shared
 // between the standalone scan button and the filter bar's Apply button below, so whichever runs
 // a scan first benefits the other.
 const state = { rows, hasScanned: false };
 const applyBtn = document.getElementById(`gpro-filterapply-${sectionId}`);
 if (applyBtn) applyBtn.addEventListener('click', () => applyFilterBar(sectionId, idKey, rows, container, state, priorityEntries, league));
 // Click listener wired regardless of autoStart, so a failed auto-scan's "Retry scan" button (see
 // runScanAndFilter's catch branch) still works - autoStart only decides whether the FIRST run
 // fires immediately or waits for a click.
 if (btn) btn.addEventListener('click', () => runScanAndFilter(sectionId, idKey, rows, container, state, priorityEntries, league, btn));
 if (autoStart && rows.length) runScanAndFilter(sectionId, idKey, rows, container, state, priorityEntries, league, btn);
 }

 async function renderMarketOverview() {
 createPanel('Driver & TD Market');
 body(`<div style="${ST.loading}">Loading market data...</div>`);
 try {
 // DOM-only, per user request - never call /AvailDrivers or /AvailTDs. This menu command can be
 // invoked from any page, so unlike renderMarketPage() there's no live market table to parse -
 // fall back to whatever parseAvailListDOM captured into the stale cache the last time the user
 // (or backgroundCaptureAuxPages) visited AvailDrivers.asp/AvailTechDirectors.asp. No API call
 // is ever made as a fallback; if nothing's cached yet, the section just says so.
  const leagueInfo = await detectLeagueFresh();
  const staleDrivers = getStaleData('/AvailDrivers');
  const staleTds = getStaleData('/AvailTDs');
  let h = '';
  const drivers = (staleDrivers && staleDrivers.data && staleDrivers.data.drivers) || [];
  const tds = (staleTds && staleTds.data && staleTds.data.tds) || [];
  const noDataMsg = (page) => `No cached data yet - visit ${page} once to capture it (never fetched via API).`;
  const league = leagueInfo.league || (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.currentLeague) || 'Amateur';
 const cachedCar = getCachedCarData();
 const cash = cachedCar && cachedCar.cash > 0 ? cachedCar.cash : null;
 h += mkDecisionBoard([
 { id: 'gpro-sec-market-drivers', label: 'Drivers', verdict: `${drivers.length} listed`, tone: drivers.length ? 'info' : 'warn' },
 { id: 'gpro-sec-market-tds', label: 'TDs', verdict: `${tds.length} listed`, tone: tds.length ? 'info' : 'warn' },
 ]);
 h += mkSection(`Available Drivers (${drivers.length})`,
  drivers.length ? mkShortlistSection(drivers, 'driId', D.driverSelection && D.driverSelection[league] && D.driverSelection[league].targetOA, cash, league, 'driver', 'drivers', D.driverSelection && D.driverSelection[league] && Object.entries(D.driverSelection[league].attributes)) : mkRec(noDataMsg('AvailDrivers.asp'), 'warn'),
 'gpro-sec-market-drivers');
 h += mkSection(`Available Technical Directors (${tds.length})`,
  tds.length ? mkShortlistSection(tds, 'tdId', D.tdSelection && D.tdSelection[league] && D.tdSelection[league].targetOA, cash, league, 'TD', 'tds', D.tdSelection && D.tdSelection[league] && Object.entries(D.tdSelection[league].skills)) : mkRec(noDataMsg('AvailTechDirectors.asp'), 'warn'),
 'gpro-sec-market-tds');

 // What-to-look-for reference (D.driverSelection, established attribute priorities per
 // league) - was sitting unused in gpro-data.js, found while auditing for dead data 2026-07-19.
 // /AvailDrivers' list view doesn't return per-driver attribute breakdowns (only OA/age/salary),
 // so this can't score individual market rows - shown as a manual-evaluation checklist instead.
 const sel = D.driverSelection && D.driverSelection[league];
 if (sel) {
 let selHtml = `<div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">Target OA: ${sel.targetOA.min}-${sel.targetOA.max}</div>`;
 Object.entries(sel.attributes).sort((a, b) => a[1].priority - b[1].priority).forEach(([attr, info]) => {
 selHtml += mkRow(`${info.priority}. ${attr}`, `${info.target}`);
 selHtml += `<div style="font-size:9px;color:#6b7280;padding-left:8px;margin-bottom:2px;">${info.note}</div>`;
 });
 selHtml += `<div style="font-size:9px;color:#9ca3af;margin-top:4px;">${sel.budget}</div>`;
 h += `<details style="margin-top:8px;"><summary style="cursor:pointer;color:#60a5fa;font-size:11px;font-weight:700;padding:4px 0;">What to look for (${league} league)</summary>${selHtml}</details>`;
 }

 // TD selection guidance (D.tdSelection, sourced from the official GPRO wiki - see gpro-data.js)
 // - Pro/Master/Elite only, TDs are unavailable below Pro.
 const tdSel = D.tdSelection && D.tdSelection[league];
 if (tdSel) {
 let tdSelHtml = `<div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">Target OA: ${tdSel.targetOA.min}-${tdSel.targetOA.max}</div><div style="font-size:9px;color:#f59e0b;margin-bottom:4px;">⚠️ TD OA caps are wiki-sourced and NOT independently confirmed - this project's driver OA caps came from the same wiki and turned out to be wrong (corrected 2026-07-27 via live in-game confirmation). Verify against what the game actually lets you sign before relying on this.</div>`;
 Object.entries(tdSel.skills).sort((a, b) => a[1].priority - b[1].priority).forEach(([skill, info]) => {
 tdSelHtml += mkRow(`${info.priority}. ${skill}`, '');
 tdSelHtml += `<div style="font-size:9px;color:#6b7280;padding-left:8px;margin-bottom:2px;">${info.note}</div>`;
 });
 tdSelHtml += `<div style="font-size:9px;color:#9ca3af;margin-top:4px;">${tdSel.budget}</div>`;
 h += `<details style="margin-top:8px;"><summary style="cursor:pointer;color:#60a5fa;font-size:11px;font-weight:700;padding:4px 0;">What to look for in a TD (${league} league)</summary>${tdSelHtml}</details>`;
 } else if (league === 'Rookie' || league === 'Amateur') {
 h += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">TDs aren't available until Pro league.</div>`;
 }

 h += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">GPRO's default market page (OA-descending, capped at your league) - skill/range filters are GPRO Supporters-only via the API and aren't requested here. Value = OA per $1M salary, plain arithmetic, not a game-mechanic estimate. 🕐 = retiring soon.</div>`;

 body(h);
 wireDecisionBoard();
 if (sel) wireScanFullStatsButton('drivers', 'driId', drivers, Object.entries(sel.attributes), league);
 if (tdSel) wireScanFullStatsButton('tds', 'tdId', tds, Object.entries(tdSel.skills), league);
 } catch (err) {
 body(mkRec(`<strong>Error:</strong> ${err.message}`, 'bad'));
 }
 }

 GM_registerMenuCommand('Season Overview', renderSeasonOverview);
 GM_registerMenuCommand('Sponsor Overview', renderSponsorOverview);
 GM_registerMenuCommand('Driver & TD Market', renderMarketOverview);
 GM_registerMenuCommand('Settings', showTokenModal);
 GM_registerMenuCommand('Clear Cache', () => {
 // Clear both the short-lived (20min) cache and the long-lived stale fallback cache
 const endpoints = ['/Practice', '/TrackProfile', '/DriProfile', '/Office', '/TyreSuppliers', '/UpdateCar', '/Testing', '/StaffAndFacilities', '/TDProfile', '/NegOverview', '/AvailDrivers', '/AvailTDs', '/Menu'];
 endpoints.forEach(ep => {
 try { GM_setValue('cache_api_' + ep, null); } catch(e) {}
 try { GM_setValue('stale_api_' + ep, null); } catch(e) {}
 });
 // Also reset the season track-specs pre-cache flag so backgroundCacheSeasonTrackSpecs
 // re-fetches Calendar.asp + every track on the next gpro.asp visit, rather than staying
 // permanently skipped for a season it thinks is already done.
 try { GM_setValue('gpro_season_specs_cached_season', ''); } catch(e) {}
 alert('Cache cleared (including stale fallback data). Data will be fetched fresh on next page load.');
 location.reload();
 });
 GM_registerMenuCommand('Reset API Call Counter (new race)', () => {
 resetApiCallCount();
 alert(`API call counter reset to 0/${API_CALL_BUDGET}. Only do this once you're sure a new race has actually started - GPRO's own token limit doesn't reset automatically either.`);
 location.reload();
 });
 runPassiveCapture();
 init();
})();
