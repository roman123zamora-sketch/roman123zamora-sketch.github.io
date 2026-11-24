"""Review archived tactical leads with a local UCI engine before legal replay.

The root move and opponent replies are compared twice with independent search
limits. Check the net balance at the end of each serious defensive variation.
"""
import argparse
import json
from pathlib import Path
from runpy import run_path

import chess
import chess.engine

balance = run_path(str(Path(__file__).with_name("mine-puzzle-games.py")))["balance"]


def move_data(move):
    result = {"from": chess.square_name(move.from_square), "to": chess.square_name(move.to_square)}
    if move.promotion:
        result["promotion"] = chess.piece_symbol(move.promotion).upper()
    return result


def score(entry, side):
    return entry["score"].pov(side).score(mate_score=100000)


def settled(board, root, continuation, owner, initial, minimum):
    """Return the first completed exchange that preserves gain to the horizon."""
    board = board.copy()
    line = [root, *continuation]
    states = []
    peak_loss = 0
    for move in line:
        board.push(move)
        change = balance(board, owner) - initial
        peak_loss = max(peak_loss, -change)
        states.append((change, balance(board, owner)))
    if len(states) < 4:
        return
    for index, (gain, total) in enumerate(states[:-2]):
        if index % 2 or gain < minimum or total < 100:
            continue
        if any(later < gain for later, _ in states[index + 1:]):
            continue
        return gain, line[:index + 1], peak_loss
    return None


def inspect(engine, lead):
    board = chess.Board(lead["fen"])
    owner = board.turn
    moves = list(board.legal_moves)
    initial = balance(board, owner)
    if not -800 < initial < 650 or len(moves) < 3 or len(board.piece_map()) < 10:
        return
    if board.can_claim_draw() or board.is_game_over():
        return
    fast = engine.analyse(board, chess.engine.Limit(nodes=2400), multipv=3)
    first = fast[0]["pv"][0]
    baseline = score(fast[0], owner)
    if not 140 <= baseline <= 820 or score(fast[1], owner) >= baseline - 85:
        return
    if fast[0]["score"].is_mate():
        return
    preview = settled(board, first, fast[0]["pv"][1:], owner, initial, 175)
    if not preview:
        # The preliminary principal variation can be short. Only spend the
        # deeper search when the input game analysis already found a gain.
        if not lead.get("gain", 0) >= 200:
            return
    deep = engine.analyse(board, chess.engine.Limit(depth=13), multipv=4)
    baseline = score(deep[0], owner)
    if deep[0]["pv"][0] != first or not 150 <= baseline <= 1000:
        return
    if score(deep[1], owner) >= baseline - 95:
        return
    child = board.copy()
    child.push(first)
    if child.can_claim_draw():
        return
    replies = engine.analyse(child, chess.engine.Limit(depth=15), multipv=4)
    if not replies:
        return
    worst = score(replies[0], owner)
    if not 120 <= worst < 1500:
        return
    # Include the engine's best defense and alternatives close enough to
    # challenge the same material result. A near-best countercheck is included.
    serious = [reply for reply in replies if score(reply, owner) <= worst + 85 or
               (child.gives_check(reply["pv"][0]) and score(reply, owner) <= worst + 140)]
    results = []
    for reply in serious:
        resolved = settled(board, first, reply["pv"], owner, initial, 175)
        if not resolved:
            return
        gain, line, peak_loss = resolved
        results.append({"gain": gain, "line": line, "peak_loss": peak_loss, "pv": reply["pv"],
                        "score": score(reply, owner)})
    main = results[0]
    goal = min(result["gain"] for result in results)
    # A continuation with a near-equal alternative would need a decision tree.
    # Leave those candidates out until all equal continuations are available.
    position = board.copy()
    for ply, move in enumerate(main["line"]):
        if ply and ply % 2 == 0:
            pair = engine.analyse(position, chess.engine.Limit(depth=11), multipv=2)
            if pair[0]["pv"][0] != move:
                return
            if len(pair) == 2 and score(pair[0], owner) - score(pair[1], owner) < 85:
                return
        position.push(move)
    # Independent tactical complexity. A late defense, quiet start, or initial
    # sacrifice raises the estimated demand beyond counting solver moves.
    quiet = not board.is_capture(first) and not board.gives_check(first)
    tactical = sum(board.is_capture(move) or board.gives_check(move) for move in moves)
    complexity = 11 * (len(main["line"]) // 2) + 5 * quiet + min(8, tactical)
    complexity += 3 * (len(serious) - 1) + min(5, main["peak_loss"] // 100)
    return {"line": [move_data(move) for move in main["line"]], "gain": goal, "complexity": complexity,
            "verification": {"engine": engine.id["name"], "depth": 15, "rootDepth": 13,
                             "replies": [{"score": item["score"], "gain": item["gain"],
                                          "line": [move_data(move) for move in item["pv"]]}
                                         for item in results]}}


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("engine")
    cli.add_argument("output", type=Path)
    cli.add_argument("leads", type=Path, nargs="+")
    cli.add_argument("--limit", type=int, default=150)
    args = cli.parse_args()
    seen = set()
    positions = []
    for source in args.leads:
        if source.suffix == ".json":
            seen.update(puzzle["fen"].split()[0] for puzzle in json.loads(source.read_text()))
            continue
        for text in source.read_text().splitlines():
            lead = json.loads(text)
            key = lead["fen"].split()[0]
            if key not in seen:
                seen.add(key)
                positions.append(lead)
    positions.sort(key=lambda lead: -(lead.get("priority", 0) + lead.get("gain", 0) / 3))
    with chess.engine.SimpleEngine.popen_uci(args.engine) as engine, args.output.open("w") as output:
        engine.configure({"Threads": 1, "Hash": 32})
        count = 0
        for lead in positions:
            proof = inspect(engine, lead)
            if proof:
                proof.update({key: lead[key] for key in ("fen", "history", "source")})
                output.write(json.dumps(proof) + "\n")
                output.flush()
                count += 1
                if count >= args.limit:
                    return


if __name__ == "__main__":
    main()
