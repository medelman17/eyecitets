---
phase: 02-core-parsing
plan: 05
subsystem: parsing
tags: [citation-extraction, metadata-parsing, position-translation, confidence-scoring]

# Dependency graph
requires:
  - phase: 02-03
    provides: Token interface with cleanStart/cleanEnd positions and tokenize() function
  - phase: 02-04
    provides: Extended citation types with confidence, processTimeMs, warnings fields
provides:
  - Citation extraction functions for all types (case, statute, journal, neutral, public law, federal register)
  - Metadata parsing from token text (volume, reporter, page, section, etc.)
  - Position translation via TransformationMap (clean → original)
  - Confidence scoring based on pattern recognition
affects: [02-06, phase-3-resolution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extraction pattern: Parse token text with regex → Extract metadata → Translate positions → Calculate confidence"
    - "Position translation: Use TransformationMap.cleanToOriginal.get() with fallback to clean positions"
    - "Confidence scoring: Base + pattern-specific boosts (common reporters, known codes, valid years)"

key-files:
  created:
    - src/extract/extractCase.ts
    - src/extract/extractStatute.ts
    - src/extract/extractJournal.ts
    - src/extract/extractNeutral.ts
    - src/extract/extractPublicLaw.ts
    - src/extract/extractFederalRegister.ts
    - src/extract/index.ts
    - tests/extract/extractCase.test.ts
    - tests/extract/extractStatute.test.ts
    - tests/extract/extractOthers.test.ts
  modified: []

key-decisions:
  - "Year extraction before court extraction for combined parentheticals (e.g., '(9th Cir. 2020)')"
  - "Greedy reporter regex to capture multi-word abbreviations (e.g., 'So. 2d')"
  - "Neutral citations have 1.0 confidence (unambiguous format)"
  - "Journal citations have 0.6 base confidence (validation happens in Phase 3)"
  - "Fallback to clean positions when TransformationMap is empty"

patterns-established:
  - "Extraction function signature: (token: Token, transformationMap: TransformationMap) → Citation"
  - "Position translation: cleanToOriginal.get(cleanPos) ?? cleanPos for safe fallback"
  - "Confidence scoring: Base 0.5-0.6 + pattern boosts (0.3 for known patterns, 0.2 for valid years)"
  - "Error handling: Throw descriptive errors for parse failures (shouldn't happen if tokenizer correct)"

# Metrics
duration: 5min
completed: 2026-02-05
---

# Phase 2 Plan 5: Citation Extraction Summary

**Citation extraction layer parses token text into typed Citation objects with volume/reporter/page metadata, position translation, and confidence scoring**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-05T02:48:01Z
- **Completed:** 2026-02-05T02:53:09Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- **Case citation extraction:** Parses volume, reporter, page, pincite, court, year from token text with confidence scoring based on reporter patterns
- **Multi-type extraction:** Statute (title/code/section), journal (volume/journal/page), neutral (year/court/document), public law (congress/law number), and federal register (volume/page) extraction
- **Position translation:** All extraction functions translate clean positions to original positions via TransformationMap
- **High test coverage:** 93.93% statement coverage for src/extract/ directory with 47 passing tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement case citation extraction with metadata parsing** - `a30da2b` (feat)
2. **Task 2: Implement statute, journal, neutral, public law, and federal register extraction** - `4008b97` (feat)
3. **Task 3: Test citation extraction and metadata accuracy** - `5737a14` (test)

## Files Created/Modified

**Created:**
- `src/extract/extractCase.ts` - Case citation metadata extraction (volume, reporter, page, pincite, court, year)
- `src/extract/extractStatute.ts` - Statute citation extraction (title, code, section)
- `src/extract/extractJournal.ts` - Journal citation extraction (volume, journal, page, pincite)
- `src/extract/extractNeutral.ts` - Neutral citation extraction (year, court, document number)
- `src/extract/extractPublicLaw.ts` - Public law citation extraction (congress, law number)
- `src/extract/extractFederalRegister.ts` - Federal Register citation extraction (volume, page, year)
- `src/extract/index.ts` - Re-exports all extraction functions
- `tests/extract/extractCase.test.ts` - 17 tests for case extraction
- `tests/extract/extractStatute.test.ts` - 13 tests for statute extraction
- `tests/extract/extractOthers.test.ts` - 17 tests for journal, neutral, public law, federal register extraction

**Modified:**
- None (all new files)

## Decisions Made

**DECISION EXT-01: Year extraction before court extraction in parentheticals**
- **Rationale:** When both court and year appear in same parenthetical (e.g., "(9th Cir. 2020)"), extracting year first allows court regex to capture full text including year
- **Impact:** Both court and year fields correctly populated from combined parentheticals
- **Alternative considered:** Separate court/year regex - rejected because court abbreviations vary too widely

**DECISION EXT-02: Greedy reporter regex with numbers**
- **Rationale:** Reporter abbreviations like "So. 2d" and "F.3d" include numbers and spaces; greedy matching captures full abbreviation
- **Impact:** Multi-word reporters correctly extracted instead of truncated
- **Pattern:** `/^(\d+)\s+([A-Za-z0-9.\s]+)\s+(\d+)/` captures full reporter between volume and page

**DECISION EXT-03: Neutral citations have 1.0 confidence**
- **Rationale:** Neutral citation format (year + vendor + document number) is unambiguous and standardized
- **Impact:** Neutral citations always have maximum confidence
- **Examples:** "2020 WL 123456", "2020 U.S. LEXIS 456"

**DECISION EXT-04: Journal citations have 0.6 base confidence**
- **Rationale:** Journal validation against database happens in Phase 3; Phase 2 extraction only validates structure
- **Impact:** Journal citations have lower confidence until validated in resolution layer
- **Future:** Phase 3 will increase confidence when journal abbreviation matches database

**DECISION EXT-05: Safe position translation fallback**
- **Rationale:** If TransformationMap is empty or missing entry, fallback to clean positions instead of throwing error
- **Impact:** Extraction works even with incomplete transformation maps (e.g., identity mapping)
- **Pattern:** `cleanToOriginal.get(cleanPos) ?? cleanPos`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed greedy reporter regex to capture multi-word abbreviations**
- **Found during:** Task 3 (Testing case extraction)
- **Issue:** Lazy quantifier `+?` in reporter regex truncated multi-word reporters like "So. 2d" to "So."
- **Fix:** Changed regex from `/([A-Za-z.\s]+?)/` to `/([A-Za-z0-9.\s]+)/` with greedy matching and number support
- **Files modified:** src/extract/extractCase.ts
- **Verification:** Test "should handle reporters with multiple spaces" passes, correctly extracts "So. 2d"
- **Committed in:** 5737a14 (part of Task 3 commit)

**2. [Rule 1 - Bug] Fixed year extraction in combined parentheticals**
- **Found during:** Task 3 (Testing combined court/year extraction)
- **Issue:** Court regex captured entire parenthetical including year, preventing year regex from matching
- **Fix:** Reordered extraction to extract year first, then court; updated year regex to handle space-separated format
- **Files modified:** src/extract/extractCase.ts
- **Verification:** Test "should extract both court and year from combined parenthetical" passes
- **Committed in:** 5737a14 (part of Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both auto-fixes necessary for correctness. Regex improvements enable accurate metadata extraction from real-world citation formats.

## Issues Encountered

**Issue:** Initial regex patterns failed on edge cases (multi-word reporters, combined parentheticals)
- **Resolution:** Test-driven approach revealed failures early; regex refinements based on test feedback
- **Outcome:** All 47 tests pass with 93.93% coverage

## Next Phase Readiness

**Ready for Plan 6 (End-to-end parsing tests):**
- ✅ All extraction functions implemented and tested
- ✅ Position translation via TransformationMap working correctly
- ✅ Confidence scoring implemented for all citation types
- ✅ High test coverage (>93%) validates accuracy

**Ready for Phase 3 (Resolution):**
- ✅ Extraction produces typed Citation objects with metadata
- ✅ Position spans include both clean and original positions
- ✅ Confidence scores provide baseline for validation layer
- ⚠️ Validation against reporters-db still needed (Phase 3 scope)

**No blockers.** Extraction layer complete and tested.

---
*Phase: 02-core-parsing*
*Plan: 05*
*Completed: 2026-02-05*
