# Phase 3: Reporter Database & Annotation - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate the reporters-db data (1200+ reporters with all variant forms) for citation validation, optimize bundle size with separate data chunking, implement position-aware annotation for marking up citations in text, and validate performance constraints (<50KB core bundle, <100ms for 10KB documents). The library must work without reporter data loaded (degraded mode using Phase 2 pattern-based extraction). Short-form resolution (Id./Supra) is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Reporter data loading
- All variant forms from reporters-db must be included (full parity with Python eyecite)
- Library works without reporter data loaded (degraded mode) — Phase 2 pattern-based extraction remains valid
- Reporter data enhances citations (validation, metadata enrichment) but doesn't gate extraction

### Claude's Discretion: Reporter Loading
- Eager vs lazy loading strategy
- Whether to support jurisdiction-based filtering/subsetting
- Whether to support custom/additional reporter entries beyond reporters-db
- Internal data structure for fast abbreviation lookup

### Bundle optimization strategy
- Reporter data shipped as a **separate loadable chunk**, not inline in the main JS bundle
- Core bundle (without reporter data) must be small; reporter data is opt-in/lazy-loadable
- Library degrades gracefully without reporter data — extraction still works, just without validation

### Claude's Discretion: Bundle Format
- Data format for the separate chunk (JSON vs optimized binary vs compressed)
- Exact size target flexibility (<50KB is from requirements; Claude balances size vs completeness)
- Compression and tree-shaking approach

### Annotation API design
- **Both callback and template modes** supported:
  - Callback: `(citation, surroundingText) => string` for maximum flexibility
  - Template: `{ before: '<a ...>', after: '</a>' }` for simple cases
- **Both original and cleaned text** available as annotation targets (leverages dual-span position tracking from Phase 2)
- **All citations annotated** even if overlapping — developer's callback handles nesting/conflicts
- Annotations applied using original positions (pre-cleaning) or clean positions (post-cleaning), developer chooses

### Claude's Discretion: Annotation Details
- HTML entity escaping strategy (auto-escape by default vs developer responsibility)
- Exact function signatures and options shape
- How overlapping annotations are ordered/applied

### Validation & confidence
- All structurally valid citations **always returned**, even without reporter match — no silent drops
- Unmatched citations flagged (e.g., `reporterMatch: null`) so developers can filter if desired
- Reporter database exposed as a **public queryable API** (lookup by abbreviation, list by jurisdiction) — useful for autocomplete, validation UIs, developer tools

### Claude's Discretion: Confidence Scoring
- How reporter match/miss adjusts confidence scores (boost on match, penalize on miss, or both)
- Ambiguity resolution strategy when abbreviation matches multiple reporters
- Confidence thresholds and scoring model

</decisions>

<specifics>
## Specific Ideas

- Degraded mode means Phase 2 users get value immediately without loading the full reporter database
- Separate chunk enables CDN-friendly caching of reporter data independently from code updates
- Public reporter API enables downstream tools (autocomplete, validation UIs) beyond just extraction

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-reporter-database-annotation*
*Context gathered: 2026-02-04*
