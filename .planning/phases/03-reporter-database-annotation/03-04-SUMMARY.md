---
phase: 03-reporter-database-annotation
plan: 04
subsystem: build-tooling
tags: [bundle-size, performance, integration-tests, ci-cd, tsdown]
requires: [03-01-reporter-database, 03-02-annotation-api, 03-03-validation]
provides:
  - Bundle size validation script for CI/CD
  - Separate lazy-loadable data chunks
  - Phase 3 integration test suite
  - Performance benchmarks (<100ms for 10KB docs)
affects: [phase-4-resolution]
tech-stack:
  added: []
  patterns:
    - Multiple entry points for code splitting
    - Gzip-based bundle size validation
    - Performance benchmarking with performance.now()
key-files:
  created:
    - scripts/check-bundle-size.ts
    - tests/integration/phase3.test.ts
  modified:
    - package.json
    - tsdown.config.ts
key-decisions:
  - decision: BUNDLE-01
    desc: "Separate entry points for core/data/annotate chunks"
    rationale: "Keeps core bundle <50KB by lazy-loading 485KB reporter data"
  - decision: BUNDLE-02
    desc: "Gzip-based size validation in CI/CD"
    rationale: "Matches real-world network transfer sizes"
  - decision: TEST-03
    desc: "Phase 3 integration tests validate full pipeline"
    rationale: "End-to-end validation ensures all components work together"
duration: 137s
completed: 2026-02-05
---

# Phase 3 Plan 04: Bundle Optimization & Integration Tests Summary

**One-liner:** Optimized bundle to 2.5KB core + 485KB lazy-loaded data, validated <100ms performance for 10KB docs, integrated Phase 3 pipeline tests

## Performance

**Bundle sizes (gzipped):**
- Core bundle (dist/index.mjs): 2.5 KB (target: <50 KB) ✅
- Data chunk (dist/data/index.mjs): 0.4 KB (lazy-loads 88.53 KB reporters) ✅
- Annotate chunk (dist/annotate/index.mjs): 0.5 KB (target: <20 KB) ✅

**Performance benchmarks:**
- 10KB document processing: <100ms ✅ (PERF-02 requirement met)
- Test execution: 48ms for 5 integration tests
- Build time: 145ms for all three entry points

## Accomplishments

### Task 1: Separate Data Chunk Configuration (5c5f82b)
- Added `./annotate` export to package.json
- Configured tsdown with multiple entry points (index, data/index, annotate/index)
- Added `check:size` script to package.json
- Verified core bundle isolated from data layer (no imports from src/data in src/index.ts)

### Task 2: Bundle Size Validation Script (f8a334c)
- Created scripts/check-bundle-size.ts with gzip compression
- Uses Node.js built-in zlib (zero dependencies)
- Validates three chunks with separate size limits
- CI/CD ready via npm run check:size

### Task 3: Phase 3 Integration Tests (0f54262)
- Test 1: Full pipeline validation (clean → extract → validate → annotate)
- Test 2: Performance benchmark (10KB document in <100ms)
- Test 3: Degraded mode operation (works without reporter database)
- Test 4: HTML entity auto-escaping in annotation
- Test 5: Confidence scoring adjustment on reporter match
- All tests pass ✅

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| 1 | 5c5f82b | feat | Configure separate data and annotate chunks |
| 2 | f8a334c | feat | Add bundle size validation script |
| 3 | 0f54262 | test | Add Phase 3 integration tests with performance validation |

## Files Created

**scripts/check-bundle-size.ts** (40 lines)
- Bundle size validation with gzip compression
- Checks core (<50KB), data (<100KB), annotate (<20KB)
- Uses Node.js built-in modules (fs, zlib)
- CI/CD integration via npm script

**tests/integration/phase3.test.ts** (184 lines)
- 5 comprehensive integration tests
- Full pipeline validation (clean → extract → validate → annotate)
- Performance benchmark validation (PERF-02)
- Degraded mode testing
- HTML entity escaping validation
- Confidence scoring verification

## Files Modified

**package.json**
- Added `./annotate` export with types/import/require
- Added `check:size` script for CI/CD

**tsdown.config.ts**
- Changed entry from string to object with multiple entry points
- Configured separate builds for index, data/index, annotate/index

## Decisions Made

**BUNDLE-01: Separate entry points for code splitting**
- **Context:** Core bundle must be <50KB but reporter data is 485KB
- **Decision:** Configure tsdown with separate entry points (index, data/index, annotate/index)
- **Impact:** Core bundle reduced to 2.5KB gzipped; data loaded only when needed
- **Alternatives considered:** Single bundle (would exceed limit), CDN hosting (adds external dependency)

**BUNDLE-02: Gzip-based size validation**
- **Context:** Need to validate bundle size in CI/CD
- **Decision:** Use Node.js built-in zlib for gzip compression measurement
- **Impact:** Bundle sizes measured match real-world network transfer (not raw file size)
- **Alternatives considered:** Raw file size (doesn't reflect actual transfer), external tools (adds dependencies)

**TEST-03: Phase 3 integration tests**
- **Context:** Need to validate complete Phase 3 pipeline before Phase 4
- **Decision:** Create comprehensive integration test suite with 5 tests covering full pipeline
- **Impact:** Validates extraction + validation + annotation work together; catches integration bugs
- **Alternatives considered:** Unit tests only (wouldn't catch integration issues)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Issue 1: CleanTextResult uses `.cleaned` not `.text`**
- **Found during:** Task 3 test implementation
- **Issue:** Test used `cleaned.text` but API returns `cleaned.cleaned`
- **Fix:** Updated test to use correct property name
- **Impact:** Minor test fix, no architectural changes

## Next Phase Readiness

**Phase 4 blockers:** None

**Phase 4 readiness:**
- ✅ Bundle size optimized (<50KB core)
- ✅ Performance validated (<100ms for 10KB docs)
- ✅ Integration tests passing (full pipeline works)
- ✅ Separate data chunks enable lazy loading in Phase 4
- ✅ Validation and annotation layers tested and stable

**Recommendations for Phase 4:**
1. Use lazy loading pattern established here for Id./Supra resolution data
2. Follow same bundle size validation approach for new chunks
3. Extend integration tests to cover resolution features
4. Monitor performance as resolution logic adds complexity

**Known issues to address:**
- None blocking Phase 4

**Technical debt:**
- None introduced
