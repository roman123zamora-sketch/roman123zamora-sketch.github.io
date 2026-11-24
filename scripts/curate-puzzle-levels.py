"""Fill tactical quotas using offline-verified positions and retain existing levels."""
import argparse
import json
from pathlib import Path
from statistics import median

import chess

BANDS = [(200, 399), (400, 599), (600, 799), (800, 999), (1000, 1249),
         (1250, 1499), (1500, 1749), (1750, 1999), (2000, 2249), (2250, 2500)]
CATEGORIES = ("checkmate", "material")
QUOTA = 15


def board_key(puzzle):
    return puzzle["fen"].split()[0]


def complexity(puzzle):
    board = chess.Board(puzzle["fen"])
    first = puzzle["line"][0]
    move = chess.Move.from_uci(first["from"] + first["to"] + first.get("promotion", "").lower())
    forcing = sum(board.is_capture(option) or board.gives_check(option) for option in board.legal_moves)
    quiet = not board.is_capture(move) and not board.gives_check(move)
    board.push(move)
    defenses = board.legal_moves.count()
    turns = (len(puzzle["line"]) + 1) // 2
    if puzzle["category"] == "checkmate":
        return 18 * (turns - 1) + min(8, forcing) + min(6, defenses) + 7 * quiet
    return puzzle.get("complexity", (turns - 1) * 11 + 5 * quiet + min(8, forcing)) + min(5, defenses / 8)


def curate(existing, candidates):
    retained = [puzzle for puzzle in existing if puzzle["category"] in CATEGORIES]
    chosen = list(retained)
    known_ids = {puzzle["id"] for puzzle in existing}
    known_boards = {board_key(puzzle) for puzzle in existing}
    known_ideas = {puzzle["idea"] for puzzle in existing if puzzle.get("idea")}
    reserve = {category: [] for category in CATEGORIES}
    for puzzle in candidates:
        category = puzzle["category"]
        if category not in CATEGORIES:
            continue
        idea = puzzle.get("idea")
        if puzzle["id"] in known_ids or board_key(puzzle) in known_boards or idea in known_ideas:
            continue
        known_ids.add(puzzle["id"])
        known_boards.add(board_key(puzzle))
        if idea:
            known_ideas.add(idea)
        reserve[category].append((complexity(puzzle), puzzle))

    for category, options in reserve.items():
        for band in reversed(range(len(BANDS))):
            low, high = BANDS[band]
            existing_band = [puzzle for puzzle in retained
                             if puzzle["category"] == category and low <= puzzle["difficulty"] <= high]
            target = median(map(complexity, existing_band))
            missing = QUOTA - len(existing_band)
            eligible = [item for item in options if (
                band < 8 or len(item[1]["line"]) >= (5 if category == "checkmate" else 3)
            ) and (
                category != "checkmate" or band < 2 or len(item[1]["line"]) >= 3
            )]
            closest = sorted(eligible, key=lambda item: (abs(item[0] - target), -item[0], item[1]["id"]))[:missing]
            for rank, (score, puzzle) in enumerate(sorted(closest, key=lambda item: (item[0], item[1]["id"])), 1):
                options.remove((score, puzzle))
                difficulty = low + 5 * round((high - low - 4) * rank / ((missing + 1) * 5))
                chosen.append({**puzzle, "difficulty": difficulty, "estimatedComplexity": score})
            print(category, low, len(existing_band) + len(closest), "of", QUOTA)
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
