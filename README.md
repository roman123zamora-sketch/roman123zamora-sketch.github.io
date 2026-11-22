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
  boards.js                    Owned boards and equipping
  profile.js                   Ratings, match history, and replay controls
game/
  session.js                   Browser state, storage, audio, and match commands
  local-worker.js              Browser worker for local matches and replays
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
