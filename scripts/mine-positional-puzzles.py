"""Curate one-decision positional puzzles from PGN Mentor games with offline UCI analysis."""
import argparse
from collections import Counter
from pathlib import Path
import json
import random

import chess
import chess.engine

from runpy import run_path

helpers = run_path(str(Path(__file__).with_name("mine-puzzle-games.py")))
balance, read_games = helpers["balance"], helpers["read_games"]

FILES = chess.FILE_NAMES
PIECES = {chess.KNIGHT: "knight", chess.BISHOP: "bishop", chess.ROOK: "rook", chess.KING: "king"}
CENTER = chess.SquareSet((chess.BB_D4 | chess.BB_E4 | chess.BB_D5 | chess.BB_E5))


def relative_rank(square, side):
    return chess.square_rank(square) if side else 7 - chess.square_rank(square)


def file_pawns(board, side, file):
    return board.pieces(chess.PAWN, side) & chess.BB_FILES[file]


def mobility(board, square, side):
    return len(board.attacks(square) - chess.SquareSet(board.occupied_co[side]))


def durable_outpost(board, square, side):
    file = chess.square_file(square)
    rank = relative_rank(square, side)
    support = any(board.piece_type_at(s) == chess.PAWN for s in board.attackers(side, square))
    return support and 3 <= rank <= 5 and not any(
        relative_rank(pawn, side) > rank
        for neighbor in (file - 1, file + 1) if 0 <= neighbor < 8
        for pawn in file_pawns(board, not side, neighbor)
    )


def details(before, after, move):
    side = before.turn
    start, end = move.from_square, move.to_square
    role = before.piece_type_at(start)
    file = chess.square_file(end)
    victim = before.piece_type_at(end)
    if victim:
        if (role in (chess.BISHOP, chess.KNIGHT) and victim in (chess.BISHOP, chess.KNIGHT)
                and len(before.attacks(end) & CENTER) >= 2 and after.is_attacked_by(not side, end)):
            return ("minor-piece-trade", chess.square_name(end))
        return None
    if role == chess.ROOK and file != chess.square_file(start) and mobility(after, end, side) >= 5:
        own = file_pawns(after, side, file)
        enemy = file_pawns(after, not side, file)
        if not own and not enemy:
            return ("open-file", FILES[file])
        if not own and len(enemy) == 1 and next(iter(enemy)) in after.attacks(end):
            return ("weak-pawn", chess.square_name(next(iter(enemy))))
    if role == chess.KNIGHT:
        if durable_outpost(after, end, side) and not durable_outpost(before, start, side):
            return ("outpost", chess.square_name(end))
        if mobility(after, end, side) >= mobility(before, start, side) + 2 and (
                len(after.attacks(end) & CENTER) > len(before.attacks(start) & CENTER)):
            return ("knight-activity", chess.square_name(start))
    if role == chess.BISHOP:
        if mobility(after, end, side) >= mobility(before, start, side) + 3 and (
                len(after.attacks(end) & CENTER) > len(before.attacks(start) & CENTER)):
            return ("bishop-activity", chess.square_name(start))
    if role == chess.KING and not before.queens and not before.rooks:
        targets = list(before.pieces(chess.PAWN, not side))
        if targets:
            closest = min(targets, key=lambda pawn: (chess.square_distance(start, pawn), pawn))
            if chess.square_distance(end, closest) < chess.square_distance(start, closest):
                return ("king-activity", chess.square_name(closest))
    if role == chess.PAWN:
        if 3 <= relative_rank(end, side) <= 4:
            for target in after.attacks(end) & before.pieces(chess.PAWN, not side):
                if end in before.attacks(target) and mobility(before, target, not side) > 0:
                    return ("pawn-break", chess.square_name(target))
        enemy_passers = [square for square in before.pieces(chess.PAWN, not side)
                         if relative_rank(square, not side) >= 3]
        for pawn in enemy_passers:
            ahead = pawn + (8 if not side else -8)
            if ahead in after.attacks(end) and ahead not in before.attacks(start):
                return ("pawn-restraint", chess.square_name(pawn))
    return None


