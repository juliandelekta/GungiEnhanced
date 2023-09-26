const Gungi = {
	settings: {
		blackBelow: true,
		PCup: false,
		PCdown: false,
		withCrown: true,
		first: "white"
	},

    phase: "action",
	
	save() {
		this.saveFile(`Game_${(new Date()).toLocaleDateString()}.pg`, "" + Engine.currentPlayer.name +
		 " " + Engine.isArrangementPhase +
		 " " + Engine.settings.withCrown +
		 " " + AI.black +
		 " " + AI.white +
		 " " + Notation.recordBoard() +
		 " " + (Engine.blackArmy.piecesInHand.map(piece => piece.letter).join("")||"-") +
		 " " + Engine.blackArmy.isBelow +
		 " " + Engine.blackArmy.pawnsInColumn.join(" ") +
		 " " + Engine.blackArmy.jokers.map(j => j+0).join("") +
		 " " + Engine.blackArmy.fortress.position +
		 " " + Engine.blackArmy.cannon.position +
		 " " + Engine.blackArmy.king.position +
		 " " + (Engine.blackArmy.recovered[0] || "-") +
		 " " + (Engine.blackArmy.recovered[1] || "-") +
		 " " + (Engine.blackArmy.relocated || "-") +
		 " " + (Engine.blackArmy.recruited || "-") +
		 " " + (Engine.blackArmy.lastSwitch ? Engine.blackArmy.lastSwitch.position : -1) +
		 " " + (Engine.blackArmy.crown ? Engine.blackArmy.crown.position : -1) +
		 " " + Engine.blackArmy.isInCheck +
		 " " + (Engine.whiteArmy.piecesInHand.map(piece => piece.letter.toLowerCase()).join("")||"-") +
		 " " + Engine.whiteArmy.isBelow +
		 " " + Engine.whiteArmy.pawnsInColumn.join(" ") +
		 " " + Engine.whiteArmy.jokers.map(j => j+0).join("") +
		 " " + Engine.whiteArmy.fortress.position +
		 " " + Engine.whiteArmy.cannon.position +
		 " " + Engine.whiteArmy.king.position +
		 " " + (Engine.whiteArmy.recovered[0] || "-") +
		 " " + (Engine.whiteArmy.recovered[1] || "-") +
		 " " + (Engine.whiteArmy.relocated || "-") +
		 " " + (Engine.whiteArmy.recruited || "-") +
		 " " + (Engine.whiteArmy.lastSwitch ? Engine.whiteArmy.lastSwitch.position : -1) +
		 " " + (Engine.whiteArmy.crown ? Engine.whiteArmy.crown.position : -1) +
		 " " + Engine.whiteArmy.isInCheck +
		 " " + Notation.toString())
	},

	load(e) {
		const file = e.target.files[0]
		if (!file) return
		const reader = new FileReader()
		reader.onload = e => {
			//Reserva.hideReservaAdversaria();
			Gungi.reset()
			WindowManager.victory.close()
			const data = e.target.result.slice(0, e.target.result.indexOf("@")).split(" ");
            Engine.setCurrentPlayer(data[0])
			document.getElementById("turno").src = Renderer.images[data[0]].src
			Engine.isArrangementPhase = data[1] === "true"
			Engine.settings.withCrown = data[2] === "true"
			AI.black = data[3] === "true"
			AI.white = data[4] === "true"
			Engine.loadNotation(data[5])
			let pos = 6
			for (let army = Engine.blackArmy, i = 0; i < 2; i++, army = Engine.whiteArmy) {
                army.setPiecesInHand(data[pos] === "-" ? "" : data[pos])
                pos++
				army.isBelow = data[pos++] === "true"
				for (let j = 0; j < 9; j++)
					army.pawnsInColumn[j] = parseInt(data[pos++])
				army.jokers = data[pos++].split("").map(j => j === "1")
				army.fortress.position = parseInt(data[pos++])
				army.cannon.position = parseInt(data[pos++])
				army.king.position = parseInt(data[pos++])
				army.recovered[0] = data[pos++] === "-" ? null : data[pos-1]
				army.recovered[1] = data[pos++] === "-" ? null : data[pos-1]
				army.relocated = data[pos++] === "-" ? null : data[pos-1]
				army.recruited = data[pos++] === "-" ? null : data[pos-1]
				army.lastSwitch = parseInt(data[pos++])
                army.lastSwitch = army.lastSwitch >= 0 ? Engine.board[army.lastSwitch] : null
				army.crown = parseInt(data[pos++])
                army.crown = army.crown >= 0 ? Engine.board[army.crown] : null
				army.isInCheck = data[pos++] === "true"
			}
            Notation.setRecord(e.target.result.slice(e.target.result.indexOf("@") + 1))
            Notation.setMove(parseInt(data[pos++]))
            WindowManager.menu.close()
			if (Engine.currentPlayer.isInCheck)
				Renderer.showEffect("jaque")
            Engine.blackArmy.fillPromotion()
            Engine.whiteArmy.fillPromotion()
            if (Engine.isArrangementPhase)
                Arrangement.load()

            Gungi.startHands()

			setTimeout(() => AI.play, 1000)
		}
		reader.readAsText(file)
		e.target.value = ""
	},

	newGame() {
		Engine.blackArmy.isBelow = this.settings.blackBelow
		Engine.whiteArmy.isBelow = !this.settings.blackBelow
		Engine.settings.withCrown = this.settings.withCrown
		AI.white = this.settings.blackBelow && this.settings.PCup || !this.settings.blackBelow && this.settings.PCdown
		AI.black  = !this.settings.blackBelow && this.settings.PCup || this.settings.blackBelow && this.settings.PCdown
		this.reset()
        Engine.setCurrentPlayer(this.settings.first)
        Arrangement.load()
		WindowManager.victory.close()
		// Reserva.resize()
		// Reserva.hideReservaAdversaria()
        this.startHands()
		Notation.addToRecord("")
		setTimeout(() => AI.play(), 1000)
	},

    startHands() {
        UpperHand.setArmy(Engine.whiteArmy.isBelow ? Engine.blackArmy : Engine.whiteArmy)
        LowerHand.setArmy(Engine.blackArmy.isBelow ? Engine.blackArmy : Engine.whiteArmy)
        UpperHand.resize(Renderer.canvas.width)
        LowerHand.resize(Renderer.canvas.width)
        hideAndShowHands()
    },

	clickLoad () {
		document.getElementById("cargar").click()
	},

	reset() {
		Engine.reset()
        PlayerAction.clear()
        Renderer.hideAllEffects()
        Renderer.hideEffect("jaque")
		document.getElementById("turno").src = "img/turnoN.png"
		Notation.setRecord("")
	},

	saveFile (name, content) {
		const file = new Blob([content], {type:'text/plain'})
		const link = document.createElement("a")
		link.download = name
		link.innerHTML = ""
		window.URL = window.URL || window.webkitURL
		link.href = window.URL.createObjectURL(file)
		link.onclick = (e) => document.body.removeChild(e.target)
		link.style.display = "none"
		document.body.appendChild(link)
		link.click()
	},
	
	changeSide() {
		if (this.settings.blackBelow = !this.settings.blackBelow) {
			document.getElementById("lado-arriba").src = "img/" + (this.settings.PCup ? "c" : "p") + "_white.png";
			document.getElementById("lado-abajo").src  = "img/" + (this.settings.PCdown  ? "c" : "p") + "_black.png";
		} else {
			document.getElementById("lado-arriba").src = "img/" + (this.settings.PCup ? "c" : "p") + "_black.png";
			document.getElementById("lado-abajo").src  = "img/" + (this.settings.PCdown  ? "c" : "p") + "_white.png";
		}
	},
	
	toggleCrown(e) {
		if (this.settings.withCrown = !this.settings.withCrown) {
			e.style.borderColor = "#78f578";
			e.firstElementChild.style.color = "#78f578";
			e.firstElementChild.innerText = "CON";
		} else {
			e.style.borderColor = "#ffc8c8";
			e.firstElementChild.style.color = "#ffc8c8";
			e.firstElementChild.innerText = "SIN";
		}
	},

	toggleFirst() {
		let ladoBlanco = this.settings.blackBelow ? "orden-arriba" : "orden-abajo",
			ladoNegro  = this.settings.blackBelow ? "orden-abajo"  : "orden-arriba"

		if (this.settings.first === "white") {
			this.settings.first = "black";
			document.getElementById(ladoNegro).innerText  = "1°";
			document.getElementById(ladoBlanco).innerText = "2°";
		} else {
			this.settings.first = "white";
			document.getElementById(ladoBlanco).innerText = "1°";
			document.getElementById(ladoNegro).innerText  = "2°";
		}
	},

	toggleCPUUp(e) {
		this.settings.PCup = !this.settings.PCup;
		e.src = "img/" + (this.settings.PCup ? "c" : "p") + (this.settings.blackBelow ? "_white.png" : "_black.png");
	},

	toggleCPUDown(e) {
		this.settings.PCdown = !this.settings.PCdown;
		e.src = "img/" + (this.settings.PCdown ? "c" : "p") + (!this.settings.blackBelow ? "_white.png" : "_black.png");
	},

    endPhase() {
        SquareActions.clear()
        if (this.phase !== "initial") {
            Notation.recordAction(PlayerAction.action)

            if (Engine.currentPlayer.relocated)
                Renderer.showEffect("reubicacion")

            if (Engine.currentPlayer.recovered[1]) {
                Renderer.showEffect("recuperacion")
                Notation.addToRecord("^")
                Renderer.actionAnimation.setForcedRecoveryEffect(PlayerAction.action.target, Engine.currentPlayer.recovered[1], PlayerAction.action instanceof CaptureAction ? !Engine.currentPlayer.isBelow : Engine.currentPlayer.isBelow, () => console.log("forced recovery. On Finish()"))
            }
            this.phase = "final"
            if (PlayerAction.action instanceof CaptureAction) {
                if (PlayerAction.action.target.getTier() > 1 && PlayerAction.action.target.pieceOnTop() instanceof Joker) {
                    Renderer.showEffect("traicion")
                    Notation.addToRecord("$")
                }
            }
            const actions = Action.getOfPhaseFinal()
            if (actions.length) {
                PlayerAction.clear()
                PlayerAction.action = true
                if (Engine.currentPlayer.relocated) {
                    Renderer.showEffect("reubicacion")
                    PlayerAction.pieceInHand = Engine.currentPlayer.relocated
                    PlayerAction.possibleMoves = actions.filter(action => action instanceof RelocateAction)
                    WindowManager.hud.sendBack()
                } else if (Engine.currentPlayer.recruited) {
                    Renderer.showEffect("reclutamiento")
                    PlayerAction.pieceInHand = Engine.currentPlayer.recruited
                    PlayerAction.possibleMoves = actions.filter(action => action instanceof RecruitAction)
                    WindowManager.hud.sendBack()
                } else if (Engine.currentPlayer.crown) {
                    Renderer.showEffect("corona")
                    PlayerAction.possibleMoves = actions.filter(action => action instanceof CrownWithReplacementAction || action instanceof CrownWithoutReplacementAction)

                    if (!PlayerAction.possibleMoves.filter(x => x.isLegal).length) {
                        Notation.addToRecord("#;El juego terminó en empate por Stale Mate;")
                        WindowManager.victory.open(null, "Stale Mate")
                        return
                    } else {
                        Hand.getCurrentHand().openForCrown()
                    }
                }
                setTimeout(() => AI.play(), AI.responseDelay)
            } else {
                Engine.nextTurn()

                Hand.getCurrentHand().reorderButtons()
                Renderer.showChangeTurn()

                if (Engine.currentPlayer.enemyRecovered) {
                    Renderer.showEffect("recuperacion")
                    Notation.addToRecord("^")
                    Renderer.actionAnimation.setForcedRecoveryEffect(PlayerAction.action.target, Engine.currentPlayer.enemyRecovered, PlayerAction.action instanceof CaptureAction ? Engine.currentPlayer.isBelow : !Engine.currentPlayer.isBelow, () => console.log("forced recovery. On Finish()"))
                }

                if (Engine.currentPlayer.relocated) {
                    PlayerAction.possibleMoves = Action.getOfPhaseFinal().filter(action => action instanceof RelocateAction)
                    Renderer.showEffect("reubicacion")
                    this.phase = "initial"
                } else {
                    PlayerAction.clear()
                    this.phase = "action"
                }

                if (Engine.victory) {
                    if (Engine.victory.winner)
                        Notation.addToRecord("#;Gana el ejército " + Engine.victory.winner.name + " por " + Engine.victory.reason + ";")
                    else
                        Notation.addToRecord("#;El juego termino en empate por " + Engine.victory.reason + ";")
                    WindowManager.victory.open(Engine.victory.winner ? Engine.victory.winner.name : null, Engine.victory.reason)
                } else {
                    if (Engine.currentPlayer.isInCheck) {
                        Renderer.showEffect("jaque")
                        Notation.addToRecord("+")
                        setTimeout(() => AI.play(), AI.responseDelay)
                    } else {
                        Renderer.hideEffect("jaque")
                        setTimeout(() => AI.play(), AI.responseDelay)
                    }
                    Notation.changeTurn()
                }
                hideAndShowHands()
            }
        } else {
            console.log("INICIAL")
            Notation.recordAction(PlayerAction.action)
            PlayerAction.clear()
            this.phase = "action"
            setTimeout(() => AI.play(), AI.responseDelay)
        }
    }
}
