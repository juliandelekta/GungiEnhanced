const SquareActions = {
    originButtons: [],
    targetButtons: [],
    size: 1,

    clear() {
        for (const btn of this.originButtons)
            ButtonManager.removeButton(btn)
        for (const btn of this.targetButtons)
            ButtonManager.removeButton(btn)
        this.originButtons.length = this.targetButtons.length = 0
    },

    resize() {
		this.size = Math.round(Board.size * .05)
		this.clear()
    },

    draw(ctx) {
        this.drawButtons(ctx, this.originButtons)
        this.drawButtons(ctx, this.targetButtons)
    },

    drawButtons(ctx, buttons) {
        for (const btn of buttons) {
            ctx.drawImage(btn.image, btn.x, btn.y, btn.w, btn.h)
            if (btn.action.isLegal) {
                if (btn.mouseOver) {
                    ctx.canvas.style.cursor = "pointer"
                    ctx.drawImage(Renderer.images.hover, btn.x, btn.y, btn.w, btn.h)
                }
            } else
                ctx.drawImage(Renderer.images.disabled, btn.x, btn.y, btn.w, btn.h)
        }
    },

    update() {
        this.originButtons.forEach(btn => btn.update())
        this.targetButtons.forEach(btn => btn.update())
    },

    setOrigin(actions, x, y) {
        this.setButtons(actions, x, y, this.originButtons)
    },

    setTarget(actions, x, y) {
        this.setButtons(actions, x, y, this.targetButtons)
    },

    setButtons(actions, x, y, buttons) {
        for (const btn of buttons)
            ButtonManager.removeButton(btn)
        buttons.length = 0
		x = x + this.size - (actions.length * this.size) * .5
		y = y - this.size
        for (const action of actions) {
            const btn = new SquareButton()
            btn.action = action
            btn.w = btn.h = this.size
            btn.y = y
            btn.x = x + buttons.length * this.size
            btn.z = 10
            btn.image = (action instanceof ChangeAction || action instanceof MountChangeAction) ? Renderer.images.changeAction
                : action instanceof JumpOnAction ? Renderer.images.jumpOnAction
                : action instanceof CaptureAction ? Renderer.images.captureAction
                : action instanceof SacrificeAction ? Renderer.images.sacrificeAction
                : action instanceof SubstituteAction ? Renderer.images.substituteAction
                : action instanceof SwitchAction ? Renderer.images.switchAction
                : action instanceof CaptureInTowerAction ? Renderer.images[`tower${action.tier}Action`] : null
            btn.onClick = (action instanceof ChangeAction || action instanceof MountChangeAction) ? (() => action.execute())
                : action instanceof SubstituteAction ? (() => this.onSubstituteAction(btn)) : (() => this.onAction(btn))
            buttons.push(btn)
            ButtonManager.addButton(btn)
        }
    },

    onAction(btn) {
        if (btn.action.isLegal) {
            PlayerAction.action = btn.action
            btn.action.execute()
            Renderer.actionAnimation.setAction(btn.action, () => Gungi.endPhase())
        } else
            Renderer.showReasons(btn.action.reasons)
    },

    onSubstituteAction(btn) {
        if (btn.action.isLegal) {
            Hand.getCurrentHand().openForSwitch()
        } else
            Renderer.showReasons(btn.action.reasons)
    }
}

class ChangeAction {
    isLegal = true

    constructor(square) {
        this.square = square
    }

    execute() {
        PlayerAction.clear()
        PlayerAction.setOriginSquare(this.square)
    }
}

class MountChangeAction {
    isLegal = true

    constructor(square) {
        this.square = square
    }

    execute() {
        PlayerAction.clear()
        if (PlayerAction.originTier === 0) {
            PlayerAction.setOriginSquare(this.square)
        } else {
            PlayerAction.originTier = 0
            PlayerAction.loadMountMoves(this.square)
        }
    }
}