def objective(board, move, motif):
    theme, target = motif
    destination = chess.square_name(move.to_square)
    difference = mobility_position(board, move)
    return {
        "open-file": (
            f"Put a rook on the open {target}-file.",
            f"The rook on {destination} controls the open {target}-file. With no pawns on that file, it can pressure entry squares from a distance."),
        "weak-pawn": (
            f"Use a rook on a half-open file to put direct pressure on the {target} pawn.",
            f"The rook on {destination} attacks {target} down a file with no friendly pawns in the way. The opponent has to account for that pressure."),
        "outpost": (
            f"Settle a knight on a pawn-supported post that enemy pawns cannot drive it from.",
            f"The knight on {destination} has pawn support. No enemy pawn on an adjacent file can advance to chase it away."),
        "knight-activity": (
            f"Improve the knight on {target} so it has more room and controls more central squares.",
            f"The knight on {destination} has {difference} more available squares and controls more of d4, e4, d5 and e5."),
        "bishop-activity": (
            f"Give the restricted bishop on {target} more room and greater control of the center.",
            f"The bishop on {destination} has {difference} more available squares and bears on more of d4, e4, d5 and e5."),
        "king-activity": (
            f"Activate your king by bringing it closer to the pawn on {target}.",
            f"The king on {destination} is a step closer to {target}. With the queens and rooks off the board, the king can help fight for the pawn."),
        "minor-piece-trade": (
            f"Exchange a minor piece to remove the active opposing piece on {target}.",
            f"The exchange on {target} takes an opposing minor piece off several central squares. The verified recapture trades a minor piece for a minor piece."),
        "pawn-break": (
            f"Challenge the opposing pawn on {target} with a pawn break.",
            f"The pawn on {destination} directly challenges {target}. The opponent can exchange, advance the pawn if safe, or maintain the tension."),
        "pawn-restraint": (
            f"Use a pawn to contest the square in front of the opposing pawn on {target}.",
            f"The pawn on {destination} controls the square in front of {target}. An advance now has to account for a capture.")
    }[theme]


def mobility_position(board, move):
    before = mobility(board, move.from_square, board.turn)
    after = board.copy(stack=False)
    after.push(move)
    return mobility(after, move.to_square, board.turn) - before


def score(entry, side):
    return entry["score"].pov(side).score(mate_score=100000)


def move_data(move):
    result = {"from": chess.square_name(move.from_square), "to": chess.square_name(move.to_square)}
    if move.promotion:
        result["promotion"] = chess.piece_symbol(move.promotion).upper()
    return result


def holds(board, move, after_reply, motif):
    kind, target = motif
    end, side = move.to_square, board.turn
    if kind == "minor-piece-trade":
        return after_reply.piece_at(end) != board.piece_at(end)
    if kind == "pawn-break":
        pawn = chess.parse_square(target)
        return (after_reply.piece_at(pawn) is None or
                (after_reply.piece_type_at(end) == chess.PAWN and pawn in after_reply.attacks(end)))
    if after_reply.piece_at(end) != board.piece_at(move.from_square):
        return False
    if kind == "open-file":
        file = chess.square_file(end)
        return not file_pawns(after_reply, side, file) and not file_pawns(after_reply, not side, file)
    if kind == "weak-pawn":
        square = chess.parse_square(target)
        return square in after_reply.attacks(end) and after_reply.piece_at(square) == chess.Piece(chess.PAWN, not side)
    if kind == "outpost":
        return durable_outpost(after_reply, end, side)
    if kind.endswith("-activity") and kind != "king-activity":
        start = move.from_square
        return (mobility(after_reply, end, side) >= mobility(board, start, side) + 2
                and len(after_reply.attacks(end) & CENTER) > len(board.attacks(start) & CENTER))
    if kind == "king-activity":
        return bool(after_reply.pieces(chess.PAWN, not side))
    pawn = chess.parse_square(target)
    return (after_reply.piece_at(pawn) == chess.Piece(chess.PAWN, not side)
            and pawn + (-8 if side else 8) in after_reply.attacks(end))


def verify(engine, board, candidate, motif, matching, material, baseline, depth):
    owner = board.turn
    safe = []
    rejected = None
    for move in matching:
        child = board.copy()
        child.push(move)
        replies = engine.analyse(child, chess.engine.Limit(depth=depth), multipv=3)
        worst = min(score(reply, owner) for reply in replies)
        # Allow equivalent moves. A clearance within the ordinary noise of the
        # evaluation is insufficient grounds for rejecting a qualifying move.
        if worst < max(-110, baseline - 65) or worst > 400:
            line = replies[0]["pv"][:6]
            end = child.copy()
            for continuation in line:
                end.push(continuation)
            if line and worst < -90 and balance(end, owner) <= material - 175:
                rejected = {
                    "move": move_data(move),
                    "line": [move_data(item) for item in [move, *line]],
                    "explanation": (
                        f"{board.san(move)} looks like it would meet the objective. "
                        f"After {board.variation_san([move, line[0]])}, "
                        "the verified continuation loses material."
                    ),
                }
            continue
        relevant = [reply for reply in replies if score(reply, owner) <= worst + 55]
        evidence = []
        for reply in relevant:
            line = reply["pv"][:6]
            after = child.copy()
            after.push(line[0])
            if not holds(board, move, after, motif):
                break
            for continuation in line[1:]:
                after.push(continuation)
            if abs(balance(after, owner) - material) >= 175 or after.is_checkmate():
                break
            evidence.append({"reply": move_data(line[0]), "line": [move_data(m) for m in line],
                             "score": score(reply, owner)})
        else:
            if motif[0] == "minor-piece-trade" and relevant[0]["pv"][0].to_square != move.to_square:
                continue
            safe.append({"move": move_data(move), "replies": evidence, "score": worst,
                         "explanation": objective(board, move, motif)[1]})
    return (safe if any(option["move"] == move_data(candidate) for option in safe) else []), rejected


