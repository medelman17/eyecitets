# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-05)

**Core value:** Developers can extract, resolve, and annotate legal citations from text without Python infrastructure
**Current focus:** v1.1 Extraction Accuracy - Phase 8 (Parallel Linking & Quality Validation)

## Current Position

Phase: 8 of 8 (Parallel Linking & Quality Validation) — COMPLETE
Plan: 3 of 3 complete (08-03 just completed)
Status: Phase complete, v1.1 milestone complete
Last activity: 2026-02-06 — Completed 08-03-PLAN.md (Golden Corpus & Quality Validation)

Progress: ████████████████ 100% (26/26 plans total, 17/17 v1.0 complete, 9/9 v1.1 complete)

**Phase 8 progress:** 3/3 plans complete, 528 tests passing

Config:
{
  "mode": "yolo",
  "depth": "quick",
  "parallelization": true,
  "commit_docs": true,
  "model_profile": "budget",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  },
  "git": {
    "branching_strategy": "phase"
  }
}

## Milestone History

- v1.0-alpha: 4 phases, 17 plans, 494 tests, shipped 2026-02-05
- v1.1 Extraction Accuracy: 4 phases, 9 plans, 528 tests, shipped 2026-02-06

## Performance Metrics

**Velocity (v1.0-alpha):**
- Total plans completed: 17
- Average duration: ~5 min
- Total execution time: ~1.5 hours

**By Phase (v1.0-alpha):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 4 | ~20 min | ~5 min |
| 2. Case Citations | 3 | ~15 min | ~5 min |
| 3. Other Citation Types | 4 | ~20 min | ~5 min |
| 4. Resolution & Annotation | 6 | ~35 min | ~6 min |

**Velocity (v1.1-alpha):**
- Total plans completed: 9
- Average duration: ~5.4 min
- Total execution time: ~49 min

**By Phase (v1.1-alpha):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 5. Type System & Blank Pages | 2/2 | ~5 min | ~2.5 min |
| 6. Full Span & Complex Parentheticals | 2/2 | ~7.4 min | ~3.7 min |
| 7. Party Name Extraction | 2/2 | ~13 min | ~6.5 min |
| 8. Parallel Linking & Quality Validation | 3/3 | ~23.5 min | ~7.8 min |

## Accumulated Context

### Decisions

