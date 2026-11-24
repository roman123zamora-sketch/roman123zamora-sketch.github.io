# Verified puzzle library

The library contains 500 puzzles, with 25 Checkmate and 25 Material
positions in each of ten bands from 200–399 through 2250–2500. Each puzzle includes a stable ID and legal move history from the standard
starting position. Positions come from PGN Mentor games or verified
Exalted self-play. The tab fetches the index and current puzzle.

Ten unique Checkmate solves and ten unique Material solves in the current
band unlock the next band. Completing the collection is a separate
milestone. Checkmate and Material keep separate ratings and practice
recommendations. Recommendations draw on first attempts only. The picker
shows the current collection totals.

Checkmate verification covers all legal defenses. Material verification
uses a legal tactical search or bounded offline UCI review depending on
the proof format. The difficulty labels are curriculum estimates.

## Curating an offline release

1. Use standard-start game records from [PGN Mentor](https://www.pgnmentor.com/files.html).
2. Use `scripts/mine-puzzle-games.py` and `scripts/verify-puzzle-leads.mjs`
   for tactical leads and verification. The offline
   `scripts/review-checkmate-puzzles.py` also proves archived mate leads. The optional
   `scripts/review-material-puzzles.py` records multi-reply UCI review.
   Import reviewed material JSONL with
   `node scripts/import-reviewed-puzzles.mjs output.json inputs…`.
3. Run `scripts/curate-puzzle-levels.py selected.json existing.json proofs…`
   with python-chess installed. This keeps the existing tactical payloads
   and fills gaps with verified positions. Publish the selected set with
   `node scripts/publish-puzzle-pool.mjs selected.json`.
4. Run `node tests/puzzles-test.mjs` to verify the library, legal histories,
   solutions, retained progress and unlock rules.