def proposals(engine, board, ply, themes):
    owner = board.turn
    material = balance(board, owner)
    if board.is_check() or board.can_claim_draw() or abs(material) >= 600:
        return
    candidates = {}
    for move in board.legal_moves:
        if board.gives_check(move) or board.is_castling(move) or move.promotion:
            continue
        after = board.copy(stack=False)
        after.push(move)
        motif = details(board, after, move)
        if motif and (not themes or motif[0] in themes):
            candidates[move] = motif
    if not candidates:
        return
    fast = engine.analyse(board, chess.engine.Limit(nodes=1800), multipv=3)
    baseline = score(fast[0], owner)
    if not -90 <= baseline <= 320:
        return
    for index, entry in enumerate(fast):
        candidate = entry["pv"][0]
        if candidate not in candidates or score(entry, owner) < baseline - 38:
            continue
        motif = candidates[candidate]
        matching = [
            move for move, idea in candidates.items()
            if idea == motif or motif[0] == idea[0] == "outpost"
        ]
        if len(matching) > 4:
            continue
        deep = engine.analyse(board, chess.engine.Limit(depth=12), multipv=4)
        baseline = score(deep[0], owner)
        if not -100 <= baseline <= 350:
            continue
        options, alternative = verify(engine, board, candidate, motif, matching, material, baseline, 12)
        if not options:
            continue
        # Include a specific, legal rejected plan when a close alternative
        # misses the stated objective.
        challengers = [alt for alt in deep if alt["pv"][0] not in matching
                       and score(alt, owner) >= baseline - 90]
        if challengers and not alternative:
            line = challengers[0]["pv"][:4]
            alt = line[0]
            alternative = {
                "move": move_data(alt), "line": [move_data(m) for m in line],
                "explanation": f"{board.san(alt)} does not achieve the stated objective. The illustrative reply is {board.variation_san(line[:2])}.",
            }
        complexity = (len(challengers) * 3 + sum(len(option["replies"]) for option in options)
                      + index + min(4, ply // 18) + len(candidates) / 3)
        yield {"theme": motif[0], "objective": objective(board, candidate, motif)[0],
               "explanation": objective(board, candidate, motif)[1],
               "first": move_data(candidate), "options": options, "alternative": alternative,
               "complexity": complexity, "verification": {"engine": engine.id["name"], "depth": 12}}
        return


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("engine")
    cli.add_argument("output", type=Path)
    cli.add_argument("archives", type=Path, nargs="+")
    cli.add_argument("--themes", nargs="+")
    cli.add_argument("--limit", type=int, default=210)
    cli.add_argument("--shard", type=int, default=0)
    cli.add_argument("--shards", type=int, default=1)
    args = cli.parse_args()
    seen = set()
    themes = Counter()
    with chess.engine.SimpleEngine.popen_uci(args.engine) as engine, args.output.open("w") as output:
        engine.configure({"Threads": 1, "Hash": 24})
        for collection, number, game in read_games(args.archives)[args.shard::args.shards]:
            board = game.board()
            history = []
            # At most two positions per game, with a different concept.
            game_themes = set()
            for ply, played in enumerate(game.mainline_moves()):
                key = board.board_fen()
                if ply >= 15 and ply % 5 == 0 and key not in seen and len(game_themes) < 2:
                    seen.add(key)
                    for item in proposals(engine, board, ply, args.themes):
                        theme = item["theme"]
                        if theme in game_themes or themes[theme] >= args.limit * .34:
                            continue
                        item.update(fen=board.fen(en_passant="fen"), history=history,
                                    source={"archive": "PGN Mentor", "collection": collection.removeprefix("exalted-"), "game": number})
                        output.write(json.dumps(item) + "\n")
                        output.flush()
                        game_themes.add(theme)
                        themes[theme] += 1
                        if themes.total() >= args.limit:
                            return
                history.append(board.san(played))
                board.push(played)


if __name__ == "__main__":
    main()
