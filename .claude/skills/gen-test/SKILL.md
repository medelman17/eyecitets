---
name: gen-test
description: Generate Vitest 4 test files matching eyecite-ts conventions
disable-model-invocation: true
arguments:
  - name: source-file
    description: "Path to the source file to test (e.g., src/extract/extractCase.ts)"
---

# Generate Tests for eyecite-ts

Generate a comprehensive Vitest 4 test file for the specified source file, following project conventions exactly.

## Conventions

### File placement
- Mirror source path: `src/foo/bar.ts` → `tests/foo/bar.test.ts`
- Integration tests go in `tests/integration/`

### Imports
- Use path aliases: `import { thing } from '@/module'` (not relative paths)
- Import test utilities from `vitest`: `import { describe, it, expect } from 'vitest'`
- Import types with `import type { ... }` when only used as types

### Vitest 4 API
- Test options go as the **second argument**: `it('name', { timeout: 5000 }, () => { ... })`
- Do NOT put options as the third argument

### Test structure
- Top-level `describe` block named after the primary export
- Nested `describe` blocks for logical groupings (e.g., by feature, edge case category)
- Use `it('should ...')` naming convention
- Include helpers at the top of the describe block (e.g., `createIdentityMap`)

### Common helpers for this project
When testing extraction functions, create these helpers:

```typescript
// Identity TransformationMap (no position shifts)
const createIdentityMap = (): TransformationMap => {
  const cleanToOriginal = new Map<number, number>()
  const originalToClean = new Map<number, number>()
  for (let i = 0; i < 1000; i++) {
    cleanToOriginal.set(i, i)
    originalToClean.set(i, i)
  }
  return { cleanToOriginal, originalToClean }
}
```

When testing tokenization, create Token objects:
```typescript
const token: Token = {
  text: '500 F.2d 123',
  span: { cleanStart: 0, cleanEnd: 13 },
  type: 'case',
  patternId: 'federal-reporter',
}
```

### What to test
1. **Happy path**: Standard inputs that exercise the primary code path
2. **Edge cases**: Empty strings, boundary values, unusual but valid inputs
3. **Error cases**: Invalid inputs, missing fields, malformed data
4. **Regex patterns**: If the source uses regex, test against both matching and non-matching inputs
5. **Type discrimination**: If returning Citation types, verify the `type` field and type-specific fields

### Code style
- Biome formatting: 2-space indent, 100-char lines, double quotes, trailing commas, semicolons as needed
- No explicit `any` types
- Use `const` everywhere possible

## Steps

1. Read the source file specified in the argument
2. Identify all exported functions/classes/types
3. Read existing tests in the same directory for pattern reference
4. Generate the test file following all conventions above
5. Run `npx vitest run <test-file>` to verify tests pass
