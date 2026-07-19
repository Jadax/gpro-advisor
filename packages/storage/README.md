# @gpro/storage

Cache and settings persistence abstraction (short-lived cache, long-lived stale fallback, user settings) behind one interface, backed by GM_getValue/GM_setValue today and swappable for IndexedDB/a backend later.

**Status:** scaffold only — not yet wired into the live userscript. See [ARCHITECTURE.md](../../ARCHITECTURE.md) for the migration plan and current TODOs.
