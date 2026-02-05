# eyecite-ts

TypeScript legal citation extraction library - port of Python [eyecite](https://github.com/freelawproject/eyecite).

Extract, validate, annotate, and resolve legal citations from court opinions and legal documents with zero runtime dependencies and a <50KB bundle size.

## Features

- **Full citation extraction**: Case citations, statutes, journal articles, neutral citations, public laws, federal register
- **Short-form resolution**: Id./Ibid., supra, and short-form case citations resolved to their full antecedents
- **Reporter database**: 1235 reporters with variant matching and confidence scoring
- **Citation annotation**: HTML/Markdown markup with auto-escape and position tracking
- **Bundle optimization**: Tree-shakeable exports, lazy-loaded data, separate entry points
- **TypeScript native**: Discriminated unions, strict types, full IntelliSense

## Installation

```bash
npm install eyecite-ts
```

## Quick Start

```typescript
import { extractCitations } from 'eyecite-ts'

const text = 'See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)'
const citations = extractCitations(text)

console.log(citations[0])
// {
//   type: 'case',
//   volume: 500,
//   reporter: 'F.2d',
//   page: 123,
//   court: '9th Cir.',
//   year: 2020,
//   confidence: 0.85,
//   span: { originalStart: 4, originalEnd: 48 }
// }
```

## Citation Extraction

### Basic Usage

```typescript
import { extractCitations } from 'eyecite-ts'

const text = `
  See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020).
  Also 42 U.S.C. § 1983.
  Compare 123 Harv. L. Rev. 456.
`
const citations = extractCitations(text)

citations.forEach(citation => {
  console.log(citation.type) // 'case', 'statute', 'journal', etc.
})
```

### Async API

```typescript
import { extractCitationsAsync } from 'eyecite-ts'

const citations = await extractCitationsAsync(text)
```

### Custom Patterns

```typescript
import { extractCitations, casePatterns } from 'eyecite-ts'

// Extract only case citations
const citations = extractCitations(text, {
  patterns: casePatterns
})
```

### Custom Cleaners

```typescript
import { extractCitations, stripHtmlTags } from 'eyecite-ts'

// Use only HTML stripping, skip Unicode normalization
const citations = extractCitations(html, {
  cleaners: [stripHtmlTags]
})
```

## Resolving Short-Form Citations

Short-form citations (Id., supra, short-form case) refer to earlier citations in the document. The resolution engine automatically links them to their full antecedents.

### Convenience API

```typescript
import { extractCitations } from 'eyecite-ts'

const text = `
  Smith v. Jones, 500 F.2d 123 (2020).
  Id. at 125.
  Smith, supra, at 130.
  500 F.2d at 140.
`

// Convenience: extract + resolve in one call
const citations = extractCitations(text, { resolve: true })

// citations[1] is Id. citation
console.log(citations[1].resolution)
// {
//   resolvedTo: 0,  // Points to Smith v. Jones (index 0)
//   confidence: 1.0,
//   warnings: []
// }
```

### Power-User API

```typescript
import { extractCitations, resolveCitations } from 'eyecite-ts'

// Step 1: Extract citations
const citations = extractCitations(text)

// Step 2: Resolve short-form citations
const resolved = resolveCitations(citations, text, {
  scopeStrategy: 'paragraph',      // Only resolve within paragraphs
  fuzzyPartyMatching: true,        // Enable fuzzy supra matching
  partyMatchThreshold: 0.8,        // Similarity threshold (0-1)
  reportUnresolved: true           // Report failure reasons
})
```

### Resolution Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scopeStrategy` | `'paragraph'` \| `'section'` \| `'footnote'` \| `'none'` | `'paragraph'` | How far back to search for antecedents |
| `autoDetectParagraphs` | `boolean` | `true` | Auto-detect paragraph boundaries from text |
| `paragraphBoundaryPattern` | `RegExp` | `/\n\n+/` | Pattern to detect paragraphs |
| `fuzzyPartyMatching` | `boolean` | `true` | Enable fuzzy party name matching for supra |
| `partyMatchThreshold` | `number` | `0.8` | Similarity threshold (0-1) for fuzzy matching |
| `allowNestedResolution` | `boolean` | `false` | Allow Id. to resolve to other short-form citations |
| `reportUnresolved` | `boolean` | `true` | Report failure reasons for unresolved citations |

