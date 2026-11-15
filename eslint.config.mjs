// Run with `npm run lint` (npx fetches ESLint; nothing is installed into the repo).
// Catches what `node --check` can't: undefined names (two shipped scope bugs here passed the syntax
// check) and duplicate object keys (a second `trackTypeWear` silently replaced the first in gpro-data.js).
const browser = {
  window: 'readonly', document: 'readonly', location: 'readonly', navigator: 'readonly', console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
  setInterval: 'readonly', clearInterval: 'readonly', DOMParser: 'readonly', HTMLFormElement: 'readonly', Event: 'readonly', URL: 'readonly', Blob: 'readonly',
  localStorage: 'readonly', sessionStorage: 'readonly', fetch: 'readonly', alert: 'readonly', confirm: 'readonly', prompt: 'readonly', MutationObserver: 'readonly',
  Node: 'readonly', NodeFilter: 'readonly', getComputedStyle: 'readonly', requestAnimationFrame: 'readonly', performance: 'readonly', structuredClone: 'readonly',
  Intl: 'readonly', CustomEvent: 'readonly', KeyboardEvent: 'readonly', MouseEvent: 'readonly', HTMLElement: 'readonly', FormData: 'readonly',
  URLSearchParams: 'readonly', atob: 'readonly', btoa: 'readonly', crypto: 'readonly', AbortController: 'readonly',
};
const tampermonkey = { GM_xmlhttpRequest: 'readonly', GM_getValue: 'readonly', GM_setValue: 'readonly', GM_registerMenuCommand: 'readonly',
  GM_setClipboard: 'readonly', GM_info: 'readonly', unsafeWindow: 'readonly' };
const rules = { 'no-undef': 'error', 'no-dupe-keys': 'error', 'no-const-assign': 'error', 'no-redeclare': 'error', 'no-dupe-else-if': 'error',
  'no-duplicate-case': 'error', 'no-unsafe-negation': 'error', 'use-isnan': 'error', 'valid-typeof': 'error', 'no-func-assign': 'error', 'no-unreachable': 'warn' };
export default [
  { files: ['GPRO_Strategy_Tool.user.js'], languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: { ...browser, ...tampermonkey, GPRO_DATA: 'readonly' } }, rules },
  { files: ['gpro-data.js'], languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: {} }, rules },
];
