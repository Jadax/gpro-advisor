// ==UserScript==
// @name         GPRO Strategy Tool
// @namespace    https://gpro.net
// @version      3.24.0
// @description  Fuel setup, weather analysis, car upgrade recommendations for GPRO. Author: Tushant Sharma.
// @author       Tushant Sharma
// @match        https://www.gpro.net/gb/gpro.asp
// @match        https://www.gpro.net/gb/Qualify.asp
// @match        https://www.gpro.net/gb/Qualify2.asp
// @match        https://www.gpro.net/gb/RaceSetup.asp
// @match        https://www.gpro.net/gb/UpdateCar.asp
// @match        https://www.gpro.net/gb/StaffAndFacilities.asp
// @match        https://www.gpro.net/gb/DriverProfile.asp*
// @match        https://www.gpro.net/gb/TrackDetails.asp*
// @match        https://www.gpro.net/gb/Suppliers.asp
// @match        https://app.gpro.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @connect      gpro.net
// @connect      www.gpro.net
// @connect      app.gpro.net
// @connect      api.anthropic.com
// @require      file:///G:/My%20Drive/VibeCoding/GPRO%20Tool/gpro-data.js?v=3.14.0
// @run-at       document-idle
// ==/UserScript==

// GPRO Strategy Tool
// Author: Tushant Sharma
// A comprehensive strategy tool for Grand Prix Racing Online providing
// fuel calculations, tyre strategy, car setup recommendations,
// weather analysis, and car parts wear prediction.

