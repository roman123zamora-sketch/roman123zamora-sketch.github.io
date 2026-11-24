# Verified puzzle library

Every Elo band from 200–399 through 2250–2500 contains 15 checkmate
and 15 material puzzles. All 200 tactical puzzles from the prior release
remain in their original bands. Each puzzle includes a stable ID, the
source game, and a complete move history from the standard starting
position. The tab fetches only the index and the current puzzle.

Choose Checkmate or Material to see that category’s level progress.
Automatic advancement stays in the selected category. Each level requires
the rating threshold and 15 solves in each preceding level of that category.
Previously earned access is retained at the same rating threshold.

Checkmate verification covers all legal defenses. Material verification
uses a legal tactical search or bounded offline UCI review depending on
the proof format. The difficulty labels are curriculum estimates.

## Curating an offline release

1. Use standard-start game records from [PGN Mentor](https://www.pgnmentor.com/files.html).
2. Use `scripts/mine-puzzle-games.py` and `scripts/verify-puzzle-leads.mjs`
   for tactical leads and verification. The optional
   `scripts/review-material-puzzles.py` records multi-reply UCI review.
   Import reviewed material JSONL with
   `node scripts/import-reviewed-puzzles.mjs output.json inputs…`.
3. Run `scripts/curate-puzzle-levels.py selected.json existing.json proofs…`
   with python-chess installed. This keeps the existing tactical payloads
   and fills gaps with verified positions. Publish the selected set with
   `node scripts/publish-puzzle-pool.mjs selected.json`.
4. Run `node tests/puzzles-test.mjs` to verify the library, legal histories,
   solutions, retained progress and unlock rules.
