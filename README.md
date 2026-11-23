# Exalted Chess

Exalted Chess is a browser game for standard and four-player chess. The GitHub
Pages version runs the original Luau rules and bots in a browser worker. Bot
matches, profiles, earned pieces, board purchases, and replays work locally.
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
ui/
  site-navigation.js           Tab routing and site-wide event wiring
  match-view.js                Shared interface for both chess modes
  chessboard.js                Board rendering and square interactions
  chess-pieces.js              SVG piece artwork and desktop drag previews
  board-themes.js              Equipped board lookup and interface color tokens
tabs/
  chess.js                     Standard chess tab
  four-player-chess.js         Four-player chess tab
  shop.js                      Board purchases
  inventory.js                 Owned boards and equipping
  profile.js                   Ratings, match history, and replay controls
game/
  session.js                   Browser state, storage, audio, and match commands
  local-worker.js              Browser worker for local matches and replays
  puzzle-prefetch.js           Background puzzle generation for possible rating outcomes
  touch-board.js               Touch dragging
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

The bots search deterministically. The bot rating selector changes search effort.
The default wall-clock ceiling in `game/engine/bot-search.luau` is 220 ms per bot
turn, with a level-dependent depth and node cap. The existing `Bot.choose`
function also accepts optional `timeMs`, `depth`, and `nodes` overrides. Browser
search runs in the match worker, yielding at checkpoints so reset, undo and
leave can invalidate outstanding work.

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

## Puzzles

Practice offers Checkmate and Material. The generator starts every candidate
from the standard opening position and plays varied legal moves guided by
Exalted Chess's own positional evaluator. Candidate analysis runs in a
separate worker. It checks unique mates in one or two moves against every
legal defense. Material puzzles verify all immediate replies and search
capture and promotion exchanges, including all evasions in check. Positions
that exceed the proof budget are discarded. Material verification is bounded
to the verified tactical exchange.

Difficulty is estimated from line length and tactical choices. Generation
prefers the closest verified candidate to the player's rating within the time
budget. Puzzle rating starts at 400. The clean solve reward is the nearest
even integer to `32 × (1 − expected)`, with a minimum of 2, where
`expected = 1 / (1 + 10^((difficulty − rating) / 400))`. One wrong move halves
the reward, two wrong moves cost half the reward, and three cost the full
reward. Skip, hints, and revealing the solution are rating-neutral. The
first hint highlights the piece and the second adds its destination. See
solution gives written instructions for playing the moves yourself. Rating
stays between 100 and 2400.

While a puzzle is active, workers prepare candidates for up to five possible
resulting ratings. Only the matching candidate is used and the rest are
discarded. If that candidate is still being verified, the game waits for
verification and can retry generation. A solve stops on the player’s final
move, then advances automatically.

Browser storage holds the rating, selected category, generator seed, up to
128 recent fingerprints, and the active puzzle with its exact progress. It
stores no puzzle archive and does not sync across devices. Solving, failing,
or skipping clears the active record.

```sh
node tests/puzzles-test.mjs
```
