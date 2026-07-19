# @gpro/ai

LLM-powered coaching and explanation layer. Wraps calculations/prediction output in natural-language reasoning; must degrade gracefully to calculations-only output when no AI backend is configured.

**Status:** first real implementation lives directly in `GPRO_Strategy_Tool.user.js` as of
2026-07-19 (`callAiCoach`/`builds its own prompt inline`/`getAiKey`/`setAiKey`), not here yet —
opt-in Claude-powered coaching note on the Race Setup page, user-supplied API key, user-triggered
per race, cached, degrades to nothing (not an error) when unconfigured. This package remains an
empty stub until that logic is worth extracting (see ARCHITECTURE.md's migration strategy — don't
move working code into a package before there's a second consumer of it).
