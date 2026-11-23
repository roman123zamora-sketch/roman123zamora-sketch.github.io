# Verified puzzle pool

The static index holds each position's stable ID, difficulty estimate, and tactical identity. The website fetches one selected position and its playable line at a time. It can warm up to two nearby positions after the board becomes playable. GitHub Pages serves the same verified files to every player. Seen positions, rating, and the small generated reserve are stored in the player's browser.

Positions come from original legal simulations or recorded games. An individual archived position identifies its PGN Mentor collection and game number. The published data keeps the legal moves leading to each position, the verified line, and the legal destinations at solver steps. Difficulty is an estimate derived from the amount of calculation, competing moves, quiet setups, and defensive replies.

`scripts/build-puzzle-pool.mjs` generates and verifies positions offline. `scripts/import-puzzle-games.mjs` replays games in standard algebraic notation and verifies candidates from competitive positions. `scripts/publish-puzzle-pool.mjs` combines verified outputs, removes duplicate identities, and writes the index and payloads.

Selection uses the exact current rating and a tolerance of 200 points. A miss starts one worker with that same target. Supply above the published range is sparse, especially for long material sequences and deeper forced mates. The browser keeps locally generated verified positions for its own reserve. Updating the shared pool requires publishing another verified batch.

The site's attempt history is browser-local. Difficulty estimates have no population-level calibration yet.

## Browser measurements

A local Chromium comparison used eight matched cases on each version. Each
case used a fresh 390×844 browser context, one of Elo 225 or 600, one of the two
categories, and one of two seeds. The script reloaded the active attempt,
waited three seconds, solved it and measured delivery at the updated rating.
The p95 below is the nearest-rank percentile of eight observations.

| Path | Previous median / p95 | Verified-pool median / p95 |
| --- | --- | --- |
| First playable board | 2,465 / 5,153 ms | 414 / 704 ms |
| Reload with saved active puzzle | 135 / 261 ms | 255 / 346 ms |
| Correct final move to next puzzle | 99 / 1,274 ms | 85 / 104 ms |

The pool served 16 of 16 first and next board requests, with zero foreground
engine searches. The older version's first board spent a median of about
1.7 seconds per search batch in the initial sample. Its startup events took
about 0.15 seconds at the median. Storage reads were under one millisecond.
The first route recorded 38 resource entries on the old version and 37 at
the median on the pooled version, including the rest of the app. In an
instrumented 1510 Checkmate batch, about four seconds of the 4.5-second
budget went to verification. A playable high-rated board was unavailable in
that sample, so it is excluded from the latency table.
