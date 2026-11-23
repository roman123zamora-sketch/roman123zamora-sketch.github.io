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
    title: "The board and coordinates", description: "Find squares by file and rank, then turn the board around.",
    lessons: [
      { title: "Find e4", explanation: "The board has 64 squares. Files are the vertical columns a–h. Ranks are the horizontal rows 1–8. Say the file first, then the rank: e4 is file e, rank 4.",
        setup: { board: {} }, goal: "Tap or click e4.", square: "e4", feedback: "Exactly. e4 is on column e and row 4.",
        mistakes: { e5: "That’s file e, rank 5. Find rank 4." } },
      question("A light square on the right", "Set the board with a light square at the bottom right. From White’s side it is h1. From Black’s side it is a8. Use Flip board to compare. Rotating the view keeps every square’s name.",
        { board: {} }, "Which square is at Black’s bottom right?", ["h1", "a8", "a1"], "a8",
        "a8 is Black’s bottom-right square. h1 is White’s.", { side: "b" })
    ]
  },
  {
    title: "Starting position and turns", description: "Meet both armies and learn who moves when.",
    lessons: [
      { title: "Set up both armies", explanation: "Each side has eight pawns. The rooks go in the corners, then the knights, then the bishops. The king and queen fill the middle squares. The queens start on their own colors: White on d1, Black on d8. The kings start on e1 and e8.",
        setup: {}, goal: "Select the black queen.", square: "d8", feedback: "Black’s queen is on d8, a dark square. White’s queen is on d1.",
        mistakes: { e8: "That is Black’s king. The queen beside it is on d8.", d1: "That is White’s queen. Find the black queen." } },
      question("One move per turn", "White moves first. The players then alternate, one move per turn. Your own pieces occupy their squares, so you cannot land on them.",
        {}, "Whose turn is it in this starting position?", ["White", "Black", "Both can move"], "White",
        "White moves first. Black takes the next turn.")
    ]
  },
  {
    title: "How the pieces move", description: "Practice the distinct movement and capture rules of all six pieces.",
    lessons: [
      exercise("Pawn", "A pawn moves one square straight forward when clear. From its starting rank it may move two squares if both are clear. It captures one square diagonally forward and never moves backward.",
        position({ d2: "wP", e3: "bP" }), [move("d2", "e3")], "The pawn captures diagonally. d3 and d4 are available for straight moves while both are empty.",
        { goal: "Capture the black pawn on e3.", attackSquares: ["c3", "e3"], attackFrom: ["d2"], mistakes: { c3: "Pawns attack empty diagonal squares but can’t move there without a capture.", d1: "A pawn cannot move backward." } }),
      exercise("Rook", "A rook travels along files and ranks. It can capture the first enemy it reaches. Its path stops at the first occupied square.",
        rook, [move("d4", "f4")], "The rook takes the knight on f4 and stops there.",
        { goal: "Capture the knight on f4.", blockers: ["d6"], mistakes: { d7: "Your pawn on d6 blocks that path.", d6: "You cannot capture your own pawn." } }),
      exercise("Bishop", "A bishop slides diagonally. All its destinations have the same square color as its starting square.",
        bishop, [move("d4", "f6")], "The bishop travels along e5 and captures on f6.",
        { goal: "Capture the knight on f6.", blockers: ["c5"], mistakes: { b6: "Your pawn on c5 stops the bishop.", d5: "A bishop cannot move straight up a file." } }),
      exercise("Queen", "The queen combines rook and bishop movement. It can slide straight or diagonally as long as the path is clear.",
        queen, [move("d4", "f6")], "The queen reaches f6 diagonally and removes the rook.",
        { goal: "Capture the rook on f6.", blockers: ["d6"], mistakes: { d7: "Even the queen cannot jump over the pawn on d6.", f5: "That bent path belongs to a knight." } }),
      exercise("Knight", "A knight takes an L-shaped route: two squares one way, then one at a right angle. It is the only piece that jumps over others.",
        position({ d4: "wN", d5: "wP", e4: "wP", f5: "bB" }), [move("d4", "f5")], "The knight jumps to f5 and captures the bishop.",
        { goal: "Jump to f5 and capture the bishop.", blockers: ["e4"], mistakes: { e5: "That’s one square each way. A knight needs two and one.", e4: "A knight cannot land on its own piece." } }),
      exercise("King", "The king moves one square in any direction. It can capture an enemy piece only when its destination is safe.",
        { board: { d4: "wK", h8: "bK", e8: "bR", c5: "bN" } }, [move("d4", "c5")], "The king safely captures on c5. The rook still controls the e-file.",
        { goal: "Capture the knight safely.", attackSquares: ["e5"], attackFrom: ["e8"], mistakes: { e5: "The rook on e8 attacks e5. The king cannot move into check.", d6: "The king moves one square at a time." } })
    ]
  },
  {
    title: "Blocks and captures", description: "See where a path stops and when jumping is allowed.",
    lessons: [
      exercise("A rook’s clear path", "With no blockers a rook can travel to the edge. Compare this with the next diagram, where a pawn stops it.",
        position({ d4: "wR" }), [move("d4", "d8")], "The rook can travel all the way to d8 on the clear file.",
        { goal: "Move the rook to d8.", mistakes: { e5: "A rook cannot turn a diagonal corner." } }),
      exercise("A blocked rook", "An occupied square ends a sliding piece’s path. A friendly piece cannot be captured. An opponent’s piece can be captured, but the move ends on that square.",
        rook, [move("d4", "f4")], "f4 is a legal capture. The friendly pawn on d6 is a blocker.",
        { goal: "Choose a legal capture for the rook.", blockers: ["d6"], mistakes: { d6: "d6 holds your own pawn.", d7: "d6 blocks the path to d7.", g4: "You must stop at the knight on f4." } }),
      exercise("A blocked bishop", "A bishop follows one diagonal until it meets a piece. Your pawn on c5 blocks the northwest diagonal.",
        bishop, [move("d4", "f6")], "The bishop takes the knight on the open diagonal. It cannot pass through c5.",
        { goal: "Take the knight on f6.", blockers: ["c5"], mistakes: { b6: "Your pawn on c5 blocks the path to b6." } }),
      exercise("Diagonal and straight blockers", "The queen here has a friendly blocker straight ahead and an enemy blocker on a diagonal. A bishop on d4 would be stopped by that same enemy piece.",
        queen, [move("d4", "f6")], "The queen takes on f6. It cannot continue past the rook to g7.",
        { goal: "Take the enemy rook on the diagonal.", blockers: ["d6"], mistakes: { g7: "f6 is occupied. The queen must stop there.", d7: "Your own pawn on d6 blocks that path." } }),
      exercise("A blocked pawn", "A pawn cannot enter an occupied square straight ahead, even when the piece belongs to the opponent. It can still capture diagonally.",
        position({ d2: "wP", d3: "bP", e3: "bN" }), [move("d2", "e3")], "e3 is a legal diagonal capture. The pawn on d3 blocks d3 and d4.",
        { goal: "Capture without jumping over the blocker.", blockers: ["d3"], mistakes: { d3: "A pawn cannot capture straight ahead.", d4: "A pawn cannot jump over d3." } }),
      exercise("A knight can jump", "Compare the knight with a bishop or rook. Nearby pieces do not stop a knight’s L-shaped move, but its landing square still matters.",
        position({ d4: "wN", d5: "wP", e4: "wP", f5: "bB" }), [move("d4", "f5")], "The knight jumps the nearby pawns and captures only the bishop on f5.",
        { goal: "Jump past the nearby pawns to capture the bishop.", mistakes: { d5: "The knight cannot land on its own pawn." } })
    ]
  },
  {
    title: "Attacks, defenses, and danger", description: "Separate where pieces can move from the squares they control.",
    lessons: [
      { title: "A pawn’s attack is diagonal", explanation: "Move markers show that the pawn can move to d3 or d4. The pawn attacks c3 and e3. A pawn controls its forward diagonals even when they are empty, and defends a friendly piece on either one.",
        setup: { ...position({ d2: "wP", c3: "wN" }), attackFrom: ["d2"] }, focus: "d2",
        attackSquares: ["c3", "e3"], goal: "Select the empty square the pawn attacks.", square: "e3", feedback: "e3 is attacked. The pawn defends the knight on c3, and moves forward to d3 or d4.",
        mistakes: { d3: "The pawn can move to d3, but attacks diagonally.", c3: "c3 is controlled, but it isn’t empty. The pawn defends the knight there." } },
      { title: "Safe, threatened, and defended", explanation: "An attacked piece is threatened. It is defended if a friendly piece could take back. A hanging piece can be captured without an adequate reply. The black rook threatens the knight on d4 and the bishop on f2 is out of its path.",
        setup: { ...position({ d4: "wN", f2: "wB", d8: "bR" }), attackFrom: ["d8"] },
        attackSquares: ["d4"], goal: "Select the hanging white piece.", square: "d4", feedback: "The rook can take d4 and White has no recapture. The bishop on f2 is outside the rook’s attack.",
        mistakes: { f2: "The rook does not reach f2. Look down the d-file." } },
      { title: "Find the defended piece", explanation: "White’s pawn controls e3 and defends the knight there. The black rook also attacks e3. Threatened and defended can both be true.",
        setup: { ...position({ d2: "wP", e3: "wN", e8: "bR", a3: "wB" }), attackFrom: ["d2", "e8"] },
        attackSquares: ["e3"], goal: "Select the white piece both attacked and defended.", square: "e3",
        feedback: "The rook attacks the knight, and the pawn can recapture on e3. The bishop on a3 is outside that attack.",
        mistakes: { a3: "The rook cannot attack the bishop on a3 from e8. Look down the e-file." } },
      exercise("A pinned piece can still attack", "White’s rook on e1 pins Black’s bishop on e7 to the king on e8. Even while pinned, the bishop controls d6. White’s king cannot step there.",
        { board: { d5: "wK", e1: "wR", e7: "bB", e8: "bK" } }, [move("d5", "d4")], "d4 is safe. The bishop still attacks d6 even though moving it would expose Black’s king.",
        { goal: "Move the white king to d4.", attackSquares: ["d6"], attackFrom: ["e7"], mistakes: { d6: "A pinned enemy bishop still controls d6. Your king cannot enter an attacked square." } })
    ]
  },
  {
    title: "Check and how to escape", description: "Practice moving, capturing, and blocking to protect your king.",
    lessons: [
      exercise("Move the king", "Check means the king is attacked. You must remove the danger on this turn. Moving the king is one possible answer.",
        { board: { e1: "wK", h8: "bK", e8: "bR", f8: "bR", a2: "wP" } }, [move("e1", "d1")], "d1 is safe. The rook on f8 still makes f1 unsafe.",
        { goal: "Escape check by moving the king to d1.", attackSquares: ["e1", "e2", "f1"], attackFrom: ["e8", "f8"], mistakes: { f1: "The second rook attacks f1.", e2: "The rook still attacks e2." } }),
      exercise("Capture the checker", "A legal capture can remove the checking piece. The capture must leave your king safe.",
        { board: { e1: "wK", h8: "bK", e2: "bR", f3: "wB" } }, [move("f3", "e2")], "The bishop removes the rook and ends the check.",
        { goal: "Use the bishop on f3 to capture the checker.", attackSquares: ["e1"], attackFrom: ["e2"], mistakes: { g4: "That bishop move leaves the rook checking the king." } }),
      exercise("Block a line of check", "A rook, bishop, or queen can check along a line. Put a piece between the checker and your king if that move is legal.",
        { board: { e1: "wK", h8: "bK", e8: "bR", b5: "wB", a2: "wP" } }, [move("b5", "e2")], "The bishop on e2 blocks the rook’s line to the king.",
        { goal: "Place the bishop on e2 to block the rook.", attackSquares: ["e1", "e2"], attackFrom: ["e8"], mistakes: { c4: "c4 is not between the rook and the king." } }),
      exercise("A knight check cannot be blocked", "A knight jumps straight to its destination. There is no line to block. Move the king to safety or capture the checking knight if possible.",
        { board: { e1: "wK", h8: "bK", f3: "bN", b1: "wR" } }, [move("e1", "d1")], "d1 is out of the knight’s attack. A block would not help.",
        { goal: "Move the king to d1.", attackSquares: ["e1", "g1"], attackFrom: ["f3"], mistakes: { g1: "The knight on f3 also attacks g1." } })
    ]
  },
  {
    title: "Legal moves and pins", description: "Test moves that expose the king and moves that keep it safe.",
    lessons: [
      exercise("An absolute pin", "The white rook on e2 shields its king on e1 from a black rook on e8. This is a pin. Moving sideways would expose the king, so the move is illegal. The rook may move along the line if it keeps the king safe.",
        { board: { e1: "wK", e2: "wR", e8: "bR", h8: "bK" } }, [move("e2", "e3")], "Moving to e3 keeps the rook between the king and the attacker.",
        { goal: "Move the pinned rook to e3.", attackSquares: ["e2"], attackFrom: ["e8"], mistakes: { d2: "Moving sideways exposes your king to the rook on e8.", f2: "That would leave your king in check." } })
    ]
  },
  {
    title: "Checkmate, stalemate, and draws", description: "Distinguish similar end positions and learn how a game ends.",
    lessons: [
      question("The cornered king", "A king is never captured. Checkmate ends the game when the side in check has no legal move. Look at h7, g8, and g7 around Black’s king.",
        { ...end({ g7: "wQ", f6: "wK" }), attackFrom: ["g7", "f6"] }, "What is the result with Black to move?", outcomeChoices, "Checkmate",
        "The queen checks h8 and covers h7 and g8. The white king protects the queen on g7, so Black cannot capture it.", { attackSquares: ["h8", "h7", "g8", "g7"] }),
      question("One square different", "Here the queen is on f7 instead of g7. Black still has no legal move. Check whether the queen actually attacks h8.",
        { ...end({ f7: "wQ", f6: "wK" }), attackFrom: ["f7", "f6"] }, "What is the result with Black to move?", outcomeChoices, "Stalemate",
        "h8 is safe, but h7, g8, and g7 are controlled. Black has no legal move, so the game is drawn.", { attackSquares: ["h8", "h7", "g8", "g7"] }),
      question("A way out", "A position with a safe move is neither checkmate nor stalemate. Besides stalemate, chess can end in a draw by agreement, insufficient mating material, repeated positions, or a long stretch without a pawn move or capture.",
        { ...end({ e6: "wQ", f6: "wK" }), attackFrom: ["e6", "f6"] }, "What is the result with Black to move?", outcomeChoices, "Neither",
        "Black can move. h8 is not under attack, and at least one neighboring square is safe.", { attackSquares: ["h8", "h7", "g8", "g7"] }),
      question("Too little material to mate", "These two kings are the only pieces left. Neither side can ever deliver checkmate. A game can also be drawn by agreement, a repetition claim, or a move-count claim under the applicable rules.",
        position({}), "What happens with two bare kings?", ["Keep playing", "Draw"], "Draw",
        "This is a draw for insufficient mating material. A king cannot give check by moving next to the other king.")
    ]
  },
  {
    title: "Castling, en passant, and promotion", description: "Play all three special moves and see every piece that changes.",
    lessons: [
      exercise("Castling together", "Castling moves the king two squares toward its rook. The rook crosses to the square beside it. Neither piece involved may have moved, and the path must be clear. The king may not start in, cross through, or land in check.",
        { board: { e1: "wK", h1: "wR", e8: "bK" }, castling: { wK: true } }, [move("e1", "g1")],
        "The king goes to g1 and the rook lands on f1 in the same move.",
        { goal: "Castle kingside by moving the king from e1 to g1.", mistakes: { h1: "Move the king two squares to g1. The rook moves automatically.", f1: "Moving one square is an ordinary king move." } }),
      question("Castling through check", "An empty path is only one condition. The black rook on f8 attacks f1, the square White’s king would have to cross.",
        { board: { e1: "wK", h1: "wR", a8: "bK", f8: "bR" }, castling: { wK: true }, attackFrom: ["f8"] },
        "May White castle kingside here?", ["Yes", "No"], "No", "The king may not cross f1 because the rook attacks it.", { focus: "e1", attackSquares: ["f1"] }),
      question("Castling rights can be lost", "The king and rook are back on their starting squares. In this example the rook moved earlier, so the right to castle with it was lost.",
        { board: { e1: "wK", h1: "wR", e8: "bK" } }, "Can White castle with this rook?", ["Yes", "No"], "No",
        "Moving the king or the relevant rook removes that castling right, even if the piece returns.", { focus: "e1" }),
      exercise("En passant", "Black’s pawn moves from d7 to d5, passing d6 beside White’s pawn. White can capture as if the pawn had moved only to d6. This right lasts for the very next move only.",
        position({ e5: "wP", d7: "bP" }, "b"), [move("d7", "d5"), move("e5", "d6")], "White lands on d6 and the black pawn on d5 disappears.",
        { practiceStart: 1, goal: "After Black’s two-square move, capture en passant on d6.", mistakes: { d5: "The capturing pawn lands on d6, the square Black passed over." } }),
      question("En passant expires", "The pawns are still beside each other here, but White played another move after Black’s two-square advance. The opportunity has expired.",
        position({ e5: "wP", d5: "bP" }), "Can White still capture en passant on d6?", ["Yes", "No"], "No",
        "You must use en passant immediately. With the opportunity gone and d6 empty, e5–d6 is illegal.", { focus: "e5" }),
      { title: "Choose a promotion", explanation: "A pawn that reaches the farthest rank must become a queen, rook, bishop, or knight. You choose, even if that type of piece has never been captured.",
        setup: { ...position({ a7: "wP", g7: "bP" }), promotion: move("a7", "a8") },
        goal: "Move the pawn to a8, then choose any of the four pieces.", promotion: true,
        feedback: "The pawn has been replaced by your chosen piece.", mistakes: { b8: "A pawn cannot move diagonally to an empty square here." } }
    ]
  },
  {
    title: "Piece values and exchanges", description: "Count both sides of a trade and compare material with the position.",
    lessons: [
      exercise("Win an exchange", "Typical values are pawn 1, knight 3, bishop 3, rook 5, queen 9. The king has no trade value. A bishop that takes a rook and gets taken back gains about two points overall.",
        position({ a2: "wP", c4: "wB", f7: "bR", g8: "bB" }), [move("c4", "f7"), move("g8", "f7")], "White gained 5 and Black gained 3. White came out 2 points ahead in this exchange.",
        { goal: "Capture the rook with the bishop, then watch Black recapture.", material: true, mistakes: { d5: "That move is legal but does not start the exchange." } }),
      exercise("An equal trade", "Trading equal pieces can still improve your position. Here each side captures one rook, so the material change balances out.",
        position({ c4: "wR", c7: "bR", d7: "bR" }), [move("c4", "c7"), move("d7", "c7")], "Each side captured a rook worth 5. The net material gain is zero.",
        { goal: "Capture the rook on c7 and watch the recapture.", material: true }),
      exercise("A costly capture", "Count the recapture before grabbing a piece. Taking a rook with a queen can be a poor trade if the queen is immediately taken. Mating threats or position can outweigh these rough values.",
        position({ c4: "wQ", f7: "bR", g8: "bB" }), [move("c4", "f7"), move("g8", "f7")], "White gained 5 but Black gained 9. White lost 4 points overall.",
        { goal: "Try the tempting capture on f7 and count the result.", material: true })
    ]
  },
  {
    title: "Basic tactical patterns", description: "Recognize common ideas in short visual challenges.",
    lessons: [
      exercise("Fork", "A fork is one piece attacking two targets. The knight’s L-shaped reach makes forks easy to miss.",
        position({ f3: "wN", d7: "bQ", g6: "bR" }), [move("f3", "e5")], "The knight on e5 attacks both d7 and g6.",
        { goal: "Move the knight to e5 to fork the queen and rook.", attackSquares: ["d7", "g6"], attackFrom: ["e5"], mistakes: { g5: "That knight move doesn’t attack both targets." } }),
      exercise("Pin", "A pin holds one piece in front of a more important target. If the target behind it is a king, the pinned piece cannot expose it to check.",
        { board: { a1: "wK", d1: "wB", e6: "bN", g8: "bK" } }, [move("d1", "b3")], "From b3 the bishop attacks the knight on e6 with Black’s king behind it on g8.",
        { goal: "Move the bishop to b3 to pin the knight.", attackSquares: ["e6"], attackFrom: ["b3"], mistakes: { c2: "c2 is legal, but the bishop would not point at e6 from there." } }),
      exercise("Skewer", "A skewer attacks a valuable piece in front, forcing it away and exposing a second piece behind it.",
        { board: { b1: "wK", a1: "wR", h6: "bR", f6: "bK" } }, [move("a1", "a6"), move("f6", "f7"), move("a6", "h6")], "After the king leaves the sixth rank, the rook on h6 is exposed and White takes it.",
        { goal: "Give check by moving the rook to a6.", followUp: "The king has moved. Capture the rook on h6.", attackSquares: ["f6", "h6"], attackFrom: ["a6"], mistakes: { a5: "The king is on the sixth rank. Checking from that rank lines up both pieces." } }),
      exercise("Discovered attack", "Moving one piece can reveal an attack from a piece behind it. Here the white bishop blocks its own rook’s line.",
        { board: { a1: "wK", h7: "bK", d1: "wR", d4: "wB", d8: "bQ" } }, [move("d4", "e5")], "The move opens the d-file so the rook attacks the queen on d8.",
        { goal: "Move the bishop to e5 to uncover the rook’s attack.", attackSquares: ["d8"], attackFrom: ["d1"], mistakes: { d5: "A bishop cannot move straight, and staying on the file would keep it blocked." } }),
      exercise("Double attack", "One move can create two threats. A discovered attack can combine a new threat from the moving piece with a revealed threat from another piece.",
        position({ d1: "wR", d4: "wB", d8: "bQ", g7: "bR" }), [move("d4", "e5")], "The bishop attacks g7 and the uncovered rook attacks d8. Black must consider both threats.",
        { goal: "Create two attacks by moving the bishop to e5.", attackSquares: ["d8", "g7"], attackFrom: ["e5", "d1"] }),
      exercise("Remove a defender", "Taking a defender can leave another piece vulnerable. The black bishop on g7 protects the knight on f6 along its diagonal.",
        { board: { a1: "wK", a8: "bK", h6: "wB", f1: "wR", g7: "bB", f6: "bN" } }, [move("h6", "g7"), move("a8", "b8"), move("f1", "f6")], "The bishop on g7 is gone. The rook then captures the knight which no longer has that defender.",
        { goal: "Capture the bishop on g7.", followUp: "The defender is gone. Use the rook to capture the knight on f6.", attackSquares: ["f6"], attackFrom: ["f1", "g7"], mistakes: { f6: "The bishop on g7 can recapture on f6. Remove it first." } }),
      exercise("Hanging piece", "A piece is hanging when it can be captured without an adequate reply. Check whether another enemy piece can take back.",
        position({ d4: "wR", d7: "bN" }), [move("d4", "d7")], "The rook wins a knight and Black has no recapture.",
        { goal: "Capture the undefended knight.", attackSquares: ["d7"], attackFrom: ["d4"], mistakes: { d6: "You can move to d6, but taking on d7 wins the undefended knight immediately." } }),
      exercise("Back-rank mate", "The back rank is the row a player’s king starts on. Pawns can trap the king there. A rook or queen checking along that rank can give mate.",
        position({ a2: "wR", f7: "bP", g7: "bP", h7: "bP" }), [move("a2", "a8")], "The rook controls the eighth rank. The pawns block the king’s escape squares, and Black cannot block or capture the rook.",
        { goal: "Find checkmate by moving the rook to a8.", mistakes: { a7: "The rook must check along the king’s back rank." } })
    ]
  }
];
