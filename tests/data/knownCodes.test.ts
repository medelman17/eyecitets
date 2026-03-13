import { describe, it, expect } from 'vitest'
import { abbreviatedCodes, type CodeEntry } from '@/data/knownCodes'

describe('knownCodes registry', () => {
  describe('abbreviatedCodes', () => {
    it('should have entries for all 12 jurisdictions', () => {
      const jurisdictions = new Set(abbreviatedCodes.map(c => c.jurisdiction))
      expect(jurisdictions).toContain('FL')
      expect(jurisdictions).toContain('OH')
      expect(jurisdictions).toContain('MI')
      expect(jurisdictions).toContain('UT')
      expect(jurisdictions).toContain('CO')
      expect(jurisdictions).toContain('WA')
      expect(jurisdictions).toContain('NC')
      expect(jurisdictions).toContain('GA')
      expect(jurisdictions).toContain('PA')
      expect(jurisdictions).toContain('IN')
      expect(jurisdictions).toContain('NJ')
      expect(jurisdictions).toContain('DE')
      expect(jurisdictions.size).toBe(12)
    })

    it('should have no duplicate abbreviation strings across jurisdictions', () => {
      const seen = new Map<string, string>()
      for (const entry of abbreviatedCodes) {
        for (const pattern of entry.patterns) {
          const lower = pattern.toLowerCase()
          const existing = seen.get(lower)
          if (existing && existing !== entry.jurisdiction) {
            throw new Error(
              `Duplicate pattern "${pattern}" in ${entry.jurisdiction} and ${existing}`
            )
          }
          seen.set(lower, entry.jurisdiction)
        }
      }
    })

    it('should have valid CodeEntry fields on all entries', () => {
      for (const entry of abbreviatedCodes) {
        expect(entry.jurisdiction).toMatch(/^[A-Z]{2}$/)
        expect(entry.abbreviation).toBeTruthy()
        expect(entry.patterns.length).toBeGreaterThan(0)
        expect(entry.family).toBe('abbreviated')
      }
    })

    it('should have at least one pattern per entry', () => {
      for (const entry of abbreviatedCodes) {
        expect(entry.patterns.length).toBeGreaterThanOrEqual(1)
      }
    })
  })
})
