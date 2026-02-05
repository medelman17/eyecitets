---
phase: 02-core-parsing
plan: 04
subsystem: types
tags: [typescript, citation-types, discriminated-unions]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Base type system (Span, Citation discriminated unions)
provides:
  - Extended CitationBase with confidence scoring and processing metadata
  - Four new citation types (journal, neutral, public law, federal register)
  - Enhanced FullCaseCitation with metadata fields for extraction layer
affects: [02-05-extraction, 03-resolution, 04-formatting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Confidence scoring pattern (0-1 scale with semantic ranges)
    - Warning collection pattern for malformed citations
    - Processing metadata pattern (processTimeMs, patternsChecked)

key-files:
  created: []
  modified:
    - src/types/citation.ts
    - src/types/index.ts

key-decisions:
  - "CitationBase includes confidence score (0-1) for match certainty"
  - "All citation types include matchedText field for exact substring"
  - "Warning interface captures malformed regions with severity levels"
  - "FullCaseCitation extended with optional metadata (signals, parentheticals, parallel citations, dates)"
  - "New citation types match Python eyecite field structure"

patterns-established:
  - "Confidence scoring: 1.0 = certain, 0.8-0.99 = high, 0.5-0.79 = medium, <0.5 = low"
  - "All optional metadata fields enable progressive enhancement in extraction"
  - "Type-safe pattern matching via discriminated unions"

# Metrics
duration: 2min
completed: 2026-02-04
---

# Phase 2 Plan 4: Extended Citation Types Summary

**Citation type system extended with confidence scoring, processing metadata, and four Phase 2 citation types (journal, neutral, public law, federal register) matching Python eyecite structure**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-04T21:42:43Z
- **Completed:** 2026-02-04T21:44:30Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Extended CitationBase with confidence scoring, processing metadata, and warning collection
- Added four new citation types with metadata fields matching Python eyecite specifications
- Enhanced FullCaseCitation with optional metadata (signals, parentheticals, parallel citations, dates, ambiguous interpretations)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend CitationBase with confidence and metadata fields** - `41b3387` (feat)
2. **Task 2: Add journal, neutral, public law, and federal register citation types** - `4a77b69` (feat)
3. **Task 3: Add optional metadata fields to FullCaseCitation** - `64b256f` (feat)

## Files Created/Modified
- `src/types/citation.ts` - Extended citation type system with Phase 2 types and metadata
- `src/types/index.ts` - Export new citation types and Warning interface

## Decisions Made

**TYPE-04: Confidence scoring included in CitationBase**
- All citations include confidence score (0-1 scale)
- Enables extraction layer to rank ambiguous matches
- Supports warning generation for low-confidence matches

**TYPE-05: Processing metadata tracks performance**
- processTimeMs and patternsChecked enable ReDoS detection
- Supports optimization of pattern ordering in extraction layer
- Aligns with Phase 2 performance requirements (<100ms per citation)

**TYPE-06: Warning interface for malformed citations**
- Three severity levels (error, warning, info)
- Position tracking enables precise error reporting
- Context field provides additional debugging information

**TYPE-07: Optional metadata enables progressive enhancement**
- All metadata fields are optional (extraction layer populates as available)
- Supports partial extraction when full parsing isn't possible
- Backward compatible - existing code doesn't break with new fields

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for extraction layer (Plan 5):**
- All Phase 2 citation types defined (case, statute, journal, neutral, public law, federal register, id)
- Confidence scoring enables ambiguous match handling
- Warning system supports error reporting
- Processing metadata enables performance validation

**Type system complete:**
- 7 citation types with discriminated unions
- Type-safe pattern matching via switch statements
- All metadata fields match Python eyecite structure

**No blockers or concerns.**

---
*Phase: 02-core-parsing*
*Completed: 2026-02-04*
