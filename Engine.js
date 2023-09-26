const Engine = {
	victory: null,
	canRecover: false,
	isArrangementPhase: false,

	settings: {
		withCrown: true
	},

	board: Array(9 * 9).fill(0).map((_, i) => new Square(i)),
	possibleMoves: Array(9 * 9).fill(false),
	enemyMoves: Array(9 * 9).fill(false),
	auxMoveBoard: Array(9 * 9).fill(false),

	blackArmy: new Army("black", false),
	whiteArmy: new Army("white", true),

	currentPlayer: null,
	enemyPlayer: null,

	isAlly(piece) {
		return piece.army === this.currentPlayer
	},

	isEnemy(piece) {
		return piece.army === this.enemyPlayer
	},

	getMoveSet(square, army) {
		const piece = square.pieceOnTop()
		const pieceBelow = square.pieceBelowTop()

		// [Rule] Imitation
		if (piece.hasImitation && square.pieces.length > 1)
			return (pieceBelow.moveSet ? pieceBelow : piece).moveSet[army.getTierAt(square.position)]

		// [Rule] Default to Major except King
		if (!(piece instanceof King) && pieceBelow && this.isEnemy(pieceBelow))
			return defaultMoveSet

		return piece.moveSet[army.getTierAt(square.position)]
	},

	loadPossibleMoves(position) {
		this.possibleMoves.fill(false)
		this.getMoveSet(this.board[position], this.currentPlayer).setBoard(position, this.possibleMoves, !this.currentPlayer.isBelow)
	},

	loadMountMoves(position) {
		this.possibleMoves.fill(false)
		this.board[position].pieceOnBase().mountMoveSet.setBoard(position, this.possibleMoves, !this.currentPlayer.isBelow)
	},

	loadEnemyMoves(moves) {
		moves.fill(false)
		for (let i = 0; i < 81; i++) {
			const square = this.board[i]
			if (square.isEmpty() || this.isAlly(square.pieceOnTop()))
				continue

			this.getMoveSet(square, this.enemyPlayer).setBoard(i, moves, !this.enemyPlayer.isBelow)
		}
	},

	nextTurn() {
		this.blackArmy.fillPromotion()
		this.whiteArmy.fillPromotion()

		this.currentPlayer.updateRecovered()

		this.switchPlayer()
		this.currentPlayer.isInCheck = false
		this.loadEnemyMoves(this.enemyMoves)
		const kingSquare = this.board[this.currentPlayer.king.position]
		if (this.enemyMoves[this.currentPlayer.king.position] || kingSquare.pieces.length > 1 && this.isEnemy(kingSquare.pieceBelowTop())) {
			this.currentPlayer.isInCheck = true
		}

		const actions = Action.getOfPhaseAction()

		if (actions.filter(a => a.isLegal).length === 0) {
			if (this.currentPlayer.isInCheck) {
				this.victory = {
					winner: this.enemyPlayer,
					reason: "Jaque Mate"
				}
			} else {
				this.victory = {
					winner: null,
					reason: "Stale Mate"
				}
			}
		}
	},

	possibleEnemyCheck(piece, square, tier) {
		const aux = [...square.pieces]
		square.pieces[tier] = piece
		this.auxMoveBoard.fill(false)
		this.getMoveSet(square, this.currentPlayer).setBoard(square.position, this.auxMoveBoard, !this.currentPlayer.isBelow)
		
		const kingSquare = this.board[this.enemyPlayer.king.position]
		const check = square.pieceOnTop() === piece && this.auxMoveBoard[this.enemyPlayer.king.position] ||
			kingSquare.pieces.length > 1 && this.isAlly(kingSquare.pieceBelowTop())
		square.pieces = aux
		return check
	},
	
	possiblePlayerCheck(piece, square, tier, kingPos) {
		const aux = [...square.pieces]
		
		if (tier !== null)
			square.pieces[tier] = piece

        this.loadEnemyMoves(this.auxMoveBoard)
		
		square.pieces = aux
		return this.auxMoveBoard[kingPos] ||
			this.board[kingPos].pieces.length > 1 && this.isEnemy(this.board[kingPos].pieceBelowTop()) && !this.settings.withCrown
	},

	reset() {
		this.board.forEach(square => square.pieces.length = 0)
		this.currentPlayer = Engine.blackArmy
		this.victory = null
		this.isArrangementPhase = true
		this.blackArmy.reset()
		this.whiteArmy.reset()
	},

	loadNotation(notation) {
        this.board.forEach(square => square.pieces.length = 0)
        const usedPieces = new Set()
		let pos = 0, isTower = false
		for (let i = 0; i < notation.length; i++) {
			const c = notation[i]
			if (parseInt(c)) {
				pos += parseInt(c)
			} else if (c === "(")
				isTower = true
			else if (c === ")") {
				isTower = false
				pos++
			} else if (c !== "/") {
				this.board[pos].push(this.getPieceFromChar(c, usedPieces))
				if (!isTower)
					pos++
			}
		}
	},

    getPieceFromChar(c, usedPieces) {
        const army = c.charCodeAt(0) < 91 ? this.blackArmy : this.whiteArmy
        c = c.toUpperCase()
        const myPieces = army.pieces.concat(army.enemy.pieces.map(p => p.otherSide).filter(p => p))
        for (const piece of myPieces)
            if (piece.letter === c && !usedPieces.has(piece)) {
                usedPieces.add(piece)
                return piece
            }
        console.error("Piece not found", c, usedPieces)
    },

    setVictory(winner, reason) {
        this.victory = { winner, reason }
    },

    setCurrentPlayer(color) {
        this.currentPlayer = color === "black" ? this.blackArmy : this.whiteArmy
        this.enemyPlayer = this.currentPlayer.enemy
    },

	switchPlayer() {
		this.currentPlayer = this.enemyPlayer
		this.enemyPlayer = this.currentPlayer.enemy
	},

    endArrangementPhase() {
        this.isArrangementPhase = false
    },

    isThereAnyAllyIn(square) {
        return square.pieces.reduce((acc, piece) => acc || (piece.army === Engine.currentPlayer), false)
    }
}

Engine.blackArmy.setEnemy(Engine.whiteArmy)
Engine.whiteArmy.setEnemy(Engine.blackArmy)

Engine.setCurrentPlayer("black")
