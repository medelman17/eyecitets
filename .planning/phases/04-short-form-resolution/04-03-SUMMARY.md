---
phase: 04-short-form-resolution
plan: 03
subsystem: resolution-engine
tags: [resolution, short-form, id, supra, levenshtein, scope-boundaries, document-state]

# Dependency graph
requires:
  - phase: 04-01
    provides: IdCitation, SupraCitation, ShortFormCaseCitation types and SHORT_FORM_PATTERNS
provides:
  - DocumentResolver class for document-scoped citation resolution
  - resolveCitations wrapper function
  - Scope boundary detection (paragraph/section/footnote/none)
  - Levenshtein distance for fuzzy party name matching
  - Resolution type system (ResolutionOptions, ResolutionResult, ResolvedCitation)
affects: [04-04-integration-tests]

# Tech tracking
tech-stack:
  added: []
  patterns: [document-scoped-state-tracking, sequential-citation-processing, fuzzy-string-matching, scope-boundary-validation]

key-files:
  created:
    - src/resolve/types.ts
    - src/resolve/DocumentResolver.ts
    - src/resolve/scopeBoundary.ts
    - src/resolve/levenshtein.ts
    - src/resolve/index.ts
    - tests/unit/resolve/scopeBoundary.test.ts
    - tests/unit/resolve/levenshtein.test.ts
  modified: []

key-decisions:
  - id: RES-01
    decision: "ResolvedCitation uses intersection type (Citation & {resolution?})"
    rationale: "Citation is discriminated union - can't extend with interface, must use intersection"
    impact: "Type-safe resolution metadata attachment without breaking existing Citation types"
  - id: RES-02
    decision: "Extract party names from citation text using 'v.' pattern matching"
    rationale: "FullCaseCitation doesn't have caseName field - extract from text instead"
    impact: "Supra resolution works with existing type system without schema changes"
  - id: RES-03
    decision: "Normalize reporter abbreviations by removing spaces and periods"
    rationale: "F.2d vs F. 2d vs F2d should all match for short-form case resolution"
    impact: "Flexible short-form case matching handles reporter abbreviation variations"
  - id: RES-04
    decision: "Fuzzy party matching enabled by default with 0.8 threshold"
    rationale: "Handle typos, abbreviations, and spelling variations in party names"
    impact: "More robust supra resolution at cost of potential false positives"

patterns-established:
  - "Document state tracking: Sequential processing with maintained antecedent history"
  - "Scope boundary detection: Regex-based paragraph detection with O(n) citation assignment"
  - "Fuzzy string matching: Levenshtein distance with normalization for case-insensitive comparison"
  - "Resolution confidence scoring: 1.0 for Id., similarity score for supra, 0.95 for short-form case"

# Metrics
duration: 4m 30s
completed: 2026-02-05
---

# Phase 4 Plan 3: Document-Scoped Resolution Engine Summary

**DocumentResolver with Id./supra/short-form case resolution, Levenshtein fuzzy matching, and configurable scope boundaries**

## Performance

- **Duration:** 4 minutes 30 seconds
- **Started:** 2026-02-05T05:30:33Z
- **Completed:** 2026-02-05T05:35:03Z
- **Tasks:** 3/3
- **Tests added:** 22 tests (9 scope boundary, 13 Levenshtein)
- **Total test count:** 188 tests passing
- **Files created:** 7 files (5 implementation, 2 test)
- **Lines of code:** ~900 lines

## Accomplishments

### Core Resolution Infrastructure

1. **DocumentResolver class** - Complete resolution engine
   - Sequential citation processing with state tracking
   - Maintains antecedent history (lastFullCitation, fullCitationHistory Map)
   - Processes 3 short-form types: Id., supra, short-form case
   - Configurable scope boundaries with automatic paragraph detection
   - 308 lines of resolution logic

