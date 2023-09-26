class Army {
	pawnsInColumn = Array(9).fill(0)
	jokers = Array(9).fill(false)
	recovered = [null, null]
	enemyRecovered = null
	relocated = null
	recruited = null
	lastSwitch = null
	crown = null
	isInCheck = false
	promotionBoard = Array(9 * 9).fill(false)
	piecesInHand = []
	moves = new Array(9 * 9).fill(false)

	constructor(name, isBelow) {
		this.name = name
		this.isBelow = isBelow
		this.king = new King()
		this.cannon = new Cannon()
		this.fortress = new Fortress()
		this.pieces = [
			this.king,
			new Swordsman(), new Swordsman(),
			new PawnOfMajor(),
			new PawnOfJoker(), new PawnOfJoker(), new PawnOfJoker(), new PawnOfJoker(), 
			new PawnOfJoker(), new PawnOfJoker(), new PawnOfJoker(),
			new PawnOfPig(),
			new Assassin(), new Assassin(), new Assassin(),
			this.fortress,
			this.cannon,
			new Lion(),
			new Unicorn(),
			new Archer(), new Archer(),
			new Captain(), new Captain()
		]
		this.pieces.forEach(piece => piece.army = this)
		this.reset()
	}

	reset() {
		this.piecesInHand.length = 0
		this.piecesInHand.push(...this.pieces)
		this.recovered.fill(null)
		this.pawnsInColumn.fill(0)
		this.jokers.fill(false)
		this.fortress.position = this.king.position = this.cannon.position = -1
		this.relocated = this.crown = this.lastSwitch = null
		this.isInCheck = false
	}

	fillPromotion() {
		this.promotionBoard.fill(false)
        if (this.cannon.position >= 0) this.cannon.fillBoardPromotion()
		if (this.fortress.position >= 0) this.fortress.fillBoardPromotion()
		for (let i = 0; i < this.promotionBoard.length; i++)
			this.promotionBoard[i] = this.promotionBoard[i] && (Engine.board[i].isEmpty() ||Engine.board[i].pieceOnTop().canPromote)
	}

	getTierAt(position) {
		let tier = Engine.board[position].pieces.length - 1
		if (tier < 2 && this.promotionBoard[position])
			tier++
		return tier
	}

	updateRecovered() {
		if (this.recovered[0] || this.recovered[1]) {
			const pieceRecovered = this.recovered[0]
			this.recovered[0] = this.recovered[1]
			this.recovered[1] = null
            if (pieceRecovered)
                this.piecesInHand.push(pieceRecovered)
		}
		
		if (this.enemyRecovered) {
			this.piecesInHand.push(this.enemyRecovered)
			this.enemyRecovered = null
		}
	}

	doubleJokerInPosition(position) {
		return this.jokers[position % 9]
	}

	doublePawnInPosition(position) {
		return this.pawnsInColumn[position % 9] > 0
	}

	recover(piece) {
		if (Engine.currentPlayer === this)
			this.recovered[1] = piece
		else
			this.enemyRecovered = piece
	}

    pickRecentlyRecovered() {
        const r = this.recovered[1]
        this.recovered[1] = null
        return r
    }

    removeInHand(piece) {
        this.piecesInHand.splice(this.piecesInHand.indexOf(piece), 1)
    }

    addInHand(piece) {
        this.piecesInHand.push(piece)
    }

    setPiecesInHand(pieces) {
        this.piecesInHand.length = 0
        pieces = pieces.toUpperCase()
        const added = new Set()
        const myPieces = this.pieces.concat(this.enemy.pieces.map(p => p.otherSide).filter(p => p))
        for (const toAdd of pieces) {
            for (const piece of myPieces) {
                if (piece.letter === toAdd && !added.has(piece)) {
                    this.addInHand(piece)
                    added.add(piece)
                    break
                }
            }
        }
    }

    setEnemy(enemy) {
        this.enemy = enemy
        this.pieces.filter(piece => piece.otherSide).forEach(piece => piece.otherSide.army = enemy)
    }
}
