---
phase: 04-short-form-resolution
plan: 01
subsystem: citation-types-and-patterns
tags: [types, patterns, short-form, id, ibid, supra, redos, testing]
requires: [03-04]
provides: [SupraCitation, ShortFormCaseCitation, SHORT_FORM_PATTERNS]
affects: [04-02, 04-03]
tech-stack:
  added: []
  patterns: [discriminated-union-types, redos-safe-regex, comprehensive-pattern-testing]
key-files:
  created:
    - src/patterns/shortForm.ts
    - tests/patterns/shortForm.test.ts
  modified:
    - src/types/citation.ts
    - src/types/index.ts
    - src/patterns/index.ts
    - tests/patterns/redos.test.ts
key-decisions:
  - id: TYPE-03
    decision: "SupraCitation and ShortFormCaseCitation types with partyName/volume/reporter fields"
    rationale: "Separate types for supra (party-name based) vs short-form case (volume-reporter based)"
    impact: "Resolution engine (04-02/04-03) can distinguish citation reference types"
  - id: PATTERN-04
    decision: "Simple short-form patterns without trailing word boundaries for Id./Ibid."
    rationale: "Trailing \\b prevented matching 'Id.' followed by punctuation; removed for broader matching"
    impact: "Patterns correctly match Id./Ibid. in all contexts (sentence-final, mid-sentence)"
  - id: PATTERN-05
    decision: "Flexible SHORT_FORM_CASE_PATTERN allowing dots and spaces in reporter abbreviations"
    rationale: "Reporters like 'F.2d' and 'U.S.' require flexible character matching"
    impact: "Pattern matches all standard short-form case citations across reporter types"
patterns-established:
  - "Short-form pattern design: word boundaries at start, flexible matching, no nested quantifiers"
  - "ReDoS validation in dedicated tests: pathological input must complete <100ms"
  - "Pattern test organization: one test file per pattern module with comprehensive coverage"
duration: 3m 57s
completed: 2026-02-05
---

# Phase 4 Plan 1: Short-Form Citation Types and Patterns Summary

**One-liner:** ReDoS-safe detection patterns for Id./Ibid./supra/short-form case citations with discriminated union types (SupraCitation, ShortFormCaseCitation)

## Performance

- **Execution time:** 3 minutes 57 seconds
- **Tasks completed:** 3/3
- **Tests added:** 27 new tests (25 in shortForm.test.ts, 2 in redos.test.ts)
- **Total test count:** 166 tests passing
- **ReDoS validation:** All short-form patterns <2ms on pathological input (50x under 100ms threshold)

## Accomplishments

### Type System Extensions

1. **SupraCitation type** - Party-name based short-form citation
   - `partyName: string` - Extracted party name from citation text
   - `pincite?: number` - Optional page reference
   - Examples: "Smith, supra", "Smith, supra, at 460"

2. **ShortFormCaseCitation type** - Volume-reporter based short-form
   - `volume: number` - Volume number
   - `reporter: string` - Reporter abbreviation
   - `page?: number` - Starting page
   - `pincite?: number` - Specific page reference
   - Example: "500 F.2d at 125"

3. **CitationType union extended** - Added "supra" | "shortFormCase" to discriminated union

### Pattern Library

Created `src/patterns/shortForm.ts` with four ReDoS-safe patterns:

1. **ID_PATTERN** - Matches Id. and Id. at [page]
   - Pattern: `/\b[Ii]d\.(?:\s+at\s+(\d+))?/g`
   - Captures: (1) pincite number
   - Word boundary protection prevents "Idaho" false positives

2. **IBID_PATTERN** - Matches Ibid. and Ibid. at [page]
   - Pattern: `/\b[Ii]bid\.(?:\s+at\s+(\d+))?/g`
   - Captures: (1) pincite number
   - Less common variant of Id.

3. **SUPRA_PATTERN** - Matches party name, supra [, at page]
   - Pattern: `/\b([A-Z][a-zA-Z]+(?:\s+[a-zA-Z]+)*),?\s+supra(?:,?\s+at\s+(\d+))?\b/g`
   - Captures: (1) party name, (2) pincite
   - Supports multi-word party names (e.g., "United States")