2. **Resolution type system** (src/resolve/types.ts)
   - ResolutionOptions interface: 7 configuration options
   - ResolutionResult interface: resolvedTo index, failureReason, warnings, confidence
   - ResolvedCitation type: Citation & {resolution?} intersection
   - ResolutionContext interface: Internal state tracking
   - ScopeStrategy type: 'paragraph' | 'section' | 'footnote' | 'none'

3. **Scope boundary utilities** (src/resolve/scopeBoundary.ts)
   - detectParagraphBoundaries: Regex-based paragraph detection
   - isWithinBoundary: Validates scope constraints
   - Configurable boundary patterns (default: /\n\n+/)
   - Map-based O(1) boundary lookups

4. **Levenshtein distance** (src/resolve/levenshtein.ts)
   - levenshteinDistance: Standard edit distance algorithm
   - normalizedLevenshteinDistance: 0-1 similarity score
   - Case-insensitive comparison for party name matching
   - O(m*n) dynamic programming implementation

5. **Convenience wrapper** (src/resolve/index.ts)
   - resolveCitations function: Simple API for common use cases
   - Re-exports all types and DocumentResolver class
   - JSDoc examples with usage patterns

### Resolution Algorithms

**Id. Resolution:**
- Matches to immediately preceding full citation (lastFullCitation)
- Enforces scope boundary constraints
- Confidence: 1.0 (unambiguous when successful)
- Failure cases: No preceding full, outside scope, nested Id. without allowNestedResolution

**Supra Resolution:**
- Extracts party name from citation text ("Party v. Party" format)
- Normalizes party names (lowercase, whitespace normalization)
- Searches fullCitationHistory Map for matches
- Levenshtein fuzzy matching with configurable threshold (default: 0.8)
- Confidence: Similarity score from fuzzy match
- Warnings: Added for fuzzy matches (similarity < 1.0)

**Short-form Case Resolution:**
- Backward search for matching volume/reporter
- Normalizes reporters (remove spaces/periods: F.2d → f2d)
- Enforces scope boundary after match found
- Confidence: 0.95 (high but not perfect - multiple cases could match)

## Task Commits

Each task was committed atomically:

| Task | Description | Commit | Files | Lines |
|------|-------------|--------|-------|-------|
| 1 | Create resolution type system | d513773 | src/resolve/types.ts | 136 |
| 2 | Implement scope boundary and Levenshtein | 5ce2d52 | scopeBoundary.ts, levenshtein.ts, 2 tests | 450 |
| 3 | Implement DocumentResolver and wrapper | 2ff8210 | DocumentResolver.ts, index.ts | 389 |

## Files Created/Modified

### Created

**Implementation:**
- `src/resolve/types.ts` (136 lines) - Resolution type system
- `src/resolve/DocumentResolver.ts` (308 lines) - Main resolution engine
- `src/resolve/scopeBoundary.ts` (91 lines) - Paragraph boundary detection
- `src/resolve/levenshtein.ts` (95 lines) - Fuzzy string matching
- `src/resolve/index.ts` (50 lines) - Convenience wrapper and exports

**Tests:**
- `tests/unit/resolve/scopeBoundary.test.ts` (178 lines) - 9 tests for boundary detection
- `tests/unit/resolve/levenshtein.test.ts` (94 lines) - 13 tests for edit distance

### Modified
None - all new files created

## Decisions Made

### RES-01: ResolvedCitation Type Design
**Context:** Need to add resolution metadata to citations without breaking existing types.

**Decision:** Use intersection type `Citation & {resolution?}` instead of interface extending Citation.

**Rationale:**
- Citation is a discriminated union (not an interface)
- TypeScript interfaces cannot extend union types
- Intersection types allow adding fields to union types
- Optional resolution field doesn't break existing code

**Alternatives considered:**
- Create separate resolved types for each citation type (too verbose)
- Add resolution field to CitationBase (pollutes all citations)

**Impact:** Type-safe resolution metadata attachment. TypeScript enforces correct usage without breaking existing Citation consumers.

