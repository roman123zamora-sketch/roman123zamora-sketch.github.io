"""Rank already verified puzzles for the ten published levels.

Difficulty is a curriculum estimate from calculation length, credible defenses,
and visibility. This step never treats an engine score as a human Elo rating.
Supply the existing published records first to keep stable progress where
their previous band still has room and fits the puzzle's calculation demand.
"""
import argparse
from collections import Counter
import json
from pathlib import Path

import chess

BANDS = [(200, 399), (400, 599), (600, 799), (800, 999), (1000, 1249),
         (1250, 1499), (1500, 1749), (1750, 1999), (2000, 2249), (2250, 2500)]
CATEGORIES = ("checkmate", "material", "positional")


def board_key(puzzle):
    return puzzle["fen"].split()[0]


def uci(item):
    return item["from"] + item["to"] + item.get("promotion", "").lower()


def complexity(puzzle):
    board = chess.Board(puzzle["fen"])
    line = [chess.Move.from_uci(uci(item)) for item in puzzle["line"]]
    move = line[0]
    forcing = sum(board.is_capture(option) or board.gives_check(option) for option in board.legal_moves)
    quiet = not board.is_capture(move) and not board.gives_check(move)
    board.push(move)
    defenses = board.legal_moves.count()
    turns = (len(line) + 1) // 2
    if puzzle["category"] == "positional":
        theme_weight = {"outpost": 2, "pawn-break": 4, "minor-piece-trade": 6, "pawn-restraint": 1}
        return puzzle["complexity"] + theme_weight.get(puzzle["theme"], 0)
    if puzzle["category"] == "checkmate":
        return 18 * (turns - 1) + min(8, forcing) + min(6, defenses) + 7 * quiet
    return puzzle.get("complexity", (turns - 1) * 11 + 5 * quiet + min(8, forcing)) + min(5, defenses / 8)


def pin_retained(puzzles, category):
    pinned = [[] for _ in BANDS]
    for band, (low, high) in enumerate(BANDS):
        compatible = [puzzle for puzzle in puzzles if puzzle["category"] == category and
                      low <= puzzle["difficulty"] <= high]
        # Existing published ratings remain valid estimates. Cap the old
        # quota where one objective previously crowded out the others.
        pinned[band] = compatible[:10]
    return pinned


def choose_nearby(remaining, count, target, band, category, hard):
    if count <= 0:
        return []
    result = []
    themes = Counter()
    for _ in range(count):
        if not remaining:
            break
        def distance(item):
            value, puzzle = item
            return (abs(value - target) + themes[puzzle.get("theme")] * 2.75,
                    -int(bool(puzzle.get("alternative")) and band >= 6))
        eligible = remaining
        if category == "checkmate":
            goal = 1 if band < 2 else 2 if band < 5 else 3
            if hard:
                goal = max(goal, 3)
            pool = [item for item in remaining if (len(item[1]["line"]) + 1) // 2 >= goal]
            # Favor the required depth. Report shortages instead of treating
            # trivial mate-in-one positions as difficult puzzles.
            eligible = pool or ([] if band >= 5 else remaining)
        elif category == "material" and band >= 5:
            pool = [item for item in remaining if len(item[1]["line"]) >= 3]
            eligible = pool or ([] if band >= 8 else remaining)
        elif category == "positional" and band == 0:
            eligible = [item for item in remaining if item[1]["theme"] in
                        {"open-file", "weak-pawn", "knight-activity", "bishop-activity", "king-activity"}]
        if not eligible:
            break
        selected = min(eligible, key=distance)
        remaining.remove(selected)
        result.append(selected[1])
        themes[selected[1].get("theme")] += 1
    return result


def curate(existing, candidates):
    chosen = []
    published_ids = {item["id"] for item in existing}
    all_records = {}
    used_positions = set()
    for puzzle in [*existing, *candidates]:
        if puzzle["id"] not in all_records and board_key(puzzle) not in used_positions:
            all_records[puzzle["id"]] = puzzle
            used_positions.add(board_key(puzzle))
    for category in CATEGORIES:
        pinned = pin_retained(existing, category)
        retained = {puzzle["id"] for deck in pinned for puzzle in deck}
        remaining = sorted(((complexity(puzzle), puzzle) for puzzle in all_records.values()
                            if puzzle["category"] == category and puzzle["id"] not in retained),
                           key=lambda item: (item[0], item[1]["id"]))
        if not remaining:
            chosen.extend(puzzle for deck in pinned for puzzle in deck)
            continue
        # Reserve difficult verified records for the upper levels before
        # choosing approachable examples. Use independent complexity ranks,
        # and keep quieter or more branching examples toward the top.
        baselines = [remaining[round(index * (len(remaining) - 1) / 9)][0] for index in range(10)]
        for band in reversed(range(10)):
            low, high = BANDS[band]
            missing = 10 - len(pinned[band])
            new = choose_nearby(remaining, missing, baselines[band], band, category, band >= 7)
            new.sort(key=complexity)
            for i, item in enumerate(new):
                puzzle = dict(item)
                rank = (i + 1) / (len(new) + 1)
                puzzle["difficulty"] = low + 5 * round((high - low - 4) * rank / 5)
                puzzle["estimatedComplexity"] = complexity(item)
                if item["id"] in published_ids:
                    puzzle["previousDifficulty"] = item["difficulty"]
                chosen.append(puzzle)
            chosen.extend(pinned[band])
    return chosen


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("existing", type=Path)
    parser.add_argument("proofs", type=Path, nargs="+")
    args = parser.parse_args()
    existing = json.loads(args.existing.read_text())
    candidates = [puzzle for path in args.proofs for puzzle in json.loads(path.read_text())]
    args.output.write_text(json.dumps(curate(existing, candidates)))
