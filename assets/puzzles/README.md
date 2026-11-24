# Verified puzzle library

Each of the ten levels from 200–399 through 2250–2500 contains 30 puzzles.
There are ten checkmate, ten material and ten positional puzzles in each
level. All positions originate in standard-start games from PGN Mentor.
Each payload includes its stable position ID, FEN, source game and complete
legal move history. The browser fetches the index and one puzzle payload
at a time.

- Checkmate puzzles use a forced-mate proof across every legal defense.
  The solution includes the longest verified defense.
- Material puzzles show a settled net gain. The retained proof format
  searches legal replies and tactical continuations through the exchange.
  The newer format records independent bounded UCI analysis at the root and
  against the strongest relevant defenses, followed by legal replay and
  material checks in Exalted Chess.
- Positional puzzles identify a concrete strategic goal and explain the
  improvement. Every accepted move includes reviewed replies and a final
  board for that choice. The engine checks tactical safety. The curator
  checks positional features such as pawn support, open files and square
  control separately. These exercises currently stop after one solver
  decision. The recorded replies are available from See solution.

Difficulty is a curriculum estimate. Tactical calculation length, opposing
resources, and visibility guide placement. Positional placement also weighs
plausible competing plans and the strategic concept. The ratings have no
player calibration data.

Level and first-attempt progress remain browser-local. Previously earned
level access survives the expansion, subject to the level's Elo minimum.
New unlocks require all 30 puzzles in each preceding level. Retained
puzzles keep their stable IDs. Rated results, hints, hearts and practice
after a loss use the same saved progression record.

## Curating an offline release

1. Use standard-start game collections from [PGN Mentor](https://www.pgnmentor.com/files.html).
2. For tactics, use `scripts/mine-puzzle-games.py` and
   `scripts/verify-puzzle-leads.mjs`. The optional
   `scripts/review-material-puzzles.py` records multi-reply UCI review.
3. Use `scripts/mine-positional-puzzles.py` to review strategic candidates
   with a local UCI engine. Pass reviewed material and positional JSONL
   files to `node scripts/import-reviewed-puzzles.mjs output.json inputs…`
   for legal replay. The Python scripts require python-chess.
4. Run `scripts/curate-puzzle-levels.py selected.json existing.json proofs…`.
   Pass the previous published payloads as `existing.json` to retain
   compatible progress. Run `node scripts/publish-puzzle-pool.mjs selected.json`.
   The publisher checks every category quota before writing an index.
5. Run `node tests/puzzles-test.mjs` to verify the library, legal histories,
   solution evidence, progress and unlock rules.