### RES-02: Party Name Extraction from Text
**Context:** FullCaseCitation doesn't have a caseName field in type system.

**Decision:** Extract party name from citation text using pattern matching.

**Pattern:** `/^([^,]+?)\s+v\.?\s+/` to capture first party before "v."

**Rationale:**
- Avoids schema changes to FullCaseCitation
- Citation text already contains party names
- Simple regex extraction sufficient for MVP
- Falls back to first capitalized words if no "v." found

**Limitations:**
- Doesn't handle lowercase particles ("de", "von", "in re")
- Assumes standard "Party v. Party" format
- Multi-party cases extract only first party

**Impact:** Supra resolution works immediately without type system changes. Extraction quality sufficient for 0.8 fuzzy match threshold.

### RES-03: Reporter Normalization Strategy
**Context:** Reporter abbreviations vary (F.2d, F. 2d, F2d).

**Decision:** Normalize by removing spaces and periods: `reporter.toLowerCase().replace(/\s+/g, '').replace(/\./g, '')`

**Rationale:**
- Handles all common abbreviation styles
- Simple normalization (no lookup table needed)
- Works for both full case and short-form case citations

**Examples:**
- "F.2d" → "f2d"
- "F. 2d" → "f2d"
- "U.S." → "us"
- "Cal.Rptr." → "calrptr"

**Impact:** Short-form case resolution robust to reporter abbreviation variations.

### RES-04: Fuzzy Party Matching Configuration
**Context:** Party names may have typos, abbreviations, or spelling variations.

**Decision:** Enable fuzzy matching by default with 0.8 threshold.

**Rationale:**
- Common typos: "United States" vs "United State" (similarity: 0.92)
- Missing spaces: "United States" vs "UnitedStates" (similarity: 0.92)
- Abbreviations: "McDonald" vs "MacDonald" (similarity: 0.88)
- 0.8 threshold balances recall (find variations) vs precision (avoid false positives)

**Performance:** O(m*n) per comparison, acceptable for typical citation counts (<100 full citations per document)

**Impact:** More robust supra resolution. Users can disable (fuzzyPartyMatching: false) or adjust threshold if needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed ResolvedCitation type definition**
- **Found during:** Task 1 - TypeScript compilation
- **Issue:** `export interface ResolvedCitation extends Citation` failed - Citation is union type, can't extend with interface
- **Fix:** Changed to intersection type: `export type ResolvedCitation = Citation & {resolution?: ResolutionResult}`
- **Files modified:** src/resolve/types.ts
- **Verification:** TypeScript compilation passed
- **Committed in:** d513773 (Task 1 commit)
- **Rationale:** Required for type system correctness. Plan didn't account for Citation being a union type.

**2. [Rule 2 - Missing Critical] Implemented party name extraction**
- **Found during:** Task 3 - DocumentResolver implementation
- **Issue:** Plan assumed FullCaseCitation has caseName field, but it doesn't exist in type system
- **Fix:** Added extractPartyName method that parses citation text using "Party v. Party" pattern
- **Files modified:** src/resolve/DocumentResolver.ts
- **Verification:** Supra resolution logic compiles and type-checks
- **Committed in:** 2ff8210 (Task 3 commit)
- **Rationale:** Critical for supra resolution functionality. Avoiding schema changes preserves backward compatibility.

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both fixes essential for correctness. No scope creep - worked around existing type system constraints.

## Issues Encountered

None - implementation proceeded smoothly after type system fixes.

## Technical Insights

### Resolution Algorithm Design

**Sequential Processing Pattern:**
- Process citations in document order (maintains lastFullCitation invariant)
- Update context after each citation (fullCitationHistory Map, lastFullCitation index)
- Scope boundary checks happen during resolution, not upfront

**Context State Management:**
- lastFullCitation: Number (index) - Fast O(1) Id. resolution
- fullCitationHistory: Map<string, number> - O(1) party name lookups for supra
- paragraphMap: Map<number, number> - O(1) boundary checks

