import { describe, it, expect } from 'vitest'
import { annotate } from '@/annotate/annotate'
import type { Citation } from '@/types/citation'
import type { Span } from '@/types/span'

/**
 * Helper to create a basic case citation for testing.
 */
function createCaseCitation(start: number, end: number, text: string): Citation {
  const span: Span = {
    cleanStart: start,
    cleanEnd: end,
    originalStart: start,
    originalEnd: end,
  }

  return {
    type: 'case',
    text,
    span,
    matchedText: text,
    confidence: 0.9,
    processTimeMs: 0,
    patternsChecked: 1,
    volume: 500,
    reporter: 'F.2d',
    page: 123,
  }
}

describe('annotate', () => {
  describe('template mode', () => {
    it('should wrap citation with simple before/after strings', () => {
      const text = 'See 500 F.2d 123'
      const citations = [createCaseCitation(4, 16, '500 F.2d 123')]

      const result = annotate(text, citations, {
        template: { before: '<cite>', after: '</cite>' },
      })

      expect(result.text).toBe('See <cite>500 F.2d 123</cite>')
      expect(result.skipped).toHaveLength(0)
    })

    it('should apply complex template markup', () => {
      const text = 'See 500 F.2d 123'
      const citations = [createCaseCitation(4, 16, '500 F.2d 123')]

      const result = annotate(text, citations, {
        template: {
          before: '<mark data-type="case" class="citation">',
          after: '</mark>',
        },
      })

      expect(result.text).toBe('See <mark data-type="case" class="citation">500 F.2d 123</mark>')
    })
  })

  describe('callback mode', () => {
    it('should use custom annotation logic with citation data', () => {
      const text = 'See 500 F.2d 123'
      const citations = [createCaseCitation(4, 16, '500 F.2d 123')]

      const result = annotate(text, citations, {
        callback: (c) => {
          if (c.type === 'case') {
            return `<a href="/cases/${c.volume}-${c.page}">${c.matchedText}</a>`
          }
          return c.matchedText
        },
      })

      expect(result.text).toBe('See <a href="/cases/500-123">500 F.2d 123</a>')
    })

    it('should provide surrounding context to callback', () => {
      const text = 'For example, see 500 F.2d 123 for details about this case'
      const citations = [createCaseCitation(17, 29, '500 F.2d 123')]

      let receivedSurrounding = ''
      annotate(text, citations, {
        callback: (c, surrounding) => {
          receivedSurrounding = surrounding
          return `<cite>${c.matchedText}</cite>`
        },
      })

      // Should include ±30 characters around citation
      expect(receivedSurrounding).toContain('see 500 F.2d 123 for')
      expect(receivedSurrounding.length).toBeGreaterThan(12) // More than just the citation
    })
  })

  describe('auto-escaping', () => {
    it('should escape HTML entities by default', () => {
      // Create a citation that contains HTML-like text
      const text = 'See <script>alert(1)</script> F.2d 123'
      const citations = [createCaseCitation(4, 29, '<script>alert(1)</script>')]

      const result = annotate(text, citations, {
        template: { before: '<cite>', after: '</cite>' },
        // autoEscape defaults to true
      })

      expect(result.text).toContain('&lt;script&gt;')
      expect(result.text).not.toContain('<script>')
      expect(result.text).toBe('See <cite>&lt;script&gt;alert(1)&lt;&#x2F;script&gt;</cite> F.2d 123')
    })

    it('should escape all dangerous HTML characters', () => {
      const text = 'Test & < > " \' / chars'
      const citations = [createCaseCitation(5, 21, '& < > " \' / chars')]

      const result = annotate(text, citations, {
        template: { before: '<span>', after: '</span>' },
      })

      expect(result.text).toContain('&amp;')
      expect(result.text).toContain('&lt;')
      expect(result.text).toContain('&gt;')
      expect(result.text).toContain('&quot;')
      expect(result.text).toContain('&#39;')
      expect(result.text).toContain('&#x2F;')
    })

    it('should allow disabling auto-escape when explicitly set to false', () => {
      const text = 'See <em>emphasized</em> F.2d 123'
      const citations = [createCaseCitation(4, 24, '<em>emphasized</em>')]

      const result = annotate(text, citations, {
        template: { before: '<cite>', after: '</cite>' },
        autoEscape: false, // Opt-out of escaping
      })

      // Raw HTML preserved (NOT ESCAPED - document this risk)
      expect(result.text).toContain('<em>emphasized</em>')
      expect(result.text).not.toContain('&lt;')
    })
  })

  describe('multiple citations', () => {
    it('should annotate multiple citations correctly', () => {
      const text = '500 F.2d 123 and 400 F.3d 456'
      const citations = [
        createCaseCitation(0, 12, '500 F.2d 123'),
        createCaseCitation(17, 29, '400 F.3d 456'),
      ]

      const result = annotate(text, citations, {
        template: { before: '<cite>', after: '</cite>' },
      })

      expect(result.text).toBe('<cite>500 F.2d 123</cite> and <cite>400 F.3d 456</cite>')
    })

    it('should handle citations in reverse order', () => {
      const text = 'First 100 U.S. 1, then 200 U.S. 2, finally 300 U.S. 3'
      const citations = [
        createCaseCitation(6, 16, '100 U.S. 1'),
        createCaseCitation(23, 33, '200 U.S. 2'),
        createCaseCitation(43, 53, '300 U.S. 3'),
      ]

      const result = annotate(text, citations, {
        template: { before: '[', after: ']' },
      })

      expect(result.text).toBe('First [100 U.S. 1], then [200 U.S. 2], finally [300 U.S. 3]')
    })
  })

  describe('position map', () => {
    it('should track position shifts after annotation', () => {
      const text = 'See 500 F.2d 123'
      const citations = [createCaseCitation(4, 16, '500 F.2d 123')]

      const result = annotate(text, citations, {
        template: { before: '<cite>', after: '</cite>' },
      })

      // Position 4 (start of citation) should be tracked
      expect(result.positionMap.has(4)).toBe(true)

      // After inserting '<cite>' (6 chars), position shifts
      const newPos = result.positionMap.get(4)
      expect(newPos).toBe(4) // First annotation doesn't shift its own start
    })

    it('should track multiple position shifts', () => {
      const text = '100 U.S. 1 and 200 U.S. 2'
      const citations = [
        createCaseCitation(0, 10, '100 U.S. 1'),
        createCaseCitation(15, 25, '200 U.S. 2'),
      ]

      const result = annotate(text, citations, {
        template: { before: '[', after: ']' },
      })

      // Both positions tracked
      expect(result.positionMap.has(0)).toBe(true)
      expect(result.positionMap.has(15)).toBe(true)
    })
  })

  describe('useCleanText mode', () => {
    it('should use cleanStart/cleanEnd when useCleanText is true', () => {
      const text = 'See 500 F.2d 123'

      // Citation with different clean vs original positions
      const citation: Citation = {
        type: 'case',
        text: '500 F.2d 123',
        span: {
          cleanStart: 4,
          cleanEnd: 16,
          originalStart: 10, // Different from clean positions
          originalEnd: 22,
        },
        matchedText: '500 F.2d 123',
        confidence: 0.9,
        processTimeMs: 0,
        patternsChecked: 1,
        volume: 500,
        reporter: 'F.2d',
        page: 123,
      }

      const result = annotate(text, [citation], {
        template: { before: '<cite>', after: '</cite>' },
        useCleanText: true, // Use cleanStart/cleanEnd
      })

      // Should annotate at cleanStart position (4), not originalStart (10)
      expect(result.text).toBe('See <cite>500 F.2d 123</cite>')
    })

    it('should use originalStart/originalEnd when useCleanText is false', () => {
      const text = 'See 500 F.2d 123'

      // Citation with identical clean/original positions for this test
      const citation = createCaseCitation(4, 16, '500 F.2d 123')

      const result = annotate(text, [citation], {
        template: { before: '<cite>', after: '</cite>' },
        useCleanText: false, // Use originalStart/originalEnd (default)
      })

      expect(result.text).toBe('See <cite>500 F.2d 123</cite>')
    })
  })

  describe('no annotation specified', () => {
    it('should return unchanged text if no callback or template provided', () => {
      const text = 'See 500 F.2d 123'
      const citations = [createCaseCitation(4, 16, '500 F.2d 123')]

      const result = annotate(text, citations, {
        // No callback, no template
      })

      expect(result.text).toBe(text)
      expect(result.positionMap.size).toBe(0)
    })
  })

  describe('HTML tag snapping (#17)', () => {
    it('should snap start position out of HTML tag', () => {
      // Simulates a position that lands inside an <a> tag
      const text = '145, <a id="p410" href="#p410">*410</a>11 N. H. 459'
      // Citation mapped to position inside the <a> tag
      const citation: Citation = {
        type: 'case',
        text: '41011 N. H. 459',
        span: {
          cleanStart: 5,
          cleanEnd: 20,
          originalStart: 15, // Inside the <a> tag's attributes
          originalEnd: 51,
        },
        matchedText: '41011 N. H. 459',
        confidence: 0.8,
        processTimeMs: 0,
        patternsChecked: 1,
        volume: 41011,
        reporter: 'N. H.',
        page: 459,
      }

      const result = annotate(text, [citation], {
        template: { before: '{', after: '}' },
        autoEscape: false,
      })

      // Start should snap to before the <a> tag
      expect(result.text).not.toContain('<a id="p4{10"')
      expect(result.text).toContain('{')
      expect(result.text).toContain('}')
      expect(result.skipped).toHaveLength(0)
    })

    it('should snap end position out of HTML tag', () => {
      const text = 'See 500 F.2d 1<em>23</em> here'
      // End position lands inside <em> tag
      const citation: Citation = {
        type: 'case',
        text: '500 F.2d 123',
        span: {
          cleanStart: 4,
          cleanEnd: 16,
          originalStart: 4,
          originalEnd: 16, // Inside the <em> opening tag
        },
        matchedText: '500 F.2d 123',
        confidence: 0.8,
        processTimeMs: 0,
        patternsChecked: 1,
        volume: 500,
        reporter: 'F.2d',
        page: 123,
      }

      const result = annotate(text, [citation], {
        template: { before: '[', after: ']' },
        autoEscape: false,
      })

      // Should not break HTML tags
      expect(result.text).not.toContain('<e]m>')
      expect(result.skipped).toHaveLength(0)
    })

    it('should not alter positions that are outside HTML tags', () => {
      const text = 'See 500 F.2d 123 (2020)'
      const citations = [createCaseCitation(4, 16, '500 F.2d 123')]

      const result = annotate(text, citations, {
        template: { before: '<cite>', after: '</cite>' },
      })

      // Normal behavior — no HTML tags to snap around
      expect(result.text).toBe('See <cite>500 F.2d 123</cite> (2020)')
    })

    it('should snap both positions when entirely inside a tag', () => {
      // Entire citation is inside one tag attribute (pathological case)
      // Both positions snap to the tag boundaries
      const text = '<div data-citation="500 F.2d 123">content</div>'
      const citation: Citation = {
        type: 'case',
        text: '500 F.2d 123',
        span: {
          cleanStart: 0,
          cleanEnd: 12,
          originalStart: 19, // Inside <div> tag attribute
          originalEnd: 31,   // Still inside <div> tag attribute
        },
        matchedText: '500 F.2d 123',
        confidence: 0.8,
        processTimeMs: 0,
        patternsChecked: 1,
        volume: 500,
        reporter: 'F.2d',
        page: 123,
      }

      const result = annotate(text, [citation], {
        template: { before: '[', after: ']' },
        autoEscape: false,
      })

      // Both snap to tag boundaries — wraps the entire tag (not ideal but safe HTML)
      expect(result.text).not.toContain('data-citation="500 F.2d [123')
      expect(result.skipped).toHaveLength(0)
    })

    it('should handle annotation on clean text without snapping', () => {
      // useCleanText mode should not do HTML snapping
      const text = 'See 500 F.2d 123'
      const citations = [createCaseCitation(4, 16, '500 F.2d 123')]

      const result = annotate(text, citations, {
        template: { before: '<cite>', after: '</cite>' },
        useCleanText: true,
      })

      expect(result.text).toBe('See <cite>500 F.2d 123</cite>')
      expect(result.skipped).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('should handle empty citations array', () => {
      const text = 'See 500 F.2d 123'
      const result = annotate(text, [], {
        template: { before: '<cite>', after: '</cite>' },
      })

      expect(result.text).toBe(text)
    })

    it('should handle citation at start of text', () => {
      const text = '500 F.2d 123 is the case'
      const citations = [createCaseCitation(0, 12, '500 F.2d 123')]

      const result = annotate(text, citations, {
        template: { before: '<cite>', after: '</cite>' },
      })

      expect(result.text).toBe('<cite>500 F.2d 123</cite> is the case')
    })

    it('should handle citation at end of text', () => {
      const text = 'The case is 500 F.2d 123'
      const citations = [createCaseCitation(12, 24, '500 F.2d 123')]

      const result = annotate(text, citations, {
        template: { before: '<cite>', after: '</cite>' },
      })

      expect(result.text).toBe('The case is <cite>500 F.2d 123</cite>')
    })
  })
})
