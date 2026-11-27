// Sets with a line show an engineered example. Open move goals are graded by the rules engine.
const position = (board, turn = "w") => ({ board: { a1: "wK", h8: "bK", ...board }, turn });
const move = (from, to) => ({ from, to });
const line = (setup, moves, instruction, feedback, options) => ({
  setup: { ...setup, line: moves.map(code => move(code.slice(0, 2), code.slice(2))) }, instruction, feedback, ...options
});
const practice = (setup, from, instruction, feedback, goal = "move", options) => ({
  setup: { ...setup, explore: { from, goal } }, from, instruction, feedback, ...options
});
const ask = (setup, instruction, answer, choices, feedback, options) => ({
  setup, instruction, answer, choices, feedback, ...options
});
const yesNo = ["Yes", "No"];
const check = { board: { e1: "wK", h8: "bK", e8: "bR", f8: "bR", a2: "wP" } };
const pin = { board: { e1: "wK", e2: "wR", e8: "bR", h8: "bK" } };
const mate = position({ a2: "wR", f7: "bP", g7: "bP", h7: "bP" });
const skewer = { board: { b1: "wK", a1: "wR", h6: "bR", f6: "bK" } };
const skewerSteps = () => line(skewer, ["a1a6", "f6f7", "a6h6"], "Give check along the sixth rank.",
  "The king had to leave the line. Now the rook is yours.", { followUp: "Take the rook on h6.", marks: ["a6","b6","c6","d6","e6","f6","g6","h6"] });
const castle = { board: { e1: "wK", h1: "wR", e8: "bK" }, castling: { wK: true } };
const outcomes = ["Checkmate", "Stalemate", "Neither"];

