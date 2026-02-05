---
phase: 06-full-span-complex-parentheticals
verified: 2026-02-05T19:37:41Z
status: passed
score: 11/11 must-haves verified
---

# Phase 6: Full Span & Complex Parentheticals Verification Report

**Phase Goal:** Extract full citation boundaries and parse complex parentheticals with dates  
**Verified:** 2026-02-05T19:37:41Z  
**Status:** passed  
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Case citations include fullSpan covering case name through closing parenthetical | ✓ VERIFIED | fullSpan field exists in type, populated in extractCase, covers "Smith v. Jones, 500 F.2d 123 (2020)" from start to end |
| 2 | Case name is extracted via backward search for "v." pattern | ✓ VERIFIED | extractCaseName function with regex /([A-Z][A-Za-z0-9\s.,'&()-]+?)\s+v\.?\s+([A-Za-z0-9\s.,'&()-]+?)\s*,\s*$/ |
| 3 | Procedural prefixes (In re, Ex parte, Matter of) extracted as caseName | ✓ VERIFIED | extractCaseName handles procedural prefixes, test "In re Smith" → caseName: "In re Smith" |
| 4 | caseName field exposed on FullCaseCitation type | ✓ VERIFIED | caseName?: string field in src/types/citation.ts line 123 |
| 5 | Existing span field unchanged (core only) for backward compatibility | ✓ VERIFIED | span points to "500 F.2d 123" (cleanStart: 16, cleanEnd: 28), not full citation |
| 6 | Parentheticals with month/day dates extract court and structured date | ✓ VERIFIED | "(2d Cir. Jan. 15, 2020)" → court: "2d Cir.", date.iso: "2020-01-15", parsed: {year, month, day} |
| 7 | Parentheticals work with court only, date only, or both | ✓ VERIFIED | Tests pass for "(2020)", "(9th Cir. 2020)", "(2d Cir. Jan. 15, 2020)" |
| 8 | Three date formats handled (abbreviated, full month, numeric) | ✓ VERIFIED | parseDate handles "Jan. 15, 2020", "January 15, 2020", "1/15/2020" |
| 9 | Year-only parentheticals produce structured date with year-only parsed object | ✓ VERIFIED | "(1973)" → date: { iso: "1973", parsed: { year: 1973 } } |
| 10 | Chained parentheticals like "(2020) (en banc)" extract both year and disposition | ✓ VERIFIED | findParentheticalEnd tracks depth, fullSpan covers both parens, disposition extracted |
| 11 | Disposition field populated for "en banc" and "per curiam" | ✓ VERIFIED | disposition?: string in type, parseParenthetical extracts via regex, tests pass |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/extract/dates.ts` | Date parsing utilities (parseMonth, parseDate, toIsoDate) | ✓ VERIFIED | 185 lines, exports all required functions and types |
| `tests/extract/dates.test.ts` | Unit tests for date parsing (min 60 lines) | ✓ VERIFIED | 215 lines, 24 tests passing |
| `src/extract/extractCase.ts` | Case name extraction, unified parenthetical parser, fullSpan | ✓ VERIFIED | extractCaseName, findParentheticalEnd, parseParenthetical functions exist and wired |
| `src/types/citation.ts` | caseName, fullSpan, disposition fields on FullCaseCitation | ✓ VERIFIED | All three fields present with JSDoc comments |
| `tests/extract/extractCase.test.ts` | Comprehensive Phase 6 tests (min 100 lines added) | ✓ VERIFIED | 28 new tests added covering all Phase 6 features, 84 total tests passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| src/extract/extractCase.ts | src/extract/dates.ts | import { parseDate } from './dates' | ✓ WIRED | Line 20 import, line 211 usage in parseParenthetical |
| src/extract/extractCase.ts | src/types/citation.ts | FullCaseCitation with fullSpan, caseName, disposition | ✓ WIRED | Return statement lines 467-491 populates all three fields |
| extractCaseName | extractCase main function | Backward search for case name | ✓ WIRED | Called at line 384, result used to populate caseName and fullSpan |
| findParentheticalEnd | extractCase main function | Forward search for parenthetical boundaries | ✓ WIRED | Called at line 389, result used to calculate fullSpan.cleanEnd |
| parseParenthetical | extractCase main function | Unified parenthetical parsing | ✓ WIRED | Called at line 350, result populates court, year, date, disposition |

### Requirements Coverage

**Phase 6 Requirements (8/8 satisfied):**

| Requirement | Status | Evidence |
|-------------|--------|----------|
| SPAN-01: caseName extracted via backward search for "v." and procedural prefixes | ✓ SATISFIED | extractCaseName function with priority-based regex matching |
| SPAN-02: fullSpan covers case name through closing parenthetical (including chained) | ✓ SATISFIED | findParentheticalEnd with depth tracking, fullSpan calculation |
| SPAN-03: caseName field populated on FullCaseCitation | ✓ SATISFIED | Type definition line 123, population line 386 |
| SPAN-04: Existing span field unchanged (citation core only) | ✓ SATISFIED | span uses original token bounds (lines 471-474), verified via runtime test |
| PAREN-01: Court extracted from parentheticals with month/day dates | ✓ SATISFIED | stripDateFromCourt enhanced, parseParenthetical integration |
| PAREN-02: Structured date with year, month, day fields | ✓ SATISFIED | dates.ts provides ParsedDate type with optional month/day |
| PAREN-03: Court only, date only, or both all work | ✓ SATISFIED | parseParenthetical handles all combinations, tests verify |
| PAREN-04: Three date formats handled (abbreviated, full month, numeric) | ✓ SATISFIED | parseDate with three regex patterns in sequence |

### Anti-Patterns Found

**None.**

No TODO/FIXME comments, no stub implementations, no placeholder content in Phase 6 code. The only "placeholder" mentions are in comments about Phase 5's blank page feature.

### Backward Compatibility Verification

| Check | Status | Details |
|-------|--------|---------|
| All existing tests pass unchanged | ✓ PASS | 435/435 tests pass (84 extractCase tests including 56 existing + 28 new) |
| span field points to citation core only | ✓ PASS | Runtime test confirms span.originalStart=16, originalEnd=28 for "500 F.2d 123" |
| New fields (caseName, fullSpan, disposition) are optional | ✓ PASS | All typed as optional (?) in FullCaseCitation interface |
| No breaking type changes | ✓ PASS | pnpm typecheck passes with no errors |

### Runtime Validation

Tested actual extraction with built artifacts:

**Test 1: Chained parentheticals with disposition**
```
Input: "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc)"
Output:
  caseName: "Smith v. Jones"
  span: { cleanStart: 16, cleanEnd: 28 } // "500 F.2d 123"
  fullSpan: { cleanStart: 0, cleanEnd: 54 } // entire text
  disposition: "en banc"
  court: "9th Cir."
  year: 2020
  date: { iso: "2020", parsed: { year: 2020 } }
