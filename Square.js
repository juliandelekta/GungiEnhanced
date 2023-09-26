class Square {
	pieces = []

	constructor(position) {
		this.position = position
        this.column = position % 9
        this.row = ~~(position / 9)
	}

	pieceOnTop() {
		return this.pieces[this.pieces.length-1]
	}

	pieceBelowTop() {
		return this.pieces.length > 1 ? this.pieces[this.pieces.length-2] : null
	}

	pieceOnBase() {
		return this.pieces[0]
	}

	isEmpty() {
		return this.pieces.length === 0
	}

	isFull() {
		return this.pieces.length === 3
	}

	hasPieceOfSameKind(piece) {
		return this.pieces
			.filter(p => p.army === piece.army)
			.filter(p => p.hasSameKind(piece)).length > 0
	}

	getTier() {
		return this.pieces.length
	}

	push(piece) {
		this.pieces.push(piece)
        piece.position = this.position
	}

	pop() {
		const piece = this.pieces.pop()
        piece.position = -1
		return piece
	}

    replaceAt(tier, piece) {
        const old = this.pieces[tier]
        piece.position = old.position
        old.position = -1
        this.pieces[tier] = piece
    }
}