**Confidence Scoring Philosophy:**
- Id.: 1.0 (unambiguous - only one preceding citation)
- Supra: Levenshtein similarity (0.0-1.0, reflects match quality)
- Short-form case: 0.95 (high confidence but multiple cases could match volume/reporter)

### Scope Boundary Implementation

**Paragraph Detection:**
- Regex-based: Default /\n\n+/ matches double newlines
- Configurable: Users can provide custom patterns (e.g., /\|/ for section markers)
- O(n) boundary detection + O(m) citation assignment where n=text length, m=citation count

**Boundary Checking:**
- None strategy: Always returns true (document-wide resolution)
- Paragraph/section/footnote: Same-boundary check (MVP - future: distinguish section from paragraph)

### Levenshtein Distance

**Algorithm Choice:**
- Dynamic programming: O(m*n) time, O(m*n) space
- Alternative considered: Wagner-Fischer with O(min(m,n)) space optimization (deferred - premature)

**Normalization:**
- Case-insensitive: Lowercase both strings before comparison
- Similarity score: 1 - (distance / maxLength) converts distance to 0-1 scale
- Handles edge cases: Empty strings return 1.0 (both empty = identical)

## Next Phase Readiness

### Ready for 04-04 (Integration Tests)
- [x] DocumentResolver implements all three short-form resolution types
- [x] resolveCitations convenience wrapper provides simple API
- [x] Resolution returns immutable results (new array, original citations unchanged)
- [x] Scope boundaries configurable and tested
- [x] Type system complete with ResolvedCitation type
- [ ] Integration tests needed to validate end-to-end resolution (04-04 scope)
- [ ] Pipeline integration (extract + resolve) needs wrapper function (04-04 scope)

### Blockers/Concerns

**Party Name Extraction Limitations:**
- Current implementation assumes "Party v. Party" format
- Edge cases not handled:
  - Lowercase particles: "United States v. de la Cruz"
  - Multi-party cases: "Smith, Jones, and Brown v. County"
  - In re cases: "In re Bankruptcy of Company"
- **Recommendation:** If fuzzy matching insufficient, enhance extractPartyName in future phase

**Short-form Case Ambiguity:**
- Multiple cases could match same volume/reporter
- Current implementation returns first match searching backward
- No case name validation (can't distinguish "Smith" from "Jones" if both 500 F.2d)
- **Recommendation:** Consider case name proximity in 04-04 if integration tests reveal issues

**Performance at Scale:**
- Levenshtein O(m*n) acceptable for typical document citations (<100 full cases)
- Documents with 1000+ citations may have slow supra resolution
- **Recommendation:** Profile in 04-04 integration tests; optimize if needed (trie-based matching, caching)

### Dependencies for 04-04

**Integration test requirements:**
1. End-to-end pipeline: extractCitations + resolveCitations
2. Realistic legal text with mixed citation types
3. Validation that resolution.resolvedTo points to correct antecedent
4. Scope boundary edge cases (cross-paragraph Id., same-paragraph supra)
5. Performance benchmarks (documents with 100+ citations)

**API integration:**
1. Optional resolve parameter in extractCitations: extractCitations(text, {resolve: true})
2. Wrapper function combining extract + resolve steps
3. Export from main index.ts for convenient imports

## Metadata

- **Wave:** 2 (parallel with other resolution implementation)
- **Autonomous:** Yes (no checkpoints required)
- **Model:** claude-sonnet-4-5 (executor)
- **Execution date:** 2026-02-05
- **Plan verification:** All must_haves met
  - ResolutionOptions, ResolutionResult, ResolvedCitation types defined ✓
  - DocumentResolver implements full resolution logic ✓
  - Scope boundary detection and validation ✓
  - Levenshtein distance for fuzzy matching ✓
  - resolveCitations wrapper function ✓
  - 22 tests passing ✓
  - All files exported from src/resolve/index.ts ✓
