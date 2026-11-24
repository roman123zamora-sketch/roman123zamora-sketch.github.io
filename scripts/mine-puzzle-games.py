"""Find tactical leads in standard-start game archives for offline verification.

Requires python-chess and a local UCI engine. The engine ranks leads only.
Pass the resulting JSONL to verify-puzzle-leads.mjs before publication.
"""
import argparse
import json
from pathlib import Path
import random

import chess
import chess.engine
import chess.pgn

VALUES = [0, 100, 310, 330, 500, 900, 0]


def balance(board, side):
    return sum(VALUES[piece.piece_type] * (1 if piece.color == side else -1)
               for piece in board.piece_map().values())


def read_games(paths):
    records = []
    for path in paths:
        with path.open(encoding="utf8", errors="replace") as archive:
            number = 0
            while game := chess.pgn.read_game(archive):
                number += 1
                if not game.errors and game.board().fen() == chess.Board().fen():
                    records.append((path.name, number, game))
    random.Random(24).shuffle(records)
    return records


def leads(engine, category, collection, number, game):
    board = game.board()
    moves = list(game.mainline_moves())
    history = []
    for ply, played in enumerate(moves):
        initial = balance(board, board.turn)
        if (ply >= 15 and (ply >= len(moves) - 12 or ply % 5 == 0)
                and -900 < initial < 850 and len(board.piece_map()) >= 10):
            tactical = sum(board.is_capture(move) or board.gives_check(move)
                           for move in board.legal_moves)
            if tactical >= (1 if category == "checkmate" else 2):
                analysis = engine.analyse(board, chess.engine.Limit(
                    nodes=2100 if category == "checkmate" else 1100))
                score = analysis["score"].relative
                line = analysis.get("pv", [])
                mate = score.mate()
                eligible_mate = category == "checkmate" and mate is not None and 1 <= mate <= 5
                eligible_material = (category == "material" and mate is None
                                     and 150 <= score.score() <= 850 and len(line) >= 2)
                if eligible_mate or eligible_material:
                    copy = board.copy()
                    max_gain = 0
                    for move in line[:9]:
                        copy.push(move)
                        max_gain = max(max_gain, balance(copy, board.turn) - initial)
                    if eligible_mate or max_gain >= 175:
                        yield {
                            "source": {"archive": "PGN Mentor", "collection": collection, "game": number},
                            "fen": board.fen(en_passant="fen"), "history": list(history),
                            "pv": [move.uci() for move in line[:12]], "mate": mate,
                            "score": score.score(), "gain": max_gain,
                        }
        history.append(board.san(played))
        board.push(played)


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("category", choices=["checkmate", "material"])
    cli.add_argument("engine")
    cli.add_argument("output", type=Path)
    cli.add_argument("archives", type=Path, nargs="+")
    cli.add_argument("--games", type=int, default=250)
    args = cli.parse_args()
    with chess.engine.SimpleEngine.popen_uci(args.engine) as engine:
        engine.configure({"Threads": 1, "Hash": 24})
        with args.output.open("w", encoding="utf8") as output:
            for collection, number, game in read_games(args.archives)[:args.games]:
                for candidate in leads(engine, args.category, collection, number, game):
                    output.write(json.dumps(candidate) + "\n")
                output.flush()
