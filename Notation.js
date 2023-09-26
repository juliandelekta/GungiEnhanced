const Notation = {
    move: 1,
    record: "",
    tagBattle: "-BATALLA-",

    init() {
        this.element = document.getElementById("registro")
    },

    toSquare(square) { return "abcdefghi"[square.column] + (square.row+1) },

    recordAction(action) {
        let txt = ""
		switch (action.constructor) {
			case JumpOnAction:
			case MoveAction:
				txt = this.toSquare(action.origin) + "-" + this.toSquare(action.target)
			break
			case CaptureAction:
				txt = this.toSquare(action.origin) + "x" + this.toSquare(action.target)
			break
			case CaptureInTowerAction:
				txt = (action.tier + 1) + "x" + this.toSquare(action.target)
			break
			case DropAction:
				txt = action.piece.letter + "*" + this.toSquare(action.target)
			break
			case SwitchAction:
				txt = ":" + this.toSquare(action.target)
			break
			case SacrificeAction:
				txt = this.toSquare(action.origin) + "=" + this.toSquare(action.target)
			break
			case RecruitAction:
			case RelocateAction:
				this.record += (Gungi.phase === "final" ? "" : "," ) + "(" + (action.target ? this.toSquare(action.target) : 0) + ")"
			break
			case CrownWithReplacementAction:
			case CrownWithoutReplacementAction:
				this.record += "{" + action.piece.letter + "}"
			break
			case MountAction:
				txt = this.toSquare(action.origin) + "~" + this.toSquare(action.target)
			break
			case SubstituteAction:
				txt = this.toSquare(action.target) + "<>" + action.piece.letter
			break
		}
		this.record += txt + " "

		if (txt) {
			if (action instanceof DropAction) // No queremos mostrar cuál piece ambigua renovó entonces normalizamos
				this.element.firstElementChild.lastElementChild.innerHTML += "<td class='movRegistro'>" + (action.piece.letter + "*" + this.toSquare(action.target)) + "</td>"
			else if (action instanceof SubstituteAction)
				this.element.firstElementChild.lastElementChild.innerHTML += "<td class='movRegistro'>" + this.toSquare(action.target) + "<>" + action.piece.letter + "</td>"
			else
				this.element.firstElementChild.lastElementChild.innerHTML += "<td class='movRegistro'>" + txt + "</td>"
		}
			
		this.element.scrollTop = this.element.scrollHeight
    },

    addToRecord(txt) {
        this.record += txt
    },

    start() {
        this.record = this.recordBoard() + "\n\n1. "
        this.element.style.visibility = "visible"
    },

    setRecord(txt) {
        if (txt) {
			txt.replace(/[\+\$\^\#]/g, "")
			this.record = txt.slice(0, txt.indexOf(this.tagBattle) + this.tagBattle.length)
			this.element.firstElementChild.innerHTML = ""
			txt = txt.slice(txt.indexOf(this.tagBattle) + this.tagBattle.length).split(" ")
			this.move = 0
			for (let elem of txt) {
				if (elem.slice(-1) === ".") {
					this.changeTurn(true)
				} else if (elem.length > 1 && !elem[0].match(/[\$\^\(\)]/g)) {
					// Remove comments
					const regex = /;/gi, indices = []
                    let result
					while ( (result = regex.exec(elem)) )
						indices.push(result.index)
					while (indices.length) {
						const a = indices.shift(), b = indices.shift()
						console.log(a,b)
						elem = elem.slice(0, a) + elem.slice(b + 1)
					}
					const res = elem.match(/[\(\{][a-z][0-9][\)\}]/gi)
					if (res)
						elem = elem.substr(0, res.index)
					this.record += elem + " "
					this.element.firstElementChild.lastElementChild.innerHTML += "<td class='movRegistro'>" + elem + "</td>"
				}
			}
			this.element.style.visibility = "visible"
			this.element.scrollTop = this.element.scrollHeight
		} else {
			this.record = ""
			this.move = 1
			this.element.firstElementChild.innerHTML = "<tr><td class='numRegistro'>1</td></tr>"
			this.element.style.visibility = "hidden"
		}
    },

    changeTurn(print = false) {
		if (Engine.currentPlayer.name === Gungi.settings.first || print) {
			this.record += "\n" + (++this.move) + ". "
			this.element.firstElementChild.innerHTML += "<tr><td class='numRegistro'>" + this.move + "</td></tr>"
		} else {
			this.record += " "
		}
	},

    recordBoard() {
        let txt = "", empty = 0
		for (let row = 0, pos = 0; row < 9; row++) {
			for (let col = 0; col < 9; col++, pos++) {
				const square = Engine.board[pos]
				if (square.isEmpty())
					empty++
				else {
					if (empty) {
						txt += empty
						empty = 0
					}
					txt += square.getTier() > 1 ? "(" + square.pieces.map(piece => piece.toText()).join("") + ")" : square.pieceOnTop().toText()
				}
			}
			if (empty) {
				txt += empty
				empty = 0
			}
			txt += "/"
			empty = 0
		}
		return txt
    },

    setMove(move) {
        this.move = move
    },

    saveRecord() {
		Gungi.saveFile(`Reg ${(new Date()).toLocaleDateString()}.txt`, this.record.replace(/([^\r])\n/g, "$1\r\n").replace(/\t/g, "  "));
    },

    toString() {
        return this.move + "@" + this.record
    }
}
