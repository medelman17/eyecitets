---
name: adversarial-test
description: Adversarially test eyecite-ts to discover bugs, edge cases, crashes, and incorrect behavior. Creates GitHub issues for each discovered bug.
arguments:
  - name: categories
    description: "Comma-separated category numbers (1-10) or 'all'. Default: all. E.g., '1,2,3' or 'all'"
---

# Adversarial Testing for eyecite-ts

You are an adversarial tester for **eyecite-ts**, a TypeScript legal citation extraction library. Your goal is to systematically discover bugs, edge cases, crashes, and incorrect behavior by crafting malicious, unusual, and boundary-condition inputs across every stage of the pipeline.

After each discovered bug, you will create a GitHub issue with a minimal reproduction.

## Architecture Context

The library has a 4-stage pipeline:
1. **Clean** (`src/clean/`): stripHtmlTags, normalizeWhitespace, normalizeUnicode, fixSmartQuotes, removeOcrArtifacts. Builds TransformationMap with lookahead algorithm (maxLookAhead=20).
2. **Tokenize** (`src/tokenize/`): Applies regex patterns (case, statute, journal, neutral, shortForm) via matchAll(). Deduplicates by `${cleanStart}-${cleanEnd}`.
3. **Extract** (`src/extract/`): Parses metadata from tokens. Each type has its own extractor. Throws on parse failures.
4. **Resolve** (`src/resolve/`): DocumentResolver links short-forms (Id., supra, short-form case) to antecedents using scope boundaries and Levenshtein matching.
5. **Annotate** (`src/annotate/`): Template or callback-based text markup. Processes citations in reverse order.

Key facts:
- Zero runtime dependencies. Vitest 4 for testing.
- Regex patterns use /g flag (beware lastIndex state leaks between calls).
- TransformationMap uses maxLookAhead=20 in position mapping.
- Deduplication keeps first match per position (pattern order matters).
- `extractCase` throws `Error` if its internal regex doesn't match token text.
- Confidence scoring: base 0.5 + boosts for known reporters (+0.3) and valid year (+0.2).

## Execution Flow

### Step 1: Select Categories

If the user provides categories via `$ARGUMENTS` (e.g., `/adversarial-test 1,2,3`), focus on those specific categories by number. Otherwise, run all categories in priority order.

### Step 2: Write Tests

Create vitest test files at `tests/adversarial/<category>.test.ts`. Structure:

```typescript
import { describe, it, expect } from "vitest"
import { extractCitations } from "../../src/extract/extractCitations"

describe("Adversarial: <Category>", () => {
  it("should handle <edge case>", () => {
    const input = "..."
    expect(() => extractCitations(input)).not.toThrow()
    const result = extractCitations(input)
    // Assert correctness
  })
})
```

### Step 3: Run & Classify

```bash
npx vitest run tests/adversarial/<file>.test.ts
```

Classify failures:
- **P0 - Crash**: Unhandled exception, infinite loop, stack overflow
- **P1 - Wrong extraction**: Wrong type, wrong metadata, missing citation
- **P2 - Position bug**: originalStart/originalEnd don't map to correct text
- **P3 - Confidence issue**: Unreasonably high/low confidence
- **P4 - Performance**: >1s or excessive memory for reasonable input

### Step 4: File GitHub Issues

For each confirmed bug:

```bash
gh label create "adversarial-testing" --color "d93f0b" --description "Bugs found via adversarial testing" 2>/dev/null || true
gh issue create --title "<severity>: <brief description>" --body "$(cat <<'ISSUE_EOF'
## Bug Report (Adversarial Testing)

**Category:** <test category>
**Severity:** <P0-P4>
**Test file:** `tests/adversarial/<file>.test.ts`

### Reproduction

\`\`\`typescript
import { extractCitations } from "eyecite-ts"
const result = extractCitations(<minimal input>)
\`\`\`

### Expected Behavior
<what should happen>

### Actual Behavior
<what actually happens>

### Analysis
<root cause, pointing to specific code>

### Suggested Fix
<optional sketch>
ISSUE_EOF
)" --label "bug,adversarial-testing"
```

## Test Categories

### 1: Malformed & Degenerate Input
Inputs that shouldn't produce citations but might crash.

- Empty string, single character, only whitespace
- Only digits: `"123456789"`
- Only punctuation: `"............"`
- Extremely long input (100KB+ repeated text)
- Null bytes, control characters: `"\x00\x01\x02"`
- Mixed line endings: `"\r\n"` vs `"\n"` vs `"\r"`
- Input that is just HTML tags: `"<b><i></i></b>"`
- String of only section symbols: `""`

### 2: Unicode & Encoding Attacks
Exploit Unicode normalization and text cleaning.

