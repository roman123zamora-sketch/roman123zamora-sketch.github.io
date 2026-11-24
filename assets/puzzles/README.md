# Verified puzzle library

The public index lists stable position IDs, independently estimated Elo,
and tactical identities. Each payload contains a FEN, the legal moves from
the standard starting position, the objective, and the verified solution.
The source field identifies the PGN Mentor game collection and record.
The browser reads the index and fetches one selected payload. Level and
first-attempt progress are browser-local. This season starts at 400 Elo.
A loss retains the exact board and step, and an eventual practice solve
counts toward level completion.

| Band | Published | Required |
| --- | ---: | ---: |
| 200–399 | 20 | 20 |
| 400–599 | 20 | 20 |
| 600–799 | 20 | 20 |
| 800–999 | 20 | 20 |
| 1000–1249 | 9 | 20 |
| 1250–1499 | 20 | 20 |
| 1500–1749 | 10 | 20 |
| 1750–1999 | 2 | 20 |
| 2000–2249 | 0 | 20 |
| 2250–2500 | 0 | 20 |
| Total | 121 | 200 |

The live ladder first runs out of verified positions at 1000–1249.
Unlocking beyond that band requires completing its full set of twenty
and meeting the next Elo threshold.

Under first-attempt-only scoring, a player who drops below a level's
minimum after completing every lower puzzle cannot recover Elo by
replaying those lower puzzles. The app shows the Elo requirement and
allows practice in eligible levels.

## Adding verified games

1. Use the [PGN Mentor game collections](https://www.pgnmentor.com/files.html) as game histories. The optional offline `scripts/mine-puzzle-games.py` accepts PGN files and a local UCI engine to prioritize leads.
2. Run `node scripts/verify-puzzle-leads.mjs <category> <leads.jsonl> <verified.json>`. Exalted replays the game and verifies the objective and replies. Suggested moves may order verification but have to pass it.
3. Run `python scripts/estimate-puzzle-levels.py <estimated.json> <verified.json> ...` and `node scripts/publish-puzzle-pool.mjs <estimated.json>`. The offline estimator requires python-chess. The publisher selects up to twenty per band, balancing objectives when the verified supply allows.
4. Run `node tests/puzzles-test.mjs`. It replays the published positions and checks the mate or settled material result.

The source files can include already verified records when extending the
library. Keep their stable IDs so review and solved progress continue to
work.