export const sections = ["Piece basics", "King safety and outcomes", "Special moves", "Trades and tactics"];
export const course = [
  { id: "movement", title: "How pieces move", section: 0, legacy: ["2:0","2:1","2:2","2:3","2:4","2:5"], steps: [
    practice(position({ d4: "wR" }), "d4", "A rook moves straight. Move it to a highlighted square.", "That square is on the rook’s rank or file."),
    practice(position({ d4: "wB", h8: undefined, h7: "bK", h2: "bP" }), "d4", "A bishop moves diagonally. Try a highlighted square.", "The bishop stays on the same square color."),
    practice(position({ d4: "wQ", h8: undefined, h7: "bK" }), "d4", "A queen moves straight or diagonally. Try either.", "The queen can use ranks, files, and diagonals."),
    practice({ board: { d4: "wK", h8: "bK", a7: "bP" } }, "d4", "A king moves one square to safety. Try a highlighted square.", "Your king moved one square."),
    practice(position({ d4: "wN", h2: "bP" }), "d4", "A knight moves two squares one way, then one sideways. Try a highlighted square.", "That’s the knight’s L-shaped move.", "move", { marks: ["d5", "d6", "e6"] }),
    practice(position({ d2: "wP" }), "d2", "White’s pawn moves toward rank 8. From d2, try one or two squares straight forward.", "Both paths were clear, so either opening move works.", "move", { marks: ["d3", "d4"], mistakes: { e3: "A pawn moves straight into an empty square." } })
  ] },
  { id: "blocks", title: "Blocks", section: 0, steps: [
    line(position({ d4: "wR", d6: "wP" }), ["d4d5"], "Try d7, then move the rook to d5.", "The rook can reach d5. Its pawn blocks the rest of the file.", { marks: ["d6"], mistakes: { d7: "Your pawn on d6 blocks the rook’s path." } }),
    line(position({ d4: "wB", f6: "wP" }), ["d4e5"], "Try g7, then stop the bishop before its pawn.", "e5 is the last square before the pawn.", { marks: ["f6"], mistakes: { g7: "The pawn on f6 blocks the diagonal." } }),
    line(position({ d4: "wN", d5: "wP", e4: "wP", e5: "wP" }), ["d4f5"], "Jump over the pawns to f5.", "A knight can jump over pieces.", { marks: ["f5"] }),
    ask(position({ d2: "wP", d3: "bP" }), "Can White’s pawn move from d2 to d4?", "No", yesNo, "d3 is occupied. Both squares must be clear for a two-square move.", { marks: ["d2","d3"] })
  ] },
  { id: "captures", title: "Captures", section: 0, steps: [
    line(position({ d4: "wR", d7: "bN" }), ["d4d7"], "Take the knight with the rook.", "The rook lands on the knight’s square and removes it."),
    line(position({ d4: "wR", d6: "bN", d7: "bB" }), ["d4d6"], "Take the first enemy piece on the d-file.", "The rook stops at the knight. It cannot pass it to take the bishop.", { mistakes: { d7: "The knight on d6 is in the way." } }),
    line(position({ d2: "wP", e3: "bN" }), ["d2e3"], "Take the knight diagonally forward.", "A pawn takes one square diagonally forward."),
    line(position({ d2: "wP", d3: "bP", e3: "bN", c3: "wN" }), ["d2e3"], "Try c3 or d3, then take the enemy piece your pawn can reach.", "e3 is an enemy square one step diagonally forward.", { mistakes: { c3: "You can’t take your own knight.", d3: "A pawn can’t capture straight ahead." } })
  ] },
  { id: "protection", title: "Protection", section: 0, steps: [
    { setup: position({ d2: "wP", e3: "wN", e8: "bR" }), instruction: "If Black takes the knight, which White piece can take back? Tap it.", square: "d2", marks: ["e3"], feedback: "The pawn on d2 can take back on e3." },
    ask(position({ d4: "wN", d8: "bR" }), "Can White take back if the rook takes the knight?", "No", yesNo, "No White piece can reach d4. The knight is unprotected.", { marks: ["d4"] }),
    line(position({ d2: "wP", e3: "wN", e8: "bR" }, "b"), ["e8e3","d2e3"], "Watch Black take the knight. Then take back.", "A protected piece can still be taken. The pawn can recapture.", { practiceStart: 1, animateStart: true })
  ] },
  { id: "safe", title: "Safe moves", section: 0, steps: [
    practice(position({ d4: "wR", f8: "bR" }), "d4", "Try d5 or f4. After you move, what can Black take?", "Black can’t take your rook on its new square.", "safe", { marks: ["d5","f4"] }),
    practice(position({ d4: "wN", d8: "bR" }), "d4", "Black’s rook attacks your knight. Move the knight to safety.", "The knight is out of danger.", "safe", { marks: ["d8","d4"] })
  ] },
  { id: "check", title: "Check and its effects", section: 1, steps: [
    practice(check, "e1", "Your king is under attack. Your next move has to make it safe.", "The king has escaped the rook’s line.", "move", { marks: ["e8","e1"], mistakes: { f1: "The rook on f8 attacks f1.", a3: "A pawn move leaves the king in check." } }),
    line({ board: { e1: "wK", h8: "bK", e2: "bR", f3: "wB" } }, ["f3e2"], "Take the checking rook with your bishop.", "Taking the attacker ends the check."),
    line({ board: { e1: "wK", h8: "bK", e8: "bR", b5: "wB" } }, ["b5e2"], "Put your bishop between your king and the rook.", "The bishop on e2 blocks the check.", { marks: ["e8","e2"] }),
    practice({ board: { e1: "wK", h8: "bK", f3: "bN", b1: "wR" } }, "e1", "A knight’s check can’t be blocked. Move your king to safety.", "The king moved out of the knight’s reach.", "move", { marks: ["f3"], mistakes: { g1: "The knight also attacks g1." } }),
    practice(pin, "e2", "Try moving the pinned rook sideways, then move it along the e-file.", "The rook keeps its king safe by staying on the line or taking the attacker.", "move", { marks: ["e1","e2","e3","e4","e5","e6","e7","e8"], mistakes: { d2: "That would expose your king to check.", f2: "That would expose your king to check." } }),
    line({ board: { d1: "wK", a2: "wP", e2: "wB", h5: "bB", h8: "bK" } }, ["e2h5"],
      "This bishop is pinned along a diagonal. Take the piece that pins it.", "The bishop stays on the line and removes the threat.",
      { marks: ["d1","e2","f3","g4","h5"], mistakes: { f1: "Leaving the diagonal exposes your king." } })
  ] },
  { id: "mate", title: "Checkmate", section: 1, steps: [
    ask(position({ a1: undefined, f6: "wK", g7: "wQ" }, "b"), "Checkmate is check with no legal way out. What is this?", "Checkmate", outcomes, "The queen checks and covers both escapes. The white king guards the queen."),
    practice(mate, "a2", "Trap the king on the back rank. Find mate in one.", "The rook checks along rank 8. No move, capture, or block can save the king.", "mate"),
    ask(position({ a1: undefined, a8: "wR", f6: "wK" }, "b"), "Black is in check. Is it checkmate?", "No", yesNo, "Black can escape to h7.", { reveal: ["h7"] })
  ] },
  { id: "draws", title: "Draws", section: 1, steps: [
    ask(position({ a1: undefined, f7: "wQ", f6: "wK" }, "b"), "Black has no legal move. Is the king in check?", "No", yesNo, "The king is safe but cannot move. That’s stalemate, a draw."),
    ask(position({}), "Can either side ever give mate with just these kings?", "No", yesNo, "No legal sequence can lead to mate. This is a dead position."),
    line(position({ b1: "wN", g8: "bN" }), ["b1c3","g8f6","c3b1","f6g8","b1c3","g8f6","c3b1","f6g8"],
      "Play the last reply in this repeated sequence: return Black’s knight.", "This is the third occurrence, so a draw can be claimed. Five occurrences draw automatically.", { practiceStart: 7, history: true }),
    ask({ ...position({ a2: "wR" }), halfmove: 100 }, "Both sides made 50 moves without a pawn move or capture. Can White claim a draw?", "Yes", yesNo,
      "A claim is allowed at 50 moves each. At 75 it’s automatic, unless the last move gives mate."),
    ask(position({ a2: "wR" }), "Both players agree to a draw. Must they play on?", "No", yesNo, "Agreement ends a game under standard rules. Exalted Chess currently has no draw-offer button.")
  ] },
  { id: "castling", title: "Castling", section: 2, steps: [
    line(castle, ["e1g1"], "Castle kingside. Move the king two squares toward the rook.", "The king goes to g1 and the rook crosses to f1."),
    line({ board: { e1: "wK", a1: "wR", h8: "bK" }, castling: { wQ: true } }, ["e1c1"], "Castle queenside. The king still moves two squares.", "b1, c1 and d1 must be empty. The king crosses d1 and lands on c1."),
    ask({ ...castle, board: { e1: "wK", h1: "wR", a8: "bK", f8: "bR" } }, "Try to castle. Can the king cross f1?", "No", yesNo, "The rook attacks f1. You can’t castle from, through, or into check.", { from: "e1", marks: ["f1"], mistakes: { g1: "The king would cross f1, which Black attacks." } }),
    ask({ ...castle, board: { ...castle.board, f1: "wB" } }, "Can White castle with the bishop in the way?", "No", yesNo, "Every square between the king and rook must be empty.", { marks: ["f1"] }),
    ask({ ...castle, castling: {} }, "The rook moved and returned to h1. Can White castle?", "No", yesNo, "Moving the king or that rook permanently removes this castling right.")
  ] },
  { id: "promotion", title: "Promotion", section: 2, steps: [
    { setup: { ...position({ a7: "wP", g7: "bP" }), promotion: move("a7","a8") }, from: "a7",
      instruction: "Move the pawn to a8. Try choosing a queen, or explore another piece.", feedback: "A pawn on the last rank becomes your choice of queen, rook, bishop, or knight." },
    { setup: { ...position({ b7: "wP", c8: "bR" }), promotion: move("b7","c8") }, from: "b7",
      instruction: "Take the rook on c8 and choose any promotion.", feedback: "A pawn can capture diagonally and promote in the same move." }
  ] },
  { id: "en-passant", title: "En passant", section: 2, steps: [
    line(position({ e5: "wP", d7: "bP" }, "b"), ["d7d5","e5d6"], "After Black jumps two squares, take its pawn as if it stopped on d6.",
      "Your pawn lands on d6 and Black’s pawn comes off d5. Use en passant on your very next move.", { practiceStart: 1, animateStart: true, marks: ["d6"], mistakes: { d5: "Land on d6, the square Black passed over." } }),
    ask({ ...position({ e5: "wP", d7: "bP" }, "b"), line: [move("d7","d5"),move("a1","a2"),move("h8","h7")] },
      "White moved its king after the pawn jump. Can White take on d6 now?", "No", yesNo, "The chance expired when White played another move.", { practiceStart: 3, history: true, marks: ["d6"] })
  ] },
  { id: "trades", title: "Piece value and trades", section: 3, steps: [
    line(position({ c4: "wR", c7: "bR", d7: "bR" }), ["c4c7","d7c7"], "Pawn 1 · Knight 3 · Bishop 3 · Rook 5 · Queen 9. The king can’t be traded. Take the rook on c7.", "Both sides lost a rook, worth about 5 points.", { material: true }),
    line(position({ a2: "wP", c4: "wB", f7: "bR", g8: "bB" }), ["c4f7","g8f7"], "Take the rook with your bishop. Watch Black take back.", "You won a rook (5) for a bishop (3). That’s about 2 points ahead.", { material: true }),
    line(position({ c4: "wQ", f7: "bR", g8: "bB" }), ["c4f7","g8f7"], "Take the same rook with a queen. Watch what it costs.", "You won a rook (5) but lost a queen (9). That’s about 4 points lost.", { material: true })
  ] },
  { id: "skewers", title: "Skewers", section: 3, steps: [
    skewerSteps(),
    line({ board: { a1: "wK", c2: "wB", e6: "bK", g8: "bR" } }, ["c2b3","e6d6","b3g8"],
      "Use the bishop to check along the diagonal to g8.", "In a pin, the front piece can’t leave the line. In this skewer, the front piece is the king and has to escape.", { followUp: "The king moved. Take the rook.", marks: ["b3","c4","d5","e6","f7","g8"] })
  ] },
  { id: "tactics", title: "Tactics", section: 3, steps: [
    line(position({ d4: "wR", d7: "bN" }), ["d4d7"], "Take the piece Black can’t take back.", "The knight is unprotected, so the rook wins it for free."),
    practice(check, "e1", "Get your king out of check.", "Your king has moved off the attack line."),
    line({ board: { a1: "wK", d1: "wB", e6: "bN", g8: "bK" } }, ["d1b3"], "Stop the knight from leaving its diagonal to the king.", "The bishop pins the knight to its king."),
    { ...skewerSteps(), instruction: "Win the piece behind the king." },
    practice(mate, "a2", "Checkmate in one move.", "The rook checks and Black has no legal way out.", "mate")
  ] }
];
