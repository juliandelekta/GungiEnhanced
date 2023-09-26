const Board = {
    margin: 600,
    buttons: Array(9 * 9).fill(0).map(() => new SquareButton()),
    z: -1,

    init() {
        this.canvas = document.createElement("canvas")
        this.ctx = this.canvas.getContext("2d")
        ButtonManager.addButton(this)
        this.mouseOver = true
    },

    resize(w, h) {
        this.size = Math.min(w - this.margin, h)
        this.canvas.width = this.canvas.height = this.size
        this.x = w * .5 - this.size * .5
        this.y = h * .5 - this.size * .5
        this.buttons.forEach((btn, i) => {
            btn.square = Engine.board[i]
            btn.onClick = () => this.onButtonClick(btn)
            btn.onRightClick = () => this.onButtonRightClick(btn)
            ButtonManager.addButton(btn)
        })
        this.reorderButtons()
    },

    reorderButtons() {
        const DIM = this.size * .1, off = DIM * .5
        for (let y = 0, i = 0; y < 9; y++) {
            for (let x = 0; x < 9; x++, i++) {
                const btn = this.buttons[i]
                btn.w = btn.h = DIM
                btn.x = this.x + off + x * DIM
                btn.y = this.y + off + y * DIM
            }
        }
    },

    draw() {
        this.ctx.drawImage(Renderer.images.board, 0, 0, this.size, this.size)
        for (const btn of this.buttons) {
            this.ctx.fillStyle = "#ff04"
            if (btn.mouseOver)
                this.ctx.fillRect(btn.x - this.x, btn.y - this.y, btn.w, btn.h)
        }
        if (Renderer.showPromotion)
            this.drawPromotion(this.ctx)
        if (!Renderer.actionAnimation.animating)
            this.drawPossibleMoves(this.ctx)
        this.drawPieces(this.ctx)
    },

    drawPromotion(ctx) {
        const DIM = this.size * .1, off = DIM * .5
        ctx.strokeStyle = "#ec0"
        ctx.lineWidth = DIM * .07
        Engine.board.filter(square => Engine.currentPlayer.promotionBoard[square.position])
            .forEach(square => ctx.strokeRect(off + square.column * DIM, off + square.row * DIM, DIM, DIM))
    },

    drawPossibleMoves(ctx) {
        const DIM = this.size * .1, off = DIM * .5
        for (const action of PlayerAction.possibleMoves) {
            if (!action.target) continue
            const x = off + action.target.column * DIM,
                  y = off + action.target.row * DIM

            if (action instanceof MoveAction) {
                ctx.fillStyle = "rgba(62, 171, 229, 0.58)"
                ctx.fillRect(x, y, DIM, DIM)
            } else if (action instanceof MountAction) {
                ctx.fillStyle = "rgba(147, 73, 231, 0.63)"
                ctx.fillRect(x, y, DIM, DIM)
            }
            
            if (!action.isLegal && (action instanceof DropAction || action.target.isEmpty())) {
                ctx.fillStyle = "#333a"
                ctx.fillRect(x, y, DIM, DIM)
            }
        }
    },

    drawPieces(ctx) {
        const DIM = Math.round(this.size * .1), off = DIM * .5
        for (let row = 0, pos = 0, y = off; row < 9; row++, y += DIM) {
            for (let col = 0, x = off; col < 9; col++, pos++, x += DIM) {
                const square = Engine.board[pos]
                if (Renderer.showingTower && square === Renderer.showingTower.square) continue

                const squareSelected = PlayerAction.origin === square || PlayerAction.target === square

                const pieces = Renderer.actionAnimation.animating ? square.pieces.filter(piece => !Renderer.actionAnimation.includes(piece)) : square.pieces
                
                pieces.forEach((piece, tier) => {
                    const offY = y - tier * off * .2
                    ctx.drawImage(Renderer.getImageFromPiece(piece), x, offY, DIM, DIM)
                    if (squareSelected && PlayerAction.piece === piece)
                        ctx.drawImage(Renderer.images.selection, x, offY, DIM, DIM)
                })

                if (!Renderer.actionAnimation.animating)
                    this.drawActionOnPiece(ctx, square)

            }
        }
    },

    drawActionOnPiece(ctx, square) {
        const DIM = Math.round(this.size * .1), off = DIM * .5
        for (const action of PlayerAction.possibleMoves) {
            if (action.target !== square)
                continue
            const x = off + square.column * DIM,
                y = off + square.row * DIM
            const tier = square.getTier() - 1

            if (action instanceof CaptureAction || action instanceof CaptureInTowerAction)
                ctx.drawImage(Renderer.images.capture, x, y - tier * off * .2, DIM, DIM)
            else if (action instanceof JumpOnAction)
                ctx.drawImage(Renderer.images.jump, x, y - tier * off * .2, DIM, DIM)

            if (!action.isLegal && tier >= 0 && !(action instanceof CrownWithReplacementAction) && !(action instanceof CrownWithoutReplacementAction))
                ctx.drawImage(Renderer.images.disabled2, x, y - tier * off * .2, DIM , DIM)
        }
    },

    update() {
        this.buttons.forEach(btn => btn.update())
    },

    onButtonClick(btn) {
        PlayerAction.sendSquare(btn.square)
        WindowManager.hud.sendFront()
        if (Hand.getCurrentHand().isOpen && !Hand.getCurrentHand().isCrown && !Hand.getCurrentHand().isSwitch)
            Hand.getCurrentHand().toggle()
    },

    onButtonRightClick(btn) {
        if (btn.square.getTier() <= 1) return
        Renderer.showTower(btn.square, btn.x, btn.y)
        WindowManager.hud.sendFront()
    },

    onClick() {
        PlayerAction.clear()
        SquareActions.clear()
        WindowManager.hud.sendFront()
        if (Hand.getCurrentHand().isOpen && !Hand.getCurrentHand().isCrown && !Hand.getCurrentHand().isSwitch)
            Hand.getCurrentHand().toggle()
    },
    
    getButtonOf(square) {
        for (const btn of this.buttons)
            if (btn.square === square)
                return btn
    }
}
