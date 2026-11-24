# Exalted Chess

Exalted Chess is a browser game for standard and four-player chess. The GitHub
Pages version runs the original Luau rules and bots in a browser worker. Bot
matches, profiles, earned pieces, board purchases, and replays work locally.
In bot games, Hint highlights a suggested move on your turn. During an
opponent’s turn, drag your pieces to queue premoves. A click clears the queue.
Each premove is checked against the actual board when your turn starts.

Equipping an owned board changes the site palette, along with boards in matches
and replays. Classic restores the default blue-and-white design.

## Project layout

```text
index.html                     GitHub Pages entry point and shared navigation markup
assets/
  favicon.svg                  Browser tab icon
styles/
  site.css                     Stylesheet entry point
  base.css                     Shared colors, layouts, navigation, and controls
  board.css                    Squares, coordinates, pieces, and move indicators
  match.css                    Match controls, ratings, clocks, and move history
  collection.css               Shop, board collection, profile, and replay layouts
  learn.css                    Course cards, diagrams, and practice controls
ui/
  site-navigation.js           Tab routing and site-wide event wiring
  match-view.js                Shared interface for both chess modes
  chessboard.js                Board rendering and square interactions
  chess-pieces.js              SVG piece artwork
  board-themes.js              Equipped board lookup and interface color tokens
tabs/
  chess.js                     Standard chess tab
  four-player-chess.js         Four-player chess tab
  shop.js                      Board purchases
  inventory.js                 Owned boards and equipping
  profile.js                   Ratings, match history, and replay controls
  learn.js                     Interactive course and saved progress
  learn-lessons.js             Course modules, positions, and exercises
  puzzles.js                   Rated practice and solution review
game/
  session.js                   Browser state, storage, audio, and match commands
  local-worker.js              Browser worker for local matches and replays
  position-worker.js           Browser worker for evaluation, lessons, and puzzles
  puzzle-progress.js           Browser-local puzzle progress and rating
  puzzle-library.js            Difficulty bands and rated selection
  puzzle-pool.js               Published index, payloads, and freshness
  board-drag.js                Pointer-based piece dragging
  luau-runtime.js              Loads Luau modules and exchanges data with JavaScript
  web-adapter.luau             Browser and server bridge to the original game modules
  match-service.luau           Match lifecycle, rewards, profiles, and matchmaking
  board-catalog.luau           Board names, prices, square colors, and UI palettes
  rules/
    standard-chess.luau        Standard rules and draw conditions
    four-player-chess.luau     Four-player rules
  engine/
    bot-search.luau            Original bot search and position evaluation
  vendor/
    luau-web.js                Vendored Luau Web loader
    LICENSE                    Luau Web license
    lib/
      luau-asyncify.js          Luau Web fallback runtime
      luau-jspi.js              Luau Web runtime for browsers with JSPI support
server/
  match-server.mjs             Optional multiplayer HTTP service
tests/
  match-admission-test.mjs     Checks seat assignment and stale move validation
  engine-search-test.mjs       Checks bot legality, terminal states, and both modes
  engine-benchmark.mjs         Runs color-swapped standard games against a Git revision
  standard-chess-test.mjs      Runs the rules tests through the Luau runtime
  standard-chess-cases.luau    Positions and assertions for the rules tests
  puzzles-test.mjs             Tactical proofs, puzzle rating, and save recovery
  learn-course-test.mjs        Course diagrams, rule checks, and legal solutions
reference/
  roblox-client.luau           Original Roblox client retained for reference
```

## Run locally

Serve the repository root with any static HTTP server. For example:

```sh
python -m http.server 8080
```

Open `http://localhost:8080/`. Use Node.js 22 or newer to run the rules tests:

```sh
node tests/standard-chess-test.mjs
node tests/match-admission-test.mjs
node tests/engine-search-test.mjs
node tests/puzzles-test.mjs
```

## Online matches

GitHub Pages supports untimed bot matches and browser-local profiles. Online
opponents, matchmaking, timed online games, and shared profiles require the
optional service. Start it with Node.js 22 or newer:

```sh
node server/match-server.mjs
```

The service also serves the website. `PORT` sets the listening port, which
defaults to 8080. `EXALTED_DATA` sets the persistent JSON file, which defaults to
`~/.exalted-chess/profiles.json`. Store it on a persistent volume outside the
document root, and place the service behind HTTPS for public access.

To keep using GitHub Pages with a separately hosted service, set the
`exalted-server` meta tag in `index.html` to the service's HTTPS URL ending in
`/api`. Set `EXALTED_SITE_ORIGIN` on the service to the Pages origin without a
trailing slash.

The browser uses authenticated HTTP polling at `/api/events`. A refresh or
short network interruption can resume the current match with the same browser
session. After 30 seconds of inactivity the server treats the player as having
disconnected. Live matches are held in memory and end if the service restarts.
The persistent file stores player profiles and results.

## Engine limits and comparison

The bot selector offers 200 through 3000 in 200-point steps, plus Max.
The numbers are intended difficulty settings. They have no measured human
Elo calibration. Beginner bots weigh immediately visible captures, checks
and threats against shallow search. Higher levels calculate more replies
and become less willing to give up an advantage. From 1800 upward, bots
choose the strongest move from their last completed search.
Max uses the same original engine with a larger search budget. In the
browser, 3000 has a 900 ms search budget and Max has 1650 ms. No endgame
tablebases are configured. Puzzle and review analysis retain their own limits.
Browser search yields in the match worker so reset, undo and leaving can
invalidate outstanding work.

Run `node tests/bot-ladder-benchmark.mjs` for a tactical check and reduced-budget
adjacent-level games with colors swapped. Pass `--production` to use actual
bot budgets for the games.

To compare standard-chess search against the previous implementation, use a
checkout with commit `e4b8329` available:

```sh
node tests/engine-benchmark.mjs e4b8329 1000
node tests/engine-benchmark.mjs e4b8329 2400
```

Each run uses four starting positions, swaps colors, gives both engines a 60 ms
search ceiling and reports games unfinished at 120 plies separately. Timings
include small deadline-check overshoots and vary by machine. Results describe
this sample only.

## Game review

Finished matches offer a rematch and a move-by-move review. In standard
chess, review reconstructs the position after each move and uses the original
engine to estimate how the balance changed. Show best move highlights the
engine’s recommendation for the side to move. Standard matches opened from
Profile history also show the evaluation bar. During live play, the evaluation
bar is available only in standard bot games. Four-player review uses recorded
board positions. Online New Game queues for a different opponent through the
optional match server.

## Learn

Chess Foundations is an eleven-module course for standard chess. Practice
boards use the same move and attack rules as the main game. Course progress
is stored in the current browser and lessons can be revisited individually.

```sh
node tests/learn-course-test.mjs
```

## Puzzles

Puzzles uses a pre-verified ladder through 2500 Elo. Players complete the
lower levels and meet the next level's Elo requirement to unlock it. The
level list shows progress and lock reasons. After a solve, the next
eligible position opens automatically. After a loss, the same position
remains open in practice.

The browser commits the outcome, rating, and attempt state together. The
new progression storage key starts returning players at 400 once and
leaves their legacy record available in browser storage. Rated credit is
available on the first completed attempt in the player's Elo band.
Lower-band attempts and replays leave Elo unchanged.

See [the library documentation](assets/puzzles/README.md) for publishing,
current coverage, and gaps.

```sh
node tests/puzzles-test.mjs
```
