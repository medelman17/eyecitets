import type { Span } from "./span"

/**
 * Citation type discriminator for type-safe pattern matching.
 */
export type CitationType = "case" | "statute" | "journal" | "shortForm" | "id" | "supra"

/**
 * Warning generated during citation parsing.
 */
export interface Warning {
  /** Severity level */
  level: 'error' | 'warning' | 'info'
  /** Description of the issue */
  message: string
  /** Position of the problematic region */
  position: { start: number; end: number }
  /** Additional context about the warning */
  context?: string
}

/**
 * Base fields shared by all citation types.
 */
export interface CitationBase {
  /** Original matched text */
  text: string

  /** Position span in document (originalStart/End point to original text) */
  span: Span

  /**
   * Confidence score indicating match certainty (0-1).
   * - 1.0: Certain match (e.g., exact reporter abbreviation in reporters-db)
   * - 0.8-0.99: High confidence (e.g., common pattern, missing pincite)
   * - 0.5-0.79: Medium confidence (e.g., ambiguous reporter abbreviation)
   * - <0.5: Low confidence (e.g., unusual formatting)
   */
  confidence: number

  /** Exact substring matched from the original text */
  matchedText: string

  /** Time spent processing this citation (milliseconds) */
  processTimeMs: number

  /** Number of regex patterns checked before match */
  patternsChecked: number

  /** Warnings for malformed or ambiguous regions */
  warnings?: Warning[]
}

/**
 * Full case citation (volume-reporter-page format).
 *
 * @example "500 F.2d 123"
 * @example "410 U.S. 113, 115"
 */
export interface FullCaseCitation extends CitationBase {
  type: "case"
  volume: number
  reporter: string
  page: number
  pincite?: number
  court?: string
  year?: number
}

/**
 * Statute citation (U.S. Code, state codes, etc.).
 *
 * @example "42 U.S.C. § 1983"
 */
export interface StatuteCitation extends CitationBase {
  type: "statute"
  title?: number
  code: string
  section: string
}

/**
 * Id. citation (refers to immediately preceding citation).
 *
 * @example "Id."
 * @example "Id. at 125"
 */
export interface IdCitation extends CitationBase {
  type: "id"
  pincite?: number
}

/**
 * Union type of all citation types.
 *
 * Use type guards via discriminated union:
 * @example
 * if (citation.type === "case") {
 *   console.log(citation.volume) // TypeScript knows this exists
 * }
 */
export type Citation = FullCaseCitation | StatuteCitation | IdCitation
