const Arrangement = {
    possibleMoves: [],

    pieces: [],

    boardButtons: [],
    doneButton: new RoundButton(),
    handY: 0,
    z: -1,

    init() {
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 9; col++) {
                const button = new SquareButton()
                button.onRightClick = () => this.onBoardRightClick(button)
                button.onClick = () => this.onBoardClick(button.pos)
                ButtonManager.addButton(button)
                this.boardButtons.push(button)
                button.row = row
                button.col = col
            }
        }
        this.doneButton.onClick = () => this.onDoneClick()
        ButtonManager.addButton(this.doneButton)
        ButtonManager.addButton(this)
        this.mouseOver = true
    },

    resize(w, h) {
        this.x = w * .5 - Board.size * .5
        this.DIM = Board.size * .1
        this.handY = Math.round((h - this.DIM * 4) * .5 + this.DIM * 2.5)
        this.doneButton.r = Math.round(this.DIM * .8)
        this.doneButton.setPos(
            Math.round(w * .5),
            this.handY + this.DIM * 2 - this.doneButton.r
        )
        this.reorderButtons()
    },

    addPiece(piece) {
        const button = new RoundButton()
        button.piece = piece
        button.onClick = () => this.onPieceClick(button)
        ButtonManager.addButton(button)
        this.pieces.push(button)
        this.reorderButtons()
    },

    removePiece(piece) {
        for (let i = 0; i < this.pieces.length; i++) {
            if (this.pieces[i].piece === piece) {
                ButtonManager.removeButton(this.pieces[i])
                this.pieces.splice(i, 1)
                this.reorderButtons()
                return
            }
        }
        console.error("Piece not found", piece, this.pieces)
    },

    loadArmy(army) {
        for (const piece of army.piecesInHand) this.addPiece(piece)

        const off = army.isBelow ? 6 * 9 : 0
        this.boardButtons.forEach((button, i) => button.pos = i + off)
    },

    reorderButtons() {
        for (let i = 0; i < this.pieces.length; i++) {
            const piece = this.pieces[i]
            piece.r = this.DIM * .5
            piece.setPos(
                this.x + this.DIM + (i % 9) * piece.r * 2,
                this.handY + piece.r + Math.floor(i / 9) * piece.r * 2
            )
        }
        this.boardButtons.forEach(button => {
            button.x = this.x + (button.col + .5) * this.DIM
            button.y = (button.row + .5) * this.DIM
            button.w = button.h = this.DIM
        })
    },

    onPieceClick(button) {
        PlayerAction.clear()
        PlayerAction.action = PutAction
        PlayerAction.pieceInHand = button.piece

        this.possibleMoves = Action.getOfPhaseArrangement().filter(action => action.piece === button.piece && action instanceof PutAction)
    },

    onBoardClick(pos) {
        const square = Engine.board[pos]
        if (!PlayerAction.action) {
            if (!square.isEmpty()) {
                PlayerAction.clear()
                const action = new RemoveAction(square)
                action.execute()
                this.addPiece(Engine.currentPlayer.piecesInHand.slice(-1)[0])
                this.doneButton.enabled = false
            }
        } else {
            const action = this.possibleMoves.filter(action => action.target === square)[0]
            if (action.isLegal) {
                PlayerAction.clear()
                action.execute()
                this.removePiece(action.piece)
                this.possibleMoves.length = 0
                if (!Engine.currentPlayer.piecesInHand.length)
                    this.doneButton.enabled = true
            } else {
                Renderer.showReasons(action.reasons)
            }
        }
    },

    onBoardRightClick(button) {
        const square = Engine.board[button.pos]
        if (square.getTier() <= 1) return
        Renderer.showTower(square, button.x, button.y)
    },

    onDoneClick() {
        if (!Engine.whiteArmy.piecesInHand.length && !Engine.blackArmy.piecesInHand.length) {
            Engine.endArrangementPhase()
            Engine.switchPlayer()
            Notation.start()
            Renderer.battleMessage.show()
            Gungi.startHands()
        } else {
            Engine.switchPlayer()
            this.doneButton.enabled = false
            this.loadArmy(Engine.currentPlayer)
        }
        setTimeout(() => AI.play(), AI.responseDelay)
        Renderer.showChangeTurn()
    },

    onClick() {
        PlayerAction.clear()
        this.possibleMoves.length = 0
    },

    update() {
        this.doneButton.update()
        this.pieces.forEach(piece => piece.update())
        this.boardButtons.forEach(button => button.update())
    },

    draw(ctx) {
        const y = Board.size * .05, width = Board.size
        const img = Renderer.images.board
        if (Engine.currentPlayer.isBelow)
            ctx.drawImage(img, 0, img.height * 0.65, img.width, img.height * 0.35, this.x, y, width, this.DIM * 3.5)
        else
            ctx.drawImage(img, 0, 0, img.width, img.height * 0.35, this.x, 0, width, this.DIM * 3.5)

            
        for (const btn of this.boardButtons) {
            ctx.fillStyle = "#ff04"
            if (btn.mouseOver)
                ctx.fillRect(btn.x, btn.y, this.DIM, this.DIM)
        }

        ctx.lineWidth = this.DIM * .07

        if (Renderer.showPromotion)
            this.drawPromotion(ctx)

        this.drawIlegalMoves(ctx)
        this.drawPiecesInBoard(ctx)

        if (!this.doneButton.enabled) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
            ctx.fillRect(this.x, this.handY - this.DIM * .5, width, this.DIM * 4)
            ctx.font = this.doneButton.r * .4 + "px Paytone"
            this.drawPiecesInHand(ctx)
        } else {
            const b = this.doneButton
            ctx.drawImage(Renderer.images.done, b.x - b.r, b.y - b.r, b.r + b.r, b.r + b.r)
            if (b.mouseOver) {
                ctx.fillStyle = "rgba(72, 221, 139, 0.3)"
                ctx.beginPath()
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
                ctx.fill()
                ctx.canvas.style.cursor = "pointer"
            }
        }

    },

    drawPromotion(ctx) {
        const x0 = ctx.canvas.width * .5 - Board.size * .45
        let pos = Engine.currentPlayer.isBelow ? 9 * 6 : 0
        ctx.strokeStyle = "#ec0"
        for (let row = 0, y = Board.size * .05; row < 3; row++, y += this.DIM)
            for (let col = 0, x = x0; col < 9; col++, pos++, x += this.DIM)
                if (Engine.currentPlayer.promotionBoard[pos])
                    ctx.strokeRect(x, y, this.DIM, this.DIM)
    },

    drawIlegalMoves(ctx) {
        const from = Engine.currentPlayer.isBelow ? 6 : 0
        ctx.fillStyle = "#333a"
        this.possibleMoves.filter(action => !action.isLegal).forEach(action => {
            ctx.fillRect(this.x + (action.target.column + .5) * this.DIM, (action.target.row - from + .5) * this.DIM, this.DIM, this.DIM)
        })
    },

    drawPiecesInBoard(ctx) {
        const from = Engine.currentPlayer.isBelow ? 6 * 9 : 0
        Engine.board.slice(from, from + 27).filter(square => !Renderer.showingTower || square !== Renderer.showingTower.square)
            .forEach(square => {
            const x = this.x + (square.column + .5) * this.DIM,
                  y = (square.row - from/9 + .5) * this.DIM

            let off = 0
            for (const piece of square.pieces) {
                ctx.drawImage(Renderer.getImageFromPiece(piece), x, y + off, this.DIM, this.DIM)
                off -= this.DIM * .1
            }

            this.possibleMoves.filter(action => action.target === square && !action.isLegal && !action.target.isEmpty())
                .forEach(() => {
                    ctx.drawImage(Renderer.images.disabled2, this.x + (square.column + .5) * this.DIM,
                        (square.row - from/9 + .5) * this.DIM - this.DIM * .1 * (square.getTier()-1), this.DIM, this.DIM)
                })
        })
    },

    drawPiecesInHand(ctx) {
        let pieceOver = null
        this.pieces.filter(b => b.piece !== PlayerAction.pieceInHand).forEach(p => {
            if (p.mouseOver && !PlayerAction.action) {
                pieceOver = p
            } else {
                ctx.drawImage(Renderer.getImageFromPiece(p.piece), p.x - p.r, p.y - p.r, p.r + p.r, p.r + p.r)
                if (p.piece instanceof Pawn || p.piece instanceof Griffin) {
                    ctx.fillStyle = p.piece.army === Engine.blackArmy ? "#fff" : "#000"
                    ctx.fillText(p.piece.otherSide.letter, p.x + p.r * .3, p.y + p.r * .7)
                }
            }
        })

        if (pieceOver) {
            const p = pieceOver
            const r = Math.floor(p.r * 1.2)
            ctx.drawImage(Renderer.getImageFromPiece(p.piece), p.x - r, p.y - r, r + r, r + r)
            ctx.canvas.style.cursor = "pointer"
        }
    },

    load() {
        for (const piece of this.pieces)
            ButtonManager.removeButton(piece)
        this.pieces.length = 0
		this.doneButton.enabled = Engine.currentPlayer.piecesInHand.length === 0
        this.loadArmy(Engine.currentPlayer)
        Renderer.showChangeTurn()
    }
}

Arrangement.doneButton.enabled = false
