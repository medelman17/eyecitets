/**
 * Federal Statute Extraction (USC + CFR)
 *
 * Parses tokenized federal citations to extract title, code, section,
 * subsections, jurisdiction, and et seq. indicators.
 *
 * @module extract/statutes/extractFederal
 */

import type { Token } from '@/tokenize'
import type { StatuteCitation } from '@/types/citation'
import type { TransformationMap } from '@/types/span'

/** Regex to parse federal token: title + code + § + body */
const FEDERAL_SECTION_RE = /^(\d+)\s+(\S+(?:\.\S+)*)\s*§§?\s*(.+)$/
/** Regex to parse federal token: title + code + Part + body */
const FEDERAL_PART_RE = /^(\d+)\s+(\S+(?:\.\S+)*)\s+(?:Part|pt\.)\s+(.+)$/

/** Separate subsection chain from section number */
const SUBSECTION_RE = /^([^(]+?)\s*((?:\([^)]*\))*)$/

/** Et seq. at end of string */
const ET_SEQ_RE = /\s*et\s+seq\.?\s*$/i

/**
 * Extract a federal statute citation (USC or CFR) from a tokenized match.
 */
export function extractFederal(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token

  // Try § form first, then Part form
  const bodyMatch = FEDERAL_SECTION_RE.exec(text) ?? FEDERAL_PART_RE.exec(text)

  let title: number | undefined
  let code: string
  let rawBody: string

  if (bodyMatch) {
    title = Number.parseInt(bodyMatch[1], 10)
    code = bodyMatch[2]
    rawBody = bodyMatch[3]
  } else {
    // Fallback for edge cases
    code = token.patternId === 'cfr' ? 'C.F.R.' : 'U.S.C.'
    rawBody = text
    title = undefined
  }

  // Strip et seq. from body
  let hasEtSeq = false
  if (ET_SEQ_RE.test(rawBody)) {
    hasEtSeq = true
    rawBody = rawBody.replace(ET_SEQ_RE, '')
  }

  // Split section from subsections: "1983(a)(1)" → section="1983", subsection="(a)(1)"
  let section: string
  let subsection: string | undefined

  const subMatch = SUBSECTION_RE.exec(rawBody.trim())
  const subMatchGroups = subMatch?.[2]
  if (subMatch !== null && subMatchGroups) {
    section = subMatch[1].trim()
    subsection = subMatchGroups || undefined
  } else {
    section = rawBody.trim()
  }

  // Translate positions
  const originalStart =
    transformationMap.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart
  const originalEnd =
    transformationMap.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd

  // Confidence: known federal code + § = 0.95 base
  let confidence = 0.95
  if (title !== undefined) confidence += 0.05
  if (subsection) confidence += 0.05
  confidence = Math.min(confidence, 1.0)

  return {
    type: 'statute',
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    title,
    code,
    section,
    subsection,
    pincite: subsection,
    jurisdiction: 'US',
    hasEtSeq: hasEtSeq || undefined,
  }
}