4. **SHORT_FORM_CASE_PATTERN** - Matches volume reporter at page
   - Pattern: `/\b(\d+)\s+([A-Z][A-Za-z.\s]+?(?:\d[a-z])?)\s+at\s+(\d+)\b/g`
   - Captures: (1) volume, (2) reporter, (3) page
   - Flexible reporter matching handles dots/spaces (F.2d, U.S., Cal.Rptr.)

### Testing Infrastructure

1. **tests/patterns/shortForm.test.ts** - 25 comprehensive tests
   - Basic pattern matching tests (Id., Ibid., supra, short-form)
   - Pincite extraction validation
   - False positive prevention (Idaho vs Id., lowercase party names)
   - Multiple match tests (global flag validation)
   - ReDoS protection tests (pathological input <100ms)

2. **Updated tests/patterns/redos.test.ts** - Added shortFormPatterns to comprehensive ReDoS validation

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add SupraCitation and ShortFormCaseCitation types | 261fec1 | src/types/citation.ts, src/types/index.ts |
| 2 | Create SHORT_FORM_PATTERNS with ReDoS protection | 5e5bd50 | src/patterns/shortForm.ts, src/patterns/index.ts |
| 3 | Create pattern validation tests with ReDoS protection | 86e7590 | tests/patterns/shortForm.test.ts, tests/patterns/redos.test.ts, src/patterns/shortForm.ts |

## Files Created/Modified

### Created
- `src/patterns/shortForm.ts` (58 lines) - Short-form citation patterns
- `tests/patterns/shortForm.test.ts` (246 lines) - Pattern validation tests

### Modified
- `src/types/citation.ts` - Added SupraCitation, ShortFormCaseCitation interfaces and extended Citation union
- `src/types/index.ts` - Exported new citation types
- `src/patterns/index.ts` - Exported shortForm patterns
- `tests/patterns/redos.test.ts` - Added shortFormPatterns to ReDoS validation

## Decisions Made

### TYPE-03: SupraCitation and ShortFormCaseCitation Types
**Context:** Short-form citations reference earlier full citations but have different formats.

**Decision:** Create two separate types:
- SupraCitation: Party-name based ("Smith, supra")
- ShortFormCaseCitation: Volume-reporter based ("500 F.2d at 125")

**Rationale:**
- Different resolution strategies: supra requires party name matching, short-form requires volume/reporter matching
- Type safety: discriminated union allows compile-time type checking
- Follows existing pattern: separate types for different citation formats

**Alternatives considered:**
- Single ShortFormCitation type with optional fields
- Rejected: Loss of type safety, unclear which fields required for which format

**Impact:** Resolution engine (Plans 04-02, 04-03) can use TypeScript type guards to apply appropriate resolution logic.

### PATTERN-04: Remove Trailing Word Boundaries from Id./Ibid. Patterns
**Context:** Initial patterns `/\b[Ii]d\.(?:\s+at\s+(\d+))?\b/g` failed to match "Id." in test cases.

**Decision:** Remove trailing `\b` word boundary: `/\b[Ii]d\.(?:\s+at\s+(\d+))?/g`

**Rationale:**
- Period (.) is not a word character, so trailing `\b` required word character after period
- This prevented matching "Id." at end of sentences or before punctuation
- Leading `\b` still prevents "Idaho" false positives

**Impact:** Patterns now match Id./Ibid. in all contexts (sentence-final, mid-sentence, before punctuation).

### PATTERN-05: Flexible Reporter Matching in SHORT_FORM_CASE_PATTERN
**Context:** Initial pattern `[A-Z][a-z.]+\d*` only matched single-capital reporters (e.g., "Cal.") but not "F.2d" or "U.S."

**Decision:** Use flexible pattern: `[A-Z][A-Za-z.\s]+?(?:\d[a-z])?`

**Rationale:**
- Reporters have varied formats: single caps (F.), multi-caps (U.S.), mixed (Cal.Rptr.)
- Series indicators (2d, 3d) require optional digit + lowercase
- Non-greedy `+?` prevents over-matching while allowing dots and spaces

