---
phase: 03-reporter-database-annotation
plan: 02
subsystem: annotation
tags: [annotation, html-escaping, position-tracking, xss-prevention, dual-span]

# Dependency graph
requires:
  - phase: 02-core-parsing
    provides: Dual-span position tracking (cleanStart/End + originalStart/End)
provides:
  - Position-aware annotation API with callback and template modes
  - Auto-escaping for XSS prevention (secure by default)
  - Position map tracking for external index updates
affects: [Phase 4 will use annotation API for Id./supra resolution markup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-mode annotation API (callback + template)"
    - "Reverse-order processing to preserve positions"
    - "Auto-escaping with opt-out for security"

key-files:
  created:
    - src/annotate/types.ts
    - src/annotate/annotate.ts
    - src/annotate/index.ts
    - tests/annotate/annotate.test.ts
  modified: []

key-decisions:
  - "Auto-escape defaults to true for XSS protection (opt-out, not opt-in)"
  - "Process citations in reverse order to avoid position shift invalidation"
  - "Support both callback and template modes for flexibility"
  - "Position map tracks original→new positions for external indices"

patterns-established:
  - "Pattern 1: Dual-mode API design (simple template + flexible callback)"
  - "Pattern 2: Reverse iteration for position-preserving text mutation"
  - "Pattern 3: Secure defaults with explicit opt-out (auto-escaping)"

# Metrics
duration: 3min
completed: 2026-02-05
---

# Phase 03 Plan 02: Citation Annotation Summary

**Position-aware annotation API with dual-mode support (template + callback), auto-escaping for XSS prevention, and position map tracking**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-05T04:26:53Z
- **Completed:** 2026-02-05T04:29:37Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Annotation API supports both template mode (simple before/after wrapping) and callback mode (custom logic)
- Auto-escaping prevents XSS injection by default with explicit opt-out
- Position tracking maps original citation positions to new positions after markup insertion
- Dual-span support enables annotation on either cleaned or original text
- Comprehensive test coverage (17 tests) validates security, position tracking, and both annotation modes

## Task Commits

Each task was committed atomically:

1. **Task 1: Define annotation types and options** - `2d2fc12` (feat)
2. **Task 2: Implement annotation function with dual-mode support** - `9b0800a` (feat)
3. **Task 3: Test annotation with position tracking and auto-escaping** - `f9def94` (test)

## Files Created/Modified

- `src/annotate/types.ts` - AnnotationOptions and AnnotationResult interfaces with comprehensive JSDoc
- `src/annotate/annotate.ts` - Main annotation function with callback/template modes and HTML escaping
- `src/annotate/index.ts` - Module exports
- `tests/annotate/annotate.test.ts` - 17 tests covering template mode, callback mode, auto-escaping, position tracking, dual-span positions

## Decisions Made

1. **Auto-escape defaults to true for security** - Prevents XSS injection by default; developers must explicitly opt-out (safer than opt-in)
2. **Reverse-order processing** - Process citations from end to start to avoid position shifts invalidating subsequent annotations
3. **Position map tracks shifts** - Enables external systems to sync their indices after annotation
4. **Support both useCleanText modes** - Developers can annotate either original or cleaned text without manual translation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed position shift calculation in annotation loop**
- **Found during:** Task 3 (Running tests)
- **Issue:** Multiple citations were being annotated at wrong positions due to incorrect shift tracking
- **Fix:** Removed cumulative shift tracking; use `result` string directly since working backwards preserves positions
- **Files modified:** src/annotate/annotate.ts
- **Verification:** All 17 tests pass including multiple-citation tests
- **Committed in:** f9def94 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix necessary for correct multi-citation annotation. No scope creep.

## Issues Encountered

None - plan executed smoothly with one bug discovered during testing and immediately fixed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Annotation API complete and tested
- Ready for Phase 3 Plan 3 (reporter database integration) or Phase 4 (Id./supra resolution using annotation)
- Auto-escaping provides security foundation for user-facing citation markup
- Position map enables integration with search engines, syntax highlighters, and other external systems

---
*Phase: 03-reporter-database-annotation*
*Completed: 2026-02-05*