| Phase | Decision | Rationale | Impact |
|-------|----------|-----------|--------|
| 05-01 | Page field made optional | Blank page placeholders have no numeric value; undefined cleaner than sentinel | Type system now permits citations without page numbers |
| 05-01 | All v1.1 fields optional | Incremental feature rollout across phases 5-8 | 100% backward compatibility with v1.0 consumers |
| 05-01 | JSDoc specifies which phase populates each field | Forward declarations for upcoming phases | Improves developer experience |
| 05-02 | Require 3+ chars for blank placeholders | Single dash/underscore could be legitimate text | Avoids false positives while matching real patterns |
| 05-02 | Use lookahead instead of word boundary | Dash is non-word char, \b doesn't work after it | Enables dash placeholder matching |
| 05-02 | Override confidence to 0.8 for blank pages | Blank pages are structurally valid but semantically incomplete | Consistent signal to consumers about missing page info |
| 06-01 | Use lowercase keys in MONTH_MAP | Single normalize step (lowercase + strip period) enables simple lookup | Case-insensitive month matching with minimal code |
| 06-01 | Year-only fallback for partial dates | Patterns require complete month+day+year triplets | Partial dates (month without day) treated as year-only |
| 06-01 | ISO format varies by granularity | Preserves maximum available precision without inventing missing data | Consumer can check parsed.day/month to determine precision |
| 06-02 | Replace fragmented extraction with unified parseParenthetical | Single parser handles all parenthetical formats consistently | Cleaner code, easier maintenance, better support for complex parentheticals |
| 06-02 | Keep span unchanged, add fullSpan for full citation | Backward compatibility - existing consumers rely on span pointing to core | Zero breaking changes, opt-in Phase 6 features |
| 06-02 | Backward search up to 150 chars for case name | Standard 'v.' format most common; procedural prefixes need special handling | Handles 95%+ of real-world case citations |
| 06-02 | Depth tracking for chained parentheticals | Handles nested parens correctly, supports '(2020) (en banc)' patterns | Robust parenthetical boundary detection |
| 06-02 | Extract only 'en banc' and 'per curiam' as disposition | Most common procedural statuses; others can be added incrementally | Phase 6 scope limited to high-value dispositions |
| 07-01 | Do not lower citation confidence for missing party names | Backward compatibility - existing citations maintain original scores; party quality reflected in supra resolution confidence instead | Citation confidence scoring unchanged from Phase 6 |
| 07-01 | Government entities are plaintiffs, not procedural prefixes | "United States v. Jones" is adversarial litigation, not a case type like "In re" | extractPartyNames splits on "v." for government entity cases |
| 07-01 | Strip d/b/a and aka plus everything after | Alternative business names and aliases are noise for matching; "Smith d/b/a Smith Industries" should match "Smith" | Normalization removes alternative name variations |
| 07-01 | Support '/' character in backward search regex | Party names contain "d/b/a" with slash; original regex truncated at slash | Updated extractCaseName regex to include '/' in character class |
| 07-01 | Iteratively strip multiple corporate suffixes | Names like "Smith Corp., Inc." have multiple suffixes; single-pass leaves "Corp." | While loop strips suffixes until no more matches |
| 07-02 | Defendant name stored first in resolution history | Bluebook convention prefers defendant name in supra citations | DocumentResolver prioritizes defendantNormalized for matching |
| 07-02 | Fallback to backward text search when extracted names unavailable | Ensures compatibility with pre-Phase 7 citations and extraction failures | Graceful degradation maintains resolution quality |
| 07-02 | Citation boundary detection uses digit-period-space pattern | Prevents matching across citation boundaries ("10. Jones" → split before "Jones") | extractCaseName correctly handles consecutive citations |
| 07-02 | Signal word stripping moved into extractPartyNames | Consistent plaintiff extraction regardless of resolution path | "In Smith v. Jones" → plaintiff "Smith" (not "In Smith") |
| 08-01 | Comma-only separator for parallel citations | Bluebook standard uses comma; semicolon separates distinct citations | Simplifies detection algorithm, reduces false positives |
| 08-01 | groupId format: ${volume}-${reporter}-${page} | Deterministic, stable, human-readable identifier | Consumers can rely on stable groupId for deduplication |
| 08-01 | Only primary citation gets parallelCitations array | Avoids circular references, follows Bluebook convention | Clear ownership model, easier to serialize |
| 08-01 | Singletons have undefined groupId | groupId indicates parallel group membership | Consumers check groupId presence to detect parallel citations |
| 08-01 | Reject citations with closing paren between them | "A (1970), B (1971)" = separate cases; "A, B (1970)" = parallel | Prevents false positives for comma-separated distinct cases |
| 08-02 | useFullSpan as option field (not separate function) | API consistency with existing useCleanText/autoEscape pattern | Single function handles both span modes with option flag |
| 08-02 | Default useFullSpan to false for backward compatibility | Existing annotation consumers expect core citation span | Zero breaking changes, opt-in Phase 6+ feature |
| 08-02 | Individual annotations per citation in parallel groups | Simpler implementation, gives developers control via callback | Developers can deduplicate using groupId if desired |
| 08-02 | Graceful fallback when fullSpan missing | Mixed citation sets (pre/post-Phase 6) shouldn't break | Robust handling of partial Phase 6 adoption |
| 08-03 | Key field matching for golden corpus tests | Full object snapshots break on new field additions | Flexible regression testing focused on critical fields |
| 08-03 | Corpus reflects actual extractor output | For quality validation, extractor is source of truth | Golden corpus documents Phase 8 behavior accurately |

Recent decisions from v1.0-alpha affecting v1.1:
- Dual position tracking (Span) enables accurate fullSpan calculation
- Broad tokenization + strict extraction separates concerns (applies to blank pages)
- Optional fields pattern maintains backward compatibility
- Levenshtein fuzzy matching (0.8 threshold) ready for party name matching

Full decision log in PROJECT.md Key Decisions table.

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-06 (plan execution)
Stopped at: Completed 08-03-PLAN.md (Golden Corpus & Quality Validation)
Resume file: None - Phase 8 complete, v1.1 milestone complete
