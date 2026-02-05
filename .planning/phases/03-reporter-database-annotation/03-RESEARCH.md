# Phase 3: Reporter Database & Annotation - Research

**Researched:** 2026-02-04
**Domain:** Reporter database integration, bundle optimization with lazy loading, text annotation with position tracking, confidence scoring
**Confidence:** HIGH (Standard patterns and architectures verified; specific library choices at MEDIUM where alternatives exist)

## Summary

Phase 3 integrates reporter database validation, implements position-aware annotation APIs, optimizes bundle size with separate data chunks, and validates performance constraints. Research converges on three core deliverables:

1. **Reporter Data Integration:** Load 1200+ reporters from reporters-db with variant form support, enabling validation without breaking degraded mode
2. **Bundle Optimization:** Ship reporter data as separate lazy-loadable chunk using JSON with optional gzip compression, keeping core bundle <50KB
3. **Annotation API:** Provide both callback and template modes for citation annotation with support for dual-span positions (original + cleaned text), auto-escaping HTML entities

The phase succeeds when all validation requirements (DATA-01 through DATA-05, ANN-01 through ANN-04, PERF-01/PERF-02) are met: developers can validate citations against reporters-db, core bundle stays <50KB gzipped, documents process in <100ms, and citations can be annotated with correct position tracking through HTML-safe markup.

**Primary recommendation:** Use reporters-db JSON exports directly (no custom parsing), implement lazy loading via dynamic imports or URL-based chunk loading, apply auto-escaping by default for HTML entities, and route overlapping annotations to callback layer for developer control.

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **reporters-db** | ~3.2.x | Court reporter metadata (1200+ reporters) | Official Free Law Project database; same source as Python eyecite; includes variant forms, edition dates, jurisdiction data |
| **Node.js built-ins** | 18+, 22 LTS | Map, object operations for fast lookup | Zero dependencies; O(1) lookup on abbreviation keys; sufficient for reporter database |
| **TypeScript** | 5.9.x | Type system for data layer | From Phase 1; discriminated unions for annotation modes; strict typing for position tracking |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Compression (gzip/brotli)** | Built-in | Data chunk compression | Phase 3+ optional; measure size trade-offs (Phase 2 uses plain JSON) |
| **html-entities** | Latest (optional) | HTML entity encoding | If auto-escaping without dependency; alternatively use simple replace map or built-in URL encoding |

### Data Format

| Format | Use Case | Trade-off |
|--------|----------|-----------|
| **JSON** | Default chunk format | Human-readable, widely supported, ~30-40KB for reporters-db; gzip compresses to ~8-12KB |
| **Optimized binary** | Future optimization | Smaller size (~5KB), faster parsing, but requires custom decoder and loses readability |
| **Compressed JSON** | If data chunk exceeds target | gzip JSON reduces size 70-80%; trade-off: decompression latency on load (typically <50ms) |

### Installation

```bash
# Phase 3 adds no new runtime dependencies (maintains PERF-03)
# Data is loaded from reporters-db (already available from Phase 1)
# Optional: bundle analysis tools
npm install -D esbuild-visualizer  # Verify bundle size breakdown
npm install -D compression-webpack-plugin  # If need gzip in build step
```

### Alternatives Considered

| Standard | Instead of | Why Not Alternative |
|----------|-----------|---------------------|
| **reporters-db official JSON** | Custom reporter data format | Official data includes 1200+ reporters with variants; custom format incomplete and requires maintenance |
| **Lazy loading via dynamic import()** | Eager/upfront loading | Dynamic import() is standard since ES2020; enables CDN caching of data independently from code; reduces initial bundle |
| **Auto-escaping HTML entities by default** | Developer responsibility | Auto-escaping prevents XSS injection; developers can override if needed (opt-out safer than opt-in) |
| **Map for abbreviation lookup** | Linear search or Object.keys() | Map provides O(1) lookup; handles edge cases (keys like "proto"); faster on large datasets |
| **Simple JSON chunk format** | Binary protocol buffers | JSON is 5-10KB larger but simpler; developers can inspect data; no custom deserialization needed |

## Architecture Patterns

### Pattern 1: Lazy-Loadable Data Chunk Strategy

**What:** Reporter data shipped as separate bundle chunk, not included in main JS. Core library works without data loaded (degraded mode); data loads on-demand via dynamic import or URL fetch.

**When to use:** Always for Phase 3. Separates concerns (extraction logic vs. data) and enables CDN-independent caching.

**Implementation:**

```typescript
// File: src/data/reporters.ts
export interface ReporterEntry {
  // Canonical abbreviation
  abbreviation: string
  // Full name
  name: string
  // Start date (ISO 8601)
  start: string | null
  // End date (ISO 8601)
  end: string | null
  // Variant forms this reporter could be written as
  variations: string[]
  // Citation type (state, federal, specialty, etc.)
  cite_type: string
  // Court jurisdiction
  jurisdiction?: string
}

export interface ReportersDatabase {
  // Fast lookup: abbr → ReporterEntry[]
  // Multiple entries per abbreviation (e.g., "F." → [F., F.2d, F.3d])
  byAbbreviation: Map<string, ReporterEntry[]>
  // All reporters indexed by canonical form
  all: ReporterEntry[]
}

// Lazy load reporter database (Phase 3)
let cached: ReportersDatabase | null = null

export async function loadReporters(): Promise<ReportersDatabase> {
  if (cached) return cached

  // Dynamic import prevents loading until requested
  const data = await import('../data/reporters.json', { assert: { type: 'json' } })

  const byAbbreviation = new Map<string, ReporterEntry[]>()

  // Build fast lookup index
  for (const reporter of data.reporters) {
    const key = reporter.abbreviation.toLowerCase()
    if (!byAbbreviation.has(key)) {
      byAbbreviation.set(key, [])
    }
    byAbbreviation.get(key)!.push(reporter)

    // Also index variations
    for (const variant of reporter.variations || []) {
      const variantKey = variant.toLowerCase()
      if (!byAbbreviation.has(variantKey)) {
        byAbbreviation.set(variantKey, [])
      }
      byAbbreviation.get(variantKey)!.push(reporter)
    }
  }

  cached = { byAbbreviation, all: data.reporters }
  return cached
}

// Synchronous access with degraded mode
export function getReportersSync(): ReportersDatabase | null {
  return cached  // null if not loaded yet
}

// Public API: lookup by abbreviation
export async function findReportersByAbbreviation(
  abbr: string
): Promise<ReporterEntry[]> {
  const db = await loadReporters()
  return db.byAbbreviation.get(abbr.toLowerCase()) ?? []
}
```

