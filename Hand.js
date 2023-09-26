class Hand {
    y = 0
    by = 0
    height = 0
    piecesPerRow = 0
    army = null
    animating = false
    isLegal = true
    isShown = false
    isOpen = false
    isCrown = false
    isSwitch = false

    static getCurrentHand() {
        return Engine.currentPlayer.isBelow ? LowerHand : UpperHand
    }

    pieces = []

    button = new RoundButton(0, 0, 0)

    crownIsLegal = true

    constructor() {
        this.canvas = document.createElement("canvas")
        this.ctx = this.canvas.getContext("2d")
        this.button.onClick = () => this.onButtonClick()
        ButtonManager.addButton(this.button)
    }

    onButtonClick() {
        if (this.isCrown) {
            const action = PlayerAction.possibleMoves.filter(action => action instanceof CrownWithoutReplacementAction)[0]
            if (this.isLegal) {
                PlayerAction.action = action
                PlayerAction.action.execute()
                this.isCrown = false
                this.isLegal = true
                this.pieces.forEach(piece => piece.isLegal = true)
                this.toggle()
                setTimeout(() => Gungi.endPhase(), 700)
            } else {
                Renderer.showReasons(action.reasons)
            }
        } else {
            this.toggle()
        }
    }

    onPieceClick(button) {
        const action = PlayerAction.possibleMoves.filter(action => action.piece === button.piece)[0]
        const actionInOrigin = PlayerAction.possiblesInOrigin.filter(action => action.piece === button.piece)[0]
        if (!button.isLegal) {
            Renderer.showReasons(action ? action.reasons : actionInOrigin.reasons)
            return
        }
    
        if (this.isCrown) {
            action.execute()
            PlayerAction.action = action
            this.isCrown = false
            this.isLegal = true
            this.pieces.forEach(piece => piece.isLegal = true)
            setTimeout(() => Gungi.endPhase(), 700)
        } else if (this.isSwitch) {
            this.isSwitch = false
            this.isLegal = true
            this.pieces.forEach(piece => piece.isLegal = true)
            PlayerAction.action = actionInOrigin
            actionInOrigin.execute()
            Renderer.actionAnimation.setAction(action, () => Gungi.endPhase())
        } else {
            PlayerAction.sendPiece(button.piece)
            PlayerAction.pieceInHand = button.piece
            WindowManager.hud.sendBack()
        }

        Renderer.hideAllEffects()
        this.toggle()
    }

    resize(w) {
        if (!this.army) return
        const size = Board.size * .1
        this.piecesPerRow = Math.floor(w / size)
        this.height = Math.ceil((this.army.piecesInHand.length + !!this.army.recovered[0] + !!this.army.enemyRecovered)  / this.piecesPerRow) * size || Math.round(size / 2)
        this.button.r = Math.floor(Board.size * .08)
        this.canvas.width = w
        this.canvas.height = this.height + this.button.r * 2
        this.onResize(w)
        this.reorderButtons()
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.doDraw(this.ctx)

        if (!this.isLegal || this.button.mouseOver) {
            this.ctx.fillStyle = this.isLegal ? "rgba(72, 221, 139, .3)" : "#333e"
            this.ctx.beginPath()
            this.ctx.arc(this.button.x, this.by + this.button.r, this.button.r, 0, Math.PI * 2)
            this.ctx.fill()
        }

        if (this.button.mouseOver || this.pieces.filter(p => p.mouseOver).length)
            Renderer.canvas.style.cursor = "pointer"
    }

    update() {
        this.button.update()

        this.pieces.forEach(piece => piece.update())
    }

    addPiece(piece) {
        const button = new RoundButton()
        button.piece = piece
        button.z = 20
        button.isLegal = true
        button.onClick = () => this.onPieceClick(button)
        ButtonManager.addButton(button)
        this.pieces.push(button)
    }

    removePiece(piece) {
        for (let i = 0; i < this.pieces.length; i++) {
            if (this.pieces[i].piece === piece) {
                ButtonManager.removeButton(this.pieces[i])
                this.splice(i, 1)
                this.reorderButtons()
                return
            }
        }
        console.error("Piece not found", piece, this.pieces)
    }

    setArmy(army) {
        this.army = army
        for (const piece of this.pieces)
            ButtonManager.removeButton(piece)
        this.pieces.length = 0
        for (const piece of army.piecesInHand) this.addPiece(piece)
        this.resize(Renderer.canvas.width)
        this.reorderButtons()
    }

    toggle() {
        this.button.enabled = false
        this.pieces.forEach(piece => piece.enabled = false)

        if (!PlayerAction.pieceInHand) {
            if (this.isOpen)
                WindowManager.hud.sendFront()
            else
                WindowManager.hud.sendBack()
        }
        this.animating = true
        this.doToggle()
    }

    toggleOnFinish() {
        this.animating = false
        this.reorderButtons()
        this.button.enabled = true
        this.pieces.forEach(piece => piece.enabled = true)
        this.isOpen = !this.isOpen
    }

    openForSwitch() {
        this.toggle()
        this.isLegal = true
        this.isSwitch = true
        const actions = PlayerAction.possiblesInOrigin.filter(action => !action.isLegal).filter(action => action instanceof SwitchAction)
        for (const action of actions)
            for (const piece of this.pieces)
                if (action.piece === piece)
                    piece.isLegal = false
    }

    openForCrown() {
        this.toggle()
        this.isLegal = true
        this.isCrown = true
        this.addPiece(this.army.piecesInHand.slice(-1)[0])
        const ilegalActions = PlayerAction.possibleMoves.filter(action => !action.isLegal)
        ilegalActions.filter(action => action instanceof CrownWithReplacementAction).forEach(action => {
            for (const button of this.pieces)
                if (action.piece === button.piece)
                    button.isLegal = false
        })
        if (ilegalActions.filter(action => action instanceof CrownWithoutReplacementAction).length)
            this.isLegal = false
    }
}

