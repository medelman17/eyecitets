# eyecite-ts

## 0.3.0

### Minor Changes

- [#32](https://github.com/medelman17/eyecite-ts/pull/32) [`a070d35`](https://github.com/medelman17/eyecite-ts/commit/a070d352adb8c76ec2f313c0ddd0911342012fa9) Thanks [@medelman17](https://github.com/medelman17)! - Support hyphenated volume numbers (e.g., "1984-1 Trade Cas. 66"). Volume type changed from `number` to `number | string` across all citation types — numeric volumes remain numbers, hyphenated volumes are strings.

- [#26](https://github.com/medelman17/eyecite-ts/pull/26) [`18ae4c2`](https://github.com/medelman17/eyecite-ts/commit/18ae4c2f19af46ce9b89a72f9061b5133d4816f3) Thanks [@medelman17](https://github.com/medelman17)! - Add `statutesAtLarge` citation type for Statutes at Large references (e.g., "124 Stat. 119"). Previously these were misclassified as case citations via the broad state-reporter pattern.

### Patch Changes

- [#24](https://github.com/medelman17/eyecite-ts/pull/24) [`0a064ed`](https://github.com/medelman17/eyecite-ts/commit/0a064edcc132df16f7a1a8a8440915660f64ee3d) Thanks [@medelman17](https://github.com/medelman17)! - Add support for 4th and 5th series reporters in case citation patterns

- [#29](https://github.com/medelman17/eyecite-ts/pull/29) [`fb1e58f`](https://github.com/medelman17/eyecite-ts/commit/fb1e58f674e3a443c6b1f594fd258f3ab33b572c) Thanks [@medelman17](https://github.com/medelman17)! - Fix compact journal citations (e.g., "93 Harv.L.Rev. 752") being misclassified as case citations. Added a specific pattern for compact law review abbreviations containing L.Rev., L.J., or L.Q. that runs before the broad state-reporter case pattern.

- [#35](https://github.com/medelman17/eyecite-ts/pull/35) [`14320ad`](https://github.com/medelman17/eyecite-ts/commit/14320ad56e9b639ec6ea33e6babc2dcf48776b8a) Thanks [@medelman17](https://github.com/medelman17)! - Fix annotation markers being inserted inside HTML tags when mapping back to original text

- [#34](https://github.com/medelman17/eyecite-ts/pull/34) [`195403e`](https://github.com/medelman17/eyecite-ts/commit/195403e737e820ae89cc0d38805719806b10d022) Thanks [@medelman17](https://github.com/medelman17)! - Fix court extraction when parenthetical contains month/day date (e.g., "(2d Cir. Jan. 15, 2020)")

- [#31](https://github.com/medelman17/eyecite-ts/pull/31) [`77f30ce`](https://github.com/medelman17/eyecite-ts/commit/77f30ce22ad6a81398cb6e59e9f6ac593e5cc972) Thanks [@medelman17](https://github.com/medelman17)! - Fix year and court not extracted from parentheticals on full case citations. The extractor now looks ahead in the cleaned text for trailing parentheticals like `(1989)` or `(9th Cir. 2020)`. Also strips year from court field and infers `scotus` for Supreme Court reporters.

- [#33](https://github.com/medelman17/eyecite-ts/pull/33) [`c05948b`](https://github.com/medelman17/eyecite-ts/commit/c05948b9833c0bdb564abdcba412928b6711e46e) Thanks [@medelman17](https://github.com/medelman17)! - Fix supra resolution failing when antecedent citation is preceded by signal words (In, See, Compare, etc.)

- [#30](https://github.com/medelman17/eyecite-ts/pull/30) [`70d70a7`](https://github.com/medelman17/eyecite-ts/commit/70d70a76866964be98871cd98ae69074da63fb57) Thanks [@medelman17](https://github.com/medelman17)! - Fix "U. S." (with internal space) not being recognized as a Supreme Court reporter. Added optional whitespace between "U." and "S." in the supreme-court tokenization pattern.

- [#27](https://github.com/medelman17/eyecite-ts/pull/27) [`6fa73a8`](https://github.com/medelman17/eyecite-ts/commit/6fa73a816e3cdc20d91ab56f9bcf6a4b7d1d80bf) Thanks [@medelman17](https://github.com/medelman17)! - Fix statute sections with trailing letters (e.g., "18 U.S.C. § 1028A") not being recognized. Updated tokenization patterns for both USC and state code statutes to allow alphanumeric section suffixes.

- [#28](https://github.com/medelman17/eyecite-ts/pull/28) [`dba6092`](https://github.com/medelman17/eyecite-ts/commit/dba609256eec9a0007223de88b8bd8504bd64dc4) Thanks [@medelman17](https://github.com/medelman17)! - Fix supra pattern failing when a space precedes the comma (e.g., "Twombly , supra"), which occurs when HTML tags are cleaned from text like `<em>Twombly</em>, supra`.
