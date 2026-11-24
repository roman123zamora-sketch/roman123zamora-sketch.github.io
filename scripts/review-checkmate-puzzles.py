"""Prove archived mate leads offline. Search every legal defense."""
import argparse
import json
from pathlib import Path
import time

import chess


def prove(board, turns, preferred):
    owner = board.turn
    deadline = time.monotonic() + 3
    cache = {}

    def search(depth):
        if time.monotonic() > deadline:
            raise TimeoutError
        attacking = board.turn == owner
        if not attacking and board.is_checkmate():
            return True
        if depth <= 0 or board.is_insufficient_material():
            return False
        if not attacking and board.halfmove_clock >= 7 and board.can_claim_draw():
            return False
        key = (board._transposition_key(), depth, board.halfmove_clock,
               tuple(board.move_stack[-min(8, board.halfmove_clock):]) if board.halfmove_clock >= 6 else ())
        if key in cache:
            return cache[key]
        legal = list(board.legal_moves)
        if not legal:
            return False
        if depth == 1 and attacking:
            legal = [move for move in legal if board.gives_check(move)]
        legal.sort(key=lambda move: (move not in preferred, not board.is_capture(move), not board.gives_check(move)))
        value = not attacking
        for move in legal:
            board.push(move)
            result = search(depth - int(attacking))
            board.pop()
            if result == attacking:
                value = result
                break
        cache[key] = value
        return value

    def extract(depth):
        if board.is_checkmate():
            return []
        attacking = board.turn == owner
        options = []
        for move in list(board.legal_moves):
            if attacking and depth == 1 and not board.gives_check(move):
                continue
            board.push(move)
            remaining = depth - int(attacking)
            if search(remaining) and (attacking or not search(remaining - 1)):
                options.append(move)
            board.pop()
        if attacking and len(options) != 1:
            return None
        for move in options:
            board.push(move)
            tail = extract(depth - int(attacking))
            board.pop()
            if tail is not None:
                return [move, *tail]
        return None

    if not search(turns) or search(turns - 1):
        return None
    line = extract(turns)
    return line if line and len(line) == 2 * turns - 1 else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("inputs", type=Path, nargs="+")
    args = parser.parse_args()
    seen = set()
    with args.output.open("w") as output:
        for path in args.inputs:
            if path.suffix == ".json":
                seen.update(puzzle["fen"].split()[0] for puzzle in json.loads(path.read_text()))
                continue
            for row in path.read_text().splitlines():
                try:
                    lead = json.loads(row)
                except json.JSONDecodeError:
                    continue
                turns = lead.get("mate")
                key = lead["fen"].split()[0]
                if key in seen or turns not in (1, 2, 3, 4):
                    continue
                seen.add(key)
                board = chess.Board()
                try:
                    for notation in lead["history"]:
                        board.push_san(notation)
                except ValueError:
                    continue
                if board.fen(en_passant="fen") != lead["fen"] or board.can_claim_draw():
                    continue
                try:
                    line = prove(board, turns, set(map(chess.Move.from_uci, lead.get("pv", []))))
                except TimeoutError:
                    continue
                if not line:
                    continue
                moves = []
                for move in line:
                    data = {"from": chess.square_name(move.from_square), "to": chess.square_name(move.to_square)}
                    if move.promotion:
                        data["promotion"] = chess.piece_symbol(move.promotion).upper()
                    moves.append(data)
                output.write(json.dumps({**lead, "line": moves, "verification": {"mateTurns": turns}}) + "\n")
                output.flush()


if __name__ == "__main__":
    main()
