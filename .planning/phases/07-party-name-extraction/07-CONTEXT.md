# Phase 7: Party Name Extraction - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract plaintiff and defendant from case names (backward-searched in Phase 6) and use party names to improve supra resolution matching. Parallel citation linking is Phase 8.

</domain>

<decisions>
## Implementation Decisions

### Name splitting rules
- Split on "v." / "vs." to separate plaintiff and defendant
- Store both raw and normalized versions: plaintiff/defendant (raw text as found) and plaintiffNormalized/defendantNormalized (cleaned for matching)
- "et al." kept in raw fields, stripped in normalized fields
- "d/b/a" and "aka" kept in raw, stripped in normalized

### Claude's Discretion: Name splitting
- Multiple "v." handling (first vs last split heuristic)
- Corporate suffix treatment (Inc., LLC, Corp.) in raw fields
- d/b/a sub-splitting approach

### Procedural prefixes
- Comprehensive prefix set: In re, Ex parte, Matter of, State ex rel., United States ex rel., Application of, Petition of, Estate of
- Case-insensitive matching for all prefixes
- Procedural cases store subject in plaintiff field (consistent across all prefix types)
- Both: full text in plaintiff ("In re Smith") AND a separate proceduralPrefix field ("In re") for structured access
- "People v.", "Commonwealth v.", "State v." treated as government-entity plaintiffs, NOT procedural prefixes

### Claude's Discretion: Procedural prefixes
- Handling of "Estate of" when "v." is present vs absent
- Format variations (periods, spacing) in prefix matching
- Compound prefix splitting (ex rel. relator extraction)

### Supra matching strategy
- Augment existing Levenshtein approach: try party name match first, fall back to full-text Levenshtein
- Party name match preferred over Levenshtein when available (fixes #21)

### Claude's Discretion: Supra matching
- Which party to match on (defendant first vs either party)
- Confidence scoring for party name match vs Levenshtein match
- Impact of party name extraction failure on citation confidence

### Output normalization
- Dual fields: raw (plaintiff/defendant) + normalized (plaintiffNormalized/defendantNormalized)
- Normalization strips: et al., d/b/a, aka, leading articles (The, A), corporate suffixes (Inc., LLC, Corp.)
- All four fields optional (consistent with Phase 5 approach)

### Claude's Discretion: Output normalization
- Whitespace normalization approach
- Casing in normalized fields (lowercase vs preserved)
- Comma-based name reordering (legal names may not follow last,first convention)

</decisions>

<specifics>
## Specific Ideas

- Raw fields preserve exactly what was found in the case name text — no modification
- Normalized fields are optimized for matching (supra resolution, user search)
- The dual raw+normalized pattern matches Phase 5-6's approach of backward-compatible base fields with opt-in enrichment
- Government entities (People, Commonwealth, State, United States) are plaintiffs, not procedural prefixes — they're adversarial parties

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-party-name-extraction*
*Context gathered: 2026-02-05*