const UpperHand = new class UpperHand extends Hand {
    onResize() {
        this.y = this.isShown ? (this.isOpen ? 0 : -this.height) : -this.canvas.height
    }

    reorderButtons() {
        this.button.x = this.canvas.width - this.button.r
        this.button.y = this.y + this.height + this.button.r
        for (let i = 0; i < this.pieces.length; i++) {
            const button = this.pieces[i]
            button.r = Math.floor(Board.size * .05)
            button.y0 = this.height - (Math.floor(i / this.piecesPerRow) + .5) * 2 * button.r
            button.setPos(
                this.canvas.width - ((i % this.piecesPerRow) + .5) * 2 * button.r,
                this.y + button.y0
            )
        }
    }

    doDraw(ctx) {
        const d = this.button.r * 2
        this.by = this.height
        ctx.drawImage(this.isCrown
            ? Renderer.images.whithoutReplacement
            : Renderer.images.hand,
            this.canvas.width - d, this.height, d, d)

        ctx.fillStyle = "rgba(0, 10, 30, 0.86)"
        ctx.fillRect(0, 0, this.canvas.width, this.height)
        ctx.font = this.button.r * .4 + "px Paytone"

        for (let p of this.pieces) {
            if (PlayerAction.pieceInHand !== p.piece)
                ctx.drawImage(Renderer.getImageFromPiece(p.piece), p.x - p.r, p.y0 - p.r, p.r + p.r, p.r + p.r)
            if (!p.isLegal)
                ctx.drawImage(Renderer.images.disabled2, p.x - p.r, p.y0 - p.r, p.r + p.r, p.r + p.r)
            if (p.piece instanceof Pawn || p.piece instanceof Griffin) {
                ctx.fillStyle = this.army === Engine.blackArmy ? "#fff" : "#000"
                ctx.fillText(p.piece.otherSide.letter, p.x + p.r * .3, p.y0 + p.r * .7)
            }
        }

        const recovered = []
        if (this.army.recovered[0]) recovered.push(this.army.recovered[0])
        if (this.army.enemyRecovered) recovered.push(this.army.enemyRecovered)

        let i = this.pieces.length
        for (const piece of recovered) {
            const d = Math.floor(Board.size * .1)
            const x = this.canvas.width - (i % this.piecesPerRow) * d - d
            const y = this.height - Math.floor(i / this.piecesPerRow) * d - d
            ctx.fillStyle = "#6fada6a1"
            ctx.fillRect(x, y, d, d)
            ctx.drawImage(Renderer.getImageFromPiece(piece), x, y, d, d)
            i++
        }
        
    }

    openTick(t) {
        t = AnimationManager.easing.inOutCubic(t)
        this.y = (t - 1) * this.height
    }

    closeTick(t) {
        t = AnimationManager.easing.inOutCubic(t)
        this.y = - t * this.height
    }

    doToggle() {
        if (this.isOpen) {
            AnimationManager.playAnimation(t => this.closeTick(t), () => {
                this.toggleOnFinish()
                this.isCrown = this.isSwitch = false
            }, .7)
        } else {
            AnimationManager.playAnimation(t => this.openTick(t), () => this.toggleOnFinish(), .7)
        }
    }

    hide() {
        for (const piece of this.pieces)
            ButtonManager.removeButton(piece)
        this.pieces.length = 0
        this.animating = true
        this.button.enabled = false
        this.isOpen = false
        this.isShown = false
        this.pieces.forEach(piece => piece.enabled = false)
        AnimationManager.playAnimation(t => {
            t = AnimationManager.easing.inOutCubic(t)
            this.y = (t - 1) * this.height - t * this.canvas.height
        }, () => { this.animating = false }, .7)
    }

    show() {
        this.setArmy(this.army)
        this.animating = true
        this.isShown = true
        AnimationManager.playAnimation(t => {
            t = AnimationManager.easing.inOutCubic(t)
            this.y = (t - 1) * this.canvas.height - t * this.height
        }, () => { 
            this.animating = false
            this.button.enabled = true
            this.pieces.forEach(piece => piece.enabled = true)
            this.reorderButtons()
        }, .7)
    }

}