```

**Test 2: Full date with month/day**
```
Input: "Smith v. Jones, 500 F.3d 100 (2d Cir. Jan. 15, 2020)"
Output:
  caseName: "Smith v. Jones"
  court: "2d Cir."
  date: { iso: "2020-01-15", parsed: { year: 2020, month: 1, day: 15 } }
```

**Test 3: Procedural prefix**
```
Input: "In re Smith, 410 U.S. 113 (1973)"
Output:
  caseName: "In re Smith"
  year: 1973
```

**Test 4: No case name (backward compatible)**
```
Input: "500 F.2d 123 (2020)"
Output:
  caseName: undefined
  fullSpan: undefined
  span: { cleanStart: 0, cleanEnd: 12 } // citation core only
```

**Test 5: Per curiam disposition**
```
Input: "Foo v. Bar, 500 F.2d 123 (per curiam)"
Output:
  disposition: "per curiam"
```

All runtime tests confirm implementation matches specification.

---

## Summary

**Phase 6 goal achieved.** All 11 observable truths verified, all 5 required artifacts substantive and wired, all 8 requirements satisfied, zero anti-patterns, full backward compatibility maintained.

**Key achievements:**
- Case name extraction via backward search (150 char limit, handles "v." and procedural prefixes)
- Full span calculation via forward search (200 char limit, depth tracking for chained parens)
- Unified parenthetical parser replacing fragmented year/court logic
- Structured date support for three formats (abbreviated month, full month, numeric US)
- Disposition field for en banc and per curiam
- Existing span field unchanged (citation core only) — zero breaking changes

**Test coverage:**
- 24 new date parsing tests (all passing)
- 28 new Phase 6 feature tests (all passing)
- 435 total tests passing (zero regressions)
- Runtime validation confirms features work end-to-end

**Next steps:**
- Phase 7: Party name extraction (plaintiff, defendant fields from caseName)
- Can leverage extractCaseName result for party splitting

---

_Verified: 2026-02-05T19:37:41Z_  
_Verifier: Claude (gsd-verifier)_