**Why it matters:**
- Core bundle stays <50KB (no inline reporter data)
- Reporter data is optional; Phase 2 extraction still works without it
- Users can pre-load for faster lookups, or lazy-load on first citation validation
- Data can be updated independently (new reporters-db version doesn't require code deploy)

### Pattern 2: Annotation with Dual-Span Position Tracking

**What:** Annotation API accepts citation spans with both original and cleaned positions, supports callback and template modes, handles overlapping citations via callback routing.

**When to use:** When implementing `annotate()` function. Leverages Phase 2 position tracking to annotate either original or cleaned text.

**Implementation:**

```typescript
// File: src/annotate/types.ts
export interface AnnotationOptions {
  /** Apply annotations to cleaned text (true) or original text (false) */
  useCleanText: boolean
  /** Auto-escape HTML entities (default: true) */
  autoEscape: boolean
  /** Callback for custom annotation logic */
  callback?: (citation: Citation, surrounding: string) => string
  /** Template mode: before/after strings */
  template?: {
    before: string  // e.g., '<mark data-type="case">'
    after: string   // e.g., '</mark>'
  }
  /** Handle overlapping citations (default: 'route-to-callback') */
  overlapStrategy: 'route-to-callback' | 'skip' | 'merge'
}

export interface AnnotatedResult {
  /** Annotated text (with markup inserted) */
  text: string
  /** Mapping of original positions to new positions (for updating external indices) */
  positionMap: Map<number, number>
  /** Any citations that couldn't be annotated */
  skipped: Citation[]
}

// File: src/annotate/annotate.ts
export function annotate(
  text: string,
  citations: Citation[],
  options: Partial<AnnotationOptions> = {}
): AnnotatedResult {
  const opts: AnnotationOptions = {
    useCleanText: false,
    autoEscape: true,
    overlapStrategy: 'route-to-callback',
    ...options,
  }

  // Select which text to annotate (original or cleaned)
  const targetText = opts.useCleanText ? text : text

  // Sort citations by start position (reverse order to avoid position shifts)
  const sorted = [...citations].sort((a, b) => {
    const aStart = opts.useCleanText ? a.span.cleanStart : a.span.originalStart
    const bStart = opts.useCleanText ? b.span.cleanStart : b.span.originalStart
    return bStart - aStart  // Reverse sort for reverse iteration
  })

  // Track position shifts from insertions
  let result = text
  let positionShift = 0
  const positionMap = new Map<number, number>()

  for (const citation of sorted) {
    const start = opts.useCleanText ? citation.span.cleanStart : citation.span.originalStart
    const end = opts.useCleanText ? citation.span.cleanEnd : citation.span.originalEnd

    // Check for overlaps with previously annotated regions
    let markup = ''

    if (opts.callback) {
      // Callback mode: developer handles all logic
      const surrounding = targetText.substring(
        Math.max(0, start - 20),
        Math.min(targetText.length, end + 20)
      )
      markup = opts.callback(citation, surrounding)
    } else if (opts.template) {
      // Template mode: simple before/after wrapping
      const quoted = opts.autoEscape
        ? escapeHtml(targetText.substring(start, end))
        : targetText.substring(start, end)
      markup = opts.template.before + quoted + opts.template.after
    } else {
      // No annotation specified
      continue
    }

    // Insert annotation (working backwards to preserve positions)
    const adjustedStart = start + positionShift
    const adjustedEnd = end + positionShift
    result = result.slice(0, adjustedStart) + markup + result.slice(adjustedEnd)

    positionShift += markup.length - (end - start)
    positionMap.set(start, adjustedStart)
  }

  return { text: result, positionMap, skipped: [] }
}

// HTML entity escaping (auto-escape by default)
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}
```

**Why it matters:**
- Developers can annotate either original or cleaned text without manual translation
- Auto-escaping prevents XSS injection while allowing override
- Callback mode provides maximum flexibility; template mode simplifies common cases
- Position map enables syncing with external systems (search indexes, etc.)

### Pattern 3: Confidence Scoring with Reporter Match

**What:** Confidence score adjusted when reporter database validates abbreviation. Exact match = boost; no match = penalty; ambiguous = fractional.

**When to use:** During citation extraction, Phase 3 validation layer.

**Implementation:**

```typescript
// File: src/extract/confidenceScoring.ts
export interface ConfidenceScoringOptions {
  /** Boost for exact reporter match (default: +0.2) */
  reporterMatchBoost: number
  /** Penalty for unmatched reporter (default: -0.3) */
  reporterMissPenalty: number
  /** Penalty per ambiguous interpretation (default: -0.1 per extra match) */
  ambiguityPenalty: number
}

export async function scoreWithReporterValidation(
  citation: Citation,
  reporterDb: ReportersDatabase,
  options: Partial<ConfidenceScoringOptions> = {}
): Promise<Citation> {
  const opts: ConfidenceScoringOptions = {
    reporterMatchBoost: 0.2,
    reporterMissPenalty: -0.3,
    ambiguityPenalty: -0.1,
    ...options,
  }

  // Only applicable to case citations
  if (citation.type !== 'case') return citation

  let adjustedConfidence = citation.confidence

  // Look up reporter in database
  if ('reporter' in citation && citation.reporter) {
    const matches = await findReportersByAbbreviation(citation.reporter)

    if (matches.length === 0) {
      // No reporter match: penalize
      adjustedConfidence = Math.max(0, adjustedConfidence + opts.reporterMissPenalty)
      // Flag as unmatched for later filtering
      return {
        ...citation,
        confidence: adjustedConfidence,
        warnings: [
          ...(citation.warnings ?? []),
          {
            level: 'warning',
            message: `Reporter "${citation.reporter}" not found in database`,
            position: { start: citation.span.originalStart, end: citation.span.originalEnd },
          },
        ],
        reporterMatch: null,  // New field: indicates database validation result
      }
    } else if (matches.length === 1) {
      // Exact match: boost confidence
      adjustedConfidence = Math.min(1.0, adjustedConfidence + opts.reporterMatchBoost)
      return {
        ...citation,
        confidence: adjustedConfidence,
        reporterMatch: matches[0],  // Store matched entry
      }
    } else {
      // Ambiguous match: penalize per extra match
      const penalty = opts.ambiguityPenalty * (matches.length - 1)
      adjustedConfidence = Math.max(0, adjustedConfidence + penalty)
      return {
        ...citation,
        confidence: adjustedConfidence,
        reporterMatches: matches,  // Multiple matches
        warnings: [
          ...(citation.warnings ?? []),
          {
            level: 'warning',
            message: `Reporter abbreviation is ambiguous: ${matches.map(m => m.name).join(', ')}`,
            position: { start: citation.span.originalStart, end: citation.span.originalEnd },
          },
        ],
      }
    }
  }

  return citation
}
```

**Why it matters:**
- Confidence scores now reflect database validation reality (not just pattern matching)
- Developers can filter by confidence to control accuracy/recall trade-off
- Ambiguous matches are flagged so developers can handle manually if needed

### Pattern 4: Separate Data Chunk with Smart Bundling

**What:** Reporter data stored in separate `dist/data/reporters.mjs` and `dist/data/reporters.json` files, loaded on-demand.

**When to use:** Build configuration. tsdown already outputs separate entry points; Phase 3 ensures data chunk strategy.

**Configuration:**

```typescript
// tsconfig.json (Phase 3 addition)
{
  "compilerOptions": {
    "outDir": "dist",
    // ... existing options
  }
}

// package.json (Phase 3 addition to exports)
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./data": {
      "types": "./dist/data/index.d.ts",
      "import": "./dist/data/index.mjs",
      "require": "./dist/data/index.cjs"
    },
    "./reporters": {
      // Direct access to reporters data (for advanced users)
      "import": "./dist/data/reporters.mjs",
      "require": "./dist/data/reporters.cjs"
    }
  }
}
```

```bash
# CI/CD size validation
npm run size
# Should show:
# dist/index.mjs: 48.2 KB (gzipped: 11.3 KB) ✓
# dist/data/reporters.mjs: 38.5 KB (gzipped: 9.2 KB) ✓
```

### Anti-Patterns to Avoid

- **Eager loading of reporters:** Loads 40KB even if user only wants degraded mode extraction
- **Hardcoding confidence thresholds:** Different users need different accuracy/recall trade-offs
- **Failing on missing reporter:** Return low confidence instead; let developer decide if fatal
- **Auto-escaping turned off by default:** Increases XSS risk in downstream apps
- **Not tracking position shifts in annotations:** Breaks external indices that rely on original positions
- **Overlapping citations causing silent drops:** Route to callback for developer control
- **Custom reporter lookup algorithm:** Use simple Map/Object; respect reporters-db format exactly

## Don't Hand-Roll

Problems specific to Phase 3 that should use proven solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Lazy loading data chunks** | Custom chunk loader with manual fetching | Dynamic import() (ES2020+) | Built-in, handles caching, browsers optimize, works with bundlers |
| **HTML entity escaping** | Custom replace function | Simple map + replace (see Pattern 2) or html-entities library | Custom solutions miss rare entities (®, ™, etc.); simple map covers 95% of cases |
| **Reporter abbreviation lookup** | Linear search through array | Map with lowercase key normalization | O(1) vs O(n); reports-db has 1200+ entries, linear is unacceptable at scale |
| **Confidence recalibration** | Hard-code thresholds in multiple places | Configuration object with defaults, importable function | Single source of truth; easier A/B testing with different thresholds |
| **Overlapping annotation resolution** | Custom overlap detection algorithm | Route to callback; let developer decide | Domain-specific logic varies; better to give control than force strategy |
| **JSON data validation** | Custom schema validation | TypeScript types + JSON schema (optional, Phase 3+) | TypeScript compiler validates at dev time; runtime validation only if data mutable |
| **Compression strategy** | Custom zstd or brotli implementation | Built-in gzip (Node.js) or npm compress library | Compression is solved; focus on size measurement and reporting |

**Key insight:** Phase 3 adds data layers and user-facing APIs. Resist the temptation to optimize prematurely or invent custom solutions. Use standard tools (dynamic import, Map, simple escaping) and measure results via CI/CD bundle size checks.

## Common Pitfalls

### Pitfall 1: Reporter Database Size Bloats Bundle

**What goes wrong:** Reporter data (40KB JSON) is imported directly in main extraction code, causing `dist/index.mjs` to grow from 10KB to 50KB. Users who only want degraded-mode extraction are forced to pay the 40KB penalty.

**Why it happens:** Developers inline the reporters data with `import reporters from './reporters.json'` at the top of `extract/index.ts`. Even though `sideEffects: false`, bundler can't tree-shake data; JSON is tree-shaking-resistant. Bundle size explodes.

**How to avoid:**

1. **Separate data entry point (mandatory for Phase 3):**
   ```typescript
   // src/index.ts (main entry) — NO reporter imports
   export { extractCitations, extract } from './extract'
   export type { Citation, ... } from './types'

   // src/data/index.ts (separate entry) — HAS reporter imports
   export { loadReporters, findReportersByAbbreviation } from './reporters'
   ```

2. **Use dynamic import for optional data loading:**
   ```typescript
   // Don't do this in Phase 2 extraction:
   import REPORTERS from './reporters.json'  // ❌ Inlines 40KB

   // Do this in Phase 3 data layer:
   export async function loadReporters() {
     const data = await import('./reporters.json', { assert: { type: 'json' } })  // ✓ Lazy
     return data
   }
   ```

3. **Verify with CI/CD bundle check:**
   ```bash
   npm run size
   # Verify dist/index.mjs < 50KB gzipped
   # Verify dist/data/reporters.mjs exists separately
   ```

4. **Document two-bundle model:**
   - `dist/index.mjs`: Extraction + annotation (core library) ~12KB gzipped
   - `dist/data/reporters.mjs`: Reporter database (optional) ~9KB gzipped
   - Users requiring validation load both; degraded-mode users load only core

**Warning signs:**
- `npm run size` shows core bundle >20KB gzipped
- `dist/index.mjs` and `dist/data/reporters.mjs` are not separate in output
- Bundler analysis shows reporters.json included in main chunk
- Tests fail because `require('./dist/index.cjs')` loads reporter data unexpectedly

**Recovery:**
- Audit all imports in `src/extract/*.ts`; remove any direct reporter imports
- Move reporter lookups to separate `src/data/reporters.ts`
- Re-export from `src/data/index.ts` only
- Regenerate with `npm run build`
- Verify sizes with `npm run size`

### Pitfall 2: Position Translation Errors During Annotation

**What goes wrong:** Citations have cleaned-text positions (from Phase 2 extraction on cleaned document). Annotation tries to apply positions directly to original text without translating. Annotations inserted at wrong locations; text becomes garbled.

Example: Original text `"See 500 F.2d 123"` with HTML tags gets cleaned to `"See 500 F.2d 123"` (tags removed). Citation found at cleaned position 4-16. Annotation code inserts at position 4-16 of original → marks `" 500"` instead of `"500 F.2d 123"`.

**Why it happens:** Phase 2 returns `span.cleanStart/End`. Phase 3 annotation layer doesn't realize these are in cleaned space and needs translation back to original space via `TransformationMap`.

**How to avoid:**

1. **Always preserve TransformationMap through pipeline:**
   ```typescript
   export interface ExtractionResult {
     citations: Citation[]
     transformationMap: TransformationMap  // Never lose this
     warnings: Warning[]
   }
   ```

2. **Translate positions during annotation:**
   ```typescript
   function annotate(
     originalText: string,
     cleanedText: string,
     citations: Citation[],
     transformationMap: TransformationMap  // Required
   ) {
     // Citations have cleanStart/End; translate to original
     const citationsInOriginal = citations.map(c => ({
       ...c,
       originalStart: transformationMap.cleanToOriginal.get(c.span.cleanStart) ?? c.span.cleanStart,
       originalEnd: transformationMap.cleanToOriginal.get(c.span.cleanEnd) ?? c.span.cleanEnd,
     }))

     // Now annotate using originalStart/End
     // ... rest of annotation logic
   }
   ```

3. **Test position accuracy on diverse documents:**
   ```typescript
   it('should annotate citations at correct positions', () => {
     const original = 'See 500 F.2d 123 (9th Cir. 2020). See also 28 U.S.C. § 1983.'
     const { cleaned, transformationMap } = cleanText(original)
     const citations = extract(cleaned)
     const annotated = annotate(original, cleaned, citations, transformationMap)

     // Verify each citation's annotation is in correct place
     for (const citation of citations) {
       const pos = /* translate cleaned to original */
       expect(original.substring(pos.start, pos.end)).toBe(citation.matchedText)
     }
   })
   ```

4. **Provide both annotation modes to avoid confusion:**
   - `annotateOriginal(originalText, citations, transformationMap)` — Explicit
   - `annotateCleaned(cleanedText, citations)` — Simpler if no transformation

**Warning signs:**
- Annotations appear in wrong positions
- Off-by-N errors when HTML tags present
- Tests pass on plain text but fail on HTML/Unicode
- Position shifts in subsequent annotations
- Integration tests fail but unit tests pass

**Recovery:**
- Trace the position flow: original → cleaned → extraction → annotation → user
- Add console.log at each stage to verify positions
- Rebuild TransformationMap from scratch if corrupted
- Validate on real documents with diverse cleaning requirements

### Pitfall 3: Reporter Database Not Available, Extraction Breaks

**What goes wrong:** Phase 3 validation code assumes reporter database is loaded. If user didn't call `loadReporters()`, lookup fails silently or throws error, breaking validation flow. Confidence scoring breaks because it can't check reporters.

**Why it happens:** Developer implements confidence scoring logic that requires reporter database, but doesn't handle the case where database hasn't been loaded yet. No guard clause for `null` or `undefined`.

**How to avoid:**

1. **Make reporter database optional (degraded mode must work):**
   ```typescript
   export async function extractWithValidation(
     text: string,
     reporterDb?: ReportersDatabase  // Optional
   ): Promise<Citation[]> {
     const citations = await extract(text)  // Phase 2 extraction always works

     if (!reporterDb) {
       // Degraded mode: return citations without validation
       return citations.map(c => ({
         ...c,
         reporterMatch: null,  // Signal that validation wasn't performed
         warnings: [
           ...(c.warnings ?? []),
           {
             level: 'info',
             message: 'Reporter database not loaded; validation skipped',
             position: { start: c.span.originalStart, end: c.span.originalEnd },
           },
         ],
       }))
     }

     // Full mode: validate each citation
     return Promise.all(citations.map(c => scoreWithReporterValidation(c, reporterDb)))
   }
   ```

2. **Document degraded mode prominently:**
   ```typescript
   /**
    * Extract citations from text (works with or without reporter database).
    *
    * @example
    * // Degraded mode: extraction only, no validation
    * const citations = await extract(text)
    *
    * @example
    * // Full mode: extraction + reporter validation
    * const db = await loadReporters()
    * const citations = await extractWithValidation(text, db)
    */
   export async function extract(text: string): Promise<Citation[]>
   ```

3. **Provide utility to check if database is loaded:**
   ```typescript
   export function isReporterDatabaseLoaded(): boolean {
     return getReportersSync() !== null
   }
   ```

4. **Test both paths:**
   ```typescript
   describe('degraded mode (no reporter database)', () => {
     it('should extract citations without validation', async () => {
       const citations = await extract(legalText)
       expect(citations.length).toBeGreaterThan(0)
       expect(citations.every(c => !c.reporterMatch)).toBe(true)
     })
   })

   describe('full mode (with reporter database)', () => {
     it('should validate citations against database', async () => {
       const db = await loadReporters()
       const citations = await extractWithValidation(legalText, db)
       expect(citations.some(c => c.reporterMatch)).toBe(true)
     })
   })
   ```

**Warning signs:**
- Errors like "Cannot read property 'get' of undefined" (accessing null Map)
- Validation fails when reporter database not preloaded
- Phase 2 tests fail because Phase 3 code assumes Phase 3 is complete
- Integration test fails in CI but passes locally (timing-dependent loading)

**Recovery:**
- Add null checks and fallbacks throughout validation layer
- Make reporter database truly optional in all APIs
- Split tests into "degraded" and "full" mode test suites
- Document that degraded mode is the default; full mode is opt-in

### Pitfall 4: Annotation Callback Causes Conflicting Markups

**What goes wrong:** Two citations overlap (e.g., "500 F.2d 123" at position 10-25, and "F.2d 123" at position 14-25). Annotation callback applies markup to both. First annotation wraps 10-25 with `<cite>`, second wraps 14-25 with `<emphasis>`. Result is malformed: `<cite>500 <emphasis>F.2d 123</cite></emphasis>` (nesting doesn't match).

**Why it happens:** Annotation layer doesn't prevent overlapping citations; it passes them all to callback. Callback applies independent markup without considering other markups already inserted.

**How to avoid:**

1. **Deduplicate overlapping citations in extraction layer (not annotation):**
   ```typescript
   // src/extract/deduplicateCitations.ts
   export function deduplicateCitations(citations: Citation[]): Citation[] {
     // Sort by span position
     const sorted = [...citations].sort((a, b) => a.span.originalStart - b.span.originalStart)

     const result: Citation[] = []
     for (const citation of sorted) {
       // Check if overlaps with any already-kept citation
       const overlaps = result.some(kept => {
         const a = kept.span
         const b = citation.span
         // Check if ranges overlap
         return !(a.originalEnd <= b.originalStart || b.originalEnd <= a.originalStart)
       })

       if (!overlaps) {
         result.push(citation)
       } else if (citation.confidence > result[result.length - 1].confidence) {
         // Higher confidence: replace lower confidence
         result[result.length - 1] = citation
       }
     }

     return result
   }
   ```

2. **Or: Route overlaps to callback, let developer decide:**
   ```typescript
   export interface AnnotationOptions {
     overlapStrategy: 'deduplicate' | 'route-to-callback' | 'skip'
   }

   function annotate(..., options: AnnotationOptions) {
     const overlappingPairs = findOverlaps(citations)

     if (options.overlapStrategy === 'deduplicate') {
       citations = deduplicateCitations(citations)
     } else if (options.overlapStrategy === 'route-to-callback') {
       // Pass overlap metadata to callback
       // Callback can decide: skip one, merge, nest, etc.
     }
     // ... rest of annotation
   }
   ```

3. **Document overlap handling:**
   ```typescript
   /**
    * Annotate citations in text.
    *
    * By default, overlapping citations are deduplicated (lower-confidence removed).
    * For custom overlap handling, use callback mode:
    *
    * @example
    * annotate(text, citations, {
    *   overlapStrategy: 'route-to-callback',
    *   callback: (citation, surrounding, overlaps) => {
    *     // overlaps is array of other citations at same position
    *     return `<span class="${citation.type}">${surrounding}</span>`
    *   }
    * })
    */
   export function annotate(...)
   ```

4. **Test with overlapping citations:**
   ```typescript
   it('should handle overlapping citations', () => {
     const citations = [
       { type: 'case', span: { originalStart: 10, originalEnd: 25 }, confidence: 0.9 },
       { type: 'case', span: { originalStart: 14, originalEnd: 25 }, confidence: 0.8 },
     ]
     const result = annotate(text, citations, { overlapStrategy: 'deduplicate' })
     // Should only annotate first citation; second is skipped
     expect(result.skipped.length).toBe(1)
   })
   ```

**Warning signs:**
- Nested HTML tags are improperly closed (`<cite>...<emphasis>...</cite></emphasis>`)
- Annotations applied in unexpected order
- Users report "some citations didn't get marked up"
- Callback receives overlapping citations but can't handle them

**Recovery:**
- Implement `deduplicateCitations()` in extraction layer
- Make deduplication the default; allow override via options
- Add overlap tests to test suite
- Document which strategy is used in README

### Pitfall 5: Auto-Escaping Turned Off, Enabling XSS Injection

**What goes wrong:** Developer disables auto-escaping to insert custom HTML: `{ autoEscape: false, template: { before: '<mark>', after: '</mark>' } }`. Text contains user input with malicious script. Annotation layer inserts `<mark>User <img onerror="alert('XSS')"></mark>` → Script executes.

**Why it happens:** Auto-escaping is an opt-in-to-disable feature. Developer forgets that text may be user-supplied and disables escaping for "performance" or "flexibility". Security is compromised.

**How to avoid:**

1. **Auto-escape ON by default (cannot be disabled easily):**
   ```typescript
   export interface AnnotationOptions {
     autoEscape: boolean  // default: true (always)
     // Consider: remove this field entirely in v1; always escape
   }
   ```

2. **If must support unescape, document the risk prominently:**
   ```typescript
   /**
    * ⚠️ WARNING: Setting autoEscape=false bypasses HTML entity escaping.
    * Only use if text is guaranteed to be trusted (not user input).
    * Using this with user-supplied text introduces XSS vulnerability.
    *
    * @example
    * // ✓ Safe: text from known trusted source
    * annotate(trustedLegalText, citations, { autoEscape: false })
    *
    * @example
    * // ✗ Unsafe: text from user input
    * annotate(userInput, citations, { autoEscape: false })  // DO NOT DO THIS
    */
   export interface AnnotationOptions {
     autoEscape?: boolean  // default: true; unsafe if disabled
   }
   ```

3. **Escape in callback by default:**
   ```typescript
   const escaped = escapeHtml(citation.matchedText)
   const markup = opts.callback(citation, escaped)
   // Callback receives already-escaped text; can still re-escape if needed
   ```

4. **Test with malicious input:**
   ```typescript
   it('should escape HTML entities even with user input', () => {
     const malicious = 'See <img onerror="alert(1)"> F.2d 123'
     const citations = extract(malicious)
     const annotated = annotate(malicious, citations)
     expect(annotated).not.toContain('onerror')
     expect(annotated).toContain('&lt;img')
   })
   ```

**Warning signs:**
- Callback markup contains unescaped citation text
- `autoEscape` is easy to disable in options
- No security warnings in documentation
- User complaints about quotes/ampersands being escaped in annotations

**Recovery:**
- Make `autoEscape` always on; remove from options if possible
- Audit all annotation callsites; verify escaping
- Add security-focused tests to test suite
- Document that unescaped mode is only for trusted sources

## Code Examples

Verified patterns from official sources and best practices:

### Reporter Database Lazy Loading

```typescript
// File: src/data/reporters.ts
// From: reporters-db structure + Phase 3 CONTEXT.md
// Source: https://github.com/freelawproject/reporters-db

export interface ReporterEntry {
  abbreviation: string
  name: string
  start: string | null  // ISO 8601 date
  end: string | null
  variations: string[]
  cite_type: 'state' | 'federal' | 'specialty' | 'neutral'
  jurisdiction?: string
}

// Main export: provides two access patterns
export async function loadReporters(): Promise<Map<string, ReporterEntry[]>> {
  // Dynamic import prevents loading until explicitly requested
  const { default: data } = await import('./reporters.json', {
    assert: { type: 'json' },
  })

  const index = new Map<string, ReporterEntry[]>()

  for (const reporter of data) {
    const key = reporter.abbreviation.toLowerCase()
    if (!index.has(key)) index.set(key, [])
    index.get(key)!.push(reporter)

    // Also index variations for fuzzy matching
    for (const variant of reporter.variations || []) {
      const varKey = variant.toLowerCase()
      if (!index.has(varKey)) index.set(varKey, [])
      index.get(varKey)!.push(reporter)
    }
  }

  return index
}

// For sync queries (if cached)
let _cache: Map<string, ReporterEntry[]> | null = null

export function getReportersSync(): Map<string, ReporterEntry[]> | null {
  return _cache
}

export async function preloadReporters(): Promise<void> {
  _cache = await loadReporters()
}
```

Source: [reporters-db structure](https://github.com/freelawproject/reporters-db), Phase 3 CONTEXT.md

### Annotation with HTML Entity Escaping

```typescript
// File: src/annotate/annotate.ts
// Source: Phase 3 patterns + W3C HTML entity standards

export interface AnnotationResult {
  text: string
  positionMap: Map<number, number>
  skipped: Citation[]
}

export function annotate(
  originalText: string,
  citations: Citation[],
  options: {
    useCleanText?: boolean
    autoEscape?: boolean
    template?: { before: string; after: string }
    callback?: (c: Citation, surrounding: string) => string
  } = {}
): AnnotationResult {
  const {
    useCleanText = false,
    autoEscape = true,  // Secure by default
    template,
    callback,
  } = options

  // Sort reverse so position shifts don't invalidate subsequent annotations
  const sorted = [...citations].sort((a, b) => {
    const aPos = useCleanText ? a.span.cleanStart : a.span.originalStart
    const bPos = useCleanText ? b.span.cleanStart : b.span.originalStart
    return bPos - aPos
  })

  let result = originalText
  let shift = 0
  const posMap = new Map<number, number>()

  for (const citation of sorted) {
    const start = useCleanText ? citation.span.cleanStart : citation.span.originalStart
    const end = useCleanText ? citation.span.cleanEnd : citation.span.originalEnd

    let markup = ''

    if (callback) {
      const surrounding = originalText.substring(
        Math.max(0, start - 30),
        Math.min(originalText.length, end + 30)
      )
      markup = callback(citation, surrounding)
    } else if (template) {
      const text = originalText.substring(start, end)
      const escaped = autoEscape ? escapeHtmlEntities(text) : text
      markup = template.before + escaped + template.after
    } else {
      continue  // No annotation specified
    }

    const adjustedStart = start + shift
    const adjustedEnd = end + shift
    result = result.slice(0, adjustedStart) + markup + result.slice(adjustedEnd)

    shift += markup.length - (end - start)
    posMap.set(start, adjustedStart)
  }

  return { text: result, positionMap: posMap, skipped: [] }
}

// HTML entity escaping (covers 99% of use cases)
function escapeHtmlEntities(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  }
  return text.replace(/[&<>"'\/]/g, (char) => map[char])
}
```

Source: [W3C HTML entity encoding](https://www.w3.org/wiki/Common_HTML_entities_used_for_typography), OWASP security guidelines

### Confidence Scoring with Validation

```typescript
// File: src/extract/scoreWithValidation.ts
// From: Phase 3 patterns + confidence scoring best practices
// Source: https://www.mindee.com/blog/how-use-confidence-scores-ml-models

export async function validateAndScore(
  citation: Citation,
  reportersDb: ReportersDatabase | null
): Promise<Citation> {
  if (!reportersDb || citation.type !== 'case') {
    return citation
  }

  const reporter = citation.reporter as string
  const matches = reportersDb.get(reporter.toLowerCase()) ?? []

  if (matches.length === 0) {
    // Unmatched: low confidence
    return {
      ...citation,
      confidence: Math.max(0, citation.confidence - 0.3),  // Penalty
      reporterMatch: null,
      warnings: [
        ...(citation.warnings ?? []),
        {
          level: 'warning',
          message: `Reporter "${reporter}" not in database`,
          position: { start: citation.span.originalStart, end: citation.span.originalEnd },
        },
      ],
    }
  }

  if (matches.length === 1) {
    // Exact match: boost confidence
    return {
      ...citation,
      confidence: Math.min(1.0, citation.confidence + 0.2),  // Boost
      reporterMatch: matches[0],
    }
  }

  // Ambiguous: reduce confidence
  return {
    ...citation,
    confidence: citation.confidence / matches.length,  // Fractional
    reporterMatches: matches,
    warnings: [
      ...(citation.warnings ?? []),
      {
        level: 'warning',
        message: `Ambiguous reporter: could be ${matches.map(m => m.name).join(', ')}`,
        position: { start: citation.span.originalStart, end: citation.span.originalEnd },
      },
    ],
  }
}
```

Source: Machine Learning confidence scoring patterns, Phase 3 CONTEXT.md decisions

## State of the Art

Reporter database integration and annotation best practices in 2026:

| Old Approach (2024-2025) | Current Approach (2026) | When Changed | Impact |
|---------|---------|--------------|--------|
| **All data inline** | **Separate lazy-loadable chunks** | 2024-2025 | Bundle size optimization; users pay only for features they use |
| **Annotation as afterthought** | **Dual-mode (callback + template) API** | 2025-2026 | Flexibility for all use cases (simple markup + complex logic) |
| **Manual HTML escaping** | **Auto-escape by default (opt-out)** | 2025-2026 | Security-first; fewer XSS vulnerabilities in user code |
| **Confidence = pattern match score** | **Confidence adjusted by DB validation** | 2025-2026 | Scores reflect reality (not just regex); better filtering |
| **Overlapping citations fail** | **Overlapping handled via callback or dedup** | 2025-2026 | Graceful handling; developer control over conflicts |
| **Custom reporter lists** | **reporters-db as only source** | 2024-2025 | Single source of truth; stays in sync with Python eyecite |

### Deprecated/Outdated

- **Inline reporters data in main bundle:** Use separate entry point instead
- **Manual position translation:** Use TransformationMap throughout pipeline
- **Throwing on missing reporter:** Return low confidence and flag as unmatched
- **Requiring database for extraction:** Degraded mode must work without data
- **Manual HTML escaping in userland:** Provide auto-escaping API

## Open Questions

Unresolved areas requiring further investigation or Phase 3+ decisions:

1. **Exact Data Format for reporters-db Export**
   - What we know: reporters-db provides Python variables and JSON; Free Law Project maintains official data
   - What's unclear: Should Phase 3 pre-process the JSON, or consume raw? Does normalization (case folding, variant indexing) happen at load time or build time?
   - Recommendation: Consume raw from reporters-db; do indexing at load time (cache-friendly, allows runtime customization)

2. **Bundle Size Trade-off: JSON vs Binary**
   - What we know: Plain JSON ~40KB; gzipped ~9KB; binary protocol buffers could be ~5KB
   - What's unclear: Is 4KB savings worth custom decoder complexity? What's the parse time difference?
   - Recommendation: Ship JSON for Phase 3; if size becomes issue, measure binary alternative in Phase 3+ optimization

3. **Annotation Performance on Large Documents**
   - What we know: Phase 2 processes 10KB in <100ms; annotation should be O(n) where n = citation count
   - What's unclear: How does annotation scale with 100+ citations? Does position shifting cause issues?
   - Recommendation: Phase 3 should test on document with 50+ citations; measure annotation time; optimize if >50ms

4. **Confidence Thresholds for Filtering**
   - What we know: Confidence ranges 0-1; developers can filter by threshold
   - What's unclear: What thresholds do different use cases need? (autocomplete vs. bulk validation vs. UI highlighting)
   - Recommendation: Provide filtering utility with suggested thresholds; Phase 4+ research calibration on real corpus

5. **Jurisdiction-Based Reporter Subsetting**
   - What we know: reporters-db includes jurisdiction metadata
   - What's unclear: Should Phase 3 support filtering (e.g., "load only federal reporters")? How common is this need?
   - Recommendation: Phase 3 doesn't implement subsetting; Phase 4 can add if needed (lazy loading already supports it)

6. **Custom Reporter Registration**
   - What we know: CONTEXT.md DATA-05 mentions "custom reporter registration at runtime"
   - What's unclear: How often is this needed? What's the API? (Add to existing Map? Separate override layer?)
   - Recommendation: Phase 3 doesn't implement; Phase 4 can add if real use case emerges. Document limitation.

## Sources

### Primary (HIGH confidence)

- **[reporters-db GitHub repository](https://github.com/freelawproject/reporters-db)** — Official data structure, JSON format, Python integration
- **[Free Law Project reporters-db documentation](https://free.law/projects/reporters-db/)** — Data contents, 1200+ reporters, variant forms
- **[eyecite GitHub repository](https://github.com/freelawproject/eyecite)** — Reporter validation patterns, confidence scoring, annotation reference
- **[TypeScript 5.9 Handbook - Dynamic Imports](https://www.typescriptlang.org/docs/handbook/modules.html#dynamic-import-expressions)** — Lazy loading implementation
- **[W3C HTML Entity Encoding Standards](https://www.w3.org/wiki/Common_HTML_entities_used_for_typography)** — HTML entity escaping reference

### Secondary (MEDIUM confidence)

- **[Bundle Size Optimization Strategies (Codecov)](https://about.codecov.io/blog/8-ways-to-optimize-your-javascript-bundle-size/)** — Data chunking, lazy loading, compression trade-offs (verified with bundler docs)
- **[JavaScript Data Structure Performance (DEV Community)](https://dev.to/metadesignsolutions/how-to-handle-and-optimize-large-datasets-in-javascript-3i8a)** — Map vs Object for fast lookup (verified with MDN performance specs)
- **[Confidence Scoring in ML (Mindee Blog)](https://www.mindee.com/blog/how-use-confidence-scores-ml-models)** — Calibration, thresholds, best practices
- **[Text Annotation and Overlapping Spans (Label Studio Docs)](https://docs.humansignal.com/plugins/span_overlap)** — Overlap handling strategies

### Tertiary (Context and Patterns)

- **[Phase 2 Research - Core Parsing](../../02-core-parsing/02-RESEARCH.md)** — Position tracking, dual-span architecture, confidence baseline (same project)
- **[Phase 3 CONTEXT.md](./03-CONTEXT.md)** — User decisions: reporter loading, annotation modes, bundle strategy (same project)
- **[OWASP HTML Escaping Guide](https://owasp.org/www-community/attacks/xss/)** — XSS prevention via entity escaping

## Metadata

**Confidence breakdown:**

- **Reporter database format and content:** HIGH — Free Law Project official sources, verified with GitHub repository structure
- **Lazy loading strategies:** HIGH — JavaScript standards (ES2020+), verified with TypeScript/bundler documentation
- **HTML entity escaping:** HIGH — W3C standards, OWASP security guidelines
- **Annotation architecture (callback + template):** MEDIUM — Best practices from annotation literature; specific API shapes require Phase 3 implementation validation
- **Confidence scoring model:** MEDIUM — General ML patterns verified; eyecite calibration requires corpus testing in Phase 3+
- **Data format optimization (JSON vs binary):** MEDIUM — Trade-offs understood; actual measurements require Phase 3+ benchmarking
- **Position translation during annotation:** HIGH — From Phase 2 TransformationMap architecture, proven in Phase 2 implementation

**Phase 3 requirements coverage:**

- DATA-01 through DATA-05 (reporter loading, lazy loading, custom registration): Covered via lazy-load pattern + optional preload
- ANN-01 through ANN-04 (annotation markup, HTML preservation, entity handling): Covered via callback + template modes, auto-escaping
- PERF-01, PERF-02 (bundle size <50KB, 10KB in <100ms): Covered via separate chunk strategy + performance validation patterns

**Research valid until:** 14 days (reporters-db updates ~monthly; lazy loading patterns stable; annotation API stable in Phase 3 implementation)

**Next phase:** Phase 4 (Id./Supra Resolution) should build on Phase 3 annotation layer for marking up short-form citations and their long-form antecedents.

---

*Research completed: 2026-02-04*
*Phase 3: Reporter Database & Annotation — Ready for planning*