const LowerHand = new class LowerHand extends Hand {
    onResize() {
        this.y = Renderer.canvas.height - (this.isShown ? (this.button.r * 2 - (this.isOpen ? this.height : 0)) : 0)
    }

    reorderButtons() {
        this.button.x = this.button.r
        this.button.y = this.y + this.button.r

        for (let i = 0; i < this.pieces.length; i++) {
            const button = this.pieces[i]
            button.r = Board.size * .05
            button.setPos(
                ((i % this.piecesPerRow) + .5) * 2 * button.r,
                this.y + (Math.floor(i / this.piecesPerRow) + .5) * 2 * button.r + this.button.r * 2
            )
        }
    }

    doDraw(ctx) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        const d = this.button.r * 2
        ctx.drawImage(this.isCrown
            ? Renderer.images.whithoutReplacement
            : Renderer.images.hand,
            0, 0, d, d)

        ctx.fillStyle = "rgba(0, 10, 30, 0.86)"
        ctx.fillRect(0, d, this.canvas.width, this.height)
        ctx.font = this.button.r * .5 + "px Times New Roman"

        for (let i = 0; i < this.pieces.length; i++) {
            const d = Math.floor(Board.size * .1)
            const b = this.pieces[i]
            const x = (i % this.piecesPerRow) * d
            const y = this.button.r * 2 + Math.floor(i / this.piecesPerRow) * d
            if (PlayerAction.pieceInHand !== b.piece)
                ctx.drawImage(Renderer.getImageFromPiece(b.piece), x, y, d, d)
            if (!b.isLegal)
                ctx.drawImage(Renderer.images.disabled2, x, y, d, d)
            if (b.piece instanceof Pawn || b.piece instanceof Griffin) {
                ctx.fillStyle = this.army === Engine.blackArmy ? "#fff" : "#000"
                ctx.fillText(b.piece.otherSide.letter.toUpperCase(), x + d * .5, y + d)
            }
        }

        const recovered = []
        if (this.army.recovered[0]) recovered.push(this.army.recovered[0])
        if (this.army.enemyRecovered) recovered.push(this.army.enemyRecovered)

        let i = this.pieces.length
        for (const piece of recovered) {
            const d = Math.floor(Board.size * .1)
            const x = (i % this.piecesPerRow) * d
            const y = this.button.r * 2 + Math.floor(i / this.piecesPerRow) * d
            ctx.fillStyle = "#6fada6a1"
            ctx.fillRect(x, y, d, d)
            ctx.drawImage(Renderer.getImageFromPiece(piece), x, y, d, d)
            i++
        }
    }

    openTick(t) {
        t = AnimationManager.easing.inOutCubic(t)
        const y0 = Renderer.canvas.height - this.button.r * 2
        const y1 = y0 - this.height
        this.y = (1 - t) * y0 + t * y1
    }

    closeTick(t) {
        t = AnimationManager.easing.inOutCubic(t)
        const y0 = Renderer.canvas.height - this.button.r * 2
        const y1 = y0 - this.height
        this.y = (1 - t) * y1 + t * y0
    }

    doToggle() {
        if (this.isOpen) {
            AnimationManager.playAnimation(t => this.closeTick(t), () => {
                this.toggleOnFinish()
                this.isCrown = this.isSwitch = false
            }, .7)
        } else {
            AnimationManager.playAnimation(t => this.openTick(t), () => this.toggleOnFinish(), .7)
        }
    }

    hide() {
        for (const piece of this.pieces)
            ButtonManager.removeButton(piece)
        this.pieces.length = 0
        this.animating = true
        this.button.enabled = false
        this.isOpen = false
        this.isShown = false
        this.pieces.forEach(piece => piece.enabled = false)
        AnimationManager.playAnimation(t => {
            t = AnimationManager.easing.inOutCubic(t)
            const y0 = Renderer.canvas.height - this.button.r * 2
            const y1 = Renderer.canvas.height
            this.y = (1 - t) * y0 + t * y1
        }, () => { this.animating = false }, .7)
    }

    show() {
        this.setArmy(this.army)
        this.animating = true
        this.isShown = true
        AnimationManager.playAnimation(t => {
            t = AnimationManager.easing.inOutCubic(t)
            const y0 = Renderer.canvas.height - this.button.r * 2
            const y1 = Renderer.canvas.height
            this.y = (1 - t) * y1 + t * y0
        }, () => { 
            this.animating = false
            this.button.enabled = true
            this.pieces.forEach(piece => piece.enabled = true)
            this.reorderButtons()
        }, .7)
    }
}

function hideAndShowHands() {
    if (Engine.currentPlayer.isBelow) {
        LowerHand.show()
        UpperHand.hide()
    } else {
        LowerHand.hide()
        UpperHand.show()
    }
}