(function () {
  'use strict';
  const D = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA) ? GPRO_DATA : {};

  const API_BASE = 'https://gpro.net/gb/backend/api/v2';
  const TANK_MAX = 180;
  const PART_NAMES = ['Chassis','Engine','Front Wing','Rear Wing','Underbody','Sidepods','Cooling','Gearbox','Brakes','Suspension','Electronics'];
  const PART_LVL_KEYS = ['lvlChassis','lvlEngine','lvlFWing','lvlRWing','lvlUnderbody','lvlSidepods','lvlCooling','lvlGear','lvlBrakes','lvlSusp','lvlElectronics'];
  const PART_WEAR_KEYS = ['usaChassis','usaEngine','usaFWing','usaRWing','usaUnderbody','usaSidepods','usaCooling','usaGear','usaBrakes','usaSusp','usaElectronics'];
  const PART_OPT_KEYS = ['chassisOptions','engineOptions','fWingOptions','rWingOptions','underbodyOptions','sidepodsOptions','coolingOptions','gearOptions','brakesOptions','suspOptions','electronicsOptions'];
  const PART_SEL_KEYS = ['selectedChassis','selectedEngine','selectedFWing','selectedRWing','selectedUnderbody','selectedSidepods','selectedCooling','selectedGear','selectedBrakes','selectedSusp','selectedElectronics'];
  const FAST_WEAR = ['Chassis','Engine','Front Wing','Rear Wing','Gearbox'];
  const SLOW_WEAR = ['Underbody','Sidepods','Cooling','Brakes','Suspension','Electronics'];
  const CRITICAL_WEAR = 10;
  const FAST_ALERT = 30;
  const SLOW_ALERT = 15;

  // Compound base characteristics
  // tyreLife = base laps on medium wear track with standard conditions
  // speedDelta = seconds per lap relative to Medium (negative = faster)
  const COMPOUNDS = {
    'Extra Soft': { tyreLife: 12, speedDelta: -1.5, gripLevel: 'Very High' },
    'Soft':       { tyreLife: 18, speedDelta: -0.8, gripLevel: 'High' },
    'Medium':     { tyreLife: 26, speedDelta: 0,    gripLevel: 'Medium' },
    'Hard':       { tyreLife: 38, speedDelta: 0.5,  gripLevel: 'Low' },
    'Rain':       { tyreLife: 22, speedDelta: 0,    gripLevel: 'Rain' },
  };

  // Track tyre wear rating → multiplier for wear RATE
  // Higher wear track = tyres wear FASTER = higher multiplier
  // (inverted from tyre life multipliers)
  const WEAR_MULTIPLIERS = {
    'Very Low': 0.67,   // tyres wear 0.67x as fast
    'Low': 0.83,        // tyres wear 0.83x as fast
    'Medium': 1.0,      // baseline
    'High': 1.25,       // tyres wear 1.25x as fast
    'Very High': 1.54,  // tyres wear 1.54x as fast
  };

  // Track fuel consumption → base fuel per lap (Litres)
  const FUEL_BASE = {
    'Very Low': 1.8,
    'Low': 2.0,
    'Medium': 2.4,
    'High': 2.8,
    'Very High': 3.2,
  };

  // ============================================================
  // STORAGE
  // ============================================================
  function getToken() { return GM_getValue('gpro_token', ''); }
  function setToken(t) { GM_setValue('gpro_token', t); }
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

  // ============================================================
  // AI COACHING (optional, user's own API key - Priority 2 "AI-first" layer)
  // ============================================================
  // Entirely opt-in: nothing here ever runs unless the user pastes their own Anthropic API key in
  // Settings. Every deterministic recommendation in this tool (tyre/setup/wear/risk/push-or-hold)
  // already stands on its own with no AI involved - this only adds a natural-language coaching
  // paragraph OVER that already-computed data, user-triggered per race (never automatic, so it
  // never spends the user's own API credits without them asking), cached so re-opening the panel
  // doesn't re-spend on an unchanged race. Falls back to nothing (not an error) if unconfigured -
  // every page already has its deterministic narrative (mkRaceEngineerNarrative etc) regardless.
  function getAiKey() { return GM_getValue('gpro_ai_key', ''); }
  function setAiKey(k) { GM_setValue('gpro_ai_key', k.trim()); }

  // Sends a compact, already-deterministic summary (never raw fabrication - every field here comes
  // from a calc function already shown elsewhere on the page) to Claude for a short coaching
  // paragraph. Returns { text } on success, { error } on failure - never throws, so a bad/missing
  // key degrades to "no AI section shown" rather than breaking the rest of the panel.
  function callAiCoach(context) {
    return new Promise((resolve) => {
      const key = getAiKey();
      if (!key) return resolve({ error: 'No API key configured (Settings -> AI Coaching).' });
      // Prompt is structured to satisfy this project's own AI-first principles (ARCHITECTURE.md):
      // explain reasoning, state a confidence read, name one alternative worth weighing - not just
      // a flat restatement of numbers already on the page.
      const prompt = `You are a terse GPRO (Grand Prix Racing Online) race engineer. Given this `
        + `already-computed strategy data (not yours to recalculate, just to explain and advise on), `
        + `write a short (4-6 sentence) plain-language coaching note for the manager. Cover: the `
        + `single biggest risk or opportunity and why; how confident you'd be carrying this plan `
        + `(low/medium/high) and what would change your mind; and one concrete alternative worth `
        + `weighing (e.g. a different risk level or tyre call), even if you'd still recommend the `
        + `current plan. Don't repeat numbers already shown verbatim elsewhere - interpret them. Be `
        + `direct, no filler.\n\nData:\n${JSON.stringify(context, null, 2)}`;
      GM_xmlhttpRequest({
        method: 'POST',
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        data: JSON.stringify({
          // Fast/cheap model family, matches a short coaching-note use case. Update this string if
          // Anthropic deprecates it - the error path below surfaces that as a clear API error
          // rather than failing silently.
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        }),
        onload(r) {
          try {
            const body = JSON.parse(r.responseText);
            if (r.status !== 200) return resolve({ error: body?.error?.message || `HTTP ${r.status}` });
            const text = body?.content?.[0]?.text;
            resolve(text ? { text } : { error: 'Empty response from API.' });
          } catch (e) { resolve({ error: 'Could not parse API response.' }); }
        },
        onerror() { resolve({ error: 'Network error reaching api.anthropic.com.' }); },
      });
    });
  }

  // Shared "Get AI Coaching" button wiring - handles the cache-check/fetch/render/transparency
  // sequence identically wherever an AI Coaching button appears (renderQualify, renderRaceSetup).
  // btnId/outId: element ids already rendered into `h`. context: the plain object to send (and to
  // show verbatim in the "what was sent" block). cacheKey: string, should be unique per
  // page+session+track so Q1/Q2/Race don't collide.
  function wireAiCoachButton(btnId, outId, context, cacheKey) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const sentBlock = `<details style="margin-top:4px;"><summary style="cursor:pointer;color:#6b7280;font-size:9px;">What was sent to the AI</summary><pre style="font-size:9px;color:#9ca3af;white-space:pre-wrap;margin:4px 0 0;">${JSON.stringify(context, null, 2)}</pre></details>`;
    btn.addEventListener('click', async () => {
      const out = document.getElementById(outId);
      const cached = getCachedData(cacheKey);
      if (cached) {
        out.innerHTML = mkRec(`🤖 ${cached}`, 'info') + `<div style="font-size:9px;color:#6b7280;margin-top:2px;">Cached - AI-generated, not a deterministic calculation.</div>` + sentBlock;
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Asking...';
      const result = await callAiCoach(context);
      btn.disabled = false;
      btn.textContent = '🤖 Get AI Coaching';
      if (result.text) {
        setCachedData(cacheKey, result.text);
        out.innerHTML = mkRec(`🤖 ${result.text}`, 'info') + `<div style="font-size:9px;color:#6b7280;margin-top:2px;">AI-generated (Claude), not a deterministic calculation - a second opinion, not a replacement for the numbers above.</div>` + sentBlock;
      } else {
        out.innerHTML = mkRec(`AI coaching failed: ${result.error}`, 'warn');
      }
    });
  }

  // Severity-tagged logging - the whole file used to log everything (retries, network failures,
  // parser diagnostics) through console.log with no way to filter devtools by severity. Genuine
  // failures now go through logError; verbose parse/fallback tracing stays console.log by design.
  function logError(...args) { console.error('[GPRO]', ...args); }

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
      if (!token) return fallbackOrReject(endpoint, new Error('No API token set. Use Tampermonkey menu -> GPRO Strategy Tool -> Settings'), resolve, reject);

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
      // (other tools, other tabs).
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
        headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' },
        onload(r) {
          // Check HTTP status first
          if (r.status === 502 || r.status === 503 || r.status === 429) {
            if (retries > 0) {
              console.log(`[GPRO] ${r.status} on ${endpoint}, retrying (${retries} left)...`);
              setTimeout(() => apiGet(endpoint, retries - 1).then(resolve).catch(reject), 1500);
              return;
            }
            return fallbackOrReject(endpoint, new Error(`Server error (${r.status}) on ${endpoint} - try again in a moment`), resolve, reject);
          }
          if (r.status === 401 || r.status === 403) {
            return fallbackOrReject(endpoint, new Error('Token expired. Re-enter token.'), resolve, reject);
          }
          try {
            const d = JSON.parse(r.responseText);
            if (d.loggedOut) return fallbackOrReject(endpoint, new Error('Token expired. Re-enter token.'), resolve, reject);
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
            console.log(`[GPRO] Network error on ${endpoint}, retrying (${retries} left)...`);
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
    return null;
  }

  // ============================================================
  // INLINE STYLE HELPERS
  // ============================================================
  function barStyle(pct, color) {
    return `height:100%;border-radius:7px;background:${color};width:${Math.min(100, Math.max(0, pct))}%;transition:width 0.3s;`;
  }

  const ST = {
    panel: 'position:fixed;top:50px;right:10px;z-index:99999;width:370px;max-height:88vh;overflow-y:auto;background:#111827;color:#e5e7eb;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.6);font-family:system-ui,-apple-system,sans-serif;font-size:12px;line-height:1.5;',
    header: 'background:linear-gradient(135deg,#1e3a5f,#0f172a);padding:10px 14px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center;cursor:move;user-select:none;border-bottom:1px solid #1e40af;',
    headerH3: 'margin:0;font-size:14px;color:#60a5fa;font-weight:700;letter-spacing:0.3px;',
    closeBtn: 'cursor:pointer;color:#6b7280;font-size:20px;padding:0 4px;line-height:1;',
    body: 'padding:12px;',
    section: 'margin-bottom:12px;',
    sectionTitle: 'font-size:11px;font-weight:700;color:#60a5fa;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid #1f2937;padding-bottom:4px;margin-bottom:8px;',
    row: 'display:flex;justify-content:space-between;padding:2px 0;',
    label: 'color:#9ca3af;',
    value: 'color:#f9fafb;font-weight:600;',
    rec: 'padding:6px 10px;margin:4px 0;border-radius:0 6px 6px 0;font-size:11px;border-left:3px solid;',
    barOuter: 'height:12px;background:#1f2937;border-radius:6px;overflow:hidden;margin:3px 0;',
    partRow: 'display:flex;align-items:center;gap:4px;padding:4px 0;border-bottom:1px solid #1f2937;',
    wearBar: 'height:6px;background:#1f2937;border-radius:3px;overflow:hidden;',
    loading: 'text-align:center;padding:30px;color:#6b7280;',
  };

  function mkRec(text, type) {
    const colors = { good: '#10b981', warn: '#f59e0b', bad: '#ef4444', info: '#3b82f6' };
    return `<div style="${ST.rec}border-color:${colors[type] || colors.info};background:${colors[type]}11;">${text}</div>`;
  }

  // Small non-blocking badge shown when one or more inputs fell back to stale cached data
  // (e.g. token expired). Silent by design - doesn't interrupt the panel, just discloses it.
  function mkStaleBanner(...sources) {
    const stale = sources.filter(s => s && s.__stale);
    if (stale.length === 0) return '';
    const oldest = Math.min(...stale.map(s => s.__staleTime));
    return `<div style="font-size:9px;color:#f59e0b;background:#f59e0b11;border-left:3px solid #f59e0b;padding:4px 8px;margin-bottom:8px;border-radius:0 4px 4px 0;">🟡 Using cached data from ${formatTimestamp(oldest)} (token expired or unreachable) — re-enter token in Settings to refresh.</div>`;
  }

  function mkRow(label, value) {
    return `<div style="${ST.row}"><span style="${ST.label}">${label}</span><span style="${ST.value}">${value}</span></div>`;
  }

  // GAPP's stop counts are primary; this shows our own calibrated stop counts alongside for
  // visibility (a numeric check at Spa found GAPP runs ~2x fewer stops for dry compounds than
  // our gproanalyzer calibration - worth keeping visible even though GAPP now drives the rec).
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

  // Which model actually drove this tyre recommendation - priority is GAPP's per-track formula >
  // gproanalyzer calibrated data (fallback only, not ground truth) > our generic own formula.
  function mkTyreSourceNote(tyre) {
    if (!tyre || !tyre.source) return '';
    const label = tyre.source === 'gapp' ? 'per-track formula (gapp)'
      : tyre.source === 'calibrated' ? 'gproanalyzer calibrated data (no gapp data for this track - gproanalyzer is not necessarily correct, just a fallback)'
      : 'generic own formula (no gapp/calibrated data for this track)';
    let html = `<div style="font-size:9px;color:#60a5fa;margin-top:2px;">Recommendation source: ${label}</div>`;
    if (tyre.calibratedDivergence && tyre.calibratedDivergence.length) {
      html += `<div style="font-size:9px;color:#f59e0b;margin-top:2px;">GAPP vs gproanalyzer disagree on stop count - ${tyre.calibratedDivergence.join('; ')}</div>`;
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

  // Wing split ("gadget" calculator from gproanalyzer.info's toolset, reviewed 2026-07-19): half
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

  // "Happy range" (gproanalyzer.info gadget, reviewed 2026-07-19): how far the submitted setup can
  // drift from the ideal before performance suffers - wider for a more technically skilled driver.
  // calcHappyRange() was computed but never actually rendered anywhere (found during the same
  // 2026-07-19 dead-code audit that found calcDowngradeWear/getUpgradeCost/mkBar orphaned) despite
  // being a real, distinct calculation from calcMarginOfAcceptance (a single overall number) - this
  // is the per-part tolerance width. Shown as a compact reference line, not per-part in the table,
  // to avoid a wall of extra numbers next to the setup itself.
  function mkHappyRangeLabel(driver) {
    const hr = calcHappyRange(driver);
    if (!hr) return '';
    return `<div style="font-size:9px;color:#6b7280;margin-top:2px;">Happy range (acceptable deviation before performance suffers): Wings ${hr['Front Wing']}, Engine/Brakes/Gearbox/Suspension ${hr['Engine']} - own reverse-engineered formula, wider = more forgiving, driven by driver experience/tech insight.</div>`;
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
    return `<div${id ? ` id="${id}"` : ''} style="${ST.section}"><div style="${ST.sectionTitle}">${title}</div>${content}</div>`;
  }

  // Decision-summary board (in the spirit of gpro-pitwall's Cockpit, reviewed 2026-07-19): one
  // verdict tile per section, click-to-jump. tiles: [{ id, label, verdict, tone }] where tone is
  // 'good'/'warn'/'bad'/'info' (matches mkRec's palette) and id matches the target mkSection's id.
  function mkDecisionBoard(tiles) {
    const present = tiles.filter(t => t && t.verdict);
    if (!present.length) return '';
    const colors = { good: '#10b981', warn: '#f59e0b', bad: '#ef4444', info: '#3b82f6' };
    const cells = present.map(t => `<div data-jump-to="${t.id}" style="cursor:pointer;flex:1;min-width:90px;background:${colors[t.tone] || colors.info}11;border:1px solid ${colors[t.tone] || colors.info}44;border-radius:6px;padding:6px 8px;">
      <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.03em;">${t.label}</div>
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
      let weight = null;
      root.querySelectorAll('th').forEach((th) => {
        if (/Weight\(kg\)/i.test(th.textContent)) {
          const td = th.parentElement.querySelector('td');
          if (td) weight = parseInt((td.textContent || '').replace(/[^\d]/g, '')) || null;
        }
      });
      const h1 = root.querySelector('h1.block');
      const driverName = h1 ? h1.textContent.replace(/Driver profile:/i, '').trim() : '';
      return { concentration: conc, talent, aggressiveness: aggr, experience, techInsight: techI, stamina, charisma, motivation, weight, driverName };
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
      const h1 = root.querySelector('h1.block');
      const trackName = h1 ? h1.textContent.trim() : '';
      return { laps, timeInOutPits, trackPower, trackHandl, trackAccel, fuelConsumption, tyreWear, overtaking, gripLevel, trackName };
    } catch (e) { return null; }
  }

  function parseTyreSuppliersDOM(root) {
    root = root || document;
    try {
      const suppliers = [];
      let active = null;
      root.querySelectorAll('#tyresuppliers .column').forEach((col) => {
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
  // Field names match the real /StaffAndFacilities API response (`concentration`, `stressHandling` -
  // confirmed against gpro-public-api.yml) so DOM- and API-sourced data are interchangeable.
  function parseStaffFacilitiesDOM(root) {
    root = root || document;
    try {
      let concentration = null, stressHandling = null;
      root.querySelectorAll('th').forEach((th) => {
        const label = th.textContent.trim();
        const td = th.parentElement.querySelector('td');
        if (!td) return;
        if (/^Concentration:/i.test(label)) concentration = parseInt(td.textContent) || null;
        else if (/^Stress handling:/i.test(label)) stressHandling = parseInt(td.textContent) || null;
      });
      return (concentration !== null || stressHandling !== null) ? { concentration, stressHandling } : null;
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

  // Runs once per passive page load (DriverProfile/TrackDetails/Suppliers/StaffAndFacilities) - no
  // extra panel, just capture into the stale-fallback cache.
  // Foundational storage piece for the driver attribute-drift estimator (gpro-tools.eu's "Driver
  // info" - see ARCHITECTURE.md TODOs): persists one snapshot per driver per day, capped at 60
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
    }
  }

  // Fetches an arbitrary same-site page's HTML in the background (no navigation) so its DOM can be
  // parsed the same way as a real visit. Used by "Update All Data" to reach DriverProfile.asp/
  // TrackDetails.asp/Suppliers.asp without making the user actually click through to them.
  function fetchPageHTML(path) {
    return new Promise((resolve, reject) => {
      const url = `https://${getApiHost()}/${getLang()}/${path}`;
      GM_xmlhttpRequest({
        method: 'GET', url,
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
    const results = { driver: false, track: false, suppliers: false, staff: false, weather: false };
    const driverLink = document.querySelector('a[href*="DriverProfile.asp?ID="]');
    const trackLink = document.querySelector('a[href*="TrackDetails.asp?id="]');
    const driverId = driverLink && (driverLink.getAttribute('href').match(/ID=(\d+)/) || [])[1];
    const trackId = trackLink && (trackLink.getAttribute('href').match(/id=(\d+)/) || [])[1];

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
    // Qualify.asp carries the same weather forecast used on Qualify2/RaceSetup - fetching it here
    // means /Practice has a fallback even if the user hasn't opened a qualify page this race weekend.
    jobs.push(fetchPageHTML('Qualify.asp').then((html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const w = parseWeatherDOM(doc);
      if (w) { setStaleData('/Practice', w); results.weather = true; }
    }).catch((e) => logError('background Qualify weather fetch failed:', e.message)));

    await Promise.allSettled(jobs);
    return results;
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
  //   TCD  = Tyre Compound Degradation (time lost running on worn tyres)
  //   FLD  = Fuel Load Degradation (time lost carrying fuel weight)
  //   Pits = pit lane loss × stops + refueling time
  //
  // CTR (Clear Track Risk) multiplies tyre wear rate:
  //   wearMult = 1 + CTR / 50  (CTR=0 → 1.0x, CTR=30 → 1.6x)
  //
  // Factors: track wear, supplier durability, driver attributes,
  //          car suspension, temperature vs supplier peak temp, CTR
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

    // Compound base wear rates (% per lap at CTR=0)
  // Calibrated by Tushant Sharma for Montreal with Jim Buller (Conc=161, Tal=73, Exp=32, TI=122)
  const compoundWearRates = {
    'Extra Soft': 5.65,  // wears fastest
    'Soft': 4.10,
    'Medium': 3.02,
    'Hard': 2.23,        // wears slowest
    'Rain': 3.50,
  };

  // CTR adds 0.01% wear per lap per CTR value (calibrated from data)
  const CTR_WEAR_ADD = 0.01;

  // Pit threshold: pit when final wear reaches this level
  const WEAR_THRESHOLD = 15;

    // Compound speed delta (seconds per lap relative to Medium)
    const compoundSpeedDelta = {
      'Extra Soft': -1.5,
      'Soft': -0.8,
      'Medium': 0,
      'Hard': 0.5,
      'Rain': 0,
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
        // Formula: TCD = stops × (100 - finalWear) × speedDeltaFactor
        const wearPenalty = Math.max(0, (100 - finalWear) / 100);
        const speedDelta = compoundSpeedDelta[name] || 0;
        const tcd = stops * wearPenalty * Math.abs(speedDelta) * 2;

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
    if (!gapp) { console.log('[GPRO][gapp tyre] no GPRO_DATA.gapp loaded'); return null; }
    if (!gappTrack) { console.log(`[GPRO][gapp tyre] track "${trackName}" not found in gapp.trackData`); return null; }
    if (!driver) { console.log('[GPRO][gapp tyre] no driver data'); return null; }
    if (!car) { console.log('[GPRO][gapp tyre] no car data'); return null; }
    if (!supplier || !supplier.name) { console.log('[GPRO][gapp tyre] no supplier data (supplier.name missing)'); return null; }
    const sc = gapp.stopCalc;
    const supFactor = gappLookupByName(sc.tyreSupplierFactor, supplier.name);
    const supCompoundFactor = gappLookupByName(gapp.tyreCompoundSupplierFactor, supplier.name);
    if (supFactor === undefined || supCompoundFactor === undefined) {
      console.log(`[GPRO][gapp tyre] supplier name "${supplier.name}" doesn't match any known key (${Object.keys(sc.tyreSupplierFactor).join(', ')}) - using legacy`);
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
      const pitTimePerStop = (fuelPerStint * infl.fuelInfluence) + pt.base + (infl.concInfluence * staffConc) +
        (hasTd ? (infl.stressInfluence * staffStress) + (infl.tdExpInfluence * tdExp) + (infl.tdPitCoordInfluence * tdPitCoord) : 0);
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

  // Real per-compound total-time data from GPRO Analyzer (github.com/Jadax/gapp has none of this -
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

  // Priority: (1) GAPP's per-track formula (real per-track data + verified formulae), (2) gproanalyzer
  // calibrated data as fallback when GAPP has nothing for this track, (3) our own generic formula.
  // gproanalyzer is NOT treated as ground truth - it's a single external observation and can itself be
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

    if (gappResult && calibrated) {
      result.calibratedCrossCheck = {};
      let divergent = [];
      calibrated.results.forEach(cr => {
        result.calibratedCrossCheck[cr.name] = cr.stops;
        const gr = gappResult.results.find(r => r.name === cr.name);
        if (gr && Math.abs(gr.stops - cr.stops) >= 1) {
          divergent.push(`${cr.name}: gapp=${gr.stops} vs gproanalyzer=${cr.stops}`);
        }
      });
      if (divergent.length) result.calibratedDivergence = divergent;
    }
    return result;
  }

  // ============================================================
  // STRATEGY CONFIDENCE & RISK FACTORS
  // ============================================================
  function calcStrategyConfidence(driver, car, track, weather, tyreResult) {
    let confidence = 75;
    if (driver) {
      confidence += (parseInt(driver.experience) - 50) * 0.2;
      confidence += (parseInt(driver.techInsight) - 50) * 0.15;
      const conc = parseInt(driver.concentration) || 50;
      confidence += (conc - 50) * 0.1;
    }
    if (car) {
      const avgWear = PART_NAMES.map((n, i) => parseInt(car[PART_WEAR_KEYS[i]]) || 0).reduce((a, b) => a + b, 0) / PART_NAMES.length;
      confidence -= avgWear * 0.15;
    }
    if (track && parseInt(track.overtakingDifficulty || track.overtaking || 0) > 70) confidence -= 10;
    if (weather) {
      const segs = [];
      for (let i = 1; i <= 4; i++) {
        segs.push(parseInt(weather[`raceQ${i}RainPLow`] || 0));
        segs.push(parseInt(weather[`raceQ${i}RainPHigh`] || 0));
      }
      const maxRain = Math.max(...segs);
      if (maxRain > 30) confidence -= maxRain * 0.2;
    }
    if (tyreResult && tyreResult.ctrValue > 50) confidence -= (tyreResult.ctrValue - 50) * 0.3;
    return Math.max(30, Math.min(95, Math.round(confidence)));
  }

  function identifyRiskFactors(driver, car, track, weather) {
    const risks = [];
    if (driver) {
      const conc = parseInt(driver.concentration) || 50;
      const aggr = parseInt(driver.aggressiveness) || 50;
      const exp = parseInt(driver.experience) || 50;
      if (conc < 70) risks.push('⚠️ Low concentration: higher error risk in race');
      if (aggr > 85) risks.push('🔥 Very aggressive style: higher tyre/parts wear');
      if (exp < 40) risks.push('📚 Low experience: strategy may need adjustment');
    }
    if (car) {
      const critParts = PART_NAMES.filter((n, i) => (parseInt(car[PART_WEAR_KEYS[i]]) || 0) > 70);
      if (critParts.length > 0) risks.push(`🔧 Worn parts: ${critParts.slice(0, 3).join(', ')} may fail`);
    }
    if (weather) {
      const segs = [];
      for (let i = 1; i <= 4; i++) {
        segs.push({ rain: Math.max(parseInt(weather[`raceQ${i}RainPLow`] || 0), parseInt(weather[`raceQ${i}RainPHigh`] || 0)) });
      }
      const maxRain = Math.max(...segs.map(s => s.rain));
      if (maxRain > 30) risks.push(`🌧️ ${maxRain}% rain chance: consider rain tyre option`);
    }
    if (track) {
      const fuelC = (track.fuelConsumption || 'Medium');
      const tyreW = (track.tyreWear || 'Medium');
      if (tyreW === 'Very High' || tyreW === 'High') risks.push('🛞 High tyre wear track: aggressive compounds risky');
      if (fuelC === 'Very High' || fuelC === 'High') risks.push('⛽ High fuel consumption: plan fuel carefully');
    }
    return risks;
  }

  function generateStrategyNotes(driver, track, weather, tyreResult) {
    const notes = [];
    if (tyreResult) {
      if (tyreResult.ctrValue > 60) notes.push('⚠️ High CTR: increase tyre budget or reduce risk');
      if (tyreResult.results && tyreResult.results[0]) {
        const best = tyreResult.results[0];
        if (best.stops === 0) notes.push('🏁 No-stop strategy: monitor tyre wear closely');
        else if (best.stops === 1) notes.push('🛑 1-stop strategy: optimal for most conditions');
        else notes.push('🛑🛑 Multi-stop: higher risk but can pay off');
      }
    }
    if (weather) {
      const segs = [];
      for (let i = 1; i <= 4; i++) {
        segs.push(Math.max(parseInt(weather[`raceQ${i}RainPLow`] || 0), parseInt(weather[`raceQ${i}RainPHigh`] || 0)));
      }
      const maxRain = Math.max(...segs);
      if (maxRain > 50) notes.push('🌧️ High rain probability: prepare wet setup');
      else if (maxRain > 20) notes.push('⛅ Possible rain: keep options open');
    }
    if (track) {
      if (track.grip === 'Very Low' || track.grip === 'Low') notes.push('🏎️ Low grip: conservative setup recommended');
      if (track.overtaking === 'Hard' || track.overtaking === 'Very Hard') notes.push('🚧 Hard to overtake: qualifying position crucial');
    }
    if (driver) {
      const aggr = parseInt(driver.aggressiveness) || 50;
      if (aggr < 30) notes.push('🐢 Conservative driver: focus on consistency');
      else if (aggr > 80) notes.push('⚡ Aggressive driver: higher push possible');
    }
    return notes;
  }

  // ============================================================
  // CAR SETUP CALCULATOR
  // ============================================================
  // Temperature coefficients derived by Tushant Sharma from Montreal calibration data
  // Each part has a base value at 0°C and a coefficient per °C
  const SETUP_PARTS = ['Front Wing', 'Rear Wing', 'Engine', 'Brakes', 'Gearbox', 'Suspension'];
  const SETUP_BASE_Q1 = { 'Front Wing': 227, 'Rear Wing': 567, 'Engine': 809, 'Brakes': 334, 'Gearbox': 686, 'Suspension': 493 };
  const SETUP_COEFF = { 'Front Wing': 4.77, 'Rear Wing': 6.03, 'Engine': -3.13, 'Brakes': 6.0, 'Gearbox': -4.0, 'Suspension': -6.0 };
  // Q1→Q2 and Q2→Race deltas - calibrated from Jim Buller's actual usage
  // Jim Buller (Conc=161, Tal=73, Exp=32, TI=122) uses 0 deltas
  // These vary by driver; check RaceAnalysis after race to refine
  const SETUP_Q2_DELTA = { 'Front Wing': 0, 'Rear Wing': 0, 'Engine': 0, 'Brakes': 0, 'Gearbox': 0, 'Suspension': 0 };
  const SETUP_RACE_DELTA = { 'Front Wing': 0, 'Rear Wing': 0, 'Engine': 0, 'Brakes': 0, 'Gearbox': 0, 'Suspension': 0 };

  // Wet modifiers: adjustment to setup when track is wet (Wet - Dry at same temp)
  // Derived by Tushant Sharma from Spa gproanalyzer data (50°C)
  // Gearbox drops massively in wet (-206) for shorter ratios / more traction
  const SETUP_WET_MOD = {
    'Front Wing': 68, 'Rear Wing': -44, 'Engine': -5,
    'Brakes': 5, 'Gearbox': -206, 'Suspension': 6,
  };

  // Track PHA adjustment: per unit of track Power above Montreal baseline (12)
  // Derived by Tushant Sharma from Montreal vs Spa gproanalyzer comparison
  // Higher track Power → more FW/RW/Susp, less Brakes/Gearbox
  const SETUP_TRACK_ADJ = {
    'Front Wing': 54.6, 'Rear Wing': 19.2, 'Engine': 6.5,
    'Brakes': -16.0, 'Gearbox': -13.5, 'Suspension': 20.0,
  };
  const MONTREAL_POWER = 12;

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
  // Source: github.com/Jadax/gapp calcs.py setupCalc, verified by reading source directly
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
    if (!gapp) { console.log('[GPRO][gapp setup] no GPRO_DATA.gapp loaded'); return null; }
    if (!gappTrack) { console.log(`[GPRO][gapp setup] track "${trackName}" not found in gapp.trackData`); return null; }
    if (!driver) { console.log('[GPRO][gapp setup] no driver data'); return null; }
    if (!car) { console.log('[GPRO][gapp setup] no car data'); return null; }
    // Only reject if car is essentially empty (no part levels at all, e.g. the {lvlEngine,lvlSusp}
    // minimal fallback used before /UpdateCar has ever loaded). Missing individual parts already
    // default to 0 contribution via gappCarPartLvl, so don't require every field to be present.
    const anyLevelPresent = PART_LVL_KEYS.some(k => parseInt(car[k]) > 0);
    if (!anyLevelPresent) { console.log('[GPRO][gapp setup] car object has no part levels at all - using legacy'); return null; }

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
    // setup - ported from gpro-pitwall's SetupCalculatorService (disclosed public default 0.39,
    // applied to each part's driver-contribution term). Approximated here at whole-term granularity
    // (pitwall applies it more selectively per sub-term) since our formula combines each part's
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

  // Margin of Acceptance formula (reverse-engineered by Tushant Sharma)
  // MA = 135 - 0.3 × Technical Knowledge - 0.1 × Experience
  // Smaller MA = more precise setup needed = better driver for setup
  function calcMarginOfAcceptance(driver) {
    if (!driver) return null;
    const techKnowledge = parseInt(driver.techInsight || driver.technicalInsight) || 50;
    const experience = parseInt(driver.experience) || 50;
    return Math.round(135 - 0.3 * techKnowledge - 0.1 * experience);
  }

  // ============================================================
  // DRIVER STRATEGY (RaceSetup.asp risk block) - overtake/defend/start-approach/problem-pit-laps
  // ported from github.com/Jadax/gpro-pitwall's RiskAdvisorService (2026-07-19), a fully-disclosed
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
  // Reimplemented (2026-07-19) directly against gpro-pitwall's actual current
  // RiskAdvisorService::phrase() source (previously this was built from the README's description
  // only, which turned out to undersell it - the real version has a per-rating-tier lead sentence
  // plus up to 2 caveats from a richer, ordered list, not just grip/long-race). Purely a template
  // over numbers already computed here - no LLM involved, degrades to a generic sentence if driver
  // data is thin, per the AI-first principles in ARCHITECTURE.md.
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
  // is likely, since a wet race rewrites the whole plan anyway. Ported from gpro-pitwall's
  // RiskAdvisorService::strategyTip() (reviewed 2026-07-19) - a heuristic, not a game formula.
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
  // (normal-length races say nothing). Ported from gpro-pitwall's RiskAdvisorService::distanceTip()
  // (reviewed 2026-07-19) - same RISK_SHORT_RACE_KM/RISK_LONG_RACE_KM bands already used elsewhere
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

  // "Time gain due to CTR" gadget (from gproanalyzer.info's toolset, reviewed 2026-07-19).
  // seasonTrack.ctrGain/.ctrRace (GPRO Analyzer season data, see gpro-data.js) are gain-at-CTR=100
  // figures (confirmed ctrRace = ctrGain * laps for every track in the table); time gained at an
  // arbitrary CTR scales roughly linearly with it, per general GPRO community understanding - own
  // simple scaling assumption, not a disclosed formula, flagged as such in the UI.
  function calcCtrTimeGain(seasonTrack, ctr) {
    if (!seasonTrack || seasonTrack.ctrGain == null) return null;
    const frac = Math.max(0, Math.min(100, ctr || 0)) / 100;
    return { perLap: +(seasonTrack.ctrGain * frac).toFixed(3), total: +(seasonTrack.ctrRace * frac).toFixed(1) };
  }

  // Boost-lap placement (3 sets of 3 laps): pays where pace converts into something - passing
  // chances in a pack, track position through the pit cycle (overcut via boosted in-laps), or gap
  // defence in the closing laps. Also ported from gpro-pitwall's RiskAdvisorService.
  function calcBoostLapSuggestion(laps, stops, overtaking, raceWet, rainAvg) {
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
    // Real GPRO formula (confirmed via gpro-pitwall's disclosed BoostFuelService, reviewed
    // 2026-07-19): extra fuel = ROUNDUP(boost_laps * lap_length_km * a per-track dry/wet
    // coefficient). We don't have that per-track coefficient from any source we've checked (not in
    // GAPP's trackData columns, not disclosed in gpro-pitwall's own public code either) so we can't
    // compute a real number - saying so explicitly rather than leaving a vague "a few extra litres"
    // reminder that looks like it should be more specific than it is.
    note += ' Boosts burn extra fuel per the real GPRO formula (laps x lap length x a per-track coefficient) - budget for it, but we don\'t have that coefficient from any source checked, so no number is shown here.';

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
  // Formula from GPRO: cost(level) = round(1.2385^(level-1) * baseCost)
  const PART_COSTS = {
    'Chassis':     [0, 1.29, 1.60, 1.98, 2.46, 3.04, 3.77, 4.66, 5.78, 7.16],
    'Engine':      [0, 3.31, 4.10, 5.08, 6.29, 7.79, 9.65, 11.95, 14.80, 18.33],
    'Front Wing':  [0, 1.55, 1.92, 2.38, 2.95, 3.65, 4.52, 5.60, 6.93, 8.59],
    'Rear Wing':   [0, 1.50, 1.86, 2.31, 2.86, 3.54, 4.38, 5.43, 6.72, 8.33],
    'Underbody':   [0, 0.51, 0.63, 0.78, 0.97, 1.20, 1.49, 1.84, 2.28, 2.82],
    'Sidepods':    [0, 0.46, 0.57, 0.71, 0.87, 1.08, 1.34, 1.66, 2.06, 2.55],
    'Cooling':     [0, 0.45, 0.56, 0.70, 0.86, 1.07, 1.32, 1.64, 2.03, 2.52],
    'Gearbox':     [0, 3.10, 3.84, 4.75, 5.89, 7.29, 9.03, 11.18, 13.85, 17.15],
    'Brakes':      [0, 0.70, 0.86, 1.07, 1.33, 1.64, 2.03, 2.52, 3.12, 3.86],
    'Suspension':  [0, 1.18, 1.46, 1.81, 2.24, 2.78, 3.44, 4.26, 5.28, 6.54],
    'Electronics': [0, 0.94, 1.16, 1.44, 1.78, 2.21, 2.73, 3.39, 4.19, 5.19],
  };

  // Base cost values (for exponential formula)
  const PART_BASE_COST = {
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
  const PART_BASE_RACE_WEAR = {
    'Chassis': 21, 'Engine': 37, 'Front Wing': 21, 'Rear Wing': 14,
    'Underbody': 20, 'Sidepods': 15, 'Cooling': 11, 'Gearbox': 29,
    'Brakes': 36, 'Suspension': 35, 'Electronics': 10,
  };
  // CTR effect per unit (extra wear per CTR point)
  const PART_CTR_WEAR = {
    'Chassis': 0.10, 'Engine': 0.16, 'Front Wing': 0.10, 'Rear Wing': 0.06,
    'Underbody': 0.08, 'Sidepods': 0.08, 'Cooling': 0.04, 'Gearbox': 0.14,
    'Brakes': 0.46, 'Suspension': 0.12, 'Electronics': 0.06,
  };

  // Driver wear factor: higher attributes = lower factor = less wear
  // Derived by Tushant Sharma from driver attribute analysis
  // Car Wear effects per attribute point (from zero baseline):
  //   Concentration: ~0.025% per point
  //   Talent: ~0.024% per point
  //   Experience: ~0.021% per point
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

  // Computes GAPP's predicted whole-race wear % for one part, or null if track/data unavailable.
  // Own calibration stays PRIMARY here too - a numeric check at Montreal showed GAPP's wearData
  // runs a consistent ~25-30% higher than our gproanalyzer-calibrated numbers across all 11
  // parts (same "systematically different, not obviously wrong, but not proven either" pattern
  // as the tyre-stop formula) - so it's exposed as a cross-check, not swapped in as primary,
  // since these numbers directly drive real-money upgrade/downgrade recommendations.
  function gappPartRaceWear(gappWear, levelFactors, partIdx, lvl, ctr, driverFactor) {
    if (!gappWear || !levelFactors) return null;
    const clampedLvl = Math.min(9, Math.max(1, lvl || 1));
    const levelExp = Math.pow(levelFactors[clampedLvl - 1], ctr);
    return Math.round(gappWear.values[partIdx] * levelExp * driverFactor);
  }

  // Testing-session per-lap wear estimate. Ported from gpro-pitwall's CarWearService
  // (reviewed 2026-07-19, `testingWearRates()`) - the one fully-disclosed public constant in that
  // file: TESTING_WEAR_FACTOR = 0.53, calibrated by that project against two real testing sessions
  // (a 30-lap and a 100-lap run, both best-fitting ~0.533). Their own reasoning, reused as-is:
  // testing wears the car at roughly half the full-race per-lap rate, with no risk/CTR exponent
  // and no level factor (level only modulates *risk-driven* wear, and testing has no clear-track
  // risk) - so this is just (full-race trackBase wear / race laps) * driverFactor * 0.53, using the
  // exact same gappWear.values[] this file already uses for race-wear (gappPartRaceWear above).
  const TESTING_WEAR_FACTOR = 0.53;
  function calcTestingWearPerLap(trackName, driver) {
    const gappWear = lookupGappTrack(trackName, 'wearData');
    const seasonTrack = lookupSeasonTrack(trackName);
    if (!gappWear || !seasonTrack || !seasonTrack.laps) return null;
    const driverFactor = calcDriverWearFactor(driver);
    return PART_NAMES.map((name, i) => ({
      name,
      perLap: +(gappWear.values[i] * driverFactor * TESTING_WEAR_FACTOR / seasonTrack.laps).toFixed(3),
    }));
  }

  // GAPP's per-track wear data is PRIMARY here whenever the track is found (falls back to our
  // Montreal-only calibration otherwise). NOTE: a numeric check at Montreal found GAPP's numbers
  // run a consistent ~25-30% higher than our gproanalyzer calibration across all 11 parts - own
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
  // CAR COSTS TABLE
  // ============================================================
  // Cost in millions to upgrade/replace each part at each level
  const CAR_COSTS = {
    'Chassis':     [1.29, 1.60, 1.98, 2.46, 3.04, 3.77, 4.66, 5.78, 7.16],
    'Engine':      [3.31, 4.10, 5.08, 6.29, 7.79, 9.65, 11.95, 14.80, 18.33],
    'Front Wing':  [1.55, 1.92, 2.38, 2.95, 3.65, 4.52, 5.60, 6.93, 8.59],
    'Rear Wing':   [1.50, 1.86, 2.31, 2.86, 3.54, 4.38, 5.43, 6.72, 8.33],
    'Underbody':   [0.51, 0.63, 0.78, 0.97, 1.20, 1.49, 1.84, 2.28, 2.82],
    'Sidepods':    [0.46, 0.57, 0.71, 0.87, 1.08, 1.34, 1.66, 2.06, 2.55],
    'Cooling':     [0.45, 0.56, 0.70, 0.86, 1.07, 1.32, 1.64, 2.03, 2.52],
    'Gearbox':     [3.10, 3.84, 4.75, 5.89, 7.29, 9.03, 11.18, 13.85, 17.15],
    'Brakes':      [0.70, 0.86, 1.07, 1.33, 1.64, 2.03, 2.52, 3.12, 3.86],
    'Suspension':  [1.18, 1.46, 1.81, 2.24, 2.78, 3.44, 4.26, 5.28, 6.54],
    'Electronics': [0.94, 1.16, 1.44, 1.78, 2.21, 2.73, 3.39, 4.19, 5.19],
  };
  const CAR_COST_TOTALS = [15.00, 18.58, 23.01, 28.50, 35.29, 43.71, 54.13, 67.04, 83.03];

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

    // Fallback: find the largest dollar amount on the page
    if (result.cash === 0) {
      const allText = document.body.innerText;
      const dollarMatches = [...allText.matchAll(/\$([\d.,]{4,})/g)];
      const candidates = dollarMatches.map(m => parseGproCash(m[0])).filter(v => v >= 100 && v <= 500000000);
      if (candidates.length > 0) result.cash = Math.max(...candidates);
    }
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
      console.log(`[GPRO] DOM parse: ${result.parts.length} parts found, ${zeroLvl} missing levels, ${zeroWear} missing wear`);
    } else {
      logError('DOM parse: NO selects found with name/id starting with "Buy"');
      console.log('[GPRO] All selects on page:', Array.from(document.querySelectorAll('select')).map(s => s.name || s.id || '(unnamed)').join(', '));
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
            if (v > 0 && v <= 10) { p.currentLevel = v; console.log(`[GPRO] Text fallback: ${p.name} level ${v}`); }
          }
        }
        if (p.currentWear === 0) {
          const nameEsc = p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const wearRe = new RegExp(nameEsc + '.*?(\\d{1,3})%', 'is');
          const m = allText.match(wearRe);
          if (m) {
            const v = parseInt(m[1]);
            if (v >= 0 && v <= 100) { p.currentWear = v; console.log(`[GPRO] Text fallback: ${p.name} wear ${v}%`); }
          }
        }
      }
    }

    // If still no parts found, try scanning ALL table rows on the page
    if (result.parts.length === 0) {
      console.log('[GPRO] Trying table row fallback for levels...');
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
              console.log(`[GPRO] Table fallback: ${name} level ${lvl}`);
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
  // since detectLeagueFromMenu() (added 2026-07-19) gives the real league instead of assuming
  // Amateur. Falls back to Amateur's targets if the league is unknown/unset or GPRO_DATA didn't
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
  // Priority: Engine/Brakes (Power+Handling) > Chassis/FW/RW/Susp (Handling) > GB/Elec (Accel) > Others
  const UPGRADE_PRIORITY = {
    'Engine': 1, 'Brakes': 2, 'Chassis': 3, 'Front Wing': 3, 'Rear Wing': 3,
    'Suspension': 4, 'Gearbox': 4, 'Electronics': 5, 'Underbody': 6, 'Sidepods': 6, 'Cooling': 6,
  };

  // Wear-per-lap estimates calibrated from GPRO Analyzer data (Spa GP, 44 laps, High wear, CTR 0)
  // endWear = currentWear + wearPerLap * laps
  const BASE_WEAR_PER_LAP = {
    'Chassis': 0.48, 'Engine': 0.80, 'Front Wing': 0.45, 'Rear Wing': 0.52,
    'Underbody': 0.52, 'Sidepods': 0.34, 'Cooling': 0.30, 'Gearbox': 0.64,
    'Brakes': 0.70, 'Suspension': 0.77, 'Electronics': 0.30,
  };
  const WEAR_SCALE = { 'Low': 0.6, 'Medium': 0.85, 'High': 1.0 };

  // ============================================================
  // SEASON TRACK DATA — loaded from gpro-data.js via @require
  // Fallback to hardcoded if file not available
  // ============================================================
  const SEASON_TRACKS = (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.tracks) || {
    'Barcelona GP':     { ctrGain: 2.832, ctrRace: 184.092, avgTemp: 30.46, wearIntensity: 1.15 },
    'Ahvenisto GP':     { ctrGain: 3.277, ctrRace: 262.175, avgTemp: 25.07, wearIntensity: 0.95 },
    'Magny Cours GP':   { ctrGain: 2.928, ctrRace: 210.845, avgTemp: 27.25, wearIntensity: 1.00 },
    'Poznan GP':        { ctrGain: 2.856, ctrRace: 214.223, avgTemp: 27.66, wearIntensity: 1.20 },
    'Al-Ring GP':       { ctrGain: 2.714, ctrRace: 192.694, avgTemp: 26.82, wearIntensity: 1.10 },
    'Jyllands-Ringen GP': { ctrGain: 4.111, ctrRace: 559.049, avgTemp: 27.03, wearIntensity: 1.25 },
    'Silverstone GP':   { ctrGain: 2.302, ctrRace: 119.708, avgTemp: 27.14, wearIntensity: 0.90 },
    'Buenos Aires GP':  { ctrGain: 3.309, ctrRace: 238.233, avgTemp: 26.31, wearIntensity: 1.05 },
    'Austin GP':        { ctrGain: 3.242, ctrRace: 181.580, avgTemp: 28.42, wearIntensity: 1.10 },
    'Montreal GP':      { ctrGain: 2.905, ctrRace: 200.463, avgTemp: 27.52, wearIntensity: 1.00 },
    'Spa GP':           { ctrGain: 2.543, ctrRace: 111.904, avgTemp: 14.79, wearIntensity: 1.00 },
    'Kaunas GP':        { ctrGain: 2.908, ctrRace: 232.670, avgTemp: 20.21, wearIntensity: 1.05 },
    'Hungaroring GP':   { ctrGain: 3.206, ctrRace: 246.852, avgTemp: 25.56, wearIntensity: 1.20 },
    'Losail GP':        { ctrGain: 2.600, ctrRace: 148.198, avgTemp: 5.98,  wearIntensity: 0.85 },
    'New Delhi GP':     { ctrGain: 2.712, ctrRace: 162.742, avgTemp: 31.24, wearIntensity: 1.10 },
    'Yas Marina GP':    { ctrGain: 2.846, ctrRace: 156.526, avgTemp: 23.79, wearIntensity: 0.95 },
    'Baku City GP':     { ctrGain: 2.897, ctrRace: 147.757, avgTemp: 29.63, wearIntensity: 0.90 },
  };

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

  function lookupTrackHistory(trackName) {
    if (!trackName || typeof GPRO_DATA === 'undefined' || !GPRO_DATA.trackHistory) return null;
    for (const [key, data] of Object.entries(GPRO_DATA.trackHistory)) {
      if (trackName.includes(key.split(' ')[0]) || key.includes(trackName.split(' ')[0])) {
        return data;
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
    // GAPP's per-track wear data is PRIMARY here, driving the real-money recommendations below.
    // NOTE: a numeric check at Montreal found it runs ~25-30% higher than our gproanalyzer
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
      return { name, idx: i, lvl, wear, remaining, endWear, totalRaceWear, gappRaceWear, ownTotalRaceWear, opts, isFast, alertPct, target, priority,
               critical: remaining <= CRITICAL_WEAR, flagged: remaining <= alertPct,
               belowTarget: lvl < target, atTarget: lvl >= target,
               willFail: laps > 0 && endWear >= 100, atRisk: laps > 0 && endWear >= 85 };
    });

    let runCash = cash;
    const recs = [];

    const actionable = parts.filter(p => p.willFail || p.critical || p.flagged || p.belowTarget)
      .sort((a, b) => {
        if (a.willFail && !b.willFail) return -1;
        if (!a.willFail && b.willFail) return 1;
        if (a.critical && !b.critical) return -1;
        if (!a.critical && b.critical) return 1;
        if (a.flagged && !b.flagged) return -1;
        if (!a.flagged && b.flagged) return 1;
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
        // Part WILL FAIL this race — must fix
        if (upgrades.length > 0) {
          const best = upgrades[0];
          const cost = best.cost || 0;
          runCash -= cost;
          recs.push({ part: p, verdict: 'UPGRADE',
            detail: `FAIL at ~${Math.round(p.endWear)}%! Upgrade to L${best.newLvl} — $${cost.toLocaleString()} (resets wear)`,
            cost, newLvl: best.newLvl, newWear: best.wear, remainingCash: runCash, color: '#ef4444' });
        } else if (replacements.length > 0) {
          const best = replacements[0];
          const cost = best.cost || 0;
          runCash -= cost;
          recs.push({ part: p, verdict: 'REPLACE',
            detail: `FAIL at ~${Math.round(p.endWear)}%! Replace L${p.lvl} — $${cost.toLocaleString()} (resets wear)`,
            cost, newLvl: best.newLvl, newWear: best.wear, remainingCash: runCash, color: '#ef4444' });
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
          recs.push({ part: p, verdict: 'CRITICAL',
            detail: `FAIL at ~${Math.round(p.endWear)}%! No affordable option. Budget: $${runCash.toLocaleString()}`,
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
        if (upgrades.length > 0) {
          const best = upgrades[0];
          const cost = best.cost || 0;
          runCash -= cost;
          recs.push({ part: p, verdict: 'UPGRADE',
            detail: `Below target (L${p.lvl}→L${p.target}) — Upgrade to L${best.newLvl} — $${cost.toLocaleString()}`,
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

    const sortOrder = { FAIL: 0, CRITICAL: 1, UPGRADE: 2, REPLACE: 3, DOWNGRADE: 4, WAIT: 5, SAVE: 6 };
    recs.sort((a, b) => (sortOrder[a.verdict] || 99) - (sortOrder[b.verdict] || 99));

    return { parts, recs, cash, projectedCash: runCash, trackWear: trackWearStr, laps, league: league || 'Amateur', leagueNotes: leagueTargets.notes || '' };
  }

  // ============================================================
  // PHA BARS
  // ============================================================
  // Rank-based PHA match, in the spirit of gpro-pitwall's "PHA match" badge (reviewed 2026-07-19):
  // 'perfect' = car and track agree on the full Power/Handling/Accel priority order, 'top' = they
  // at least agree on which one matters most, 'none' = no alignment. Deterministic, no thresholds
  // borrowed from anywhere secret - just a rank comparison over data we already have.
  // Rewritten 2026-07-19 against gpro-pitwall's actual current PhaMatchService::matchLevel()
  // source (previous version used naive Array.sort()-based ranking, which is wrong on ties - two
  // equal values get an arbitrary, unstable order from sort(), so "perfect" could silently
  // misfire whenever a car or track had two equal PHA values, e.g. a fresh car at 6/6/6).
  // Competition ranking (ties share a rank, e.g. 1,1,3) is the correct comparison: 'perfect' =
  // every attribute at the same rank on both sides (ties included); 'top' = the track has a
  // single, unambiguous #1 attribute that's also the car's single #1 (a tied #1 on either side
  // can only ever be 'perfect', never 'top' - matches the source's stated design exactly).
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

  // "Push or hold?" checklist - turns several independent signals into one read for how much CTR
  // risk to carry this race. Modeled on gpro-pitwall's Push/hold checklist (reviewed 2026-07-19):
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
    // Q1's own weather is irrelevant on the Q2 page - you never practice/run Q1 here (setup comes
    // from gapp/gproanalyzer, not practice-lap feedback), so only show the dropdown for the session
    // actually being driven. The Q1 dropdown still renders (hidden) on Q1 pages as before.
    if (!isQ2) h += `<span style="color:#d1d5db;">Q1: <select id="gpro-q1-weather-q" style="font-size:10px;background:#1f2937;color:#f9fafb;border:1px solid #374151;border-radius:3px;"><option value="0"${!q1WetQ ? ' selected' : ''}>☀️ Dry</option><option value="1"${q1WetQ ? ' selected' : ''}>🌧️ Wet</option></select></span>`;
    h += `<span style="color:#d1d5db;">Q2: <select id="gpro-q2-weather-q" style="font-size:10px;background:#1f2937;color:#f9fafb;border:1px solid #374151;border-radius:3px;"><option value="0"${!q2WetQ ? ' selected' : ''}>☀️ Dry</option><option value="1"${q2WetQ ? ' selected' : ''}>🌧️ Wet</option></select></span>`;
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
      setupHtml += `<div style="font-size:9px;color:#6b7280;margin-top:2px;">Setup source: ${setup.source === 'gapp' ? 'driver+car-aware (gapp)' : 'temperature-only (legacy)'}</div>`;
      setupHtml += wingSplitLabel(setup.Q1);
      setupHtml += mkHappyRangeLabel(driver);
      setupHtml += `<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap;">`;
      setupHtml += `<button id="gpro-copy-q1" style="background:#3b82f6;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;">📋 Copy ${sessionLabel} Setup</button>`;
      setupHtml += `</div>`;
      setupHtml += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">Track-adjusted (P=${trackPower}). ${sessionWet ? 'Wet modifiers applied.' : 'Dry setup.'}</div>`;
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

    // AI Coaching - same opt-in, click-to-fetch, cached-per-race pattern as renderRaceSetup
    // (see callAiCoach/ARCHITECTURE.md iteration 14/15). Cache key includes the session label so
    // Q1 and Q2 pages for the same track don't collide (they can have different weather/tyre calls).
    let aiCoachContextQ = null;
    if (getAiKey()) {
      aiCoachContextQ = {
        session: sessionLabel,
        track: qualTrackName || 'unknown',
        weather: analyze ? { commitRain: analyze.commitRain, maxRain: analyze.maxRain } : null,
        setup: setup ? { source: setup.source, sessionTemp: Math.round(sessionTemp), sessionWet } : null,
        tyreChoice: tyre ? { compound: tyre.finalRec, reason: tyre.recReason, source: tyre.source } : null,
        ctr,
      };
      h += mkSection('AI Coaching',
        `<button id="gpro-ai-coach-btn-q" style="background:#7c3aed;color:#fff;border:none;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:11px;">🤖 Get AI Coaching</button><div id="gpro-ai-coach-out-q" style="margin-top:6px;"></div>`
      );
    }

    body(h);
    wireDecisionBoard();

    if (aiCoachContextQ) {
      wireAiCoachButton('gpro-ai-coach-btn-q', 'gpro-ai-coach-out-q', aiCoachContextQ, `ai_coach_${aiCoachContextQ.track}_${aiCoachContextQ.session}`);
    }

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
    // Use full car data from /UpdateCar for levels, wear, and PHA
    const car = carData || (practice ? { lvlEngine: practice.lvlEngine, lvlSusp: practice.lvlSusp } : null);
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
        // on each FuelStop field) - confirmed against gpro-pitwall's StrategyService, which bumps the
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
    })() : calcFuelSimple(track, testing, driver);

    let h = mkStaleBanner(practice, track, testing, driver, carData);

    // Track info - compact (game already shows full details)
    const trackPower = parseInt(track && (track.trackPower || track.power)) || 0;
    const trackHandl = parseInt(track && (track.trackHandl || track.handling)) || 0;
    const trackAccel = parseInt(track && (track.trackAccel || track.acceleration)) || 0;
    const carPower = parseInt(car && (car.carPower || car.power)) || 0;
    const carHandl = parseInt(car && (car.carHandl || car.handling)) || 0;
    const carAccel = parseInt(car && (car.carAccel || car.acceleration)) || 0;

    // Decision-summary board (gpro-pitwall-style Cockpit pattern, reviewed 2026-07-19): one verdict
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
        pushHoldForBoard ? { id: 'gpro-sec-pushhold', label: 'Push or Hold', verdict: `${pushHoldForBoard.metCount}/${pushHoldForBoard.total}`, tone: pushHoldForBoard.metCount === pushHoldForBoard.total ? 'good' : pushHoldForBoard.metCount === 0 ? 'bad' : 'warn' } : null,
        tyre ? { id: 'gpro-sec-tyre', label: 'Tyre', verdict: tyre.finalRec, tone: tyre.source === 'gapp' ? 'good' : tyre.source === 'calibrated' ? 'warn' : 'info' } : null,
        { id: 'gpro-sec-setup', label: 'Setup', verdict: 'view', tone: 'info' },
      ]);
    }

    h += mkSection('Track',
      mkRow('Name', (practice||{}).trackName || (track||{}).trackName || '?') +
      mkRow('Laps', (track||{}).laps || '?') +
      mkRow('Pit Loss', `${(track||{}).timeInOutPits || '?'}s`)
    );

    // PHA: Car character vs Track
    if (trackPower || trackHandl || trackAccel) {
      const phaBar = (carVal, trackVal, name) => {
        const diff = carVal - trackVal;
        const color = diff >= 3 ? '#10b981' : diff >= 0 ? '#f59e0b' : '#ef4444';
        const sign = diff >= 0 ? '+' : '';
        return `<div style="margin:4px 0;font-size:10px;"><span style="color:#9ca3af;width:75px;display:inline-block;">${name}</span> <span style="color:#f9fafb;font-weight:700;">${carVal}</span> <span style="color:#6b7280;">/</span> <span style="color:#d1d5db;">${trackVal}</span> <span style="color:${color};font-weight:700;">(${sign}${diff})</span> ${diff >= 3 ? '🟢' : diff >= 0 ? '🟡' : '🔴'}</div>`;
      };
      const phaMatch = calcPhaMatch(car, { power: trackPower, handling: trackHandl, accel: trackAccel });
      const phaMatchBadge = phaMatch && phaMatch.level !== 'none'
        ? mkRec(phaMatch.level === 'perfect' ? '🏆 Perfect PHA match - your car\'s full priority order mirrors this track.' : '⭐ Top match - your car\'s strongest attribute is this track\'s most important one.', 'good')
        : '';
      h += mkSection('PHA: Car vs Track',
        phaMatchBadge +
        phaBar(carPower, trackPower, 'Power') +
        phaBar(carHandl, trackHandl, 'Handling') +
        phaBar(carAccel, trackAccel, 'Acceleration') +
        `<div style="font-size:9px;color:#6b7280;margin-top:4px;">🟢 +3 or more | 🟡 0 to +2 | 🔴 negative</div>`,
        'gpro-sec-pha'
      );
    }

    // Push or hold? - aggregate CTR-risk signal (see calcPushOrHoldSignal for methodology)
    {
      const trackPhaForSignal = (trackPower || trackHandl || trackAccel) ? { power: trackPower, handling: trackHandl, accel: trackAccel } : null;
      const wearPartsForSignal = car ? calcPartsWear(car, driver, ctr, (practice||{}).trackName || (track||{}).trackName) : null;
      const pushHold = calcPushOrHoldSignal(car, track, trackPhaForSignal, tyre, wearPartsForSignal);
      if (pushHold) {
        let phHtml = mkRec(pushHold.verdict, pushHold.metCount === pushHold.total ? 'good' : pushHold.metCount === 0 ? 'bad' : 'warn');
        pushHold.signals.forEach(s => { phHtml += mkRow(`${s.met ? '✅' : '❌'} ${s.label}`, s.detail); });
        h += mkSection('Push or Hold?', phHtml, 'gpro-sec-pushhold');
      }
    }

    // Weather
    h += mkWeatherForecastSection(analyze, { rainLabel: 'RAIN PLAN COMMITTED', showAvg: false, id: 'gpro-sec-weather' });

    // Fuel
    if (fuel) {
      const stintsLabel = fuel.fromDomFuelStart
        ? `${fuel.stint1Fuel}L (start, from Q2) + ${fuel.stints - 1} x ${fuel.fuelPerStint}L`
        : `${fuel.stints} x ${fuel.fuelPerStint}L`;
      h += mkSection('Fuel Strategy',
        mkRow('Total Fuel', `${fuel.totalFuel}L`) +
        mkRow('Fuel/Lap', `${fuel.fuelPerLap}L`) +
        mkRow('Stints', stintsLabel) +
        mkRow('Pit Stops', `${fuel.stops}`) +
        (fuel.stopLaps.length ? mkRow('Est. Pit Laps', fuel.stopLaps.join(', ')) : '') +
        mkRec((fuel.fromDomFuelStart
          ? `Start fuel is <strong>${fuel.stint1Fuel}L</strong> (locked in from Q2's "First stint fuel") - load <strong>${fuel.fuelPerStint}L</strong> for each remaining stop`
          : `Load <strong>${fuel.fuelPerStint}L</strong> per stint (${fuel.stops} stop${fuel.stops === 1 ? '' : 's'})`) +
          (fuel.stopLaps.length ? ` - car auto-pits around lap ${fuel.stopLaps.join('/')} when that fuel runs out (or sooner for rain/damage)` : ''), 'good') +
        `<div style="font-size:9px;color:#6b7280;margin-top:2px;">You set fuel amounts per stint on RaceSetup.asp, not pit laps - the game pits automatically when fuel runs low, tyres/weather force a change, or a mechanical issue occurs.</div>` +
        (fuel.fromDomFuelStart ? `<div style="font-size:9px;color:#f59e0b;margin-top:2px;">Simple dry-race split - if rain changes tyre compound mid-race, fuel/lap changes too and this doesn't yet model that per-segment.</div>` : '')
      );
    } else {
      h += mkSection('Fuel Strategy', mkRec('Complete testing to get fuel data', 'warn'));
    }

    // Testing wear estimate - ported from gpro-pitwall's CarWearService::testingWearRates()
    // (reviewed 2026-07-19), a fully-disclosed constant (TESTING_WEAR_FACTOR=0.53) this project
    // didn't have any equivalent for. Only shown when there's an actual testing session with laps
    // done, at whichever track the testing happened at (can differ from the race track).
    if (testing && testing.trackName && testing.stintsDone && testing.stintsDone.length) {
      const lapsDoneTotal = testing.stintsDone.reduce((sum, s) => sum + (parseInt((s.lapsDone || '0/0').split('/')[0]) || 0), 0);
      const wearRates = lapsDoneTotal > 0 ? calcTestingWearPerLap(testing.trackName, driver) : null;
      if (wearRates) {
        let twHtml = mkRow('Testing laps done', lapsDoneTotal);
        wearRates.forEach(w => {
          const added = +(w.perLap * lapsDoneTotal).toFixed(1);
          if (added >= 0.5) twHtml += mkRow(w.name, `+${added}% (${w.perLap}%/lap)`);
        });
        twHtml += `<div style="font-size:9px;color:#f59e0b;margin-top:4px;">Testing wears the car at roughly half the full-race per-lap rate (ported from gpro-pitwall's disclosed 0.53 factor, calibrated against real sessions) - own estimate, not confirmed against your actual current wear.</div>`;
        h += mkSection(`Testing Wear (${testing.trackName})`, twHtml);
      }
    }

    // Tyre
    if (tyre) {
      h += mkSection('Tyre Strategy',
        mkRec(`<strong>${tyre.finalRec}</strong><br><span style="font-size:10px;">${tyre.recReason}</span>`, 'good') + mkTyreSourceNote(tyre) +
        mkRow('Fuel/Lap', `${tyre.fuelPerLap}L`) +
        mkRow('Total Fuel', `${tyre.totalFuel}L`) +
        mkRow('Wear Factor', tyre.combinedWearMult !== null ? `${tyre.combinedWearMult}x` : 'N/A') +
        mkGappStopsCrossCheck(tyre) + mkTdStatusNote(staffTd),
        'gpro-sec-tyre'
      );
      h += `<div data-tyre-table>`;
      h += mkTyreResultsTable(tyre.results);
      h += `</div>`;

      // === RAIN STRATEGY ===
      if (analyze && analyze.maxRain >= 40) {
        const laps = parseInt(track.laps) || 0;
        const segs = analyze.segs;
        // Find when rain stops: first segment with rainMax < 20
        let drySegIdx = segs.findIndex(s => s.rainMax < 20);
        if (drySegIdx === -1) drySegIdx = segs.length; // rain all race
        const rainLaps = drySegIdx > 0 ? Math.round(laps * (drySegIdx / segs.length)) : 0;
        const dryLaps = laps - rainLaps;
        const pitLoss = parseFloat(track.timeInOutPits) || 13.5;
        // Estimate when to pit: after rain stops + 1 lap buffer
        const pitLap = Math.max(1, rainLaps);
        let rainHtml = '';
        rainHtml += mkRow('Rain Start', `${segs[0].rainMin}-${segs[0].rainMax}%`);
        rainHtml += mkRow('Est. Rain Laps', rainLaps > 0 ? `${rainLaps} laps` : 'None');
        rainHtml += mkRow('Est. Dry Laps', dryLaps > 0 ? `${dryLaps} laps` : 'None');
        rainHtml += `<div style="margin-top:8px;padding:6px;background:#1e293b;border-radius:4px;font-size:10px;">`;
        rainHtml += `<div style="color:#60a5fa;font-weight:700;margin-bottom:4px;">🌧️ Rain Strategy Plan:</div>`;
        rainHtml += `<div style="color:#d1d5db;">1. <strong>Start on Rain tyres</strong> (rain ${segs[0].rainMin}-${segs[0].rainMax}%)</div>`;
        rainHtml += `<div style="color:#d1d5db;">2. <strong>Pit at lap ~${pitLap}</strong> when track dries</div>`;
        rainHtml += `<div style="color:#d1d5db;">3. <strong>Switch to ${dryLaps > 20 ? 'Hard' : dryLaps > 12 ? 'Medium' : 'Soft'}</strong> for remaining ${dryLaps} laps</div>`;
        rainHtml += `<div style="color:#9ca3af;margin-top:4px;">⚡ Pit loss: ${pitLoss}s | Net gain: ~${Math.round((dryLaps * 0.8) - pitLoss)}s vs staying on Rain</div>`;
        rainHtml += `</div>`;
        h += mkSection('Rain Strategy', rainHtml);
      }

      // === WAIT-TO-PIT RECOMMENDATIONS (RaceSetup.asp "LapsWaitPitRain"/"LapsWaitPitDry" fields) ===
      // GAPP has no formula for these two fields at all (grepped calcs.py/data.py - not modeled), so
      // this is our own heuristic, clearly labelled as such: react fast to a confirmed/high-probability
      // rain change, wait longer when the forecast is marginal/uncertain to avoid pitting on a false
      // alarm. Shown whenever there's any meaningful rain risk in the forecast, not just the >=40%
      // "mandatory rain" case above.
      if (analyze && analyze.maxRain >= 15) {
        const segs = analyze.segs;
        const startRain = segs[0].rainMax;
        // Wait-to-pit-if-it-STARTS-raining: how many laps to stay on dry tyres after rain begins.
        // High/confirmed rain probability -> react immediately (0). Marginal/uncertain -> wait a lap
        // or two to avoid pitting for a shower that doesn't materialize.
        const waitStartRain = startRain >= 60 ? 0 : startRain >= 30 ? 1 : 2;
        // Wait-to-pit-if-it-STOPS-raining: how many laps to stay on Rain tyres after rain probability
        // drops, to make sure the track has actually dried rather than just easing off. Look at the
        // steepest single-segment drop in rain probability across the forecast.
        let maxDrop = 0;
        for (let i = 1; i < segs.length; i++) maxDrop = Math.max(maxDrop, segs[i - 1].rainMax - segs[i].rainMax);
        const waitStopRain = maxDrop >= 30 ? 1 : maxDrop >= 15 ? 2 : 3;
        let waitHtml = '';
        waitHtml += mkRow('Wait to pit if it starts raining', `${waitStartRain} laps`);
        waitHtml += `<div style="font-size:9px;color:#9ca3af;padding-left:4px;margin-bottom:4px;">Start-of-race rain risk ${startRain}% - ${startRain >= 60 ? 'high/confirmed, react immediately' : startRain >= 30 ? 'moderate, brief confirmation wait' : 'low/uncertain, wait to avoid a false alarm'}</div>`;
        waitHtml += mkRow('Wait to pit if it stops raining', `${waitStopRain} laps`);
        waitHtml += `<div style="font-size:9px;color:#9ca3af;padding-left:4px;">Steepest rain-probability drop between segments: ${maxDrop}pp - ${maxDrop >= 30 ? 'dries fast, short buffer' : maxDrop >= 15 ? 'moderate, standard buffer' : 'gradual, longer buffer to confirm dry'}</div>`;
        waitHtml += `<div style="font-size:9px;color:#f59e0b;margin-top:4px;">Own heuristic - gapp has no formula for these two fields, not cross-checked against a formal model.</div>`;
        h += mkSection('Wait-to-Pit (Weather Change)', waitHtml);
      }
    }

    // === DRIVER STRATEGY (RaceSetup.asp "Driver strategy" risk block) ===
    // Overtake/defend/start-approach/problem-pit-laps ported from gpro-pitwall's RiskAdvisorService
    // (disclosed public heuristic - see calcDriverStrategyRecommendation for full rationale). Dry/wet
    // clear-track risk stay our own simple heuristic (out of that advisor's scope), reusing the CTR
    // already configured in Settings so what's submitted matches what the tyre/fuel calcs assumed.
    let aiCoachContext = null; // populated below if this section renders; read by the AI Coaching button's click handler further down
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
      drHtml += `<div style="font-size:9px;color:#f59e0b;margin-top:4px;">Overtake/defend/start/problem-pit ported from gpro-pitwall's disclosed risk heuristic (not a game formula, not GAPP). Dry/wet clear-track risk still our own simple CTR-based estimate.</div>`;

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
        const boost = calcBoostLapSuggestion(tyre.laps, chosenTyreResult.stops, driverRiskRec.overtaking, raceWetForRisk, rainAvgForRisk);
        if (boost.laps.length) {
          drHtml += mkRow('Suggested boost laps', boost.laps.join(', '));
          drHtml += `<div style="font-size:9px;color:#9ca3af;padding-left:4px;">${boost.note}</div>`;
        }
      }
      // AI Coaching - entirely optional, only shown if the user has configured their own API key
      // (Settings). User-triggered (button click), not automatic, and cached per track for the
      // short-lived CACHE_TTL so re-opening the panel doesn't re-spend the user's own API credits.
      if (getAiKey()) {
        // Recomputes PHA match / push-or-hold (already computed twice above for the decision board
        // and the Push-or-Hold section) rather than threading them through extra function params -
        // both are cheap pure functions, same pattern already used elsewhere in this file.
        const trackPhaForAi = (trackPower || trackHandl || trackAccel) ? { power: trackPower, handling: trackHandl, accel: trackAccel } : null;
        const phaMatchForAi = calcPhaMatch(car, trackPhaForAi);
        const pushHoldForAi = calcPushOrHoldSignal(car, track, trackPhaForAi, tyre, car ? calcPartsWear(car, driver, ctr, (practice||{}).trackName || (track||{}).trackName) : null);
        aiCoachContext = {
          track: (practice||{}).trackName || (track||{}).trackName || 'unknown',
          weather: analyze ? { commitRain: analyze.commitRain, maxRain: analyze.maxRain, avgTemp: Math.round(analyze.avgTemp) } : null,
          tyreChoice: tyre ? { compound: tyre.finalRec, reason: tyre.recReason, source: tyre.source } : null,
          driverRisk: { overtake: driverRiskRec.overtakeRisk, defend: driverRiskRec.defendRisk, dryClearTrack: driverRiskRec.dryRisk, wetClearTrack: driverRiskRec.wetRisk, startApproach: driverRiskRec.startRiskLabel },
          phaMatch: phaMatchForAi ? phaMatchForAi.level : null,
          pushOrHold: pushHoldForAi ? pushHoldForAi.verdict : null,
          ctr,
        };
        drHtml += `<div style="margin-top:8px;"><button id="gpro-ai-coach-btn" style="background:#7c3aed;color:#fff;border:none;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:11px;">🤖 Get AI Coaching</button></div>`;
        drHtml += `<div id="gpro-ai-coach-out"></div>`;
      }
      h += mkSection('Driver Strategy', drHtml, 'gpro-sec-driver-strategy');
    }

    // === STRATEGY INSIGHTS ===
    const confidence = calcStrategyConfidence(driver, car, track, weather, tyre);
    const riskFactors = identifyRiskFactors(driver, car, track, weather);
    const stratNotes = generateStrategyNotes(driver, track, weather, tyre);
    if (riskFactors.length > 0 || stratNotes.length > 0) {
      const confColor = confidence >= 75 ? '#10b981' : confidence >= 50 ? '#f59e0b' : '#ef4444';
      let insightsHtml = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="color:#9ca3af;font-size:11px;">Confidence:</span><span style="color:${confColor};font-weight:700;font-size:14px;">${confidence}%</span></div>`;
      if (riskFactors.length > 0) {
        insightsHtml += `<div style="font-size:11px;color:#f59e0b;font-weight:600;margin-bottom:4px;">⚠️ Risk Factors:</div>`;
        riskFactors.forEach(r => { insightsHtml += `<div style="font-size:10px;color:#d1d5db;margin:2px 0;padding-left:8px;">${r}</div>`; });
      }
      if (stratNotes.length > 0) {
        insightsHtml += `<div style="font-size:11px;color:#60a5fa;font-weight:600;margin:8px 0 4px;">💡 Strategy Notes:</div>`;
        stratNotes.forEach(n => { insightsHtml += `<div style="font-size:10px;color:#d1d5db;margin:2px 0;padding-left:8px;">${n}</div>`; });
      }
      h += mkSection('Strategy Insights', insightsHtml);
    }

    // === CAR SETUP TABLE ===
    // Q1 uses practice temp, Q2 uses raceQ1 temp (Q2 & race start share weather), Race uses avg
    let q1Temp = 25, q2Temp = 25, raceTemp = 25;
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
      // Copy setup buttons
      const setupStr = `FW=${setup.Race['Front Wing']} RW=${setup.Race['Rear Wing']} E=${setup.Race['Engine']} B=${setup.Race['Brakes']} G=${setup.Race['Gearbox']} S=${setup.Race['Suspension']}`;
      setupHtml += `<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap;">`;
      setupHtml += `<button id="gpro-copy-race" style="background:#10b981;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;">📋 Copy Race Setup</button>`;
      setupHtml += `<button id="gpro-copy-q1" style="background:#3b82f6;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;">📋 Copy Q1</button>`;
      setupHtml += `<button id="gpro-copy-q2" style="background:#8b5cf6;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;">📋 Copy Q2</button>`;
      setupHtml += `</div>`;
      h += mkSection('Car Setup', setupHtml +
        `<span style="font-size:9px;color:#6b7280;">Track-adjusted (P=${trackPower}). 🌧️=Wet modifiers applied. Setup source: ${setup.source === 'gapp' ? 'driver+car-aware (gapp)' : 'temperature-only (legacy, Jim Buller deltas=0)'}.</span>` +
        wingSplitLabel(setup.Race) + mkHappyRangeLabel(driver), 'gpro-sec-setup');
    }

    // Car Parts Wear prediction lives on UpdateCar.asp only (where it drives real upgrade/downgrade
    // recommendations) - not needed here on RaceSetup.asp.

    body(h);
    wireDecisionBoard();

    // AI Coaching button - fetches on click only (never automatic), cached per track for
    // CACHE_TTL so revisiting/re-rendering the same race doesn't re-spend the user's API credits.
    if (aiCoachContext) {
      wireAiCoachButton('gpro-ai-coach-btn', 'gpro-ai-coach-out', aiCoachContext, 'ai_coach_' + aiCoachContext.track);
    }

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

  function calcFuelSimple(track, testing, driver) {
    const laps = track ? parseInt(track.laps) || 0 : 0;
    if (!laps) return null;
    let fpl = null;
    if (testing && testing.stintsDone && testing.stintsDone.length > 0) {
      const last = testing.stintsDone[testing.stintsDone.length - 1];
      const fs = parseInt(last.setFuel) || 0;
      const fl = parseInt(last.fuelLeft) || 0;
      const ld = parseInt((last.lapsDone || '0/0').split('/')[0]) || 1;
      if (fs > fl && ld > 0) fpl = (fs - fl) / ld;
    }
    if (!fpl) {
      const gappTrack = lookupGappTrack(track && track.trackName, 'trackData');
      if (gappTrack) {
        fpl = gappTrack.values[6] * gappTrack.values[13];
      } else {
        const c = (track||{}).fuelConsumption || 'Medium';
        fpl = FUEL_BASE[c] || 2.4;
      }
      // Apply driver factors
      if (driver) {
        const driConc = parseInt(driver.concentration) || 100;
        const driAggr = parseInt(driver.aggressiveness) || 50;
        const driExp = parseInt(driver.experience) || 50;
        const driTech = parseInt(driver.techInsight) || 50;
        const concFactor = 1.0 - (driConc - 100) * 0.001;
        const aggrFactor = 1.0 + (driAggr - 50) * 0.002;
        const expFactor = 1.0 - (driExp - 50) * 0.001;
        const techFactor = 1.0 - (driTech - 50) * 0.001;
        fpl *= concFactor * aggrFactor * expFactor * techFactor;
      }
    }
    const total = Math.ceil(fpl * laps * 1.03); // +3% safety margin
    const stints = Math.max(1, Math.ceil(total / TANK_MAX));
    const perStint = Math.ceil(total / stints);
    const stops = stints - 1;
    const stopLaps = [];
    for (let i = 1; i <= stops; i++) stopLaps.push(Math.round((laps / stints) * i));
    return { laps, fuelPerLap: fpl.toFixed(2), totalFuel: total, stints, stops, fuelPerStint: perStint, stopLaps };
  }

  // ============================================================
  // RENDER: UPDATE CAR
  // ============================================================
  function renderUpdateCar(car, trackData, driver, league) {
    const domData = parseUpdateCarDOM();
    console.log('[GPRO] API car levels:', PART_LVL_KEYS.map(k => `${k}=${car?.[k] ?? 'null'}`).join(', '));
    console.log('[GPRO] API car wear:', PART_WEAR_KEYS.map(k => `${k}=${car?.[k] ?? 'null'}`).join(', '));
    console.log('[GPRO] API car cash:', car?.cash ?? 'null', '| DOM cash:', domData.cash);
    console.log('[GPRO] DOM parts:', domData.parts.map(p => `${p.name}: lvl=${p.currentLevel} wear=${p.currentWear}`).join(' | '));
    // Merge DOM cash with API cash - only override if DOM found a reasonable value
    const apiCash = car ? (parseInt(car.cash) || 0) : 0;
    if (domData.cash > 1000 && domData.cash > apiCash && car) car.cash = domData.cash;

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
      // One-line severity headline, matching gpro-pitwall's WearAdvisorService::headline()
      // concept (reviewed 2026-07-19) - a plain-language summary before the per-part table, not a
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
      tbl += `<tr style="color:#60a5fa;font-weight:700;"><td style="padding:2px 4px;">Part</td><td>Lvl</td><td>Now</td><td>End</td>${hasCrossCheck ? '<td title="own calibration cross-check end wear">End (own)</td>' : ''}<td>Target</td><td>Status</td></tr>`;
      analysis.parts.forEach(p => {
        const endColor = p.endWear >= 100 ? '#ef4444' : p.endWear >= 85 ? '#f59e0b' : '#10b981';
        const status = p.willFail ? 'FAIL' : p.atRisk ? 'risk' : 'ok';
        const statusColor = p.willFail ? '#ef4444' : p.atRisk ? '#f59e0b' : '#6b7280';
        const wearBar = `<span style="display:inline-block;width:30px;height:4px;background:#374151;border-radius:2px;overflow:hidden;vertical-align:middle;"><span style="display:block;height:100%;width:${Math.min(100, p.wear)}%;background:${p.remaining <= 30 ? '#ef4444' : '#10b981'};"></span></span>`;
        const ownEnd = p.gappRaceWear !== null ? Math.min(100, p.wear + p.ownTotalRaceWear) : null;
        tbl += `<tr style="color:#d1d5db;"><td style="padding:2px 4px;">${p.name}</td><td>L${p.lvl}</td><td>${wearBar} ${p.remaining}%</td><td style="color:${endColor};font-weight:${p.willFail ? 700 : 400};">${Math.round(p.endWear)}%</td>${hasCrossCheck ? `<td style="color:#9ca3af;">${ownEnd !== null ? Math.round(ownEnd) + '%' : '-'}</td>` : ''}<td>L${p.target}</td><td style="color:${statusColor};font-weight:${status === 'FAIL' ? 700 : 400};">${status}</td></tr>`;
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
      h += `<div style="font-size:9px;color:#6b7280;margin-top:2px;">Wear projections: ${lookupGappTrack(trackData ? (trackData.name || trackData.trackName || '') : '', 'wearData') ? 'track-specific (gapp)' : 'generic (own Montreal-calibrated fallback)'}${driver ? '' : ' (driver data unavailable, using default wear-reduction factor)'}</div>`;
    }

    // PHA contribution reference table (gpro-pitwall's Cockpit README, reviewed 2026-07-19,
    // flags this as a useful one-click reference). D.phaContrib was GAPP-verified
    // (github.com/Jadax/gapp data.py profileFactors, checked 2026-07-17) but never actually
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
      h += `<details style="margin-top:8px;"><summary style="cursor:pointer;color:#60a5fa;font-size:11px;font-weight:700;padding:4px 0;">PHA Contribution per Level (reference)</summary>${phaTbl}<div style="font-size:8px;color:#6b7280;margin-top:3px;">How much Power/Handling/Acceleration each part gains per level upgraded. GAPP-verified (github.com/Jadax/gapp).</div></details>`;
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
      <p style="color:#9ca3af;font-size:12px;margin:4px 0 12px;">Enter your API token. Get it from: <strong>GPRO App</strong> &rarr; <strong>Miscellaneous</strong> &rarr; <strong>API access</strong></p>
      <input type="text" id="gpro-token-in" value="${getToken()}" style="width:100%;padding:10px;background:#1f2937;border:1px solid #374151;color:#f9fafb;border-radius:6px;margin:4px 0;font-size:13px;box-sizing:border-box;" placeholder="Paste API token...">
      <p style="color:#9ca3af;font-size:12px;margin:12px 0 4px;">CTR (Clear Track Risk) — used in tyre/setup/wear risk calculations.</p>
      <input type="number" id="gpro-ctr-in" value="${getCtr()}" min="0" max="100" style="width:100%;padding:10px;background:#1f2937;border:1px solid #374151;color:#f9fafb;border-radius:6px;margin:4px 0;font-size:13px;box-sizing:border-box;" placeholder="0">
      <p style="color:#9ca3af;font-size:12px;margin:12px 0 4px;">AI Coaching (optional) — paste your own <a href="https://console.anthropic.com/settings/keys" target="_blank" style="color:#60a5fa;">Anthropic API key</a> to enable an on-demand AI coaching note on the Race Setup page. Never sent anywhere but api.anthropic.com; leave blank to skip - every recommendation works fully without it.</p>
      <input type="password" id="gpro-ai-key-in" value="${getAiKey()}" style="width:100%;padding:10px;background:#1f2937;border:1px solid #374151;color:#f9fafb;border-radius:6px;margin:4px 0;font-size:13px;box-sizing:border-box;" placeholder="sk-ant-...">
      <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
        <button id="gpro-ai-test" style="background:#374151;color:#d1d5db;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:11px;">Test key</button>
        <span id="gpro-ai-test-result" style="font-size:11px;"></span>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;">
        <button id="gpro-token-ok" style="background:#2563eb;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">Save & Load</button>
        <button id="gpro-token-no" style="background:#374151;color:#d1d5db;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px;">Cancel</button>
      </div>
    </div>`;
    document.body.appendChild(d);
    document.getElementById('gpro-token-ok').onclick = () => {
      const v = document.getElementById('gpro-token-in').value.trim();
      setCtr(document.getElementById('gpro-ctr-in').value);
      setAiKey(document.getElementById('gpro-ai-key-in').value);
      if (v) { setToken(v); d.remove(); init(); }
    };
    document.getElementById('gpro-token-no').onclick = () => d.remove();
    // Test key without needing to leave Settings or visit RaceSetup.asp - uses the in-progress
    // (possibly unsaved) value from the input directly, not getAiKey(), so a user can verify a
    // freshly-pasted key before hitting Save.
    document.getElementById('gpro-ai-test').onclick = async () => {
      const result = document.getElementById('gpro-ai-test-result');
      const keyInput = document.getElementById('gpro-ai-key-in').value.trim();
      if (!keyInput) { result.textContent = 'Paste a key first.'; result.style.color = '#f59e0b'; return; }
      result.textContent = 'Testing...'; result.style.color = '#9ca3af';
      const savedKey = getAiKey();
      setAiKey(keyInput); // temporarily use the unsaved value so callAiCoach picks it up
      const res = await callAiCoach({ test: true, note: 'This is only a connectivity test - reply with the single word OK.' });
      setAiKey(savedKey); // restore whatever was actually saved before, since this is just a test
      if (res.text) { result.textContent = '✓ Key works'; result.style.color = '#10b981'; }
      else { result.textContent = '✗ ' + res.error; result.style.color = '#ef4444'; }
    };
  }

  // ============================================================
  // RENDER: HOMEPAGE (gpro.asp) - DATA STATUS DASHBOARD
  // ============================================================
  // Fetches all API endpoints and shows a live data status overview
  // with an "Update All" button for a single-click refresh.
  async function renderHome(forceBackground) {
    body(`<div style="${ST.loading}">Fetching all data...</div>`);

    const endpoints = {
      practice:  { ep: '/Practice', label: 'Practice / Weather', icon: '🌤️' },
      track:     { ep: '/TrackProfile', label: 'Track Profile', icon: '🏁' },
      driver:    { ep: '/DriProfile', label: 'Driver Profile', icon: '👤' },
      office:    { ep: '/Office', label: 'Office / Tyre Supplier', icon: '🏢' },
      car:       { ep: '/UpdateCar', label: 'Car Data (Wear/Levels)', icon: '🏎️' },
      testing:   { ep: '/Testing', label: 'Testing / Fuel Data', icon: '🧪' },
      suppliers: { ep: '/TyreSuppliers', label: 'Tyre Suppliers', icon: '🛞' },
      staff:     { ep: '/StaffAndFacilities', label: 'Staff / Facilities', icon: '👷' },
    };

    let data = {};
    let errors = {};
    const startTime = Date.now();

    try {
      // Fetch all in parallel
      const keys = Object.keys(endpoints);
      const results = await Promise.allSettled(
        keys.map(key => apiGet(endpoints[key].ep).then(d => { data[key] = d; return d; }))
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
        else if (ageMs <= 2 * 3600 * 1000) { statusLabel = 'Fresh'; statusColor = '#10b981'; statusBg = 'rgba(16,185,129,0.12)'; }
        else { statusLabel = 'Stale'; statusColor = '#f59e0b'; statusBg = 'rgba(245,158,11,0.12)'; }
        const reason = !ok ? errors[key] : (stale ? d.__staleReason : null);
        return `<tr>
          <td style="padding:6px 4px;color:#d1d5db;font-size:11px;white-space:nowrap;">${cfg.icon} ${cfg.label}</td>
          <td style="padding:6px 4px;color:#6b7280;font-size:10px;white-space:nowrap;">${time ? formatRelativeTime(time) : '—'}</td>
          <td style="padding:6px 4px;text-align:right;"><span style="display:inline-block;padding:2px 10px;border-radius:999px;background:${statusBg};color:${statusColor};font-size:10px;font-weight:700;">${statusLabel}</span></td>
        </tr>${reason ? `<tr><td colspan="3" style="padding:0 4px 6px;font-size:9px;color:#6b7280;">${reason}</td></tr>` : ''}`;
      }).join('');
      h += mkSection('Data Freshness',
        `<div style="font-size:10px;color:#9ca3af;margin-bottom:8px;">Fetched ${Object.keys(data).length}/${Object.keys(endpoints).length} endpoints in ${Date.now() - startTime}ms</div>` +
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

      // Token status
      const token = getToken();
      const callCount = getApiCallCount();
      const budgetColor = callCount >= API_CALL_BUDGET ? '#ef4444' : callCount >= API_CALL_BUDGET * 0.8 ? '#f59e0b' : '#10b981';
      const realRemaining = GM_getValue('gpro_api_requests_remaining', null);
      const realColor = realRemaining !== null && parseInt(realRemaining) <= 15 ? '#ef4444' : realRemaining !== null && parseInt(realRemaining) <= 35 ? '#f59e0b' : '#10b981';
      h += mkSection('API Token',
        mkRow('Status', token ? `<span style="color:#10b981;">Active</span>` : `<span style="color:#ef4444;">Not set</span>`) +
        mkRow('Token', token ? token.substring(0, 8) + '...' : '—') +
        mkRow('API Calls This Race (our count)', `<span style="color:${budgetColor};">${callCount}/${API_CALL_BUDGET}</span>`) +
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
  const STAFF_SKILLS = D.staffSkills || [];
  const FACILITY_TARGETS = D.facilityTargetsData || [];
  const CAR_IDEAL_LEVELS = D.carIdealLevels || {};

  // ============================================================
  // RENDER: STAFF & FACILITIES (StaffAndFacilities.asp)
  // ============================================================
  // Real league detection (unblocks the multi-league TODO's prerequisite) - /Menu's `group` field
  // is e.g. "Rookie - 31" (confirmed via gpro-public-api.yml's MenuResponse example, reviewed
  // 2026-07-19); splitting on " - " gives the league name directly in the exact casing
  // D.leagues/D.risks/D.facilityTargets/D.staffPriority/D.driverSelection already key by, so no
  // abbreviation-guessing (class: "Ro" etc) needed.
  function detectLeagueFromMenu(menu) {
    if (!menu || !menu.group) return null;
    const name = String(menu.group).split(' - ')[0].trim();
    return name || null;
  }

  function renderStaff(staffData, league) {
    let h = '';

    // League context (D.leagues/D.risks were sitting unused until this league was actually
    // detectable - see detectLeagueFromMenu). Informational only; doesn't change any calculation,
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

    // Training level cap = average facility level (GPRO Wiki: "Staff and Facilities" - training
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

    // Training recommendations - order by the league's real priority list when we have one
    // (matters mainly for Rookie, which trains fewer skills than the rest; Amateur/Pro/Master/Elite
    // all share the same 6-skill priority order as STAFF_SKILLS already had).
    const orderedStaffSkills = leaguePriorityList
      ? leaguePriorityList.map(label => STAFF_SKILLS.find(sk => sk.label === label)).filter(Boolean)
      : STAFF_SKILLS;
    let trainHtml = '';
    orderedStaffSkills.forEach(s => {
      const val = parseInt(staff[s.key]) || 0;
      const isMaxed = val >= maxTraining;
      const status = isMaxed ? '✅ MAXED' : `Training to ${maxTraining}... (${maxTraining - val} more)`;
      const color = isMaxed ? '#10b981' : '#f59e0b';
      trainHtml += `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #1f2937;font-size:11px;">
        <span style="width:4px;height:4px;border-radius:50%;background:${color};flex-shrink:0;"></span>
        <span style="width:110px;color:#d1d5db;">${s.label}</span>
        <span style="color:${color};flex:1;font-weight:600;">${status}</span>
      </div>`;
    });
    h += mkSection('Training Priority', trainHtml +
      `<span style="font-size:9px;color:#6b7280;">Train in priority order. Max training level = average of facility levels (currently ${maxTraining}).</span>`);

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

    body(h);
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
  // INIT
  // ============================================================
  async function init() {
    const token = getToken();
    if (!token) { showTokenModal(); return; }
    const page = detectPage();
    if (!page) return;
    const PAGE_TITLES = {
      home: 'GPRO Dashboard',
      qualify1: 'Q1 Advisor',
      qualify2: 'Q2 Advisor',
      raceSetup: 'Race Advisor',
      updateCar: 'Car Advisor',
      staff: 'Staff Advisor',
    };
    createPanel(PAGE_TITLES[page] || 'GPRO Strategy Tool');
    // Show loading progress
    const loadingMsgs = {
      home: 'Fetching Practice, Track, Driver, Office, Car, Testing...',
      qualify1: 'Fetching Practice, Track, Driver, Office, Car...',
      qualify2: 'Fetching Practice, Track, Driver, Office, Car...',
      raceSetup: 'Fetching Practice, Track, Testing, Driver, Office, Car...',
      updateCar: 'Fetching Car + Track data...',
      staff: 'Fetching Office data...',
    };
    body(`<div style="text-align:center;padding:20px;">
      <div style="color:#60a5fa;font-size:13px;font-weight:700;margin-bottom:8px;">Loading ${PAGE_TITLES[page] || 'data'}...</div>
      <div style="color:#6b7280;font-size:10px;">${loadingMsgs[page] || 'Fetching data...'}</div>
      <div style="margin-top:12px;height:3px;background:#1f2937;border-radius:2px;overflow:hidden;">
        <div style="height:100%;background:linear-gradient(90deg,#2563eb,#60a5fa);animation:gpro-loading 1.5s ease-in-out infinite;border-radius:2px;width:60%;"></div>
      </div>
    </div>
    <style>@keyframes gpro-loading{0%{transform:translateX(-100%)}100%{transform:translateX(266%)}}</style>`);
    try {
      if (page === 'home') {
        await renderHome();
      } else if (page === 'qualify1' || page === 'qualify2') {
        // DOM-first: weather + car setup/levels/wear are both directly readable off this exact page
        // (Qualify.asp/Qualify2.asp show their own "Setup related parts" table and weather widget),
        // so those two never touch the API at all here. Track/Driver/Office/Suppliers have no live-DOM
        // substitute on this page, so they fall to stale-cache-first (populated by background capture)
        // and only hit the real API if nothing's cached yet.
        const [practice, track, driver, office, staff, car, supplierData] = await Promise.all([
          getDataSmart('/Practice', buildLivePracticeDOM), getDataSmart('/TrackProfile'),
          getDataSmart('/DriProfile'), getDataSmart('/Office'), getDataSmart('/StaffAndFacilities'),
          getDataSmart('/UpdateCar', parseQualifyCarDOM), getDataSmart('/TyreSuppliers')
        ]);
        const supplier = resolveActiveSupplier(office, supplierData);
        const staffTd = await buildStaffTdInfo(office, staff);
        renderQualify(practice, track, driver, supplier, page === 'qualify2', mergeWithCachedCarData(car), staffTd);
      } else if (page === 'raceSetup') {
        // Weather is DOM-live here too (RaceSetup.asp has the same weather widget/forecast). Car setup
        // has no readout on this page though (only editable input boxes default to 0), so /UpdateCar
        // still needs stale-cache-first/API - Testing (fuel-stint data) has no page substitute at all.
        const [practice, track, testing, driver, office, staff, car, supplierData, menu] = await Promise.all([
          getDataSmart('/Practice', buildLivePracticeDOM), getDataSmart('/TrackProfile'),
          getDataSmart('/Testing'), getDataSmart('/DriProfile'),
          getDataSmart('/Office'), getDataSmart('/StaffAndFacilities'), getDataSmart('/UpdateCar'),
          getDataSmart('/TyreSuppliers'), getDataSmart('/Menu').catch(() => null)
        ]);
        const supplier = resolveActiveSupplier(office, supplierData);
        const staffTd = await buildStaffTdInfo(office, staff);
        renderRaceSetup(practice, track, testing, driver, supplier, mergeWithCachedCarData(car), staffTd, detectLeagueFromMenu(menu));
      } else if (page === 'updateCar') {
        let carErr = null;
        const [car, track, driver, menu] = await Promise.all([
          apiGet('/UpdateCar').catch(e => { carErr = e.message; return null; }), getDataSmart('/TrackProfile'),
          getDataSmart('/DriProfile'), getDataSmart('/Menu').catch(() => null)
        ]);
        if (!car) {
          body(mkRec(`Failed to load car data.${carErr ? ' ' + carErr : ' Server may be temporarily unavailable.'}`, 'warn') +
            `<div style="margin-top:8px;"><button id="gpro-retry" style="background:#374151;color:#d1d5db;border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;">Retry</button></div>`);
          setTimeout(() => { document.getElementById('gpro-retry')?.addEventListener('click', () => location.reload()); }, 100);
          return;
        }
        renderUpdateCar(car, track, driver, detectLeagueFromMenu(menu));
      } else if (page === 'staff') {
        const [staff, menu] = await Promise.all([
          apiGet('/Office').catch(() => null),
          getDataSmart('/Menu').catch(() => null),
        ]);
        if (!staff) {
          body(mkRec('Failed to load office data. Server may be temporarily unavailable.', 'warn') +
            `<div style="margin-top:8px;"><button id="gpro-retry" style="background:#374151;color:#d1d5db;border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;">Retry</button></div>`);
          setTimeout(() => { document.getElementById('gpro-retry')?.addEventListener('click', () => location.reload()); }, 100);
          return;
        }
        renderStaff(staff, detectLeagueFromMenu(menu));
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
    const existing = document.getElementById('gpro-panel');
    if (existing) existing.remove();
    const panelTitle = title || 'GPRO Strategy Tool';
    const d = document.createElement('div');
    d.id = 'gpro-panel';
    d.setAttribute('style', ST.panel);
    d.innerHTML = `<div id="gpro-hdr" style="${ST.header}"><h3 style="${ST.headerH3}">${panelTitle}</h3><div style="display:flex;align-items:center;gap:4px;"><span id="gpro-col" style="cursor:pointer;color:#6b7280;font-size:16px;padding:0 4px;line-height:1;" title="Collapse/Expand">▼</span><span id="gpro-cls" style="cursor:pointer;color:#6b7280;font-size:20px;padding:0 4px;line-height:1;" title="Close">×</span></div></div><div id="gpro-bdy" style="${ST.body}"><div style="${ST.loading}">Loading data...</div></div>`;
    document.body.appendChild(d);
    // Collapse toggle
    const colBtn = document.getElementById('gpro-col');
    const bdy = document.getElementById('gpro-bdy');
    let collapsed = false;
    colBtn.addEventListener('click', () => {
      collapsed = !collapsed;
      bdy.style.display = collapsed ? 'none' : 'block';
      colBtn.textContent = collapsed ? '▶' : '▼';
      d.style.maxHeight = collapsed ? '50px' : '88vh';
    });
    // Close button
    document.getElementById('gpro-cls').addEventListener('click', () => d.style.display = 'none');
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
  // SEASON OVERVIEW
  // ============================================================
  // Hard-coded list of 17 tracks per season. User can update.
  // Season race list + track profiles both derive from the single canonical GPRO_DATA.tracks
  // table (same one SEASON_TRACKS/lookupSeasonTrack already use) - this used to be a third
  // independent hardcoded copy of the same 17-track data, removed 2026-07-19 (see ARCHITECTURE.md).
  const SEASON_RACE_LIST = Object.entries(SEASON_TRACKS).map(([name, t], i) => ({ id: i + 1, name, laps: t.laps }));
  const TRACK_PROFILES = SEASON_TRACKS;

  async function renderSeasonOverview() {
    createPanel('Season Overview');
    body(`<div style="${ST.loading}">Loading season data...</div>`);
    try {
      const [practice, track] = await Promise.all([apiGet('/Practice'), apiGet('/TrackProfile')]);
      const currentTrack = (practice && practice.trackName) || (track && track.trackName) || '?';
      const currentRaceIdx = SEASON_RACE_LIST.findIndex(t => currentTrack.includes(t.name.split(' ')[0]));

      let h = '';
      h += mkSection('Season Overview', `<div style="font-size:10px;color:#9ca3af;">Current race: <strong style="color:#10b981;">${currentTrack}</strong> (Race #${currentRaceIdx + 1 || '?'})</div>`);

      // Season table - Overtaking/Grip/Tyre/Fuel/Avg Temp/CTR Gain are all season-level rollups
      // from GPRO Analyzer season data (GPRO_DATA.tracks via SEASON_TRACKS/TRACK_PROFILES), in the
      // spirit of gproanalyzer.info's Season CTR/PHA/Weather/Wear/Fuel/Tyre tools (reviewed
      // 2026-07-19) - one combined table rather than separate pages per stat.
      let table = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:10px;">`;
      table += `<tr style="color:#60a5fa;font-weight:700;"><td style="padding:3px;">#</td><td>Track</td><td>Laps</td><td>OA</td><td>Grip</td><td>Tyre</td><td>Fuel</td><td>Avg°C</td><td>CTR Gain</td><td>Status</td></tr>`;
      SEASON_RACE_LIST.forEach((t, i) => {
        const isCurrent = i === currentRaceIdx;
        const isPast = currentRaceIdx >= 0 && i < currentRaceIdx;
        const prof = TRACK_PROFILES[t.name] || {};
        const status = isCurrent ? '<span style="color:#10b981;font-weight:700;">▶ NOW</span>' : isPast ? '<span style="color:#6b7280;">done</span>' : '<span style="color:#60a5fa;">upcoming</span>';
        const bg = isCurrent ? '#10b98122' : 'transparent';
        table += `<tr style="background:${bg};"><td style="padding:3px;color:#d1d5db;">${i + 1}</td><td style="color:#d1d5db;">${t.name}</td><td style="text-align:center;">${t.laps}</td><td style="text-align:center;color:#9ca3af;">${prof.overtaking || '?'}</td><td style="text-align:center;color:#9ca3af;">${prof.grip || '?'}</td><td style="text-align:center;color:#9ca3af;">${prof.tyre || '?'}</td><td style="text-align:center;color:#9ca3af;">${prof.fuel || '?'}</td><td style="text-align:center;color:#9ca3af;">${prof.avgTemp != null ? prof.avgTemp.toFixed(0) : '?'}</td><td style="text-align:center;color:#9ca3af;">${prof.ctrGain != null ? prof.ctrGain.toFixed(2) + 's/lap' : '?'}</td><td style="text-align:center;">${status}</td></tr>`;
      });
      table += `</table></div>`;
      h += mkSection('All 17 Races', table + `<span style="font-size:9px;color:#6b7280;">Track profiles from GPRO Analyzer season data. Weather forecasts not available for future races. CTR Gain is seconds/lap gained at CTR=100.</span>`);

      // Strategy note
      if (currentRaceIdx >= 0) {
        const remaining = SEASON_RACE_LIST.length - currentRaceIdx - 1;
        h += mkSection('Season Progress', `<div style="font-size:11px;color:#d1d5db;">Race ${currentRaceIdx + 1} of ${SEASON_RACE_LIST.length} • ${remaining} races remaining</div>`);
      }

      body(h);
    } catch (err) {
      body(mkRec(`<strong>Error:</strong> ${err.message}`, 'bad'));
    }
  }

  // Sponsor negotiation-answer advice, in the spirit of gpro-pitwall's SponsorAdvisorService
  // (reviewed 2026-07-19): that service's own docstring calls its question->characteristic mapping
  // "user-supplied, cross-checked against in-game text" - a community-derived heuristic, not an
  // officially confirmed formula, same status as our own ported gpro-pitwall heuristics elsewhere
  // (calcDriverStrategyRecommendation). Reimplemented independently from the disclosed mapping
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
    const carSpotFor = (image) => image <= 1 ? 'Front wing' : image === 2 ? 'Rear wing' : image === 3 ? 'Nose' : image <= 5 ? 'Sidepods' : 'Engine cover';
    const expectationFor = (exp) => exp <= 2 ? 'Relegate with cash' : exp <= 4 ? 'Low table position' : exp === 5 ? 'Mid table position' : 'Promotion / top 4 / championship win';
    const popularityFor = (image) => image <= 2 ? 'My driver is hated by the fans' : image <= 4 ? 'My driver is not very popular with the fans' : image === 5 ? 'My driver is liked by the fans' : image === 6 ? 'My driver is quite popular with the fans' : 'My driver is a favourite of the fans';
    const amountFor = (pat) => pat <= 2 ? 'OK' : pat <= 4 ? 'A bit too low' : pat <= 6 ? 'Far too low' : 'Unacceptable';
    const durationFor = (pat) => pat <= 4 ? 'OK' : pat <= 6 ? 'A bit too low' : 'Far too low';
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
  // RENDER: SPONSOR OVERVIEW (menu command, /NegOverview)
  // ============================================================
  // Surfaces GPRO's own /NegOverview data (car spots, ongoing negotiations, recent sponsor
  // messages), plus a per-sponsor negotiation-answer suggestion (calcSponsorAnswerAdvice) for any
  // negotiation GPRO itself flags as needing attention - fetched via /NegotiateSponsor?id=, one
  // call per flagged negotiation (bounded by GPRO's own maxNegotiations, typically <=5). The
  // suggestion is explicitly labelled as a community-derived heuristic (see
  // calcSponsorAnswerAdvice), not an officially confirmed formula.
  async function renderSponsorOverview() {
    createPanel('Sponsor Overview');
    body(`<div style="${ST.loading}">Loading sponsor data...</div>`);
    try {
      const neg = await apiGet('/NegOverview');
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
              `<div style="font-size:9px;color:#f59e0b;margin-top:4px;">Community-derived heuristic (ported from gpro-pitwall's disclosed, user-cross-checked mapping) - not an officially confirmed GPRO formula. Only shown for questions actually pending; GPRO doesn't always ask all 5.</div>`,
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

      h += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">Car spots/negotiations/messages are GPRO's own data. Negotiation-answer suggestions (above, when shown) are a community-derived heuristic, not an officially confirmed formula - use judgment.</div>`;

      body(h);
      wireDecisionBoard();
    } catch (err) {
      body(mkRec(`<strong>Error:</strong> ${err.message}`, 'bad'));
    }
  }

  // ============================================================
  // RENDER: DRIVER & TD MARKET (menu command, /AvailDrivers + /AvailTDs)
  // ============================================================
  // Read-only market browser (GPRO Hub's "Driver & TD Market", gpro-tools.eu's "Drivers
  // market"/"TD market", gpro-pitwall's RecruitmentService/IdealPilotService all cover this area -
  // reviewed 2026-07-19). Default (unauthenticated-filter) response only: /AvailDrivers and
  // /AvailTDs support extensive skill/range filtering but those extra query params are
  // GPRO-Supporters-only per the API spec, so this shows GPRO's own default page (OA-descending,
  // ~20 results, capped at the token account's league) rather than guess at filter access. Value
  // column is plain arithmetic (OA per $1M salary), not a game-mechanic guess.
  // idKey ('driId'/'tdId') links each name to its profile page for closer inspection - safe to do
  // now that runPassiveCapture() (see 2026-07-19 fix) won't let visiting a scouted driver's profile
  // corrupt the account's own cached driver data anymore.
  function mkMarketTable(rows, idKey) {
    let t = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:10px;">`;
    t += `<tr style="color:#60a5fa;font-weight:700;"><td style="padding:3px;">Name</td><td>Nat</td><td>OA</td><td>Age</td><td>Salary</td><td>Sign Fee</td><td>Offers</td><td>Value</td></tr>`;
    rows.forEach(r => {
      const oa = parseFloat(r.OA) || 0;
      const salaryM = parseGproCash(r.salary) / 1e6;
      const value = salaryM > 0 ? (oa / salaryM).toFixed(1) : '-';
      const nameCell = (idKey === 'driId' && r.driId)
        ? `<a href="DriverProfile.asp?ID=${r.driId}" style="color:#d1d5db;text-decoration:underline;">${r.name}</a>`
        : r.name;
      t += `<tr><td style="padding:3px;color:#d1d5db;">${nameCell}${r.retiring === '1' || r.retiring === true ? ' 🕐' : ''}</td><td style="text-align:center;color:#9ca3af;">${r.natCode || '?'}</td><td style="text-align:center;color:#10b981;font-weight:700;">${r.OA}</td><td style="text-align:center;color:#9ca3af;">${r.age}</td><td style="text-align:center;color:#9ca3af;">${r.salary}</td><td style="text-align:center;color:#9ca3af;">${r.signFee}</td><td style="text-align:center;color:#9ca3af;">${r.offers}</td><td style="text-align:center;color:#60a5fa;">${value}</td></tr>`;
    });
    t += `</table></div>`;
    return t;
  }

  async function renderMarketOverview() {
    createPanel('Driver & TD Market');
    body(`<div style="${ST.loading}">Loading market data...</div>`);
    try {
      const [driversResp, tdsResp, menu] = await Promise.all([
        apiGet('/AvailDrivers').catch(() => null),
        apiGet('/AvailTDs').catch(() => null),
        getDataSmart('/Menu').catch(() => null),
      ]);
      let h = '';
      const drivers = (driversResp && driversResp.drivers) || [];
      const tds = (tdsResp && tdsResp.tds) || [];
      h += mkDecisionBoard([
        { id: 'gpro-sec-market-drivers', label: 'Drivers', verdict: `${drivers.length} listed`, tone: drivers.length ? 'info' : 'warn' },
        { id: 'gpro-sec-market-tds', label: 'TDs', verdict: `${tds.length} listed`, tone: tds.length ? 'info' : 'warn' },
      ]);
      h += mkSection(`Available Drivers (${drivers.length})`,
        drivers.length ? mkMarketTable(drivers, 'driId') : mkRec('No drivers returned - check your API token/league.', 'warn'),
        'gpro-sec-market-drivers');
      h += mkSection(`Available Technical Directors (${tds.length})`,
        tds.length ? mkMarketTable(tds, 'tdId') : mkRec('No TDs returned - check your API token/league.', 'warn'),
        'gpro-sec-market-tds');

      // What-to-look-for reference (D.driverSelection, community-consensus attribute priorities per
      // league) - was sitting unused in gpro-data.js, found while auditing for dead data 2026-07-19.
      // /AvailDrivers' list view doesn't return per-driver attribute breakdowns (only OA/age/salary),
      // so this can't score individual market rows - shown as a manual-evaluation checklist instead.
      const league = detectLeagueFromMenu(menu) || (typeof GPRO_DATA !== 'undefined' && GPRO_DATA.currentLeague) || 'Amateur';
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

      h += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">GPRO's default market page (OA-descending, capped at your league) - skill/range filters are GPRO Supporters-only via the API and aren't requested here. Value = OA per $1M salary, plain arithmetic, not a game-mechanic estimate. 🕐 = retiring soon.</div>`;
      body(h);
      wireDecisionBoard();
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
