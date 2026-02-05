---
"eyecite-ts": minor
---

Extract plaintiff and defendant party names from case citations and improve supra resolution matching

- Split case names on "v."/"vs." into `plaintiff` and `defendant` fields with raw text preserved
- Normalized fields (`plaintiffNormalized`, `defendantNormalized`) strip et al., d/b/a, aka, corporate suffixes, and leading articles
- Procedural prefix detection (In re, Ex parte, Matter of, etc.) with `proceduralPrefix` field
- Government entities (United States, People, Commonwealth, State) recognized as plaintiffs, not procedural prefixes
- Supra resolution uses extracted party names for higher-accuracy matching before Levenshtein fallback
- Defendant name prioritized in resolution history per Bluebook convention
- All new fields optional — zero breaking changes for existing consumers
