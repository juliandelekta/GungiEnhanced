const PlayerAction = {
	origin: null, target: null,
	action: null,
	piece: null,
    pieceInHand: null,
    possibleMoves: [],
    possiblesInOrigin: [],

    clear() {
        this.action = this.piece = this.pieceInHand = this.origin = this.target = null
        this.possibleMoves.length = 0
    },

    sendPiece(piece) {
        this.possibleMoves = Action.getOfPhaseAction().filter(action => action.piece === piece)
        this.action = true
    },

    sendSquare(square) {
        if (!this.origin) {
            if (!this.action) {
                this.setOriginSquare(square)
            } else {
                const action = this.possibleMoves.filter(action => action.target === square)[0]
                if (action.isLegal) {
                    this.action = action
                    action.execute()
                    Gungi.endPhase()
                } else
                    Renderer.showReasons(action.reasons)
            }
        } else {
            const actions = this.possibleMoves.filter(accion => accion.target === square)
            const canChange = Engine.isThereAnyAllyIn(square)
            if (!actions.length) {
                this.setOriginSquare(square)
            } else if (actions.length === 1 && !canChange) {
                const action = actions[0]
                if (action.isLegal) {
                    this.action = action
                    Renderer.actionAnimation.setAction(action, () => Gungi.endPhase())
                    action.execute()
                } else {
                    Renderer.showReasons(action.reasons)
                }
            } else {
                const toSend = actions.filter(action => action instanceof JumpOnAction || action instanceof CaptureAction || action instanceof SacrificeAction)
                if (canChange)
                    toSend.push(new ChangeAction(square))
                const { x, y } = Board.getButtonOf(square)
                SquareActions.setTarget(toSend, x, y)
            }
        }
    },

    setOriginSquare(square) {
        const { x, y } = Board.getButtonOf(square)
        SquareActions.clear()
        Renderer.hideAllEffects()
        this.originTier = (square.pieces[2] && Engine.isAlly(square.pieces[2])) ? 2
            : (square.pieces[1] && Engine.isAlly(square.pieces[1])) ? 1
            : (square.pieces[0] && Engine.isAlly(square.pieces[0])) ? 0 : -1

        const actions = Action.getOfPhaseAction()
        this.target = null
        this.loadPossiblesInOrigin(square, actions, x, y)

        this.possibleMoves = actions.filter(action => action.origin === square && (!(action instanceof MountAction) || this.originTier === 0))
        if (this.possibleMoves.length)
            this.origin = square
    },

    loadPossiblesInOrigin(square, actions, x, y) {
        this.possiblesInOrigin = actions.filter(action => action.target === square && !(action instanceof DropAction) && !action.origin)
        if (this.originTier > 0 && actions.filter(action => action instanceof MountAction && action.origin === square).length)
            this.possiblesInOrigin.push(new MountChangeAction(square))
		
        if (!this.possiblesInOrigin.length) return

        this.target = this.possiblesInOrigin[0].target
        SquareActions.setOrigin(this.possiblesInOrigin, x, y)
    },

    loadMountMoves(square) {
        SquareActions.clear()
        this.possibleMoves = Action.getOfPhaseAction().filter(action => action.origin === square && action instanceof MountAction)
        this.origin = square
        this.action = true

        if (Engine.isAlly(square.pieceOnTop())) {
            const { x, y } = Board.getButtonOf(square)
            SquareActions.setOrigin([new MountChangeAction(square)], x, y)
		}
    }
}
