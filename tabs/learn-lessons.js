const move = (from, to, promotion) => ({ from, to, promotion });
const position = (pieces, turn = "w") => ({ board: { a1: "wK", h8: "bK", ...pieces }, turn });
const exercise = (title, explanation, setup, line, feedback, notes = {}) => ({
  title, explanation, setup: { ...setup, line }, goal: "Make the move described in the lesson.",
  feedback, ...notes
});
const question = (title, explanation, setup, goal, options, answer, feedback, notes = {}) => ({
  title, explanation, setup, goal, options, answer, feedback, ...notes
});
const rook = position({ d4: "wR", d6: "wP", f4: "bN" });
const bishop = position({ d4: "wB", c5: "wP", f6: "bN" });
const queen = position({ d4: "wQ", d6: "wP", f6: "bR" });
const end = (pieces) => ({ board: { h8: "bK", ...pieces }, turn: "b" });
const outcomeChoices = ["Checkmate", "Stalemate", "Neither"];

export const course = [
  {
    title: "Board basics", description: "Read square names and see both sides of the board.",
    lessons: [
      { title: "Find e4", explanation: "The board has 64 squares. Files are columns a–h. Ranks are rows 1–8. Say the letter first: e4 is column e, row 4.",
        setup: { board: {} }, goal: "Pick e4.", square: "e4", feedback: "Right! Column e, row 4.",
        mistakes: { e5: "That’s file e, rank 5. Find rank 4." } },
      question("The bottom-right square", "A light square goes at the bottom right. Flip the board to see White’s view. Each square keeps its name.",
        { board: {} }, "Which square is at Black’s bottom right?", ["h1", "a8", "a1"], "a8",
        "a8 is Black’s bottom-right square. h1 is White’s.", { side: "b" })
    ]
  },
  {
    title: "Set up and take turns", description: "Place the pieces and find out who goes first.",
    lessons: [
      { title: "Find the black queen", explanation: "Each side has eight pawns. From each corner, place a rook, knight, then bishop. The queen starts on her own color, on d1 or d8. The king goes beside her, on e1 or e8.",
        setup: {}, goal: "Pick the black queen.", square: "d8", feedback: "Black’s queen starts on d8, a dark square.",
        mistakes: { e8: "That is Black’s king. The queen beside it is on d8.", d1: "That is White’s queen. Find the black queen." } },
      question("One move per turn", "White goes first. Then take turns, one move each. You can’t land on your own piece.",
        {}, "Whose turn is it in this starting position?", ["White", "Black", "Both can move"], "White",
        "White moves first. Black takes the next turn.")
    ]
  },
  {
    title: "How pieces move", description: "Try a move with each of the six pieces.",
    lessons: [
      exercise("Pawn", "A pawn moves one square straight ahead. On its first move, it can go two if both squares are clear. It takes pieces one square diagonally forward. It never moves back.",
        position({ d2: "wP", e3: "bP" }), [move("d2", "e3")], "The pawn captures diagonally. d3 and d4 are available for straight moves while both are empty.",
        { goal: "Capture the black pawn on e3.", attackSquares: ["c3", "e3"], attackFrom: ["d2"], mistakes: { c3: "Pawns attack empty diagonal squares but can’t move there without a capture.", d1: "A pawn cannot move backward." } }),
      exercise("Rook", "A rook moves straight along a row or column. It stops at the first piece and can take it if it belongs to the other side.",
        rook, [move("d4", "f4")], "The rook takes the knight on f4 and stops there.",
        { goal: "Capture the knight on f4.", blockers: ["d6"], mistakes: { d7: "Your pawn on d6 blocks that path.", d6: "You cannot capture your own pawn." } }),
      exercise("Bishop", "A bishop moves diagonally. It always stays on the same color.",
        bishop, [move("d4", "f6")], "The bishop travels along e5 and captures on f6.",
        { goal: "Capture the knight on f6.", blockers: ["c5"], mistakes: { b6: "Your pawn on c5 stops the bishop.", d5: "A bishop cannot move straight up a file." } }),
      exercise("Queen", "A queen moves straight or diagonally. Its path must be clear.",
        queen, [move("d4", "f6")], "The queen reaches f6 diagonally and removes the rook.",
        { goal: "Capture the rook on f6.", blockers: ["d6"], mistakes: { d7: "Even the queen cannot jump over the pawn on d6.", f5: "That bent path belongs to a knight." } }),
      exercise("Knight", "A knight moves in an L: two squares one way, then one to the side. Only knights can jump over pieces.",
        position({ d4: "wN", d5: "wP", e4: "wP", f5: "bB" }), [move("d4", "f5")], "The knight jumps to f5 and captures the bishop.",
        { goal: "Jump to f5 and capture the bishop.", blockers: ["e4"], mistakes: { e5: "That’s one square each way. A knight needs two and one.", e4: "A knight cannot land on its own piece." } }),
      exercise("King", "A king moves one square in any direction. It can only land on a safe square, even when taking a piece.",
        { board: { d4: "wK", h8: "bK", e8: "bR", c5: "bN" } }, [move("d4", "c5")], "The king safely captures on c5. The rook still controls the e-file.",
        { goal: "Capture the knight safely.", attackSquares: ["e5"], attackFrom: ["e8"], mistakes: { e5: "The rook on e8 attacks e5. The king cannot move into check.", d6: "The king moves one square at a time." } })
    ]
  },
  {
    title: "Blocks and captures", description: "See what stops a piece and what it can take.",
    lessons: [
      exercise("A rook’s clear path", "A rook can go all the way to the edge if its path is clear.",
        position({ d4: "wR" }), [move("d4", "d8")], "The rook can travel all the way to d8 on the clear file.",
        { goal: "Move the rook to d8.", mistakes: { e5: "A rook cannot turn a diagonal corner." } }),
      exercise("A blocked rook", "A rook stops at the first piece. It can take an enemy piece, but it can’t move onto its own piece.",
        rook, [move("d4", "f4")], "Your rook takes the knight on f4. Your pawn blocks d6.",
        { goal: "Take a piece with your rook.", blockers: ["d6"], mistakes: { d6: "d6 holds your own pawn.", d7: "d6 blocks the path to d7.", g4: "You must stop at the knight on f4." } }),
      exercise("A blocked bishop", "A bishop can’t pass through a piece. The pawn on c5 blocks one path.",
        bishop, [move("d4", "f6")], "The bishop takes the knight on the open diagonal. It cannot pass through c5.",
        { goal: "Take the knight on f6.", blockers: ["c5"], mistakes: { b6: "Your pawn on c5 blocks the path to b6." } }),
      exercise("A blocked queen", "The pawn blocks the queen’s straight path. The enemy rook stops one diagonal, but the queen can take it.",
        queen, [move("d4", "f6")], "The queen takes on f6. It cannot continue past the rook to g7.",
        { goal: "Take the enemy rook on the diagonal.", blockers: ["d6"], mistakes: { g7: "The rook on f6 stops your queen.", d7: "Your own pawn on d6 blocks that path." } }),
      exercise("A blocked pawn", "A pawn can’t move straight onto any piece. It can still take a piece diagonally.",
        position({ d2: "wP", d3: "bP", e3: "bN" }), [move("d2", "e3")], "Your pawn takes the knight on e3. The pawn on d3 blocks the way forward.",
        { goal: "Capture without jumping over the blocker.", blockers: ["d3"], mistakes: { d3: "A pawn cannot capture straight ahead.", d4: "A pawn cannot jump over d3." } }),
      exercise("A knight can jump", "A knight jumps over pieces, but it can’t land on one of its own.",
        position({ d4: "wN", d5: "wP", e4: "wP", f5: "bB" }), [move("d4", "f5")], "The knight jumps the nearby pawns and captures only the bishop on f5.",
        { goal: "Jump past the nearby pawns to capture the bishop.", mistakes: { d5: "The knight cannot land on its own pawn." } })
    ]
  },
  {
    title: "Attacks and protection", description: "Spot danger and see which pieces can take back.",
    lessons: [
      { title: "A pawn’s attack is diagonal", explanation: "A pawn moves straight but attacks diagonally. It can defend its own piece or attack an empty square.",
        setup: { ...position({ d2: "wP", c3: "wN" }), attackFrom: ["d2"] }, focus: "d2",
        attackSquares: ["c3", "e3"], goal: "Pick the empty square the pawn attacks.", square: "e3", feedback: "e3 is attacked. The pawn defends the knight on c3, and moves forward to d3 or d4.",
        mistakes: { d3: "The pawn can move to d3, but attacks diagonally.", c3: "c3 is controlled, but it isn’t empty. The pawn defends the knight there." } },
      { title: "Find the hanging piece", explanation: "A piece is hanging if the other side can take it for free. Look where the black rook can reach.",
        setup: { ...position({ d4: "wN", f2: "wB", d8: "bR" }), attackFrom: ["d8"] },
        attackSquares: ["d4"], goal: "Pick the white piece Black can take for free.", square: "d4", feedback: "The rook can take the knight on d4 for free. It can’t reach the bishop.",
        mistakes: { f2: "The rook does not reach f2. Look down the d-file." } },
      { title: "Attack and defense", explanation: "A piece can be attacked and protected at the same time. One side can take it. The other side can take back.",
        setup: { ...position({ d2: "wP", e3: "wN", e8: "bR", a3: "wB" }), attackFrom: ["d2", "e8"] },
        attackSquares: ["e3"], goal: "Pick the white piece that’s attacked and protected.", square: "e3",
        feedback: "The rook can take the knight, but the pawn can take back.",
        mistakes: { a3: "The rook cannot attack the bishop on a3 from e8. Look down the e-file." } },
      exercise("A pinned bishop still attacks", "The bishop can’t move without leaving its king in check. That’s a pin. The bishop still attacks d6.",
        { board: { d5: "wK", e1: "wR", e7: "bB", e8: "bK" } }, [move("d5", "d4")], "d4 is safe. The bishop still attacks d6 even though moving it would expose Black’s king.",
        { goal: "Move the white king to d4.", attackSquares: ["d6"], attackFrom: ["e7"], mistakes: { d6: "A pinned enemy bishop still controls d6. Your king cannot enter an attacked square." } })
    ]
  },
  {
    title: "Get out of check", description: "Move the king, take the attacker, or block.",
    lessons: [
      exercise("Move the king", "Check means your king is under attack. You must make it safe this turn.",
        { board: { e1: "wK", h8: "bK", e8: "bR", f8: "bR", a2: "wP" } }, [move("e1", "d1")], "d1 is safe. The rook on f8 still makes f1 unsafe.",
        { goal: "Move your king to d1.", attackSquares: ["e1", "e2", "f1"], attackFrom: ["e8", "f8"], mistakes: { f1: "The second rook attacks f1.", e2: "The rook still attacks e2." } }),
      exercise("Take the attacker", "You can end a check by taking the attacker, as long as your king is safe afterward.",
        { board: { e1: "wK", h8: "bK", e2: "bR", f3: "wB" } }, [move("f3", "e2")], "The bishop removes the rook and ends the check.",
        { goal: "Take the rook with your bishop.", attackSquares: ["e1"], attackFrom: ["e2"], mistakes: { g4: "That bishop move leaves the rook checking the king." } }),
      exercise("Block the attack", "You can block a rook, bishop, or queen by putting a piece between it and your king.",
        { board: { e1: "wK", h8: "bK", e8: "bR", b5: "wB", a2: "wP" } }, [move("b5", "e2")], "The bishop on e2 blocks the rook’s line to the king.",
        { goal: "Block the rook with your bishop on e2.", attackSquares: ["e1", "e2"], attackFrom: ["e8"], mistakes: { c4: "c4 is not between the rook and the king." } }),
      exercise("Escape a knight’s check", "A knight jumps, so you can’t block its check. Move the king or take the knight if it’s safe.",
        { board: { e1: "wK", h8: "bK", f3: "bN", b1: "wR" } }, [move("e1", "d1")], "d1 is out of the knight’s attack. A block would not help.",
        { goal: "Move the king to d1.", attackSquares: ["e1", "g1"], attackFrom: ["f3"], mistakes: { g1: "The knight on f3 also attacks g1." } })
    ]
  },
  {
    title: "Pins and safe moves", description: "Keep your king safe when you move a piece.",
    lessons: [
      exercise("Move a pinned rook", "The rook shields its king. Moving sideways would leave the king in check. Moving along the same line can keep it safe.",
        { board: { e1: "wK", e2: "wR", e8: "bR", h8: "bK" } }, [move("e2", "e3")], "Moving to e3 keeps the rook between the king and the attacker.",
        { goal: "Move the pinned rook to e3.", attackSquares: ["e2"], attackFrom: ["e8"], mistakes: { d2: "Moving sideways exposes your king to the rook on e8.", f2: "That would leave your king in check." } })
    ]
  },
  {
    title: "Wins and draws", description: "Tell checkmate, stalemate, and other draws apart.",
    lessons: [
      question("Is it checkmate?", "Checkmate means the king is in check and no move can make it safe. The game ends before anyone takes the king.",
        { ...end({ g7: "wQ", f6: "wK" }), attackFrom: ["g7", "f6"] }, "What is the result with Black to move?", outcomeChoices, "Checkmate",
        "The queen checks h8 and covers h7 and g8. The white king protects the queen on g7, so Black cannot capture it.", { attackSquares: ["h8", "h7", "g8", "g7"] }),
      question("Is it stalemate?", "Stalemate is a draw. It happens when a player has no legal move and their king is safe.",
        { ...end({ f7: "wQ", f6: "wK" }), attackFrom: ["f7", "f6"] }, "What is the result with Black to move?", outcomeChoices, "Stalemate",
        "Black’s king is safe on h8 but can’t move. That’s stalemate.", { attackSquares: ["h8", "h7", "g8", "g7"] }),
      question("Can Black move?", "If Black has a safe move, play can go on. Look at the squares next to the king.",
        { ...end({ e6: "wQ", f6: "wK" }), attackFrom: ["e6", "f6"] }, "What is the result with Black to move?", outcomeChoices, "Neither",
        "Black can move. h8 is not under attack, and at least one neighboring square is safe.", { attackSquares: ["h8", "h7", "g8", "g7"] }),
      question("Two kings left", "Two kings alone can’t give checkmate. Other draws can come from agreement, repeated positions, or many moves without a pawn move or capture.",
        position({}), "What happens with two bare kings?", ["Keep playing", "Draw"], "Draw",
        "It’s a draw. Kings can’t get close enough to check each other.")
    ]
  },
  {
    title: "Special moves", description: "Castle, capture en passant, and promote a pawn.",
    lessons: [
      exercise("Castle with the king", "Move the king two squares toward its rook. The rook crosses over to the other side. Both pieces must be unmoved, with a clear path. The king can’t start in, cross, or land in check.",
        { board: { e1: "wK", h1: "wR", e8: "bK" }, castling: { wK: true } }, [move("e1", "g1")],
        "The king goes to g1 and the rook lands on f1 in the same move.",
        { goal: "Move your king to g1 to castle.", mistakes: { h1: "Move the king two squares to g1. The rook moves automatically.", f1: "Moving one square is an ordinary king move." } }),
      question("Castling through check", "The path is clear, but the rook on f8 attacks f1. White’s king would have to cross f1.",
        { board: { e1: "wK", h1: "wR", a8: "bK", f8: "bR" }, castling: { wK: true }, attackFrom: ["f8"] },
        "May White castle kingside here?", ["Yes", "No"], "No", "The king may not cross f1 because the rook attacks it.", { focus: "e1", attackSquares: ["f1"] }),
      question("When castling is lost", "The rook moved earlier and came back. Returning to its first square does not restore castling.",
        { board: { e1: "wK", h1: "wR", e8: "bK" } }, "Can White castle with this rook?", ["Yes", "No"], "No",
        "Moving the king or the relevant rook removes that castling right, even if the piece returns.", { focus: "e1" }),
      exercise("En passant", "Black’s pawn just jumped from d7 to d5. White can take it as if it stopped on d6. This move is called en passant. Use it right away.",
        position({ e5: "wP", d7: "bP" }, "b"), [move("d7", "d5"), move("e5", "d6")], "White lands on d6 and the black pawn on d5 disappears.",
        { practiceStart: 1, goal: "Take Black’s pawn by moving to d6.", mistakes: { d5: "The capturing pawn lands on d6, the square Black passed over." } }),
      question("When en passant ends", "White made another move after Black’s pawn jumped. Only the very next move can be en passant.",
        position({ e5: "wP", d5: "bP" }), "Can White still capture en passant on d6?", ["Yes", "No"], "No",
        "It’s too late for en passant. You can’t take on an empty square now.", { focus: "e5" }),
      { title: "Promote a pawn", explanation: "A pawn that reaches the last row must become a queen, rook, bishop, or knight. Pick any, even if you haven’t lost one.",
        setup: { ...position({ a7: "wP", g7: "bP" }), promotion: move("a7", "a8") },
        goal: "Move your pawn to a8. Pick a new piece.", promotion: true,
        feedback: "Your pawn became the piece you picked.", mistakes: { b8: "A pawn cannot move diagonally to an empty square here." } }
    ]
  },
  {
    title: "Piece values and trades", description: "Count what each side gains or loses.",
    lessons: [
      exercise("Win a trade", "Piece values are rough: pawn 1, knight or bishop 3, rook 5, queen 9. You can’t trade a king.",
        position({ a2: "wP", c4: "wB", f7: "bR", g8: "bB" }), [move("c4", "f7"), move("g8", "f7")], "White gained 5 and lost 3. That’s 2 points ahead.",
        { goal: "Take the rook with your bishop. Watch Black take back.", material: true, mistakes: { d5: "That move is legal but does not start the exchange." } }),
      exercise("An equal trade", "An equal trade gives each side the same points. It can still help your position.",
        position({ c4: "wR", c7: "bR", d7: "bR" }), [move("c4", "c7"), move("d7", "c7")], "Each side gained 5. The trade was even.",
        { goal: "Take the rook on c7. Watch Black take back.", material: true }),
      exercise("A costly capture", "Check what the other side can take back. A good position or a chance to give mate can matter more than points.",
        position({ c4: "wQ", f7: "bR", g8: "bB" }), [move("c4", "f7"), move("g8", "f7")], "White gained 5 and lost 9. That’s 4 points lost.",
        { goal: "Take on f7. See what the trade costs.", material: true })
    ]
  },
  {
    title: "Tactics", description: "Try forks, pins, skewers, and other tricks.",
    lessons: [
      exercise("Fork", "A fork is one piece attacking two targets at once.",
        position({ f3: "wN", d7: "bQ", g6: "bR" }), [move("f3", "e5")], "The knight on e5 attacks both d7 and g6.",
        { goal: "Move the knight to e5 to fork the queen and rook.", attackSquares: ["d7", "g6"], attackFrom: ["e5"], mistakes: { g5: "That knight move doesn’t attack both targets." } }),
      exercise("Pin", "A piece is pinned if moving it would expose a more important piece behind it. A pinned piece can’t move if that would leave its king in check.",
        { board: { a1: "wK", d1: "wB", e6: "bN", g8: "bK" } }, [move("d1", "b3")], "From b3 the bishop attacks the knight on e6 with Black’s king behind it on g8.",
        { goal: "Move the bishop to b3 to pin the knight.", attackSquares: ["e6"], attackFrom: ["b3"], mistakes: { c2: "c2 is legal, but the bishop would not point at e6 from there." } }),
      exercise("Skewer", "A skewer attacks the more valuable piece first. When it moves, you can take the piece behind it.",
        { board: { b1: "wK", a1: "wR", h6: "bR", f6: "bK" } }, [move("a1", "a6"), move("f6", "f7"), move("a6", "h6")], "After the king leaves the sixth rank, the rook on h6 is exposed and White takes it.",
        { goal: "Give check by moving the rook to a6.", followUp: "The king has moved. Capture the rook on h6.", attackSquares: ["f6", "h6"], attackFrom: ["a6"], mistakes: { a5: "The king is on the sixth rank. Checking from that rank lines up both pieces." } }),
      exercise("Discovered attack", "Move one piece to uncover an attack by a piece behind it. Here the bishop blocks its own rook.",
        { board: { a1: "wK", h7: "bK", d1: "wR", d4: "wB", d8: "bQ" } }, [move("d4", "e5")], "The move opens the d-file so the rook attacks the queen on d8.",
        { goal: "Move the bishop to e5 to uncover the rook’s attack.", attackSquares: ["d8"], attackFrom: ["d1"], mistakes: { d5: "A bishop cannot move straight, and staying on the file would keep it blocked." } }),
      exercise("Double attack", "A double attack makes two threats in one move. Here the bishop attacks one piece and frees the rook to attack another.",
        position({ d1: "wR", d4: "wB", d8: "bQ", g7: "bR" }), [move("d4", "e5")], "The bishop attacks g7 and the uncovered rook attacks d8. Black must consider both threats.",
        { goal: "Create two attacks by moving the bishop to e5.", attackSquares: ["d8", "g7"], attackFrom: ["e5", "d1"] }),
      exercise("Remove a defender", "The black bishop protects its knight. Take the bishop first so it can’t take back.",
        { board: { a1: "wK", a8: "bK", h6: "wB", f1: "wR", g7: "bB", f6: "bN" } }, [move("h6", "g7"), move("a8", "b8"), move("f1", "f6")], "With the bishop gone, the rook takes the unprotected knight.",
        { goal: "Capture the bishop on g7.", followUp: "Now take the knight on f6 with your rook.", attackSquares: ["f6"], attackFrom: ["f1", "g7"], mistakes: { f6: "The bishop on g7 can take back. Take it first." } }),
      exercise("Hanging piece", "A hanging piece can be taken for free. Check whether another piece can take back.",
        position({ d4: "wR", d7: "bN" }), [move("d4", "d7")], "The rook takes the knight for free.",
        { goal: "Take the unprotected knight.", attackSquares: ["d7"], attackFrom: ["d4"], mistakes: { d6: "Try d7. The knight is free to take." } }),
      exercise("Back-rank mate", "The back rank is the king’s starting row. Its own pawns can trap it there, where a rook or queen can give mate.",
        position({ a2: "wR", f7: "bP", g7: "bP", h7: "bP" }), [move("a2", "a8")], "The rook gives check. The pawns trap Black’s king, and nothing can block or take the rook.",
        { goal: "Find checkmate by moving the rook to a8.", mistakes: { a7: "The rook must check along the king’s back rank." } })
    ]
  }
];
