# Verified puzzle library

The public index lists stable position IDs, independently estimated Elo,
and tactical identities. Each payload contains a FEN, the legal moves from
the standard starting position, the objective, and the verified solution.
The source field identifies the PGN Mentor game collection and record.
The browser reads the index and fetches one selected payload. Rated
selection uses the player's exact saved Elo, prefers the same band, and
accepts adjacent bands within 200 points.

Browse Levels and Review are practice. Solved counts and misses are stored
locally. Previously published puzzles remain available for review through
the archive index. A saved rated attempt resumes its original board and
progress.

| Band | Material | Checkmate |
| --- | ---: | ---: |
| 200–399 | 5 | 5 |
| 400–599 | 5 | 5 |
| 600–799 | 5 | 5 |
| 800–999 | 1 | 5 |
| 1000–1249 | 0 | 5 |
| 1250–1499 | 0 | 5 |
| 1500–1749 | 1 | 5 |
| 1750+ | 0 | 2 |
| Total | 17 | 37 |

Prioritize Material above 800 and Checkmate above 1750 in the next batch.
The verified library currently contains 54 of the planned 80 positions.
Match history and puzzle attempt data are browser-local.

## Adding verified games

1. Use the [PGN Mentor game collections](https://www.pgnmentor.com/files.html) as game histories. The optional offline `scripts/mine-puzzle-games.py` accepts PGN files and a local UCI engine to prioritize leads.
2. Run `node scripts/verify-puzzle-leads.mjs <category> <leads.jsonl> <verified.json>`. Exalted replays the game and verifies the objective and replies. Suggested moves may order verification but have to pass it.
3. Run `python scripts/estimate-puzzle-levels.py <estimated.json> <verified.json> ...` and `node scripts/publish-puzzle-pool.mjs <estimated.json>`. The offline estimator requires python-chess. The publisher limits each objective to five per band and spreads its choices across the available estimates.
4. Run `node tests/puzzles-test.mjs`. It replays the published positions and checks the mate or settled material result.

The source files can include already verified records when extending the
library. Keep their stable IDs so review and solved progress continue to
work.
