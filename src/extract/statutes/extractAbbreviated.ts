/**
 * Abbreviated-Code Statute Extraction (Family 3)
 *
 * Parses tokenized citations from states that use compact abbreviations
 * (e.g., "Fla. Stat.", "R.C.", "MCL"). Looks up the abbreviation in the
 * knownCodes registry to determine jurisdiction.
 *
 * Jurisdictions: FL, OH, MI, UT, CO, WA, NC, GA, PA, IN, NJ, DE
 *
 * @module extract/statutes/extractAbbreviated
 */

import type { Token } from '@/tokenize'
import type { StatuteCitation } from '@/types/citation'
import type { TransformationMap } from '@/types/span'
import { findAbbreviatedCode } from '@/data/knownCodes'

const ABBREVIATED_RE = /^(?:(\d+)\s+)?(.+?)\s*§?\s*(\d+[A-Za-z0-9.:/-]*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)$/
const SUBSECTION_RE = /^([^(]+?)\s*((?:\([^)]*\))*)$/
const ET_SEQ_RE = /\s*et\s+seq\.?\s*$/i

export function extractAbbreviated(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = ABBREVIATED_RE.exec(text)

  let title: number | undefined
  let abbrevText: string
  let rawBody: string

  if (match) {
    title = match[1] ? Number.parseInt(match[1], 10) : undefined
    abbrevText = match[2].trim()
    rawBody = match[3]
  } else {
    abbrevText = text
    rawBody = ''
  }

  const codeEntry = findAbbreviatedCode(abbrevText)
  const jurisdiction = codeEntry?.jurisdiction
  const code = abbrevText

  let hasEtSeq = false
  if (ET_SEQ_RE.test(rawBody)) {
    hasEtSeq = true
    rawBody = rawBody.replace(ET_SEQ_RE, '')
  }

  let section: string
  let subsection: string | undefined

  const subMatch = SUBSECTION_RE.exec(rawBody.trim())
  const subGroups = subMatch?.[2]
  if (subMatch !== null && subGroups) {
    section = subMatch[1].trim()
    subsection = subGroups || undefined
  } else {
    section = rawBody.trim()
  }

  const originalStart = transformationMap.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart
  const originalEnd = transformationMap.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd

  const hasSection = text.includes('§')
  let confidence: number
  if (codeEntry && hasSection) { confidence = 0.95 }
  else if (codeEntry) { confidence = 0.85 }
  else if (hasSection) { confidence = 0.6 }
  else { confidence = 0.4 }
  if (title !== undefined) confidence += 0.05
  if (subsection) confidence += 0.05
  confidence = Math.min(confidence, 1.0)

  return {
    type: 'statute', text,
    span: { cleanStart: span.cleanStart, cleanEnd: span.cleanEnd, originalStart, originalEnd },
    confidence, matchedText: text, processTimeMs: 0, patternsChecked: 1,
    title, code, section, subsection, pincite: subsection,
    jurisdiction, hasEtSeq: hasEtSeq || undefined,
  }
}
