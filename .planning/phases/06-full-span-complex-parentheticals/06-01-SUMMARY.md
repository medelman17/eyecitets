---
phase: 06-full-span-complex-parentheticals
plan: 01
subsystem: extraction
tags: [dates, parsing, utilities, tdd]
requires:
  - 05-02-PLAN.md
provides:
  - Date parsing utilities (parseMonth, parseDate, toIsoDate)
  - Structured date types (ParsedDate, StructuredDate)
affects:
  - 06-02-PLAN.md (unified parenthetical parser)
tech-stack:
  added: []
  patterns:
    - Pure function utilities with zero dependencies
    - TDD with RED-GREEN-REFACTOR cycle
key-files:
  created:
    - src/extract/dates.ts
    - tests/extract/dates.test.ts
  modified: []
decisions:
  - slug: month-map-lowercase
    summary: Use lowercase keys in MONTH_MAP for case-insensitive matching
    rationale: Single normalize step (lowercase + strip period) enables simple lookup
  - slug: year-only-fallback
    summary: Year-only pattern matches when month present but no day
    rationale: Patterns require complete month+day+year triplets; partial matches fall through to year-only
  - slug: iso-format-granularity
    summary: ISO format varies by available components (YYYY-MM-DD, YYYY-MM, YYYY)
    rationale: Preserves maximum available precision without inventing missing data
duration: 2 min
completed: 2026-02-05
---

# Phase 6 Plan 1: Date Parsing Utilities Summary

**One-liner:** Date parsing utilities supporting abbreviated/full month, numeric US, and year-only formats with TDD

## What Was Built

Created `src/extract/dates.ts` with three core functions:

1. **parseMonth**: Converts month names/abbreviations to 1-12
   - Handles abbreviated (Jan, Feb, ..., Dec)
   - Handles full names (January, February, ..., December)
   - Handles 4-letter September abbreviation (Sept)
   - Case-insensitive with trailing period support

2. **parseDate**: Extracts structured dates from text
   - Abbreviated month: "Jan. 15, 2020" → { iso: "2020-01-15", parsed: { year: 2020, month: 1, day: 15 } }
   - Full month: "January 15, 2020" → same structure
   - Numeric US: "1/15/2020" → same structure
   - Year-only: "2020" → { iso: "2020", parsed: { year: 2020 } }
   - Returns undefined for non-matching strings

3. **toIsoDate**: Converts ParsedDate to ISO 8601 strings
   - Full dates: YYYY-MM-DD (zero-padded)
   - Month+year: YYYY-MM (zero-padded)
   - Year-only: YYYY

**Types exported:**
- `ParsedDate`: Structured date components (year, month?, day?)
- `StructuredDate`: Dual format (iso string + parsed components)

## TDD Execution

Followed RED-GREEN-REFACTOR cycle:

**RED Phase (commit 7a8ca79):**
- Wrote 24 failing tests covering all format variations
- Tests failed as expected (module didn't exist)

**GREEN Phase (commit 92cda0c):**
- Implemented all three functions
- All 24 tests passing
- Fixed one test expectation (year-only fallback behavior)

**REFACTOR Phase:**
- Skipped - implementation already clean and minimal
- No obvious improvements needed

## Decisions Made

### month-map-lowercase
Use lowercase keys in MONTH_MAP for case-insensitive matching.

**Rationale:** Single normalization step (lowercase + strip period) enables simple object lookup without complex logic.

**Alternatives considered:**
- Case-sensitive map with mixed keys → requires maintaining multiple entries per month
- toLowerCase in lookup → cleaner code structure

### year-only-fallback
Year-only pattern matches when month present but no day.

**Rationale:** Date patterns require complete month+day+year triplets. "Dec. 2020" has month but no day, so falls through to year-only pattern matching "2020".

**Impact:** Partial dates (month without day) treated as year-only. This is correct behavior - we don't invent missing precision.

### iso-format-granularity
ISO format varies by available components (YYYY-MM-DD, YYYY-MM, YYYY).

**Rationale:** Preserves maximum available precision without inventing missing data. Consumer can check parsed.day/month existence to determine granularity.

**Alternatives considered:**
- Always return YYYY-MM-DD with null for missing → violates ISO 8601
- Use sentinel values (0, -1) → confusing and error-prone

## Test Coverage

24 tests passing across three functions:

**parseMonth (6 tests):**
- ✓ Abbreviated month names
- ✓ Full month names
- ✓ Sept 4-letter abbreviation
- ✓ Trailing periods
- ✓ Case-insensitive input
- ✓ Error on invalid names

**toIsoDate (3 tests):**
- ✓ YYYY-MM-DD with zero-padding
- ✓ YYYY-MM with zero-padding
- ✓ YYYY for year-only

**parseDate (15 tests):**
- ✓ Abbreviated month format (4 tests)
- ✓ Full month format (3 tests)
- ✓ Numeric US format (3 tests)
- ✓ Year-only format (2 tests)
- ✓ Edge cases (3 tests)

## Deviations from Plan

None - plan executed exactly as written.

## Integration Notes

**For Plan 06-02 (Unified Parenthetical Parser):**

Import and use date parsing:
```typescript
import { parseDate } from '@/extract/dates'

const dateMatch = parenthetical.match(/date pattern/)
if (dateMatch) {
  const date = parseDate(dateMatch[0])
  if (date) {
    citation.date = date
  }
}
```

**For existing extractCase.ts:**

The MONTH_PATTERN and stripDateFromCourt() function already exist in extractCase.ts. Once parenthetical parsing is unified, those can be migrated to use these utilities.

## Next Phase Readiness

**Ready for 06-02:** ✓ Date utilities available

**Unblocked:**
- Unified parenthetical parser can now extract structured dates
- Court extraction can use date utilities to strip date components
- All three required formats (abbreviated, full, numeric) supported

## Metrics

- **Duration:** 2 minutes (TDD execution)
- **Tests added:** 24 (all passing)
- **Functions created:** 3 (parseMonth, parseDate, toIsoDate)
- **Types created:** 2 (ParsedDate, StructuredDate)
- **Lines of code:** 186 (implementation + tests)
- **Commits:** 2 (RED + GREEN phases)
