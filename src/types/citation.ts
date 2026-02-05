import type { Span } from "./span"

/**
 * Citation type discriminator for type-safe pattern matching.
 */
export type CitationType = "case" | "statute" | "journal" | "shortForm" | "id" | "supra"

/**
 * Base fields shared by all citation types.
 */
export interface CitationBase {
  /** Original matched text */
  text: string

  /** Position span in document (originalStart/End point to original text) */
  span: Span
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