### Resolution Examples

**Id. citations:**

```typescript
const text = 'Smith v. Jones, 500 F.2d 123. Id. at 125.'
const citations = extractCitations(text, { resolve: true })

// citations[1].resolution.resolvedTo === 0 (points to Smith v. Jones)
```

**Supra citations:**

```typescript
const text = 'Smith v. Jones, 500 F.2d 123. See also Smith, supra, at 130.'
const citations = extractCitations(text, { resolve: true })

// citations[1].resolution.resolvedTo === 0 (party name matches "Smith")
```

**Short-form case citations:**

```typescript
const text = 'Brown v. Board, 347 U.S. 483 (1954). See 347 U.S. at 495.'
const citations = extractCitations(text, { resolve: true })

// citations[1].resolution.resolvedTo === 0 (volume/reporter matches)
```

### Handling Unresolved Citations

```typescript
const text = 'Id. at 100.' // Orphan Id. with no preceding citation

const citations = extractCitations(text, { resolve: true })

console.log(citations[0].resolution)
// {
//   resolvedTo: undefined,
//   failureReason: 'No preceding full citation found',
//   confidence: 0,
//   warnings: []
// }
```

To suppress unresolved warnings:

```typescript
const citations = extractCitations(text, {
  resolve: true,
  resolutionOptions: {
    reportUnresolved: false  // Omits resolution field for unresolved citations
  }
})
```

## Citation Validation

Validate case citations against the reporters database:

```typescript
import { validateCitation } from 'eyecite-ts/data'

// Returns citations with adjusted confidence scores
const validated = await validateCitation(citations)

// Confidence adjustments:
// - +0.2 boost for reporter match
// - -0.3 penalty for reporter mismatch
// - -0.1 penalty for ambiguous reporter
```

## Citation Annotation

Add HTML/Markdown markup to citations:

```typescript
import { annotate } from 'eyecite-ts/annotate'

// Template mode (simple)
const html = annotate(
  text,
  citations,
  '<a href="{{url}}">{{text}}</a>'
)

// Callback mode (full control)
const html = annotate(text, citations, (citation, text) => {
  const url = `https://example.com/${citation.volume}/${citation.reporter}/${citation.page}`
  return `<a href="${url}">${text}</a>`
})
```

Auto-escape is enabled by default for XSS protection:

```typescript
// User input is automatically escaped
const html = annotate(text, citations, '<a>{{text}}</a>', {
  autoEscape: true  // default
})
```

## Bundle Size

Core library is optimized for tree-shaking:

- **Core extraction**: 2.5 KB gzipped
- **Reporter database**: 88.5 KB gzipped (lazy-loaded)
- **Annotation**: 0.5 KB gzipped

Import only what you need:

```typescript
// Tree-shakeable imports
import { extractCitations } from 'eyecite-ts'           // Core only
import { validateCitation } from 'eyecite-ts/data'      // Core + data
import { annotate } from 'eyecite-ts/annotate'          // Core + annotate
```

## Citation Types

All citation types are exported with full TypeScript types:

```typescript
import type {
  Citation,
  FullCaseCitation,
  StatuteCitation,
  JournalCitation,
  NeutralCitation,
  PublicLawCitation,
  FederalRegisterCitation,
  IdCitation,
  SupraCitation,
  ShortFormCaseCitation
} from 'eyecite-ts'

// Discriminated union - switch on type
citations.forEach(citation => {
  switch (citation.type) {
    case 'case':
      console.log(citation.reporter)  // FullCaseCitation
      break
    case 'statute':
      console.log(citation.title)     // StatuteCitation
      break
    case 'id':
      console.log(citation.pincite)   // IdCitation
      break
    // etc.
  }
})
```

## Architecture

Citation extraction follows a 4-stage pipeline:

1. **Clean**: Remove HTML, normalize Unicode, fix smart quotes
2. **Tokenize**: Apply regex patterns to find citation candidates
3. **Extract**: Parse metadata (volume, reporter, page, etc.)
4. **Translate**: Map positions from cleaned text → original text

All positions (spans) track both cleaned and original text offsets.

See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type checking
npm run typecheck

# Build
npm run build
```

## License

MIT

## Credits

Ported from [eyecite](https://github.com/freelawproject/eyecite) (Python) by Free Law Project.
