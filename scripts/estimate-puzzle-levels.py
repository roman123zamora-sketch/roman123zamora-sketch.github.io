"""Estimate difficulty from verified positions and continuations (offline only).

Requires python-chess for position inspection. Input files must contain verified
puzzles. This step does not certify chess solutions.
"""
import json
import sys

import chess

MATE = [200, 625, 1275, 1650, 1925, 2225, 2425, 2625, 2800, 2900]
MATERIAL = [200, 575, 1190, 1540, 1850, 2200, 2550, 2800]
VALUES = [0, 100, 310, 330, 500, 900, 0]


def balance(board, side):
    return sum(VALUES[piece.piece_type] * (1 if piece.color == side else -1)
               for piece in board.piece_map().values())


def forcing(board, move):
    return board.is_capture(move) or bool(move.promotion) or board.gives_check(move)


def estimate(puzzle):
    board = chess.Board(puzzle["fen"])
    owner = board.turn
    starting_balance = balance(board, owner)
    line = [chess.Move.from_uci(move["from"] + move["to"] + move.get("promotion", "").lower())
            for move in puzzle["line"]]
    turns = (len(line) + 1) // 2
    first = line[0]
    quiet = not forcing(board, first)
    alternatives = max(0, sum(forcing(board, move) for move in board.legal_moves) - 1)
    rich_captures = sum(
        move != first and board.piece_type_at(move.to_square) in
        (chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN)
        for move in board.legal_moves
    )
    branches = 0
    solver_checks = 0
    forcing_reply = sacrifice = False
    for index, move in enumerate(line):
        if not board.is_legal(move):
            raise ValueError(f'Illegal verified move for {puzzle["id"]}')
        if index % 2 == 0 and board.gives_check(move):
            solver_checks += 1
        if index % 2:
            branches += min(5, max(0, board.legal_moves.count() - 1))
        if index == 1:
            forcing_reply = forcing(board, move)
        board.push(move)
        if index == 1:
            sacrifice = balance(board, owner) <= starting_balance - 175

    bonus = min(180, alternatives * 25) + min(250, branches * 30)
    bonus += 150 if quiet else 0
    bonus += 100 if turns >= 2 and sacrifice else 0
    if puzzle["category"] == "checkmate":
        if not board.is_checkmate():
            raise ValueError(f'Unmated verified line for {puzzle["id"]}')
        base = MATE[turns - 1]
        if turns == 3 and branches == 0 and solver_checks == turns and not sacrifice:
            bonus -= 120
        if turns >= 3 and quiet and branches >= 3:
            bonus += 100
        if turns == 1:
            king = board.king(not owner)
            covered = any(
                square != king and chess.square_distance(square, king) == 1
                and not board.color_at(square) == (not owner)
                and any(attacker != first.to_square for attacker in board.attackers(owner, square))
                for square in chess.SQUARES
            )
            bonus = min(310, alternatives * 32) + (35 if covered and alternatives >= 4 else 0)
    else:
        if balance(board, owner) < max(100, starting_balance + puzzle["gain"]):
            raise ValueError(f'Unsettled verified trade for {puzzle["id"]}')
        base = MATERIAL[turns - 1] + (100 if quiet else 0)
        if turns == 1:
            bonus = min(205, rich_captures * 70) + (125 if forcing_reply else 0)
            bonus += min(140, max(0, alternatives - 3) * 25)
    return max(200, min(3000, 5 * round((base + bonus) / 5)))


if __name__ == "__main__":
    selected = {}
    for path in sys.argv[2:]:
        with open(path, encoding="utf8") as source:
            for puzzle in json.load(source):
                if puzzle.get("source") and puzzle.get("fen"):
                    puzzle["difficulty"] = estimate(puzzle)
                    selected[puzzle["id"]] = puzzle
    with open(sys.argv[1], "w", encoding="utf8") as output:
        json.dump(list(selected.values()), output)
