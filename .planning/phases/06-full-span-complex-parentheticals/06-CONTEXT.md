# Phase 6: Full Span & Complex Parentheticals - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract full citation boundaries (case name through closing parenthetical, including subsequent history) and parse complex parentheticals containing court, month/day dates, and disposition info. The existing `span` field (citation core) remains unchanged for backward compatibility. `fullSpan` is purely additive.

Party name splitting (plaintiff/defendant) belongs in Phase 7. This phase extracts the raw `caseName` string and calculates `fullSpan` boundaries.

</domain>

<decisions>
## Implementation Decisions

### Case name extraction
- Detect procedural prefixes ("In re", "Ex parte", "Matter of") as special patterns — store as caseName without requiring "v." separator
- Backward search strategy, boundary heuristics, and handling of missing case names: Claude's discretion
- Multi-citation context (how to separate names when citations appear close together): Claude's discretion
- Ambiguous name boundaries (e.g., "The State of New York v. Smith"): Claude's discretion on heuristic
- Whether case name extraction happens in Phase 6 or is partially deferred to Phase 7: Claude's discretion (recommend Phase 6 extracts caseName string, Phase 7 splits it)

### Full span boundaries
- fullSpan MUST include subsequent history (e.g., "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991)" — fullSpan covers entire string)
- When no parenthetical exists, where fullSpan ends: Claude's discretion
- Whether fullSpan requires case name, parenthetical, or just case name: Claude's discretion
- Existing `span` field: Claude's discretion on whether minor adjustments are warranted (prefer frozen)

### Date parsing
- Support ALL THREE date formats: abbreviated months (Jan. 15, 2020), full months (January 15, 2020), and numeric (1/15/2020)
- Provide BOTH ISO string format AND parsed object: date.iso = "2020-01-15" + date.parsed = { year, month, day }
- Year-only parentheticals: structured date should populate { year: 2020, month: undefined, day: undefined } for consistency
- Numeric dates: default to US format (month/day/year), but allow callers to specify an override option for international format

### Parenthetical structure
- Build a UNIFIED parenthetical parser — replace existing year-only logic with a single parser that handles all cases (year-only, court+year, court+full-date, etc.)
- Capture chained parentheticals like "(2d Cir. 1990) (en banc)" or "(per curiam)"
- Add new `disposition?: string` field for "en banc", "per curiam", etc. — separate from court/date
- Detect explanatory parentheticals like "(holding that...)" or "(quoting Smith)" — flag their existence but defer content parsing to a future phase
- Weight of authority signals (cert. denied, rev'd, aff'd, overruled): Claude's discretion on whether to extract into a field or just include in fullSpan
- Court vs date splitting strategy: Claude's discretion

### Claude's Discretion
- Backward search strategy for case names (sentence boundary, character limit, or other heuristic)
- What to do when no case name is found (leave undefined, lower confidence, or both)
- Parsing strategy for splitting court from date within parentheticals
- Whether explanatory parenthetical flag needs a new field or reuses existing structure
- Whether subsequent history signals (aff'd, rev'd) get their own field

</decisions>

<specifics>
## Specific Ideas

- User wants fullSpan to be comprehensive — include subsequent history, not just stop at first closing paren
- Unified parenthetical parser preferred over incremental additions — one code path for all parenthetical formats
- US date format is the default for this US legal citation library, but the API should accept an option to override for international use
- Disposition info (en banc, per curiam) should be a dedicated field, not mixed into court or parenthetical text

</specifics>

<deferred>
## Deferred Ideas

- Explanatory parenthetical content extraction (e.g., parsing "holding that..." text) — future phase
- Full weight of authority taxonomy — could be its own feature
- International date format support — configurable option, implementation deferred if complex

</deferred>

---

*Phase: 06-full-span-complex-parentheticals*
*Context gathered: 2026-02-05*