- Zero-width chars in citations: `"500\u200BF.2d\u200B123"`
- RTL override: `"500 \u202EF.2d 123"`
- Combining diacriticals on digits: `"5\u0300\u030100 F.2d 123"`
- Full-width digits: `"\uFF15\uFF10\uFF10 F.2d 123"`
- NFKC ligature edge cases: `"\uFB01"` (fi ligature) in reporter name
- BOM markers: `"\uFEFF500 F.2d 123"`
- Homoglyph attacks: Cyrillic lookalikes for Latin chars in reporters
- Zalgo text surrounding citations

### 3: Position Tracking Stress
Break TransformationMap beyond lookahead limit.

- Deeply nested HTML around citation: `"<span class='x'><div class='y'>500 F.2d 123</div></span>"`
- HTML attributes >20 chars (exceeds maxLookAhead): `"<span data-very-long-attribute-name-exceeding-twenty-characters='val'>500 F.2d 123</span>"`
- Multiple cleaners stacking position shifts on same citation
- Citation at position 0 and at end of text
- Two citations separated by long HTML tag
- **Critical check**: `text.substring(originalStart, originalEnd)` must match expected citation text in original input

### 4: Regex Pattern Exploits
Trick patterns into wrong matches or ReDoS.

- Near-misses: `"500 F2d 123"` (missing period), `"F.2d 123"` (no volume)
- Multi-pattern overlap: inputs matching both case and journal patterns
- Pathological inputs: `"500 " + "F.".repeat(1000) + " 123"`
- Back-to-back citations with no separator
- Word boundary exploits: `"Idaho500 F.2d 123"`, `"500F.2d123"`
- Reporter strings in non-citation context
- Extreme volume/page: `"999999999 F.2d 999999999"`, `"0 F.2d 0"`
- **Regex /g flag state**: Call extractCitations twice in succession - second call must not be affected by first call's regex lastIndex

### 5: Short-Form Resolution Edge Cases
Break DocumentResolver.

- Id. with no antecedent
- Id. after statute (should NOT resolve to statute)
- Nested Id. chains (3+ consecutive)
- Supra with misspelled party name at fuzzy boundary (similarity ~0.79-0.81)
- Short-form case matching multiple antecedents
- Cross-paragraph Id. with `scopeStrategy: 'paragraph'`
- All short-forms, no full citations
- 100+ citations in one document
- Supra where party name is substring of another party

### 6: Annotation Integrity
Test annotation doesn't corrupt text.

- Citation containing `<script>` with autoEscape=false
- Overlapping citation spans
- Citation at position 0 and at text.length
- Template with regex special chars: `{ before: "$1", after: "$2" }`
- Callback returning empty string
- Callback returning string much longer than input
- useCleanText=true on heavily cleaned text
- Citation spans extending beyond text length

### 7: Pipeline Stage Interactions
Bugs that emerge from stage interactions.

- Smart quotes wrapping citation: `"\u201C500 F.2d 123\u201D"`
- HTML entity in reporter: `"500 F&period;2d 123"`
- OCR underscore in volume: `"5_00 F.2d 123"`
- Citation split across HTML tags: `"500 <b>F.2d</b> 123"`
- Whitespace normalization with adjacent citations: `"500  F.2d  123  456  F.3d  789"`

### 8: Concurrency & State
State leakage between calls.

- Sequential extractCitations() calls - verify no regex lastIndex pollution
- Multiple DocumentResolver instances - verify no shared state
- Custom cleaners with side effects
- Custom patterns with mutable state

### 9: Type System Boundaries
Test discriminated union at runtime.

- Verify every citation type has correct `type` discriminant
- All Span fields present (cleanStart, cleanEnd, originalStart, originalEnd)
- Type guards with manually constructed edge-case objects
- `assertUnreachable` behavior

### 10: Real-World Adversarial Legal Text
Tricky but realistic patterns.

- String citations: `"500 F.2d 100, 105, 110-15, 120 n.5"`
- Parallel citations: `"500 U.S. 100, 120 S. Ct. 1000, 150 L. Ed. 2d 500 (2000)"`
- Citations with subsequent history: `"aff'd"`, `"rev'd"`, `"cert. denied"`
- Citations in footnotes with adjacent superscripts
- Parenthetical explanations vs court/year parentheticals
- Pre-1800 reporters
- Foreign citations resembling U.S. format

## Priority Order

1. Categories 1-2 (find crashes fast)
2. Category 3 (position tracking correctness)
3. Categories 4-5 (pattern + resolution logic)
4. Categories 6-7 (annotation + integration)
5. Category 8 (state bugs)
6. Categories 9-10 (types + real-world)

## Summary Format

After completing testing, provide:

```
## Adversarial Testing Summary

**Categories tested:** <list>
**Total test cases:** N
**Passes:** N
**Failures:** N

### Bugs Filed
| # | Issue | Severity | Category | Description |
|---|-------|----------|----------|-------------|
| 1 | #XX   | P0       | 2        | Description |

### Notable Findings
- <systemic patterns>

### Recommendations
- <hardening suggestions>
```