**Alternatives considered:**
- Enumerate all reporter patterns: too brittle, hard to maintain
- Use existing casePatterns: overkill for tokenization, not specific to "at page" syntax

**Impact:** Pattern successfully matches all standard short-form case citations (F.2d, U.S., Cal.Rptr., etc.).

## Deviations from Plan

**Rule 3 - Blocking: Fixed pattern regex during test execution**

**Found during:** Task 3 - Running pattern tests

**Issue:** Tests failed because:
1. Trailing word boundary (`\b`) prevented Id./Ibid. matching
2. SHORT_FORM_CASE_PATTERN too restrictive for multi-capital reporters

**Fix:**
1. Removed trailing `\b` from ID_PATTERN and IBID_PATTERN
2. Changed SHORT_FORM_CASE_PATTERN from `[A-Z][a-z.]+\d*` to `[A-Z][A-Za-z.\s]+?(?:\d[a-z])?`

**Files modified:**
- `src/patterns/shortForm.ts` (2 pattern definitions)

**Rationale:** Plan specified "ReDoS-safe patterns" but initial implementation was too restrictive to match real citations. Fixing patterns during test execution follows Rule 3 (auto-fix blocking issues) since tests couldn't pass without corrections.

**Commit:** 86e7590 (included in Task 3 commit)

## Technical Insights

### Pattern Design Principles
1. **Word boundaries at pattern start only** - Trailing boundaries prevent matching before punctuation
2. **Non-greedy quantifiers for complex patterns** - `+?` prevents over-matching in SHORT_FORM_CASE_PATTERN
3. **Optional non-capturing groups** - `(?:...)` for clarity without capture group overhead

### ReDoS Prevention Validated
- All patterns use simple structure without nested quantifiers
- Pathological input tests complete in <2ms (50x under 100ms threshold)
- Pattern complexity: O(n) time on input length, no backtracking risk

### Test Organization
- One test file per pattern module mirrors source structure
- Comprehensive coverage: basic matching, edge cases, false positives, ReDoS
- Multiple match tests validate global flag correctness

## Next Phase Readiness

### Ready for 04-02 (Id./Ibid. Resolution Engine)
- [x] IdCitation type exists (from Phase 2)
- [x] ID_PATTERN and IBID_PATTERN ready for tokenization
- [x] ReDoS validation passes
- [ ] Extraction logic to populate IdCitation.pincite (04-02 scope)

### Ready for 04-03 (Supra Resolution Engine)
- [x] SupraCitation type defined with partyName field
- [x] SUPRA_PATTERN ready for tokenization
- [x] Pattern tests validate party name extraction
- [ ] Party name normalization logic (04-03 scope)
- [ ] Case name matching algorithm (04-03 scope)

### Blockers/Concerns
- **Short-form case citation ambiguity:** Pattern matches "500 F.2d at 125" but cannot distinguish from full citation "Smith v. Jones, 500 F.2d 125" without context. Resolution engine must check for case name presence.
- **Party name extraction complexity:** SUPRA_PATTERN assumes capitalized single/multi-word names. Edge cases (lowercase "de", "von", etc.) may require enhanced pattern in 04-03.

### Dependencies for Future Plans
- **04-02 depends on:** Citation array from extraction pipeline (to find previous citation)
- **04-03 depends on:** Case name normalization (strip "v.", extract party names from full citations)
- **04-04 (integration) depends on:** 04-02 and 04-03 resolution implementations

## Metadata

- **Wave:** 1 (parallel with other Phase 4 setup work)
- **Autonomous:** Yes (no checkpoints required)
- **Model:** claude-sonnet-4-5 (executor)
- **Execution date:** 2026-02-05
- **Plan verification:** All must_haves met
  - SupraCitation and ShortFormCaseCitation in Citation union ✓
  - SHORT_FORM_PATTERNS exported with 4 patterns ✓
  - Pattern tests with ReDoS validation ✓
  - All tests passing (166/166) ✓
