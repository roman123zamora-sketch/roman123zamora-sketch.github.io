# Exalted Chess

The website runs the Roblox chess, four-player, bot, theme, and match-service Luau
in a web runtime. The Roblox client source is included in `game/roblox/`. Its
interface is implemented for the web in `tabs/`, with shared match controls in
`Match Layout.js` and the web piece art in `Chess Pieces.js`.

## Static site

Serve the repository with any HTTP server. On GitHub Pages, both chess modes
support untimed bot games. Tap or click a piece and its highlighted destination,
or drag it directly. Profiles, earned pieces, board purchases, equipped boards,
and replays are stored in the current browser. Online play and shared profiles
require the service below.

The live site uses the original Luau engine and runs bot searches in a browser
worker. The extensionless Chess Board, Chess Engine, and Chess Rules files are
earlier prototypes. To run the active standard-chess rule checks locally:

```sh
node tests/chess-rules.mjs
```

## Online matches

Run the included Node.js service with Node 22 or newer.

```sh
node server/start.mjs
```

The service serves the website on port 8080 by default and enables matchmaking,
direct challenges, clocks, rematches, and server-side profiles. `PORT` sets the
listening port. `EXALTED_DATA` sets the persistent JSON file, which defaults to
`~/.exalted-chess/profiles.json`. Keep the profile file on a persistent volume
outside the document root and put the service behind HTTPS for public access.

To keep using the GitHub Pages frontend with a separately hosted service, set
the `exalted-server` meta tag in `index.html` to the service's HTTPS URL ending
in `/api`. Set `EXALTED_SITE_ORIGIN` on the service to the Pages origin, without
a trailing slash.
