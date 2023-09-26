const Renderer = {
    zoom: 1,
    onLoad: () => console.log("Images loaded!"),
    showPromotion: true,

    battleMessage: {
        x: -10000,
        visible: false,

        resize(w, h) {
            this.w = w
            this.h = h
        },

        draw(ctx) {
            if (!this.visible) return
            ctx.font = "300px Paytone"
            ctx.fillStyle = "#111e"
            ctx.fillRect(this.x - this.w/5, this.h/2 - 300, this.w, 360)
            ctx.fillStyle = "#fff"
            ctx.fillText("BATALLA", this.x, this.h/2)
        },

        show() {
            this.visible = true
            AnimationManager.playAnimation(t => {
                t = AnimationManager.easing.bezierCurve(t)
                this.x = (this.w + 1500) * t - 1000
            }, () => this.visible = false, 3)
        }
    },

    actionAnimation: {
        animating: false,
        duration: 1,
        pieces: [],

        includes(piece) { return this.pieces.map(p => p.piece).includes(piece) },

        setMoveAction(action) {
            const z0 = (action.origin.getTier() - 1) * Board.size * .01,
                  z1 = (action.target.getTier() - (action instanceof MoveAction ? 0 : 0)) * Board.size * .01
            const piece = { image: Renderer.getImageFromPiece(action.piece), piece: action.piece }
            let btn = Board.getButtonOf(action.origin)
            piece.x0 = btn.x; piece.y0 = btn.y - z0;
            btn = Board.getButtonOf(action.target)
            piece.x1 = btn.x; piece.y1 = btn.y - z1;
            this.pieces.push(piece)
        },

        setCaptureAction(action) {
            const z0 = (action.origin.getTier() - 1) * Board.size * .01,
                  z1 = (action.target.getTier() - 1) * Board.size * .01

            const piece = { image: Renderer.getImageFromPiece(action.piece), piece: action.piece }
            const captured = { image: Renderer.getImageFromPiece(action.captured), piece: action.captured }

            const s0 = Board.getButtonOf(action.origin), s1 = Board.getButtonOf(action.target)
            piece.x0 = s0.x; piece.y0 = s0.y - z0;
            piece.x1 = s1.x; piece.y1 = s1.y - z1;

            captured.x0 = s1.x; captured.y0 = s1.y - z1;
            captured.x1 = s1.x; captured.y1 = Engine.currentPlayer.isBelow ? Renderer.canvas.height + Board.size * .1 : - Board.size * .1

            this.pieces.push(piece, captured)
        },

        setCaptureInTowerAction(action) {
            const offZ = Board.size * .01
            const z = (action.target.getTier() - 1) * offZ
            const captured = { image: Renderer.getImageFromPiece(action.captured), piece: action.captured }
            const s = Board.getButtonOf(action.target)
            captured.x0 = s.x; captured.y0 = s.y - z;
            captured.x1 = s.x; captured.y1 = Engine.currentPlayer.isBelow ? Renderer.canvas.height + Board.size * .1 : - Board.size * .1

            this.pieces.push(captured)

            for (let i = action.tier; i < action.target.getTier(); i++) {
                const piece = { image: Renderer.getImageFromPiece(action.target.pieces[i]), piece: action.target.pieces[i] }
                piece.x0 = piece.x1 = piece.x = s.x; piece.y0 = piece.y = s.y - i * offZ;
                piece.y1 = piece.y + offZ
                this.pieces.push(piece)
            }
        },

        setSwitchAction(action) {
            const offZ = Board.size * .01
            const s = Board.getButtonOf(action.target)
            const p0 = { image: Renderer.getImageFromPiece(action.target.pieces[0]), dir: 1, piece: action.target.pieces[0] }
            const p1 = { image: Renderer.getImageFromPiece(action.target.pieces[1]), dir: 0, piece: action.target.pieces[1] }
            const p2 = { image: Renderer.getImageFromPiece(action.target.pieces[2]), dir: -1, piece: action.target.pieces[2] }
            this.pieces.push(p0, p1, p2)
            p0.x1 = p0.x0 = p1.x1 = p1.x0 = p2.x1 = p2.x0 = s.x
            p0.y1 = p0.y0 = p1.y1 = p1.y0 = p2.y1 = p2.y0 = s.y
            p2.y0 -= 2 * offZ
            p1.y0 -= offZ; p1.y1 += offZ
            p0.y1 += 2 * offZ
            this.reverse = false
        },

        setSacrificeAction(action) {
            const z0 = (action.origin.getTier() ) * Board.size * .01,
                  z1 = (action.target.getTier() - 2) * Board.size * .01

            const piece = { image: Renderer.getImageFromPiece(action.origin.pieceOnTop()), piece: action.origin.pieceOnTop() }
            const other = { image: Renderer.getImageFromPiece(action.target.pieceOnTop()), piece: action.target.pieceOnTop() }

            const s0 = Board.getButtonOf(action.target), s1 = Board.getButtonOf(action.origin)
            piece.x0 = other.x1 = s0.x; piece.y0 = other.y1 = s0.y - z0;
            piece.x1 = other.x0 = s1.x; piece.y1 = other.y0 = s1.y - z1

            this.pieces.push(piece, other)
        },

        setMountAction(action) {
            const offZ = Board.size * .01
            const s0 = Board.getButtonOf(action.origin), s1 = Board.getButtonOf(action.target)
            for (let i = 0; i < action.origin.pieces.length; i++) {
                const piece = { image: Renderer.getImageFromPiece(action.origin.pieces[i]), piece: action.origin.pieces[i] }
                piece.x0 = s0.x; piece.y0 = s0.y - i * offZ
                piece.x1 = s1.x; piece.y1 = s1.y - i * offZ
                this.pieces.push(piece)
            }
        },

        setSubstituteAction(action) {
            const z = (action.target.getTier() - 1) * Board.size * .01
            const inBoard = action.target.pieces[action.tier]

            const pieceInHand = { image: Renderer.getImageFromPiece(action.piece), piece: action.piece }
            const pieceOnBoard = { image: Renderer.getImageFromPiece(inBoard), piece: inBoard }

            const s = Board.getButtonOf(action.target)

            pieceOnBoard.x0 = pieceInHand.x1 = s.x; pieceOnBoard.y0 = pieceInHand.y1 = s.y - z;
            pieceOnBoard.x1 = pieceInHand.x0 = s.x; pieceOnBoard.y1 = pieceInHand.y0 = Engine.currentPlayer.isBelow ? Renderer.canvas.height + Board.size * .1 : - Board.size * .1

            this.pieces.push(pieceInHand, pieceOnBoard)
        },

        setForcedRecoveryEffect(square, piece, isBelow, onFinish) {
            const z = (square.getTier() - 1) * Board.size * .01

            const pieceOnBoard = { image: Renderer.getImageFromPiece(piece), piece }

            const s = Board.getButtonOf(square)

            pieceOnBoard.x0 = s.x; pieceOnBoard.y0 = s.y - z;
            pieceOnBoard.x1 = s.x; pieceOnBoard.y1 = isBelow ? Renderer.canvas.height + Board.size * .1 : - Board.size * .1

            this.pieces.push(pieceOnBoard)
            this.update(0)
            AnimationManager.playAnimation(t => this.update(t), () => onFinish(), this.duration)
        },

        setAction(action, onFinish) {
            this.pieces.length = 0
            this.animating = true
            if (action instanceof MoveAction || action instanceof JumpOnAction) {
                this.setMoveAction(action)
            } else if (action instanceof CaptureAction) {
                this.setCaptureAction(action)
            } else if (action instanceof CaptureInTowerAction) {
                this.setCaptureInTowerAction(action)
            } else if (action instanceof SwitchAction) {
                this.setSwitchAction(action)
                this.pieces.reverse()
                AnimationManager.playAnimation(t => this.updateSwitch(t), () => this.onFinish(onFinish), this.duration)
                return
            } else if (action instanceof SacrificeAction) {
                this.setSacrificeAction(action)
            } else if (action instanceof SubstituteAction) {
                this.setSubstituteAction(action)
            } else if (action instanceof MountAction) {
                this.setMountAction(action)
            }
            this.update(0)
            AnimationManager.playAnimation(t => this.update(t), () => this.onFinish(onFinish), this.duration)
        },

        onFinish(fn) {
            this.pieces.length = 0
            this.animating = false
            fn()
        },

        draw(ctx) {
            const DIM = Board.size * .1
            this.pieces.forEach(piece => ctx.drawImage(piece.image, piece.x, piece.y, DIM, DIM))
        },

        update(t) {
            t = AnimationManager.easing.inOutCubic(t)
            this.pieces.forEach(piece => {
                piece.x = piece.x0 + t * (piece.x1 - piece.x0)
                piece.y = piece.y0 + t * (piece.y1 - piece.y0)
            })
        },

        updateSwitch(t) {
            if (!this.reverse && t > .5) {
                this.reverse = true
                this.pieces.reverse()
            }
            t = AnimationManager.easing.inOutCubic(t) * Math.PI * 2
            this.pieces.forEach(piece => {
                piece.x = (piece.x1 + piece.x0) * .5 + Math.cos(t * piece.dir+Math.PI*.5) * Board.size * .05
                piece.y = (piece.y1 + piece.y0) * .5 - Math.sin(t * piece.dir+Math.PI*.5) * Board.size * .01
            })
        }
    },

    init(canvas) {
        this.canvas = canvas
        this.ctx = canvas.getContext("2d")
        this.images = {
            hand: "Reserva",
            board: "Tablero",
            Y: "PN", y: "PB", I: "PN", i: "PB", W: "GN", w: "GB",
            selection: "seleccion", jump: "salto", capture: "ataque", white: "turnoB", black: "turnoN",
            hover: "hover", disabled: "disabled", disabled2: "disabled2", whithoutReplacement: "sinreemplazo",
            done: "hecho",
            changeAction: "cambio", jumpOnAction: "encima", tower0Action: "torre1", tower1Action: "torre2", tower2Action: "torre3",
            captureAction: "captura", sacrificeAction: "sacrificio", switchAction: "permutacion", substituteAction: "sustitucion"
        }
        "RrZzUuPpOoMmLlJjGgFfXxSsEeDdTtNnCcBbAaQq".split("")
            .forEach(x => this.images[x] = x.charCodeAt(0) < 91 ? x + "N" : x.toUpperCase() + "B")
        this.count = Object.keys(this.images).length
        for (const name in this.images) {
            const img = new Image()
            img.src = `img/${this.images[name]}.png`
            this.images[name] = img
            img.onload = () => {
                this.count--
                if (!this.count)
                    this.onLoad()
            }
        }

        Board.init()

        this.resize()
    },

    resize() {
        this.canvas.width = this.canvas.offsetWidth * canvasScale
        this.canvas.height = this.canvas.offsetHeight * canvasScale
        Board.resize(this.canvas.width, this.canvas.height)
        UpperHand.resize(this.canvas.width)
        LowerHand.resize(this.canvas.width)
        Arrangement.resize(this.canvas.width, this.canvas.height)
        SquareActions.resize()
        this.battleMessage.resize(this.canvas.width, this.canvas.height)
        this.draw()
    },

    draw() {
        const ctx = this.ctx
        if (this.showingTower)
			if (mouse.x < this.showingTower.x || mouse.y < this.showingTower.y || mouse.y > this.showingTower.bottom || mouse.x > this.showingTower.right) {
                this.showingTower.animation.stop()
				this.showingTower = null
            }

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.canvas.style.cursor =  PlayerAction.pieceInHand ? "grabbing" : "auto"
        if (Engine.isArrangementPhase) {
            Arrangement.draw(ctx)
        } else {
            Board.draw()
            UpperHand.draw()
            LowerHand.draw()
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
            ctx.drawImage(Board.canvas, Board.x, Board.y)
            if (this.actionAnimation.animating)
                this.actionAnimation.draw(ctx)
            else
                SquareActions.draw(ctx)
            ctx.drawImage(UpperHand.canvas, 0, UpperHand.y)
            ctx.drawImage(LowerHand.canvas, 0, LowerHand.y)
        }

        this.drawTower(ctx)

        if ((PlayerAction.pieceInHand || Engine.currentPlayer.relocated || Engine.currentPlayer.recruited) && !AI.armyIsAI(Engine.currentPlayer)) {
            ctx.drawImage(
                Renderer.getImageFromPiece(PlayerAction.pieceInHand || Engine.currentPlayer.relocated || Engine.currentPlayer.recruited), 
                mouse.x - ~~(Board.size * .05), 
                mouse.y - ~~(Board.size * .05),
                ~~(Board.size * .12),
                ~~(Board.size * .12)
            )
        }

        this.battleMessage.draw(ctx)
    },


    drawTower(ctx) {
        if (!this.showingTower) return
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
        const DIM = Board.size * .1
        if (this.showingTower.f >= .6) {
            if (this.showingTower.square.isFull())
                ctx.fillRect(this.showingTower.x, this.showingTower.y - DIM * this.showingTower.dir, DIM, ~~(DIM * 1.5))
            else
                ctx.fillRect(this.showingTower.x, this.showingTower.y - DIM * .5 * this.showingTower.dir, DIM, DIM)
        }
        for (let i = 0; i < this.showingTower.square.pieces.length; i++) {
            const piece = this.showingTower.square.pieces[i]
            ctx.drawImage(this.getImageFromPiece(piece), this.showingTower.x, this.showingTower.y - ~~(DIM * i * this.showingTower.f * this.showingTower.dir), DIM, DIM)
        }
    },

    getImageFromPiece(piece) {
        return this.images[piece.army === Engine.blackArmy ? piece.letter.toUpperCase() : piece.letter.toLowerCase()]
    },

    showReasons(reasons) {
        const parent = document.getElementById("snackbars")
        const snackbar = document.createElement("DIV")
        parent.appendChild(snackbar)
        snackbar.innerHTML = reasons.join("<br>")
        snackbar.className = "show"
        setTimeout(() => {
            snackbar.className = snackbar.className.replace("show", "")
            parent.removeChild(snackbar)
        }, 3000)
    },

    showChangeTurn() {
        const turn = document.getElementById("turno")
        turn.style.transform = "translateX(-150px)"
        setTimeout( () => {
            turn.src = this.images[Engine.currentPlayer.name].src
            turn.style.transform = "translateX(0)"
        }, 300)
    },

    showTower(square, x, y) {
        const DIM = Board.size * .1
        const isVisible = y < DIM * (square.getTier() - 1)
        this.showingTower = {
            x, y,
            right: x + DIM, bottom: y + DIM,
            dir: isVisible ? -1 : 1,
            square,
            f: .1
        }
        this.showingTower.animation = AnimationManager.playAnimation(
            t => { this.showingTower.f = .1 + AnimationManager.easing.inOutCubic(t) * .7 },
            () => { this.showingTower.f = .8 }, .4
        )
    },

    switchPromotion(e) {
		e.innerText = this.showPromotion ? "Mostrar Ascenso" : "Ocultar Ascenso"
		this.showPromotion = !this.showPromotion
    },

    showEffect(id) {
        document.getElementById(id).style.opacity = 1
    },

    hideEffect(id) {
        document.getElementById(id).style.opacity = 0
    },

    hideAllEffects() {
        for (const effect of ["reubicacion", "recuperacion", "corona", "traicion", "reclutamiento"])
            this.hideEffect(effect)
    }
}
